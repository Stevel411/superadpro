import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';

// 8x8 mini-grid geometry — which cells are "filled" (lit), which are the center 2x2
var FILLED = [
  [0,2],[0,3],[0,4],[0,5],
  [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],
  [2,1],[2,2],[2,5],[2,6],
  [3,2],[3,5],
  [4,2],[4,5],
  [5,1],[5,2],[5,5],[5,6],
  [6,1],[6,2],[6,3],[6,4],[6,5],[6,6],
  [7,2],[7,3],[7,4],[7,5]
];
var CENTER = [[3,3],[3,4],[4,3],[4,4]];

function inList(list, r, c) {
  for (var i = 0; i < list.length; i++) {
    if (list[i][0] === r && list[i][1] === c) return true;
  }
  return false;
}

function formatAmount(n) {
  // Integer display with thousands separator and a leading "+$"
  var v = Math.max(0, Math.floor(Number(n) || 0));
  return '+$' + v.toLocaleString('en-US');
}

export default function AffiliatePlan() {
  var tr = useTranslation();
  var t = tr.t;
  var i18n = tr.i18n;

  var _langOpen = useState(false);
  var langOpen = _langOpen[0];
  var setLangOpen = _langOpen[1];
  var langRef = useRef(null);

  useEffect(function() {
    function onClick(e) { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); }
    document.addEventListener('mousedown', onClick);
    return function() { document.removeEventListener('mousedown', onClick); };
  }, []);

  var currentLang = LANGUAGES.find(function(l) { return l.code === i18n.language; }) || LANGUAGES[0];

  // ── Live toast: real payouts from /api/public/recent-payouts ──────
  var _payouts = useState([]);
  var payouts = _payouts[0];
  var setPayouts = _payouts[1];

  var _toastIdx = useState(0);
  var toastIdx = _toastIdx[0];
  var setToastIdx = _toastIdx[1];

  var _toastFading = useState(false);
  var toastFading = _toastFading[0];
  var setToastFading = _toastFading[1];

  // Fetch on mount, refresh every 60 s
  useEffect(function() {
    var mounted = true;
    function load() {
      fetch('/api/public/recent-payouts')
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(data) {
          if (mounted && Array.isArray(data)) setPayouts(data);
        })
        .catch(function() { /* silent: toast just stays hidden */ });
    }
    load();
    var fetchTimer = setInterval(load, 60000);
    return function() { mounted = false; clearInterval(fetchTimer); };
  }, []);

  // Cycle through whatever payouts are cached, every 3.2 s with a 260 ms crossfade
  useEffect(function() {
    if (!payouts || payouts.length < 2) return;
    var cycleTimer = setInterval(function() {
      setToastFading(true);
      setTimeout(function() {
        setToastIdx(function(prev) { return (prev + 1) % payouts.length; });
        setToastFading(false);
      }, 260);
    }, 3200);
    return function() { clearInterval(cycleTimer); };
  }, [payouts]);

  var currentPayout = payouts.length > 0 ? payouts[toastIdx % payouts.length] : null;

  return (
    <>
      <style>{CSS_AFFILIATE_PLAN}</style>
      <div className="affiliate-plan-page">
        <div className="page-bg"></div>
        <div className="page-bg-overlay"></div>

        {/* Floating brand (top-left) */}
        <Link to="/" className="float-brand">
          <div className="float-brand-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon points="9,5 9,19 20,12" fill="#fff"/>
            </svg>
          </div>
          <span className="float-brand-text">SuperAd<em>Pro</em></span>
        </Link>

        {/* Floating nav (top-right) */}
        <div className="float-nav">
          <Link to="/" className="float-nav-link">{t('affiliatePlan.navHome')}</Link>
          <Link to="/how-it-works" className="float-nav-link">{t('affiliatePlan.navHow')}</Link>
          <Link to="/tools" className="float-nav-link">{t('affiliatePlan.navTools')}</Link>

          {/* Language pill */}
          <div ref={langRef} className="float-lang-wrap">
            <button type="button" className="float-lang-pill" onClick={function() { setLangOpen(!langOpen); }}>
              <span className="float-lang-flag">{currentLang.flag}</span>
              <span className="float-lang-code">{currentLang.code.toUpperCase()}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.6}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {langOpen && (
              <div className="float-lang-dropdown">
                {LANGUAGES.map(function(lang) {
                  var active = lang.code === i18n.language;
                  return (
                    <button key={lang.code} type="button" className={'float-lang-item' + (active ? ' active' : '')}
                      onClick={function() { changeLanguage(lang.code); setLangOpen(false); }}>
                      <span className="float-lang-item-flag">{lang.flag}</span>
                      <span className="float-lang-item-name">{lang.name}</span>
                      {active && <span className="float-lang-item-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/login" className="float-nav-link">{t('affiliatePlan.navSignin')}</Link>
          <Link to="/register" className="float-nav-cta">{t('affiliatePlan.navCta')}</Link>
        </div>

        <section className="page-section">

          {/* Income toast — only rendered when we have real payout data */}
          {currentPayout && (
            <div className={'income-toast' + (toastFading ? ' toast-fading' : '')}>
              <div className="toast-icon-wrap">
                <div className="toast-pulse"></div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="toast-body">
                <div className="toast-name">{currentPayout.name}</div>
              </div>
              <div className="toast-amount">{formatAmount(currentPayout.amount)}</div>
            </div>
          )}

          <div className="section-tag">{t('affiliatePlan.sectionTag')}</div>
          <h2 className="section-h2">
            {t('affiliatePlan.headlineLine1')}<br/>
            <span className="accent">{t('affiliatePlan.headlineLine2')}</span>
          </h2>

          {/* Subtitle — the $92,576 per-cycle figure */}
          <p className="section-lead" style={{maxWidth:'720px',marginTop:'8px'}}
             dangerouslySetInnerHTML={{ __html: t('affiliatePlan.subtitle') }}></p>

          <div className="streams-grid" style={{marginTop:'56px'}}>

            {/* STREAM 1 — Direct Referrals */}
            <div className="stream-card" data-color="sky">
              <div className="stream-top">
                <div className="stream-top-left">
                  <div className="stream-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <path d="M20 8v6M23 11h-6"/>
                    </svg>
                  </div>
                  <div className="stream-num-and-name">
                    <div className="stream-num">{t('affiliatePlan.stream1Num')}</div>
                    <div className="stream-name">{t('affiliatePlan.stream1Name')}</div>
                  </div>
                </div>
                <div className="stream-badge">{t('affiliatePlan.stream1Badge')}</div>
              </div>

              <div className="stream-headline">
                <div className="stream-headline-value">{t('affiliatePlan.stream1HeadVal')}<small> {t('affiliatePlan.stream1HeadValSmall')}</small></div>
                <div className="stream-headline-unit" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream1HeadUnit') }}></div>
              </div>

              <div className="stream-description" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream1Desc') }}></div>

              <div className="stream-viz-wrap">
                <div className="viz-referral">
                  <div className="viz-referral-line"></div>
                  <div className="viz-referral-path">
                    <div className="viz-person you">S</div>
                    <div className="viz-person them">?</div>
                  </div>
                  <div className="coin">$</div>
                  <div className="coin">$</div>
                  <div className="coin">$</div>
                  <div className="viz-earn-label">{t('affiliatePlan.viz1Label')}</div>
                </div>
              </div>
            </div>

            {/* STREAM 2 — 8x8 Campaign Grid */}
            <div className="stream-card" data-color="indigo">
              <div className="stream-top">
                <div className="stream-top-left">
                  <div className="stream-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </div>
                  <div className="stream-num-and-name">
                    <div className="stream-num">{t('affiliatePlan.stream2Num')}</div>
                    <div className="stream-name">{t('affiliatePlan.stream2Name')}</div>
                  </div>
                </div>
                <div className="stream-badge">{t('affiliatePlan.stream2Badge')}</div>
              </div>

              <div className="stream-headline">
                <div className="stream-headline-value">{t('affiliatePlan.stream2HeadVal')}<small> {t('affiliatePlan.stream2HeadValSmall')}</small></div>
                <div className="stream-headline-unit" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream2HeadUnit') }}></div>
              </div>

              <div className="stream-description" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream2Desc') }}></div>

              <div className="stream-viz-wrap">
                <div className="viz-grid-container">
                  <div className="viz-grid">
                    {Array.from({length: 8}).map(function(_, r) {
                      return Array.from({length: 8}).map(function(_, c) {
                        var isCenter = inList(CENTER, r, c);
                        var isFilled = inList(FILLED, r, c);
                        var cls = 'gc';
                        var style = {};
                        if (isCenter) {
                          cls += ' center';
                        } else if (isFilled) {
                          cls += ' on';
                          style.animationDelay = ((r * 8 + c) * 40 + 300) + 'ms';
                        }
                        return <div key={r + '-' + c} className={cls} style={style}></div>;
                      });
                    })}
                  </div>
                  <div className="viz-grid-stats">
                    <div className="viz-grid-label"><span>{t('affiliatePlan.viz2Progress')}</span><strong>41/64</strong></div>
                    <div className="viz-progress-bar"><div className="viz-progress-fill"></div></div>
                    <div className="viz-grid-timer" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.viz2Timer') }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* STREAM 3 — Profit Nexus */}
            <div className="stream-card" data-color="amber">
              <div className="stream-top">
                <div className="stream-top-left">
                  <div className="stream-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="2"/>
                      <circle cx="12" cy="12" r="6"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <div className="stream-num-and-name">
                    <div className="stream-num">{t('affiliatePlan.stream3Num')}</div>
                    <div className="stream-name">{t('affiliatePlan.stream3Name')}</div>
                  </div>
                </div>
                <div className="stream-badge">{t('affiliatePlan.stream3Badge')}</div>
              </div>

              <div className="stream-headline">
                <div className="stream-headline-value">{t('affiliatePlan.stream3HeadVal')}<small> {t('affiliatePlan.stream3HeadValSmall')}</small></div>
                <div className="stream-headline-unit" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream3HeadUnit') }}></div>
              </div>

              <div className="stream-description" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream3Desc') }}></div>

              <div className="stream-viz-wrap">
                <div className="viz-nexus-container">
                  <div className="viz-nexus">
                    <div className="nc"></div><div className="nc"></div><div className="nc"></div>
                    <div className="nc"></div><div className="nc"></div><div className="nc"></div>
                    <div className="nc"></div><div className="nc"></div><div className="nc"></div>
                  </div>
                  <div className="viz-nexus-breakdown">
                    <div className="viz-nexus-row"><span className="viz-nexus-row-label">{t('affiliatePlan.viz3L1')}</span><span className="viz-nexus-row-val">15%</span></div>
                    <div className="viz-nexus-row"><span className="viz-nexus-row-label">{t('affiliatePlan.viz3L2')}</span><span className="viz-nexus-row-val">10%</span></div>
                    <div className="viz-nexus-row"><span className="viz-nexus-row-label">{t('affiliatePlan.viz3L3')}</span><span className="viz-nexus-row-val">10%</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* STREAM 4 — Course Academy */}
            <div className="stream-card" data-color="green">
              <div className="stream-top">
                <div className="stream-top-left">
                  <div className="stream-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                  </div>
                  <div className="stream-num-and-name">
                    <div className="stream-num">{t('affiliatePlan.stream4Num')}</div>
                    <div className="stream-name">{t('affiliatePlan.stream4Name')}</div>
                  </div>
                </div>
                <div className="stream-badge">{t('affiliatePlan.stream4Badge')}</div>
              </div>

              <div className="stream-headline">
                <div className="stream-headline-value">{t('affiliatePlan.stream4HeadVal')}<small> {t('affiliatePlan.stream4HeadValSmall')}</small></div>
                <div className="stream-headline-unit" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream4HeadUnit') }}></div>
              </div>

              <div className="stream-description" dangerouslySetInnerHTML={{ __html: t('affiliatePlan.stream4Desc') }}></div>

              <div className="stream-viz-wrap">
                <div className="viz-courses-container">
                  <div className="viz-courses-lane top">{t('affiliatePlan.viz4LaneTop')}</div>
                  <div className="viz-courses-row">
                    <div className="sale-person yours">Y<span className="sale-num">#1</span></div>
                    <div className="sale-person passup">S<span className="sale-num">#2</span></div>
                    <div className="sale-person yours">Y<span className="sale-num">#3</span></div>
                    <div className="sale-person passup">S<span className="sale-num">#4</span></div>
                    <div className="sale-person yours">Y<span className="sale-num">#5</span></div>
                    <div className="sale-person passup">S<span className="sale-num">#6</span></div>
                    <div className="sale-person yours">Y<span className="sale-num">#7</span></div>
                    <div className="sale-person passup">S<span className="sale-num">#8</span></div>
                  </div>
                  <div className="viz-courses-lane bottom">{t('affiliatePlan.viz4LaneBottom')}</div>
                </div>
              </div>
            </div>

          </div>

          <div className="footer-banner">
            <div className="footer-banner-text">
              {t('affiliatePlan.footerLine1')}<br/>
              <span className="emph">{t('affiliatePlan.footerLine2')}</span>
            </div>
            <Link to="/register" className="footer-cta">
              {t('affiliatePlan.footerCta')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

        </section>
      </div>
    </>
  );
}

// Scoped CSS — every selector prefixed with .affiliate-plan-page, all @keyframes prefixed with "ap"
var CSS_AFFILIATE_PLAN = `.affiliate-plan-page {
--cobalt-deepest: #0b1230;
--cobalt-deep: #172554;
--sky: #0ea5e9;
--sky-bright: #38bdf8;
--sky-pale: #7dd3fc;
--indigo: #6366f1;
--indigo-soft: #818cf8;
--amber: #fbbf24;
--amber-bright: #fcd34d;
--amber-soft: #fde68a;
--green: #34d399;
--green-bright: #6ee7b7;
--pink: #ec4899;
--ink: #fafbff;
--ink-70: rgba(250, 251, 255, 0.7);
--ink-60: rgba(250, 251, 255, 0.6);
--ink-50: rgba(250, 251, 255, 0.5);
--ink-40: rgba(250, 251, 255, 0.4);
--ink-20: rgba(250, 251, 255, 0.2);
--ink-10: rgba(250, 251, 255, 0.1);
--ink-05: rgba(250, 251, 255, 0.05);
}
.affiliate-plan-page * { box-sizing: border-box; margin: 0; padding: 0; }
.affiliate-plan-page {
background: transparent;
color: var(--ink);
font-family: 'DM Sans', sans-serif;
overflow-x: hidden;
min-height: 100vh;
}
.affiliate-plan-page .page-bg {
position: fixed;
inset: 0;
z-index: -2;
background-image: url("/static/images/earn-hero-bg.jpg");
background-size: cover;
background-position: center top;
background-repeat: no-repeat;
background-attachment: fixed;
}
.affiliate-plan-page .page-bg-overlay {
position: fixed;
inset: 0;
z-index: -1;
background: linear-gradient(180deg,
rgba(11, 18, 48, 0.25) 0%,
rgba(11, 18, 48, 0.35) 60%,
rgba(11, 18, 48, 0.7) 100%);
pointer-events: none;
}
.affiliate-plan-page::before {
content: '';
position: fixed;
inset: 0;
pointer-events: none;
z-index: 500;
opacity: 0.04;
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
mix-blend-mode: overlay;
}
.affiliate-plan-page .float-nav {
position: fixed;
top: 28px;
right: 32px;
z-index: 100;
display: flex;
align-items: center;
gap: 10px;
}
.affiliate-plan-page .float-nav-link {
padding: 10px 18px;
border-radius: 100px;
background: rgba(11, 18, 48, 0.5);
border: 1px solid var(--ink-10);
backdrop-filter: blur(18px) saturate(180%);
font-family: 'Sora', sans-serif;
font-size: 13px;
font-weight: 600;
color: var(--ink);
text-decoration: none;
letter-spacing: -0.005em;
transition: all 0.25s;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.affiliate-plan-page .float-nav-link:hover {
background: rgba(11, 18, 48, 0.7);
border-color: var(--ink-20);
transform: translateY(-2px);
}
.affiliate-plan-page .float-nav-cta {
padding: 10px 20px;
border-radius: 100px;
background: var(--ink);
color: var(--cobalt-deepest);
font-family: 'Sora', sans-serif;
font-size: 13px;
font-weight: 700;
text-decoration: none;
transition: all 0.25s;
box-shadow: 0 8px 32px rgba(250, 251, 255, 0.25);
}
.affiliate-plan-page .float-nav-cta:hover {
transform: translateY(-2px);
box-shadow: 0 10px 40px rgba(250, 251, 255, 0.4);
}
.affiliate-plan-page .float-brand {
position: fixed;
top: 28px;
left: 32px;
z-index: 100;
display: flex;
align-items: center;
gap: 12px;
padding: 10px 20px 10px 12px;
border-radius: 100px;
background: rgba(11, 18, 48, 0.5);
border: 1px solid var(--ink-10);
backdrop-filter: blur(18px) saturate(180%);
text-decoration: none;
transition: all 0.25s;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.affiliate-plan-page .float-brand:hover {
background: rgba(11, 18, 48, 0.7);
transform: translateY(-2px);
}
.affiliate-plan-page .float-brand-mark {
width: 30px;
height: 30px;
border-radius: 8px;
background: linear-gradient(135deg, var(--sky), var(--indigo));
display: flex;
align-items: center;
justify-content: center;
box-shadow: 0 0 16px rgba(14, 165, 233, 0.45);
position: relative;
}
.affiliate-plan-page .float-brand-mark::before {
content: '';
position: absolute;
inset: -2px;
border-radius: 10px;
background: linear-gradient(135deg, var(--sky), var(--amber), var(--indigo));
z-index: -1;
opacity: 0.4;
filter: blur(4px);
}
.affiliate-plan-page .float-brand-text {
font-family: 'Sora', sans-serif;
font-size: 15px;
font-weight: 900;
letter-spacing: -0.03em;
color: var(--ink);
}
.affiliate-plan-page .float-brand-text em {
color: var(--sky-bright);
font-style: normal;
}
.affiliate-plan-page .page-section {
padding: 140px 48px 100px;
max-width: 1320px;
margin: 0 auto;
position: relative;
}
.affiliate-plan-page .live-ticker {
display: flex;
align-items: center;
gap: 16px;
padding: 14px 20px;
border-radius: 100px;
background: linear-gradient(90deg, rgba(52, 211, 153, 0.12), rgba(251, 191, 36, 0.08));
border: 1px solid rgba(52, 211, 153, 0.3);
margin-bottom: 40px;
backdrop-filter: blur(16px);
max-width: fit-content;
box-shadow: 0 0 40px rgba(52, 211, 153, 0.2);
animation: apTickerGlow 3s ease-in-out infinite;
}
@keyframes apTickerGlow {
0%, 100% { box-shadow: 0 0 40px rgba(52, 211, 153, 0.2); }
50% { box-shadow: 0 0 70px rgba(52, 211, 153, 0.4); }
}
.affiliate-plan-page .ticker-pulse {
width: 8px;
height: 8px;
border-radius: 50%;
background: var(--green);
box-shadow: 0 0 12px var(--green);
animation: apLivePulse 1.5s ease-in-out infinite;
}
@keyframes apLivePulse {
0%, 100% { opacity: 1; transform: scale(1); }
50% { opacity: 0.4; transform: scale(1.5); }
}
.affiliate-plan-page .ticker-label {
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
font-weight: 500;
color: var(--ink-60);
letter-spacing: 0.08em;
text-transform: uppercase;
}
.affiliate-plan-page .ticker-value {
font-family: 'Sora', sans-serif;
font-weight: 900;
font-size: 18px;
color: var(--green-bright);
letter-spacing: -0.02em;
}
.affiliate-plan-page .ticker-apDelta {
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
font-weight: 700;
color: var(--amber);
padding: 4px 10px;
border-radius: 100px;
background: rgba(251, 191, 36, 0.15);
border: 1px solid rgba(251, 191, 36, 0.3);
animation: apDelta 2s ease-in-out infinite;
}
@keyframes apDelta {
0%, 100% { transform: scale(1); }
50% {  }
}
.affiliate-plan-page .section-tag {
display: flex;
align-items: center;
gap: 14px;
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
font-weight: 500;
color: var(--ink-40);
letter-spacing: 0.15em;
text-transform: uppercase;
margin-bottom: 20px;
}
.affiliate-plan-page .section-tag::before {
content: '';
width: 32px;
height: 1px;
background: var(--amber);
}
.affiliate-plan-page .section-h2 {
font-family: 'Sora', sans-serif;
font-size: clamp(40px, 5.2vw, 76px);
font-weight: 900;
line-height: 0.95;
letter-spacing: -0.045em;
margin-bottom: 20px;
}
.affiliate-plan-page .section-h2 .accent {
display: block;
font-weight: 300;
letter-spacing: -0.035em;
color: var(--ink);
opacity: 0.75;
}
.affiliate-plan-page .section-lead {
font-size: 17px;
line-height: 1.65;
color: var(--ink-70);
margin-bottom: 0;
}
.affiliate-plan-page .section-lead strong { color: var(--ink); font-weight: 600; }
.affiliate-plan-page .earnings-hero {
display: grid;
grid-template-columns: 1.2fr 1fr;
gap: 40px;
margin-bottom: 80px;
padding: 48px;
border-radius: 24px;
background:
linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(99, 102, 241, 0.06)),
rgba(11, 18, 48, 0.75);
border: 1px solid rgba(251, 191, 36, 0.2);
position: relative;
overflow: hidden;
backdrop-filter: blur(16px);
box-shadow: 0 20px 80px rgba(0, 0, 0, 0.3);
}
.affiliate-plan-page .earnings-hero::before {
content: '';
position: absolute;
top: -30%;
right: -10%;
width: 400px;
height: 400px;
background: radial-gradient(circle, rgba(251, 191, 36, 0.22), transparent 70%);
filter: blur(40px);
pointer-events: none;
}
.affiliate-plan-page .earnings-hero-left { position: relative; z-index: 2; }
.affiliate-plan-page .earnings-hero-label {
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
font-weight: 500;
color: var(--amber);
letter-spacing: 0.15em;
text-transform: uppercase;
margin-bottom: 8px;
}
.affiliate-plan-page .earnings-hero-big {
font-family: 'Sora', sans-serif;
font-size: clamp(64px, 9vw, 128px);
font-weight: 900;
line-height: 0.88;
letter-spacing: -0.05em;
background: linear-gradient(135deg, var(--amber-bright), var(--amber), #f59e0b);
-webkit-background-clip: text;
background-clip: text;
-webkit-text-fill-color: transparent;
margin-bottom: 14px;
animation: apBigGlow 3s ease-in-out infinite;
}
@keyframes apBigGlow {
0%, 100% { filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.3)); }
50% { filter: drop-shadow(0 0 60px rgba(251, 191, 36, 0.6)); }
}
.affiliate-plan-page .earnings-hero-sub {
font-family: 'Sora', sans-serif;
font-size: 16px;
color: var(--ink-60);
font-weight: 500;
}
.affiliate-plan-page .earnings-hero-sub strong { color: var(--ink); font-weight: 700; }
.affiliate-plan-page .hero-intro {
display: grid;
grid-template-columns: 1.3fr 1fr;
gap: 48px;
margin-bottom: 56px;
align-items: start;
}
.affiliate-plan-page .hero-intro-left {
padding-top: 8px;
}
.affiliate-plan-page .hero-stat-strip {
margin-top: 36px;
padding: 24px 28px;
border-radius: 20px;
background: linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(99, 102, 241, 0.04));
border: 1px solid rgba(56, 189, 248, 0.18);
backdrop-filter: blur(10px);
display: flex;
align-items: baseline;
gap: 18px;
flex-wrap: wrap;
}
.affiliate-plan-page .hero-stat-big {
font-family: 'Sora', sans-serif;
font-size: clamp(36px, 4.2vw, 54px);
font-weight: 900;
line-height: 1;
letter-spacing: -0.035em;
color: var(--ink);
filter: drop-shadow(0 0 24px rgba(56, 189, 248, 0.25));
}
.affiliate-plan-page .hero-stat-label {
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
color: var(--ink-60);
letter-spacing: 0.12em;
text-transform: uppercase;
}
.affiliate-plan-page .hero-stat-label strong { color: var(--ink); font-weight: 700; }
.affiliate-plan-page .hero-intro-right {
position: relative;
}
.affiliate-plan-page .payouts-feed {
position: relative;
z-index: 2;
background: linear-gradient(180deg, rgba(11, 18, 48, 0.75), rgba(11, 18, 48, 0.65));
border: 1px solid var(--ink-10);
border-radius: 20px;
padding: 28px;
backdrop-filter: blur(16px);
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.affiliate-plan-page .payouts-head {
display: flex;
align-items: center;
justify-content: space-between;
margin-bottom: 18px;
padding-bottom: 16px;
border-bottom: 1px solid var(--ink-10);
}
.affiliate-plan-page .payouts-title {
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
font-weight: 500;
color: var(--ink-50);
letter-spacing: 0.15em;
text-transform: uppercase;
}
.affiliate-plan-page .payouts-live {
display: flex;
align-items: center;
gap: 6px;
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
font-weight: 700;
color: var(--green);
letter-spacing: 0.1em;
text-transform: uppercase;
}
.affiliate-plan-page .payouts-live-dot {
width: 6px;
height: 6px;
border-radius: 50%;
background: var(--green);
box-shadow: 0 0 8px var(--green);
animation: apLivePulse 1.5s ease-in-out infinite;
}
.affiliate-plan-page .payout-item {
display: grid;
grid-template-columns: 40px 1fr auto;
gap: 14px;
align-items: center;
padding: 12px 0;
border-bottom: 1px solid var(--ink-05);
animation: apPayoutSlide 0.5s ease-out;
opacity: 0;
animation-fill-mode: forwards;
}
.affiliate-plan-page .payout-item:last-child { border-bottom: none; }
.affiliate-plan-page .payout-item:nth-child(1) { animation-delay: 0.8s; }
.affiliate-plan-page .payout-item:nth-child(2) { animation-delay: 1.1s; }
.affiliate-plan-page .payout-item:nth-child(3) { animation-delay: 1.4s; }
.affiliate-plan-page .payout-item:nth-child(4) { animation-delay: 1.7s; }
.affiliate-plan-page .payout-item:nth-child(5) { animation-delay: 2.0s; }
@keyframes apPayoutSlide {
from { opacity: 0; transform: translateX(-12px); }
to { opacity: 1; transform: translateX(0); }
}
.affiliate-plan-page .payout-avatar {
width: 40px;
height: 40px;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
font-family: 'Sora', sans-serif;
font-size: 12px;
font-weight: 800;
color: var(--ink);
}
.affiliate-plan-page .payout-avatar { font-size: 14px; }
.affiliate-plan-page .payout-avatar.a1 { background: linear-gradient(135deg, #ec4899, #f43f5e); }
.affiliate-plan-page .payout-avatar.a2 { background: linear-gradient(135deg, #14b8a6, #06b6d4); }
.affiliate-plan-page .payout-avatar.a3 { background: linear-gradient(135deg, #f97316, #eab308); }
.affiliate-plan-page .payout-avatar.a4 { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
.affiliate-plan-page .payout-avatar.a5 { background: linear-gradient(135deg, #84cc16, #22c55e); }
.affiliate-plan-page .payout-details { min-width: 0; }
.affiliate-plan-page .payout-name {
font-family: 'Sora', sans-serif;
font-size: 13px;
font-weight: 700;
color: var(--ink);
margin-bottom: 2px;
}
.affiliate-plan-page .payout-reason {
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
color: var(--ink-50);
letter-spacing: 0.05em;
}
.affiliate-plan-page .payout-amount {
font-family: 'Sora', sans-serif;
font-size: 16px;
font-weight: 800;
color: var(--green);
letter-spacing: -0.01em;
white-space: nowrap;
}
.affiliate-plan-page .streams-header {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 60px;
align-items: end;
margin-bottom: 32px;
}
.affiliate-plan-page .streams-title {
font-family: 'Sora', sans-serif;
font-size: clamp(28px, 4vw, 42px);
font-weight: 900;
letter-spacing: -0.03em;
line-height: 1.05;
}
.affiliate-plan-page .streams-sub {
font-size: 15px;
line-height: 1.7;
color: var(--ink-60);
}
.affiliate-plan-page .streams-grid {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 18px;
margin-top: 88px;
}
.affiliate-plan-page .stream-card {
position: relative;
padding: 40px;
border-radius: 24px;
background:
linear-gradient(180deg, rgba(11, 18, 48, 0.82), rgba(11, 18, 48, 0.72)),
rgba(250, 251, 255, 0.02);
border: 1px solid var(--ink-10);
overflow: hidden;
transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.4s, box-shadow 0.4s;
cursor: default;
backdrop-filter: blur(16px);
min-height: 540px;
display: flex;
flex-direction: column;
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}
.affiliate-plan-page .stream-card:hover {
transform: translateY(-8px);
border-color: var(--accent);
box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5), 0 0 100px rgba(var(--accent-rgb), 0.15);
}
.affiliate-plan-page .stream-card::before {
content: '';
position: absolute;
top: 0;
left: 0;
right: 0;
height: 3px;
background: linear-gradient(90deg, var(--accent), transparent);
}
.affiliate-plan-page .stream-card::after {
content: '';
position: absolute;
top: -40%;
right: -30%;
width: 500px;
height: 500px;
background: radial-gradient(circle, rgba(var(--accent-rgb), 0.18), transparent 60%);
filter: blur(40px);
pointer-events: none;
opacity: 0;
transition: opacity 0.6s;
}
.affiliate-plan-page .stream-card:hover::after { opacity: 1; }
.affiliate-plan-page .stream-card[data-color="sky"] { --accent: var(--sky-bright); --accent-rgb: 56, 189, 248; }
.affiliate-plan-page .stream-card[data-color="indigo"] { --accent: var(--indigo-soft); --accent-rgb: 129, 140, 248; }
.affiliate-plan-page .stream-card[data-color="amber"] { --accent: var(--amber); --accent-rgb: 251, 191, 36; }
.affiliate-plan-page .stream-card[data-color="green"] { --accent: var(--green); --accent-rgb: 52, 211, 153; }
.affiliate-plan-page .stream-top {
display: flex;
align-items: flex-start;
justify-content: space-between;
margin-bottom: 20px;
gap: 16px;
}
.affiliate-plan-page .stream-top-left { display: flex; align-items: center; gap: 20px; }
.affiliate-plan-page .stream-icon {
width: 56px;
height: 56px;
border-radius: 14px;
background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.25), rgba(var(--accent-rgb), 0.1));
border: 1px solid rgba(var(--accent-rgb), 0.4);
display: flex;
align-items: center;
justify-content: center;
color: var(--accent);
flex-shrink: 0;
box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.25);
position: relative;
}
.affiliate-plan-page .stream-icon::before {
content: '';
position: absolute;
inset: -1px;
border-radius: 14px;
background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.5), transparent);
z-index: -1;
opacity: 0.5;
filter: blur(4px);
}
.affiliate-plan-page .stream-num-and-name {
display: flex;
flex-direction: column;
gap: 2px;
}
.affiliate-plan-page .stream-num {
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
font-weight: 700;
color: var(--accent);
letter-spacing: 0.2em;
text-transform: uppercase;
}
.affiliate-plan-page .stream-badge {
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
font-weight: 500;
color: var(--accent);
padding: 4px 10px;
border-radius: 100px;
background: rgba(var(--accent-rgb), 0.1);
border: 1px solid rgba(var(--accent-rgb), 0.25);
letter-spacing: 0.08em;
text-transform: uppercase;
white-space: nowrap;
align-self: flex-start;
}
.affiliate-plan-page .stream-name {
font-family: 'Sora', sans-serif;
font-size: 26px;
font-weight: 800;
letter-spacing: -0.02em;
line-height: 1.1;
}
.affiliate-plan-page .stream-headline {
margin: 18px 0 16px;
padding: 20px 24px;
border-radius: 14px;
background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.15), rgba(var(--accent-rgb), 0.04));
border: 1px solid rgba(var(--accent-rgb), 0.2);
display: flex;
align-items: baseline;
justify-content: space-between;
gap: 16px;
position: relative;
overflow: hidden;
}
.affiliate-plan-page .stream-headline::after {
content: '';
position: absolute;
inset: 0;
background: linear-gradient(120deg, transparent 30%, rgba(var(--accent-rgb), 0.15) 50%, transparent 70%);
transform: translateX(-100%);
animation: apHeadlineSheen 5s ease-in-out infinite;
}
@keyframes apHeadlineSheen {
0%, 100% { transform: translateX(-100%); }
50% { transform: translateX(100%); }
}
.affiliate-plan-page .stream-headline-value {
font-family: 'Sora', sans-serif;
font-size: clamp(28px, 3vw, 40px);
font-weight: 900;
color: var(--accent);
letter-spacing: -0.03em;
line-height: 1;
filter: drop-shadow(0 0 16px rgba(var(--accent-rgb), 0.4));
}
.affiliate-plan-page .stream-headline-value small {
font-size: 0.5em;
font-weight: 500;
color: var(--ink-50);
letter-spacing: 0;
margin-left: 4px;
}
.affiliate-plan-page .stream-headline-unit {
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
font-weight: 500;
color: var(--ink-50);
letter-spacing: 0.1em;
text-transform: uppercase;
text-align: right;
line-height: 1.4;
}
.affiliate-plan-page .stream-description {
font-size: 14px;
line-height: 1.65;
color: var(--ink-60);
margin-bottom: 20px;
}
.affiliate-plan-page .stream-description strong { color: var(--ink); font-weight: 600; }
.affiliate-plan-page .stream-viz-wrap {
margin-top: auto;
}
.affiliate-plan-page .viz-referral {
position: relative;
height: 130px;
border-radius: 12px;
background: rgba(14, 165, 233, 0.06);
border: 1px solid rgba(14, 165, 233, 0.2);
overflow: hidden;
padding: 16px;
}
.affiliate-plan-page .viz-referral-path {
position: absolute;
inset: 20px 16px;
display: flex;
align-items: center;
justify-content: space-between;
}
.affiliate-plan-page .viz-person {
width: 44px;
height: 44px;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
font-family: 'Sora', sans-serif;
font-size: 14px;
font-weight: 800;
color: var(--ink);
position: relative;
z-index: 2;
}
.affiliate-plan-page .viz-person.you {
background: linear-gradient(135deg, var(--sky), var(--indigo));
box-shadow: 0 0 24px rgba(14, 165, 233, 0.5);
}
.affiliate-plan-page .viz-person.them {
background: linear-gradient(135deg, #ec4899, #f43f5e);
box-shadow: 0 0 20px rgba(236, 72, 153, 0.4);
}
.affiliate-plan-page .viz-referral-line {
position: absolute;
top: 50%;
left: 56px;
right: 56px;
height: 2px;
background: linear-gradient(90deg, var(--sky-bright), var(--indigo-soft));
transform: translateY(-50%);
opacity: 0.3;
}
.affiliate-plan-page .coin {
position: absolute;
top: 50%;
left: 40px;
width: 22px;
height: 22px;
border-radius: 50%;
background: radial-gradient(circle at 35% 35%, #fde68a, var(--amber), #b45309);
box-shadow: 0 0 14px rgba(251, 191, 36, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.3);
transform: translateY(-50%);
font-family: 'Sora', sans-serif;
font-size: 12px;
font-weight: 900;
color: #78350f;
display: flex;
align-items: center;
justify-content: center;
animation: apCoinFly 2.4s ease-in-out infinite;
}
.affiliate-plan-page .coin:nth-child(4) { animation-delay: 0.8s; }
.affiliate-plan-page .coin:nth-child(5) { animation-delay: 1.6s; }
@keyframes apCoinFly {
0% { left: 40px; opacity: 0; transform: translateY(-50%) scale(0.5); }
10% { opacity: 1; transform: translateY(-50%) scale(1); }
90% { opacity: 1; transform: translateY(-50%) scale(1); }
100% { left: calc(100% - 60px); opacity: 0; transform: translateY(-50%) scale(0.5); }
}
.affiliate-plan-page .viz-earn-label {
position: absolute;
bottom: 12px;
right: 16px;
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
font-weight: 500;
color: var(--ink-50);
letter-spacing: 0.08em;
text-transform: uppercase;
}
.affiliate-plan-page .viz-grid-container {
position: relative;
height: 130px;
border-radius: 12px;
background: rgba(99, 102, 241, 0.06);
border: 1px solid rgba(99, 102, 241, 0.2);
padding: 16px;
display: flex;
align-items: center;
gap: 16px;
}
.affiliate-plan-page .viz-grid {
display: grid;
grid-template-columns: repeat(8, 1fr);
gap: 2px;
width: 98px;
height: 98px;
flex-shrink: 0;
}
.affiliate-plan-page .viz-grid .gc {
background: var(--ink-10);
border-radius: 1px;
transition: all 0.3s;
}
.affiliate-plan-page .viz-grid .gc.on {
background: linear-gradient(135deg, var(--indigo), var(--indigo-soft));
box-shadow: 0 0 4px rgba(129, 140, 248, 0.6);
}
.affiliate-plan-page .viz-grid .gc.center {
background: var(--ink);
box-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
}
@keyframes apGridFill {
0% { transform: scale(0.5); opacity: 0; }
50% { transform: scale(1.2); opacity: 1; }
100% { transform: scale(1); opacity: 1; background: linear-gradient(135deg, var(--indigo), var(--indigo-soft)); box-shadow: 0 0 4px rgba(129, 140, 248, 0.6); }
}
.affiliate-plan-page .viz-grid-stats {
flex: 1;
display: flex;
flex-direction: column;
gap: 10px;
}
.affiliate-plan-page .viz-progress-bar {
height: 6px;
border-radius: 3px;
background: rgba(99, 102, 241, 0.12);
overflow: hidden;
position: relative;
}
.affiliate-plan-page .viz-progress-fill {
height: 100%;
background: linear-gradient(90deg, var(--indigo), var(--indigo-soft), var(--sky-bright));
border-radius: 3px;
position: relative;
animation: apProgressFill 3s ease-out forwards;
box-shadow: 0 0 12px rgba(129, 140, 248, 0.7);
}
@keyframes apProgressFill {
from { width: 0%; }
to { width: 65%; }
}
.affiliate-plan-page .viz-progress-fill::after {
content: '';
position: absolute;
top: 0;
right: 0;
bottom: 0;
width: 20px;
background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
animation: apProgressSheen 2s ease-in-out infinite;
}
@keyframes apProgressSheen {
0%, 100% { opacity: 0; transform: translateX(0); }
50% { opacity: 1; transform: translateX(-20px); }
}
.affiliate-plan-page .viz-grid-label {
display: flex;
justify-content: space-between;
align-items: center;
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
color: var(--ink-50);
letter-spacing: 0.08em;
text-transform: uppercase;
}
.affiliate-plan-page .viz-grid-label strong {
color: var(--indigo-soft);
font-weight: 700;
font-size: 13px;
}
.affiliate-plan-page .viz-grid-timer {
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
color: var(--ink-50);
letter-spacing: 0.05em;
padding: 4px 10px;
border-radius: 100px;
background: rgba(99, 102, 241, 0.1);
border: 1px solid rgba(99, 102, 241, 0.2);
}
.affiliate-plan-page .viz-grid-timer strong { color: var(--indigo-soft); font-weight: 700; }
.affiliate-plan-page .viz-nexus-container {
position: relative;
height: 130px;
border-radius: 12px;
background: rgba(251, 191, 36, 0.07);
border: 1px solid rgba(251, 191, 36, 0.25);
padding: 16px;
display: flex;
align-items: center;
gap: 20px;
}
.affiliate-plan-page .viz-nexus {
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 4px;
width: 90px;
height: 90px;
flex-shrink: 0;
}
.affiliate-plan-page .viz-nexus .nc {
background: linear-gradient(135deg, var(--amber), var(--amber-soft));
border-radius: 4px;
box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
animation: apNexusPop 2.4s ease-in-out infinite;
}
.affiliate-plan-page .viz-nexus .nc:nth-child(1) { animation-delay: 0s; }
.affiliate-plan-page .viz-nexus .nc:nth-child(2) { animation-delay: 0.12s; }
.affiliate-plan-page .viz-nexus .nc:nth-child(3) { animation-delay: 0.24s; }
.affiliate-plan-page .viz-nexus .nc:nth-child(4) { animation-delay: 0.36s; }
.affiliate-plan-page .viz-nexus .nc:nth-child(5) {
animation-delay: 0.48s;
background: var(--ink);
box-shadow: 0 0 16px rgba(255, 255, 255, 0.9);
}
.affiliate-plan-page .viz-nexus .nc:nth-child(6) { animation-delay: 0.6s; }
.affiliate-plan-page .viz-nexus .nc:nth-child(7) { animation-delay: 0.72s; }
.affiliate-plan-page .viz-nexus .nc:nth-child(8) { animation-delay: 0.84s; }
.affiliate-plan-page .viz-nexus .nc:nth-child(9) { animation-delay: 0.96s; }
@keyframes apNexusPop {
0%, 100% { transform: scale(1); opacity: 0.7; }
40% { transform: scale(1.15); opacity: 1; filter: brightness(1.3); }
}
.affiliate-plan-page .viz-nexus-breakdown {
flex: 1;
display: flex;
flex-direction: column;
gap: 6px;
}
.affiliate-plan-page .viz-nexus-row {
display: flex;
justify-content: space-between;
align-items: center;
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
padding: 4px 0;
border-bottom: 1px solid rgba(251, 191, 36, 0.15);
}
.affiliate-plan-page .viz-nexus-row:last-child { border-bottom: none; }
.affiliate-plan-page .viz-nexus-row-label { color: var(--ink-60); letter-spacing: 0.05em; }
.affiliate-plan-page .viz-nexus-row-val { color: var(--amber); font-weight: 700; }
.affiliate-plan-page .viz-courses-container {
position: relative;
height: 130px;
border-radius: 12px;
background: rgba(52, 211, 153, 0.06);
border: 1px solid rgba(52, 211, 153, 0.25);
padding: 10px 16px;
overflow: hidden;
display: flex;
flex-direction: column;
justify-content: space-between;
}
.affiliate-plan-page .viz-courses-lane {
display: flex;
align-items: center;
justify-content: space-between;
font-family: 'JetBrains Mono', monospace;
font-size: 9px;
color: var(--ink-40);
letter-spacing: 0.1em;
text-transform: uppercase;
}
.affiliate-plan-page .viz-courses-lane.top { color: rgba(52, 211, 153, 0.55); }
.affiliate-plan-page .viz-courses-lane.bottom { color: var(--green); }
.affiliate-plan-page .viz-courses-row {
position: relative;
display: grid;
grid-template-columns: repeat(8, 1fr);
gap: 4px;
align-items: center;
height: 36px;
}
.affiliate-plan-page .sale-person {
position: relative;
width: 26px;
height: 26px;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
font-family: 'Sora', sans-serif;
font-weight: 800;
font-size: 10px;
color: var(--ink);
margin: 0 auto;
}
.affiliate-plan-page .sale-person.yours {
background: linear-gradient(135deg, var(--green), var(--green-bright));
box-shadow: 0 0 10px rgba(52, 211, 153, 0.6);
color: var(--cobalt-deepest);
animation: apSaleAnchor 3.2s ease-in-out infinite;
}
.affiliate-plan-page .sale-person.passup {
background: linear-gradient(135deg, rgba(52, 211, 153, 0.25), rgba(110, 231, 183, 0.15));
border: 1px dashed rgba(52, 211, 153, 0.5);
color: rgba(52, 211, 153, 0.7);
animation: apSalePassUp 3.2s ease-in-out infinite;
}
.affiliate-plan-page .sale-person.passup::after {
content: '';
position: absolute;
top: -22px;
left: 50%;
transform: translateX(-50%);
width: 0;
height: 0;
border-left: 4px solid transparent;
border-right: 4px solid transparent;
border-bottom: 6px solid rgba(52, 211, 153, 0.7);
opacity: 0;
animation: apSalePassUpArrow 3.2s ease-in-out infinite;
}
.affiliate-plan-page .sale-person.yours:nth-of-type(2) { animation-delay: 0.2s; }
.affiliate-plan-page .sale-person.passup:nth-of-type(2) { animation-delay: 0.4s; }
.affiliate-plan-page .sale-person.yours:nth-of-type(3) { animation-delay: 0.6s; }
.affiliate-plan-page .sale-person.passup:nth-of-type(3) { animation-delay: 0.8s; }
.affiliate-plan-page .sale-person.yours:nth-of-type(4) { animation-delay: 1.0s; }
.affiliate-plan-page .sale-person.passup:nth-of-type(4) { animation-delay: 1.2s; }
@keyframes apSaleAnchor {
0%, 100% { transform: translateY(0); filter: brightness(1); }
50% { transform: translateY(-2px); filter: brightness(1.15); }
}
@keyframes apSalePassUp {
0%, 100% { transform: translateY(0); opacity: 0.55; }
40% { transform: translateY(-8px); opacity: 1; }
80% { transform: translateY(-4px); opacity: 0.7; }
}
@keyframes apSalePassUpArrow {
0%, 25% { opacity: 0; transform: translateX(-50%) translateY(4px); }
40%, 60% { opacity: 1; transform: translateX(-50%) translateY(0); }
80%, 100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
}
.affiliate-plan-page .sale-num {
position: absolute;
bottom: -14px;
left: 50%;
transform: translateX(-50%);
font-family: 'JetBrains Mono', monospace;
font-size: 9px;
font-weight: 700;
color: var(--ink-50);
letter-spacing: 0.05em;
}
.affiliate-plan-page .footer-banner {
margin-top: 64px;
padding: 48px;
border-radius: 24px;
background:
linear-gradient(135deg, rgba(11, 18, 48, 0.85), rgba(0, 0, 0, 0.7)),
#050816;
border: 1px solid rgba(56, 189, 248, 0.4);
display: grid;
grid-template-columns: 1fr auto;
gap: 40px;
align-items: center;
position: relative;
overflow: hidden;
backdrop-filter: blur(16px);
}
.affiliate-plan-page .footer-banner::before {
content: '';
position: absolute;
top: -50%;
left: 20%;
width: 600px;
height: 600px;
background: radial-gradient(circle, rgba(56, 189, 248, 0.35), transparent 55%);
filter: blur(50px);
pointer-events: none;
}
.affiliate-plan-page .footer-banner-text {
position: relative;
z-index: 2;
font-family: 'Sora', sans-serif;
font-weight: 300;
font-size: clamp(22px, 2.4vw, 30px);
color: var(--ink-70);
line-height: 1.3;
max-width: 540px;
letter-spacing: -0.02em;
}
.affiliate-plan-page .footer-banner-text .emph {
color: var(--sky-bright);
font-weight: 700;
text-shadow: 0 0 20px rgba(56, 189, 248, 0.6);
}
.affiliate-plan-page .footer-cta {
position: relative;
z-index: 2;
display: inline-flex;
align-items: center;
gap: 12px;
padding: 20px 36px;
border-radius: 14px;
background: linear-gradient(135deg, var(--amber-bright), var(--amber));
color: var(--cobalt-deepest);
font-family: 'Sora', sans-serif;
font-size: 15px;
font-weight: 800;
text-decoration: none;
letter-spacing: -0.01em;
transition: transform 0.3s, box-shadow 0.3s;
box-shadow: 0 12px 40px rgba(251, 191, 36, 0.4);
white-space: nowrap;
}
.affiliate-plan-page .footer-cta:hover {
transform: translateY(-3px) scale(1.02);
box-shadow: 0 16px 50px rgba(251, 191, 36, 0.6);
}
@media (max-width: 900px) {
.affiliate-plan-page .page-section { padding: 120px 20px 80px; }
.affiliate-plan-page .hero-intro { grid-template-columns: 1fr; gap: 28px; }
.affiliate-plan-page .streams-header { grid-template-columns: 1fr; gap: 20px; }
.affiliate-plan-page .streams-grid { grid-template-columns: 1fr; margin-top: 48px; }
.affiliate-plan-page .stream-card { min-height: auto; padding: 32px; }
.affiliate-plan-page .footer-banner { grid-template-columns: 1fr; gap: 24px; padding: 32px; text-align: center; }
.affiliate-plan-page .footer-cta { justify-self: center; }
.affiliate-plan-page .float-nav { right: 20px; gap: 6px; }
.affiliate-plan-page .float-nav-link { padding: 8px 14px; font-size: 12px; }
.affiliate-plan-page .float-brand { left: 20px; padding: 8px 16px 8px 10px; }
.affiliate-plan-page .float-brand-text { font-size: 13px; }
}
@media (max-width: 768px) {
.affiliate-plan-page .float-nav { top: 16px; right: 16px; }
.affiliate-plan-page .float-nav-link:nth-child(1), .affiliate-plan-page .float-nav-link:nth-child(2), .affiliate-plan-page .float-nav-link:nth-child(3) { display: none; }
.affiliate-plan-page .float-brand { top: 16px; left: 16px; }
}
.affiliate-plan-page .toast-name, .affiliate-plan-page .toast-reason, .affiliate-plan-page .toast-amount {
transition: opacity 0.25s ease;
}
.affiliate-plan-page .toast-fading .toast-name, .affiliate-plan-page .toast-fading .toast-reason, .affiliate-plan-page .toast-fading .toast-amount {
opacity: 0;
}
.affiliate-plan-page .income-toast {
position: absolute;
top: 180px;
right: 48px;
z-index: 50;
display: flex;
align-items: center;
gap: 18px;
padding: 18px 26px 18px 20px;
border-radius: 100px;
background: linear-gradient(90deg, rgba(11, 18, 48, 0.92), rgba(23, 37, 84, 0.88));
border: 1px solid rgba(56, 189, 248, 0.4);
backdrop-filter: blur(20px) saturate(180%);
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 60px rgba(56, 189, 248, 0.22);
min-width: 360px;
pointer-events: none;
}
.affiliate-plan-page .toast-icon-wrap {
position: relative;
width: 44px;
height: 44px;
border-radius: 50%;
background: linear-gradient(135deg, var(--sky), var(--sky-bright));
display: flex;
align-items: center;
justify-content: center;
color: var(--cobalt-deepest);
flex-shrink: 0;
box-shadow: 0 0 16px rgba(56, 189, 248, 0.55);
}
.affiliate-plan-page .toast-pulse {
position: absolute;
inset: -4px;
border-radius: 50%;
border: 2px solid var(--sky-bright);
opacity: 0;
animation: apToastPulse 1.6s ease-out infinite;
}
@keyframes apToastPulse {
0% { transform: scale(1); opacity: 0.7; }
100% { transform: scale(1.5); opacity: 0; }
}
.affiliate-plan-page .toast-body {
flex: 1;
min-width: 0;
}
.affiliate-plan-page .toast-name {
font-family: 'Sora', sans-serif;
font-weight: 700;
font-size: 16px;
color: var(--ink);
line-height: 1.2;
margin-bottom: 3px;
}
.affiliate-plan-page .toast-reason {
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
color: var(--ink-60);
letter-spacing: 0.05em;
text-transform: uppercase;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}
.affiliate-plan-page .toast-amount {
font-family: 'Sora', sans-serif;
font-weight: 900;
font-size: 24px;
color: var(--sky-bright);
letter-spacing: -0.02em;
white-space: nowrap;
filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.55));
}
@media (max-width: 900px) {
.affiliate-plan-page .income-toast {
position: fixed;
top: 84px;
right: 16px;
left: 16px;
min-width: 0;
padding: 12px 18px 12px 14px;
transform: translateY(-20px);
}
.affiliate-plan-page .income-toast.show { transform: translateY(0); }
.affiliate-plan-page .toast-amount { font-size: 18px; }
.affiliate-plan-page .toast-name { font-size: 14px; }
}
.affiliate-plan-page .mock-label {
position: fixed;
bottom: 16px;
right: 16px;
z-index: 1000;
padding: 8px 14px;
background: rgba(11, 18, 48, 0.95);
border: 1px solid var(--ink-10);
border-radius: 6px;
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
font-weight: 700;
color: var(--ink-60);
letter-spacing: 0.15em;
text-transform: uppercase;
backdrop-filter: blur(12px);
}
/* Language pill — not in mockup, product-standard addition */
.affiliate-plan-page .float-lang-wrap{position:relative}
.affiliate-plan-page .float-lang-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--ink);cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.affiliate-plan-page .float-lang-pill:hover{background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.affiliate-plan-page .float-lang-flag{font-size:15px;line-height:1}
.affiliate-plan-page .float-lang-code{letter-spacing:.05em}
.affiliate-plan-page .float-lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:200px;max-height:360px;overflow-y:auto;background:rgba(11,18,48,.95);border:1px solid var(--ink-10);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);backdrop-filter:blur(20px);padding:4px;z-index:200}
.affiliate-plan-page .float-lang-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:transparent;color:var(--ink-60);text-align:left;transition:all .15s}
.affiliate-plan-page .float-lang-item:hover{background:rgba(255,255,255,.05);color:var(--ink)}
.affiliate-plan-page .float-lang-item.active{background:rgba(56,189,248,.12);color:var(--sky-bright);font-weight:700}
.affiliate-plan-page .float-lang-item-flag{font-size:16px;line-height:1}
.affiliate-plan-page .float-lang-item-name{flex:1}
.affiliate-plan-page .float-lang-item-check{margin-left:auto;font-size:11px;color:var(--sky-bright)}
`;
