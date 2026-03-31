import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { Coins, Globe } from 'lucide-react';
import CryptoCheckout from '../components/CryptoCheckout';
import WalletGuideCard from '../components/WalletGuideCard';

export default function Upgrade() {
  var { user, refreshUser } = useAuth();
  var isPro = user?.membership_tier === 'pro';
  var isActive = user?.is_active;
  var [loading, setLoading] = useState('');
  var [error, setError] = useState('');
  var [cryptoCheckout, setCryptoCheckout] = useState(null);
  var [billing, setBilling] = useState('monthly');

  var isAnnual = billing === 'annual';

  function nowPaymentsCheckout(tier) {
    setLoading(tier + '_np');
    setError('');
    var productKey = isAnnual ? 'membership_' + tier + '_annual' : 'membership_' + tier;
    apiPost('/api/nowpayments/create-invoice', { product_key: productKey })
      .then(function(d) {
        setLoading('');
        if (d.invoice_url) { window.location.href = d.invoice_url; }
        else { setError(d.error || 'Could not start checkout. Please try again.'); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || 'Checkout failed.'); });
  }

  function openCryptoCheckout(tier) {
    var label = isAnnual
      ? (tier === 'pro' ? 'Pro Annual — $350/year' : 'Basic Annual — $200/year')
      : (tier === 'pro' ? 'Pro Membership — $35/mo' : 'Basic Membership — $20/mo');
    var productKey = isAnnual ? 'membership_' + tier + '_annual' : 'membership_' + tier;
    setCryptoCheckout({ productKey: productKey, label: label });
  }

  var isBasicActive = isActive && !isPro;
  var p_basic_current = isActive && !isPro;

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

        {/* ── Billing Toggle ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 4, gap: 4 }}>
            <button onClick={function(){setBilling('monthly')}} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: billing === 'monthly' ? '#0ea5e9' : 'transparent', color: billing === 'monthly' ? '#fff' : '#64748b', transition: 'all .2s' }}>Monthly</button>
            <button onClick={function(){setBilling('annual')}} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: billing === 'annual' ? '#0ea5e9' : 'transparent', color: billing === 'annual' ? '#fff' : '#64748b', transition: 'all .2s', position: 'relative' }}>
              Annual
              <span style={{ position: 'absolute', top: -8, right: -12, padding: '2px 8px', borderRadius: 10, background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: .5 }}>SAVE 17%</span>
            </button>
          </div>
        </div>

        <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch' }}>

          {/* ── BASIC CARD ── */}
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <style>{`
              @keyframes upFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
              @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}
              @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
              @keyframes slideBar{0%{width:0}100%{width:60%}}
            `}</style>
            {/* Header with animation */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '28px 28px 24px', position: 'relative', overflow: 'hidden', minHeight: 130 }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }}/>
              {/* Animated elements */}
              <svg viewBox="0 0 200 80" style={{ position: 'absolute', top: 10, right: 10, width: 140, height: 70, opacity: 0.5 }}>
                <rect x="10" y="5" width="55" height="35" rx="4" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.4"/>
                <polygon points="30,14 30,30 42,22" fill="#38bdf8" opacity="0.4" style={{ animation: 'pulse 2s ease-in-out infinite' }}/>
                <circle cx="90" cy="20" r="12" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.3" style={{ animation: 'pulse 3s ease-in-out infinite' }}/>
                <circle cx="90" cy="20" r="6" fill="#38bdf8" opacity="0.1"/>
                <text x="90" y="23" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" opacity="0.5">$</text>
                <rect x="10" y="50" width="40" height="4" rx="2" fill="#334155"/>
                <rect x="10" y="50" width="24" height="4" rx="2" fill="#38bdf8" opacity="0.5" style={{ animation: 'slideBar 3s ease-in-out infinite alternate' }}/>
                <rect x="10" y="58" width="40" height="4" rx="2" fill="#334155"/>
                <rect x="10" y="58" width="30" height="4" rx="2" fill="#38bdf8" opacity="0.3" style={{ animation: 'slideBar 4s ease-in-out infinite alternate' }}/>
              </svg>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: 12 }}>Basic</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{isAnnual ? '$200' : '$20'}</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>{isAnnual ? '/year' : '/mo'}</span>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>{isAnnual ? 'Save $40 vs monthly — pay once' : 'Everything you need to start earning'}</div>
              </div>
            </div>

            {/* Features */}
            <div style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 24 }}>
                {[
                  ['💰', 'Affiliate commissions'],
                  ['📊', 'Income Grid access'],
                  ['▶️', 'Watch to Earn'],
                  ['🎓', 'Course marketplace'],
                  ['🔗', 'LinkHub page'],
                  ['📋', 'Community Ad Board'],
                  ['💬', 'Basic support'],
                ].map(function([icon, label]) {
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>{icon}</div>
                      <span style={{ fontSize: 15, color: "#334155" }}>{label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Spacer pushes buttons to same level as Pro */}
              <div style={{ flex: 1 }}/>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p_basic_current ? (
                  <div style={{ padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 700, textAlign: 'center', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#059669', border: '1px solid #86efac' }}>
                    {"\u2713"} Current Plan
                  </div>
                ) : (
                  <>
                    <button
                      onClick={function() { openCryptoCheckout('basic'); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 0 #5b21b6,0 6px 20px rgba(124,58,237,.3)', letterSpacing: 0.3 }}
                    >
                      <Coins size={17} />
                      {"\u26A1"} Pay with Crypto (USDT / USDC)
                    </button>
                    <button
                      onClick={function() { nowPaymentsCheckout('basic'); }}
                      disabled={loading === 'basic_np'}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 700, border: '1.5px solid #e2e8f0', cursor: loading === 'basic_np' ? 'default' : 'pointer', fontFamily: 'inherit', background: '#fff', color: '#64748b', transition: 'all .2s' }}
                      onMouseOver={function(e) { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
                      onMouseOut={function(e) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                    >
                      <Globe size={16} />
                      {loading === 'basic_np' ? 'Loading...' : '\uD83C\uDF10 Pay with 350+ Cryptos \u2014 ' + (isAnnual ? '$200' : '$20')}
                    </button>
                    <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{"\uD83D\uDD12"} Secure payment · Instant activation </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── PRO CARD ── */}
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '2px solid #0ea5e9', boxShadow: '0 0 0 4px rgba(14,165,233,.08),0 12px 40px rgba(14,165,233,.15)', display: 'flex', flexDirection: 'column' }}>
            {/* Header with animation */}
            <div style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1,#0284c7)', padding: '28px 28px 24px', position: 'relative', overflow: 'hidden', minHeight: 130 }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }}/>
              <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }}/>
              {/* Animated AI elements */}
              <svg viewBox="0 0 200 80" style={{ position: 'absolute', top: 8, right: 8, width: 150, height: 75, opacity: 0.6 }}>
                {/* Central hex */}
                <polygon points="100,10 118,20 118,40 100,50 82,40 82,20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <text x="100" y="33" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10" fontWeight="bold">AI</text>
                {/* Orbiting dots */}
                <circle cx="70" cy="15" r="3" fill="#38bdf8" opacity="0.4" style={{ animation: 'pulse 2s ease-in-out infinite' }}/>
                <circle cx="130" cy="15" r="3" fill="#38bdf8" opacity="0.4" style={{ animation: 'pulse 2.5s ease-in-out infinite' }}/>
                <circle cx="65" cy="50" r="3" fill="#38bdf8" opacity="0.3" style={{ animation: 'pulse 3s ease-in-out infinite' }}/>
                <circle cx="135" cy="50" r="3" fill="#38bdf8" opacity="0.3" style={{ animation: 'pulse 1.8s ease-in-out infinite' }}/>
                {/* Connection lines */}
                <line x1="73" y1="15" x2="85" y2="22" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2"/>
                <line x1="127" y1="15" x2="115" y2="22" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2"/>
                <line x1="68" y1="48" x2="85" y2="38" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2"/>
                <line x1="132" y1="48" x2="115" y2="38" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2"/>
                {/* Floating cards */}
                <rect x="10" y="20" width="28" height="18" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" style={{ animation: 'upFloat 4s ease-in-out infinite' }}/>
                <rect x="162" y="20" width="28" height="18" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" style={{ animation: 'upFloat 3.5s ease-in-out infinite' }}/>
                {/* Sparkles */}
                <circle cx="50" cy="8" r="1" fill="#fff" opacity="0.3" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}/>
                <circle cx="150" cy="8" r="1" fill="#fff" opacity="0.3" style={{ animation: 'pulse 2s ease-in-out infinite' }}/>
                <circle cx="100" cy="65" r="1.5" fill="#fbbf24" opacity="0.4" style={{ animation: 'pulse 2.2s ease-in-out infinite' }}/>
              </svg>
              {/* Badge */}
              <div style={{ position: 'absolute', top: 16, right: 16, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#78350f', fontSize: 9, fontWeight: 800, letterSpacing: 0.8, padding: '5px 12px', borderRadius: 20, zIndex: 3 }}>{"\u2B50"} RECOMMENDED</div>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>Pro</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{isBasicActive ? '$15' : isAnnual ? '$350' : '$35'}</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,.5)' }}>/{isBasicActive ? 'upgrade' : isAnnual ? 'year' : 'mo'}</span>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{isBasicActive ? 'then $35/mo from next month' : isAnnual ? 'Save $70 vs monthly — pay once' : 'Full AI-powered marketing suite'}</div>
              </div>
            </div>

            {/* Features */}
            <div style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 24 }}>
                {[
                  ['✨', 'Everything in Basic', true],
                  ['🤖', 'ProSeller AI assistant', false],
                  ['🚀', 'AI Funnel Generator', false],
                  ['📇', 'Email Autoresponder & CRM', false],
                  ['🎯', 'Campaign Studio', false],
                  ['🔍', 'Niche Finder AI', false],
                  ['📱', 'Social Post Generator', false],
                  ['🎬', 'Video Script Generator', false],
                  ['✉️', 'Email Swipes', false],
                  ['📈', 'Lead dashboard', false],
                  ['⭐', 'Priority support', false],
                ].map(function([icon, label, bold]) {
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>{icon}</div>
                      <span style={{ fontSize: 15, color: bold ? '#0f172a' : '#334155', fontWeight: bold ? 700 : 400 }}>{label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isPro ? (
                  <div style={{ padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 700, textAlign: 'center', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#059669', border: '1px solid #86efac' }}>
                    {"\u2713"} Current Plan
                  </div>
                ) : isBasicActive ? (
                  <>
                    <button
                      onClick={handleUpgradeToPro}
                      disabled={loading === 'upgrade'}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 800, border: 'none', cursor: loading === 'upgrade' ? 'default' : 'pointer', fontFamily: 'inherit', background: loading === 'upgrade' ? '#94a3b8' : 'linear-gradient(135deg,#8b5cf6,#a855f7)', color: '#fff', boxShadow: loading === 'upgrade' ? 'none' : '0 4px 0 #6d28d9,0 6px 20px rgba(139,92,246,.35)', letterSpacing: 0.3 }}
                    >
                      {loading === 'upgrade' ? 'Upgrading...' : '\u26A1 Upgrade to Pro \u2014 $15'}
                    </button>
                    <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Pay the $15 difference now. $35/mo from next renewal.</div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={function() { openCryptoCheckout('pro'); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 0 #5b21b6,0 6px 20px rgba(124,58,237,.3)', letterSpacing: 0.3 }}
                    >
                      <Coins size={17} />
                      {"\u26A1"} Pay with Crypto (USDT / USDC)
                    </button>
                    <button
                      onClick={function() { nowPaymentsCheckout('pro'); }}
                      disabled={loading === 'pro_np'}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 700, border: '1.5px solid #e2e8f0', cursor: loading === 'pro_np' ? 'default' : 'pointer', fontFamily: 'inherit', background: '#fff', color: '#64748b', transition: 'all .2s' }}
                      onMouseOver={function(e) { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
                      onMouseOut={function(e) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                    >
                      <Globe size={16} />
                      {loading === 'pro_np' ? 'Loading...' : '\uD83C\uDF10 Pay with 350+ Cryptos \u2014 ' + (isAnnual ? '$350' : '$35')}
                    </button>
                    <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{"\uD83D\uDD12"} Secure payment · Instant activation </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        <div style={{ marginTop: 24 }}>
          <WalletGuideCard compact />
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
          Secure payment via USDT/USDC on Polygon or 350+ cryptos via NOWPayments {"\u00B7"} All sales are final
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
