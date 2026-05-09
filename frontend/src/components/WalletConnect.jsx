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

    var appKitInstance = createAppKit({
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
      appKit: appKitInstance,
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
  // Set when user picks a wallet from Reown's picker; cleared when
  // connection succeeds or modal closes. Drives ConnectionGuide modal.
  selectedWallet: null,
});

// ── Wallet catalog ────────────────────────────────────────────────────
// Maps known wallet names (as Reown emits them in SELECT_WALLET events)
// to display info + connection-flow type. Anything not in this catalog
// falls through to a generic "your wallet" template.
//
// `kind` controls which guide variant renders:
//   'extension' — browser extension wallet (point at toolbar)
//   'hardware'  — physical USB device (Ledger, Trezor)
//   'qrcode'    — mobile via WalletConnect QR (Reown's QR display)
//   'mobile'    — direct mobile-app deep link
//
// `letter` and `bg` produce a fallback colored badge if no icon is shown.
// We avoid embedding wallet logos because that can look like impersonation
// and creates a maintenance burden when wallets rebrand.

var WALLET_CATALOG = {
  // Extension wallets
  'metamask':       { kind: 'extension', letter: 'M', bg: '#f56500', name: 'MetaMask' },
  'binance wallet': { kind: 'extension', letter: 'B', bg: '#f0b90b', name: 'Binance Wallet' },
  'coinbase wallet':{ kind: 'extension', letter: 'C', bg: '#0052ff', name: 'Coinbase Wallet' },
  'safepal':        { kind: 'extension', letter: 'S', bg: '#5648e7', name: 'SafePal' },
  'brave wallet':   { kind: 'extension', letter: 'B', bg: '#fb542b', name: 'Brave Wallet' },
  'phantom':        { kind: 'extension', letter: 'P', bg: '#ab9ff2', name: 'Phantom' },
  // Hardware wallets (typically used via WalletConnect or browser bridge)
  'ledger':         { kind: 'hardware',  letter: 'L', bg: '#1f1f1f', name: 'Ledger' },
  'trezor':         { kind: 'hardware',  letter: 'T', bg: '#0c684e', name: 'Trezor' },
  // Common mobile-first wallets that connect via QR
  'trust wallet':   { kind: 'qrcode',    letter: 'T', bg: '#3375bb', name: 'Trust Wallet' },
  'rainbow':        { kind: 'qrcode',    letter: 'R', bg: '#001e59', name: 'Rainbow' },
  'walletconnect':  { kind: 'qrcode',    letter: 'W', bg: '#3b99fc', name: 'WalletConnect' },
};

function lookupWalletInfo(name, platform) {
  // Normalize name for catalog lookup. Reown emits names like "MetaMask",
  // "Trust Wallet", "Coinbase Wallet" — we lowercase for case-insensitive
  // match.
  var key = (name || '').toLowerCase().trim();
  var hit = WALLET_CATALOG[key];
  if (hit) return hit;

  // Fallback: derive kind from Reown's platform field. 'browser' is a
  // browser extension; 'qrcode' is mobile QR scanning; everything else
  // we treat as qrcode (closest behaviour from a UX standpoint — there's
  // nothing for the user to do in our tab, just like QR).
  var kindByPlatform = {
    'browser':  'extension',
    'desktop':  'extension',
    'qrcode':   'qrcode',
    'mobile':   'qrcode',
    'web':      'qrcode',
  };
  return {
    kind: kindByPlatform[platform] || 'extension',
    letter: (name || '?').charAt(0).toUpperCase(),
    bg: '#5b6577',
    name: name || 'your wallet',
  };
}


// ── ConnectionGuide modal ─────────────────────────────────────────────
//
// Renders alongside Reown's modal when the user has picked a wallet but
// hasn't completed connection. Shows wallet-specific instructions so
// users know exactly what to do next (which avoids the "spinner with
// no direction" trap that confused Steve during 7 May testing).
//
// Three variants based on wallet.kind:
//   - extension: animated arrow + "click your [wallet] icon in toolbar"
//   - hardware: numbered steps + "approve on the device"
//   - qrcode: short hint that Reown is showing a QR; we don't replace
//     Reown's QR display, just augment with clarity above it
//
// Auto-times-out at 30s with a "Can't reach your wallet" recovery state.

function ConnectionGuide(props) {
  var wallet = props.wallet;  // null when nothing selected
  var isConnected = props.isConnected;
  var [timedOut, setTimedOut] = useState(false);

  // Reset timeout each time a new wallet is selected.
  useEffect(function() {
    if (!wallet || isConnected) {
      setTimedOut(false);
      return;
    }
    var t = setTimeout(function() { setTimedOut(true); }, 30000);
    return function() { clearTimeout(t); };
  }, [wallet && wallet.selectedAt, isConnected]);

  if (!wallet || isConnected) return null;

  var info = lookupWalletInfo(wallet.name, wallet.platform);

  // For QR-flow wallets we DON'T render an overlay — Reown's QR is
  // already clear and self-explanatory. Returning null lets Reown's
  // modal show through unobstructed.
  if (info.kind === 'qrcode') return null;

  // Common modal shell
  var overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,  // above Reown (which uses ~9000)
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backdropFilter: 'blur(2px)',
  };
  var cardStyle = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: 28,
    maxWidth: 380,
    width: '100%',
    fontFamily: 'inherit',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  };

  // ── Timed-out state (after 30s with no connection) ───
  if (timedOut) {
    return (
      <div style={overlayStyle} onClick={function(e){ if(e.target===e.currentTarget) props.onCancel(); }}>
        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:40, height:40, borderRadius:8, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⚠</div>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:'#0f172a' }}>Can't reach your {info.name.toLowerCase()}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>No response after 30 seconds</div>
            </div>
          </div>
          <div style={{ fontSize:13, color:'#475569', lineHeight:1.6, marginBottom:16 }}>
            Either approve the request in your wallet, or pick a different wallet to connect with.
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={function(){ setTimedOut(false); }} style={btnSecondary}>Try again</button>
            <button onClick={props.onCancel} style={btnPrimary}>Choose different wallet</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Hardware wallet variant ───
  if (info.kind === 'hardware') {
    var hwSteps = info.name === 'Ledger'
      ? ['Plug your Ledger into a USB port', 'Enter your PIN on the device', 'Open the Ethereum app on your device, then approve the connection']
      : info.name === 'Trezor'
      ? ['Plug your Trezor into a USB port', 'Unlock the device with your PIN', 'Approve the connection on the device screen']
      : ['Plug your hardware wallet into a USB port', 'Unlock the device', 'Approve the connection on the device'];

    return (
      <div style={overlayStyle} onClick={function(e){ if(e.target===e.currentTarget) props.onCancel(); }}>
        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:40, height:40, borderRadius:8, background:info.bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:600 }}>{info.letter}</div>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:'#0f172a' }}>Connecting to {info.name}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>Follow the steps on your device</div>
            </div>
          </div>
          <div style={{ background:'#eff6ff', border:'1px solid #dbeafe', borderRadius:10, padding:18, marginBottom:14 }}>
            {hwSteps.map(function(step, i) {
              return (
                <div key={i} style={{ display:'flex', gap:12, marginBottom: i < hwSteps.length - 1 ? 12 : 0, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'#fff', color:'#1e40af', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>{i+1}</div>
                  <div style={{ fontSize:13, color:'#1e3a8a', lineHeight:1.5, paddingTop:1 }}>{step}</div>
                </div>
              );
            })}
          </div>
          {info.name === 'Ledger' ? (
            <div style={{ fontSize:11, color:'#64748b', lineHeight:1.5, marginBottom:14, padding:'10px 12px', background:'#f8fafc', borderRadius:8 }}>
              <strong style={{ color:'#0f172a', fontWeight:600 }}>Tip:</strong> Make sure firmware is up to date and the Ethereum app is installed via Ledger Live.
            </div>
          ) : null}
          <button onClick={props.onCancel} style={btnSecondary}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── Extension wallet variant (default) ───
  return (
    <div style={overlayStyle} onClick={function(e){ if(e.target===e.currentTarget) props.onCancel(); }}>
      <div style={cardStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
          <div style={{ width:40, height:40, borderRadius:8, background:info.bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:600 }}>{info.letter}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:'#0f172a' }}>Connecting to {info.name}</div>
            <div style={{ fontSize:12, color:'#64748b' }}>Waiting for your approval</div>
          </div>
          {/* Breathing dot — subtle visual progress signal */}
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'wcg-pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ background:'#eff6ff', border:'1px solid #dbeafe', borderRadius:10, padding:20, marginBottom:14, textAlign:'center' }}>
          {/* Animated arrow */}
          <div style={{ fontSize:36, lineHeight:1, marginBottom:10, color:'#1e40af', animation:'wcg-arrow 1.6s ease-in-out infinite' }}>↗</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#1e3a8a', marginBottom:8, lineHeight:1.4 }}>
            Click your {info.name} icon
          </div>
          <div style={{ fontSize:13, color:'#1e40af', lineHeight:1.5 }}>
            Look at the top-right of your browser window. Click the {info.name} icon and approve the connection.
          </div>
        </div>
        <div style={{ fontSize:11, color:'#64748b', lineHeight:1.5, marginBottom:14, padding:'10px 12px', background:'#f8fafc', borderRadius:8 }}>
          <strong style={{ color:'#0f172a', fontWeight:600 }}>Don't see the icon?</strong> It might be hidden behind the puzzle-piece "Extensions" icon in your toolbar.
        </div>
        <button onClick={props.onCancel} style={btnSecondary}>Cancel</button>
        <style>{
          '@keyframes wcg-pulse{' +
            '0%,100%{opacity:0.4;transform:scale(0.85)}' +
            '50%{opacity:1;transform:scale(1.1)}' +
          '}' +
          '@keyframes wcg-arrow{' +
            '0%,100%{transform:translate(0,0)}' +
            '50%{transform:translate(4px,-4px)}' +
          '}'
        }</style>
      </div>
    </div>
  );
}

// Shared button styles for ConnectionGuide
var btnSecondary = {
  width: '100%',
  padding: 11,
  background: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  color: '#475569',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
var btnPrimary = {
  flex: 1,
  padding: 11,
  background: '#0ea5e9',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
};


// Wallet selection metadata — see Step 3 (catalog) in the SELECT_WALLET
// branch below for what gets stored. Shape:
//   { name: string, platform: 'browser'|'qrcode'|'mobile'|'web', selectedAt: number }


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
      <WalletCtx.Provider value={{ isConnected: false, address: null, chainId: null, onBeforeClick: null, selectedWallet: null, error: bs.error }}>
        {props.children}
      </WalletCtx.Provider>
    );
  }

  return (
    <WagmiProvider config={bs.wagmiConfig}>
      <QueryClientProvider client={bs.queryClient}>
        <_WalletInner appKit={bs.appKit} onBeforeClick={props.onBeforeClick}>{props.children}</_WalletInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function _WalletInner(props) {
  var account = useAccount();
  var chainId = useChainId();
  var [selectedWallet, setSelectedWallet] = useState(null);

  // Subscribe to Reown events. We listen for SELECT_WALLET (user picked a
  // wallet from Reown's picker — sets selectedWallet, drives our
  // ConnectionGuide modal) and MODAL_CLOSE (user dismissed the picker
  // without connecting — clears selectedWallet so the guide doesn't
  // linger).
  //
  // Auto-clear on connection success: handled by the effect below
  // watching account.isConnected.
  useEffect(function() {
    var appKit = props.appKit;
    if (!appKit || typeof appKit.subscribeEvents !== 'function') return;
    var unsubscribe = appKit.subscribeEvents(function(state) {
      var ev = state && state.data;
      if (!ev || ev.type !== 'track') return;
      if (ev.event === 'SELECT_WALLET') {
        var props2 = ev.properties || {};
        setSelectedWallet({
          name: props2.name || 'wallet',
          platform: props2.platform || 'browser',
          selectedAt: Date.now(),
        });
      } else if (ev.event === 'MODAL_CLOSE') {
        // If user closed Reown's modal without connecting, dismiss our guide.
        // Connection success is handled separately by the isConnected effect.
        if (!ev.properties || !ev.properties.connected) {
          setSelectedWallet(null);
        }
      }
    });
    return function() {
      try { unsubscribe(); } catch (e) {}
    };
  }, [props.appKit]);

  // Clear selectedWallet once connection completes. This dismisses the
  // ConnectionGuide modal automatically without us needing to react to
  // a SUCCESS event (which Reown doesn't reliably emit for all wallet
  // types — wagmi's account.isConnected is the source of truth).
  useEffect(function() {
    if (account.isConnected && selectedWallet) {
      setSelectedWallet(null);
    }
  }, [account.isConnected]);

  var ctxValue = useMemo(function() {
    return {
      isConnected: !!account.isConnected,
      address: account.address || null,
      chainId: chainId,
      onBeforeClick: props.onBeforeClick || null,
      selectedWallet: selectedWallet,
    };
  }, [account.isConnected, account.address, chainId, props.onBeforeClick, selectedWallet]);

  return (
    <WalletCtx.Provider value={ctxValue}>
      {props.children}
      <ConnectionGuide
        wallet={selectedWallet}
        isConnected={!!account.isConnected}
        onCancel={function() { setSelectedWallet(null); }}
      />
    </WalletCtx.Provider>
  );
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
  // useAppKit() returns a stable handle — calling it is safe even outside
  // a Reown-aware tree (it just returns no-ops). Must be called
  // unconditionally to satisfy Rules of Hooks.
  var appKit = useAppKit();
  var switchChain = useSwitchChain();
  var compact = props.variant === 'compact';

  if (ctx.error) {
    if (compact) return null; // hide silently in compact mode
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
    if (!appKit || !appKit.open) return;
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

    if (compact) {
      // Compact connected state — small pill with status dot + short addr.
      // Click opens Reown account modal where user can disconnect/switch.
      return (
        <button onClick={wrongChain ? handleSwitchToBSC : handleClick}
          style={Object.assign({
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: wrongChain ? '#fef3c7' : '#ecfdf5',
            border: '1px solid ' + (wrongChain ? '#fde68a' : '#a7f3d0'),
            color: wrongChain ? '#92400e' : '#065f46',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'opacity .15s',
          }, props.style || {})}
          title={wrongChain ? 'Wrong chain — click to switch to BSC' : 'Click to manage'}
          onMouseOver={function(e) { e.currentTarget.style.opacity = '0.85'; }}
          onMouseOut={function(e) { e.currentTarget.style.opacity = '1'; }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: wrongChain ? '#f59e0b' : '#10b981'
          }} />
          {wrongChain ? (
            <span>Switch to BSC</span>
          ) : (
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{short}</span>
          )}
        </button>
      );
    }

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

  // Disconnected state — compact "Connect Wallet" pill for header
  if (compact) {
    return (
      <button onClick={handleClick}
        style={Object.assign({
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit',
          border: 'none',
          background: 'linear-gradient(135deg, #f3ba2f 0%, #e8a317 100%)',
          color: '#1a1a1a',
          cursor: 'pointer',
          transition: 'transform .15s, box-shadow .15s, filter .15s',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(243, 186, 47, 0.4), 0 0 0 1px rgba(243, 186, 47, 0.3)',
        }, props.style || {})}
        onMouseOver={function(e) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(243, 186, 47, 0.55), 0 0 0 1px rgba(243, 186, 47, 0.5)';
          e.currentTarget.style.filter = 'brightness(1.05)';
        }}
        onMouseOut={function(e) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(243, 186, 47, 0.4), 0 0 0 1px rgba(243, 186, 47, 0.3)';
          e.currentTarget.style.filter = 'brightness(1)';
        }}>
        <span aria-hidden="true" style={{ fontSize: 13 }}>⛓</span>
        <span>{props.label || 'Connect Wallet'}</span>
      </button>
    );
  }

  // Disconnected state — full-width connect button (page-level)
  var label = props.label || 'Connect wallet to pay direct (BSC)';
  return (
    <button onClick={handleClick}
      style={Object.assign({
        width: '100%',
        padding: '16px 20px',
        borderRadius: 12,
        fontSize: 16,
        fontWeight: 800,
        fontFamily: 'inherit',
        border: 'none',
        // Filled orange gradient with white text — confident "connect to
        // pay" action signal. Was previously white-with-thin-amber-border
        // which read as a tertiary option rather than a real CTA.
        // (Updated 9 May 2026.)
        background: 'linear-gradient(135deg,#ea580c,#f97316)',
        color: '#fff',
        boxShadow: '0 4px 14px rgba(249,115,22,.35)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        letterSpacing: '.2px',
        transition: 'transform .15s, box-shadow .25s',
      }, props.style || {})}
      onMouseOver={function(e) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(249,115,22,.45)'; }}
      onMouseOut={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(249,115,22,.35)'; }}>
      <span aria-hidden="true" style={{ fontSize: 18 }}>⛓</span>
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
  // Mirror txHash in a ref so the pollOrder closure can read the latest
  // value when redirecting to /payment-success. Avoids re-creating the
  // useCallback every render just to capture a fresh tx hash.
  var txHashRef = useRef('');

  useEffect(function() {
    return function() {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  // pollOrder must be declared BEFORE any early return so the hook
  // count is stable across renders (Rules of Hooks → React error #310).
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
          if (props.onSuccess) {
            // Page-supplied onSuccess wins (inline UX, e.g. CreditMatrix
            // showing a toast and refreshing data without leaving the page).
            props.onSuccess(d);
          } else {
            // Default: redirect to the payment-success page so the user
            // gets a proper on-chain receipt with tx hash + BscScan link.
            // Includes tx_hash as a query param so the receipt page can
            // render the on-chain block.
            var qs = new URLSearchParams();
            qs.set('type', props.productType || 'membership');
            qs.set('source', 'walletconnect');
            var hashForRedirect = d.tx_hash || txHashRef.current;
            if (hashForRedirect) qs.set('tx_hash', hashForRedirect);
            if (d.order_id) qs.set('order_id', String(d.order_id));
            window.location.href = '/payment-success?' + qs.toString();
          }
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
  }, [props.onSuccess, props.productType]);

  // Don't render anything if wallet isn't connected — Gate handles that.
  // This early return MUST come AFTER all hook calls above.
  if (!ctx.isConnected) return null;

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
          txHashRef.current = hash;
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
        // Pass the connected wallet address so the backend can reject
        // treasury self-pay attempts (member accidentally connected the
        // treasury wallet — see backend create-intent guard).
        from_address: ctx.address || null,
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
        } else if (msg.indexOf('treasury_self_pay') !== -1 || msg.indexOf("treasury wallet") !== -1) {
          setError("You're connected with the treasury wallet. Please disconnect and reconnect with a member wallet.");
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
          border: 'none',
          // Green is the platform-wide action colour for payment buttons
          // (decided 9 May 2026 — applies to all WalletPayLink instances:
          // checkout, credit nexus, gift voucher, tier activation). Was
          // previously pale yellow / BNB Chain colours which read as a
          // brand badge rather than 'click to pay'. Green = ready to act.
          background: isBusy ? '#86efac' : 'linear-gradient(135deg,#10b981,#059669)',
          color: '#fff',
          boxShadow: isBusy ? 'none' : '0 4px 12px rgba(16,185,129,.35)',
          cursor: (isBusy || props.disabled) ? 'wait' : 'pointer',
          transition: 'all .2s'
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
