import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';
import DisclaimerLink from '../../components/DisclaimerLink';

/**
 * ExploreHub — public /explore page, converted into the main tools-first
 * sales page ("explain all"). Home (/) is the cinematic video hook; this page
 * does the selling: tools grid, Creative Studio spotlight, pricing.
 * Copy is inline English for now; i18n pass to follow (locale backlog).
 * The income/activity sub-pages (/explore/live|stories|showcase|watch-to-earn|
 * compensation) still exist but are intentionally NOT linked from here.
 */
export default function ExploreHub() {
  var tr = useTranslation();
  var i18n = tr.i18n;

  var _lo = useState(false); var langOpen = _lo[0]; var setLangOpen = _lo[1];
  var langRef = useRef(null);
  useEffect(function () {
    function onClick(e) { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); }
    document.addEventListener('pointerdown', onClick);
    return function () { document.removeEventListener('pointerdown', onClick); };
  }, []);
  useEffect(function () { window.scrollTo(0, 0); }, []);
  useEffect(function () {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.explore-sales .reveal').forEach(function (el) { io.observe(el); });
    return function () { io.disconnect(); };
  }, []);
  var currentLang = LANGUAGES.find(function (l) { return l.code === i18n.language; }) || LANGUAGES[0];

  return (
    <>
      <style>{CSS_EXPLORE_SALES}</style>
      <div className="explore-sales-bg" aria-hidden="true" />
      <div className="explore-sales">

        {/* NAV */}
        <header className="es-nav">
          <Link to="/" className="es-logo">
            <span className="es-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="9,5 9,19 20,12" fill="#04122b" /></svg></span>
            SuperAd<em>Pro</em>
          </Link>
          <nav className="es-links">
            <a href="#tools">Tools</a>
            <a href="#studio">Creative Studio</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="es-nav-cta">
            <div ref={langRef} className="es-lang-wrap">
              <button className="es-lang" onClick={function () { setLangOpen(!langOpen); }}>
                <span className="es-flag">{currentLang.flag}</span><span>{currentLang.code.toUpperCase()}</span>
              </button>
              {langOpen && (
                <div className="es-lang-menu">
                  {LANGUAGES.map(function (l) {
                    return (
                      <button key={l.code} className="es-lang-item" onClick={function () { changeLanguage(l.code); setLangOpen(false); }}>
                        <span className="es-flag">{l.flag}</span>{l.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Link to="/login" className="es-btn es-ghost">Log in</Link>
            <Link to="/register" className="es-btn es-primary">Start now</Link>
          </div>
        </header>

        {/* HERO */}
        <section className="es-hero">
          <span className="es-pill reveal"><span className="es-dot" />AI marketing tools · one simple membership</span>
          <h1 className="reveal">Everything you need to<br /><span className="es-grad">market your business.</span></h1>
          <p className="es-sub reveal">One membership unlocks the full platform — page &amp; funnel builders, lead finder, autoresponder, video campaigns, and an AI Creative Studio. Use it to grow your own business, your way.</p>
          <div className="es-cta-row reveal">
            <Link to="/register" className="es-btn es-primary es-lg">Start for $20/mo</Link>
            <a href="#tools" className="es-btn es-ghost es-lg">See the tools</a>
          </div>
          <div className="es-stats reveal">
            <div className="es-stat"><div className="es-num">$20</div><div className="es-lbl">/mo membership</div></div>
            <div className="es-stat"><div className="es-num">13</div><div className="es-lbl">tools included</div></div>
            <div className="es-stat"><div className="es-num">1</div><div className="es-lbl">login for everything</div></div>
          </div>
        </section>

        {/* VIDEO TOUR */}
        <section className="es-sec es-video-sec">
          <p className="es-eyebrow reveal">See it in action</p>
          <h2 className="reveal">The whole platform in under a minute</h2>
          <div className="es-video-wrap reveal">
            <video controls preload="metadata" playsInline poster="/static/images/explore-tour-poster.jpg">
              <source src="/static/videos/explore-tour.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        {/* TOOLS */}
        <section className="es-sec" id="tools">
          <p className="es-eyebrow reveal">The toolkit</p>
          <h2 className="reveal">Everything you need to market your business</h2>
          <p className="es-lead reveal">A complete suite of AI-powered tools — no stitching together five subscriptions.</p>
          <div className="es-tools">
            <div className="es-card reveal"><div className="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></svg></div><h3>SuperPages</h3><p>Drag-and-drop landing pages and full funnels that load fast and convert — no designer, no code.</p><div className="es-tag">PAGE &amp; FUNNEL BUILDER</div></div>
            <div className="es-card reveal"><div className="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg></div><h3>LinkHub</h3><p>One smart link-in-bio for every channel — your whole presence on a single branded page.</p><div className="es-tag">LINK-IN-BIO</div></div>
            <div className="es-card reveal"><div className="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg></div><h3>Lead Finder</h3><p>Surface and organise prospects, then turn them into a working pipeline you can act on.</p><div className="es-tag">PROSPECTING</div></div>
            <div className="es-card reveal"><div className="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v12H5.2L4 17.2V4z" /><path d="M8 9h8M8 12h5" /></svg></div><h3>Autoresponder &amp; CRM</h3><p>Capture contacts, segment your audience, and send automated email campaigns that follow up for you.</p><div className="es-tag">EMAIL &amp; CONTACTS</div></div>
            <div className="es-card reveal"><div className="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m23 7-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg></div><h3>Campaign Videos</h3><p>Launch video advertising campaigns and put your message in front of a real, engaged audience.</p><div className="es-tag">VIDEO ADVERTISING</div></div>
            <div className="es-card reveal"><div className="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2 5 5 .6-3.7 3.4 1 5L12 19l-4.3 2 1-5L5 8.6 10 8z" /></svg></div><h3>Creative Studio</h3><p>Generate scroll-stopping video and images with AI — the creator studio, built right in.</p><div className="es-tag">AI VIDEO &amp; IMAGE →</div></div>
          </div>
        </section>

        {/* CREATIVE STUDIO SPOTLIGHT */}
        <section className="es-sec" id="studio">
          <div className="es-studio reveal">
            <div>
              <p className="es-eyebrow" style={{ textAlign: 'left' }}>Creative Studio</p>
              <h2 style={{ textAlign: 'left', margin: '14px 0 0', maxWidth: 'none' }}>Your digital creator studio</h2>
              <p className="es-lead" style={{ textAlign: 'left', margin: '18px 0 0' }}>Describe what you want and generate professional video and images in minutes. Multiple AI models, studio-grade output, simple pay-as-you-go credits — only pay for what you create.</p>
              <div className="es-chips">
                <span className="es-chip">Text → video</span>
                <span className="es-chip">Image generation</span>
                <span className="es-chip">Multiple AI models</span>
                <span className="es-chip">Pay-per-use credits</span>
              </div>
              <div style={{ marginTop: '28px' }}><Link to="/register" className="es-btn es-primary es-lg">Try Creative Studio</Link></div>
            </div>
            <div className="es-reel">
              <video className="es-reel-video" controls preload="metadata" playsInline poster="/static/images/creative-studio-poster.jpg">
                <source src="/static/videos/creative-studio.mp4" type="video/mp4" />
              </video>
              <div className="es-promptbar"><span className="es-ph">A cinematic product reveal, soft studio light…</span><span className="es-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></div>
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="es-sec">
          <p className="es-eyebrow reveal">Built for</p>
          <h2 className="reveal">Made for people who run their own thing</h2>
          <div className="es-who">
            <div className="es-persona reveal"><div className="es-em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2 3 7l9 5 9-5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5" /></svg></div><h4>Solo founders</h4><p>Run marketing end-to-end without hiring a team or paying for a stack of tools.</p></div>
            <div className="es-persona reveal"><div className="es-em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg></div><h4>Creators</h4><p>Turn an audience into a business with pages, links, video, and email in one place.</p></div>
            <div className="es-persona reveal"><div className="es-em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" /></svg></div><h4>Independent businesses</h4><p>A full marketing department's worth of tooling for the price of a coffee a day.</p></div>
          </div>
        </section>

        {/* PRICING */}
        <section className="es-sec" id="pricing">
          <p className="es-eyebrow reveal">Simple pricing</p>
          <h2 className="reveal">One plan. The whole toolkit.</h2>
          <div className="es-price-wrap reveal">
            <div className="es-price">
              <div className="es-plan">Partner membership</div>
              <div className="es-amount">$20<span>/mo</span></div>
              <p className="es-fine">billed monthly · cancel anytime</p>
              <ul>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>SuperPages — pages &amp; funnels</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>LinkHub link-in-bio</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>Lead Finder &amp; CRM</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>Autoresponder &amp; email campaigns</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>Video advertising campaigns</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>Creative Studio access <span style={{ color: 'var(--es-muted)' }}>(credits pay-as-you-go)</span></li>
              </ul>
              <Link to="/register" className="es-btn es-primary es-lg" style={{ width: '100%', justifyContent: 'center' }}>Start for $20/mo</Link>
            </div>
          </div>

          <div className="es-aff reveal">
            <p><b>Already love SuperAdPro?</b> Refer others and earn through our optional affiliate programme.</p>
            <Link to="/register">Learn about referring →</Link>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="es-final">
          <h2 className="reveal">Start running your marketing today</h2>
          <p className="es-lead reveal">Everything in one place for $20 a month.</p>
          <div className="es-cta-row reveal" style={{ marginTop: '30px' }}><Link to="/register" className="es-btn es-primary es-lg">Start now</Link></div>
        </section>

        <div style={{ textAlign: 'center', padding: '0 0 30px' }}><DisclaimerLink /></div>
      </div>
    </>
  );
}

var CSS_EXPLORE_SALES = `
.explore-sales-bg{position:fixed;inset:0;z-index:-1;background:
  radial-gradient(900px 600px at 78% 6%, rgba(34,211,238,.12), transparent 60%),
  radial-gradient(800px 700px at 12% 28%, rgba(30,58,138,.4), transparent 55%),
  linear-gradient(180deg,#070f2b 0%, #0a1438 42%, #0a1640 100%);}
.explore-sales{--es-cyan:#22d3ee;--es-sky:#0ea5e9;--es-sky-b:#38bdf8;--es-mist:#c7d4f0;--es-muted:#8fa3cf;--es-line:rgba(120,160,230,.16);--es-glass:rgba(18,32,72,.55);
  position:relative;color:var(--es-mist);font-family:'DM Sans',sans-serif;line-height:1.6;min-height:100vh;overflow-x:hidden}
.explore-sales *{box-sizing:border-box}
.explore-sales a{text-decoration:none}
.explore-sales h1,.explore-sales h2,.explore-sales h3,.explore-sales h4{font-family:'Sora',sans-serif;color:#fff}
.explore-sales .es-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;height:68px;padding:0 28px;max-width:1180px;margin:0 auto;backdrop-filter:blur(10px)}
.explore-sales .es-logo{display:flex;align-items:center;gap:10px;font-family:'Sora',sans-serif;font-weight:900;color:#fff;font-size:20px;letter-spacing:-.03em}
.explore-sales .es-logo em{font-style:normal;background:linear-gradient(135deg,var(--es-sky-b),var(--es-cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
.explore-sales .es-mark{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--es-sky),var(--es-cyan));display:grid;place-items:center;box-shadow:0 0 18px rgba(34,211,238,.5)}
.explore-sales .es-mark svg{margin-left:2px}
.explore-sales .es-links{display:flex;gap:28px}
.explore-sales .es-links a{color:var(--es-mist);font-size:14.5px;font-weight:500;transition:color .2s}
.explore-sales .es-links a:hover{color:#fff}
.explore-sales .es-nav-cta{display:flex;gap:10px;align-items:center}
.explore-sales .es-btn{font-family:'Sora',sans-serif;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .25s,background .2s;border:none}
.explore-sales .es-ghost{color:#fff;background:rgba(11,18,48,.4);padding:10px 16px;font-size:14px;border:1px solid var(--es-line);border-radius:10px}
.explore-sales .es-ghost:hover{border-color:rgba(34,211,238,.5);background:rgba(34,211,238,.08)}
.explore-sales .es-primary{color:#04122b;background:linear-gradient(135deg,var(--es-cyan),var(--es-sky));padding:11px 20px;font-size:14.5px;border-radius:11px;box-shadow:0 8px 22px rgba(14,165,233,.35)}
.explore-sales .es-primary:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(34,211,238,.5)}
.explore-sales .es-lg{padding:15px 30px;font-size:16px;border-radius:13px}
.explore-sales .es-lang-wrap{position:relative}
.explore-sales .es-lang{display:inline-flex;align-items:center;gap:6px;padding:9px 13px;border-radius:10px;background:rgba(11,18,48,.4);border:1px solid var(--es-line);color:#fff;font-family:'Sora',sans-serif;font-size:12px;font-weight:700;cursor:pointer}
.explore-sales .es-flag{font-size:14px}
.explore-sales .es-lang-menu{position:absolute;top:46px;right:0;background:#0c1a47;border:1px solid var(--es-line);border-radius:12px;padding:6px;display:flex;flex-direction:column;max-height:280px;overflow:auto;min-width:170px;box-shadow:0 20px 50px rgba(0,5,25,.6);z-index:60}
.explore-sales .es-lang-item{display:flex;align-items:center;gap:9px;padding:9px 12px;background:transparent;border:none;color:var(--es-mist);font-size:13.5px;cursor:pointer;border-radius:8px;text-align:left;white-space:nowrap}
.explore-sales .es-lang-item:hover{background:rgba(34,211,238,.1);color:#fff}
.explore-sales .es-hero{max-width:980px;margin:0 auto;padding:90px 24px 64px;text-align:center}
.explore-sales .es-pill{display:inline-flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.04em;color:var(--es-cyan);border:1px solid rgba(34,211,238,.3);background:rgba(34,211,238,.07);padding:7px 14px;border-radius:999px;text-transform:uppercase}
.explore-sales .es-dot{width:7px;height:7px;border-radius:50%;background:var(--es-cyan);box-shadow:0 0 10px var(--es-cyan)}
.explore-sales .es-hero h1{font-weight:900;font-size:clamp(40px,6vw,72px);line-height:1.04;letter-spacing:-.03em;margin:24px auto 0;max-width:16ch}
.explore-sales .es-grad{background:linear-gradient(120deg,var(--es-cyan),var(--es-sky-b) 70%,#bfe9ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.explore-sales .es-sub{font-size:clamp(16px,2vw,20px);color:var(--es-mist);max-width:60ch;margin:26px auto 0}
.explore-sales .es-cta-row{display:flex;gap:14px;justify-content:center;margin-top:36px;flex-wrap:wrap}
.explore-sales .es-stats{display:flex;justify-content:center;margin-top:46px}
.explore-sales .es-stat{padding:0 28px;border-left:1px solid var(--es-line)}
.explore-sales .es-stat:first-child{border-left:none}
.explore-sales .es-num{font-family:'Sora',sans-serif;font-weight:800;color:#fff;font-size:32px;letter-spacing:-.02em;line-height:1}
.explore-sales .es-lbl{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--es-muted);margin-top:7px}
.explore-sales .es-sec{max-width:1180px;margin:0 auto;padding:90px 24px}
.explore-sales .es-video-sec{padding-top:34px}
.explore-sales .es-video-wrap{max-width:920px;margin:34px auto 0;border:1px solid rgba(34,211,238,.28);border-radius:18px;overflow:hidden;background:#0a1640;box-shadow:0 40px 110px -50px rgba(6,40,90,.95);line-height:0}
.explore-sales .es-video-wrap video{display:block;width:100%;height:auto}
.explore-sales .es-eyebrow{font-family:'JetBrains Mono',monospace;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--es-cyan);text-align:center}
.explore-sales h2{font-weight:700;font-size:clamp(28px,3.6vw,44px);line-height:1.1;letter-spacing:-.02em;text-align:center;margin:14px auto 0;max-width:18ch}
.explore-sales .es-lead{color:var(--es-mist);text-align:center;max-width:56ch;margin:16px auto 0;font-size:17px}
.explore-sales .es-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:50px}
.explore-sales .es-card{border:1px solid var(--es-line);border-radius:16px;background:var(--es-glass);padding:26px;transition:transform .25s,border-color .25s,box-shadow .25s}
.explore-sales .es-card:hover{transform:translateY(-5px);border-color:rgba(34,211,238,.4);box-shadow:0 24px 60px -28px rgba(6,40,90,.9)}
.explore-sales .es-ico{width:48px;height:48px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(14,165,233,.22),rgba(34,211,238,.12));border:1px solid rgba(34,211,238,.25);margin-bottom:18px}
.explore-sales .es-ico svg{width:24px;height:24px;color:var(--es-cyan)}
.explore-sales .es-card h3{font-weight:600;font-size:19px;margin-bottom:8px;letter-spacing:-.01em}
.explore-sales .es-card p{font-size:14.5px;color:var(--es-muted)}
.explore-sales .es-tag{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--es-cyan);margin-top:14px}
.explore-sales .es-studio{margin-top:0;border-radius:24px;border:1px solid rgba(34,211,238,.22);background:linear-gradient(135deg,rgba(16,30,72,.85),rgba(8,18,46,.92));padding:48px;position:relative;overflow:hidden;display:grid;grid-template-columns:1.05fr 1fr;gap:44px;align-items:center}
.explore-sales .es-studio::before{content:'';position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,211,238,.22),transparent);pointer-events:none}
.explore-sales .es-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}
.explore-sales .es-chip{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--es-mist);border:1px solid var(--es-line);background:rgba(10,22,55,.6);padding:7px 12px;border-radius:999px}
.explore-sales .es-reel{border-radius:18px;border:1px solid var(--es-line);background:rgba(7,14,38,.75);padding:16px;box-shadow:0 30px 80px -30px rgba(0,10,40,.9)}
.explore-sales .es-reel-video{display:block;width:100%;height:auto;border-radius:12px}
.explore-sales .es-frame{aspect-ratio:16/10;border-radius:12px;background:radial-gradient(120px 80px at 30% 30%,rgba(34,211,238,.4),transparent 60%),radial-gradient(160px 100px at 75% 70%,rgba(14,165,233,.35),transparent 60%),linear-gradient(135deg,#0c1c4a,#0a1640);display:grid;place-items:center}
.explore-sales .es-play{width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);display:grid;place-items:center}
.explore-sales .es-play svg{width:24px;height:24px;color:#fff;margin-left:3px}
.explore-sales .es-promptbar{display:flex;align-items:center;gap:10px;margin-top:14px;border:1px solid var(--es-line);border-radius:11px;background:rgba(10,22,55,.7);padding:11px 14px}
.explore-sales .es-ph{font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--es-muted)}
.explore-sales .es-go{margin-left:auto;width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--es-cyan),var(--es-sky));display:grid;place-items:center}
.explore-sales .es-go svg{width:15px;height:15px;color:#04122b}
.explore-sales .es-who{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px}
.explore-sales .es-persona{border:1px solid var(--es-line);border-radius:16px;background:rgba(14,26,60,.7);padding:28px;text-align:center}
.explore-sales .es-em{width:54px;height:54px;border-radius:14px;margin:0 auto 16px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(30,58,138,.5),rgba(6,182,212,.18));border:1px solid var(--es-line)}
.explore-sales .es-em svg{width:26px;height:26px;color:var(--es-cyan)}
.explore-sales .es-persona h4{font-weight:600;font-size:17px;margin-bottom:6px}
.explore-sales .es-persona p{font-size:14px;color:var(--es-muted)}
.explore-sales .es-price-wrap{max-width:460px;margin:50px auto 0}
.explore-sales .es-price{border:1px solid rgba(34,211,238,.35);border-radius:22px;background:linear-gradient(180deg,rgba(18,34,80,.8),rgba(9,18,46,.92));padding:40px;text-align:center;position:relative;overflow:hidden;box-shadow:0 40px 110px -50px rgba(6,40,90,.95)}
.explore-sales .es-plan{font-family:'JetBrains Mono',monospace;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--es-cyan)}
.explore-sales .es-amount{font-family:'Sora',sans-serif;font-weight:800;color:#fff;font-size:60px;letter-spacing:-.03em;margin:10px 0 2px;line-height:1}
.explore-sales .es-amount span{font-size:20px;color:var(--es-muted);font-weight:600}
.explore-sales .es-price ul{list-style:none;text-align:left;margin:24px 0;padding:0;display:grid;gap:12px}
.explore-sales .es-price li{display:flex;gap:11px;align-items:flex-start;font-size:15px;color:var(--es-mist)}
.explore-sales .es-price li svg{flex:none;width:19px;height:19px;color:var(--es-cyan);margin-top:1px}
.explore-sales .es-fine{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--es-muted);margin-top:6px}
.explore-sales .es-aff{max-width:1180px;margin:64px auto 0;border:1px solid var(--es-line);border-radius:16px;background:rgba(12,24,58,.5);padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.explore-sales .es-aff p{font-size:14.5px;color:var(--es-mist)}
.explore-sales .es-aff b{color:#fff;font-weight:600}
.explore-sales .es-aff a{color:var(--es-cyan);font-weight:600;font-size:14px}
.explore-sales .es-aff a:hover{text-decoration:underline}
.explore-sales .es-final{text-align:center;padding:100px 24px}
.explore-sales .reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
.explore-sales .reveal.in{opacity:1;transform:none}
@media(max-width:900px){.explore-sales .es-tools{grid-template-columns:repeat(2,1fr)}.explore-sales .es-studio{grid-template-columns:1fr;padding:32px}.explore-sales .es-who{grid-template-columns:1fr}.explore-sales .es-links{display:none}}
@media(max-width:580px){.explore-sales .es-tools{grid-template-columns:1fr}.explore-sales .es-stat{padding:0 16px}}
`;
