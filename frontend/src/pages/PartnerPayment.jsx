/**
 * PartnerPayment.jsx — /upgrade
 * ════════════════════════════════════════════════════════════════
 * The new Partner Membership Payment window, replacing the legacy
 * Basic/Pro plan picker (Upgrade.jsx) and the per-tier checkout
 * (UpgradeCheckout.jsx) under flat partner pricing (15 May 2026).
 *
 * Visual hierarchy (top to bottom):
 *  1. Gold founding-partner banner — only when spots remain
 *  2. Price card — large $15/mo or $20/mo with cadence toggle
 *  3. What you get — bullet list of platform features (single tier)
 *  4. Payment method picker — Balance / WalletConnect / NOWPayments
 *  5. CTA button — context-aware copy based on rail + state
 *
 * Endpoints used:
 *  - GET  /api/founding-members/status   (poll every 60s)
 *  - POST /api/membership/activate-from-balance  (balance rail)
 *  - POST /api/nowpayments/create-invoice        (crypto rail)
 *  - (WalletConnect components handle MetaMask rail directly)
 *
 * Already-active member behaviour:
 *  - Founding partner: shown "You're a Founding Partner" celebration
 *  - Standard partner: shown current expiry + offer to switch to annual
 *  - Free user: shown the conversion flow above
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { Check, Sparkles, Wallet, Coins, CreditCard, Loader2 } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Lazy-load WalletConnect components — they pull in wagmi/viem (~150kB)
// so we only import them if the user picks the wallet rail.
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });


export default function PartnerPayment() {
  var { t } = useTranslation();
  var { user, setUser } = useAuth();
  var navigate = useNavigate();
  var [searchParams] = useSearchParams();
  // Renew mode: reached by an active/in-grace member who wants to renew or set
  // up auto-renewal, NOT a free user activating for the first time. It
  // deliberately bypasses the "you're already active" wall below.
  //
  // Triggered by ?renew=1 OR by being overdue. An overdue member is still
  // is_active=true (in grace) but their membership has expired — without the
  // overdue check they'd hit the "you're all set" wall with NO way to pay,
  // even though they urgently need to renew. membership_overdue comes from
  // /api/me, so any entry point (not just the ?renew=1 banner) routes an
  // overdue member to the working renewal view (card + crypto).
  var renewMode = searchParams.get('renew') === '1' || user?.membership_overdue === true;

  // Founding-status state — polled every 60s so the count is always fresh
  var [status, setStatus] = useState(null);
  // User selections
  var [cadence, setCadence] = useState('monthly');     // 'monthly' | 'annual'
  var [rail, setRail] = useState('');                  // 'balance' | 'crypto' | 'wallet' | 'card'
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  // Stripe availability — set true when STRIPE_SECRET_KEY/PRICE_IDs are
  // configured server-side. Drives whether to render the 'Pay by card'
  // rail option. 23 May 2026.
  var [stripeReady, setStripeReady] = useState(false);

  // Purchase consent gate — required by the backend before any money-in
  // endpoint will accept the request. PARTNER PAYMENT WAS MISSING THIS
  // GATE (added 16 May 2026 after broadcast went out and users hit
  // "You must read and accept the purchase terms" errors). Modal is
  // rendered in the page tree; ensureConsent() returns a Promise that
  // resolves true if accepted, false if cancelled.
  var consentGate = useConsentGate();
  var ensureConsent = consentGate.ensureConsent;
  var consentModal = consentGate.consentModal;

  // Poll founding status — initial fetch + 60s interval
  useEffect(function() {
    var cancelled = false;
    function load() {
      apiGet('/api/founding-members/status')
        .then(function(r) {
          if (!cancelled && r && typeof r.spots_remaining === 'number') {
            setStatus(r);
          }
        })
        .catch(function() { /* network blip, retry on next interval */ });
    }
    load();
    var iv = setInterval(load, 60000);
    return function() { cancelled = true; clearInterval(iv); };
  }, []);

  // One-shot Stripe availability check — drives whether the card rail
  // option appears in the payment method picker. Falls back to no card
  // option on failure so the existing crypto rails remain usable.
  useEffect(function() {
    apiGet('/api/stripe/status')
      .then(function(r) { if (r && r.configured === true) setStripeReady(true); })
      .catch(function() { /* leave card hidden */ });
  }, []);

  // ── Signup-funnel tracking (24 May 2026) ──
  // Fire-and-forget: log that this Free user landed on /upgrade. Pairs
  // with dashboard_view_inactive on Dashboard to give us a step-by-step
  // funnel diagnosis (registered → dashboard_viewed → upgrade_viewed →
  // activated). Server idempotent per (user, event, UTC date); no-op for
  // active members. Guarded client-side so we skip the round-trip when
  // it would be wasted.
  useEffect(function() {
    if (!user || user.is_active) return;
    apiPost('/api/funnel/track', { event: 'upgrade_view_inactive' }).catch(function() {});
  }, [user?.id, user?.is_active]);


  // Derived state
  var isActive = !!user?.is_active;
  // A member already on a card subscription auto-renews via Stripe
  // (invoice.paid). has_card_subscription is true ONLY for a real membership
  // subscription — not a one-time card purchase — so the renew flow shows
  // "auto-renewal is on" for these members instead of a duplicate CTA.
  var onCardAutoRenew = isActive && (user?.has_card_subscription === true);
  var tier = (user?.membership_tier || 'free').toLowerCase();
  // Founding status lives on a dedicated boolean field, not the tier
  // string (tier is just 'partner' or 'free' under flat-pricing).
  var isFounder = user?.is_founding_member === true;
  var foundingOpen = !!(status && status.is_open && !isActive && (user?.founder_eligible !== false));
  var refreshUser = setUser ? function() {
    // Re-fetch user state after activation. AuthProvider exposes setUser
    // but we re-fetch via /api/me to get fresh server-side values.
    apiGet('/api/me').then(function(r) { if (r && r.user) setUser(r.user); }).catch(function() {});
  } : function() {};

  // Price calculation (derived from status; falls back to standard if status
  // hasn't loaded yet so the UI never shows $0)
  var monthlyPrice = foundingOpen ? '15' : '20';
  var annualPrice = foundingOpen ? '150' : '200';
  var standardAnnualOriginal = foundingOpen ? '180' : '240';  // monthly × 12 — used to show savings
  var price = cadence === 'annual' ? annualPrice : monthlyPrice;
  var savings = cadence === 'annual'
    ? (foundingOpen ? '30' : '40')  // $180-$150 founding, $240-$200 standard
    : '0';

  // ── Submit handler ──────────────────────────────────────────────
  async function handleSubmit() {
    if (!rail || loading) return;
    setError('');

    // Backend rejects any money-in request without a fresh consent record.
    // Open the consent modal first; only proceed if the user accepts.
    var ok = await ensureConsent();
    if (!ok) return;

    setLoading(true);

    if (rail === 'card') {
      // Stripe Checkout — redirect to Stripe-hosted page. Tier choice
      // follows the same founder-vs-partner logic the crypto rails use:
      // if a founding spot is still open, send tier='founding' for the
      // $15 lifetime-lock price; otherwise tier='partner' at $20.
      // Backend re-checks the 100-cap server-side under the founder lock
      // so two members hitting Stripe Checkout simultaneously at spot
      // #100 won't both get the price.
      //
      // 27 May 2026: also pass billing cadence so annual ($150 Founder /
      // $200 Partner) routes to the annual Stripe Price IDs instead of
      // silently defaulting to monthly.
      var tierForStripe = foundingOpen ? 'founding' : 'partner';
      apiPost('/api/stripe/checkout/membership', { tier: tierForStripe, billing: cadence })
        .then(function(d) {
          setLoading(false);
          if (d.checkout_url) { window.location.href = d.checkout_url; }
          else { setError(d.error || t('partner.errorCardCheckout', { defaultValue: "We couldn't start card checkout. Please try again or use another method." })); }
        })
        .catch(function(e) { setLoading(false); setError(e.message || t('partner.errorCardFailed', { defaultValue: 'Card checkout failed. Please try again.' })); });
      return;
    }

    if (rail === 'crypto') {
      var productKey = cadence === 'annual' ? 'membership_partner_annual' : 'membership_partner';
      apiPost('/api/nowpayments/create-invoice', { product_key: productKey })
        .then(function(d) {
          setLoading(false);
          if (d.invoice_url) { window.location.href = d.invoice_url; }
          else { setError(d.error || t('partner.errorCryptoCheckout', { defaultValue: "We couldn't start the crypto checkout. Please try again or use another method." })); }
        })
        .catch(function(e) { setLoading(false); setError(e.message || t('partner.errorCryptoFailed', { defaultValue: 'Crypto checkout failed. Please try again.' })); });
      return;
    }

    if (rail === 'balance') {
      // Activate from wallet balance — backend handles founding-spot claim
      // atomically under flat partner pricing. Monthly only at this endpoint;
      // annual via crypto rail.
      apiPost('/api/membership/activate-from-balance', {})
        .then(function(d) {
          setLoading(false);
          if (d.success || d.message) {
            refreshUser();
            navigate('/dashboard?activated=1');
          } else {
            setError(d.error || t('partner.errorActivation', { defaultValue: "We couldn't activate your membership. Please try a different method." }));
          }
        })
        .catch(function(e) { setLoading(false); setError(e.message || t('partner.errorActivationFailed', { defaultValue: 'Activation failed. Please try again.' })); });
      return;
    }

    // rail === 'wallet' is handled by the WalletConnect components below;
    // submit button is replaced by the wallet flow buttons in that case.
    setLoading(false);
  }

  // ── Card auto-renew (renew mode) ───────────────────────────────
  // Turns on a recurring Stripe subscription so the member never lapses.
  // Reuses the same checkout endpoint as activation: the backend forces the
  // Founder lock ($15) server-side for existing founders, records the
  // subscription on the completed-checkout webhook WITHOUT re-paying the
  // sponsor (active-member guard), and renews monthly via invoice.paid.
  async function handleCardRenew() {
    if (loading) return;
    setError('');
    var ok = await ensureConsent();
    if (!ok) return;
    setLoading(true);
    // tier is advisory — backend forces 'founding' for existing founders.
    var tierForStripe = isFounder ? 'founding' : 'partner';
    apiPost('/api/stripe/checkout/membership', { tier: tierForStripe, billing: cadence })
      .then(function(d) {
        setLoading(false);
        if (d.already_subscribed) {
          // Safety backstop: they already have auto-renew. Refresh and bounce
          // to the wallet renewal view rather than starting a 2nd subscription.
          refreshUser();
          navigate('/wallet?tab=renewal');
          return;
        }
        if (d.checkout_url) { window.location.href = d.checkout_url; }
        else { setError(d.error || t('partner.errorCardCheckout', { defaultValue: "We couldn't start card renewal. Please try again." })); }
      })
      .catch(function(e) { setLoading(false); setError(e.message || t('partner.errorCardFailed', { defaultValue: 'Card renewal failed. Please try again.' })); });
  }

  // ── Renew one month straight from wallet balance ───────────────
  // On-demand version of the auto-renew-from-balance cron: charges the
  // member's locked fee ($15 Founder / $20 Partner) from their commission
  // wallet, pays the sponsor via the shared engine, and clears overdue state.
  // Backend: /api/membership/renew-from-balance (reuses payment.apply_wallet_renewal).
  async function handleBalanceRenew() {
    if (loading) return;
    setError('');
    var ok = await ensureConsent();
    if (!ok) return;
    setLoading(true);
    apiPost('/api/membership/renew-from-balance', {})
      .then(function(d) {
        setLoading(false);
        if (d.success) {
          refreshUser();
          navigate('/wallet?tab=renewal&renewed=1');
        } else {
          setError(d.error || t('partner.errorBalanceRenew', { defaultValue: "We couldn't renew from your balance. Please try again." }));
        }
      })
      .catch(function(e) { setLoading(false); setError((e && e.message) || t('partner.errorBalanceRenewFailed', { defaultValue: 'Renewal from balance failed. Please try again.' })); });
  }
  // ...unless they came here in renew mode (?renew=1) to set up auto-renewal.
  if (isActive && !renewMode) {
    return (
      <AppLayout title={t('partner.title', { defaultValue: 'Partner Membership' })}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{
            background: isFounder
              ? 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)'
              : 'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid))',
            borderRadius: 18,
            padding: 32,
            color: isFounder ? '#1f1410' : '#fff',
            fontFamily: 'Sora, sans-serif',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {isFounder ? '👑' : '✓'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              {isFounder
                ? t('partner.activeFounderTitle', { defaultValue: "You're a Founding Partner" })
                : t('partner.activePartnerTitle', { defaultValue: "You're an active Partner" })
              }
            </div>
            <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6, marginBottom: 20 }}>
              {isFounder
                ? t('partner.activeFounderDesc', { defaultValue: 'Your $15/month rate is locked for life. Welcome to the founding circle.' })
                : t('partner.activePartnerDesc', { defaultValue: 'Your $20/month Partner membership is active. You have full platform access.' })
              }
            </div>
            <button onClick={function() { navigate('/dashboard'); }} style={{
              padding: '12px 28px', borderRadius: 10, border: 'none',
              background: isFounder ? '#1f1410' : '#fff',
              color: isFounder ? '#fbbf24' : 'var(--sap-cobalt-deep)',
              fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 800,
              cursor: 'pointer',
            }}>
              {t('partner.backToDashboard', { defaultValue: 'Back to Dashboard' })}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Renew mode: an active/in-grace member setting up renewal ───
  // Card-first (recurring Stripe = the only rail that auto-renews, so the
  // member never lapses). Crypto fallback lands in the next phase.
  if (isActive && renewMode) {
    var renewMonthly = isFounder ? '15' : '20';   // backend is the price source of truth
    return (
      <AppLayout title={t('partner.renewTitle', { defaultValue: 'Renew Membership' })}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', fontFamily: 'DM Sans, sans-serif' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid))',
            borderRadius: 18, padding: 32, color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            {onCardAutoRenew ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Sora, sans-serif', marginBottom: 8 }}>
                  {t('partner.renewOnTitle', { defaultValue: 'Auto-renewal is on' })}
                </div>
                <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6, marginBottom: 20 }}>
                  {t('partner.renewOnDesc', { defaultValue: 'Your membership renews automatically by card at $' + renewMonthly + '/month. Nothing to do — you won\u2019t lapse.' })}
                </div>
                <Link to="/wallet?tab=renewal" style={{
                  display: 'inline-block', padding: '12px 24px', borderRadius: 10,
                  background: '#fff', color: 'var(--sap-cobalt-deep)', textDecoration: 'none',
                  fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 800,
                }}>
                  {t('partner.manageRenewal', { defaultValue: 'View renewal status' })}
                </Link>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Sora, sans-serif', marginBottom: 8, textAlign: 'center' }}>
                  {t('partner.renewSetupTitle', { defaultValue: 'Never lapse again' })}
                </div>
                <div style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
                  {t('partner.renewSetupDesc', { defaultValue: 'Turn on automatic card renewal at $' + renewMonthly + '/month' + (isFounder ? ' \u2014 your locked Founder rate' : '') + '. We renew it for you each month \u2014 no manual payments, no missed grace periods.' })}
                </div>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.4)', color: '#fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>
                )}
                <button onClick={handleCardRenew} disabled={loading} style={{
                  width: '100%', padding: '14px 22px', borderRadius: 10, border: 'none',
                  background: 'var(--sap-cyan, #0ea5e9)', color: '#0a1438',
                  fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 800,
                  cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {!loading && <CreditCard size={18} />}
                  {loading
                    ? t('partner.renewStarting', { defaultValue: 'Starting\u2026' })
                    : t('partner.renewCardCta', { defaultValue: 'Turn on card auto-renew \u2192' })}
                </button>
                {/* Pay one month straight from wallet balance — instant, no card
                    or crypto. Founder $15 / Partner $20 (renewMonthly). Enabled
                    only when the affiliate wallet covers the fee; otherwise show
                    the shortfall. Backend recomputes the locked fee server-side. */}
                {(function() {
                  var walletBal = Number(user && user.balance ? user.balance : 0);
                  var fee = Number(renewMonthly);
                  var covers = walletBal >= fee;
                  return (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 12px', opacity: 0.7 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.18)' }} />
                        <span style={{ fontSize: 12, color: '#cbd5e1' }}>{t('partner.or', { defaultValue: 'or' })}</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.18)' }} />
                      </div>
                      {covers ? (<>
                        <button onClick={handleBalanceRenew} disabled={loading} style={{
                          width: '100%', padding: '13px 22px', borderRadius: 10, border: 'none',
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)',
                          color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 800,
                          cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                          <Wallet size={17} />
                          {loading
                            ? t('partner.renewStarting', { defaultValue: 'Starting\u2026' })
                            : t('partner.renewBalanceCta', { defaultValue: 'Pay $' + renewMonthly + ' now from wallet balance' })}
                        </button>
                        <div style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>
                          {t('partner.renewBalanceAvail', { defaultValue: '$' + walletBal.toFixed(2) + ' available \u2014 renews instantly, no card needed' })}
                        </div>
                      </>) : (
                        <div style={{ fontSize: 12.5, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.5 }}>
                          {t('partner.renewBalanceShort', { defaultValue: 'Wallet balance $' + walletBal.toFixed(2) + ' \u2014 $' + (fee - walletBal).toFixed(2) + ' short of the $' + renewMonthly + ' fee. Earn or top up to pay from balance.' })}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Crypto fallback — one month in USDT at the locked price.
                    Monthly only: annual pays the sponsor 10x up front, so crypto
                    renewal stays monthly. 'membership_renew' is priced at the
                    locked rate server-side and routes to the renewal engine. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px', opacity: 0.7 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.18)' }} />
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>{t('partner.or', { defaultValue: 'or' })}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.18)' }} />
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5, marginBottom: 10, textAlign: 'center' }}>
                  {t('partner.renewCryptoLabel', { defaultValue: 'Renew one month with crypto (USDT $' + renewMonthly + ')' })}
                </div>
                <Suspense fallback={<div style={{ textAlign: 'center', fontSize: 13, opacity: 0.7 }}>{t('partner.loadingWallet', { defaultValue: 'Loading wallet…' })}</div>}>
                  <WalletConnectProvider onBeforeClick={ensureConsent}>
                    <WalletConnectGate
                      hideWhenConnected
                      label={t('partner.connectWalletRenew', { defaultValue: 'Connect wallet to pay $' + renewMonthly })}
                      style={{ width: '100%', padding: '13px 22px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #ea580c, #f97316)', fontFamily: 'Sora, sans-serif', cursor: 'pointer' }}
                    />
                    <WalletPayLink
                      productType="membership"
                      productKey="membership_renew"
                      label={t('partner.renewWithWallet', { defaultValue: 'Renew with USDT ($' + renewMonthly + ')' })}
                      style={{ width: '100%', padding: '13px 22px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)', fontFamily: 'Sora, sans-serif', cursor: 'pointer', marginTop: 8 }}
                    />
                  </WalletConnectProvider>
                </Suspense>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={function() { navigate('/dashboard'); }} style={{
              background: 'none', border: 'none', color: '#7b91a8', fontSize: 13,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>
              {t('partner.backToDashboard', { defaultValue: 'Back to Dashboard' })}
            </button>
          </div>
        </div>
        {/* Consent modal MUST be mounted in this renew branch too — the card
            and crypto buttons here call ensureConsent(), which shows this modal
            and awaits accept/decline. Without it mounted the promise never
            resolves and the buttons silently do nothing. */}
        {consentModal}
      </AppLayout>
    );
  }

  // ── Free user: full conversion page ────────────────────────────
  return (
    <AppLayout title={t('partner.title', { defaultValue: 'Partner Membership' })}>
      <style>{`
        .pp-wrap { max-width: 720px; margin: 0 auto; padding: 16px 20px 60px; }
        .pp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
        .pp-cadence-toggle {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          background: #f1f5f9; padding: 4px; border-radius: 12px;
        }
        .pp-cadence-opt {
          padding: 12px; border-radius: 9px; cursor: pointer; border: none;
          background: transparent; font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 700; color: #475569;
          transition: all 0.15s;
        }
        .pp-cadence-opt.active { background: #fff; color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
        .pp-rail-opt {
          display: flex; align-items: center; gap: 14px;
          padding: 16px; border-radius: 12px; border: 2px solid #e2e8f0;
          background: #fff; cursor: pointer; transition: all 0.15s;
          margin-bottom: 10px; text-align: left; width: 100%;
          font-family: 'Sora', sans-serif;
        }
        .pp-rail-opt:hover { border-color: #94a3b8; }
        .pp-rail-opt.active { border-color: var(--sap-cobalt-deep, #1e40af); background: #eff6ff; }
        .pp-cta-btn {
          width: 100%; padding: 16px 28px; border-radius: 12px; border: none;
          font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 800;
          color: #fff; cursor: pointer; transition: all 0.15s;
          background: linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%);
          box-shadow: 0 6px 20px rgba(16,185,129,0.3);
        }
        .pp-cta-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pp-error {
          background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
          padding: 12px 16px; border-radius: 10px; font-size: 13px;
          margin-bottom: 12px; font-family: 'Sora', sans-serif;
        }
      `}</style>

      <div className="pp-wrap">

        {/* ── Founding banner (when spots remain) ── */}
        {foundingOpen && (
          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 50%, #d97706 100%)',
            borderRadius: 16, padding: '20px 24px', marginBottom: 16,
            color: '#1f1410',
            fontFamily: 'Sora, sans-serif',
            boxShadow: '0 6px 20px rgba(217, 119, 6, 0.3)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
              👑 Exclusive Invitation
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25, marginBottom: 4 }}>
              {t('partner.foundingTitle', { defaultValue: 'Only {{remaining}} of 100 founding seats remaining', remaining: status.spots_remaining })}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9, lineHeight: 1.4 }}>
              {t('partner.foundingDesc', { defaultValue: 'Lock in $15/month for life. $5 off, every month, forever.' })}
            </div>
          </div>
        )}

        {/* ── Price card ── */}
        <div className="pp-card">
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
            {foundingOpen
              ? t('partner.cardEyebrowFounding', { defaultValue: 'Founding Partner Membership' })
              : t('partner.cardEyebrowStandard', { defaultValue: 'Partner Membership' })
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 44, fontWeight: 900, fontFamily: 'Sora, sans-serif', color: '#0f172a', lineHeight: 1 }}>
              ${price}
            </span>
            <span style={{ fontSize: 16, color: '#64748b', fontWeight: 600 }}>
              {cadence === 'annual'
                ? t('partner.perYear', { defaultValue: '/ year' })
                : t('partner.perMonth', { defaultValue: '/ month' })
              }
            </span>
            {foundingOpen && (
              <span style={{
                marginLeft: 8, fontSize: 11, fontWeight: 800, letterSpacing: 0.6,
                color: '#92400e', background: '#fef3c7',
                padding: '3px 9px', borderRadius: 999,
              }}>
                {t('partner.lockedForLife', { defaultValue: 'LOCKED FOR LIFE' })}
              </span>
            )}
          </div>
          {cadence === 'annual' && savings !== '0' && (
            <div style={{ fontSize: 13, color: '#059669', fontWeight: 700, marginBottom: 14 }}>
              {t('partner.savings', { defaultValue: 'Save ${{savings}} vs paying monthly', savings: savings })}
            </div>
          )}

          {/* Cadence toggle */}
          <div className="pp-cadence-toggle" role="tablist">
            <button
              type="button"
              className={'pp-cadence-opt' + (cadence === 'monthly' ? ' active' : '')}
              onClick={function() { setCadence('monthly'); }}
              aria-selected={cadence === 'monthly'}
            >
              {t('partner.cadenceMonthly', { defaultValue: 'Monthly · $' }) + monthlyPrice}
            </button>
            <button
              type="button"
              className={'pp-cadence-opt' + (cadence === 'annual' ? ' active' : '')}
              onClick={function() { setCadence('annual'); }}
              aria-selected={cadence === 'annual'}
            >
              {t('partner.cadenceAnnual', { defaultValue: 'Annual · $' }) + annualPrice}
            </button>
          </div>
        </div>

        {/* ── What you get ── */}
        <div className="pp-card">
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
            {t('partner.featuresEyebrow', { defaultValue: 'What you get' })}
          </div>
          {[
            t('partner.feature.fullAccess', { defaultValue: 'Full platform access — every tool, no upgrades needed' }),
            t('partner.feature.commissions', { defaultValue: 'Earn commissions on referrals, Campaign Tier sales, and Creator Credits' }),
            t('partner.feature.aiTools', { defaultValue: 'AI-powered Creative Studio, Lead Finder, Email Autoresponder, ProSeller AI' }),
            t('partner.feature.funnels', { defaultValue: 'Hosted landing pages, SuperPages funnel builder, LinkHub bio links' }),
            t('partner.feature.training', { defaultValue: 'Full training centre, comp plan resources, and member community' }),
          ].map(function(line, i) {
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <Check style={{ width: 18, height: 18, color: '#059669', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{line}</span>
              </div>
            );
          })}
        </div>

        {/* ── Payment method picker ── */}
        <div className="pp-card">
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
            {t('partner.paymentEyebrow', { defaultValue: 'How would you like to pay?' })}
          </div>

          {/* Card via Stripe — only shown when backend says Stripe is
              configured. 23 May 2026: positioned first because card
              payment is the most familiar option for new prospects who
              were previously blocked by crypto-only checkout. */}
          {stripeReady && (
            <button type="button" className={'pp-rail-opt' + (rail === 'card' ? ' active' : '')} onClick={function() { setRail('card'); }}>
              <CreditCard style={{ width: 22, height: 22, color: '#0ea5e9', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {t('partner.railCard', { defaultValue: 'Pay with card' })}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {t('partner.railCardDesc', { defaultValue: 'Debit or credit card via Stripe — fast, secure, familiar' })}
                </div>
              </div>
            </button>
          )}

          {/* Wallet balance — only shown if monthly (backend balance flow is monthly-only) */}
          {cadence === 'monthly' && (
            <button type="button" className={'pp-rail-opt' + (rail === 'balance' ? ' active' : '')} onClick={function() { setRail('balance'); }}>
              <Wallet style={{ width: 22, height: 22, color: '#0ea5e9', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {t('partner.railBalance', { defaultValue: 'Use my wallet balance' })}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {t('partner.railBalanceDesc', { defaultValue: 'Pay from commissions you\'ve already earned (monthly only)' })}
                </div>
              </div>
            </button>
          )}

          {/* WalletConnect / MetaMask */}
          <button type="button" className={'pp-rail-opt' + (rail === 'wallet' ? ' active' : '')} onClick={function() { setRail('wallet'); }}>
            <Coins style={{ width: 22, height: 22, color: '#f59e0b', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {t('partner.railWallet', { defaultValue: 'Pay direct from my crypto wallet' })}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {t('partner.railWalletDesc', { defaultValue: 'MetaMask, Trust Wallet, Coinbase — USDT on BSC, you keep the fee savings' })}
              </div>
            </div>
          </button>

          {/* NOWPayments crypto checkout */}
          <button type="button" className={'pp-rail-opt' + (rail === 'crypto' ? ' active' : '')} onClick={function() { setRail('crypto'); }}>
            <CreditCard style={{ width: 22, height: 22, color: '#8b5cf6', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {t('partner.railCrypto', { defaultValue: 'Pay with crypto (hosted checkout)' })}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {t('partner.railCryptoDesc', { defaultValue: 'BTC, ETH, USDT, and 100+ coins via NOWPayments — easy if you\'re new to crypto' })}
              </div>
            </div>
          </button>
        </div>

        {/* Error message */}
        {error && <div className="pp-error">{error}</div>}

        {/* ── CTA ── */}
        {rail === 'wallet' ? (
          // WalletConnect flow renders its own buttons (Connect → Pay).
          // onBeforeClick wires the consent gate into the wallet rail —
          // WalletPayLink calls it before creating the on-chain intent,
          // so the user sees the same consent modal regardless of rail.
          <Suspense fallback={<button className="pp-cta-btn" disabled>{t('partner.loadingWallet', { defaultValue: 'Loading wallet…' })}</button>}>
            <WalletConnectProvider onBeforeClick={ensureConsent}>
              <WalletConnectGate
                hideWhenConnected
                label={t('partner.connectWallet', { defaultValue: 'Connect your wallet to pay ${{amount}}', amount: price })}
                style={{
                  width: '100%', padding: '16px 28px', borderRadius: 12, border: 'none',
                  fontSize: 16, fontWeight: 800, color: '#fff',
                  background: 'linear-gradient(135deg, #ea580c, #f97316)',
                  boxShadow: '0 6px 20px rgba(249,115,22,0.35)',
                  fontFamily: 'Sora, sans-serif', cursor: 'pointer',
                }}
              />
              <WalletPayLink
                productType="membership"
                productKey={cadence === 'annual' ? 'membership_partner_annual' : 'membership_partner'}
                label={t('partner.payWithWallet', { defaultValue: 'Pay ${{amount}} with wallet', amount: price })}
                style={{
                  width: '100%', padding: '16px 28px', borderRadius: 12, border: 'none',
                  fontSize: 16, fontWeight: 800, color: '#fff',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)',
                  boxShadow: '0 6px 20px rgba(16,185,129,0.3)',
                  fontFamily: 'Sora, sans-serif', cursor: 'pointer',
                }}
              />
            </WalletConnectProvider>
          </Suspense>
        ) : (
          <button
            type="button"
            className="pp-cta-btn"
            onClick={handleSubmit}
            disabled={!rail || loading}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                {t('partner.processing', { defaultValue: 'Processing…' })}
              </span>
            ) : (
              !rail
                ? t('partner.ctaPickRail', { defaultValue: 'Choose a payment method above' })
                : (foundingOpen
                  ? t('partner.ctaClaim', { defaultValue: 'Claim your founding seat — ${{amount}}', amount: price })
                  : t('partner.ctaBecome', { defaultValue: 'Become a Partner — ${{amount}}', amount: price })
                )
            )}
          </button>
        )}

        {/* Footer reassurance */}
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#64748b' }}>
          {t('partner.footerReassurance', { defaultValue: 'Cancel anytime. No surprise charges. Crypto payments confirmed on-chain.' })}
        </div>

      </div>
      {/* Purchase consent modal — opens via ensureConsent() before any
          buy API hit. Backend rejects purchases without a fresh consent
          (within the last 5 min), so this gate is required on every rail. */}
      {consentModal}
    </AppLayout>
  );
}
