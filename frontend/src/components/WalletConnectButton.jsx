// WalletConnectButton — self-custody BSC USDT-BEP-20 payment
//
// Shipped 6 May 2026 alongside NOWPayments (2-week parallel run before
// NOWPayments inbound is retired). Self-contained: bootstraps Reown
// AppKit + wagmi providers on first mount, so non-checkout pages don't
// pay the bundle cost. ~190KB gzipped (vendor-walletconnect chunk,
// lazy-loaded via React.lazy in the parent pages).
//
// Flow:
//   1. User clicks "Pay with Wallet"
//   2. Parent's consent gate runs (already wired in Upgrade / ActivateTier
//      / CreditMatrix — handled by parent, NOT here)
//   3. We POST /api/onchain/create-intent → get {order_id, unique_amount,
//      treasury_address, usdt_contract, expires_at}
//   4. We open the Reown AppKit modal, user picks a wallet + connects
//   5. We trigger writeContract for USDT transfer of unique_amount to
//      treasury (USDT BSC = 18 decimals)
//   6. Once tx is submitted, we poll /api/onchain/order/{id} every 4s
//      until status='confirmed' (success), 'expired' (timeout), or the
//      15-min window closes
//   7. On 'confirmed' → onSuccess() callback (parent handles redirect/
//      refresh)
//
// Reown Project ID comes from VITE_WALLETCONNECT_PROJECT_ID at build time.
// If missing, button renders disabled with a "config error" tooltip
// rather than crashing the page.

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';
import { WagmiProvider, useAccount, useWriteContract, useChainId, useSwitchChain } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parseUnits } from 'viem';
import { apiPost, apiGet } from '../utils/api';

// USDT-BEP-20 token contract on BSC mainnet
var USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';
var USDT_DECIMALS = 18;
var BSC_CHAIN_ID = 56;

// Minimal ERC-20 ABI — only `transfer` is needed for outbound payment
var USDT_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
  }
];

// ── Module-level singleton bootstrap ──
// Reown's createAppKit + WagmiAdapter must only run once across the
// entire app lifecycle. Calling createAppKit twice registers duplicate
// modal singletons and breaks the close handler. We init lazily on
// first mount and cache.
var _bootstrap = null;
function getBootstrap() {
  if (_bootstrap) return _bootstrap;

  // Reown Project ID is a public identifier (like a Stripe publishable
  // key) — it's baked into the WalletConnect pairing URL that's shown
  // to wallets when they connect, so it isn't a secret. Hardcoded
  // here because the frontend is prebuilt locally and committed to the
  // repo (Railway doesn't run npm run build). Env var still wins if
  // set, useful for staging/testing against a different Reown project.
  var projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'b256ce910011e012fedc82dc8c11881b';
  if (!projectId) {
    _bootstrap = { error: 'VITE_WALLETCONNECT_PROJECT_ID not set' };
    return _bootstrap;
  }

  try {
    var wagmiAdapter = new WagmiAdapter({
      networks: [bsc],
      projectId: projectId,
    });

    createAppKit({
      adapters: [wagmiAdapter],
      networks: [bsc],
      projectId: projectId,
      metadata: {
        name: 'SuperAdPro',
        description: 'Pay with your own wallet — USDT on BNB Chain',
        url: 'https://www.superadpro.com',
        icons: ['https://www.superadpro.com/static/sap-icon.png'],
      },
      // Limit to wallet-only auth — we don't need email/social login
      // for crypto payment, those are noise on a checkout flow.
      features: {
        email: false,
        socials: false,
        analytics: false,
      },
      themeMode: 'light',
    });

    _bootstrap = {
      wagmiConfig: wagmiAdapter.wagmiConfig,
      queryClient: new QueryClient(),
    };
  } catch (e) {
    _bootstrap = { error: 'AppKit init failed: ' + (e && e.message ? e.message : String(e)) };
  }
  return _bootstrap;
}

// ── Inner button (rendered inside WagmiProvider) ──
// Handles the actual payment flow once providers are ready.

function InnerButton(props) {
  var productType = props.productType;
  var productKey = props.productKey;
  var productMeta = props.productMeta;
  var label = props.label;
  var onSuccess = props.onSuccess;
  var disabled = props.disabled;
  var style = props.style;

  var [phase, setPhase] = useState('idle');
  // Phases: idle → creating → awaiting_wallet → signing → submitting →
  //         polling → confirmed | expired | error
  var [error, setError] = useState('');
  var [order, setOrder] = useState(null);
  var [txHash, setTxHash] = useState('');
  var pollTimerRef = useRef(null);

  var account = useAccount();
  var currentChainId = useChainId();
  var switchChain = useSwitchChain();
  var writeContract = useWriteContract();

  // Cleanup poll timer on unmount
  useEffect(function() {
    return function() {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  var pollOrder = useCallback(function(orderId, deadlineMs) {
    function tick() {
      if (Date.now() > deadlineMs) {
        setPhase('expired');
        setError('Payment window expired. If you sent the transaction, support can verify it manually — please contact us with your tx hash.');
        return;
      }
      apiGet('/api/onchain/order/' + orderId).then(function(d) {
        if (d.status === 'confirmed') {
          setPhase('confirmed');
          setOrder(d);
          if (onSuccess) onSuccess(d);
          return;
        }
        if (d.status === 'expired' || d.status === 'cancelled') {
          setPhase('expired');
          setError('Order ' + d.status + '.');
          return;
        }
        // still pending — schedule next poll
        pollTimerRef.current = setTimeout(tick, 4000);
      }).catch(function(e) {
        // Transient network error — keep polling, don't bail
        console.warn('Order poll failed (will retry):', e);
        pollTimerRef.current = setTimeout(tick, 4000);
      });
    }
    pollTimerRef.current = setTimeout(tick, 4000);
  }, [onSuccess]);

  var handleClick = useCallback(function() {
    setError('');

    // Run optional onBeforeClick gate (e.g. consent modal) first.
    // If it returns falsy / rejects, abort silently — same UX as
    // the NOWPayments path.
    var beforeFn = props.onBeforeClick;
    var gateResult = beforeFn ? beforeFn() : true;

    Promise.resolve(gateResult).then(function(allowed) {
      if (!allowed) return; // user cancelled the gate
      _startFlow();
    }).catch(function() {
      // Treat gate rejection as silent cancel
    });
  }, [props.onBeforeClick, productType, productKey, productMeta, account.isConnected]);

  function _startFlow() {
    setPhase('creating');

    // Step 1 — create intent on the backend
    apiPost('/api/onchain/create-intent', {
      product_type: productType,
      product_key: productKey,
      product_meta: productMeta || null,
    }).then(function(intent) {
      setOrder(intent);

      // Step 2 — ensure wallet connected, on the right chain
      setPhase('awaiting_wallet');

      // Open the modal if not already connected
      if (!account.isConnected) {
        // Show the connect modal via the web component element
        var btn = document.querySelector('appkit-button');
        if (btn) btn.click();
        // Wait for connection — useEffect below will catch it
        return;
      }

      // Already connected — proceed
      proceedWithPayment(intent);
    }).catch(function(e) {
      setPhase('error');
      var msg = (e && e.message) ? e.message : 'Could not create payment intent';
      // Map known backend error codes to friendlier copy
      if (msg.indexOf('collision') !== -1 || msg.indexOf('High demand') !== -1) {
        setError('Lots of orders right now — please try again in a moment.');
      } else if (msg.indexOf('course_not_ready') !== -1) {
        setError('Course payments coming soon.');
      } else if (msg.indexOf('Unknown product') !== -1) {
        setError('This product isn\u2019t available for self-custody payment yet. Please use the standard checkout.');
      } else {
        setError(msg);
      }
    });
  }

  // Once the wallet connects (after the user approved the modal),
  // proceed automatically. Track via the order being set + connection.
  useEffect(function() {
    if (phase === 'awaiting_wallet' && account.isConnected && order && order.order_id) {
      proceedWithPayment(order);
    }
  // eslint-disable-next-line
  }, [account.isConnected, phase]);

  function proceedWithPayment(intent) {
    // Step 3 — ensure on BSC chain
    if (currentChainId !== BSC_CHAIN_ID) {
      setPhase('signing');
      switchChain.switchChain(
        { chainId: BSC_CHAIN_ID },
        {
          onSuccess: function() { sendTransfer(intent); },
          onError: function(e) {
            setPhase('error');
            setError('Please switch your wallet to BNB Chain (BSC) and try again.');
            console.error('Switch chain failed:', e);
          }
        }
      );
      return;
    }
    sendTransfer(intent);
  }

  function sendTransfer(intent) {
    setPhase('signing');
    var amountRaw;
    try {
      amountRaw = parseUnits(String(intent.unique_amount), USDT_DECIMALS);
    } catch (e) {
      setPhase('error');
      setError('Invalid payment amount.');
      return;
    }

    writeContract.writeContract(
      {
        abi: USDT_ABI,
        address: USDT_BSC,
        functionName: 'transfer',
        args: [intent.treasury_address, amountRaw],
        chainId: BSC_CHAIN_ID,
      },
      {
        onSuccess: function(hash) {
          setTxHash(hash);
          setPhase('polling');
          // Compute polling deadline from the intent's expires_at + 2min grace
          var deadline = intent.expires_at ? new Date(intent.expires_at).getTime() + 120000 : (Date.now() + 16 * 60 * 1000);
          pollOrder(intent.order_id, deadline);
        },
        onError: function(e) {
          setPhase('error');
          var emsg = (e && e.shortMessage) || (e && e.message) || 'Transaction was rejected or failed';
          if (emsg.indexOf('rejected') !== -1 || emsg.indexOf('User denied') !== -1 || emsg.indexOf('User rejected') !== -1) {
            setError('You cancelled the transaction.');
          } else {
            setError(emsg);
          }
        }
      }
    );
  }

  var btnLabel = label || 'Pay with Wallet (BSC)';
  var busyLabels = {
    creating: 'Creating order…',
    awaiting_wallet: 'Connect your wallet…',
    signing: 'Confirm in your wallet…',
    submitting: 'Submitting…',
    polling: 'Confirming on-chain…',
  };
  var isBusy = phase in busyLabels;
  var showLabel = isBusy ? busyLabels[phase] : btnLabel;

  if (phase === 'confirmed') {
    return (
      <div style={Object.assign({
        padding: '14px 16px', borderRadius: 12, background: '#f0fdf4',
        border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600,
        fontSize: 14, textAlign: 'center'
      }, style || {})}>
        ✓ Payment confirmed — activating your order…
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={handleClick}
        disabled={disabled || isBusy}
        style={Object.assign({
          width: '100%',
          padding: '14px 16px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'inherit',
          border: '1.5px solid #f3ba2f',
          background: isBusy ? '#fef9c3' : '#fff',
          color: '#92400e',
          cursor: (disabled || isBusy) ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8,
          transition: 'background .2s'
        }, style || {})}
      >
        <span aria-hidden="true" style={{ fontSize: 16 }}>⛓</span>
        {showLabel}
      </button>
      {(phase === 'polling' || phase === 'signing') && txHash ? (
        <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', textAlign: 'center', fontFamily: 'monospace' }}>
          tx: {txHash.slice(0, 10)}…{txHash.slice(-6)}
        </div>
      ) : null}
      {error ? (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: '#fef2f2', color: '#991b1b', fontSize: 13, textAlign: 'center'
        }}>
          {error}
        </div>
      ) : null}
      {/* Hidden AppKit web component — Reown injects this for the modal trigger */}
      <appkit-button style={{ display: 'none' }} />
    </div>
  );
}

// ── Outer wrapper — bootstraps providers ──

export default function WalletConnectButton(props) {
  var bs = useMemo(getBootstrap, []);

  if (bs.error) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 10, background: '#fafafa',
        border: '1px dashed #e2e8f0', color: '#64748b', fontSize: 13,
        textAlign: 'center'
      }}>
        Self-custody payment unavailable — please use the standard checkout.
      </div>
    );
  }

  return (
    <WagmiProvider config={bs.wagmiConfig}>
      <QueryClientProvider client={bs.queryClient}>
        <InnerButton {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
