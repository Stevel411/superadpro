import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Shield, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';

var STEPS = [
  {
    num: '1', title: 'Download MetaMask', color: '#0ea5e9', bg: '#e0f2fe',
    content: [
      'MetaMask is a free crypto wallet used by over 100 million people worldwide. It works as a browser extension on desktop and as a mobile app on iOS and Android.',
      'Go to metamask.io and download the official app. Create a new wallet, set a strong password, and you will be given a 12-word recovery phrase.',
    ],
    warning: 'Write your 12-word recovery phrase on paper and store it somewhere safe. Never share these words with anyone — they are the only way to recover your wallet if you lose access.',
    link: { url: 'https://metamask.io/download/', label: 'Download MetaMask' },
  },
  {
    num: '2', title: 'Switch to Polygon network', color: '#10b981', bg: '#d1fae5',
    content: [
      'SuperAdPro uses the Polygon network because transactions cost less than 1 cent, compared to $5-15 on Ethereum. This means more of your money stays in your pocket.',
      'In MetaMask, tap the network dropdown at the top of the screen and select "Polygon Mainnet". It is usually pre-loaded — just select it. If you do not see it, tap "Add Network" and search for Polygon.',
    ],
    comparison: { bad: { label: 'Ethereum', cost: '$8.50/transfer', color: '#dc2626' }, good: { label: 'Polygon', cost: '<$0.01/transfer', color: '#16a34a' } },
  },
  {
    num: '3', title: 'Get your wallet address', color: '#8b5cf6', bg: '#ede9fe',
    content: [
      'Your wallet address is like your bank account number — it is safe to share. In MetaMask, tap your account name at the top to copy your address. It starts with "0x" and is 42 characters long.',
      'You will need this address to receive commissions from SuperAdPro and to add it to your account settings.',
    ],
    tip: 'Go to your Account page on SuperAdPro and paste your wallet address in the Crypto Wallet section. This is where your commissions will be paid.',
  },
  {
    num: '4', title: 'Buy USDT for payments', color: '#f59e0b', bg: '#fef3c7',
    content: [
      'USDT (Tether) is a stablecoin — its value stays at $1. You use USDT to pay for memberships and campaign tiers on SuperAdPro.',
      'You can buy USDT on any major exchange like Binance, Kraken, or Coinbase. Once purchased, withdraw the USDT to your MetaMask wallet address.',
    ],
    warning: 'Always select "Polygon" as the withdrawal network when sending USDT to your MetaMask. Selecting the wrong network (like Ethereum) means your funds will arrive on a different network and may not be accessible.',
    tip: 'You will also need approximately $0.50 worth of POL (Polygon\'s native token) for transaction fees. This small amount is enough for hundreds of transactions.',
  },
  {
    num: '5', title: 'You are ready', color: '#16a34a', bg: '#dcfce7',
    content: [
      'Your MetaMask wallet is now set up on Polygon with USDT. You can pay for your SuperAdPro membership, activate campaign tiers, and receive commission payments — all directly to your wallet.',
      'No payment processor can freeze your funds. No banks involved. Your money, your control. Commissions are paid directly to your wallet address.',
    ],
  },
];

export default function CryptoGuide() {
  var [expanded, setExpanded] = useState(null);

  return (
    <AppLayout title="Crypto Wallet Guide" subtitle="Set up your wallet in 5 minutes">

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 18,
        padding: '32px 36px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(14,165,233,.1)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, position: 'relative' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={28} color="#fff"/>
          </div>
          <div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 24, fontWeight: 800, color: '#fff' }}>Crypto Wallet Setup</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>Even if you have never used crypto before</div>
          </div>
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 600, position: 'relative' }}>
          SuperAdPro uses cryptocurrency for payments and commissions. This guide walks you through setting up a free wallet in about 5 minutes. No technical knowledge required.
        </div>
      </div>

      {/* Quick overview */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {STEPS.map(function(s) {
          return <div key={s.num} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{s.num}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{s.title}</div>
          </div>;
        })}
      </div>

      {/* Step cards */}
      {STEPS.map(function(s, i) {
        var isOpen = expanded === i || expanded === null;
        return <div key={s.num} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 14, overflow: 'hidden' }}>
          <div onClick={function() { setExpanded(expanded === i ? -1 : i); }}
            style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: s.color }}>{s.num}</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{s.title}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>Step {s.num} of 5</div>
              </div>
            </div>
            {isOpen ? <ChevronUp size={20} color="#94a3b8"/> : <ChevronDown size={20} color="#94a3b8"/>}
          </div>

          {isOpen && (
            <div style={{ padding: '0 24px 24px' }}>
              {s.content.map(function(p, pi) {
                return <p key={pi} style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, margin: '0 0 12px' }}>{p}</p>;
              })}

              {s.warning && (
                <div style={{ display: 'flex', gap: 12, padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 12 }}>
                  <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }}/>
                  <div style={{ fontSize: 15, color: '#991b1b', lineHeight: 1.7, fontWeight: 600 }}>{s.warning}</div>
                </div>
              )}

              {s.tip && (
                <div style={{ display: 'flex', gap: 12, padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 12 }}>
                  <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }}/>
                  <div style={{ fontSize: 15, color: '#166534', lineHeight: 1.7 }}>{s.tip}</div>
                </div>
              )}

              {s.comparison && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: '#fef2f2', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#991b1b' }}>{s.comparison.bad.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{s.comparison.bad.cost}</div>
                  </div>
                  <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>{s.comparison.good.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{s.comparison.good.cost}</div>
                  </div>
                </div>
              )}

              {s.link && (
                <a href={s.link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: s.color, textDecoration: 'none', padding: '8px 16px', border: '1px solid ' + s.color, borderRadius: 10 }}>
                  {s.link.label} <ExternalLink size={14}/>
                </a>
              )}
            </div>
          )}
        </div>;
      })}

      {/* Security footer */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Shield size={24} color="#0ea5e9"/>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Your money, your control</div>
          <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7 }}>No payment processor can freeze your funds. Commissions pay out directly to your wallet. No banks, no middlemen, no delays.</div>
        </div>
      </div>

    </AppLayout>
  );
}
