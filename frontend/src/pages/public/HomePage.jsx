import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';
import DisclaimerLink from '../../components/DisclaimerLink';

export default function HomePage() {
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
      <style>{CSS_HOMEPAGE}</style>
      <div className="home-page">

        {/* Floating nav pills (top-right) */}
        <div className="float-nav">
          <Link to="/explore" className="float-nav-link">{t('homePage.navExplore', { defaultValue: 'Explore' })}</Link>

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

          <Link to="/login" className="float-nav-link">{t('homePage.navSignin')}</Link>
          <Link to="/register" className="float-nav-cta">{t('homePage.navCta')}</Link>
        </div>

        <section className="hero">
          <div className="hero-photo"></div>
          <div className="hero-overlay"></div>

          <div className="hero-content">
            <div className="hero-top">

              {/* Brand */}
              <div className="brand-hero">
                <div className="brand-hero-mark">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                    <polygon points="9,5 9,19 20,12" fill="#fff"/>
                  </svg>
                </div>
                <div className="brand-hero-name">SuperAd<em>Pro</em></div>
              </div>

              {/* Headline */}
              <h1 className="headline">
                {t('homePage.headlineLine1')}<br/>
                <span className="accent">{t('homePage.headlineLine2')}</span>
              </h1>

              {/* Sub */}
              <p className="sub" dangerouslySetInnerHTML={{ __html: t('homePage.sub') }}></p>

              {/* CTA row */}
              <div className="cta-row">
                <Link to="/register" className="cta-primary">
                  {t('homePage.ctaPrimary')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <Link to="/explore" className="cta-secondary">
                  <span className="play-icon">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <polygon points="8,5 8,19 19,12" fill="currentColor"/>
                    </svg>
                  </span>
                  {t('homePage.ctaSecondary')}
                </Link>
              </div>

              {/* Social icons */}
              <div className="social-row">
                <a href="#" className="social-icon" title="YouTube">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" title="X">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" title="Facebook">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" title="TikTok">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" title="Instagram">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              </div>

              {/* Bottom row: active stat + feature pills */}
              <div className="hero-bottom">
                <div className="bottom-row">
                  <div className="active-pill">
                    <span className="active-pill-dot"></span>
                    <span className="active-pill-value">2,847</span>
                    <span className="active-pill-label">{t('homePage.activeLabel')}</span>
                  </div>

                  <div className="feature-pills">
                    <div className="feature-pill">
                      <div className="feature-pill-title sky">{t('homePage.feat1Title')}</div>
                      <div className="feature-pill-sub">{t('homePage.feat1Sub')}</div>
                    </div>
                    <div className="feature-pill">
                      <div className="feature-pill-title green">{t('homePage.feat2Title')}</div>
                      <div className="feature-pill-sub">{t('homePage.feat2Sub')}</div>
                    </div>
                    <div className="feature-pill">
                      <div className="feature-pill-title amber">{t('homePage.feat3Title')}</div>
                      <div className="feature-pill-sub">{t('homePage.feat3Sub')}</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <DisclaimerLink />

      </div>
    </>
  );
}

// Scoped CSS — all selectors prefixed .home-page
var CSS_HOMEPAGE = `
.home-page{
  --cobalt-deepest:#0b1230;--cobalt-deep:#172554;
  --sky:#0ea5e9;--sky-bright:#38bdf8;
  --indigo:#6366f1;--indigo-soft:#818cf8;
  --amber:#fbbf24;--green:#34d399;
  --ink:#fafbff;
  --ink-60:rgba(250,251,255,.6);--ink-50:rgba(250,251,255,.5);
  --ink-40:rgba(250,251,255,.4);--ink-20:rgba(250,251,255,.2);
  --ink-10:rgba(250,251,255,.1);--ink-05:rgba(250,251,255,.05);
  background:var(--cobalt-deepest);color:var(--ink);
  font-family:'DM Sans',sans-serif;min-height:100vh;
  overflow-x:hidden;position:relative;
}
.home-page .float-nav{position:fixed;top:28px;right:32px;z-index:100;display:flex;align-items:center;gap:10px}
.home-page .float-nav-link{padding:10px 18px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:13px;font-weight:600;color:var(--ink);text-decoration:none;letter-spacing:-.005em;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.home-page .float-nav-link:hover{background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.home-page .float-nav-cta{padding:10px 20px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid rgba(56,189,248,.35);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:var(--sky-bright);text-decoration:none;letter-spacing:-.005em;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3),0 0 24px rgba(56,189,248,.18)}
.home-page .float-nav-cta:hover{background:rgba(11,18,48,.7);border-color:rgba(56,189,248,.6);transform:translateY(-2px);box-shadow:0 6px 28px rgba(0,0,0,.4),0 0 40px rgba(56,189,248,.35)}

/* Language pill (same glass-pill aesthetic as float-nav-link) */
.home-page .float-lang-wrap{position:relative}
.home-page .float-lang-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--ink);cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.home-page .float-lang-pill:hover{background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.home-page .float-lang-flag{font-size:15px;line-height:1}
.home-page .float-lang-code{letter-spacing:.05em}
.home-page .float-lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:200px;max-height:360px;overflow-y:auto;background:rgba(11,18,48,.95);border:1px solid var(--ink-10);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);backdrop-filter:blur(20px);padding:4px;z-index:200}
.home-page .float-lang-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:transparent;color:var(--ink-60);text-align:left;transition:all .15s}
.home-page .float-lang-item:hover{background:rgba(255,255,255,.05);color:var(--ink)}
.home-page .float-lang-item.active{background:rgba(14,165,233,.12);color:var(--sky-bright);font-weight:700}
.home-page .float-lang-item-flag{font-size:16px;line-height:1}
.home-page .float-lang-item-name{flex:1}
.home-page .float-lang-item-check{margin-left:auto;font-size:11px;color:var(--sky-bright)}
.home-page .hero{position:relative;min-height:100vh;overflow:hidden}
.home-page .hero-photo{position:absolute;inset:0;z-index:0;background-image:url("/static/images/homepage-hero.jpg");background-size:cover;background-position:center right;background-repeat:no-repeat;transform:scale(1.02);animation:homeKenBurns 60s ease-in-out infinite alternate}
@keyframes homeKenBurns{0%{transform:scale(1.02) translate(0,0)}100%{transform:scale(1.06) translate(-1%,-0.3%)}}
.home-page .hero-overlay{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(11,18,48,.85) 0%,rgba(11,18,48,.65) 15%,rgba(11,18,48,.3) 30%,transparent 50%)}
.home-page .hero-content{position:relative;z-index:10;max-width:1440px;width:100%;margin:0 auto;padding:120px 48px 60px;min-height:100vh;display:flex;flex-direction:column;justify-content:flex-start}
.home-page .hero-top{max-width:640px}
.home-page .brand-hero{display:flex;align-items:center;gap:20px;margin-bottom:40px;animation:homeFadeUp .9s ease forwards;opacity:0}
.home-page .brand-hero-mark{width:70px;height:70px;border-radius:16px;background:linear-gradient(135deg,var(--sky),var(--indigo));display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(14,165,233,.55),0 0 80px rgba(99,102,241,.35);position:relative;flex-shrink:0}
.home-page .brand-hero-mark::before{content:'';position:absolute;inset:-4px;border-radius:20px;background:linear-gradient(135deg,var(--sky),var(--amber),var(--indigo));z-index:-1;opacity:.55;filter:blur(14px)}
.home-page .brand-hero-name{font-family:'Sora',sans-serif;font-size:clamp(46px,5.8vw,74px);font-weight:900;letter-spacing:-.05em;line-height:.94;color:var(--ink)}
.home-page .brand-hero-name em{background:linear-gradient(135deg,var(--sky-bright),var(--amber));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-style:normal;display:inline-block;padding-right:.08em}
.home-page h1.headline{font-family:'Sora',sans-serif;font-size:clamp(44px,5.6vw,76px);font-weight:900;line-height:.95;letter-spacing:-.045em;margin-bottom:26px;animation:homeFadeUp .9s ease .15s forwards;opacity:0}
.home-page h1.headline .accent{display:block;font-weight:300;letter-spacing:-.035em;line-height:1.1;padding-bottom:.08em;background:linear-gradient(135deg,var(--sky-bright),var(--indigo-soft));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.home-page .sub{font-size:17px;line-height:1.65;color:var(--ink-60);max-width:490px;margin-bottom:32px;animation:homeFadeUp .9s ease .25s forwards;opacity:0}
.home-page .sub strong{color:var(--ink);font-weight:600}
.home-page .cta-row{display:flex;align-items:center;gap:20px;margin-bottom:32px;animation:homeFadeUp .9s ease .35s forwards;opacity:0}
.home-page .cta-primary{position:relative;display:inline-flex;align-items:center;gap:10px;padding:18px 32px;border-radius:12px;background:linear-gradient(135deg,var(--sky),var(--indigo));color:var(--ink);font-family:'Sora',sans-serif;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-.01em;box-shadow:0 10px 40px rgba(14,165,233,.4),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .3s,box-shadow .3s;overflow:hidden}
.home-page .cta-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.2) 50%,transparent 70%);transform:translateX(-100%);transition:transform .7s}
.home-page .cta-primary:hover{transform:translateY(-3px);box-shadow:0 14px 50px rgba(14,165,233,.6)}
.home-page .cta-primary:hover::after{transform:translateX(100%)}
.home-page .cta-secondary{display:inline-flex;align-items:center;gap:10px;color:var(--ink-60);font-family:'Sora',sans-serif;font-size:14px;font-weight:500;text-decoration:none;transition:color .2s}
.home-page .cta-secondary:hover{color:var(--ink)}
.home-page .cta-secondary .play-icon{width:30px;height:30px;border-radius:50%;background:rgba(250,251,255,.08);border:1px solid var(--ink-20);display:flex;align-items:center;justify-content:center;transition:all .2s;backdrop-filter:blur(8px)}
.home-page .cta-secondary:hover .play-icon{background:rgba(250,251,255,.15);border-color:var(--ink-40)}
.home-page .social-row{display:flex;gap:12px;margin-bottom:44px;animation:homeFadeUp .9s ease .45s forwards;opacity:0}
.home-page .social-icon{width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.5);border:1px solid var(--ink-10);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--ink-50);transition:all .25s;backdrop-filter:blur(10px)}
.home-page .social-icon:hover{background:rgba(250,251,255,.12);color:var(--ink);transform:translateY(-2px);border-color:var(--ink-20)}
.home-page .hero-bottom{animation:homeFadeUp .9s ease .55s forwards;opacity:0}
.home-page .bottom-row{display:flex;align-items:center;gap:28px;flex-wrap:wrap}
.home-page .active-pill{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:14px;background:rgba(0,0,0,.55);border:1px solid var(--ink-10);backdrop-filter:blur(12px)}
.home-page .active-pill-dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);animation:homeLivePulse 1.5s ease-in-out infinite}
@keyframes homeLivePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.4)}}
.home-page .active-pill-value{font-family:'Sora',sans-serif;font-size:20px;font-weight:900;color:var(--green);letter-spacing:-.02em}
.home-page .active-pill-label{font-size:13px;font-weight:500;color:var(--ink-50)}
.home-page .feature-pills{display:flex;gap:28px;flex-wrap:wrap}
.home-page .feature-pill{display:flex;flex-direction:column;gap:4px}
.home-page .feature-pill-title{font-family:'Sora',sans-serif;font-size:20px;font-weight:900;letter-spacing:-.02em;line-height:1.1;text-shadow:0 2px 20px rgba(11,18,48,.6)}
.home-page .feature-pill-title.sky{color:var(--sky-bright)}
.home-page .feature-pill-title.green{color:var(--green)}
.home-page .feature-pill-title.amber{color:var(--amber)}
.home-page .feature-pill-sub{font-size:12px;color:var(--ink-40);font-weight:500;text-shadow:0 1px 6px rgba(11,18,48,.8)}
@keyframes homeFadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:1024px){
  .home-page .hero-photo{background-position:75% center}
  .home-page .hero-overlay{background:linear-gradient(180deg,rgba(11,18,48,.75) 0%,rgba(11,18,48,.55) 40%,rgba(11,18,48,.85) 100%)}
  .home-page .hero-content{padding:120px 24px 40px}
  .home-page .float-nav{right:20px;gap:6px}
  .home-page .float-nav-link{padding:8px 14px;font-size:12px}
}
@media(max-width:768px){
  .home-page .float-nav{top:16px;right:16px;gap:6px}
  .home-page .float-nav-link:nth-child(1),.home-page .float-nav-link:nth-child(2),.home-page .float-nav-link:nth-child(3){display:none}
  .home-page .brand-hero-mark{width:56px;height:56px}
  .home-page .brand-hero-name{font-size:40px}
  .home-page h1.headline{font-size:clamp(36px,10vw,54px)}
  .home-page .cta-row{flex-wrap:wrap;gap:16px}
  .home-page .bottom-row{gap:20px}
  .home-page .feature-pills{gap:20px;width:100%}
}
`;
