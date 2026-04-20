import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';

/**
 * FreeTools — public directory of free tools.
 * Currently: meme generator, QR code generator, banner creator.
 * No signup required for any of them — designed as lead magnets that
 * bring people into the wider SuperAdPro ecosystem.
 */
export default function FreeTools() {
  var tr = useTranslation();
  var t = tr.t;
  var i18n = tr.i18n;

  var _langOpen = useState(false); var langOpen = _langOpen[0]; var setLangOpen = _langOpen[1];
  var langRef = useRef(null);
  useEffect(function() {
    function onClick(e) { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); }
    document.addEventListener('mousedown', onClick);
    return function() { document.removeEventListener('mousedown', onClick); };
  }, []);
  var currentLang = LANGUAGES.find(function(l) { return l.code === i18n.language; }) || LANGUAGES[0];

  var tools = [
    {
      key:   'meme',
      path:  '/free/meme-generator',
      colour:'pink',
      title: t('freeTools.memeTitle', { defaultValue: 'Meme Generator' }),
      body:  t('freeTools.memeBody', { defaultValue: 'Spin up on-brand memes in seconds. Drag text, swap templates, export as PNG.' }),
      icon:  (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><path d="M8 15c1.5 1.5 4 2 8 0"/></svg>),
    },
    {
      key:   'qr',
      path:  '/free/qr-code-generator',
      colour:'sky',
      title: t('freeTools.qrTitle', { defaultValue: 'QR Code Generator' }),
      body:  t('freeTools.qrBody', { defaultValue: 'Turn any link into a scannable QR code. Colour, logo, size — all customisable.' }),
      icon:  (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="18"/><line x1="18" y1="14" x2="18" y2="14"/><line x1="14" y1="18" x2="18" y2="18"/><line x1="18" y1="14" x2="21" y2="14"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="21" x2="18" y2="21"/></svg>),
    },
    {
      key:   'banner',
      path:  '/free/banner-creator',
      colour:'amber',
      title: t('freeTools.bannerTitle', { defaultValue: 'Banner Creator' }),
      body:  t('freeTools.bannerBody', { defaultValue: 'Design ad banners at any standard size. Copy-paste URLs, drag images, export PNG.' }),
      icon:  (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>),
    },
  ];

  return (
    <>
      <style>{CSS_FREE_TOOLS}</style>
      <div className="free-tools-page">

        <div className="float-nav">
          <Link to="/explore" className="float-nav-link">← {t('freeTools.backToHub', { defaultValue: 'Back to Explore' })}</Link>

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

          <Link to="/login" className="float-nav-link">{t('freeTools.navSignin', { defaultValue: 'Sign in' })}</Link>
          <Link to="/register" className="float-nav-cta">{t('freeTools.navCta', { defaultValue: 'Create free account' })}</Link>
        </div>

        <section className="ft-section">
          <div className="ft-hero">
            <div className="ft-eyebrow">{t('freeTools.eyebrow', { defaultValue: 'FREE TOOLS · NO SIGNUP REQUIRED' })}</div>
            <h1 className="ft-headline">
              {t('freeTools.headline1', { defaultValue: 'Tools on the house.' })}
              <br/>
              <span className="accent">{t('freeTools.headline2', { defaultValue: 'Use them anytime.' })}</span>
            </h1>
            <p className="ft-sub">
              {t('freeTools.sub', { defaultValue: "A small sample of what's inside SuperAdPro. These three are free for anyone to use — no account needed. There are many more tools waiting inside." })}
            </p>
          </div>

          <div className="ft-grid">
            {tools.map(function(tool) {
              return (
                <Link key={tool.key} to={tool.path} className="ft-card" data-c={tool.colour}>
                  <div className="ft-card-icon">{tool.icon}</div>
                  <div className="ft-card-title">{tool.title}</div>
                  <div className="ft-card-body">{tool.body}</div>
                  <div className="ft-card-link">{t('freeTools.openTool', { defaultValue: 'Open tool' })} →</div>
                </Link>
              );
            })}
          </div>

          <div className="ft-footer">
            <div className="ft-footer-text">
              {t('freeTools.footerLine1', { defaultValue: 'Want more than this?' })}<br/>
              <span className="emph">{t('freeTools.footerLine2', { defaultValue: 'A complete marketing toolkit inside.' })}</span>
            </div>
            <Link to="/register" className="ft-footer-cta">
              {t('freeTools.footerCta', { defaultValue: 'Create free account' })}
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

var CSS_FREE_TOOLS = `
.free-tools-page {
  --cobalt-deepest: #050d1a;
  --cobalt-deep: #0b1230;
  --sky-bright: #38bdf8;
  --pink: #f472b6;
  --amber: #fbbf24;
  --indigo-soft: #818cf8;
  --ink: #f1f5f9;
  --ink-70: rgba(241,245,249,0.7);
  --ink-50: rgba(241,245,249,0.5);
  --ink-10: rgba(255,255,255,0.1);
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #0f1939 0%, var(--cobalt-deepest) 60%);
  color: var(--ink);
  font-family: 'Inter', -apple-system, sans-serif;
  position: relative;
  overflow-x: hidden;
}

.free-tools-page .float-nav {
  position: fixed; top: 20px; right: 20px; z-index: 100;
  display: flex; gap: 8px; align-items: center;
  background: rgba(11,18,48,0.8); backdrop-filter: blur(16px);
  border: 1px solid var(--ink-10);
  border-radius: 100px; padding: 6px 8px;
}
.free-tools-page .float-nav-link {
  padding: 8px 14px; font-size: 13px; font-weight: 600;
  color: var(--ink-70); text-decoration: none;
  border-radius: 100px; transition: all .2s;
}
.free-tools-page .float-nav-link:hover { color: var(--ink); background: rgba(255,255,255,0.06); }
.free-tools-page .float-nav-cta {
  padding: 8px 16px; font-size: 13px; font-weight: 700;
  color: var(--cobalt-deepest); text-decoration: none;
  background: var(--sky-bright); border-radius: 100px;
}
.free-tools-page .float-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(56,189,248,0.4); }

.free-tools-page .float-lang-wrap { position: relative; }
.free-tools-page .float-lang-pill {
  padding: 6px 10px; font-size: 12px; font-weight: 600;
  color: var(--ink-70); background: transparent; border: none;
  border-radius: 100px; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 6px;
}
.free-tools-page .float-lang-pill:hover { background: rgba(255,255,255,0.06); color: var(--ink); }
.free-tools-page .float-lang-flag { font-size: 15px; line-height: 1; }
.free-tools-page .float-lang-code { letter-spacing: .06em; }
.free-tools-page .float-lang-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 8px;
  background: rgba(11,18,48,0.95); backdrop-filter: blur(16px);
  border: 1px solid var(--ink-10); border-radius: 12px;
  padding: 6px; min-width: 180px; max-height: 320px; overflow-y: auto;
}
.free-tools-page .float-lang-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 8px 10px; font-size: 13px; font-weight: 500;
  color: var(--ink-70); background: transparent; border: none;
  border-radius: 8px; cursor: pointer; font-family: inherit;
  text-align: left;
}
.free-tools-page .float-lang-item:hover { background: rgba(255,255,255,0.06); color: var(--ink); }
.free-tools-page .float-lang-item.active { color: var(--sky-bright); background: rgba(14,165,233,0.1); }
.free-tools-page .float-lang-item-flag { font-size: 16px; }
.free-tools-page .float-lang-item-name { flex: 1; }
.free-tools-page .float-lang-item-check { color: var(--sky-bright); }

.free-tools-page .ft-section {
  max-width: 1100px; margin: 0 auto; padding: 100px 24px 80px;
  position: relative; z-index: 1;
}
.free-tools-page .ft-hero { text-align: center; margin-bottom: 48px; }
.free-tools-page .ft-eyebrow {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: var(--amber); letter-spacing: .2em; text-transform: uppercase;
  margin-bottom: 20px;
}
.free-tools-page .ft-headline {
  font-family: 'Sora', sans-serif; font-weight: 800; font-size: 54px;
  line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 20px;
  color: var(--ink);
}
.free-tools-page .ft-headline .accent {
  background: linear-gradient(135deg, var(--amber), var(--pink));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.free-tools-page .ft-sub {
  font-size: 17px; color: var(--ink-70); line-height: 1.6;
  max-width: 640px; margin: 0 auto;
}

.free-tools-page .ft-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
  margin-top: 60px;
}
.free-tools-page .ft-card {
  display: flex; flex-direction: column; gap: 14px;
  padding: 28px; border-radius: 18px;
  background: linear-gradient(180deg, rgba(11,18,48,0.85), rgba(11,18,48,0.7));
  border: 1px solid var(--ink-10);
  backdrop-filter: blur(16px);
  text-decoration: none; color: inherit;
  transition: transform .3s, border-color .3s, box-shadow .3s;
  position: relative; overflow: hidden;
}
.free-tools-page .ft-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent), transparent);
}
.free-tools-page .ft-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow: 0 16px 50px rgba(0,0,0,.4), 0 0 60px rgba(var(--accent-rgb),.15);
}
.free-tools-page .ft-card[data-c="pink"]  { --accent: var(--pink);       --accent-rgb: 244,114,182; }
.free-tools-page .ft-card[data-c="sky"]   { --accent: var(--sky-bright); --accent-rgb: 56,189,248; }
.free-tools-page .ft-card[data-c="amber"] { --accent: var(--amber);      --accent-rgb: 251,191,36; }

.free-tools-page .ft-card-icon {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(var(--accent-rgb), .15);
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), .3);
}
.free-tools-page .ft-card-title {
  font-family: 'Sora', sans-serif; font-weight: 800; font-size: 20px;
  color: var(--ink); letter-spacing: -0.015em;
}
.free-tools-page .ft-card-body {
  font-size: 14px; line-height: 1.5; color: var(--ink-70);
}
.free-tools-page .ft-card-link {
  margin-top: auto;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  color: var(--accent); letter-spacing: .05em; text-transform: uppercase; font-weight: 700;
}

.free-tools-page .ft-footer {
  margin-top: 80px; padding: 40px;
  background: linear-gradient(135deg, rgba(251,191,36,.08), rgba(244,114,182,.08));
  border: 1px solid var(--ink-10);
  border-radius: 20px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; flex-wrap: wrap;
}
.free-tools-page .ft-footer-text {
  font-family: 'Sora', sans-serif; font-weight: 700; font-size: 20px;
  color: var(--ink); line-height: 1.4;
}
.free-tools-page .ft-footer-text .emph {
  color: var(--amber); font-weight: 800;
}
.free-tools-page .ft-footer-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 28px; font-size: 15px; font-weight: 700;
  color: var(--cobalt-deepest); background: var(--amber);
  border-radius: 12px; text-decoration: none;
  transition: transform .15s, box-shadow .15s;
}
.free-tools-page .ft-footer-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(251,191,36,.5); }

@media (max-width: 720px) {
  .free-tools-page .ft-section { padding: 80px 16px 60px; }
  .free-tools-page .ft-headline { font-size: 36px; }
  .free-tools-page .ft-grid { grid-template-columns: 1fr; }
  .free-tools-page .ft-footer { flex-direction: column; text-align: center; padding: 28px; }
  .free-tools-page .float-nav { padding: 4px 6px; gap: 4px; top: 12px; right: 12px; }
  .free-tools-page .float-nav-link { padding: 6px 10px; font-size: 12px; }
  .free-tools-page .float-nav-cta { padding: 6px 12px; font-size: 12px; }
}
`;
