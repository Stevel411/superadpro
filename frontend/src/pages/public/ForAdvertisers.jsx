import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';
import DisclaimerLink from '../../components/DisclaimerLink';

export default function ForAdvertisers() {
  var { t, i18n } = useTranslation();
  var [langOpen, setLangOpen] = useState(false);
  var langRef = useRef(null);

  useEffect(function() {
    function onClick(e) { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); }
    document.addEventListener('mousedown', onClick);
    return function() { document.removeEventListener('mousedown', onClick); };
  }, []);

  var currentLang = LANGUAGES.find(function(l) { return l.code === i18n.language; }) || LANGUAGES[0];

  return (
    <>
      <style>{CSS_FOR_ADVERTISERS}</style>
      <div className="for-advertisers-page">
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
          <Link to="/" className="float-nav-link">{t('forAdvertisers.navHome')}</Link>
          <Link to="/explore" className="float-nav-link">{t('forAdvertisers.navExplore', { defaultValue: 'Explore' })}</Link>

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

          <Link to="/login" className="float-nav-link">{t('forAdvertisers.navSignin')}</Link>
          <Link to="/register" className="float-nav-cta">{t('forAdvertisers.navCta')}</Link>
        </div>

        <section className="page-section">

          <div className="hero-badge">
            <div className="hero-badge-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <div className="hero-badge-body">
              <div className="hero-badge-label">{t('forAdvertisers.badgeLabel')}</div>
              <div className="hero-badge-value">
                {t('forAdvertisers.badgeValuePrefix')} <span className="accent">{t('forAdvertisers.badgeValueAccent')}</span>
              </div>
            </div>
          </div>

          <div className="section-tag">{t('forAdvertisers.sectionTag')}</div>
          <h2 className="section-h2">
            {t('forAdvertisers.headlineLine1')}
            <span className="accent">{t('forAdvertisers.headlineLine2')}</span>
          </h2>

          <div className="hero-stage">
            <div className="hero-stage-caption">{t('forAdvertisers.heroCaption')}</div>
          </div>

          {/* 4 outcome cards — always visible */}
          <div className="outcome-row">

            <div className="outcome-stat" data-c="amber" data-n="01">
              <div className="outcome-tag">{t('forAdvertisers.card1Tag')}</div>
              <div className="outcome-label">{t('forAdvertisers.card1Label')}</div>
              <div className="outcome-val">{t('forAdvertisers.card1Value')}</div>
              <div className="outcome-sub" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.card1Sub') }}></div>
              <div className="outcome-rule"></div>
            </div>

            <div className="outcome-stat" data-c="sky" data-n="02">
              <div className="outcome-tag">{t('forAdvertisers.card2Tag')}</div>
              <div className="outcome-label">{t('forAdvertisers.card2Label')}</div>
              <div className="outcome-val">{t('forAdvertisers.card2Value')}</div>
              <div className="outcome-sub" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.card2Sub') }}></div>
              <div className="outcome-rule"></div>
            </div>

            <div className="outcome-stat" data-c="green" data-n="03">
              <div className="outcome-tag">{t('forAdvertisers.card3Tag')}</div>
              <div className="outcome-label">{t('forAdvertisers.card3Label')}</div>
              <div className="outcome-val">{t('forAdvertisers.card3Value')}</div>
              <div className="outcome-sub" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.card3Sub') }}></div>
              <div className="outcome-rule"></div>
            </div>

            <div className="outcome-stat" data-c="indigo" data-n="04">
              <div className="outcome-tag">{t('forAdvertisers.card4Tag')}</div>
              <div className="outcome-label">{t('forAdvertisers.card4Label')}</div>
              <div className="outcome-val">{t('forAdvertisers.card4Value')}</div>
              <div className="outcome-sub" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.card4Sub') }}></div>
              <div className="outcome-rule"></div>
            </div>

          </div>

          {/* Why block */}
          <div className="why-block">
            <h3 className="why-h">{t('forAdvertisers.whyHeadline')}</h3>
            <p className="why-sub" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.whySub') }}></p>

            <div className="why-grid">

              <div className="why-card" data-c="amber">
                <div className="why-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="6"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <div className="why-pill">{t('forAdvertisers.why1Pill')}</div>
                <div className="why-title">{t('forAdvertisers.why1Title')}</div>
                <div className="why-desc" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.why1Desc') }}></div>
              </div>

              <div className="why-card" data-c="sky">
                <div className="why-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="why-pill">{t('forAdvertisers.why2Pill')}</div>
                <div className="why-title">{t('forAdvertisers.why2Title')}</div>
                <div className="why-desc" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.why2Desc') }}></div>
              </div>

              <div className="why-card" data-c="green">
                <div className="why-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div className="why-pill">{t('forAdvertisers.why3Pill')}</div>
                <div className="why-title">{t('forAdvertisers.why3Title')}</div>
                <div className="why-desc" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.why3Desc') }}></div>
              </div>

            </div>
          </div>

          {/* Two side-by-side role cards — YOU EARN / YOU REACH */}
          <div className="roles-row">
            <div className="role-card" data-c="green">
              <div className="role-pill">{t('forAdvertisers.earnCardPill')}</div>
              <div className="role-label">{t('forAdvertisers.earnCardLabel')}</div>
              <div className="role-title">{t('forAdvertisers.earnCardTitle')}</div>
              <div className="role-desc" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.earnCardDesc') }}></div>
              <ul className="role-bullets" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.earnCardBullets') }}></ul>
            </div>
            <div className="role-card" data-c="amber">
              <div className="role-pill">{t('forAdvertisers.reachCardPill')}</div>
              <div className="role-label">{t('forAdvertisers.reachCardLabel')}</div>
              <div className="role-title">{t('forAdvertisers.reachCardTitle')}</div>
              <div className="role-desc" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.reachCardDesc') }}></div>
              <ul className="role-bullets" dangerouslySetInnerHTML={{ __html: t('forAdvertisers.reachCardBullets') }}></ul>
            </div>
          </div>

          {/* Flow band */}
          <div className="flow-band">
            <div className="flow-head">
              <div className="flow-head-left">
                <div className="flow-head-title">{t('forAdvertisers.flowHeadTitle')}</div>
                <div className="flow-head-sub">{t('forAdvertisers.flowHeadSub')}</div>
              </div>
              <div className="flow-head-meta">
                <span className="flow-dot"></span>
                <span className="flow-meta-text">{t('forAdvertisers.flowMeta')}</span>
              </div>
            </div>

            <div className="flow-steps">
              <div className="flow-step">
                <div className="flow-step-num">
                  <span className="flow-step-num-circle">01</span>
                  <span>{t('forAdvertisers.step1Verb')}</span>
                </div>
                <div className="flow-step-title">{t('forAdvertisers.step1Title')}</div>
                <div className="flow-step-desc">{t('forAdvertisers.step1Desc')}</div>
              </div>

              <div className="flow-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              <div className="flow-step">
                <div className="flow-step-num">
                  <span className="flow-step-num-circle">02</span>
                  <span>{t('forAdvertisers.step2Verb')}</span>
                </div>
                <div className="flow-step-title">{t('forAdvertisers.step2Title')}</div>
                <div className="flow-step-desc">{t('forAdvertisers.step2Desc')}</div>
              </div>

              <div className="flow-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              <div className="flow-step">
                <div className="flow-step-num">
                  <span className="flow-step-num-circle">03</span>
                  <span>{t('forAdvertisers.step3Verb')}</span>
                </div>
                <div className="flow-step-title">{t('forAdvertisers.step3Title')}</div>
                <div className="flow-step-desc">{t('forAdvertisers.step3Desc')}</div>
              </div>

              <div className="flow-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              <div className="flow-step">
                <div className="flow-step-num">
                  <span className="flow-step-num-circle">04</span>
                  <span>{t('forAdvertisers.step4Verb')}</span>
                </div>
                <div className="flow-step-title">{t('forAdvertisers.step4Title')}</div>
                <div className="flow-step-desc">{t('forAdvertisers.step4Desc')}</div>
              </div>
            </div>
          </div>

          {/* Footer CTA banner */}
          <div className="footer-banner">
            <div className="footer-banner-text">
              {t('forAdvertisers.footerLine1')}<br/>
              <span className="emph">{t('forAdvertisers.footerLine2')}</span>
            </div>
            <Link to="/campaign-tiers" className="footer-cta">
              {t('forAdvertisers.footerCta')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

        </section>

        <DisclaimerLink />
      </div>
    </>
  );
}

// Scoped CSS — prefixed with .for-advertisers-page. Full mockup CSS including
// floating nav and floating brand. No PublicLayout wrap on this route.
var CSS_FOR_ADVERTISERS = `
.for-advertisers-page{
  --cobalt-deepest:#0b1230;--cobalt-deep:#172554;
  --sky:#0ea5e9;--sky-bright:#38bdf8;--sky-pale:#7dd3fc;
  --indigo:#6366f1;--indigo-soft:#818cf8;
  --purple:#a855f7;--purple-soft:#c084fc;
  --amber:#fbbf24;--amber-bright:#fcd34d;--amber-soft:#fde68a;
  --green:#34d399;--green-bright:#6ee7b7;
  --pink:#ec4899;--pink-soft:#f9a8d4;
  --ink:#fafbff;
  --ink-70:rgba(250,251,255,.7);--ink-60:rgba(250,251,255,.6);
  --ink-50:rgba(250,251,255,.5);--ink-40:rgba(250,251,255,.4);
  --ink-20:rgba(250,251,255,.2);--ink-10:rgba(250,251,255,.1);
  --ink-05:rgba(250,251,255,.05);
  position:relative;color:var(--ink);font-family:'DM Sans',sans-serif;min-height:100vh;
  background:var(--cobalt-deepest);
  overflow-x:hidden;
}

.for-advertisers-page .page-bg{position:absolute;top:0;left:0;right:0;height:780px;z-index:0;background-image:url("/static/images/advertisers-hero.jpg");background-size:cover;background-position:center top;background-repeat:no-repeat}
.for-advertisers-page .page-bg-overlay{position:absolute;top:0;left:0;right:0;height:780px;z-index:1;background:linear-gradient(180deg,rgba(11,18,48,0) 0%,rgba(11,18,48,0) 78%,rgba(11,18,48,.55) 88%,rgba(11,18,48,.96) 100%);pointer-events:none}

/* FLOATING NAV + BRAND (from mockup) */
.for-advertisers-page .float-nav{position:fixed;top:28px;right:32px;z-index:100;display:flex;align-items:center;gap:10px}
.for-advertisers-page .float-nav-link{padding:10px 18px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:13px;font-weight:600;color:var(--ink);text-decoration:none;letter-spacing:-.005em;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.for-advertisers-page .float-nav-link:hover{background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.for-advertisers-page .float-nav-cta{padding:10px 20px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid rgba(56,189,248,.35);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:var(--sky-bright);text-decoration:none;letter-spacing:-.005em;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3),0 0 24px rgba(56,189,248,.18)}
.for-advertisers-page .float-nav-cta:hover{background:rgba(11,18,48,.7);border-color:rgba(56,189,248,.6);transform:translateY(-2px);box-shadow:0 6px 28px rgba(0,0,0,.4),0 0 40px rgba(56,189,248,.35)}

/* Language pill */
.for-advertisers-page .float-lang-wrap{position:relative}
.for-advertisers-page .float-lang-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--ink);cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.for-advertisers-page .float-lang-pill:hover{background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.for-advertisers-page .float-lang-flag{font-size:15px;line-height:1}
.for-advertisers-page .float-lang-code{letter-spacing:.05em}
.for-advertisers-page .float-lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:200px;max-height:360px;overflow-y:auto;background:rgba(11,18,48,.95);border:1px solid var(--ink-10);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);backdrop-filter:blur(20px);padding:4px;z-index:200}
.for-advertisers-page .float-lang-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:transparent;color:var(--ink-60);text-align:left;transition:all .15s}
.for-advertisers-page .float-lang-item:hover{background:rgba(255,255,255,.05);color:var(--ink)}
.for-advertisers-page .float-lang-item.active{background:rgba(56,189,248,.12);color:var(--sky-bright);font-weight:700}
.for-advertisers-page .float-lang-item-flag{font-size:16px;line-height:1}
.for-advertisers-page .float-lang-item-name{flex:1}
.for-advertisers-page .float-lang-item-check{margin-left:auto;font-size:11px;color:var(--sky-bright)}
.for-advertisers-page .float-brand{position:fixed;top:28px;left:32px;z-index:100;display:flex;align-items:center;gap:12px;padding:10px 20px 10px 12px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);text-decoration:none;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.for-advertisers-page .float-brand:hover{background:rgba(11,18,48,.7);transform:translateY(-2px)}
.for-advertisers-page .float-brand-mark{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--sky),var(--indigo));display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(14,165,233,.45);position:relative}
.for-advertisers-page .float-brand-mark::before{content:'';position:absolute;inset:-2px;border-radius:10px;background:linear-gradient(135deg,var(--sky),var(--amber),var(--indigo));z-index:-1;opacity:.4;filter:blur(4px)}
.for-advertisers-page .float-brand-text{font-family:'Sora',sans-serif;font-size:15px;font-weight:900;letter-spacing:-.03em;color:var(--ink)}
.for-advertisers-page .float-brand-text em{color:var(--sky-bright);font-style:normal}

.for-advertisers-page .page-section{padding:140px 48px 100px;max-width:1320px;margin:0 auto;position:relative;z-index:2}
.for-advertisers-page .section-tag{display:flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;color:var(--ink-40);letter-spacing:.15em;text-transform:uppercase;margin-bottom:20px}
.for-advertisers-page .section-tag::before{content:'';width:32px;height:1px;background:var(--amber)}
.for-advertisers-page .section-h2{font-family:'Sora',sans-serif;font-size:clamp(48px,6vw,88px);font-weight:900;line-height:.95;letter-spacing:-.045em;margin-bottom:20px}
.for-advertisers-page .section-h2 .accent{display:block;font-weight:300;letter-spacing:-.035em;color:var(--ink);opacity:.75;line-height:1.1;padding-bottom:.08em}

.for-advertisers-page .hero-badge{position:absolute;top:194px;right:48px;z-index:50;display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:100px;background:linear-gradient(90deg,rgba(11,18,48,.92),rgba(23,37,84,.88));border:1px solid rgba(251,191,36,.45);backdrop-filter:blur(20px) saturate(180%);box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 40px rgba(251,191,36,.18)}
.for-advertisers-page .hero-badge-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--amber),var(--amber-bright));display:flex;align-items:center;justify-content:center;color:var(--cobalt-deepest);flex-shrink:0;box-shadow:0 0 12px rgba(251,191,36,.45)}
.for-advertisers-page .hero-badge-body{flex:1}
.for-advertisers-page .hero-badge-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-60);letter-spacing:.12em;text-transform:uppercase;margin-bottom:1px;white-space:nowrap}
.for-advertisers-page .hero-badge-value{font-family:'Sora',sans-serif;font-weight:800;font-size:14px;color:var(--ink);line-height:1.15;letter-spacing:-.015em;white-space:nowrap}
.for-advertisers-page .hero-badge-value .accent{color:var(--amber-bright);filter:drop-shadow(0 0 8px rgba(251,191,36,.4))}

.for-advertisers-page .hero-stage{position:relative;margin-top:48px;height:clamp(320px,40vw,520px);display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:none}
.for-advertisers-page .hero-stage-caption{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:10px;padding:10px 20px;border-radius:100px;background:rgba(11,18,48,.75);border:1px solid rgba(56,189,248,.35);backdrop-filter:blur(16px);font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:var(--sky-bright);box-shadow:0 10px 30px rgba(0,0,0,.4),0 0 30px rgba(56,189,248,.2)}
.for-advertisers-page .hero-stage-caption::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--sky-bright);box-shadow:0 0 10px var(--sky-bright);animation:faAdPulse 1.6s ease-in-out infinite}
@keyframes faAdPulse{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.3)}}

/* Outcome row — cards ALWAYS VISIBLE (no reveal animation) */
.for-advertisers-page .outcome-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:40px}
.for-advertisers-page .outcome-stat{padding:32px 22px 26px;border-radius:16px;background:linear-gradient(180deg,rgba(11,18,48,.88),rgba(11,18,48,.7));border:1px solid var(--ink-10);backdrop-filter:blur(16px);position:relative;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.25);transition:transform .4s cubic-bezier(.2,.8,.2,1),border-color .3s}
.for-advertisers-page .outcome-stat:hover{transform:translateY(-6px);border-color:var(--accent)}
.for-advertisers-page .outcome-stat::before{content:attr(data-n);position:absolute;top:-24px;right:-8px;font-family:'Sora',sans-serif;font-weight:900;font-size:140px;line-height:1;letter-spacing:-.08em;color:rgba(var(--accent-rgb),.08);pointer-events:none;user-select:none}
.for-advertisers-page .outcome-stat[data-c="amber"]{--accent:var(--amber);--accent-rgb:251,191,36}
.for-advertisers-page .outcome-stat[data-c="sky"]{--accent:var(--sky-bright);--accent-rgb:56,189,248}
.for-advertisers-page .outcome-stat[data-c="green"]{--accent:var(--green);--accent-rgb:52,211,153}
.for-advertisers-page .outcome-stat[data-c="indigo"]{--accent:var(--indigo-soft);--accent-rgb:129,140,248}
.for-advertisers-page .outcome-tag{display:inline-flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:.18em;text-transform:uppercase;margin-bottom:18px;padding:5px 10px;border-radius:4px;background:rgba(var(--accent-rgb),.1);border:1px solid rgba(var(--accent-rgb),.25);position:relative;z-index:2}
.for-advertisers-page .outcome-tag::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent)}
.for-advertisers-page .outcome-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-50);letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px;position:relative;z-index:2}
.for-advertisers-page .outcome-val{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(22px,2vw,28px);letter-spacing:-.025em;line-height:1.15;margin-bottom:14px;color:var(--accent);filter:drop-shadow(0 0 12px rgba(var(--accent-rgb),.35));position:relative;z-index:2}
.for-advertisers-page .outcome-sub{font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink-60);line-height:1.5;position:relative;z-index:2}
.for-advertisers-page .outcome-sub strong{color:var(--ink);font-weight:600}
.for-advertisers-page .outcome-rule{height:2px;background:rgba(var(--accent-rgb),.15);margin-top:18px;border-radius:2px;overflow:hidden;position:relative;z-index:2}
.for-advertisers-page .outcome-rule::after{content:'';position:absolute;top:0;left:0;bottom:0;width:100%;background:var(--accent);border-radius:2px;box-shadow:0 0 8px var(--accent)}

.for-advertisers-page .why-block{margin-top:80px}
.for-advertisers-page .why-h{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(28px,3vw,40px);letter-spacing:-.035em;line-height:1.1;margin-bottom:8px}
.for-advertisers-page .why-sub{font-size:16px;line-height:1.55;color:var(--ink-60);max-width:620px;margin-bottom:40px}
.for-advertisers-page .why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.for-advertisers-page .why-card{padding:32px;border-radius:20px;background:linear-gradient(180deg,rgba(11,18,48,.85),rgba(11,18,48,.72));border:1px solid var(--ink-10);backdrop-filter:blur(16px);position:relative;overflow:hidden;transition:transform .3s,border-color .3s,box-shadow .3s;display:flex;flex-direction:column;gap:16px;min-height:320px}
.for-advertisers-page .why-card:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 16px 50px rgba(0,0,0,.4),0 0 60px rgba(var(--accent-rgb),.15)}
.for-advertisers-page .why-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),transparent)}
.for-advertisers-page .why-card::after{content:'';position:absolute;top:-40%;right:-20%;width:400px;height:400px;background:radial-gradient(circle,rgba(var(--accent-rgb),.12),transparent 60%);filter:blur(40px);pointer-events:none;opacity:0;transition:opacity .5s}
.for-advertisers-page .why-card:hover::after{opacity:1}
.for-advertisers-page .why-card[data-c="amber"]{--accent:var(--amber);--accent-rgb:251,191,36}
.for-advertisers-page .why-card[data-c="sky"]{--accent:var(--sky-bright);--accent-rgb:56,189,248}
.for-advertisers-page .why-card[data-c="green"]{--accent:var(--green);--accent-rgb:52,211,153}
.for-advertisers-page .why-icon{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,rgba(var(--accent-rgb),.25),rgba(var(--accent-rgb),.08));border:1px solid rgba(var(--accent-rgb),.4);display:flex;align-items:center;justify-content:center;color:var(--accent);box-shadow:0 0 20px rgba(var(--accent-rgb),.18)}
.for-advertisers-page .why-title{font-family:'Sora',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--ink)}
.for-advertisers-page .why-desc{font-size:15px;line-height:1.6;color:var(--ink-70);margin-bottom:auto}
.for-advertisers-page .why-desc strong{color:var(--ink);font-weight:600}
.for-advertisers-page .why-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:100px;width:fit-content;background:rgba(var(--accent-rgb),.15);border:1px solid rgba(var(--accent-rgb),.4);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;color:var(--accent);font-weight:700;text-transform:uppercase}
.for-advertisers-page .why-pill::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent)}

.for-advertisers-page .roles-row{margin-top:80px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
.for-advertisers-page .role-card{padding:40px;border-radius:22px;background:linear-gradient(180deg,rgba(11,18,48,.88),rgba(11,18,48,.72));border:1px solid var(--ink-10);backdrop-filter:blur(16px);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:18px;min-height:380px;transition:transform .3s,border-color .3s,box-shadow .3s}
.for-advertisers-page .role-card:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 16px 50px rgba(0,0,0,.4),0 0 80px rgba(var(--accent-rgb),.18)}
.for-advertisers-page .role-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--accent),transparent)}
.for-advertisers-page .role-card::after{content:'';position:absolute;top:-40%;right:-20%;width:500px;height:500px;background:radial-gradient(circle,rgba(var(--accent-rgb),.16),transparent 60%);filter:blur(50px);pointer-events:none;opacity:.5;transition:opacity .5s}
.for-advertisers-page .role-card:hover::after{opacity:1}
.for-advertisers-page .role-card[data-c="green"]{--accent:var(--green-bright);--accent-rgb:110,231,183}
.for-advertisers-page .role-card[data-c="amber"]{--accent:var(--amber-bright);--accent-rgb:252,211,77}
.for-advertisers-page .role-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:100px;width:fit-content;background:rgba(var(--accent-rgb),.15);border:1px solid rgba(var(--accent-rgb),.4);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;color:var(--accent);font-weight:700;text-transform:uppercase;position:relative;z-index:2}
.for-advertisers-page .role-pill::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent)}
.for-advertisers-page .role-label{font-family:'Sora',sans-serif;font-weight:900;font-size:13px;letter-spacing:.18em;color:var(--accent);text-transform:uppercase;filter:drop-shadow(0 0 10px rgba(var(--accent-rgb),.35));position:relative;z-index:2}
.for-advertisers-page .role-title{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(24px,2.4vw,30px);letter-spacing:-.025em;line-height:1.15;color:var(--ink);position:relative;z-index:2}
.for-advertisers-page .role-desc{font-size:15px;line-height:1.6;color:var(--ink-70);position:relative;z-index:2}
.for-advertisers-page .role-desc strong{color:var(--ink);font-weight:700}
.for-advertisers-page .role-bullets{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;position:relative;z-index:2;margin-top:auto}
.for-advertisers-page .role-bullets li{font-size:14px;color:var(--ink-60);padding-left:22px;position:relative;line-height:1.4}
.for-advertisers-page .role-bullets li::before{content:'';position:absolute;left:0;top:6px;width:10px;height:10px;border-radius:50%;background:rgba(var(--accent-rgb),.2);border:1px solid var(--accent);box-shadow:0 0 6px rgba(var(--accent-rgb),.4)}

.for-advertisers-page .flow-band{margin-top:80px;padding:40px;border-radius:24px;background:linear-gradient(135deg,rgba(251,191,36,.08),rgba(56,189,248,.05),transparent),linear-gradient(180deg,rgba(11,18,48,.82),rgba(11,18,48,.72));border:1px solid rgba(251,191,36,.28);backdrop-filter:blur(16px);position:relative;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.3)}.for-advertisers-page .flow-band::before{content:'';position:absolute;top:-30%;left:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(251,191,36,.15),transparent 60%);filter:blur(40px);pointer-events:none}
.for-advertisers-page .flow-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px;position:relative;z-index:2}
.for-advertisers-page .flow-head-left{flex:1;min-width:280px}
.for-advertisers-page .flow-head-title{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(24px,2.6vw,32px);letter-spacing:-.03em;line-height:1.1;margin-bottom:6px}
.for-advertisers-page .flow-head-sub{font-size:14px;color:var(--ink-60);line-height:1.5}
.for-advertisers-page .flow-head-meta{display:flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.for-advertisers-page .flow-head-meta .flow-dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:faAdPulse 1.5s ease-out infinite}
.for-advertisers-page .flow-head-meta .flow-meta-text{color:var(--amber)}
.for-advertisers-page .flow-steps{display:grid;grid-template-columns:1fr 32px 1fr 32px 1fr 32px 1fr;gap:10px;align-items:stretch;position:relative;z-index:2}
.for-advertisers-page .flow-step{padding:22px 20px;border-radius:14px;background:rgba(11,18,48,.6);border:1px solid var(--ink-10);display:flex;flex-direction:column;gap:10px;transition:border-color .3s}
.for-advertisers-page .flow-step:hover{border-color:rgba(251,191,36,.35)}
.for-advertisers-page .flow-step-num{display:inline-flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--amber);font-weight:700}
.for-advertisers-page .flow-step-num-circle{width:22px;height:22px;border-radius:50%;background:rgba(251,191,36,.2);border:1px solid rgba(251,191,36,.45);display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:800;font-size:10px;color:var(--amber-bright)}
.for-advertisers-page .flow-step-title{font-family:'Sora',sans-serif;font-weight:800;font-size:16px;letter-spacing:-.02em;color:var(--ink)}
.for-advertisers-page .flow-step-desc{font-size:12px;color:var(--ink-60);line-height:1.5}
.for-advertisers-page .flow-arrow{display:flex;align-items:center;justify-content:center;color:var(--amber);opacity:.5}

.for-advertisers-page .footer-banner{margin-top:80px;padding:48px;border-radius:24px;background:linear-gradient(135deg,rgba(11,18,48,.85),rgba(0,0,0,.7)),#050816;border:1px solid rgba(251,191,36,.4);display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center;position:relative;overflow:hidden;backdrop-filter:blur(16px)}
.for-advertisers-page .footer-banner::before{content:'';position:absolute;top:-50%;left:20%;width:600px;height:600px;background:radial-gradient(circle,rgba(251,191,36,.35),transparent 55%);filter:blur(50px);pointer-events:none}
.for-advertisers-page .footer-banner-text{position:relative;z-index:2;font-family:'Sora',sans-serif;font-weight:300;font-size:clamp(22px,2.4vw,30px);color:var(--ink-70);line-height:1.3;max-width:540px;letter-spacing:-.02em}
.for-advertisers-page .footer-banner-text .emph{color:var(--amber-bright);font-weight:700;text-shadow:0 0 20px rgba(251,191,36,.6)}
.for-advertisers-page .footer-cta{position:relative;z-index:2;display:inline-flex;align-items:center;gap:12px;padding:20px 36px;border-radius:14px;background:linear-gradient(135deg,var(--amber-bright),var(--amber));color:var(--cobalt-deepest);font-family:'Sora',sans-serif;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-.01em;transition:transform .3s,box-shadow .3s;box-shadow:0 12px 40px rgba(251,191,36,.4);white-space:nowrap}
.for-advertisers-page .footer-cta:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 16px 50px rgba(251,191,36,.6)}

@media(max-width:1100px){
  .for-advertisers-page .outcome-row{grid-template-columns:repeat(2,1fr)}
  .for-advertisers-page .why-grid{grid-template-columns:1fr}
  .for-advertisers-page .roles-row{grid-template-columns:1fr}
  .for-advertisers-page .flow-steps{grid-template-columns:1fr;gap:16px}
  .for-advertisers-page .flow-arrow{transform:rotate(90deg)}
}
@media(max-width:900px){
  .for-advertisers-page .page-section{padding:120px 20px 80px}
  .for-advertisers-page .hero-badge{position:static;margin-top:24px;min-width:0;width:100%}
  .for-advertisers-page .hero-stage{height:clamp(240px,60vw,340px)}
  .for-advertisers-page .hero-stage-caption{font-size:9px;padding:8px 14px}
  .for-advertisers-page .outcome-row{grid-template-columns:1fr;margin-top:48px}
  .for-advertisers-page .footer-banner{grid-template-columns:1fr;gap:24px;padding:32px;text-align:center}
  .for-advertisers-page .footer-cta{justify-self:center}
  .for-advertisers-page .float-nav{top:16px;right:16px;gap:6px}
  .for-advertisers-page .float-nav-link{padding:8px 12px;font-size:11px}
  .for-advertisers-page .float-nav-cta{padding:8px 14px;font-size:11px}
  .for-advertisers-page .float-brand{top:16px;left:16px}
}
`;
