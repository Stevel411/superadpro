import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { CreditCard, Coins } from 'lucide-react';
import CryptoCheckout from '../components/CryptoCheckout';
import WalletGuideCard from '../components/WalletGuideCard';

export default function Upgrade() {
  var { user, refreshUser } = useAuth();
  var isPro = user?.membership_tier === 'pro';
  var isActive = user?.is_active;
  var [loading, setLoading] = useState('');
  var [error, setError] = useState('');
  var [cryptoCheckout, setCryptoCheckout] = useState(null);

  function stripeCheckout(tier) {
    setLoading(tier + '_stripe');
    setError('');
    apiPost('/api/stripe/create-membership-checkout', { tier })
      .then(function(d) {
        setLoading('');
        if (d.url) { window.location.href = d.url; }
        else { setError(d.error || 'Could not start checkout. Please try again.'); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || 'Checkout failed.'); });
  }

  function openCryptoCheckout(tier) {
    var label = tier === 'pro' ? 'Pro Membership — $35/mo' : 'Basic Membership — $20/mo';
    setCryptoCheckout({ productKey: 'membership_' + tier, label: label });
  }

  var isBasicActive = isActive && !isPro;

  function handleUpgradeToPro() {
    setLoading('upgrade');
    setError('');
    apiPost('/api/upgrade-to-pro', {})
      .then(function(d) {
        setLoading('');
        if (d.message) { if (refreshUser) refreshUser(); }
        else { setError(d.error || 'Upgrade failed.'); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || 'Upgrade failed.'); });
  }

  var plans = [
    {
      id: 'basic', name: 'Basic', price: '$20/mo',
      features: ['Affiliate commissions', 'Income Grid access', 'Watch to Earn', 'Course marketplace', 'LinkHub page', 'Community Ad Board', 'Basic support'],
      current: isActive && !isPro, highlight: false,
    },
    {
      id: 'pro', name: 'Pro', price: isBasicActive ? '$15 upgrade' : '$35/mo',
      priceNote: isBasicActive ? 'then $35/mo from next month' : 'per member per month',
      features: ['Everything in Basic', 'ProSeller AI assistant', 'AI Funnel Generator', 'SuperLeads CRM', 'Campaign Studio', 'Niche Finder AI', 'Social Post Generator', 'Video Script Generator', 'Email Swipes', 'Lead dashboard', 'Priority support'],
      current: isPro, highlight: true, isUpgrade: isBasicActive,
    },
  ];

  return (
    <AppLayout title={"\u26A1 Upgrade"} subtitle="Compare plans and unlock Pro features">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#dc2626', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {plans.map(function(p) {
            var isHighlight = p.highlight;
            return (
              <div key={p.id} style={{
                background: isHighlight ? 'linear-gradient(160deg,#f8faff,#eef4ff,#f0f7ff)' : '#fff',
                border: isHighlight ? '2px solid #0ea5e9' : '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 0,
                boxShadow: isHighlight ? '0 0 0 4px rgba(14,165,233,.08),0 8px 32px rgba(14,165,233,.15)' : '0 2px 12px rgba(0,0,0,.06)',
                position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
              }}>
                {/* Top accent bar */}
                <div style={{ height: 4, background: isHighlight ? 'linear-gradient(90deg,#0ea5e9,#38bdf8,#8b5cf6)' : 'linear-gradient(90deg,#e2e8f0,#cbd5e1)' }}/>

                {isHighlight && (
                  <div style={{ position: 'absolute', top: 18, right: 16, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(14,165,233,.3)' }}>
                    {"\u2B50"} Recommended
                  </div>
                )}

                <div style={{ padding: '28px 28px 0' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: isHighlight ? '#0ea5e9' : '#94a3b8', marginBottom: 10 }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 42, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{p.price.split('/')[0]}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>/{p.price.includes('upgrade') ? 'upgrade' : 'mo'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>{p.priceNote || 'per member per month'}</div>

                  {/* Feature list */}
                  <div style={{ marginBottom: 24 }}>
                    {p.features.map(function(f, i) {
                      var isFirst = i === 0 && isHighlight;
                      return (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(15,25,60,.04)' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isHighlight ? 'rgba(14,165,233,.1)' : 'rgba(16,163,127,.08)', fontSize: 11 }}>
                            <span style={{ color: isHighlight ? '#0ea5e9' : '#16a34a', fontWeight: 900 }}>{"\u2713"}</span>
                          </div>
                          <span style={{ fontSize: 13, color: isFirst ? '#0f172a' : '#475569', fontWeight: isFirst ? 700 : 400 }}>{f}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ padding: '0 28px 28px', marginTop: 'auto' }}>
                  {p.current ? (
                    <div style={{ padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 700, textAlign: 'center', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#059669', border: '1px solid #86efac' }}>
                      {"\u2713"} Current Plan
                    </div>
                  ) : p.isUpgrade ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button
                        onClick={handleUpgradeToPro}
                        disabled={loading === 'upgrade'}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 800, border: 'none', cursor: loading === 'upgrade' ? 'default' : 'pointer', fontFamily: 'inherit', background: loading === 'upgrade' ? '#94a3b8' : 'linear-gradient(135deg,#8b5cf6,#a855f7)', color: '#fff', boxShadow: loading === 'upgrade' ? 'none' : '0 4px 0 #6d28d9,0 6px 20px rgba(139,92,246,.35)', letterSpacing: 0.3 }}
                      >
                        {loading === 'upgrade' ? 'Upgrading...' : '\u26A1 Upgrade to Pro \u2014 $15'}
                      </button>
                      <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Pay the $15 difference now. $35/mo from next renewal.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Crypto button FIRST — bright purple gradient */}
                      <button
                        onClick={function() { openCryptoCheckout(p.id); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 0 #5b21b6,0 6px 20px rgba(124,58,237,.35)', letterSpacing: 0.3, transition: 'all .2s' }}
                      >
                        <Coins size={17} />
                        Pay with Crypto (USDT / USDC)
                      </button>

                      {/* Card button SECOND — lighter style */}
                      <button
                        onClick={function() { stripeCheckout(p.id); }}
                        disabled={loading === p.id + '_stripe'}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 700, border: '2px solid #e2e8f0', cursor: loading === p.id + '_stripe' ? 'default' : 'pointer', fontFamily: 'inherit', background: '#fff', color: '#475569', transition: 'all .2s' }}
                        onMouseOver={function(e) { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
                        onMouseOut={function(e) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                      >
                        <CreditCard size={16} />
                        {loading === p.id + '_stripe' ? 'Loading...' : 'Pay with Card \u2014 ' + p.price}
                      </button>

                      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>{"\uD83D\uDD12"} Secure payment · Instant activation</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24 }}>
          <WalletGuideCard compact />
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
          Secure payment via Stripe or USDT/USDC on Polygon {"\u00B7"} All sales are final {"\u00B7"} No refunds
        </p>
      </div>

      {cryptoCheckout && (
        <CryptoCheckout
          productKey={cryptoCheckout.productKey}
          productLabel={cryptoCheckout.label}
          onSuccess={function() { setCryptoCheckout(null); if (refreshUser) refreshUser(); }}
          onCancel={function() { setCryptoCheckout(null); }}
        />
      )}
    </AppLayout>
  );
}
