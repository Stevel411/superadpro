import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';

// 9x9 QR grid pattern from the mockup — rendered statically as JSX
var QR_ROWS = [
  '111111100',
  '100000101',
  '101110101',
  '101110101',
  '101110101',
  '100000101',
  '111111101',
  '000000000',
  '110110111',
];

export default function Tools() {
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

  return (
    <>
      <style>{CSS_TOOLS}</style>
      <div className="tools-page">
        <div className="page-bg"></div>
        <div className="page-bg-overlay"></div>

        {/* Floating brand */}
        <Link to="/" className="float-brand">
          <div className="float-brand-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon points="9,5 9,19 20,12" fill="#fff"/>
            </svg>
          </div>
          <span className="float-brand-text">SuperAd<em>Pro</em></span>
        </Link>

        {/* Floating nav */}
        <div className="float-nav">
          <Link to="/" className="float-nav-link">{t('tools.navHome')}</Link>
          <Link to="/how-it-works" className="float-nav-link">{t('tools.navHow')}</Link>
          <Link to="/earn" className="float-nav-link">{t('tools.navIncome')}</Link>

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

          <Link to="/login" className="float-nav-link">{t('tools.navSignin')}</Link>
          <Link to="/register" className="float-nav-cta">{t('tools.navCta')}</Link>
        </div>

        <section className="page-section">

          {/* Hero badge */}
          <div className="hero-badge">
            <div className="hero-badge-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="hero-badge-body">
              <div className="hero-badge-label">{t('tools.heroBadgeLabel')}</div>
              <div className="hero-badge-value" dangerouslySetInnerHTML={{ __html: t('tools.heroBadgeValue') }}></div>
            </div>
          </div>

          <div className="section-tag">{t('tools.sectionTag')}</div>
          <h2 className="section-h2">
            {t('tools.headlineLine1')}<br/>
            <span className="accent">{t('tools.headlineLine2')}</span>
          </h2>

          {/* FEATURED: Creative Studio */}
          <div className="feature-hero">
            <div className="feature-hero-left">
              <div className="feature-chip">
                <span className="feature-chip-dot"></span>
                {t('tools.featureChip')}
              </div>
              <h3 dangerouslySetInnerHTML={{ __html: t('tools.featureH3') }}></h3>
              <p>{t('tools.featureP')}</p>
              <div className="feature-specs">
                <div className="spec">
                  <div className="spec-val">4</div>
                  <div className="spec-label">{t('tools.spec1Label')}</div>
                </div>
                <div className="spec">
                  <div className="spec-val">12+</div>
                  <div className="spec-label">{t('tools.spec2Label')}</div>
                </div>
                <div className="spec">
                  <div className="spec-val">$8</div>
                  <div className="spec-label">{t('tools.spec3Label')}</div>
                </div>
              </div>
              <Link to="/register" className="feature-link">
                {t('tools.featureCta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>

            <div className="studio-ui">
              <div className="studio-header">
                <div className="studio-dot"></div>
                <div className="studio-dot"></div>
                <div className="studio-dot"></div>
                <div className="studio-title">creative-studio.superadpro.com</div>
              </div>
              <div className="studio-body">
                <div className="studio-side">
                  <div className="side-item"><span className="sd"></span>{t('tools.studioTabVideo')}</div>
                  <div className="side-item active"><span className="sd"></span>{t('tools.studioTabImages')}</div>
                  <div className="side-item"><span className="sd"></span>{t('tools.studioTabMusic')}</div>
                  <div className="side-item"><span className="sd"></span>{t('tools.studioTabVoice')}</div>
                  <div className="side-item"><span className="sd"></span>{t('tools.studioTabLipSync')}</div>
                  <div className="side-item"><span className="sd"></span>{t('tools.studioTabGallery')}</div>
                </div>
                <div className="studio-canvas">
                  <div className="prompt-bar">
                    <span className="prompt-label">&gt;</span>
                    <span>{t('tools.studioPrompt')}<span className="cursor"></span></span>
                  </div>
                  <div className="generated-grid">
                    <div className="gen-card gen-1">
                      <div className="gen-1-sun"></div>
                      <div className="badge">v1</div>
                      <div className="select-btn">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                    <div className="gen-card gen-2">
                      <div className="gen-2-glint"></div>
                      <div className="badge">v2</div>
                      <div className="select-btn">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                    <div className="gen-card gen-3">
                      <div className="gen-3-stars"></div>
                      <div className="badge">v3</div>
                      <div className="select-btn">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="studio-footer">
                <span>{t('tools.studioFooterModel')}</span>
                <span className="credits"><span className="diamond">◆</span>{t('tools.studioFooterCredits')}</span>
              </div>
            </div>
          </div>

          {/* TOOLS GRID */}
          <div className="tools-grid">

            {/* SuperPages */}
            <div className="tool" data-accent="sky">
              <div className="tool-header">
                <div className="tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <circle cx="7" cy="7" r="0.5" fill="currentColor"/>
                  </svg>
                </div>
                <div className="tool-name">{t('tools.t1Name')}</div>
              </div>
              <div className="tool-desc" dangerouslySetInnerHTML={{ __html: t('tools.t1Desc') }}></div>
              <div className="tool-preview">
                <div className="pv-superpages">
                  <div className="sp-blocks">
                    <div className="sp-block-icon">H1</div>
                    <div className="sp-block-icon">P</div>
                    <div className="sp-block-icon dragging">IMG</div>
                    <div className="sp-block-icon">BTN</div>
                  </div>
                  <div className="sp-canvas">
                    <div className="sp-item sp-h"></div>
                    <div className="sp-item sp-p"></div>
                    <div className="sp-item sp-p s"></div>
                    <div className="sp-item sp-img"></div>
                    <div className="sp-item sp-form">your@email.com</div>
                    <div className="sp-item sp-btn"></div>
                  </div>
                  <div className="sp-style">
                    <div className="sp-color a"></div>
                    <div className="sp-color b"></div>
                    <div className="sp-color c"></div>
                  </div>
                </div>
              </div>
              <div className="tool-footer">
                <Link to="/register" className="tool-link">{t('tools.openLabel')} <span className="arrow">→</span></Link>
                <div className="tool-meta" dangerouslySetInnerHTML={{ __html: t('tools.t1Meta') }}></div>
              </div>
            </div>

            {/* LinkHub */}
            <div className="tool" data-accent="indigo">
              <div className="tool-header">
                <div className="tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                  </svg>
                </div>
                <div className="tool-name">{t('tools.t2Name')}</div>
              </div>
              <div className="tool-desc" dangerouslySetInnerHTML={{ __html: t('tools.t2Desc') }}></div>
              <div className="tool-preview">
                <div className="pv-linkhub">
                  <div className="lh-phone">
                    <div className="lh-avatar"></div>
                    <div className="lh-name"></div>
                    <div className="lh-bio"></div>
                    <div className="lh-link primary">{t('tools.lhLink1')}</div>
                    <div className="lh-link">{t('tools.lhLink2')}</div>
                    <div className="lh-link">{t('tools.lhLink3')}</div>
                  </div>
                  <div className="lh-stats">
                    <div className="lh-stat">
                      <div className="lh-stat-label">{t('tools.lhStatClicks')}</div>
                      <div className="lh-stat-val">8,472</div>
                      <div className="lh-stat-delta">{t('tools.lhStatClicksDelta')}</div>
                    </div>
                    <div className="lh-stat">
                      <div className="lh-stat-label">{t('tools.lhStatCtr')}</div>
                      <div className="lh-stat-val">34.2%</div>
                      <div className="lh-stat-delta">{t('tools.lhStatCtrDelta')}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="tool-footer">
                <Link to="/register" className="tool-link">{t('tools.openLabel')} <span className="arrow">→</span></Link>
                <div className="tool-meta" dangerouslySetInnerHTML={{ __html: t('tools.t2Meta') }}></div>
              </div>
            </div>

            {/* Link Tools */}
            <div className="tool" data-accent="amber">
              <div className="tool-header">
                <div className="tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.72"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.72-1.72"/>
                  </svg>
                </div>
                <div className="tool-name">{t('tools.t3Name')}</div>
              </div>
              <div className="tool-desc" dangerouslySetInnerHTML={{ __html: t('tools.t3Desc') }}></div>
              <div className="tool-preview">
                <div className="pv-linktools">
                  <div className="lt-source">
                    sap.link/promo <span className="lt-source-arrow">↻</span> {t('tools.ltRotating')}
                  </div>
                  <div className="lt-rotator">
                    <div className="lt-dest d1">
                      <div className="lt-dest-num">01</div>
                      <div className="lt-dest-url">offer-a.com/start</div>
                      <div className="lt-dest-pct">45%</div>
                    </div>
                    <div className="lt-dest d2">
                      <div className="lt-dest-num">02</div>
                      <div className="lt-dest-url">offer-b.com/launch</div>
                      <div className="lt-dest-pct">35%</div>
                    </div>
                    <div className="lt-dest d3">
                      <div className="lt-dest-num">03</div>
                      <div className="lt-dest-url">offer-c.com/trial</div>
                      <div className="lt-dest-pct">20%</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="tool-footer">
                <Link to="/register" className="tool-link">{t('tools.openLabel')} <span className="arrow">→</span></Link>
                <div className="tool-meta" dangerouslySetInnerHTML={{ __html: t('tools.t3Meta') }}></div>
              </div>
            </div>

            {/* SuperLeads · CRM */}
            <div className="tool" data-accent="green">
              <div className="tool-header">
                <div className="tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <div className="tool-name">{t('tools.t4Name')}</div>
              </div>
              <div className="tool-desc" dangerouslySetInnerHTML={{ __html: t('tools.t4Desc') }}></div>
              <div className="tool-preview">
                <div className="pv-leads">
                  <div className="lead-head">
                    <span></span><span>{t('tools.leadColLead')}</span><span>{t('tools.leadColTag')}</span><span></span>
                  </div>
                  <div className="lead-row hot">
                    <div className="lead-avatar a1">SK</div>
                    <div className="lead-name">Sara Khan</div>
                    <div className="lead-tag hot">{t('tools.leadTagHot')}</div>
                    <div className="lead-dot"></div>
                  </div>
                  <div className="lead-row">
                    <div className="lead-avatar a2">MT</div>
                    <div className="lead-name">Marco Toma</div>
                    <div className="lead-tag new">{t('tools.leadTagNew')}</div>
                    <div className="lead-dot"></div>
                  </div>
                  <div className="lead-row">
                    <div className="lead-avatar a3">RB</div>
                    <div className="lead-name">Ray Benjamin</div>
                    <div className="lead-tag col">{t('tools.leadTagCold')}</div>
                    <div className="lead-dot off"></div>
                  </div>
                  <div className="lead-row">
                    <div className="lead-avatar a4">JP</div>
                    <div className="lead-name">Jess Perez</div>
                    <div className="lead-tag new">{t('tools.leadTagNew')}</div>
                    <div className="lead-dot"></div>
                  </div>
                </div>
              </div>
              <div className="tool-footer">
                <Link to="/register" className="tool-link">{t('tools.openLabel')} <span className="arrow">→</span></Link>
                <div className="tool-meta" dangerouslySetInnerHTML={{ __html: t('tools.t4Meta') }}></div>
              </div>
            </div>

            {/* SuperDeck */}
            <div className="tool" data-accent="pink">
              <div className="tool-header">
                <div className="tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                    <line x1="7" y1="18" x2="7" y2="22"/>
                    <line x1="17" y1="18" x2="17" y2="22"/>
                  </svg>
                </div>
                <div className="tool-name">{t('tools.t5Name')}</div>
              </div>
              <div className="tool-desc" dangerouslySetInnerHTML={{ __html: t('tools.t5Desc') }}></div>
              <div className="tool-preview">
                <div className="pv-deck">
                  <div className="deck-main">
                    <div className="deck-main-h">{t('tools.deckMainH')} <span className="gr">{t('tools.deckMainHSub')}</span></div>
                    <div className="deck-main-sub">{t('tools.deckMainSub')}</div>
                    <div className="deck-main-body">
                      <div className="deck-stat">
                        <div className="deck-stat-v">+187%</div>
                        <div className="deck-stat-l">{t('tools.deckStat1Label')}</div>
                      </div>
                      <div className="deck-stat">
                        <div className="deck-stat-v">$2.4M</div>
                        <div className="deck-stat-l">{t('tools.deckStat2Label')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="deck-rail">
                    {['01','02','03','04','05'].map(function(n, i) {
                      return (
                        <div key={n} className={'deck-thumb' + (i === 1 ? ' active' : '')}>
                          <div className="deck-thumb-num">{n}</div>
                          <div className="deck-thumb-h"></div>
                          <div className="deck-thumb-p"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="tool-footer">
                <Link to="/register" className="tool-link">{t('tools.openLabel')} <span className="arrow">→</span></Link>
                <div className="tool-meta" dangerouslySetInnerHTML={{ __html: t('tools.t5Meta') }}></div>
              </div>
            </div>

            {/* SuperLink */}
            <div className="tool" data-accent="green">
              <div className="tool-header">
                <div className="tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 17H7A5 5 0 017 7h2"/>
                    <path d="M15 7h2a5 5 0 010 10h-2"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </div>
                <div className="tool-name">{t('tools.t6Name')}</div>
              </div>
              <div className="tool-desc" dangerouslySetInnerHTML={{ __html: t('tools.t6Desc') }}></div>
              <div className="tool-preview">
                <div className="pv-link">
                  <div className="sl-left">
                    <div className="sl-long">https://partner.example.com/ref?utm_source=...</div>
                    <div className="sl-arrow">↓</div>
                    <div className="sl-short">
                      sap.link/offer
                      <span className="sl-copy">{t('tools.slCopy')}</span>
                    </div>
                  </div>
                  <div className="sl-qr">
                    <div className="sl-qr-grid">
                      {QR_ROWS.flatMap(function(row, r) {
                        return row.split('').map(function(bit, c) {
                          return <div key={r + '-' + c} className={'sl-qr-cell' + (bit === '0' ? ' off' : '')}></div>;
                        });
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="tool-footer">
                <Link to="/register" className="tool-link">{t('tools.openLabel')} <span className="arrow">→</span></Link>
                <div className="tool-meta" dangerouslySetInnerHTML={{ __html: t('tools.t6Meta') }}></div>
              </div>
            </div>

          </div>

          <div className="footer-banner">
            <div className="footer-banner-text">
              {t('tools.footerLine1')}<br/>
              <span className="emph">{t('tools.footerLine2')}</span>
            </div>
            <Link to="/register" className="footer-cta">
              {t('tools.footerCta')}
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

// Scoped CSS — every selector prefixed with .tools-page, all @keyframes prefixed with "tl"
var CSS_TOOLS = `.tools-page {
--cobalt-deepest: #0b1230;
--cobalt-deep: #172554;
--sky: #0ea5e9;
--sky-bright: #38bdf8;
--sky-pale: #7dd3fc;
--indigo: #6366f1;
--indigo-soft: #818cf8;
--purple: #a855f7;
--purple-soft: #c084fc;
--amber: #fbbf24;
--amber-bright: #fcd34d;
--amber-soft: #fde68a;
--green: #34d399;
--green-bright: #6ee7b7;
--pink: #ec4899;
--pink-soft: #f9a8d4;
--ink: #fafbff;
--ink-70: rgba(250, 251, 255, 0.7);
--ink-60: rgba(250, 251, 255, 0.6);
--ink-50: rgba(250, 251, 255, 0.5);
--ink-40: rgba(250, 251, 255, 0.4);
--ink-20: rgba(250, 251, 255, 0.2);
--ink-10: rgba(250, 251, 255, 0.1);
--ink-05: rgba(250, 251, 255, 0.05);
}
.tools-page * { box-sizing: border-box; margin: 0; padding: 0; }
.tools-page, .tools-page {
background: transparent;
color: var(--ink);
font-family: 'DM Sans', sans-serif;
overflow-x: hidden;
min-height: 100vh;
}
.tools-page .page-bg {
position: fixed;
inset: 0;
z-index: -2;
background-image: url("/static/images/earn-hero-bg.jpg");
background-size: cover;
background-position: center top;
background-repeat: no-repeat;
background-attachment: fixed;
}
.tools-page .page-bg-overlay {
position: fixed;
inset: 0;
z-index: -1;
background: linear-gradient(180deg,
rgba(11, 18, 48, 0.35) 0%,
rgba(11, 18, 48, 0.55) 50%,
rgba(11, 18, 48, 0.82) 100%);
pointer-events: none;
}
.tools-page::before {
content: '';
position: fixed;
inset: 0;
pointer-events: none;
z-index: 500;
opacity: 0.04;
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
mix-blend-mode: overlay;
}
.tools-page .float-nav {
position: fixed; top: 28px; right: 32px; z-index: 100;
display: flex; align-items: center; gap: 10px;
}
.tools-page .float-nav-link {
padding: 10px 18px; border-radius: 100px;
background: rgba(11, 18, 48, 0.5); border: 1px solid var(--ink-10);
backdrop-filter: blur(18px) saturate(180%);
font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
color: var(--ink); text-decoration: none;
letter-spacing: -0.005em; transition: all 0.25s;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.tools-page .float-nav-link:hover { background: rgba(11, 18, 48, 0.7); border-color: var(--ink-20); transform: translateY(-2px); }
.tools-page .float-nav-cta {
padding: 10px 20px; border-radius: 100px;
background: var(--ink); color: var(--cobalt-deepest);
font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
text-decoration: none; transition: all 0.25s;
box-shadow: 0 8px 32px rgba(250, 251, 255, 0.25);
}
.tools-page .float-nav-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(250, 251, 255, 0.4); }
.tools-page .float-brand {
position: fixed; top: 28px; left: 32px; z-index: 100;
display: flex; align-items: center; gap: 12px;
padding: 10px 20px 10px 12px; border-radius: 100px;
background: rgba(11, 18, 48, 0.5); border: 1px solid var(--ink-10);
backdrop-filter: blur(18px) saturate(180%);
text-decoration: none; transition: all 0.25s;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.tools-page .float-brand:hover { background: rgba(11, 18, 48, 0.7); transform: translateY(-2px); }
.tools-page .float-brand-mark {
width: 30px; height: 30px; border-radius: 8px;
background: linear-gradient(135deg, var(--sky), var(--indigo));
display: flex; align-items: center; justify-content: center;
box-shadow: 0 0 16px rgba(14, 165, 233, 0.45); position: relative;
}
.tools-page .float-brand-mark::before {
content: ''; position: absolute; inset: -2px; border-radius: 10px;
background: linear-gradient(135deg, var(--sky), var(--amber), var(--indigo));
z-index: -1; opacity: 0.4; filter: blur(4px);
}
.tools-page .float-brand-text {
font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 900;
letter-spacing: -0.03em; color: var(--ink);
}
.tools-page .float-brand-text em { color: var(--sky-bright); font-style: normal; }
.tools-page .page-section {
padding: 140px 48px 100px;
max-width: 1320px; margin: 0 auto;
position: relative;
}
.tools-page .section-tag {
display: flex; align-items: center; gap: 14px;
font-family: 'JetBrains Mono', monospace; font-size: 11px;
font-weight: 500; color: var(--ink-40);
letter-spacing: 0.15em; text-transform: uppercase;
margin-bottom: 20px;
}
.tools-page .section-tag::before { content: ''; width: 32px; height: 1px; background: var(--sky-bright); }
.tools-page .section-h2 {
font-family: 'Sora', sans-serif; font-size: clamp(40px, 5.2vw, 76px);
font-weight: 900; line-height: 0.95; letter-spacing: -0.045em;
margin-bottom: 20px;
}
.tools-page .section-h2 .accent {
display: block; font-weight: 300; letter-spacing: -0.035em;
color: var(--ink); opacity: 0.75;
}
.tools-page .hero-badge {
position: absolute;
top: 180px;
right: 48px;
z-index: 50;
display: flex; align-items: center; gap: 18px;
padding: 20px 26px;
border-radius: 24px;
background: linear-gradient(90deg, rgba(11, 18, 48, 0.92), rgba(23, 37, 84, 0.88));
border: 1px solid rgba(56, 189, 248, 0.4);
backdrop-filter: blur(20px) saturate(180%);
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 60px rgba(56, 189, 248, 0.22);
min-width: 360px;
}
.tools-page .hero-badge-icon {
width: 44px; height: 44px; border-radius: 12px;
background: linear-gradient(135deg, var(--sky), var(--sky-bright));
display: flex; align-items: center; justify-content: center;
color: var(--cobalt-deepest); flex-shrink: 0;
box-shadow: 0 0 16px rgba(56, 189, 248, 0.55);
}
.tools-page .hero-badge-body { flex: 1; }
.tools-page .hero-badge-label {
font-family: 'JetBrains Mono', monospace; font-size: 10px;
color: var(--ink-60); letter-spacing: 0.12em;
text-transform: uppercase; margin-bottom: 4px;
}
.tools-page .hero-badge-value {
font-family: 'Sora', sans-serif; font-weight: 900;
font-size: 22px; color: var(--ink);
line-height: 1.1; letter-spacing: -0.02em;
}
.tools-page .hero-badge-value .accent {
color: var(--sky-bright);
filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.4));
}
.tools-page .feature-hero {
display: grid;
grid-template-columns: 1fr 1.15fr;
gap: 40px;
margin-top: 88px;
padding: 40px;
border-radius: 24px;
background:
linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.05), transparent),
linear-gradient(180deg, rgba(11, 18, 48, 0.82), rgba(11, 18, 48, 0.72));
border: 1px solid rgba(168, 85, 247, 0.25);
backdrop-filter: blur(16px);
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
position: relative;
overflow: hidden;
}
.tools-page .feature-hero::before {
content: '';
position: absolute;
top: -30%; left: -20%;
width: 500px; height: 500px;
background: radial-gradient(circle, rgba(168, 85, 247, 0.18), transparent 60%);
filter: blur(40px);
pointer-events: none;
}
.tools-page .feature-hero::after {
content: '';
position: absolute;
bottom: -30%; right: -20%;
width: 500px; height: 500px;
background: radial-gradient(circle, rgba(56, 189, 248, 0.14), transparent 60%);
filter: blur(40px);
pointer-events: none;
}
.tools-page .feature-hero-left {
position: relative; z-index: 2;
display: flex; flex-direction: column; justify-content: center;
}
.tools-page .feature-chip {
display: inline-flex; align-items: center; gap: 8px;
padding: 6px 14px;
border-radius: 100px;
background: rgba(168, 85, 247, 0.15);
border: 1px solid rgba(168, 85, 247, 0.35);
font-family: 'JetBrains Mono', monospace; font-size: 10px;
color: var(--purple-soft);
letter-spacing: 0.15em; text-transform: uppercase;
font-weight: 500;
width: fit-content;
margin-bottom: 20px;
}
.tools-page .feature-chip-dot {
width: 6px; height: 6px; border-radius: 50%;
background: var(--purple-soft);
box-shadow: 0 0 8px var(--purple-soft);
animation: tlChipPulse 1.8s ease-in-out infinite;
}
@keyframes tlChipPulse {
0%, 100% { opacity: 1; }
50% { opacity: 0.4; }
}
.tools-page .feature-hero h3 {
font-family: 'Sora', sans-serif;
font-size: clamp(28px, 3.4vw, 44px);
font-weight: 900;
line-height: 1.05;
letter-spacing: -0.035em;
margin-bottom: 16px;
}
.tools-page .feature-hero h3 .accent {
background: linear-gradient(135deg, var(--purple-soft), var(--sky-bright));
-webkit-background-clip: text;
background-clip: text;
-webkit-text-fill-color: transparent;
font-weight: 900;
}
.tools-page .feature-hero p {
font-size: 15px; line-height: 1.6;
color: var(--ink-70);
margin-bottom: 24px;
max-width: 460px;
}
.tools-page .feature-specs {
display: flex; gap: 28px; margin-bottom: 24px;
}
.tools-page .spec-val {
font-family: 'Sora', sans-serif;
font-size: 28px; font-weight: 900;
color: var(--ink); letter-spacing: -0.03em;
line-height: 1;
}
.tools-page .spec-label {
font-family: 'JetBrains Mono', monospace;
font-size: 10px; color: var(--ink-50);
letter-spacing: 0.1em; text-transform: uppercase;
margin-top: 4px;
}
.tools-page .feature-link {
display: inline-flex; align-items: center; gap: 8px;
font-family: 'Sora', sans-serif; font-size: 14px;
font-weight: 700; color: var(--ink);
text-decoration: none;
padding: 12px 20px;
border-radius: 100px;
background: rgba(168, 85, 247, 0.2);
border: 1px solid rgba(168, 85, 247, 0.4);
transition: all 0.25s;
width: fit-content;
}
.tools-page .feature-link:hover {
background: rgba(168, 85, 247, 0.35);
transform: translateY(-2px);
box-shadow: 0 10px 30px rgba(168, 85, 247, 0.3);
}
.tools-page .studio-ui {
position: relative; z-index: 2;
background: rgba(11, 18, 48, 0.85);
border: 1px solid var(--ink-10);
border-radius: 14px;
overflow: hidden;
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
display: flex; flex-direction: column;
}
.tools-page .studio-header {
display: flex; align-items: center; gap: 8px;
padding: 12px 16px;
border-bottom: 1px solid var(--ink-10);
background: rgba(11, 18, 48, 0.9);
}
.tools-page .studio-dot {
width: 10px; height: 10px; border-radius: 50%;
background: var(--ink-20);
}
.tools-page .studio-dot:nth-child(1) { background: #ef4444; }
.tools-page .studio-dot:nth-child(2) { background: #f59e0b; }
.tools-page .studio-dot:nth-child(3) { background: #10b981; }
.tools-page .studio-title {
margin-left: 12px;
font-family: 'JetBrains Mono', monospace;
font-size: 11px; color: var(--ink-50);
}
.tools-page .studio-body {
display: grid;
grid-template-columns: 120px 1fr;
min-height: 260px;
}
.tools-page .studio-side {
background: rgba(0, 0, 0, 0.2);
border-right: 1px solid var(--ink-10);
padding: 12px 8px;
display: flex; flex-direction: column; gap: 4px;
}
.tools-page .side-item {
display: flex; align-items: center; gap: 8px;
padding: 7px 10px; border-radius: 8px;
font-family: 'Sora', sans-serif; font-size: 11px;
font-weight: 500; color: var(--ink-60);
cursor: pointer;
}
.tools-page .side-item.active {
background: rgba(168, 85, 247, 0.2);
color: var(--ink);
}
.tools-page .side-item .sd {
width: 4px; height: 4px; border-radius: 50%;
background: var(--ink-40);
}
.tools-page .side-item.active .sd { background: var(--purple-soft); }
.tools-page .studio-canvas {
padding: 16px;
background: rgba(0, 0, 0, 0.15);
display: flex; flex-direction: column; gap: 12px;
}
.tools-page .prompt-bar {
display: flex; align-items: center; gap: 8px;
padding: 10px 14px;
background: rgba(0, 0, 0, 0.4);
border: 1px solid var(--ink-10);
border-radius: 8px;
font-family: 'JetBrains Mono', monospace;
font-size: 11px; color: var(--ink-70);
}
.tools-page .prompt-label { color: var(--purple-soft); font-weight: 700; }
.tools-page .cursor {
display: inline-block; width: 6px; height: 12px;
background: var(--purple-soft);
margin-left: 2px;
animation: tlBlink 1s infinite;
vertical-align: middle;
}
@keyframes tlBlink {
0%, 50% { opacity: 1; }
51%, 100% { opacity: 0; }
}
.tools-page .generated-grid {
display: grid; grid-template-columns: 1fr 1fr 1fr;
gap: 8px;
flex: 1;
}
.tools-page .gen-card {
aspect-ratio: 1;
border-radius: 8px;
position: relative;
overflow: hidden;
border: 1px solid var(--ink-10);
}
.tools-page .gen-1 {
background:
radial-gradient(ellipse at 65% 85%, rgba(236, 72, 153, 0.45) 0%, transparent 45%),
radial-gradient(circle at 72% 38%, rgba(253, 224, 71, 0.55) 0%, transparent 18%),
linear-gradient(180deg, #4c1d95 0%, #831843 38%, #fb923c 72%, #fde047 100%);
position: relative;
overflow: hidden;
}
.tools-page .gen-1::after {
content: '';
position: absolute;
left: 0; right: 0; bottom: 0;
height: 40%;
background:
linear-gradient(180deg, transparent, rgba(11, 18, 48, 0.9) 60%),
linear-gradient(180deg, rgba(11, 18, 48, 0.3), rgba(11, 18, 48, 0.95));
clip-path: polygon(
0% 60%, 8% 60%, 8% 40%, 14% 40%, 14% 55%, 22% 55%, 22% 30%, 28% 30%, 28% 20%,
32% 20%, 32% 50%, 40% 50%, 40% 35%, 48% 35%, 48% 45%, 56% 45%, 56% 25%,
62% 25%, 62% 15%, 68% 15%, 68% 40%, 76% 40%, 76% 55%, 84% 55%, 84% 30%,
92% 30%, 92% 50%, 100% 50%, 100% 100%, 0% 100%
);
z-index: 1;
}
.tools-page .gen-1-sun {
position: absolute;
top: 32%; left: 68%;
width: 18%; height: 18%;
border-radius: 50%;
background: radial-gradient(circle, rgba(253, 224, 71, 0.95), rgba(251, 146, 60, 0.7) 55%, transparent 70%);
filter: blur(1px);
box-shadow: 0 0 30px rgba(253, 224, 71, 0.6);
animation: tlSunPulse1 3.2s ease-in-out infinite;
z-index: 0;
}
@keyframes tlSunPulse1 {
0%, 100% { transform: scale(1); opacity: 0.95; }
50% { transform: scale(1.12); opacity: 1; }
}
.tools-page .gen-2 {
background:
radial-gradient(circle at 40% 30%, rgba(251, 191, 36, 0.4) 0%, transparent 50%),
linear-gradient(180deg, #7c2d12 0%, #c2410c 30%, #f97316 55%, #fbbf24 85%, #fde68a 100%);
position: relative;
overflow: hidden;
}
.tools-page .gen-2::before {
content: '';
position: absolute;
top: 15%; left: -20%;
width: 140%; height: 30%;
background:
radial-gradient(ellipse at 30% 50%, rgba(255, 255, 255, 0.15), transparent 40%),
radial-gradient(ellipse at 60% 50%, rgba(255, 255, 255, 0.2), transparent 45%);
filter: blur(3px);
animation: tlCloudDrift2 8s linear infinite;
z-index: 1;
pointer-events: none;
}
@keyframes tlCloudDrift2 {
0% { transform: translateX(0); }
100% { transform: translateX(18%); }
}
.tools-page .gen-2::after {
content: '';
position: absolute;
left: 0; right: 0; bottom: 0;
height: 42%;
background: linear-gradient(180deg, transparent, rgba(11, 18, 48, 0.85) 50%, rgba(11, 18, 48, 0.98));
clip-path: polygon(
0% 55%, 6% 55%, 6% 30%, 12% 30%, 12% 45%, 18% 45%, 18% 15%, 22% 15%, 22% 8%,
26% 8%, 26% 50%, 34% 50%, 34% 25%, 42% 25%, 42% 40%, 50% 40%, 50% 20%,
58% 20%, 58% 35%, 66% 35%, 66% 50%, 72% 50%, 72% 18%, 76% 18%, 76% 10%,
80% 10%, 80% 45%, 88% 45%, 88% 30%, 96% 30%, 96% 55%, 100% 55%, 100% 100%, 0% 100%
);
z-index: 2;
}
.tools-page .gen-2-glint {
position: absolute;
bottom: 20%; left: 62%;
width: 3px; height: 3px;
background: var(--amber-bright);
border-radius: 50%;
box-shadow: 0 0 8px var(--amber-bright), 0 0 16px rgba(251, 191, 36, 0.5);
animation: tlGlint2 2.5s ease-in-out infinite;
z-index: 3;
}
@keyframes tlGlint2 {
0%, 40%, 100% { opacity: 0; transform: scale(0.5); }
20% { opacity: 1; transform: scale(1.2); }
}
.tools-page .gen-3 {
background:
radial-gradient(ellipse at 50% 100%, rgba(236, 72, 153, 0.25) 0%, transparent 45%),
linear-gradient(180deg, #0f172a 0%, #1e1b4b 35%, #4c1d95 65%, #be185d 100%);
position: relative;
overflow: hidden;
}
.tools-page .gen-3-stars {
position: absolute;
inset: 0;
background-image:
radial-gradient(circle at 15% 20%, white 0.8px, transparent 1.2px),
radial-gradient(circle at 35% 15%, white 0.6px, transparent 1px),
radial-gradient(circle at 55% 25%, white 1px, transparent 1.4px),
radial-gradient(circle at 75% 18%, white 0.7px, transparent 1.1px),
radial-gradient(circle at 85% 30%, white 0.8px, transparent 1.2px),
radial-gradient(circle at 22% 35%, white 0.5px, transparent 0.9px),
radial-gradient(circle at 68% 40%, white 0.6px, transparent 1px);
animation: tlTwinkle3 3s ease-in-out infinite;
z-index: 0;
}
@keyframes tlTwinkle3 {
0%, 100% { opacity: 0.5; }
50% { opacity: 1; }
}
.tools-page .gen-3::after {
content: '';
position: absolute;
left: 0; right: 0; bottom: 0;
height: 50%;
background:
radial-gradient(circle at 10% 78%, rgba(56, 189, 248, 0.6) 0.5%, transparent 2%),
radial-gradient(circle at 20% 85%, rgba(251, 191, 36, 0.7) 0.5%, transparent 2%),
radial-gradient(circle at 30% 72%, rgba(236, 72, 153, 0.7) 0.5%, transparent 2%),
radial-gradient(circle at 45% 80%, rgba(253, 224, 71, 0.8) 0.5%, transparent 2%),
radial-gradient(circle at 55% 68%, rgba(56, 189, 248, 0.6) 0.5%, transparent 2%),
radial-gradient(circle at 68% 88%, rgba(236, 72, 153, 0.6) 0.5%, transparent 2%),
radial-gradient(circle at 78% 72%, rgba(251, 191, 36, 0.8) 0.5%, transparent 2%),
radial-gradient(circle at 90% 82%, rgba(56, 189, 248, 0.7) 0.5%, transparent 2%),
linear-gradient(180deg, transparent, rgba(5, 8, 22, 0.92) 55%, rgba(5, 8, 22, 0.99));
clip-path: polygon(
0% 55%, 5% 55%, 5% 35%, 10% 35%, 10% 50%, 16% 50%, 16% 22%, 20% 22%, 20% 15%,
24% 15%, 24% 45%, 30% 45%, 30% 30%, 36% 30%, 36% 42%, 44% 42%, 44% 25%,
50% 25%, 50% 10%, 54% 10%, 54% 40%, 60% 40%, 60% 30%, 66% 30%, 66% 55%,
72% 55%, 72% 35%, 78% 35%, 78% 20%, 82% 20%, 82% 48%, 88% 48%, 88% 32%,
94% 32%, 94% 50%, 100% 50%, 100% 100%, 0% 100%
);
z-index: 1;
}
.tools-page .gen-card::before {
content: '';
position: absolute;
inset: 0;
background:
linear-gradient(to top, rgba(0,0,0,0.25), transparent 50%),
radial-gradient(circle at 70% 20%, rgba(255,255,255,0.12), transparent 55%);
pointer-events: none;
}
.tools-page .badge {
position: absolute; top: 6px; left: 6px;
z-index: 5;
padding: 2px 8px; border-radius: 100px;
background: rgba(0, 0, 0, 0.7);
font-family: 'JetBrains Mono', monospace;
font-size: 9px; font-weight: 700;
color: var(--ink);
backdrop-filter: blur(8px);
}
.tools-page .select-btn {
position: absolute; bottom: 6px; right: 6px;
z-index: 5;
width: 22px; height: 22px;
border-radius: 50%;
background: var(--purple);
display: flex; align-items: center; justify-content: center;
color: var(--ink);
box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
}
.tools-page .studio-footer {
display: flex; align-items: center; justify-content: space-between;
padding: 10px 16px;
border-top: 1px solid var(--ink-10);
background: rgba(11, 18, 48, 0.9);
font-family: 'JetBrains Mono', monospace;
font-size: 10px; color: var(--ink-50);
}
.tools-page .credits {
display: flex; align-items: center; gap: 6px;
color: var(--amber);
}
.tools-page .diamond { color: var(--amber); }
.tools-page .tools-grid {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 20px;
margin-top: 40px;
}
.tools-page .tool {
position: relative;
padding: 32px;
border-radius: 20px;
background:
linear-gradient(180deg, rgba(11, 18, 48, 0.85), rgba(11, 18, 48, 0.75)),
rgba(250, 251, 255, 0.02);
border: 1px solid var(--ink-10);
backdrop-filter: blur(16px);
transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
overflow: hidden;
display: flex; flex-direction: column;
min-height: 380px;
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}
.tools-page .tool:hover {
transform: translateY(-6px);
border-color: var(--accent);
box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45), 0 0 80px rgba(var(--accent-rgb), 0.15);
}
.tools-page .tool::before {
content: '';
position: absolute;
top: 0; left: 0; right: 0;
height: 3px;
background: linear-gradient(90deg, var(--accent), transparent);
}
.tools-page .tool::after {
content: '';
position: absolute;
top: -40%; right: -30%;
width: 400px; height: 400px;
background: radial-gradient(circle, rgba(var(--accent-rgb), 0.15), transparent 60%);
filter: blur(40px);
opacity: 0;
transition: opacity 0.6s;
pointer-events: none;
}
.tools-page .tool:hover::after { opacity: 1; }
.tools-page .tool[data-accent="sky"] { --accent: var(--sky-bright); --accent-rgb: 56, 189, 248; }
.tools-page .tool[data-accent="indigo"] { --accent: var(--indigo-soft); --accent-rgb: 129, 140, 248; }
.tools-page .tool[data-accent="amber"] { --accent: var(--amber); --accent-rgb: 251, 191, 36; }
.tools-page .tool[data-accent="green"] { --accent: var(--green); --accent-rgb: 52, 211, 153; }
.tools-page .tool[data-accent="pink"] { --accent: var(--pink); --accent-rgb: 236, 72, 153; }
.tools-page .tool[data-accent="purple"] { --accent: var(--purple-soft); --accent-rgb: 192, 132, 252; }
.tools-page .tool-header {
display: flex; align-items: center; gap: 14px;
margin-bottom: 16px;
}
.tools-page .tool-icon {
width: 48px; height: 48px; border-radius: 12px;
background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.25), rgba(var(--accent-rgb), 0.1));
border: 1px solid rgba(var(--accent-rgb), 0.4);
display: flex; align-items: center; justify-content: center;
color: var(--accent); flex-shrink: 0;
box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.2);
}
.tools-page .tool-name {
font-family: 'Sora', sans-serif;
font-size: 22px; font-weight: 800;
letter-spacing: -0.02em;
}
.tools-page .tool-desc {
font-size: 14px; line-height: 1.6;
color: var(--ink-60);
margin-bottom: 20px;
}
.tools-page .tool-desc strong { color: var(--ink); font-weight: 600; }
.tools-page .tool-preview {
margin-top:auto;margin-bottom:16px;border-radius:12px;
border:1px solid rgba(var(--accent-rgb),.22);
background:linear-gradient(180deg,rgba(var(--accent-rgb),.06),rgba(0,0,0,.2));
overflow:hidden;padding:14px;height:170px;
position:relative;
}
.tools-page .pv-superpages {display:grid;grid-template-columns:50px 1fr 36px;gap:8px;width:100%;height:100%}
.tools-page .sp-blocks {background:rgba(0,0,0,.35);border-radius:6px;padding:8px 5px;display:flex;flex-direction:column;gap:5px;align-items:center}
.tools-page .sp-block-icon {
width:34px;height:20px;border-radius:4px;
background:rgba(56,189,248,.15);border:1px solid rgba(56,189,248,.3);
display:flex;align-items:center;justify-content:center;
font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;color:var(--sky-bright);
cursor:grab;
}
.tools-page .sp-block-icon.dragging {
background:rgba(56,189,248,.35);border-color:var(--sky-bright);
transform:translateX(20px) rotate(-4deg);
box-shadow:0 8px 20px rgba(56,189,248,.4);
animation:tlSpDrag 3s ease-in-out infinite;
}
@keyframes tlSpDrag{
0%,100%{transform:translateX(20px) rotate(-4deg);opacity:1}
45%{transform:translateX(60px) translateY(40px) rotate(-2deg);opacity:.85}
55%{transform:translateX(60px) translateY(40px) rotate(-2deg);opacity:0}
56%{transform:translateX(0) rotate(0);opacity:0}
70%{opacity:1}
}
.tools-page .sp-canvas {
background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(0,0,0,.2));
border-radius:6px;padding:10px;display:flex;flex-direction:column;gap:5px;
position:relative;
}
.tools-page .sp-item {border-radius:3px;transition:all .3s}
.tools-page .sp-h {height:10px;width:60%;background:var(--ink);border-radius:3px}
.tools-page .sp-p {height:4px;background:var(--ink-40);width:85%}
.tools-page .sp-p.s {width:68%}
.tools-page .sp-img {height:22px;background:linear-gradient(135deg,var(--sky),var(--indigo));border-radius:4px;box-shadow:0 2px 8px rgba(14,165,233,.3)}
.tools-page .sp-form {
height:16px;background:rgba(0,0,0,.4);border:1px dashed rgba(56,189,248,.5);
border-radius:4px;display:flex;align-items:center;padding:0 6px;
font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(56,189,248,.7);
animation:tlSpFormPulse 3s ease-in-out infinite;
}
@keyframes tlSpFormPulse{
0%,50%,100%{border-color:rgba(56,189,248,.5);background:rgba(0,0,0,.4)}
65%,85%{border-color:var(--sky-bright);background:rgba(56,189,248,.15);box-shadow:0 0 8px rgba(56,189,248,.4)}
}
.tools-page .sp-btn {height:14px;width:50%;background:linear-gradient(135deg,var(--sky-bright),var(--sky));border-radius:4px;box-shadow:0 2px 6px rgba(56,189,248,.3)}
.tools-page .sp-style {background:rgba(0,0,0,.35);border-radius:6px;padding:6px 5px;display:flex;flex-direction:column;gap:4px;align-items:center}
.tools-page .sp-color {width:18px;height:18px;border-radius:50%;border:1.5px solid var(--ink-20)}
.tools-page .sp-color.a {background:var(--sky);border-color:var(--sky-bright)}
.tools-page .sp-color.b {background:var(--indigo)}
.tools-page .sp-color.c {background:var(--pink)}
.tools-page .pv-linkhub {display:flex;align-items:center;justify-content:center;gap:16px;width:100%;height:100%}
.tools-page .lh-phone {
width:100px;height:100%;
background:linear-gradient(180deg,#0a0f24,#1e293b);
border:2px solid var(--ink-20);
border-radius:14px;padding:10px 8px;
display:flex;flex-direction:column;align-items:center;gap:5px;
position:relative;
box-shadow:0 12px 30px rgba(0,0,0,.5),inset 0 0 20px rgba(129,140,248,.05);
}
.tools-page .lh-phone::before {
content:'';position:absolute;top:4px;left:50%;transform:translateX(-50%);
width:30px;height:3px;border-radius:100px;background:var(--ink-20);
}
.tools-page .lh-avatar {
width:26px;height:26px;border-radius:50%;
background:linear-gradient(135deg,var(--indigo),var(--pink));
margin-top:8px;
box-shadow:0 0 12px rgba(129,140,248,.4);
border:1.5px solid var(--ink);
}
.tools-page .lh-name {width:40px;height:5px;background:var(--ink);border-radius:2px;margin-top:2px}
.tools-page .lh-bio {width:50px;height:3px;background:var(--ink-40);border-radius:1px}
.tools-page .lh-link {
width:80px;padding:5px 6px;border-radius:5px;
background:rgba(255,255,255,.05);border:1px solid var(--ink-10);
display:flex;align-items:center;gap:4px;
font-family:'JetBrains Mono',monospace;font-size:7px;color:var(--ink-60);
}
.tools-page .lh-link.primary {
background:linear-gradient(90deg,rgba(129,140,248,.35),rgba(99,102,241,.2));
border-color:var(--indigo-soft);color:var(--ink);
box-shadow:0 0 10px rgba(129,140,248,.3);
animation:tlLhPulse 2.5s ease-in-out infinite;
}
@keyframes tlLhPulse{
0%,100%{box-shadow:0 0 10px rgba(129,140,248,.3)}
50%{box-shadow:0 0 18px rgba(129,140,248,.6)}
}
.tools-page .lh-link::before {content:'';width:5px;height:5px;border-radius:50%;background:var(--indigo-soft)}
.tools-page .lh-stats {
display:flex;flex-direction:column;gap:10px;
}
.tools-page .lh-stat {
background:rgba(0,0,0,.35);border:1px solid rgba(129,140,248,.2);
border-radius:8px;padding:8px 10px;min-width:80px;
}
.tools-page .lh-stat-label {font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--ink-50);letter-spacing:.1em;text-transform:uppercase}
.tools-page .lh-stat-val {font-family:'Sora',sans-serif;font-weight:900;font-size:16px;color:var(--indigo-soft);margin-top:2px}
.tools-page .lh-stat-delta {font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--green);margin-top:2px}
.tools-page .pv-linktools {
display:flex;flex-direction:column;gap:8px;width:100%;height:100%;
align-items:center;justify-content:center;
}
.tools-page .lt-source {
padding:6px 10px;
background:rgba(0,0,0,.4);border:1px solid rgba(251,191,36,.35);
border-radius:5px;
font-family:'JetBrains Mono',monospace;font-size:9px;
color:var(--amber-bright);
display:flex;align-items:center;gap:6px;
box-shadow:0 0 10px rgba(251,191,36,.15);
}
.tools-page .lt-source::before {
content:'';width:6px;height:6px;border-radius:50%;
background:var(--amber);box-shadow:0 0 6px var(--amber);
animation:tlLtPulse 1.5s ease-in-out infinite;
}
.tools-page .lt-source-arrow {color:var(--amber);font-size:14px;line-height:1;animation:tlLtRotateArrow 2.4s linear infinite;display:inline-block}
@keyframes tlLtRotateArrow{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes tlLtPulse{0%,100%{opacity:1}50%{opacity:.4}}
.tools-page .lt-rotator {display:flex;flex-direction:column;gap:4px;width:100%}
.tools-page .lt-dest {
display:grid;grid-template-columns:20px 1fr 38px;gap:8px;align-items:center;
padding:5px 8px;border-radius:5px;
background:rgba(0,0,0,.3);
border:1px solid var(--ink-10);border-left:2px solid transparent;
position:relative;
}
.tools-page .lt-dest-num {font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-40);font-weight:700;text-align:center}
.tools-page .lt-dest-url {font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-60);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tools-page .lt-dest-pct {font-family:'Sora',sans-serif;font-size:10px;font-weight:800;color:var(--ink-50);text-align:right;letter-spacing:-.02em}
@keyframes tlLtCycle1{0%,28%,100%{background:linear-gradient(90deg,rgba(251,191,36,.18),rgba(251,191,36,.05));border-color:rgba(251,191,36,.45);border-left-color:var(--amber);box-shadow:0 0 12px rgba(251,191,36,.2)}33%,99%{background:rgba(0,0,0,.3);border-color:var(--ink-10);border-left-color:transparent;box-shadow:none}}
@keyframes tlLtCycle2{0%,32%,67%,100%{background:rgba(0,0,0,.3);border-color:var(--ink-10);border-left-color:transparent;box-shadow:none}34%,65%{background:linear-gradient(90deg,rgba(251,191,36,.18),rgba(251,191,36,.05));border-color:rgba(251,191,36,.45);border-left-color:var(--amber);box-shadow:0 0 12px rgba(251,191,36,.2)}}
@keyframes tlLtCycle3{0%,65%,100%{background:rgba(0,0,0,.3);border-color:var(--ink-10);border-left-color:transparent;box-shadow:none}67%,98%{background:linear-gradient(90deg,rgba(251,191,36,.18),rgba(251,191,36,.05));border-color:rgba(251,191,36,.45);border-left-color:var(--amber);box-shadow:0 0 12px rgba(251,191,36,.2)}}
.tools-page .lt-dest.d1 {animation:tlLtCycle1 4.5s ease-in-out infinite}
.tools-page .lt-dest.d2 {animation:tlLtCycle2 4.5s ease-in-out infinite}
.tools-page .lt-dest.d3 {animation:tlLtCycle3 4.5s ease-in-out infinite}
@keyframes tlLtNumCycle1{0%,28%,100%{color:var(--amber-bright)}33%,99%{color:var(--ink-40)}}
@keyframes tlLtNumCycle2{0%,32%,67%,100%{color:var(--ink-40)}34%,65%{color:var(--amber-bright)}}
@keyframes tlLtNumCycle3{0%,65%,100%{color:var(--ink-40)}67%,98%{color:var(--amber-bright)}}
.tools-page .lt-dest.d1 .lt-dest-num {animation:tlLtNumCycle1 4.5s ease-in-out infinite}
.tools-page .lt-dest.d2 .lt-dest-num {animation:tlLtNumCycle2 4.5s ease-in-out infinite}
.tools-page .lt-dest.d3 .lt-dest-num {animation:tlLtNumCycle3 4.5s ease-in-out infinite}
@keyframes tlLtUrlCycle1{0%,28%,100%{color:var(--ink)}33%,99%{color:var(--ink-60)}}
@keyframes tlLtUrlCycle2{0%,32%,67%,100%{color:var(--ink-60)}34%,65%{color:var(--ink)}}
@keyframes tlLtUrlCycle3{0%,65%,100%{color:var(--ink-60)}67%,98%{color:var(--ink)}}
.tools-page .lt-dest.d1 .lt-dest-url {animation:tlLtUrlCycle1 4.5s ease-in-out infinite}
.tools-page .lt-dest.d2 .lt-dest-url {animation:tlLtUrlCycle2 4.5s ease-in-out infinite}
.tools-page .lt-dest.d3 .lt-dest-url {animation:tlLtUrlCycle3 4.5s ease-in-out infinite}
@keyframes tlLtPctCycle1{0%,28%,100%{color:var(--amber-bright);filter:drop-shadow(0 0 4px rgba(251,191,36,.4))}33%,99%{color:var(--ink-50);filter:none}}
@keyframes tlLtPctCycle2{0%,32%,67%,100%{color:var(--ink-50);filter:none}34%,65%{color:var(--amber-bright);filter:drop-shadow(0 0 4px rgba(251,191,36,.4))}}
@keyframes tlLtPctCycle3{0%,65%,100%{color:var(--ink-50);filter:none}67%,98%{color:var(--amber-bright);filter:drop-shadow(0 0 4px rgba(251,191,36,.4))}}
.tools-page .lt-dest.d1 .lt-dest-pct {animation:tlLtPctCycle1 4.5s ease-in-out infinite}
.tools-page .lt-dest.d2 .lt-dest-pct {animation:tlLtPctCycle2 4.5s ease-in-out infinite}
.tools-page .lt-dest.d3 .lt-dest-pct {animation:tlLtPctCycle3 4.5s ease-in-out infinite}
.tools-page .pv-leads {display:flex;flex-direction:column;gap:3px;height:100%;width:100%}
.tools-page .lead-head {
display:grid;grid-template-columns:18px 1fr 40px 12px;gap:8px;align-items:center;
padding:5px 8px;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.25);
border-radius:5px;
font-family:'JetBrains Mono',monospace;font-size:7px;color:var(--green);
text-transform:uppercase;letter-spacing:.1em;font-weight:700;
}
.tools-page .lead-row {
display:grid;grid-template-columns:18px 1fr 40px 12px;gap:8px;align-items:center;
padding:5px 8px;background:rgba(0,0,0,.3);border-radius:5px;
border-left:2px solid transparent;transition:all .3s;
}
.tools-page .lead-row.hot {border-left-color:var(--green);background:rgba(52,211,153,.08)}
.tools-page .lead-avatar {
width:18px;height:18px;border-radius:50%;
display:flex;align-items:center;justify-content:center;
font-family:'Sora',sans-serif;font-weight:800;font-size:8px;color:var(--cobalt-deepest);
}
.tools-page .lead-avatar.a1 {background:linear-gradient(135deg,#34d399,#10b981)}
.tools-page .lead-avatar.a2 {background:linear-gradient(135deg,#fbbf24,#f59e0b)}
.tools-page .lead-avatar.a3 {background:linear-gradient(135deg,#818cf8,#6366f1)}
.tools-page .lead-avatar.a4 {background:linear-gradient(135deg,#ec4899,#f43f5e)}
.tools-page .lead-name {font-family:'Sora',sans-serif;font-size:10px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tools-page .lead-tag {
font-family:'JetBrains Mono',monospace;font-size:7px;
padding:2px 5px;border-radius:3px;text-align:center;font-weight:700;letter-spacing:.05em;
}
.tools-page .lead-tag.hot {background:rgba(52,211,153,.2);color:var(--green-bright);border:1px solid rgba(52,211,153,.4)}
.tools-page .lead-tag.new {background:rgba(56,189,248,.2);color:var(--sky-bright);border:1px solid rgba(56,189,248,.4)}
.tools-page .lead-tag.col {background:rgba(250,251,255,.08);color:var(--ink-50);border:1px solid var(--ink-10)}
.tools-page .lead-dot {width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 4px var(--green);animation:tlLtPulse 2s ease-in-out infinite}
.tools-page .lead-dot.off {background:var(--ink-20);box-shadow:none;animation:none}
.tools-page .pv-deck {
display:grid;grid-template-columns:1fr 80px;gap:10px;
width:100%;height:100%;
}
.tools-page .deck-main {
background:linear-gradient(135deg,rgba(236,72,153,.25),rgba(168,85,247,.15),rgba(11,18,48,.7));
border:1px solid rgba(236,72,153,.4);
border-radius:8px;padding:10px;
display:flex;flex-direction:column;gap:6px;
position:relative;overflow:hidden;
box-shadow:0 6px 20px rgba(236,72,153,.2);
}
.tools-page .deck-main::before {
content:'';position:absolute;top:-30%;right:-30%;
width:120px;height:120px;
background:radial-gradient(circle,rgba(236,72,153,.5),transparent 60%);filter:blur(20px);
}
.tools-page .deck-main-h {font-family:'Sora',sans-serif;font-weight:900;font-size:12px;color:var(--ink);letter-spacing:-.02em;position:relative;z-index:2}
.tools-page .deck-main-h .gr {background:linear-gradient(135deg,var(--pink),var(--purple-soft));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tools-page .deck-main-sub {font-family:'Sora',sans-serif;font-size:8px;color:var(--ink-60);position:relative;z-index:2;margin-bottom:3px}
.tools-page .deck-main-body {
display:grid;grid-template-columns:1fr 1fr;gap:5px;flex:1;position:relative;z-index:2;
}
.tools-page .deck-stat {
background:rgba(0,0,0,.35);border:1px solid var(--ink-10);
border-radius:4px;padding:4px 6px;
display:flex;flex-direction:column;justify-content:center;
}
.tools-page .deck-stat-v {font-family:'Sora',sans-serif;font-weight:900;font-size:13px;color:var(--pink-soft);filter:drop-shadow(0 0 4px rgba(236,72,153,.4))}
.tools-page .deck-stat-l {font-family:'JetBrains Mono',monospace;font-size:6px;color:var(--ink-50);text-transform:uppercase;letter-spacing:.08em;margin-top:1px}
.tools-page .deck-rail {
display:flex;flex-direction:column;gap:4px;
}
.tools-page .deck-thumb {
border-radius:4px;padding:4px;
border:1px solid var(--ink-10);background:rgba(0,0,0,.4);
height:calc((100% - 16px)/5);
display:flex;flex-direction:column;gap:2px;
transition:all .3s;
position:relative;
}
.tools-page .deck-thumb.active {
border-color:var(--pink);
background:linear-gradient(135deg,rgba(236,72,153,.3),rgba(0,0,0,.4));
box-shadow:0 0 10px rgba(236,72,153,.3);
}
.tools-page .deck-thumb-h {height:2px;width:60%;background:var(--ink-40);border-radius:1px}
.tools-page .deck-thumb-p {height:1px;width:80%;background:var(--ink-20);border-radius:1px}
.tools-page .deck-thumb.active .deck-thumb-h {background:var(--ink)}
.tools-page .deck-thumb-num {
position:absolute;top:2px;right:3px;
font-family:'JetBrains Mono',monospace;font-size:6px;color:var(--ink-40);font-weight:700;
}
.tools-page .deck-thumb.active .deck-thumb-num {color:var(--pink)}
.tools-page .pv-link {display:grid;grid-template-columns:1fr 70px;gap:10px;width:100%;height:100%}
.tools-page .sl-left {display:flex;flex-direction:column;gap:8px;justify-content:center}
.tools-page .sl-long {
padding:7px 9px;background:rgba(0,0,0,.4);
border:1px solid var(--ink-10);border-radius:5px;
font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--ink-50);
white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
position:relative;
}
.tools-page .sl-long::before {content:'long url';position:absolute;top:-6px;left:6px;background:var(--cobalt-deepest);padding:0 4px;font-size:6px;color:var(--ink-40);letter-spacing:.1em;text-transform:uppercase}
.tools-page .sl-arrow {
align-self:center;font-size:18px;color:var(--green);
filter:drop-shadow(0 0 6px rgba(52,211,153,.5));
animation:tlSlArrow 2s ease-in-out infinite;
}
@keyframes tlSlArrow{0%,100%{transform:translateY(0);opacity:.8}50%{transform:translateY(3px);opacity:1}}
.tools-page .sl-short {
padding:9px 11px;
background:linear-gradient(90deg,rgba(52,211,153,.2),rgba(110,231,183,.1));
border:1px solid rgba(52,211,153,.5);
border-radius:5px;
font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--green-bright);font-weight:700;
box-shadow:0 0 12px rgba(52,211,153,.2);
position:relative;
display:flex;align-items:center;justify-content:space-between;
}
.tools-page .sl-short::before {content:'short link';position:absolute;top:-6px;left:6px;background:var(--cobalt-deepest);padding:0 4px;font-size:6px;color:var(--green);letter-spacing:.1em;text-transform:uppercase}
.tools-page .sl-copy {
font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--green-bright);
opacity:.7;
}
.tools-page .sl-qr {
background:var(--ink);border-radius:6px;padding:6px;
display:flex;align-items:center;justify-content:center;
align-self:center;
box-shadow:0 4px 12px rgba(0,0,0,.4),0 0 16px rgba(52,211,153,.2);
}
.tools-page .sl-qr-grid {
display:grid;grid-template-columns:repeat(9,1fr);gap:1px;
width:56px;height:56px;
}
.tools-page .sl-qr-cell {background:var(--cobalt-deepest);border-radius:1px}
.tools-page .sl-qr-cell.off {background:transparent}
.tools-page .tool-footer {
display: flex; align-items: center; justify-content: space-between;
padding-top: 14px;
border-top: 1px solid var(--ink-05);
}
.tools-page .tool-link {
font-family: 'Sora', sans-serif; font-size: 13px;
font-weight: 700; color: var(--accent);
text-decoration: none;
display: inline-flex; align-items: center; gap: 4px;
}
.tools-page .tool-link:hover .arrow { transform: translateX(4px); }
.tools-page .arrow { transition: transform 0.25s; }
.tools-page .tool-meta {
font-family: 'JetBrains Mono', monospace;
font-size: 10px;
color: var(--ink-50);
letter-spacing: 0.08em;
text-transform: uppercase;
}
.tools-page .tool-meta strong { color: var(--ink); font-weight: 700; }
.tools-page .footer-banner {
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
.tools-page .footer-banner::before {
content: '';
position: absolute;
top: -50%; left: 20%;
width: 600px; height: 600px;
background: radial-gradient(circle, rgba(56, 189, 248, 0.35), transparent 55%);
filter: blur(50px);
pointer-events: none;
}
.tools-page .footer-banner-text {
position: relative; z-index: 2;
font-family: 'Sora', sans-serif;
font-weight: 300;
font-size: clamp(22px, 2.4vw, 30px);
color: var(--ink-70);
line-height: 1.3;
max-width: 540px;
letter-spacing: -0.02em;
}
.tools-page .footer-banner-text .emph {
color: var(--sky-bright);
font-weight: 700;
text-shadow: 0 0 20px rgba(56, 189, 248, 0.6);
}
.tools-page .footer-cta {
position: relative; z-index: 2;
display: inline-flex; align-items: center; gap: 12px;
padding: 20px 36px;
border-radius: 14px;
background: linear-gradient(135deg, var(--amber-bright), var(--amber));
color: var(--cobalt-deepest);
font-family: 'Sora', sans-serif;
font-size: 15px; font-weight: 800;
text-decoration: none;
letter-spacing: -0.01em;
transition: transform 0.3s, box-shadow 0.3s;
box-shadow: 0 12px 40px rgba(251, 191, 36, 0.4);
white-space: nowrap;
}
.tools-page .footer-cta:hover {
transform: translateY(-3px) scale(1.02);
box-shadow: 0 16px 50px rgba(251, 191, 36, 0.6);
}
@media (max-width: 900px) {
.tools-page .page-section { padding: 120px 20px 80px; }
.tools-page .hero-badge {
position: static;
margin-top: 24px;
min-width: 0;
width: 100%;
}
.tools-page .feature-hero { grid-template-columns: 1fr; gap: 28px; padding: 28px; }
.tools-page .tools-grid { grid-template-columns: 1fr; }
.tools-page .footer-banner { grid-template-columns: 1fr; gap: 24px; padding: 32px; text-align: center; }
.tools-page .footer-cta { justify-self: center; }
.tools-page .float-nav { right: 20px; gap: 6px; }
.tools-page .float-nav-link { padding: 8px 14px; font-size: 12px; }
.tools-page .float-brand { left: 20px; padding: 8px 16px 8px 10px; }
.tools-page .float-brand-text { font-size: 13px; }
}
@media (max-width: 768px) {
.tools-page .float-nav { top: 16px; right: 16px; }
.tools-page .float-nav-link:nth-child(1), .tools-page .float-nav-link:nth-child(2), .tools-page .float-nav-link:nth-child(3) { display: none; }
.tools-page .float-brand { top: 16px; left: 16px; }
}
.tools-page .mock-label {
position: fixed; bottom: 16px; right: 16px; z-index: 1000;
padding: 8px 14px;
background: rgba(11, 18, 48, 0.95);
border: 1px solid var(--ink-10);
border-radius: 6px;
font-family: 'JetBrains Mono', monospace;
font-size: 10px; font-weight: 700;
color: var(--ink-60);
letter-spacing: 0.15em; text-transform: uppercase;
backdrop-filter: blur(12px);
}
/* Language pill — product-standard addition not in mockup */
.tools-page .float-lang-wrap{position:relative}
.tools-page .float-lang-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--ink);cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.tools-page .float-lang-pill:hover{background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.tools-page .float-lang-flag{font-size:15px;line-height:1}
.tools-page .float-lang-code{letter-spacing:.05em}
.tools-page .float-lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:200px;max-height:360px;overflow-y:auto;background:rgba(11,18,48,.95);border:1px solid var(--ink-10);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);backdrop-filter:blur(20px);padding:4px;z-index:200}
.tools-page .float-lang-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:transparent;color:var(--ink-60);text-align:left;transition:all .15s}
.tools-page .float-lang-item:hover{background:rgba(255,255,255,.05);color:var(--ink)}
.tools-page .float-lang-item.active{background:rgba(56,189,248,.12);color:var(--sky-bright);font-weight:700}
.tools-page .float-lang-item-flag{font-size:16px;line-height:1}
.tools-page .float-lang-item-name{flex:1}
.tools-page .float-lang-item-check{margin-left:auto;font-size:11px;color:var(--sky-bright)}
/* Unified Create-account CTA — dark glass with cyan accent (product standard) */
.tools-page .float-nav-cta{padding:10px 20px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid rgba(56,189,248,.35);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:var(--sky-bright);text-decoration:none;letter-spacing:-.005em;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3),0 0 24px rgba(56,189,248,.18)}
.tools-page .float-nav-cta:hover{background:rgba(11,18,48,.7);border-color:rgba(56,189,248,.6);transform:translateY(-2px);box-shadow:0 6px 28px rgba(0,0,0,.4),0 0 40px rgba(56,189,248,.35)}
`;
