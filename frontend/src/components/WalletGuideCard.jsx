import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Shield, Zap, Wallet, ArrowRight } from 'lucide-react';

export default function WalletGuideCard({ compact }) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#ecfdf5)', border: '1px solid #bae6fd', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, minWidth: 44 }}>🦊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0c4a6e', marginBottom: 2 }}>Need a crypto wallet?</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Set up MetaMask in 5 minutes — free, works worldwide</div>
        </div>
        <a href="/wallet-guide" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none', padding: '6px 14px', border: '1px solid #0ea5e9', borderRadius: 8, whiteSpace: 'nowrap' }}>
          Full Guide <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#ecfdf5)', padding: '24px 28px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💰</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0c4a6e' }}>Crypto Wallet Setup</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>5 minutes to get started — even if you've never used crypto</div>
          </div>
        </div>

        {/* Quick steps */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { num: '1', label: 'Get MetaMask', color: '#0ea5e9' },
            { num: '2', label: 'Add Polygon', color: '#10b981' },
            { num: '3', label: 'Buy USDT/USDC', color: '#f59e0b' },
          ].map(s => (
            <div key={s.num} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e8ecf2' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', minWidth: 26 }}>{s.num}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable detail */}
      <div style={{ padding: '0 28px' }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', cursor: 'pointer', borderBottom: expanded ? '1px solid #f1f5f9' : 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0ea5e9' }}>{expanded ? 'Hide details' : 'Show step-by-step guide'}</span>
          {expanded ? <ChevronUp size={16} color="#0ea5e9" /> : <ChevronDown size={16} color="#0ea5e9" />}
        </div>

        {expanded && (
          <div style={{ paddingBottom: 24 }}>
            {/* Step 1 */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>1</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Download MetaMask</div>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
                MetaMask is a free wallet app used by over 100 million people. Download it from <strong style={{ color: '#0f172a' }}>metamask.io</strong> as a browser extension or mobile app.
              </p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
                Create a new wallet, set a password, and <strong style={{ color: '#dc2626' }}>write down your 12-word recovery phrase on paper</strong>. Never share these words with anyone — they are the only way to recover your wallet.
              </p>
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none' }}>
                Download MetaMask <ExternalLink size={11} />
              </a>
            </div>

            {/* Step 2 */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>2</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Switch to Polygon network</div>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
                SuperAdPro uses Polygon because transactions cost <strong style={{ color: '#0f172a' }}>less than 1 cent</strong> (vs $5-15 on Ethereum). In MetaMask, tap the network dropdown at the top and select <strong style={{ color: '#0f172a' }}>Polygon Mainnet</strong>. It's usually pre-loaded — just select it.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: '#fef2f2', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#991b1b' }}>
                  <strong>Ethereum:</strong> $8.50/transfer
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#166534' }}>
                  <strong>Polygon:</strong> &lt;$0.01/transfer
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ padding: '20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>3</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Buy USDT or USDC</div>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
                Buy USDT or USDC on any exchange (Binance, Kraken, etc.), then withdraw to your MetaMask address. <strong style={{ color: '#dc2626' }}>Always select Polygon as the withdrawal network</strong> — wrong network means lost funds.
              </p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                You'll also need ~$0.50 of POL for gas fees. That's enough for hundreds of transactions.
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <Shield size={18} color="#0ea5e9" />
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>Your money, your control.</strong> No payment processor can freeze your funds. Commissions pay out directly to your wallet.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div style={{ padding: '14px 28px', borderTop: '1px solid #f1f5f9', background: '#fafbfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Need more detail?</span>
        <a href="/wallet-guide" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none' }}>
          Full visual guide <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
