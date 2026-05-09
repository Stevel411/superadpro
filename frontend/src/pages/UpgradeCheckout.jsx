import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { ChevronLeft, Check, Wallet, Globe, Zap } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Lazy-load self-custody payment components — Reown/wagmi adds heavy
// crypto deps to the bundle. Loaded only when this page renders.
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });

/**
 * UpgradeCheckout — Step 2 of the upgrade flow (added 9 May 2026).
 *
 * URL: /upgrade/checkout?plan=<basic|pro>
 *
 * User flow:
 *   1. User has come from /upgrade with a plan choice in the URL
 *   2. Picks a billing cadence (Monthly or Annual — no default)
 *   3. Picks a payment rail (Balance, MetaMask Wallet, NOWPayments)
 *   4. Optionally checks 'Auto-renew from balance' (only shown when relevant)
 *   5. Final CTA enables only when both cadence and rail are selected
 *
 * Pricing (as of 9 May 2026):
 *   - Basic monthly:  $20
 *   - Basic annual:   $200 (saves $40)
 *   - Pro monthly:    $35  (or $15 upgrade if currently Basic)
 *   - Pro annual:     $350 (saves $70)
 *
 * Payment rails:
 *   - Balance:     /api/upgrade-to-pro or /api/activate-membership with payment_method=balance
 *   - NOWPayments: same endpoint with payment_method=crypto, returns invoice_url
 *   - MetaMask:    via WalletConnect components (onchain intent + BSC USDT pay)
 */
export default function UpgradeCheckout() {
  var { t } = useTranslation();
  var { user, refreshUser } = useAuth();
  var navigate = useNavigate();
  var [searchParams] = useSearchParams();
  var planParam = searchParams.get('plan') || 'basic';
  var plan = (planParam === 'pro') ? 'pro' : 'basic';
  // Switch-to-annual flag: when present, the user came here from the
  // "Switch to Annual" CTA on /upgrade. Pre-selects annual cadence,
  // shows an explanatory banner, and routes balance payment to the
  // /api/switch-to-annual endpoint instead of the standard upgrade path.
  var switchMode = searchParams.get('switch') === 'annual';

  // Default cadence: null (forces explicit choice) UNLESS we arrived in
  // switch mode, where Annual is pre-selected since that's why they came.
  var [cadence, setCadence] = useState(switchMode ? 'annual' : null);
  var [rail, setRail] = useState(null);                // 'balance' | 'wallet' | 'crypto' | null
  var [autoRenew, setAutoRenew] = useState(false);     // only relevant if rail==='balance' and cadence==='monthly'
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { ensureConsent, consentModal } = useConsentGate();

  var isPro       = user?.membership_tier === 'pro';
  var isActive    = user?.is_active;
  var isBasicActive = isActive && !isPro;
  var billing     = (user?.membership_billing || 'monthly');
  var balance     = Number(user?.balance || 0);
  // True when the user is genuinely a Monthly member of `plan` switching to annual.
  // Defends against stale URLs (e.g. ?switch=annual on a fresh user).
  var isLegitSwitch = switchMode && isActive && (
    (plan === 'pro' && isPro && billing === 'monthly') ||
    (plan === 'basic' && isBasicActive && billing === 'monthly')
  );

  // ── Pricing matrix ──────────────────────────────────────────────
  // Pro monthly is special: existing Basic members pay only the $15 difference,
  // free/inactive users pay the full $35. The backend handles both; the UI
  // shows the right number based on the user's current state.
  var prices = {
    basic: { monthly: 20, annual: 200, monthlySavings: 0, annualSavings: 40 },
    pro:   {
      monthly: isBasicActive ? 15 : 35,
      annual:  350,
      monthlySavings: isBasicActive ? 20 : 0,  // $20 saved vs paying full $35 if you're already Basic
      annualSavings: 70,
    },
  };

  var price = (cadence && prices[plan]) ? prices[plan][cadence] : null;
  var ready = !!cadence && !!rail;

  // ── Submit handler ──────────────────────────────────────────────
  // Routes to the right endpoint based on plan + rail. Three cases:
  //   plan=pro  → /api/upgrade-to-pro (handles all three rails internally)
  //   plan=basic + rail=balance → /api/activate-membership (existing)
  //   plan=basic + rail=crypto  → /api/nowpayments/create-invoice
  //   plan=basic + rail=wallet  → WalletConnect flow (rendered separately below)
  async function handleSubmit() {
    if (!ready || loading) return;
    var consented = await ensureConsent();
    if (!consented) return;

    setLoading(true);
    setError('');

    // ─── Switch-to-Annual path (same-tier monthly→annual) ─────────────
    // For balance payments, route to the dedicated /api/switch-to-annual
    // endpoint. For NOWPayments and MetaMask, fall through to the regular
    // crypto/wallet paths below — those use membership_<tier>_annual product
    // keys which already trigger the same _activate_membership(annual) logic
    // on confirmation, so the same-tier switch happens transparently.
    if (isLegitSwitch && rail === 'balance') {
      apiPost('/api/switch-to-annual', { payment_method: 'balance' })
        .then(function(d) {
          setLoading(false);
          if (d.message || d.success) {
            if (refreshUser) refreshUser();
            navigate('/dashboard?switched=annual');
          } else {
            setError(d.error || 'Switch failed — please try again');
          }
        })
        .catch(function(e) { setLoading(false); setError(e.message || 'Switch failed'); });
      return;
    }

    if (plan === 'pro') {
      // Single endpoint handles all rails for pro upgrade
      var paymentMethod = rail === 'crypto' ? 'crypto' : (rail === 'wallet' ? 'wallet' : 'balance');
      apiPost('/api/upgrade-to-pro', { payment_method: paymentMethod, billing: cadence })
        .then(function(d) {
          setLoading(false);
          if (d.invoice_url) {
            // NOWPayments — redirect to their checkout
            window.location.href = d.invoice_url;
          } else if (d.message || d.success) {
            // Balance payment succeeded — set auto-renew if opted in, then redirect
            if (autoRenew && cadence === 'monthly' && rail === 'balance') {
              apiPost('/api/auto-renew-preference', { enabled: true })
                .then(function() {
                  if (refreshUser) refreshUser();
                  navigate('/dashboard?upgraded=1');
                })
                .catch(function() {
                  // Even if the preference set fails, the upgrade succeeded — go to dashboard
                  if (refreshUser) refreshUser();
                  navigate('/dashboard?upgraded=1');
                });
            } else {
              if (refreshUser) refreshUser();
              navigate('/dashboard?upgraded=1');
            }
          } else {
            setError(d.error || 'Upgrade failed — please try again');
          }
        })
        .catch(function(e) { setLoading(false); setError(e.message || 'Upgrade failed'); });
      return;
    }

    // plan === 'basic'
    if (rail === 'crypto') {
      var productKey = cadence === 'annual' ? 'membership_basic_annual' : 'membership_basic';
      apiPost('/api/nowpayments/create-invoice', { product_key: productKey })
        .then(function(d) {
          setLoading(false);
          if (d.invoice_url) { window.location.href = d.invoice_url; }
          else { setError(d.error || 'Could not start checkout'); }
        })
        .catch(function(e) { setLoading(false); setError(e.message || 'Checkout failed'); });
      return;
    }

    if (rail === 'balance') {
      // Existing endpoint for first-time Basic activation from balance.
      // Note: this endpoint is monthly-only ($20, 31-day activation). Basic
      // Annual + Balance is not currently supported by the backend — the
      // checkout disables that combination at the rail-picker level.
      apiPost('/api/membership/activate-from-balance', {})
        .then(function(d) {
          setLoading(false);
          if (d.success || d.message) {
            if (autoRenew && cadence === 'monthly') {
              apiPost('/api/auto-renew-preference', { enabled: true })
                .then(function() { if (refreshUser) refreshUser(); navigate('/dashboard?activated=1'); })
                .catch(function() { if (refreshUser) refreshUser(); navigate('/dashboard?activated=1'); });
            } else {
              if (refreshUser) refreshUser();
              navigate('/dashboard?activated=1');
            }
          } else {
            setError(d.error || 'Activation failed');
          }
        })
        .catch(function(e) { setLoading(false); setError(e.message || 'Activation failed'); });
      return;
    }

    // rail === 'wallet' is handled by the WalletConnect components rendered below;
    // submit is bypassed and the wallet flow drives the transaction directly.
    setLoading(false);
  }

  // Pre-validate the user's state for this plan
  // True when the user is already on this plan AND not in switch mode.
  // In switch mode they ARE on this plan but came here specifically to
  // change billing cadence, so the "already on this plan" lockout
  // shouldn't apply.
  var alreadyOnPlan = !isLegitSwitch && ((plan === 'basic' && isBasicActive) || (plan === 'pro' && isPro));

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AppLayout title="Checkout" subtitle={'Upgrade to ' + (plan === 'pro' ? 'Pro' : 'Basic')}>
      <style>{`
        /* Wider layout so rail descriptions fit on one line where possible.
           680 was tight — the 'works with MetaMask, Trust, Coinbase...'
           text wrapped and ate vertical space. 760 gives room without
           feeling sprawling. Bottom padding (40px) ensures the CTA has
           breathing room below it instead of jamming against the page edge. */
        .uchk-wrap{max-width:760px;margin:0 auto;padding:0 20px 40px}
        .uchk-back{display:inline-flex;align-items:center;gap:6px;font-size:14px;color:#64748b;text-decoration:none;font-weight:500;margin-bottom:12px}
        .uchk-back:hover{color:#0f172a}

        /* Switch banner — tightened. Smaller icon (32 vs 40), tighter
           padding, less margin since it's secondary content now. */
        .uchk-banner{padding:14px 18px;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:1px solid #bfdbfe;border-left:4px solid #2563eb;border-radius:12px;margin-bottom:16px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 4px 16px rgba(59,130,246,.08)}
        .uchk-banner-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(37,99,235,.3)}
        .uchk-banner-title{font-size:14px;font-weight:800;color:#1e3a8a;margin:0 0 2px;font-family:'Sora',sans-serif}
        .uchk-banner-desc{font-size:12.5px;color:#1e40af;line-height:1.5;margin:0}

        /* Plan summary hero — slightly tighter padding, smaller tier name
           font (32 -> 28) and price (36 -> 32). Still confident but more
           proportional now that it's the page's primary anchor. */
        .uchk-summary{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%);border-radius:16px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:20px;color:#fff;box-shadow:0 12px 32px rgba(37,99,235,.25),0 4px 12px rgba(37,99,235,.15);position:relative;overflow:hidden}
        .uchk-summary::after{content:"";position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(255,255,255,.12) 0%,transparent 70%);border-radius:50%;pointer-events:none}
        .uchk-wrap.pro .uchk-summary{background:linear-gradient(135deg,#b91c1c 0%,#dc2626 50%,#ef4444 100%);box-shadow:0 12px 32px rgba(220,38,38,.25),0 4px 12px rgba(220,38,38,.15)}
        .uchk-summary-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85;font-weight:700;margin-bottom:6px}
        .uchk-summary-tier{font-family:'Sora',sans-serif;font-size:28px;font-weight:800;margin:0;line-height:1}
        .uchk-summary-price{text-align:right}
        .uchk-summary-price-from{font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:.75;font-weight:600}
        .uchk-summary-price-amount{font-family:'Sora',sans-serif;font-size:32px;font-weight:800;line-height:1;margin-top:2px}
        .uchk-summary-price-suffix{font-size:14px;font-weight:600;opacity:.8;margin-left:3px}

        /* Section card — tighter padding, less section gap */
        .uchk-section{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px 22px;margin-bottom:14px;box-shadow:0 4px 12px rgba(15,23,42,.04)}
        .uchk-section-label{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:#0f172a;margin-bottom:14px;letter-spacing:.3px}
        .uchk-section-num{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(37,99,235,.3);flex-shrink:0}
        .uchk-wrap.pro .uchk-section-num{background:linear-gradient(135deg,#dc2626,#ef4444);box-shadow:0 2px 8px rgba(220,38,38,.3)}

        /* Cadence options — tighter padding */
        .uchk-options-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media (max-width:520px){.uchk-options-grid{grid-template-columns:1fr}}
        .uchk-opt{padding:12px 14px;border:2px solid #e2e8f0;border-radius:11px;cursor:pointer;background:#fff;text-align:left;font-family:inherit;display:flex;flex-direction:column;gap:3px;transition:all .2s;position:relative}
        .uchk-opt:hover{border-color:#cbd5e1;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.05)}
        .uchk-opt.selected{border-color:#2563eb;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);box-shadow:0 4px 16px rgba(37,99,235,.15),inset 0 0 0 1px rgba(37,99,235,.2)}
        .uchk-opt.selected::before{content:"";position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;background:#2563eb;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");background-size:12px;background-position:center;background-repeat:no-repeat;box-shadow:0 2px 6px rgba(37,99,235,.4)}
        .uchk-wrap.pro .uchk-opt.selected{border-color:#dc2626;background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%);box-shadow:0 4px 16px rgba(220,38,38,.15),inset 0 0 0 1px rgba(220,38,38,.2)}
        .uchk-wrap.pro .uchk-opt.selected::before{background:#dc2626;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");box-shadow:0 2px 6px rgba(220,38,38,.4)}
        .uchk-opt.disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
        .uchk-opt.disabled:hover{transform:none;box-shadow:none}
        .uchk-opt-label{font-size:14px;font-weight:700;color:#0f172a}
        .uchk-opt-meta{font-size:12.5px;color:#64748b;margin-top:1px}
        .uchk-opt-savings{display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;margin-top:6px;width:fit-content;box-shadow:0 2px 6px rgba(16,185,129,.25)}

        /* Payment rails — tighter, smaller icon (42 -> 36) */
        .uchk-rail{padding:11px 14px;border:2px solid #e2e8f0;border-radius:11px;cursor:pointer;background:#fff;display:flex;align-items:center;gap:12px;font-family:inherit;text-align:left;width:100%;transition:all .2s;position:relative}
        .uchk-rail+.uchk-rail{margin-top:8px}
        .uchk-rail:hover{border-color:#cbd5e1;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.05)}
        .uchk-rail.selected{border-color:#2563eb;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);box-shadow:0 4px 16px rgba(37,99,235,.15)}
        .uchk-rail.selected::after{content:"";position:absolute;top:50%;right:14px;transform:translateY(-50%);width:20px;height:20px;border-radius:50%;background:#2563eb;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");background-size:13px;background-position:center;background-repeat:no-repeat;box-shadow:0 2px 6px rgba(37,99,235,.4)}
        .uchk-wrap.pro .uchk-rail.selected{border-color:#dc2626;background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%);box-shadow:0 4px 16px rgba(220,38,38,.15)}
        .uchk-wrap.pro .uchk-rail.selected::after{background:#dc2626;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");box-shadow:0 2px 6px rgba(220,38,38,.4)}
        .uchk-rail.disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
        .uchk-rail.disabled:hover{transform:none;box-shadow:none}
        .uchk-rail-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}
        .uchk-rail-icon-balance{background:linear-gradient(135deg,#dcfce7,#86efac);box-shadow:0 2px 8px rgba(34,197,94,.2)}
        .uchk-rail-icon-wallet{background:linear-gradient(135deg,#fef3c7,#fde68a);box-shadow:0 2px 8px rgba(251,191,36,.25)}
        .uchk-rail-icon-crypto{background:linear-gradient(135deg,#dbeafe,#93c5fd);box-shadow:0 2px 8px rgba(59,130,246,.2)}
        .uchk-rail-name{font-size:14px;font-weight:700;color:#0f172a}
        .uchk-rail-desc{font-size:12px;color:#64748b;margin-top:2px;line-height:1.4}

        /* Auto-renew row — slightly tighter */
        .uchk-renew-row{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:1px solid #86efac;border-radius:11px;margin-top:12px;cursor:pointer;transition:all .2s}
        .uchk-renew-row:hover{border-color:#4ade80;box-shadow:0 4px 12px rgba(34,197,94,.1)}
        .uchk-renew-row input{margin-top:2px;width:18px;height:18px;cursor:pointer;accent-color:#16a34a;flex-shrink:0}
        .uchk-renew-text{font-size:12.5px;color:#166534;line-height:1.5;flex:1}
        .uchk-renew-text strong{color:#14532d;font-weight:700}

        /* Final CTA — tighter top padding (24 -> 16) so it sits closer
           to the rail picker. Shorter overall vertical footprint. */
        .uchk-cta-row{display:flex;align-items:center;gap:14px;padding:16px 0 4px}
        .uchk-cta-btn{flex:1;padding:16px 28px;border-radius:13px;border:none;font-size:16px;font-weight:800;cursor:pointer;font-family:'Sora',sans-serif;color:#fff;background:linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%);box-shadow:0 8px 24px rgba(16,185,129,.35),0 2px 8px rgba(16,185,129,.2);letter-spacing:.3px;transition:all .2s;position:relative;overflow:hidden}
        .uchk-cta-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 32px rgba(16,185,129,.45),0 4px 12px rgba(16,185,129,.25)}
        .uchk-cta-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
        .uchk-cta-btn::after{content:"";position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);transition:left .6s}
        .uchk-cta-btn:hover:not(:disabled)::after{left:100%}

        .uchk-error{padding:10px 14px;background:#fee2e2;border:1px solid #fecaca;border-radius:10px;font-size:13px;color:#991b1b;font-weight:600;margin-bottom:10px}
        .uchk-already{padding:14px 18px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;color:#166534;font-weight:600;text-align:center;margin-bottom:14px}
        .uchk-trust{font-size:11.5px;color:#94a3b8;margin-top:10px;text-align:center}
      `}</style>

      <div className={'uchk-wrap' + (plan === 'pro' ? ' pro' : '')}>

        <Link to="/upgrade" className="uchk-back">
          <ChevronLeft size={16}/> Change plan
        </Link>

        {alreadyOnPlan && (
          <div className="uchk-already">
            ✓ You're already on the {plan === 'pro' ? 'Pro' : 'Basic'} plan. <Link to="/dashboard" style={{ color:'#15803d', textDecoration:'underline' }}>Go to dashboard →</Link>
          </div>
        )}

        {/* Plan summary hero — primary context, comes first so the user
            instantly sees 'what am I doing here?'. White text on the
            plan-coloured gradient. Pro variant via .uchk-wrap.pro cascade. */}
        <div className="uchk-summary">
          <div>
            <div className="uchk-summary-label">You're upgrading to</div>
            <p className="uchk-summary-tier">{plan === 'pro' ? 'Pro' : 'Basic'}</p>
          </div>
          <div className="uchk-summary-price">
            <div className="uchk-summary-price-from">From</div>
            <div className="uchk-summary-price-amount">
              ${plan === 'pro' && isBasicActive ? '15' : (plan === 'pro' ? '35' : '20')}
              <span className="uchk-summary-price-suffix">/mo</span>
            </div>
          </div>
        </div>

        {/* Switch-to-annual banner — supporting explanation, sits below the
            primary plan summary. Only shows when the user genuinely arrived
            from the 'Switch to Annual' CTA on /upgrade and is in fact a
            Monthly member (defends against stale ?switch=annual URLs). */}
        {isLegitSwitch && (
          <div className="uchk-banner">
            <div className="uchk-banner-icon">
              <Zap size={18} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <h3 className="uchk-banner-title">You're switching to Annual billing</h3>
              <p className="uchk-banner-desc">
                Pay {plan === 'pro' ? '$350' : '$200'} once and get a fresh 365-day
                membership starting today. The remaining time on your monthly plan is
                included — you save {plan === 'pro' ? '$70/year' : '$40/year'} going
                forward.
              </p>
            </div>
          </div>
        )}

        {/* Cadence */}
        <div className="uchk-section">
          <div className="uchk-section-label">
            <div className="uchk-section-num">1</div>
            {isLegitSwitch ? 'Confirm billing cadence' : 'Choose billing cadence'}
          </div>
          <div className="uchk-options-grid">
            <button
              className={'uchk-opt' + (cadence === 'monthly' ? ' selected' + (plan === 'pro' ? ' pro' : '') : '') + (isLegitSwitch ? ' disabled' : '')}
              onClick={function() { if (!isLegitSwitch) setCadence('monthly'); }}
              disabled={isLegitSwitch}
            >
              <div className="uchk-opt-label">Monthly</div>
              <div className="uchk-opt-meta">
                ${prices[plan].monthly}/month
                {isLegitSwitch && <span style={{ color:'#94a3b8', marginLeft:6 }}>(your current plan)</span>}
              </div>
              {!isLegitSwitch && prices[plan].monthlySavings > 0 && (
                <span className="uchk-opt-savings">Save ${prices[plan].monthlySavings} (Basic credit applied)</span>
              )}
            </button>
            <button
              className={'uchk-opt' + (cadence === 'annual' ? ' selected' + (plan === 'pro' ? ' pro' : '') : '')}
              onClick={function() { setCadence('annual'); }}
            >
              <div className="uchk-opt-label">Annual</div>
              <div className="uchk-opt-meta">
                ${prices[plan].annual}/year
                <span style={{ color:'#94a3b8', marginLeft:6 }}>(${(prices[plan].annual / 12).toFixed(2)}/mo)</span>
              </div>
              <span className="uchk-opt-savings">Save ${prices[plan].annualSavings}/year</span>
            </button>
          </div>
        </div>

        {/* Payment rail */}
        <div className="uchk-section">
          <div className="uchk-section-label">
            <div className="uchk-section-num">2</div>
            Choose payment method
          </div>

          {/* Pay from balance.
              Disabled when:
                - User's balance is below the price for the chosen cadence
                - plan=basic AND cadence=annual AND NOT in switch mode
                  (fresh Basic-Annual activation from balance has no backend
                  endpoint — only the monthly $20 path exists in
                  /api/membership/activate-from-balance. But Monthly→Annual
                  switch from balance IS supported via /api/switch-to-annual,
                  so when isLegitSwitch is true, balance is allowed.) */}
          {(function() {
            var basicAnnualBalance = (plan === 'basic' && cadence === 'annual' && !isLegitSwitch);
            var insufficientBalance = price !== null && balance < price;
            var balanceDisabled = basicAnnualBalance || insufficientBalance;
            var balanceMsg = basicAnnualBalance
              ? '(annual plan must use Crypto Wallet or NOWPayments)'
              : (insufficientBalance ? '(insufficient — top up or use another method)' : null);
            return (
              <button
                className={'uchk-rail' + (rail === 'balance' ? ' selected' + (plan === 'pro' ? ' pro' : '') : '') + (balanceDisabled ? ' disabled' : '')}
                onClick={function() { if (!balanceDisabled) setRail('balance'); }}
                disabled={balanceDisabled}
              >
                <div className="uchk-rail-icon uchk-rail-icon-balance">
                  <Wallet size={18} color="#15803d"/>
                </div>
                <div style={{ flex:1 }}>
                  <div className="uchk-rail-name">Pay from balance</div>
                  <div className="uchk-rail-desc">
                    Your balance: <strong style={{ color:'#0f172a' }}>${balance.toFixed(2)}</strong>
                    {balanceMsg && <span style={{ color:'#dc2626', marginLeft:8 }}>{balanceMsg}</span>}
                  </div>
                </div>
              </button>
            );
          })()}

          <button
            className={'uchk-rail' + (rail === 'wallet' ? ' selected' + (plan === 'pro' ? ' pro' : '') : '')}
            onClick={function() { setRail('wallet'); }}
          >
            <div className="uchk-rail-icon uchk-rail-icon-wallet">
              <span style={{ fontSize:18 }}>👛</span>
            </div>
            <div style={{ flex:1 }}>
              <div className="uchk-rail-name">Crypto Wallet</div>
              <div className="uchk-rail-desc">Pay USDT on BNB Chain — works with MetaMask, Trust, Coinbase, Rainbow, OKX and 300+ wallets</div>
            </div>
          </button>

          <button
            className={'uchk-rail' + (rail === 'crypto' ? ' selected' + (plan === 'pro' ? ' pro' : '') : '')}
            onClick={function() { setRail('crypto'); }}
          >
            <div className="uchk-rail-icon uchk-rail-icon-crypto">
              <Globe size={18} color="#2563eb"/>
            </div>
            <div style={{ flex:1 }}>
              <div className="uchk-rail-name">NOWPayments</div>
              <div className="uchk-rail-desc">Pay with any major cryptocurrency — BTC, ETH, USDC, more</div>
            </div>
          </button>

          {/* Auto-renewal opt-in — only relevant for monthly + balance */}
          {rail === 'balance' && cadence === 'monthly' && (
            <label className="uchk-renew-row">
              <input type="checkbox" checked={autoRenew} onChange={function(e) { setAutoRenew(e.target.checked); }}/>
              <div className="uchk-renew-text">
                <strong>Auto-renew from balance</strong> — your membership renews automatically each month if your balance has the funds. Cancel anytime in settings.
              </div>
            </label>
          )}
        </div>

        {/* Submit */}
        {error && <div className="uchk-error">{error}</div>}

        <div className="uchk-cta-row">
          {rail === 'wallet' && cadence ? (
            // WalletConnect flow — renders two components in the same slot,
            // mutually exclusive based on connection state:
            //   - WalletConnectGate (hideWhenConnected): orange "Connect Wallet
            //     to Pay Direct" button when disconnected; null when connected
            //   - WalletPayLink: null when disconnected; orange "Pay $X with
            //     wallet" button when connected (runs the actual transfer)
            // Same pattern as PayItForward. Previously had Gate wrapping PayLink
            // as a child — Gate doesn't pass children through in either state,
            // so the inner PayLink was never visible. User would connect their
            // wallet successfully, then have no way to pay. Fixed 9 May 2026.
            <Suspense fallback={<button className="uchk-cta-btn" disabled>Loading wallet…</button>}>
              <WalletConnectProvider>
                <div style={{ flex:1 }}>
                  <WalletConnectGate
                    hideWhenConnected
                    label={'Connect Wallet — $' + price}
                    style={{
                      width:'100%', padding:'16px 28px', borderRadius:13, border:'none',
                      fontSize:16, fontWeight:800, color:'#fff', letterSpacing:'.3px',
                      background:'linear-gradient(135deg,#ea580c,#f97316)',
                      boxShadow:'0 4px 14px rgba(249,115,22,.35)',
                      fontFamily:'Sora,sans-serif',
                    }}
                  />
                  <WalletPayLink
                    productType="membership"
                    productKey={
                      plan === 'pro'
                        ? (cadence === 'annual' ? 'membership_pro_annual' : 'membership_pro_upgrade')
                        : (cadence === 'annual' ? 'membership_basic_annual' : 'membership_basic')
                    }
                    label={'Pay $' + price + ' with wallet'}
                    style={{
                      width:'100%', padding:'16px 28px', borderRadius:13, border:'none',
                      fontSize:16, fontWeight:800, color:'#fff', letterSpacing:'.3px',
                      background:'linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)',
                      boxShadow:'0 8px 24px rgba(16,185,129,.35),0 2px 8px rgba(16,185,129,.2)',
                      fontFamily:'Sora,sans-serif',
                    }}
                  />
                </div>
              </WalletConnectProvider>
            </Suspense>
          ) : (
            <button
              className="uchk-cta-btn"
              onClick={handleSubmit}
              disabled={!ready || loading || alreadyOnPlan}
            >
              {loading ? 'Processing…' : (
                ready ? ('Pay $' + price + (cadence === 'annual' ? ' /year' : ' /month')) : 'Pick cadence and payment method'
              )}
            </button>
          )}
        </div>

        <div className="uchk-trust">
          By upgrading you agree to our terms. Activates immediately. No refunds (purchase consent required).
        </div>

      </div>

      {consentModal}
    </AppLayout>
  );
}
