// WalletConnect — split into two components for clean checkout UX
//
// Refactored 6 May 2026 from the original WalletConnectButton (which had
// one button per pack card → 8 buttons on /credit-nexus, ugly + heavy).
//
// New architecture:
//
//   <WalletConnectProvider>          ← wraps the page, bootstraps Reown
//     <WalletConnectGate />          ← single "Connect wallet" button
//     ...rest of page...
//       <pack/tier card>
//         <WalletPayLink             ← small "Pay $X from wallet" link,
//           productType=...           ← only renders when wallet connected
//           productKey=... />
//       </pack/tier card>
//   </WalletConnectProvider>
//
// Lifecycle:
//   1. Page renders. Provider bootstraps Reown + wagmi.
//   2. Gate shows "Connect wallet (BSC)" button. PayLinks are dormant.
//   3. User clicks Gate → Reown modal opens via useAppKit().open()
//   4. User picks wallet, approves connection.
//   5. account.isConnected flips true. Gate shows connected status.
//      PayLinks now render their "Pay from wallet" button.
//   6. User clicks any PayLink for the pack/tier they want.
//   7. PayLink calls /api/onchain/create-intent → triggers writeContract
//      → polls /api/onchain/order/{id} → fires onSuccess callback.
//
// Reown Project ID is the public WalletConnect Cloud project identifier
// (b256ce910011e012fedc82dc8c11881b). It appears in pairing URLs and is
// not a secret — fine to hardcode in the bundle.

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createAppKit, useAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';
import { WagmiProvider, useAccount, useWriteContract, useChainId, useSwitchChain } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parseUnits } from 'viem';
import { apiPost, apiGet } from '../utils/api';

// ── BSC / USDT-BEP-20 constants ───────────────────────────────────────
var USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';
var USDT_DECIMALS = 18;
var BSC_CHAIN_ID = 56;
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

// ── Module-level singleton bootstrap ──────────────────────────────────
// createAppKit must run exactly once across the entire app lifecycle.
// Cached lazily on first mount.
var _bootstrap = null;
function getBootstrap() {
  if (_bootstrap) return _bootstrap;

  var projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'b256ce910011e012fedc82dc8c11881b';

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

// ── Context ───────────────────────────────────────────────────────────
// Carries connection state + onBeforeClick gate down to PayLinks.
var WalletCtx = createContext({
  isConnected: false,
  address: null,
  chainId: null,
  onBeforeClick: null,
});

// ── Provider (wraps the page) ─────────────────────────────────────────
//
// Usage: <WalletConnectProvider onBeforeClick={ensureConsent}>{children}</WalletConnectProvider>
//
// Bootstraps Reown + wagmi providers, exposes connection state via context.
// onBeforeClick prop (typically the page's consent gate) is forwarded to
// every PayLink so it runs before any payment intent is created.

export function WalletConnectProvider(props) {
  var bs = useMemo(getBootstrap, []);

  if (bs.error) {
    // Reown init failed — render children without WC functionality
    // so the page still works (NOWPayments flow remains visible).
    return (
      <WalletCtx.Provider value={{ isConnected: false, address: null, chainId: null, onBeforeClick: null, error: bs.error }}>
        {props.children}
      </WalletCtx.Provider>
    );
  }

  return (
    <WagmiProvider config={bs.wagmiConfig}>
      <QueryClientProvider client={bs.queryClient}>
        <_WalletInner onBeforeClick={props.onBeforeClick}>{props.children}</_WalletInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function _WalletInner(props) {
  var account = useAccount();
  var chainId = useChainId();

  var ctxValue = useMemo(function() {
    return {
      isConnected: !!account.isConnected,
      address: account.address || null,
      chainId: chainId,
      onBeforeClick: props.onBeforeClick || null,
    };
  }, [account.isConnected, account.address, chainId, props.onBeforeClick]);

  return <WalletCtx.Provider value={ctxValue}>{props.children}</WalletCtx.Provider>;
}

// ── Gate (the visible "Connect wallet" button) ────────────────────────
//
// Usage: <WalletConnectGate />
//
// Single button per page. Shows "Connect wallet (BSC)" when disconnected,
// "Wallet connected: 0x12…3456 (BSC)" when connected. Calling open() on
// the connected state opens Reown's account panel where user can disconnect.

export function WalletConnectGate(props) {
  var ctx = useContext(WalletCtx);
  var appKit = null;
  // useAppKit must only be called inside the provider tree. Wrap in
  // try/catch so a missing provider doesn't crash the page.
  try { appKit = useAppKit(); } catch (e) { appKit = null; }
  var switchChain = useSwitchChain();

  if (ctx.error) {
    return (
      <div style={Object.assign({
        padding: '12px 14px', borderRadius: 10, background: '#fafafa',
        border: '1px dashed #e2e8f0', color: '#64748b', fontSize: 13,
        textAlign: 'center'
      }, props.style || {})}>
        Self-custody payment unavailable on this device.
      </div>
    );
  }

  function handleClick() {
    if (!appKit) return;
    try { appKit.open(); } catch (e) { /* user closed before open */ }
  }

  function handleSwitchToBSC() {
    if (!switchChain || !switchChain.switchChain) return;
    switchChain.switchChain({ chainId: BSC_CHAIN_ID });
  }

  if (ctx.isConnected) {
    var addr = ctx.address || '';
    var short = addr.length > 10 ? (addr.slice(0, 6) + '…' + addr.slice(-4)) : addr;
    var wrongChain = ctx.chainId && ctx.chainId !== BSC_CHAIN_ID;

    return (
      <div style={Object.assign({
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '10px 14px', borderRadius: 12,
        background: wrongChain ? '#fef3c7' : '#ecfdf5',
        border: '1px solid ' + (wrongChain ? '#fde68a' : '#a7f3d0'),
        fontSize: 13, color: wrongChain ? '#92400e' : '#065f46',
      }, props.style || {})}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: wrongChain ? '#f59e0b' : '#10b981'
          }} />
          {wrongChain ? (
            <span>Connected to wrong network — please switch to BSC</span>
          ) : (
            <span>Wallet connected: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{short}</span> · BSC</span>
          )}
        </span>
        {wrongChain ? (
          <button onClick={handleSwitchToBSC}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit'
            }}>
            Switch to BSC
          </button>
        ) : (
          <button onClick={handleClick}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: 'transparent', color: '#065f46',
              border: '1px solid #a7f3d0', cursor: 'pointer', fontFamily: 'inherit'
            }}>
            Manage
          </button>
        )}
      </div>
    );
  }

  // Disconnected state — the connect button
  var label = props.label || 'Connect wallet to pay direct (BSC)';
  return (
    <button onClick={handleClick}
      style={Object.assign({
        width: '100%',
        padding: '14px 16px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'inherit',
        border: '1.5px solid #f3ba2f',
        background: '#fff',
        color: '#92400e',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        transition: 'background .2s'
      }, props.style || {})}
      onMouseOver={function(e) { e.currentTarget.style.background = '#fffbeb'; }}
      onMouseOut={function(e) { e.currentTarget.style.background = '#fff'; }}>
      <span aria-hidden="true" style={{ fontSize: 16 }}>⛓</span>
      <span>{label}</span>
    </button>
  );
}

// ── PayLink (the per-pack/tier "Pay from wallet" trigger) ─────────────
//
// Usage:
//   <WalletPayLink
//     productType="credit_matrix"
//     productKey="credit_matrix_starter"
//     label="Pay $20 from wallet"
//     onSuccess={...}
//   />
//
// Renders nothing if wallet is disconnected (user needs to use the Gate
// first). When connected, renders a slim button that runs the payment
// flow when clicked: create-intent → switchChain (if needed) → writeContract
// → poll order until confirmed.

export function WalletPayLink(props) {
  var ctx = useContext(WalletCtx);
  var currentChainId = useChainId();
  var switchChain = useSwitchChain();
  var writeContract = useWriteContract();

  var [phase, setPhase] = useState('idle');
  // idle → creating → switching → signing → polling → confirmed | expired | error
  var [error, setError] = useState('');
  var [order, setOrder] = useState(null);
  var [txHash, setTxHash] = useState('');
  var pollTimerRef = useRef(null);

  useEffect(function() {
    return function() {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  // Don't render anything if wallet isn't connected — Gate handles that.
  if (!ctx.isConnected) return null;

  var pollOrder = useCallback(function(orderId, deadlineMs) {
    function tick() {
      if (Date.now() > deadlineMs) {
        setPhase('expired');
        setError('Payment window expired. If you sent the transaction, support can verify it manually with your tx hash.');
        return;
      }
      apiGet('/api/onchain/order/' + orderId).then(function(d) {
        if (d.status === 'confirmed') {
          setPhase('confirmed');
          if (props.onSuccess) props.onSuccess(d);
          return;
        }
        if (d.status === 'expired' || d.status === 'cancelled') {
          setPhase('expired');
          setError('Order ' + d.status + '.');
          return;
        }
        pollTimerRef.current = setTimeout(tick, 4000);
      }).catch(function(e) {
        // Transient — keep polling
        pollTimerRef.current = setTimeout(tick, 4000);
      });
    }
    pollTimerRef.current = setTimeout(tick, 4000);
  // eslint-disable-next-line
  }, [props.onSuccess]);

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

  function proceedWithPayment(intent) {
    if (currentChainId !== BSC_CHAIN_ID) {
      setPhase('switching');
      switchChain.switchChain(
        { chainId: BSC_CHAIN_ID },
        {
          onSuccess: function() { sendTransfer(intent); },
          onError: function(e) {
            setPhase('error');
            setError('Please switch your wallet to BNB Chain (BSC) and try again.');
          }
        }
      );
      return;
    }
    sendTransfer(intent);
  }

  function startFlow() {
    setError('');

    // Run page-level consent gate from context if provided
    var gate = ctx.onBeforeClick;
    var gateResult = gate ? gate() : true;

    Promise.resolve(gateResult).then(function(allowed) {
      if (!allowed) return;
      setPhase('creating');

      apiPost('/api/onchain/create-intent', {
        product_type: props.productType,
        product_key: props.productKey,
        product_meta: props.productMeta || null,
      }).then(function(intent) {
        setOrder(intent);
        proceedWithPayment(intent);
      }).catch(function(e) {
        setPhase('error');
        var msg = (e && e.message) ? e.message : 'Could not create payment intent';
        if (msg.indexOf('collision') !== -1 || msg.indexOf('High demand') !== -1) {
          setError('Lots of orders right now — please try again in a moment.');
        } else if (msg.indexOf('course_not_ready') !== -1) {
          setError('Course payments coming soon.');
        } else if (msg.indexOf('Unknown product') !== -1) {
          setError('Not available for self-custody payment yet.');
        } else {
          setError(msg);
        }
      });
    }).catch(function() {
      // Gate rejected — silent abort
    });
  }

  if (phase === 'confirmed') {
    return (
      <div style={Object.assign({
        padding: '8px 12px', borderRadius: 8, background: '#f0fdf4',
        border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600,
        fontSize: 12, textAlign: 'center'
      }, props.successStyle || {})}>
        ✓ Payment confirmed
      </div>
    );
  }

  var phaseLabels = {
    creating: 'Creating order…',
    switching: 'Switch chain in wallet…',
    signing: 'Confirm in wallet…',
    polling: 'Confirming on-chain…',
  };
  var isBusy = phase in phaseLabels;
  var btnLabel = isBusy ? phaseLabels[phase] : (props.label || 'Pay from wallet');

  return (
    <div style={{ width: '100%' }}>
      <button onClick={startFlow}
        disabled={isBusy || props.disabled}
        style={Object.assign({
          width: '100%',
          padding: '8px 0',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'inherit',
          border: '1px solid #f3ba2f',
          background: isBusy ? '#fef9c3' : '#fffbeb',
          color: '#92400e',
          cursor: (isBusy || props.disabled) ? 'wait' : 'pointer',
          transition: 'background .15s'
        }, props.style || {})}>
        {btnLabel}
      </button>
      {(phase === 'polling' || phase === 'signing') && txHash ? (
        <div style={{ marginTop: 4, fontSize: 10, color: '#64748b', textAlign: 'center', fontFamily: 'monospace' }}>
          tx: {txHash.slice(0, 8)}…{txHash.slice(-4)}
        </div>
      ) : null}
      {error ? (
        <div style={{
          marginTop: 4, padding: '4px 8px', borderRadius: 6,
          background: '#fef2f2', color: '#991b1b', fontSize: 11, textAlign: 'center'
        }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

// Default export: the provider, since that's the most common entry point
export default WalletConnectProvider;
