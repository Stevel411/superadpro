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
        .uchk-wrap{max-width:680px;margin:0 auto;padding:0 20px}
        .uchk-back{display:inline-flex;align-items:center;gap:6px;font-size:14px;color:#64748b;text-decoration:none;font-weight:500;margin-bottom:16px}
        .uchk-back:hover{color:#0f172a}
        .uchk-summary{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .uchk-summary-name{font-family:Sora,sans-serif;font-size:18px;font-weight:800;color:#0f172a;margin:0}
        .uchk-summary-tier-basic{color:#2563eb}
        .uchk-summary-tier-pro{color:#dc2626}
        .uchk-section{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:22px;margin-bottom:18px}
        .uchk-section-label{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:14px}
        .uchk-options-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media (max-width:520px){.uchk-options-grid{grid-template-columns:1fr}}
        .uchk-opt{padding:16px 18px;border:2px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;text-align:left;font-family:inherit;display:flex;flex-direction:column;gap:4px;transition:border .2s,background .2s,transform .15s}
        .uchk-opt:hover{border-color:#cbd5e1;transform:translateY(-1px)}
        .uchk-opt.selected{border-color:#2563eb;background:#eff6ff}
        .uchk-opt.selected.pro{border-color:#dc2626;background:#fef2f2}
        .uchk-opt-label{font-size:14px;font-weight:700;color:#0f172a}
        .uchk-opt-meta{font-size:13px;color:#64748b;margin-top:2px}
        .uchk-opt-savings{display:inline-block;background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-top:6px;width:fit-content}
        .uchk-rail{padding:14px 16px;border:2px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;display:flex;align-items:center;gap:12px;font-family:inherit;text-align:left;width:100%;transition:border .2s,background .2s}
        .uchk-rail+.uchk-rail{margin-top:10px}
        .uchk-rail:hover{border-color:#cbd5e1}
        .uchk-rail.selected{border-color:#2563eb;background:#eff6ff}
        .uchk-rail.selected.pro{border-color:#dc2626;background:#fef2f2}
        .uchk-rail.disabled{opacity:.5;cursor:not-allowed}
        .uchk-rail-icon{width:36px;height:36px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .uchk-rail-name{font-size:14px;font-weight:700;color:#0f172a}
        .uchk-rail-desc{font-size:12px;color:#64748b;margin-top:2px}
        .uchk-renew-row{display:flex;align-items:flex-start;gap:10px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-top:14px;cursor:pointer}
        .uchk-renew-row input{margin-top:3px;width:16px;height:16px;cursor:pointer;accent-color:#2563eb}
        .uchk-renew-text{font-size:13px;color:#475569;line-height:1.5;flex:1}
        .uchk-renew-text strong{color:#0f172a}
        .uchk-cta-row{display:flex;align-items:center;gap:14px;padding:18px 0 8px}
        .uchk-cta-btn{padding:14px 28px;border-radius:12px;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;color:#fff;background:linear-gradient(135deg,#1e3a8a,#2563eb);box-shadow:0 4px 16px rgba(37,99,235,.3);min-width:200px;transition:transform .15s,box-shadow .25s}
        .uchk-cta-btn.pro{background:linear-gradient(135deg,#7f1d1d,#dc2626);box-shadow:0 4px 16px rgba(220,38,38,.3)}
        .uchk-cta-btn:hover:not(:disabled){transform:translateY(-1px)}
        .uchk-cta-btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
        .uchk-error{padding:12px 14px;background:#fee2e2;border:1px solid #fecaca;border-radius:10px;font-size:13px;color:#991b1b;font-weight:600;margin-bottom:12px}
        .uchk-already{padding:18px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;color:#166534;font-weight:600;text-align:center;margin-bottom:16px}
      `}</style>

      <div className="uchk-wrap">

        <Link to="/upgrade" className="uchk-back">
          <ChevronLeft size={16}/> Change plan
        </Link>

        {alreadyOnPlan && (
          <div className="uchk-already">
            ✓ You're already on the {plan === 'pro' ? 'Pro' : 'Basic'} plan. <Link to="/dashboard" style={{ color:'#15803d', textDecoration:'underline' }}>Go to dashboard →</Link>
          </div>
        )}

        {/* Switch-to-annual banner — explains the value prop and what's happening
            to existing monthly time. Only shows when the user genuinely arrived
            from the "Switch to Annual" CTA on /upgrade and is in fact a Monthly
            member (defends against stale ?switch=annual URLs). */}
        {isLegitSwitch && (
          <div style={{
            padding:'14px 18px', background:'#eff6ff',
            border:'1.5px solid #bfdbfe', borderRadius:12, marginBottom:18,
            display:'flex', gap:12, alignItems:'flex-start',
          }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Zap size={16} color="#1e40af"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#1e3a8a', marginBottom:4 }}>
                You're switching to Annual billing
              </div>
              <div style={{ fontSize:13, color:'#1e40af', lineHeight:1.5 }}>
                Pay {plan === 'pro' ? '$350' : '$200'} once and get a fresh 365-day
                membership starting today. The remaining time on your monthly plan is
                included — you save {plan === 'pro' ? '$70/year' : '$40/year'} going
                forward.
              </div>
            </div>
          </div>
        )}

        {/* Plan summary */}
        <div className="uchk-summary">
          <div>
            <div style={{ fontSize:11, letterSpacing:1.5, textTransform:'uppercase', color:'#64748b', fontWeight:700, marginBottom:4 }}>
              You're upgrading to
            </div>
            <p className={'uchk-summary-name uchk-summary-tier-' + plan}>
              {plan === 'pro' ? 'Pro' : 'Basic'}
            </p>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, color:'#64748b' }}>From</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#0f172a' }}>
              ${plan === 'pro' && isBasicActive ? '15' : (plan === 'pro' ? '35' : '20')}
              <span style={{ fontSize:13, color:'#64748b', fontWeight:600, marginLeft:2 }}>/mo</span>
            </div>
          </div>
        </div>

        {/* Cadence */}
        <div className="uchk-section">
          <div className="uchk-section-label">
            {isLegitSwitch ? '1. Confirm billing cadence' : '1. Choose billing cadence'}
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
          <div className="uchk-section-label">2. Choose payment method</div>

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
                <div className="uchk-rail-icon" style={{ background:'#dcfce7' }}>
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
            <div className="uchk-rail-icon" style={{ background:'#fff7ed' }}>
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
            <div className="uchk-rail-icon" style={{ background:'#eff6ff' }}>
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
            // WalletConnect flow renders its own pay button; not standard submit.
            <Suspense fallback={<button className={'uchk-cta-btn' + (plan === 'pro' ? ' pro' : '')} disabled>Loading wallet…</button>}>
              <WalletConnectProvider>
                <WalletConnectGate>
                  <WalletPayLink
                    productType="membership"
                    productKey={
                      plan === 'pro'
                        ? (cadence === 'annual' ? 'membership_pro_annual' : 'membership_pro_upgrade')
                        : (cadence === 'annual' ? 'membership_basic_annual' : 'membership_basic')
                    }
                    label={'Pay $' + price + ' with wallet'}
                    style={{ padding:'14px 28px', fontSize:15, fontWeight:700, borderRadius:12, minWidth:200,
                             color:'#fff',
                             background: plan === 'pro' ? 'linear-gradient(135deg,#7f1d1d,#dc2626)' : 'linear-gradient(135deg,#1e3a8a,#2563eb)',
                             boxShadow: plan === 'pro' ? '0 4px 16px rgba(220,38,38,.3)' : '0 4px 16px rgba(37,99,235,.3)',
                             border:'none', cursor:'pointer', fontFamily:'inherit' }}
                  />
                </WalletConnectGate>
              </WalletConnectProvider>
            </Suspense>
          ) : (
            <button
              className={'uchk-cta-btn' + (plan === 'pro' ? ' pro' : '')}
              onClick={handleSubmit}
              disabled={!ready || loading || alreadyOnPlan}
            >
              {loading ? 'Processing…' : (
                ready ? ('Pay $' + price + (cadence === 'annual' ? ' /year' : ' /month')) : 'Pick cadence and payment method'
              )}
            </button>
          )}
        </div>

        <div style={{ fontSize:12, color:'#94a3b8', marginTop:12, textAlign:'center' }}>
          By upgrading you agree to our terms. Activates immediately. No refunds (purchase consent required).
        </div>

      </div>

      {consentModal}
    </AppLayout>
  );
}
