import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Check, ChevronDown, ChevronUp, Zap, Wrench, Users, Mail, BookOpen, Headphones } from 'lucide-react';

/**
 * Upgrade — Step 1 of the upgrade flow (added 9 May 2026).
 *
 * Shows two parallel plan cards (Basic, Pro) of identical shape:
 *   - Tier name + headline price
 *   - One-line value prop
 *   - 3-4 hero features
 *   - "See all features" expander revealing the full feature list
 *   - Single CTA: "Choose Basic" / "Choose Pro"
 *
 * No payment buttons here. CTAs navigate to:
 *   /upgrade/checkout?plan=<basic|pro>
 *
 * State awareness:
 *   - Basic active member: Basic card shows "Current plan", Pro is the upgrade path
 *   - Pro active member: both show "Current plan" (page is mostly informational)
 *   - Inactive/free user: both are choose-able as fresh activations
 */
export default function Upgrade() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var navigate = useNavigate();

  // Admin preview mode: ?preview=1 shows the page as a new free user would see it
  var urlParams = new URLSearchParams(window.location.search);
  var previewMode = user?.is_admin && urlParams.get('preview') === '1';

  var isPro       = previewMode ? false : user?.membership_tier === 'pro';
  var isActive    = previewMode ? false : user?.is_active;
  var billing     = previewMode ? null : (user?.membership_billing || 'monthly');
  var isBasicActive = isActive && !isPro;
  // "Monthly with annual upgrade available" = active member on monthly billing
  // who hasn't yet locked in the cheaper annual rate. They get a "Switch to
  // Annual" CTA on their current tier card instead of the usual "Current plan".
  var basicMonthlyCanSwitch = isBasicActive && billing === 'monthly';
  var proMonthlyCanSwitch   = isPro && billing === 'monthly';

  function chooseBasic() {
    navigate('/upgrade/checkout?plan=basic');
  }
  function choosePro() {
    navigate('/upgrade/checkout?plan=pro');
  }
  // Switch-to-annual deep-link: pre-selects the Annual cadence on the
  // checkout page via the &switch=annual flag, and shows the explanatory
  // banner ("you're switching from Monthly to Annual...").
  function switchBasicToAnnual() {
    navigate('/upgrade/checkout?plan=basic&switch=annual');
  }
  function switchProToAnnual() {
    navigate('/upgrade/checkout?plan=pro&switch=annual');
  }

  return (
    <AppLayout title="Upgrade" subtitle="Choose your plan">
      <style>{`
        .uplan-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:1100px;margin:0 auto;padding:0 20px}
        @media (max-width:880px){.uplan-grid{grid-template-columns:1fr;max-width:480px}}
        .uplan-card{background:#fff;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;transition:transform .25s,box-shadow .25s}
        .uplan-card:hover{transform:translateY(-4px)}
        .uplan-card-basic{border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,.05),0 12px 32px rgba(0,0,0,.06)}
        .uplan-card-basic:hover{box-shadow:0 8px 24px rgba(0,0,0,.08),0 20px 48px rgba(0,0,0,.1)}
        .uplan-card-pro{border:2px solid rgba(239,68,68,.35);box-shadow:0 4px 16px rgba(239,68,68,.08),0 12px 32px rgba(239,68,68,.1)}
        .uplan-card-pro:hover{box-shadow:0 8px 24px rgba(239,68,68,.12),0 20px 48px rgba(239,68,68,.15)}
        .uplan-hero{padding:32px 28px 28px;color:#fff;position:relative;overflow:hidden}
        .uplan-hero-basic{background:linear-gradient(135deg,#1e3a8a,#3b82f6)}
        .uplan-hero-pro{background:linear-gradient(135deg,#7f1d1d,#dc2626,#ef4444)}
        .uplan-popular{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.95);color:#7f1d1d;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
        .uplan-tier-label{font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-bottom:8px}
        .uplan-price{font-family:Sora,sans-serif;font-size:48px;font-weight:800;letter-spacing:-.02em;line-height:1}
        .uplan-price-suffix{font-size:18px;font-weight:600;opacity:.75;margin-left:4px}
        .uplan-tagline{font-size:15px;opacity:.92;margin-top:14px;line-height:1.5}
        .uplan-body{padding:24px 28px 28px;display:flex;flex-direction:column;flex:1}
        .uplan-feat-hero{display:flex;align-items:flex-start;gap:12px;padding:10px 0}
        .uplan-feat-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .uplan-feat-icon-basic{background:#dbeafe}
        .uplan-feat-icon-pro{background:#fee2e2}
        .uplan-feat-text{font-size:14px;color:#334155;font-weight:500;line-height:1.45;padding-top:5px}
        .uplan-expander{margin-top:8px;padding:8px 0;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600;color:#64748b;border:none;background:none;border-top:1px solid #f1f5f9}
        .uplan-expander:hover{color:#0f172a}
        .uplan-extra-list{padding:8px 0 4px;display:flex;flex-direction:column;gap:8px;border-top:1px solid #f1f5f9;margin-top:4px}
        .uplan-extra{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#475569;line-height:1.5}
        .uplan-cta{margin-top:auto;padding-top:20px}
        .uplan-cta-btn{width:100%;padding:14px 20px;border-radius:12px;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:transform .15s,box-shadow .25s;color:#fff}
        .uplan-cta-btn:hover{transform:translateY(-1px)}
        .uplan-cta-btn-basic{background:linear-gradient(135deg,#1e3a8a,#3b82f6);box-shadow:0 4px 16px rgba(59,130,246,.3)}
        .uplan-cta-btn-basic:hover{box-shadow:0 6px 20px rgba(59,130,246,.4)}
        .uplan-cta-btn-pro{background:linear-gradient(135deg,#dc2626,#ef4444);box-shadow:0 4px 16px rgba(239,68,68,.3)}
        .uplan-cta-btn-pro:hover{box-shadow:0 6px 20px rgba(239,68,68,.4)}
        .uplan-cta-current{padding:14px 20px;border-radius:12px;background:#f0fdf4;border:1.5px solid #86efac;color:#166534;font-size:15px;font-weight:700;text-align:center;cursor:default}
      `}</style>

      <div className="uplan-grid">
        <PlanCard
          tier="basic"
          headline="Basic"
          price="$20"
          priceSuffix="/mo"
          annualPrice="$200"
          annualSavings="$40/yr"
          tagline="Everything you need to start marketing and earning with AI tools."
          isCurrent={isBasicActive}
          canSwitchToAnnual={basicMonthlyCanSwitch}
          isPro={isPro}
          heroFeatures={[
            { icon: <Zap size={16} color="#2563eb"/>, text: 'Creative Studio — AI video, images, music, voiceover' },
            { icon: <Check size={16} color="#2563eb"/>, text: 'LinkHub bio page + Link Tools' },
            { icon: <Check size={16} color="#2563eb"/>, text: 'Campaign Grid — 8-tier video advertising' },
            { icon: <Check size={16} color="#2563eb"/>, text: '50% referral commissions on every signup' },
          ]}
          extraFeatures={[
            'Content Creator — social posts, ad copy, video scripts',
            'Profit Nexus — earn from credit pack referrals',
            'Watch-to-Earn campaigns',
            'Course marketplace access',
            'Multi-language platform (20 locales)',
          ]}
          onChoose={chooseBasic}
          onSwitchToAnnual={switchBasicToAnnual}
        />
        <PlanCard
          tier="pro"
          headline="Pro"
          price="$35"
          priceSuffix="/mo"
          annualPrice="$350"
          annualSavings="$70/yr"
          tagline="Full suite of AI marketing tools plus advanced automation and leads."
          mostPopular
          isCurrent={isPro}
          canSwitchToAnnual={proMonthlyCanSwitch}
          heroFeatures={[
            { icon: <Wrench size={16} color="#dc2626"/>, text: 'Everything in Basic, plus:' },
            { icon: <Zap size={16} color="#dc2626"/>, text: 'SuperPages — AI-powered landing pages and funnels' },
            { icon: <Users size={16} color="#dc2626"/>, text: 'My Leads CRM — capture, track and nurture leads' },
            { icon: <Mail size={16} color="#dc2626"/>, text: 'Email Autoresponder — automated sequences' },
          ]}
          extraFeatures={[
            'SuperSeller AI — automated sales campaigns',
            'Course Creator — build and sell courses (coming soon)',
            'Priority support — faster response times',
            'Annual plan saves $70/year',
          ]}
          onChoose={choosePro}
          onSwitchToAnnual={switchProToAnnual}
        />
      </div>

      <div style={{ textAlign:'center', marginTop:28, padding:'0 20px', fontSize:13, color:'#64748b' }}>
        Already paid? <Link to="/dashboard" style={{ color:'#2563eb', fontWeight:600, textDecoration:'none' }}>Go to dashboard →</Link>
      </div>

    </AppLayout>
  );
}

/**
 * Single plan card. Identical shape for Basic and Pro — same hero, same body,
 * same expander, same CTA. The only thing that differs is colour palette,
 * the "Most Popular" pill on Pro, and the "Current Plan" state when active.
 */
function PlanCard({ tier, headline, price, priceSuffix, annualPrice, annualSavings, tagline, mostPopular, isCurrent, canSwitchToAnnual, isPro, heroFeatures, extraFeatures, onChoose, onSwitchToAnnual }) {
  var [expanded, setExpanded] = useState(false);
  var heroClass = 'uplan-hero uplan-hero-' + tier;
  var iconClass = 'uplan-feat-icon uplan-feat-icon-' + tier;

  // Three CTA states:
  //   1. Not on this plan       → "Choose {tier} →" (primary CTA)
  //   2. On this plan + monthly → "Switch to Annual — Save \$X/yr" (annual upgrade path)
  //   3. On this plan + annual  → "✓ Current plan" (locked, no action)

  return (
    <div className={'uplan-card uplan-card-' + tier}>
      <div className={heroClass}>
        {mostPopular && <div className="uplan-popular">Most Popular</div>}
        <div className="uplan-tier-label">{headline}</div>
        <div>
          <span className="uplan-price">{price}</span>
          <span className="uplan-price-suffix">{priceSuffix}</span>
        </div>
        {annualPrice && (
          <div style={{ fontSize:13, opacity:.85, marginTop:6 }}>
            or {annualPrice}/year — save {annualSavings}
          </div>
        )}
        <div className="uplan-tagline">{tagline}</div>
      </div>

      <div className="uplan-body">
        {heroFeatures.map(function(f, i) {
          return (
            <div key={i} className="uplan-feat-hero">
              <div className={iconClass}>{f.icon}</div>
              <div className="uplan-feat-text">{f.text}</div>
            </div>
          );
        })}

        <button className="uplan-expander" onClick={function() { setExpanded(!expanded); }}>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          {expanded ? 'Hide details' : 'See all features'}
        </button>

        {expanded && (
          <div className="uplan-extra-list">
            {extraFeatures.map(function(f, i) {
              return (
                <div key={i} className="uplan-extra">
                  <Check size={13} color={tier === 'pro' ? '#dc2626' : '#2563eb'} style={{ flexShrink:0, marginTop:3 }}/>
                  <span>{f}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="uplan-cta">
          {isCurrent && canSwitchToAnnual ? (
            // State 2: on this plan, monthly billing — offer annual upgrade
            <button
              className={'uplan-cta-btn uplan-cta-btn-' + tier}
              onClick={onSwitchToAnnual}
            >
              Switch to Annual — Save {annualSavings} →
            </button>
          ) : isCurrent ? (
            // State 3: on this plan, already annual — locked
            <div className="uplan-cta-current">✓ Current plan</div>
          ) : (
            // State 1: not on this plan — primary CTA
            <button
              className={'uplan-cta-btn uplan-cta-btn-' + tier}
              onClick={onChoose}
            >
              Choose {headline} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
