import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';

/**
 * ExploreHub — the new public /explore landing page.
 * Reuses the same design tokens (deep-space theme, JetBrains Mono badges,
 * Sora headings) as the other public pages for visual consistency.
 * Welcome video is a PLACEHOLDER — TODO: swap in real embed URL when Steve provides one.
 */
export default function ExploreHub() {
  var tr = useTranslation();
  var t = tr.t;
  var i18n = tr.i18n;

  // Language pill
  var _langOpen = useState(false); var langOpen = _langOpen[0]; var setLangOpen = _langOpen[1];
  var langRef = useRef(null);
  useEffect(function() {
    function onClick(e) { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); }
    document.addEventListener('mousedown', onClick);
    return function() { document.removeEventListener('mousedown', onClick); };
  }, []);
  var currentLang = LANGUAGES.find(function(l) { return l.code === i18n.language; }) || LANGUAGES[0];

  return (
    <>
      <style>{CSS_EXPLORE_HUB}</style>
      <div className="explore-hub">

        {/* Floating nav */}
        <div className="float-nav">
          <Link to="/" className="float-nav-link">{t('exploreHub.navHome', { defaultValue: 'Home' })}</Link>

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

          <Link to="/login" className="float-nav-link">{t('exploreHub.navSignin', { defaultValue: 'Sign in' })}</Link>
          <Link to="/register" className="float-nav-cta">{t('exploreHub.navCta', { defaultValue: 'Create free account' })}</Link>
        </div>

        <section className="hub-section">

          {/* Hero */}
          <div className="hub-hero">
            <div className="hub-eyebrow">{t('exploreHub.eyebrow', { defaultValue: 'EXPLORE SUPERADPRO' })}</div>
            <h1 className="hub-headline">
              {t('exploreHub.headline1', { defaultValue: 'Real members.' })}
              <br/>
              <span className="accent">{t('exploreHub.headline2', { defaultValue: 'Real results.' })}</span>
            </h1>
            <p className="hub-sub">
              {t('exploreHub.sub', { defaultValue: 'See live earnings, member success stories, and the work the community is shipping right now.' })}
            </p>
          </div>

          {/* Welcome video — PLACEHOLDER (TODO: replace with real video URL) */}
          <div className="hub-video">
            <div className="hub-video-frame">
              <div className="hub-video-placeholder">
                <div className="hub-video-play">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <polygon points="8,5 8,19 19,12" fill="currentColor"/>
                  </svg>
                </div>
                <div className="hub-video-label">
                  {t('exploreHub.videoPlaceholderTitle', { defaultValue: 'Welcome video coming soon' })}
                </div>
                <div className="hub-video-sub">
                  {t('exploreHub.videoPlaceholderSub', { defaultValue: 'A 90-second tour of what SuperAdPro can do for you' })}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation cards — 4 destinations */}
          <div className="hub-cards">

            {/* Card 1: Live Activity */}
            <Link to="/explore/live" className="hub-card" data-c="sky">
              <div className="hub-card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                </svg>
              </div>
              <div className="hub-card-title">{t('exploreHub.cardLiveTitle', { defaultValue: 'Live Activity' })}</div>
              <div className="hub-card-body">{t('exploreHub.cardLiveBody', { defaultValue: 'Commissions paid right now. Hour-by-hour, day-by-day. No hype — just the numbers.' })}</div>
              <div className="hub-card-link">{t('exploreHub.cardLink', { defaultValue: 'See it live' })} →</div>
            </Link>

            {/* Card 2: Success Stories */}
            <Link to="/explore/stories" className="hub-card" data-c="green">
              <div className="hub-card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="hub-card-title">{t('exploreHub.cardStoriesTitle', { defaultValue: 'Success Stories' })}</div>
              <div className="hub-card-body">{t('exploreHub.cardStoriesBody', { defaultValue: 'First-dollar stories from real members. How they did it, how long it took, what they earn now.' })}</div>
              <div className="hub-card-link">{t('exploreHub.cardLink', { defaultValue: 'See it live' })} →</div>
            </Link>

            {/* Card 3: Member Showcase */}
            <Link to="/explore/showcase" className="hub-card" data-c="indigo">
              <div className="hub-card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <div className="hub-card-title">{t('exploreHub.cardShowcaseTitle', { defaultValue: 'Member Showcase' })}</div>
              <div className="hub-card-body">{t('exploreHub.cardShowcaseBody', { defaultValue: 'Bio links, landing pages, and ad campaigns built by members using SuperAdPro tools.' })}</div>
              <div className="hub-card-link">{t('exploreHub.cardLink', { defaultValue: 'See it live' })} →</div>
            </Link>

            {/* Card 4: Free Tools */}
            <Link to="/explore/free-tools" className="hub-card" data-c="amber">
              <div className="hub-card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <div className="hub-card-title">{t('exploreHub.cardFreeToolsTitle', { defaultValue: 'Free Tools' })}</div>
              <div className="hub-card-body">{t('exploreHub.cardFreeToolsBody', { defaultValue: 'Meme generator, QR code generator, banner creator. Free to use — no signup needed.' })}</div>
              <div className="hub-card-link">{t('exploreHub.cardLink', { defaultValue: 'See it live' })} →</div>
            </Link>

          </div>

          {/* Footer banner */}
          <div className="hub-footer">
            <div className="hub-footer-text">
              {t('exploreHub.footerLine1', { defaultValue: 'Ready to start earning?' })}<br/>
              <span className="emph">{t('exploreHub.footerLine2', { defaultValue: 'Create your free account in 30 seconds.' })}</span>
            </div>
            <Link to="/register" className="hub-footer-cta">
              {t('exploreHub.footerCta', { defaultValue: 'Create free account' })}
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

var CSS_EXPLORE_HUB = `
/* Scoped to .explore-hub only — never leaks. Shares design tokens with the rest of /explore's sub-pages. */
.explore-hub {
  --cobalt-deepest: #050d1a;
  --cobalt-deep: #0b1230;
  --sky: #0ea5e9;
  --sky-bright: #38bdf8;
  --green: #34d399;
  --green-bright: #4ade80;
  --indigo-soft: #818cf8;
  --amber: #fbbf24;
  --pink: #f472b6;
  --ink: #f1f5f9;
  --ink-70: rgba(241,245,249,0.7);
  --ink-60: rgba(241,245,249,0.6);
  --ink-50: rgba(241,245,249,0.5);
  --ink-40: rgba(241,245,249,0.4);
  --ink-10: rgba(255,255,255,0.1);
  --ink-05: rgba(255,255,255,0.05);
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #0f1939 0%, var(--cobalt-deepest) 60%);
  color: var(--ink);
  font-family: 'Inter', -apple-system, sans-serif;
  position: relative;
  overflow-x: hidden;
}
.explore-hub::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(14,165,233,0.08), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(129,140,248,0.06), transparent 40%);
  pointer-events: none;
}

/* ── Floating nav (shared pattern with /explore sub-pages) ── */
.explore-hub .float-nav {
  position: fixed; top: 20px; right: 20px; z-index: 100;
  display: flex; gap: 8px; align-items: center;
  background: rgba(11,18,48,0.8); backdrop-filter: blur(16px);
  border: 1px solid var(--ink-10);
  border-radius: 100px; padding: 6px 8px;
}
.explore-hub .float-nav-link {
  padding: 8px 14px; font-size: 13px; font-weight: 600;
  color: var(--ink-70); text-decoration: none;
  border-radius: 100px; transition: all .2s;
}
.explore-hub .float-nav-link:hover { color: var(--ink); background: rgba(255,255,255,0.06); }
.explore-hub .float-nav-cta {
  padding: 8px 16px; font-size: 13px; font-weight: 700;
  color: var(--cobalt-deepest); text-decoration: none;
  background: var(--sky-bright); border-radius: 100px;
  transition: transform .15s, box-shadow .15s;
}
.explore-hub .float-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(56,189,248,0.4); }

.explore-hub .float-lang-wrap { position: relative; }
.explore-hub .float-lang-pill {
  padding: 6px 10px; font-size: 12px; font-weight: 600;
  color: var(--ink-70); background: transparent; border: none;
  border-radius: 100px; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 6px;
}
.explore-hub .float-lang-pill:hover { background: rgba(255,255,255,0.06); color: var(--ink); }
.explore-hub .float-lang-flag { font-size: 15px; line-height: 1; }
.explore-hub .float-lang-code { letter-spacing: .06em; }
.explore-hub .float-lang-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 8px;
  background: rgba(11,18,48,0.95); backdrop-filter: blur(16px);
  border: 1px solid var(--ink-10); border-radius: 12px;
  padding: 6px; min-width: 180px; max-height: 320px; overflow-y: auto;
}
.explore-hub .float-lang-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 8px 10px; font-size: 13px; font-weight: 500;
  color: var(--ink-70); background: transparent; border: none;
  border-radius: 8px; cursor: pointer; font-family: inherit;
  text-align: left;
}
.explore-hub .float-lang-item:hover { background: rgba(255,255,255,0.06); color: var(--ink); }
.explore-hub .float-lang-item.active { color: var(--sky-bright); background: rgba(14,165,233,0.1); }
.explore-hub .float-lang-item-flag { font-size: 16px; }
.explore-hub .float-lang-item-name { flex: 1; }
.explore-hub .float-lang-item-check { color: var(--sky-bright); }

/* ── Content ── */
.explore-hub .hub-section {
  max-width: 1100px; margin: 0 auto; padding: 100px 24px 80px;
  position: relative; z-index: 1;
}
.explore-hub .hub-hero {
  position: relative;
  text-align: center;
  margin-bottom: 48px;
  padding: 80px 40px;
  border-radius: 22px;
  overflow: hidden;
  background-image:
    linear-gradient(180deg, rgba(11,18,48,0.55) 0%, rgba(11,18,48,0.35) 30%, rgba(11,18,48,0.55) 70%, rgba(11,18,48,0.95) 100%),
    url("/static/images/explore-hub-hero.jpg");
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  border: 1px solid var(--ink-10);
  box-shadow: 0 12px 48px rgba(0,0,0,0.35);
}
@media (max-width: 720px) {
  .explore-hub .hub-hero { padding: 56px 24px; }
}
.explore-hub .hub-eyebrow {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: var(--sky-bright); letter-spacing: .2em; text-transform: uppercase;
  margin-bottom: 20px;
}
.explore-hub .hub-headline {
  font-family: 'Sora', sans-serif; font-weight: 800; font-size: 56px;
  line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 20px;
  color: var(--ink);
}
.explore-hub .hub-headline .accent {
  background: linear-gradient(135deg, var(--sky-bright), var(--indigo-soft));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.explore-hub .hub-sub {
  font-size: 17px; color: var(--ink-70); line-height: 1.6;
  max-width: 640px; margin: 0 auto;
}

/* ── Welcome video placeholder ── */
.explore-hub .hub-video { margin: 48px 0; display: flex; justify-content: center; }
.explore-hub .hub-video-frame {
  width: 100%; max-width: 820px; aspect-ratio: 16/9;
  background: linear-gradient(135deg, rgba(14,165,233,.08), rgba(129,140,248,.08));
  border: 1px solid var(--ink-10);
  border-radius: 18px; overflow: hidden;
  position: relative;
}
.explore-hub .hub-video-placeholder {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  background-image:
    radial-gradient(circle at 30% 40%, rgba(14,165,233,.12), transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(129,140,248,.1), transparent 50%);
}
.explore-hub .hub-video-play {
  width: 80px; height: 80px; border-radius: 50%;
  background: rgba(56,189,248,.2); border: 2px solid var(--sky-bright);
  color: var(--sky-bright);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 40px rgba(56,189,248,.3);
}
.explore-hub .hub-video-label {
  font-family: 'Sora', sans-serif; font-weight: 700; font-size: 18px;
  color: var(--ink);
}
.explore-hub .hub-video-sub {
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  color: var(--ink-50); letter-spacing: .05em;
}

/* ── Cards ── */
.explore-hub .hub-cards {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
  margin-top: 60px;
}
.explore-hub .hub-card {
  display: flex; flex-direction: column; gap: 14px;
  padding: 32px 28px; border-radius: 20px;
  background: linear-gradient(180deg, rgba(11,18,48,0.85), rgba(11,18,48,0.7));
  border: 1px solid var(--ink-10);
  backdrop-filter: blur(16px);
  text-decoration: none; color: inherit;
  transition: transform .3s, border-color .3s, box-shadow .3s;
  position: relative; overflow: hidden;
}
.explore-hub .hub-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent), transparent);
}
.explore-hub .hub-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow: 0 16px 50px rgba(0,0,0,.4), 0 0 60px rgba(var(--accent-rgb),.15);
}
.explore-hub .hub-card[data-c="sky"]    { --accent: var(--sky-bright);  --accent-rgb: 56,189,248; }
.explore-hub .hub-card[data-c="green"]  { --accent: var(--green);       --accent-rgb: 52,211,153; }
.explore-hub .hub-card[data-c="indigo"] { --accent: var(--indigo-soft); --accent-rgb: 129,140,248; }
.explore-hub .hub-card[data-c="amber"]  { --accent: var(--amber);       --accent-rgb: 251,191,36; }

.explore-hub .hub-card-icon {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(var(--accent-rgb), .15);
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), .3);
}
.explore-hub .hub-card-title {
  font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px;
  color: var(--ink); letter-spacing: -0.015em;
}
.explore-hub .hub-card-body {
  font-size: 14px; line-height: 1.5; color: var(--ink-70);
}
.explore-hub .hub-card-link {
  margin-top: auto;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  color: var(--accent); letter-spacing: .05em; text-transform: uppercase; font-weight: 700;
}

/* ── Footer ── */
.explore-hub .hub-footer {
  margin-top: 80px; padding: 40px;
  background: linear-gradient(135deg, rgba(14,165,233,.08), rgba(129,140,248,.08));
  border: 1px solid var(--ink-10);
  border-radius: 20px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; flex-wrap: wrap;
}
.explore-hub .hub-footer-text {
  font-family: 'Sora', sans-serif; font-weight: 700; font-size: 20px;
  color: var(--ink); line-height: 1.4;
}
.explore-hub .hub-footer-text .emph {
  color: var(--sky-bright); font-weight: 800;
}
.explore-hub .hub-footer-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 28px; font-size: 15px; font-weight: 700;
  color: var(--cobalt-deepest); background: var(--sky-bright);
  border-radius: 12px; text-decoration: none;
  transition: transform .15s, box-shadow .15s;
}
.explore-hub .hub-footer-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(56,189,248,.5);
}

/* ── Responsive ── */
@media (max-width: 720px) {
  .explore-hub .hub-section { padding: 80px 16px 60px; }
  .explore-hub .hub-headline { font-size: 38px; }
  .explore-hub .hub-sub { font-size: 15px; }
  .explore-hub .hub-cards { grid-template-columns: 1fr; gap: 14px; }
  .explore-hub .hub-card { padding: 24px 22px; }
  .explore-hub .hub-footer { flex-direction: column; text-align: center; padding: 28px; }
  .explore-hub .float-nav { padding: 4px 6px; gap: 4px; top: 12px; right: 12px; }
  .explore-hub .float-nav-link { padding: 6px 10px; font-size: 12px; }
  .explore-hub .float-nav-cta { padding: 6px 12px; font-size: 12px; }
}
`;
