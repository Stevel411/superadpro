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
            return (
              <div key={p.id} style={{ background: '#fff', border: p.highlight ? '2px solid #0ea5e9' : '1px solid #e5e7eb', borderRadius: 12, padding: 32, boxShadow: p.highlight ? '0 0 0 4px rgba(14,165,233,.1),0 4px 20px rgba(14,165,233,.12)' : '0 2px 8px rgba(0,0,0,.08)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {p.highlight && (
                  <div style={{ position: 'absolute', top: 14, right: 14, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20 }}>
                    {"\u2605"} Recommended
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 36, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{p.price}</div>
                <div style={{ fontSize: 12, color: '#7b91a8', marginBottom: 20 }}>{p.priceNote || 'per member per month'}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                  {p.features.map(function(f) {
                    return (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', fontSize: 13, color: '#2d3b4e', borderBottom: '1px solid rgba(15,25,60,.04)' }}>
                        <span style={{ color: p.highlight ? '#0ea5e9' : '#16a34a', fontWeight: 800, fontSize: 12, marginTop: 2 }}>{"\u2713"}</span>{f}
                      </li>
                    );
                  })}
                </ul>

                {p.current ? (
                  <div style={{ padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 700, textAlign: 'center', background: 'linear-gradient(180deg,#dcfce7,#bbf7d0)', color: '#059669' }}>
                    {"\u2713"} Current Plan
                  </div>
                ) : p.isUpgrade ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={handleUpgradeToPro}
                      disabled={loading === 'upgrade'}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: loading === 'upgrade' ? 'default' : 'pointer', fontFamily: 'inherit', background: loading === 'upgrade' ? '#94a3b8' : 'linear-gradient(135deg,#8b5cf6,#a855f7)', color: '#fff', boxShadow: loading === 'upgrade' ? 'none' : '0 4px 0 #6d28d9,0 6px 16px rgba(139,92,246,.3)' }}
                    >
                      {loading === 'upgrade' ? 'Upgrading...' : '\u26A1 Upgrade to Pro \u2014 $15'}
                    </button>
                    <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Pay the $15 difference now. $35/mo from next renewal.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={function() { stripeCheckout(p.id); }}
                      disabled={loading === p.id + '_stripe'}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: loading === p.id + '_stripe' ? 'default' : 'pointer', fontFamily: 'inherit', background: loading === p.id + '_stripe' ? '#94a3b8' : 'linear-gradient(180deg,#38bdf8,#0ea5e9)', color: '#fff', boxShadow: loading === p.id + '_stripe' ? 'none' : '0 4px 0 #0284c7,0 6px 16px rgba(14,165,233,.3)' }}
                    >
                      <CreditCard size={16} />
                      {loading === p.id + '_stripe' ? 'Loading...' : 'Pay with Card \u2014 ' + p.price}
                    </button>

                    <button
                      onClick={function() { openCryptoCheckout(p.id); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 700, border: '2px solid #e2e8f0', cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: '#1e293b', transition: 'all .2s' }}
                      onMouseOver={function(e) { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#7c3aed'; }}
                      onMouseOut={function(e) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
                    >
                      <Coins size={16} />
                      Pay with Crypto (USDT / USDC)
                    </button>
                  </div>
                )}
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
