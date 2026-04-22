import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// Live platform pricing from app/crypto_payments.py
var PRICE_MONTHLY = { basic: 20, pro: 35 };
var PRICE_ANNUAL  = { basic: 200, pro: 350 };
var COMMISSION_RATE = 0.5;

// Hero counter target: $17.50 (stored as cents = 1750 for clean integer state)
var HERO_TARGET_CENTS = 1750;

export default function MembershipStreamPage() {
  var { t } = useTranslation();

  // Calculator state
  var [plan, setPlan] = useState('pro');      // 'basic' | 'pro'
  var [refs, setRefs] = useState(10);
  var [pulseKey, setPulseKey] = useState(0);  // bumps trigger pulse animation

  // Hero animated counter state (stored as cents, rendered as dollars.cc)
  var [heroCents, setHeroCents] = useState(0);

  useEffect(function() { window.scrollTo(0, 0); }, []);

  // Hero counter animation — $0.00 → $17.50 over 2s, starting at 2s
  useEffect(function() {
    var startTime = null;
    var duration = 2000;
    var target = HERO_TARGET_CENTS;
    var rafId = null;
    var startDelay = setTimeout(function() {
      function tick(now) {
        if (startTime === null) startTime = now;
        var tt = Math.min(1, (now - startTime) / duration);
        var eased = 1 - Math.pow(1 - tt, 3);
        setHeroCents(Math.round(target * eased));
        if (tt < 1) rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }, 2000);
    return function() {
      clearTimeout(startDelay);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // ═════════ Calculator math ═════════
  var monthlyPrice = PRICE_MONTHLY[plan];
  var annualPrice  = PRICE_ANNUAL[plan];
  var commissionPerRefMonthly = monthlyPrice * COMMISSION_RATE;   // 10 or 17.50
  var commissionPerRefAnnual  = annualPrice * COMMISSION_RATE;    // 100 or 175

  var monthlyResidual  = refs * commissionPerRefMonthly;
  var twelveMonthTotal = monthlyResidual * 12;
  var annualUpfront    = refs * commissionPerRefAnnual;

  function fmt(n) {
    // Whole dollars for integers, .xx for fractional
    if (Number.isInteger(n)) return '$' + n.toLocaleString();
    return '$' + n.toFixed(2);
  }

  function bump() { setPulseKey(function(k) { return k + 1; }); }

  function selectPlan(p) {
    if (p === plan) return;
    setPlan(p);
    bump();
  }

  function onRefsChange(e) {
    setRefs(parseInt(e.target.value, 10));
    bump();
  }

  var heroNumDisplay = '$' + (heroCents / 100).toFixed(2);

  // Build the honest-moment paragraph with inline <strong> spans from i18n pieces
  // (the mockup has two bolded phrases inside the paragraph)

  return (
    <div className="membership-stream-page">
      <style>{membershipStyles}</style>

      <div className="ambient-bg">
        <div className="ambient-stars"></div>
        <div className="ambient-wash"></div>
      </div>

      {/* TOP — minimal back link */}
      <nav className="stream-nav">
        <div className="stream-nav-inner">
          <Link to="/explore/compensation" className="stream-back">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('membershipStream.backLink')}
          </Link>
        </div>
      </nav>

      {/* ══════════════ HERO ══════════════ */}
      <section className="hero" id="sec-hero">
        <div className="hero-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            <path d="M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".65"/>
            <path d="M3 7c2-4 4-4 6 0s4 4 6 0 4-4 6 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".45"/>
          </svg>
        </div>
        <div className="hero-tag">{t('membershipStream.hero.tag')}</div>
        <h1 className="hero-h">
          <span className="word w1">{t('membershipStream.hero.word1')}</span>{' '}
          <span className="word w2">{t('membershipStream.hero.word2')}</span>{' '}
          <span className="word w3">{t('membershipStream.hero.word3')}</span>
        </h1>
        <div className="hero-promise">
          <div className="hero-promise-label">{t('membershipStream.hero.promiseLabel')}</div>
          <span className="hero-promise-val">{heroNumDisplay}</span>
          <div className="hero-promise-sub">{t('membershipStream.hero.promiseSub')}</div>
        </div>
        <p className="hero-sub">{t('membershipStream.hero.sub')}</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">{t('membershipStream.hero.stat1Num')}</span>
            <div className="hero-stat-label">{t('membershipStream.hero.stat1Label')}</div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{t('membershipStream.hero.stat2Num')}</span>
            <div className="hero-stat-label">{t('membershipStream.hero.stat2Label')}</div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{t('membershipStream.hero.stat3Num')}</span>
            <div className="hero-stat-label">{t('membershipStream.hero.stat3Label')}</div>
          </div>
        </div>
        <div className="hero-scroll">{t('membershipStream.hero.scroll')}</div>
      </section>

      {/* ══════════════ § 01 — THE TWO MEMBERSHIPS ══════════════ */}
      <section className="section" id="sec-plans">
        <div className="section-tag">{t('membershipStream.plans.tag')}</div>
        <h2 className="section-h">
          {t('membershipStream.plans.title')}
          <span className="accent">{t('membershipStream.plans.titleAccent')}</span>
        </h2>
        <p className="section-sub">{t('membershipStream.plans.sub')}</p>

        <div className="plans-wrap">
          {/* BASIC */}
          <div className="plan-card basic">
            <div className="plan-head">
              <div className="plan-name">{t('membershipStream.plans.basicName')}</div>
              <div className="plan-title">{t('membershipStream.plans.basicTitle')}</div>
              <div className="plan-price">
                <span className="plan-price-val">{t('membershipStream.plans.basicPrice')}</span>
                <span className="plan-price-per">{t('membershipStream.plans.basicPer')}</span>
              </div>
              <div className="plan-subtitle">{t('membershipStream.plans.basicSubtitle')}</div>
            </div>
            <div className="plan-commission">
              <div className="plan-commission-label">{t('membershipStream.plans.basicCommissionLabel')}</div>
              <div className="plan-commission-row">
                <span className="plan-commission-num">{t('membershipStream.plans.basicCommission')}</span>
                <span className="plan-commission-rhythm">{t('membershipStream.plans.basicCommissionRhythm')}</span>
              </div>
            </div>
            <div className="plan-annual">
              <div className="plan-annual-head">
                <span className="plan-annual-label">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.51 5.82 21l2.36-7.15L2 9.36h7.61z"/></svg>
                  {t('membershipStream.plans.basicAnnualLabel')}
                </span>
                <span className="plan-annual-save">{t('membershipStream.plans.basicAnnualSave')}</span>
              </div>
              <div className="plan-annual-row">
                <div className="plan-annual-side">
                  <div className="plan-annual-side-label">{t('membershipStream.plans.basicAnnualMemberLabel')}</div>
                  <div className="plan-annual-side-val">{t('membershipStream.plans.basicAnnualMember')}</div>
                </div>
                <div className="plan-annual-side">
                  <div className="plan-annual-side-label">{t('membershipStream.plans.basicAnnualCommissionLabel')}</div>
                  <div className="plan-annual-side-val commission">{t('membershipStream.plans.basicAnnualCommission')}</div>
                </div>
              </div>
            </div>
            <div className="plan-features">
              <PlanFeature>{t('membershipStream.plans.basicFeat1')}</PlanFeature>
              <PlanFeature>{t('membershipStream.plans.basicFeat2')}</PlanFeature>
              <PlanFeature>{t('membershipStream.plans.basicFeat3')}</PlanFeature>
              <PlanFeature>{t('membershipStream.plans.basicFeat4')}</PlanFeature>
            </div>
          </div>

          {/* PRO */}
          <div className="plan-card pro">
            <div className="plan-badge">{t('membershipStream.plans.proBadge')}</div>
            <div className="plan-head">
              <div className="plan-name">{t('membershipStream.plans.proName')}</div>
              <div className="plan-title">{t('membershipStream.plans.proTitle')}</div>
              <div className="plan-price">
                <span className="plan-price-val">{t('membershipStream.plans.proPrice')}</span>
                <span className="plan-price-per">{t('membershipStream.plans.proPer')}</span>
              </div>
              <div className="plan-subtitle">{t('membershipStream.plans.proSubtitle')}</div>
            </div>
            <div className="plan-commission">
              <div className="plan-commission-label">{t('membershipStream.plans.proCommissionLabel')}</div>
              <div className="plan-commission-row">
                <span className="plan-commission-num">{t('membershipStream.plans.proCommission')}</span>
                <span className="plan-commission-rhythm">{t('membershipStream.plans.proCommissionRhythm')}</span>
              </div>
            </div>
            <div className="plan-annual">
              <div className="plan-annual-head">
                <span className="plan-annual-label">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.51 5.82 21l2.36-7.15L2 9.36h7.61z"/></svg>
                  {t('membershipStream.plans.proAnnualLabel')}
                </span>
                <span className="plan-annual-save">{t('membershipStream.plans.proAnnualSave')}</span>
              </div>
              <div className="plan-annual-row">
                <div className="plan-annual-side">
                  <div className="plan-annual-side-label">{t('membershipStream.plans.proAnnualMemberLabel')}</div>
                  <div className="plan-annual-side-val">{t('membershipStream.plans.proAnnualMember')}</div>
                </div>
                <div className="plan-annual-side">
                  <div className="plan-annual-side-label">{t('membershipStream.plans.proAnnualCommissionLabel')}</div>
                  <div className="plan-annual-side-val commission">{t('membershipStream.plans.proAnnualCommission')}</div>
                </div>
              </div>
            </div>
            <div className="plan-features">
              <PlanFeature>{t('membershipStream.plans.proFeat1')}</PlanFeature>
              <PlanFeature>{t('membershipStream.plans.proFeat2')}</PlanFeature>
              <PlanFeature>{t('membershipStream.plans.proFeat3')}</PlanFeature>
              <PlanFeature>{t('membershipStream.plans.proFeat4')}</PlanFeature>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ § 02 — CALCULATOR ══════════════ */}
      <section className="calc-section" id="sec-calc">
        <div className="calc-wrap">
          <div className="calc-tag">{t('membershipStream.calc.tag')}</div>
          <h2 className="calc-h">
            {t('membershipStream.calc.title')}
            <span className="accent">{t('membershipStream.calc.titleAccent')}</span>
          </h2>
          <p className="calc-sub">{t('membershipStream.calc.sub')}</p>

          <div className="calc-stage">
            <div className="calc-controls">
              <div className="calc-row">
                <label style={{marginBottom: '4px'}}>
                  {t('membershipStream.calc.planLabel')}{' '}
                  <span className="v" key={'plan' + pulseKey}>
                    {plan === 'pro' ? t('membershipStream.calc.planPro') : t('membershipStream.calc.planBasic')}
                  </span>
                </label>
                <div className="calc-plan-buttons">
                  <button
                    type="button"
                    className={'plan-btn' + (plan === 'basic' ? ' active' : '')}
                    onClick={function() { selectPlan('basic'); }}
                  >
                    <div className="p-name">{t('membershipStream.calc.planBasic')}</div>
                    <div className="p-price">{t('membershipStream.calc.planBasicPrice')}</div>
                  </button>
                  <button
                    type="button"
                    className={'plan-btn' + (plan === 'pro' ? ' active' : '')}
                    onClick={function() { selectPlan('pro'); }}
                  >
                    <div className="p-name">{t('membershipStream.calc.planPro')}</div>
                    <div className="p-price">{t('membershipStream.calc.planProPrice')}</div>
                  </button>
                </div>
              </div>
              <div className="calc-row">
                <label>
                  {t('membershipStream.calc.refsLabel')}{' '}
                  <span className="v" key={'refs' + pulseKey}>{refs}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={refs}
                  onChange={onRefsChange}
                  className="calc-slider"
                />
                <div className="calc-slider-marks">
                  <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>
              <div className="calc-per-ref">
                <div className="calc-per-ref-label">{t('membershipStream.calc.perRefLabel')}</div>
                <div className="calc-per-ref-val">
                  <span>{fmt(commissionPerRefMonthly)}</span>{' '}
                  <span className="calc-per-ref-rhythm">{t('membershipStream.calc.perRefRhythm')}</span>
                </div>
              </div>
            </div>

            <div className="calc-hero-result">
              <div className="calc-hero-label">{t('membershipStream.calc.heroLabel')}</div>
              <div className="calc-hero-num-wrap">
                <span className="calc-hero-num" key={'monthly' + pulseKey}>{fmt(monthlyResidual)}</span>
              </div>
              <div className="calc-hero-sub">{t('membershipStream.calc.heroSub')}</div>
              <div className="calc-hero-divider"></div>
              <div className="calc-hero-stats">
                <div className="calc-hero-stat">
                  <div className="calc-hero-stat-label">{t('membershipStream.calc.annualProjLabel')}</div>
                  <div className="calc-hero-stat-num" key={'annual' + pulseKey}>{fmt(twelveMonthTotal)}</div>
                  <div className="calc-hero-stat-sub">{t('membershipStream.calc.annualProjSub')}</div>
                </div>
                <div className="calc-hero-stat is-annual">
                  <div className="calc-hero-stat-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.51 5.82 21l2.36-7.15L2 9.36h7.61z"/></svg>
                    {t('membershipStream.calc.annualUpfrontBadge')}
                  </div>
                  <div className="calc-hero-stat-label">{t('membershipStream.calc.annualUpfrontLabel')}</div>
                  <div className="calc-hero-stat-num" key={'upfront' + pulseKey}>{fmt(annualUpfront)}</div>
                  <div className="calc-hero-stat-sub">{t('membershipStream.calc.annualUpfrontSub')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ § 03 — HONEST MOMENT ══════════════ */}
      <section className="honest" id="sec-honest">
        <div className="honest-card">
          <div className="honest-quote-mark">"</div>
          <div className="honest-content">
            <h2 className="honest-h">
              {t('membershipStream.honest.title')}
              <span className="accent">{t('membershipStream.honest.titleAccent')}</span>
            </h2>
            <p>
              {t('membershipStream.honest.p1Pre')}
              <strong>{t('membershipStream.honest.p1Mid1')}</strong>
              {t('membershipStream.honest.p1Mid2')}
              <strong>{t('membershipStream.honest.p1Mid3')}</strong>
              {t('membershipStream.honest.p1Post')}
            </p>
            <div className="honest-key">
              <div className="honest-key-label">{t('membershipStream.honest.keyLabel')}</div>
              <div className="honest-key-text">{t('membershipStream.honest.keyText')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ § 04 — CTA ══════════════ */}
      <section className="cta">
        <div className="cta-h">
          {t('membershipStream.cta.title')}
          <span className="emph">{t('membershipStream.cta.titleEmph')}</span>
        </div>
        <Link to="/register" className="cta-btn">
          {t('membershipStream.cta.button')}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </section>
    </div>
  );
}

// ═════════ Small helper ═════════
function PlanFeature(props) {
  return (
    <div className="plan-feature">
      <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span>{props.children}</span>
    </div>
  );
}

// ═════════ Inline styles (copied verbatim from mockup v9) ═════════
var membershipStyles = `
:root{
  --cobalt-deepest:#020617;
  --cobalt-deep:#050a1f;
  --cobalt:#0b1230;
  --cobalt-mid:#1a2558;
  --sky:#0ea5e9;
  --sky-bright:#38bdf8;
  --sky-pale:#7dd3fc;
  --indigo:#4f46e5;
  --indigo-soft:#818cf8;
  --indigo-deep:#3730a3;
  --purple:#9333ea;
  --purple-soft:#c084fc;

  /* Emerald palette — THIS stream's identity */
  --rose:#10b981;
  --rose-bright:#34d399;
  --rose-pale:#6ee7b7;
  --rose-deep:#059669;
  --rose-glow:rgba(16,185,129,.5);
  --coral:#14b8a6;
  --coral-bright:#5eead4;

  --green:#10b981;
  --green-bright:#34d399;
  --green-pale:#6ee7b7;
  --amber:#fbbf24;
  --amber-bright:#fcd34d;
  --amber-deep:#f59e0b;

  --ink:#fafbff;
  --ink-80:rgba(250,251,255,.8);
  --ink-70:rgba(250,251,255,.7);
  --ink-60:rgba(250,251,255,.6);
  --ink-50:rgba(250,251,255,.5);
  --ink-40:rgba(250,251,255,.4);
  --ink-30:rgba(250,251,255,.3);
  --ink-20:rgba(250,251,255,.2);
  --ink-10:rgba(250,251,255,.1);
  --ink-05:rgba(250,251,255,.05);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#0b1230;color:var(--ink);font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.5;overflow-x:hidden}

/* ════════════════════════════════════════
   AMBIENT BACKGROUND — matches public pages, rose-tinted
   ════════════════════════════════════════ */
.ambient-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:
  radial-gradient(ellipse at 50% 0%,#1e1b4b 0%,#0b1230 40%,#0b1230 100%)}
.ambient-stars{position:absolute;inset:0;background-image:
  radial-gradient(1px 1px at 20% 30%,rgba(255,255,255,.5),transparent),
  radial-gradient(1px 1px at 60% 70%,rgba(255,255,255,.4),transparent),
  radial-gradient(2px 2px at 40% 80%,rgba(255,255,255,.3),transparent),
  radial-gradient(1px 1px at 30% 50%,rgba(16,185,129,.45),transparent),
  radial-gradient(1px 1px at 85% 15%,rgba(168,85,247,.3),transparent),
  radial-gradient(1px 1px at 70% 40%,rgba(251,191,36,.28),transparent);
  background-size:800px 800px,600px 600px,900px 900px,750px 750px,650px 650px,820px 820px;
  animation:starsDrift 260s linear infinite;opacity:.7}
@keyframes starsDrift{from{background-position:0 0,0 0,0 0,0 0,0 0,0 0}to{background-position:-1600px -1600px,-1200px -1200px,-1800px -1800px,-1500px -1500px,-1300px -1300px,-1640px -1640px}}

/* Rose-tinted ambient wash */
.ambient-wash{position:absolute;inset:0;background:
  radial-gradient(ellipse 1200px 800px at 50% 20%,rgba(16,185,129,.22) 0%,transparent 55%),
  radial-gradient(ellipse 900px 700px at 15% 60%,rgba(20,184,166,.14) 0%,transparent 50%),
  radial-gradient(ellipse 900px 700px at 85% 75%,rgba(147,51,234,.12) 0%,transparent 50%),
  radial-gradient(ellipse 1400px 500px at 50% 100%,rgba(16,185,129,.1) 0%,transparent 60%)}

/* ════════════════════════════════════════
   MOCKUP BANNER
   ════════════════════════════════════════ */
.mock-banner{position:fixed;top:0;left:0;right:0;background:rgba(16,185,129,.95);color:#022c1e;text-align:center;padding:8px 16px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.12em;z-index:9999;backdrop-filter:blur(12px);font-weight:700}

/* ════════════════════════════════════════
   TOP NAV
   ════════════════════════════════════════ */
.stream-nav{position:absolute;top:0;left:0;right:0;z-index:100;padding:24px 0;pointer-events:none}
.stream-nav-inner{max-width:1320px;margin:0 auto;padding:0 48px;pointer-events:none}
.stream-back{pointer-events:auto;display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:12px;background:rgba(11,18,48,.5);backdrop-filter:blur(16px);border:1px solid var(--ink-10);color:var(--ink-60);text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;transition:all .3s cubic-bezier(.2,.9,.3,1);opacity:0;animation:backFade .8s ease-out .3s forwards}
.stream-back:hover{color:var(--ink);border-color:rgba(16,185,129,.4);background:rgba(11,18,48,.7);transform:translateX(-2px)}
.stream-back svg{width:14px;height:14px;transition:transform .3s}
.stream-back:hover svg{transform:translateX(-2px)}
@keyframes backFade{to{opacity:1}}

/* ════════════════════════════════════════
   COMMON
   ════════════════════════════════════════ */
.section{position:relative;z-index:2;padding:75px 48px;max-width:1320px;margin:0 auto}
.section-tag{display:inline-flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--rose-bright);letter-spacing:.22em;text-transform:uppercase;margin-bottom:22px}
.section-tag::before{content:'';width:40px;height:1px;background:var(--rose-bright);opacity:.6}
.section-h{font-family:'Sora',sans-serif;font-size:clamp(36px,4.6vw,64px);font-weight:900;line-height:.98;letter-spacing:-.04em;margin-bottom:20px}
.section-h .accent{display:block;font-weight:300;letter-spacing:-.025em;color:var(--ink);opacity:.7;line-height:1.1;font-size:.62em;margin-top:6px}
.section-sub{font-size:18px;line-height:1.6;color:var(--ink-60);max-width:680px}

.reveal{opacity:0;transform:translateY(40px);transition:opacity 1.1s cubic-bezier(.2,.9,.3,1),transform 1.1s cubic-bezier(.2,.9,.3,1)}
.reveal.visible{opacity:1;transform:translateY(0)}

/* ════════════════════════════════════════
   HERO — "The monthly stream."
   ════════════════════════════════════════ */
.hero{position:relative;min-height:auto;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:70px 48px 70px;z-index:2;overflow:hidden}

.hero-mark{width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,var(--rose),var(--rose-deep) 60%,var(--purple));display:flex;align-items:center;justify-content:center;margin-bottom:28px;position:relative;animation:heroMarkRise 1.6s cubic-bezier(.2,.9,.3,1) both;box-shadow:0 0 80px rgba(16,185,129,.65),0 0 160px rgba(5,150,105,.35)}
.hero-mark::before{content:'';position:absolute;inset:-4px;border-radius:28px;background:linear-gradient(135deg,var(--rose),var(--rose-bright),var(--coral));z-index:-1;opacity:.5;filter:blur(14px);animation:markPulse 4s ease-in-out infinite}
.hero-mark::after{content:'';position:absolute;inset:-18px;border-radius:44px;border:1px solid rgba(16,185,129,.25);animation:markRing 6s ease-in-out infinite}
.hero-mark svg{width:40px;height:40px;color:#fff}
@keyframes heroMarkRise{from{transform:translateY(24px) scale(.88);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes markPulse{0%,100%{opacity:.4}50%{opacity:.7}}
@keyframes markRing{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.15);opacity:.6}}

.hero-tag{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--rose-bright);letter-spacing:.24em;text-transform:uppercase;margin-bottom:22px;opacity:0;animation:heroFade .9s ease-out .6s forwards;display:inline-flex;align-items:center;gap:14px}
.hero-tag::before,.hero-tag::after{content:'';width:36px;height:1px;background:var(--rose-bright);opacity:.6}

.hero-h{font-family:'Sora',sans-serif;font-size:clamp(42px,6vw,88px);font-weight:900;line-height:.92;letter-spacing:-.05em;margin-bottom:16px;max-width:1200px}
.hero-h .word{display:inline-block;opacity:0;transform:translateY(20px)}
.hero-h .word.w1{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) .85s forwards}
.hero-h .word.w2{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) 1.0s forwards}
.hero-h .word.w3{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) 1.15s forwards}
.hero-h .line2{display:block;font-weight:300;letter-spacing:-.03em;color:var(--rose-pale);opacity:.85;margin-top:8px;font-size:.62em}
.hero-h .line2 .word.w4{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.55s forwards}
.hero-h .line2 .word.w5{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.7s forwards}
.hero-h .line2 .word.w6{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.85s forwards}
@keyframes wordRise{from{opacity:0;transform:translateY(24px)}to{opacity:.85;transform:translateY(0)}}
@keyframes wordRiseBright{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

/* Giant earnings promise — rose-gold */
.hero-promise{margin:32px 0 20px;opacity:0;animation:heroFade 1s ease-out 2.0s forwards;position:relative}
.hero-promise-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-40);font-weight:700;margin-bottom:8px}
.hero-promise-val{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(56px,7.5vw,104px);letter-spacing:-.055em;line-height:.9;background:linear-gradient(180deg,#d1fae5 0%,var(--rose-bright) 40%,var(--rose) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 60px rgba(16,185,129,.5));display:inline-block}
.hero-promise-sub{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-50);font-weight:600;margin-top:8px}

.hero-sub{font-size:19px;line-height:1.55;color:var(--ink-60);max-width:640px;margin:20px auto 48px;opacity:0;animation:heroFade 1s ease-out 2.3s forwards}

.hero-stats{display:flex;gap:56px;margin-bottom:56px;opacity:0;animation:heroFade 1s ease-out 2.6s forwards}
.hero-stat{text-align:left}
.hero-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:38px;letter-spacing:-.03em;color:var(--rose-bright);line-height:1;text-shadow:0 0 32px rgba(16,185,129,.35);display:block;margin-bottom:6px}
.hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-40);font-weight:600}

.hero-scroll{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-40);letter-spacing:.22em;text-transform:uppercase;opacity:0;animation:heroFade 1s ease-out 3.0s forwards,scrollNudge 2.6s ease-in-out 3.8s infinite}
.hero-scroll::before{content:'';display:inline-block;width:1px;height:32px;background:linear-gradient(180deg,transparent,var(--ink-40));margin-right:10px;vertical-align:middle}
@keyframes heroFade{to{opacity:1}}
@keyframes scrollNudge{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(8px);opacity:.95}}

/* ════════════════════════════════════════
   SECTION 01 — THE TWO MEMBERSHIPS · Side-by-side cards
   Basic / Pro · monthly + annual · commission shown clearly
   ════════════════════════════════════════ */
.plans-wrap{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:60px;align-items:stretch}
.plan-card{position:relative;padding:0;border-radius:24px;background:linear-gradient(180deg,rgba(23,37,84,.72),rgba(11,18,48,.52));border:1px solid var(--ink-10);overflow:hidden;backdrop-filter:blur(14px);display:flex;flex-direction:column;transition:transform .5s,border-color .4s,box-shadow .5s}
.plan-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--plan-accent);z-index:2}
.plan-card:hover{transform:translateY(-6px);border-color:var(--plan-accent)}

/* Basic tier — subtler */
.plan-card.basic{--plan-accent:var(--ink-30);--plan-accent-rgb:255,255,255}
.plan-card.basic .plan-price-val{color:var(--ink)}
.plan-card.basic .plan-commission-num{color:var(--rose-pale)}

/* Pro tier — emerald, emphasised */
.plan-card.pro{--plan-accent:var(--rose-bright);--plan-accent-rgb:52,211,153;border-color:rgba(52,211,153,.35);box-shadow:0 20px 60px rgba(16,185,129,.18),0 0 80px rgba(16,185,129,.08)}
.plan-card.pro:hover{box-shadow:0 30px 80px rgba(16,185,129,.28),0 0 100px rgba(16,185,129,.12)}
.plan-card.pro .plan-price-val{background:linear-gradient(180deg,#fff 0%,var(--rose-bright) 70%,var(--rose) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 30px rgba(16,185,129,.4))}
.plan-card.pro .plan-commission-num{color:var(--rose-bright);text-shadow:0 0 20px rgba(16,185,129,.3)}

/* "Recommended" badge on Pro */
.plan-badge{position:absolute;top:20px;right:20px;padding:5px 11px;border-radius:6px;background:linear-gradient(135deg,var(--rose-bright),var(--rose));color:#022c1e;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;box-shadow:0 4px 16px rgba(16,185,129,.4);z-index:3}

/* Card head — plan name + price */
.plan-head{padding:36px 36px 28px;border-bottom:1px solid var(--ink-10);position:relative}
.plan-name{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(var(--plan-accent-rgb),.85);font-weight:700;margin-bottom:14px;display:inline-flex;align-items:center;gap:10px}
.plan-name::before{content:'';width:24px;height:1px;background:currentColor;opacity:.6}
.plan-title{font-family:'Sora',sans-serif;font-weight:900;font-size:38px;letter-spacing:-.02em;margin-bottom:18px;line-height:1}
.plan-price{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}
.plan-price-val{font-family:'Sora',sans-serif;font-weight:900;font-size:52px;letter-spacing:-.035em;line-height:1}
.plan-price-per{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ink-50);letter-spacing:.1em;font-weight:600}
.plan-subtitle{font-size:14px;color:var(--ink-60);line-height:1.5;margin-top:12px}

/* Commission block — the money moment */
.plan-commission{padding:26px 36px;background:linear-gradient(180deg,rgba(var(--plan-accent-rgb),.07),transparent);border-bottom:1px solid var(--ink-10);position:relative}
.plan-commission-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-50);font-weight:700;margin-bottom:10px}
.plan-commission-row{display:flex;align-items:baseline;gap:10px}
.plan-commission-num{font-family:'Sora',sans-serif;font-weight:900;font-size:40px;letter-spacing:-.025em;line-height:1;transition:color .3s}
.plan-commission-rhythm{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-60);letter-spacing:.08em;font-weight:600}

/* Annual sub-section inside each card */
.plan-annual{padding:22px 36px;background:linear-gradient(180deg,rgba(251,191,36,.05),transparent);border-bottom:1px solid var(--ink-10)}
.plan-annual-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.plan-annual-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(251,191,36,.95);font-weight:700;display:inline-flex;align-items:center;gap:8px}
.plan-annual-label svg{width:12px;height:12px}
.plan-annual-save{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--green-bright);letter-spacing:.08em;font-weight:700;padding:3px 8px;border-radius:5px;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.25)}
.plan-annual-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.plan-annual-side{flex:1}
.plan-annual-side-label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-40);font-weight:600;margin-bottom:4px}
.plan-annual-side-val{font-family:'Sora',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--ink);line-height:1}
.plan-annual-side-val.commission{color:rgba(251,191,36,.95);text-shadow:0 0 16px rgba(251,191,36,.25)}

/* Features list */
.plan-features{padding:24px 36px 32px;flex:1;display:flex;flex-direction:column;gap:10px}
.plan-feature{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--ink-70);line-height:1.5}
.plan-feature svg{width:14px;height:14px;flex-shrink:0;margin-top:3px;color:var(--plan-accent)}
.plan-card.basic .plan-feature svg{opacity:.5}

/* ════════════════════════════════════════
   SECTION 02 — CALCULATOR · Monthly + Annual side-by-side
   ════════════════════════════════════════ */
.calc-section{padding:85px 48px;max-width:1320px;margin:0 auto;position:relative;z-index:2}
.calc-wrap{position:relative;padding:40px 0;overflow:visible}
.calc-wrap::before{content:'';position:absolute;top:0;right:8%;width:min(700px,50vw);height:600px;background:
  radial-gradient(ellipse at center,rgba(16,185,129,.18),transparent 65%);
  filter:blur(70px);pointer-events:none;z-index:0;animation:calcAmbientA 16s ease-in-out infinite}
.calc-wrap::after{content:'';position:absolute;bottom:0;left:8%;width:min(600px,45vw);height:500px;background:
  radial-gradient(ellipse at center,rgba(20,184,166,.14),transparent 65%);
  filter:blur(70px);pointer-events:none;z-index:0;animation:calcAmbientB 18s ease-in-out infinite}
@keyframes calcAmbientA{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,20px)}}
@keyframes calcAmbientB{0%,100%{transform:translate(0,0)}50%{transform:translate(25px,-15px)}}

.calc-tag{display:flex;align-items:center;justify-content:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--rose-bright);letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:18px;position:relative;z-index:2}
.calc-tag::before,.calc-tag::after{content:'';width:40px;height:1px;background:var(--rose-bright);opacity:.5}
.calc-h{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(36px,4.2vw,56px);letter-spacing:-.035em;line-height:1.02;margin-bottom:18px;text-align:center;position:relative;z-index:2}
.calc-h .accent{display:block;font-weight:300;color:var(--ink);opacity:.7;font-size:.62em;letter-spacing:-.025em;margin-top:6px}
.calc-sub{text-align:center;font-size:16px;color:var(--ink-60);max-width:600px;margin:0 auto 60px;position:relative;z-index:2;line-height:1.6}

.calc-stage{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;position:relative;z-index:2;padding-top:20px}
.calc-controls{display:flex;flex-direction:column;gap:42px}

/* Plan toggle — Basic / Pro / Both */
.calc-plan-buttons{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px;padding:10px;border-radius:14px;background:linear-gradient(180deg,rgba(16,185,129,.04),rgba(11,18,48,.4));border:1px solid var(--ink-10)}
.plan-btn{padding:14px 10px;border-radius:10px;background:transparent;border:1px solid transparent;color:var(--ink-50);cursor:pointer;transition:all .25s;display:flex;flex-direction:column;gap:6px;align-items:center;font-family:inherit}
.plan-btn:hover{background:rgba(255,255,255,.03);color:var(--ink-70)}
.plan-btn.active{background:linear-gradient(135deg,rgba(16,185,129,.22),rgba(16,185,129,.08));border-color:rgba(16,185,129,.55);color:#fff;box-shadow:0 0 24px rgba(16,185,129,.3)}
.plan-btn .p-name{font-family:'Sora',sans-serif;font-weight:800;font-size:15px;letter-spacing:-.01em}
.plan-btn .p-price{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-50);letter-spacing:.04em}
.plan-btn.active .p-price{color:var(--rose-bright)}

.calc-row label{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-40)}
.calc-row label .v{font-family:'Sora',sans-serif;font-weight:800;font-size:28px;color:var(--rose-bright);letter-spacing:-.02em;text-transform:none;transition:transform .2s;display:inline-block;text-shadow:0 0 16px rgba(16,185,129,.3)}
.calc-row label .v.bump{animation:vBump .35s cubic-bezier(.2,.9,.3,1)}
@keyframes vBump{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}

.calc-slider{width:100%;height:10px;border-radius:5px;background:linear-gradient(90deg,rgba(16,185,129,.25),rgba(255,255,255,.05));outline:none;-webkit-appearance:none;cursor:pointer;position:relative;border:1px solid var(--ink-10)}
.calc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,var(--rose-bright) 50%,var(--rose) 100%);cursor:pointer;box-shadow:0 0 28px rgba(16,185,129,.7),0 4px 12px rgba(0,0,0,.4);transition:transform .18s;border:2px solid rgba(255,255,255,.3)}
.calc-slider::-webkit-slider-thumb:hover{transform:scale(1.18);box-shadow:0 0 40px rgba(16,185,129,.9)}
.calc-slider::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,var(--rose-bright) 50%,var(--rose) 100%);cursor:pointer;box-shadow:0 0 28px rgba(16,185,129,.7),0 4px 12px rgba(0,0,0,.4);border:2px solid rgba(255,255,255,.3)}
.calc-slider-marks{display:flex;justify-content:space-between;margin-top:12px;padding:0 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-50);font-weight:600;letter-spacing:.06em}

/* Small "per referral" pinned display under the slider — static reference */
.calc-per-ref{padding:18px 20px;border-radius:12px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(11,18,48,.3));border:1px solid rgba(16,185,129,.18);display:flex;flex-direction:column;gap:6px}
.calc-per-ref-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--rose-bright);font-weight:700;opacity:.85}
.calc-per-ref-val{font-family:'Sora',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--ink);line-height:1}
.calc-per-ref-val .calc-per-ref-rhythm{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-50);letter-spacing:.06em;font-weight:600;margin-left:4px}

/* RIGHT: Hero result — Monthly (big) + Annual (supporting, side-by-side) */
.calc-hero-result{display:flex;flex-direction:column;align-items:flex-start;gap:0;position:relative}
.calc-hero-result::before{content:'';position:absolute;top:-15%;left:-15%;right:-15%;bottom:-15%;background:radial-gradient(ellipse at center,rgba(16,185,129,.18),transparent 65%);filter:blur(50px);pointer-events:none;z-index:-1}

.calc-hero-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--rose-bright);font-weight:700;margin-bottom:18px;display:flex;align-items:center;gap:14px}
.calc-hero-label::before{content:'';width:32px;height:1px;background:var(--rose-bright);opacity:.7}

.calc-hero-num-wrap{position:relative;line-height:.85;margin-bottom:18px}
.calc-hero-num{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(52px,6.5vw,88px);letter-spacing:-.045em;line-height:.95;background:linear-gradient(180deg,#fff 0%,var(--rose-bright) 50%,var(--rose) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 40px rgba(16,185,129,.45));display:inline-block;transition:transform .3s cubic-bezier(.2,.9,.3,1)}
.calc-hero-num.pulse{animation:heroResultPulse .6s cubic-bezier(.2,.9,.3,1)}
@keyframes heroResultPulse{0%{transform:scale(1)}40%{transform:scale(1.04)}100%{transform:scale(1)}}

.calc-hero-sub{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--ink-50);font-weight:600;margin-bottom:36px;line-height:1.5}
.calc-hero-divider{width:80px;height:1px;background:linear-gradient(90deg,var(--rose-bright),transparent);margin-bottom:32px}

.calc-hero-stats{display:flex;align-items:stretch;gap:32px;width:100%}
.calc-hero-stat{flex:1;min-width:0;position:relative}
.calc-hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-40);margin-bottom:10px;font-weight:600}
.calc-hero-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:32px;letter-spacing:-.025em;color:var(--ink);line-height:1;margin-bottom:8px;transition:transform .3s}
.calc-hero-stat-num.pulse{animation:heroResultPulse .6s cubic-bezier(.2,.9,.3,1)}
.calc-hero-stat-sub{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-40);letter-spacing:.04em;line-height:1.4}
.calc-hero-stat-divider{width:1px;background:linear-gradient(180deg,transparent,var(--ink-10) 30%,var(--ink-10) 70%,transparent);flex-shrink:0}

/* Annual upfront card — special treatment (coral-gold, like the bonus on Grid) */
.calc-hero-stat.is-annual{padding:18px 22px 16px;border-radius:14px;background:linear-gradient(135deg,rgba(251,191,36,.1),rgba(20,184,166,.04));border:1px solid rgba(251,191,36,.32);position:relative;overflow:hidden}
.calc-hero-stat.is-annual::before{content:'';position:absolute;inset:-30%;background:radial-gradient(ellipse at center,rgba(251,191,36,.2),transparent 65%);filter:blur(20px);pointer-events:none;animation:annualGlow 3.5s ease-in-out infinite;z-index:0}
@keyframes annualGlow{0%,100%{opacity:.6}50%{opacity:1}}
.calc-hero-stat.is-annual > *{position:relative;z-index:1}
.calc-hero-stat-badge{display:inline-flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#3a1c0a;background:linear-gradient(135deg,var(--coral-bright),var(--coral));padding:3px 8px;border-radius:6px;margin-bottom:10px;box-shadow:0 2px 12px rgba(20,184,166,.4)}
.calc-hero-stat-badge svg{width:10px;height:10px}

/* ════════════════════════════════════════
   SECTION 03 — HONEST MOMENT · green (same as Grid)
   ════════════════════════════════════════ */
.honest{padding:70px 48px 50px;max-width:1000px;margin:0 auto;position:relative;z-index:2}
.honest-card{position:relative;padding:72px 56px 64px;border-radius:28px;background:linear-gradient(180deg,rgba(23,37,84,.72),rgba(11,18,48,.52));border:1px solid var(--ink-10);overflow:hidden;backdrop-filter:blur(14px)}
.honest-card::before{content:'';position:absolute;top:-30%;left:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(16,185,129,.12),transparent 65%);filter:blur(60px);pointer-events:none}
.honest-card::after{content:'';position:absolute;bottom:-30%;right:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(16,185,129,.1),transparent 65%);filter:blur(60px);pointer-events:none}

.honest-quote-mark{position:absolute;top:24px;left:48px;font-family:'Sora',sans-serif;font-weight:900;font-size:160px;line-height:1;color:var(--green-bright);opacity:.1;pointer-events:none;letter-spacing:-.05em}

.honest-content{position:relative;z-index:2;max-width:780px;margin:0 auto;text-align:center}
.honest-tag{display:inline-flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--green-pale);letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:26px}
.honest-tag::before,.honest-tag::after{content:'';width:32px;height:1px;background:var(--green-pale);opacity:.5}
.honest-h{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(32px,4vw,48px);letter-spacing:-.03em;line-height:1.1;margin-bottom:36px}
.honest-h .accent{color:var(--green-pale);opacity:.85;font-weight:300;display:block;margin-top:6px;font-size:.62em}
.honest p{font-size:17px;line-height:1.75;color:var(--ink-70);margin-bottom:22px;max-width:680px;margin-left:auto;margin-right:auto}
.honest p:last-of-type{margin-bottom:0}
.honest p strong{color:var(--ink);font-weight:700}

.honest-key{margin:36px auto;padding:28px 36px;border-left:3px solid var(--green-bright);background:linear-gradient(90deg,rgba(16,185,129,.1),transparent 80%);border-radius:0 14px 14px 0;text-align:left;max-width:680px}
.honest-key-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--green-bright);letter-spacing:.18em;text-transform:uppercase;font-weight:700;margin-bottom:8px}
.honest-key-text{font-family:'Sora',sans-serif;font-weight:700;font-size:22px;letter-spacing:-.015em;line-height:1.3;color:#fff}

/* ════════════════════════════════════════
   SECTION 04 — CTA · Rose-gradient button
   ════════════════════════════════════════ */
.cta{padding:50px 48px 85px;max-width:1100px;margin:0 auto;text-align:center;position:relative;z-index:2}
.cta-h{font-family:'Sora',sans-serif;font-weight:300;font-size:clamp(34px,4.2vw,52px);letter-spacing:-.03em;line-height:1.2;margin-bottom:44px;color:var(--ink-70)}
.cta-h .emph{display:block;font-weight:800;color:var(--rose-bright);text-shadow:0 0 30px rgba(16,185,129,.5);margin-top:10px}
.cta-btn{display:inline-flex;align-items:center;gap:14px;padding:26px 52px;border-radius:18px;background:linear-gradient(135deg,var(--rose-bright),var(--rose));color:#fff;font-family:'Sora',sans-serif;font-size:18px;font-weight:800;text-decoration:none;letter-spacing:-.01em;transition:transform .3s cubic-bezier(.2,.9,.3,1),box-shadow .3s;box-shadow:0 18px 60px rgba(16,185,129,.5)}
.cta-btn:hover{transform:translateY(-4px) scale(1.03);box-shadow:0 28px 80px rgba(16,185,129,.65)}

/* Inline term definitions */
.term{position:relative;display:inline;cursor:help;color:var(--rose-pale);border-bottom:1px dotted rgba(110,231,183,.5);transition:color .2s}
.term:hover{color:var(--rose-bright);border-bottom-color:var(--rose-bright)}
.term-def{position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%) translateY(8px);width:280px;padding:14px 16px;border-radius:10px;background:linear-gradient(180deg,rgba(15,23,50,.98),rgba(15,23,50,.92));backdrop-filter:blur(16px);border:1px solid rgba(16,185,129,.4);box-shadow:0 16px 40px rgba(0,0,0,.6),0 0 24px rgba(16,185,129,.25);font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.5;color:var(--ink-80);text-align:left;font-weight:400;letter-spacing:0;text-transform:none;opacity:0;visibility:hidden;transition:all .25s cubic-bezier(.2,.9,.3,1);pointer-events:none;z-index:50}
.term-def::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:rgba(16,185,129,.4)}
.term:hover .term-def{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}
.term-def strong{color:var(--rose-bright);font-weight:700;display:block;margin-bottom:4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace}

/* ════════════════════════════════════════
   MOBILE FALLBACK
   ════════════════════════════════════════ */
@media (max-width: 900px) {
  .section,.stream-section,.calc-section{padding:60px 20px}
  .hero{padding:90px 20px 60px;min-height:auto}
  .honest{padding:60px 20px 40px}
  .cta{padding:40px 20px 80px}

  .stream-nav{position:absolute;padding:16px 0}
  .stream-nav-inner{padding:0 16px}
  .stream-back{padding:8px 12px;font-size:10px;letter-spacing:.12em}
  .stream-back svg{width:12px;height:12px}

  .hero-mark{width:72px;height:72px;margin-bottom:24px}
  .hero-mark svg{width:30px;height:30px}
  .hero-tag::before,.hero-tag::after{width:20px}
  .hero-h{font-size:clamp(38px,10vw,56px);margin-bottom:10px}
  .hero-promise{margin:20px 0 14px}
  .hero-promise-val{font-size:clamp(48px,14vw,72px)}
  .hero-sub{font-size:15px;margin:14px auto 32px}
  .hero-stats{gap:28px;margin-bottom:36px;flex-wrap:wrap;justify-content:center}
  .hero-stat{text-align:center}
  .hero-stat-num{font-size:26px}

  .plans-wrap{grid-template-columns:1fr;gap:16px}
  .plan-head{padding:28px 24px 22px}
  .plan-title{font-size:30px;margin-bottom:14px}
  .plan-price-val{font-size:44px}
  .plan-commission{padding:22px 24px}
  .plan-commission-num{font-size:34px}
  .plan-annual{padding:18px 24px}
  .plan-annual-side-val{font-size:19px}
  .plan-features{padding:20px 24px 26px}
  .plan-feature{font-size:13px}
  .plan-badge{top:14px;right:14px;padding:4px 9px;font-size:9px}

  .calc-stage{grid-template-columns:1fr;gap:50px;align-items:start;padding-top:0}
  .calc-h{font-size:clamp(32px,6vw,44px)}
  .calc-sub{font-size:14px;margin-bottom:40px}
  .calc-plan-buttons{grid-template-columns:1fr 1fr 1fr}
  .plan-btn{padding:10px 4px}
  .plan-btn .p-name{font-size:13px}
  .calc-row label{font-size:10px}
  .calc-row label .v{font-size:20px}
  .calc-hero-num{font-size:clamp(54px,15vw,84px)}
  .calc-hero-stats{flex-direction:column;gap:24px}
  .calc-hero-stat-divider{width:100%;height:1px;background:linear-gradient(90deg,transparent,var(--ink-10) 30%,var(--ink-10) 70%,transparent)}
  .calc-hero-stat-num{font-size:28px}

  .honest-card{padding:44px 28px 36px}
  .honest-quote-mark{font-size:100px;top:14px;left:24px}
  .honest-h{font-size:clamp(28px,6vw,38px);margin-bottom:24px}
  .honest p{font-size:15px}
  .honest-key{padding:20px 24px;margin:28px auto}
  .honest-key-text{font-size:17px}

  .cta-h{font-size:clamp(26px,5vw,36px);margin-bottom:30px}
  .cta-btn{padding:20px 32px;font-size:15px;width:100%;max-width:360px;justify-content:center}
}

@media (max-width: 540px) {
  .hero-stats{gap:18px}
}
`;
