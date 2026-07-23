import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';
import DisclaimerLink from '../../components/DisclaimerLink';

/**
 * ExploreHub — public /explore page, converted into the main tools-first
 * sales page ("explain all"). Home (/) is the cinematic video hook; this page
 * does the selling: tools grid, pricing.
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
      <div className="explore-sales">

        {/* NAV */}
        <header className="es-nav">
          <Link to="/" className="es-logo">
            <span className="es-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="9,5 9,19 20,12" fill="#04122b" /></svg></span>
            SuperAd<em>Pro</em>
          </Link>
          <nav className="es-links">
            <a href="#tools">Tools</a>
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
          <p className="es-sub reveal">One $100 payment unlocks the full platform — page &amp; funnel builders, lead finder, autoresponder and video campaigns. Use it to grow your own business, your way.</p>
          <div className="es-video-wrap reveal">
            <video controls preload="metadata" playsInline poster="/static/images/explore-tour-poster.jpg">
              <source src="/static/videos/explore-tour.mp4" type="video/mp4" />
            </video>
          </div>
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

        {/* TOOLS */}
        <section className="es-sec" id="tools">
          <p className="es-eyebrow reveal">The toolkit</p>
          <h2 className="reveal">Everything you need to market your business</h2>
          <p className="es-lead reveal">A complete suite of AI-powered tools — no stitching together five subscriptions.</p>
          <div className="es-tools">
            <div className="es-card reveal"><div className="es-card-img"><img src="/static/images/tools/superpages.jpg" alt="SuperPages" loading="lazy" /></div><h3>SuperPages</h3><p>Drag-and-drop landing pages and full funnels that load fast and convert — no designer, no code.</p><div className="es-tag">PAGE &amp; FUNNEL BUILDER</div></div>
            <div className="es-card reveal"><div className="es-card-img"><img src="/static/images/tools/linkhub.jpg" alt="LinkHub" loading="lazy" /></div><h3>LinkHub</h3><p>One smart link-in-bio for every channel — your whole presence on a single branded page.</p><div className="es-tag">LINK-IN-BIO</div></div>
            <div className="es-card reveal"><div className="es-card-img"><img src="/static/images/tools/leadfinder.jpg" alt="Lead Finder" loading="lazy" /></div><h3>Lead Finder</h3><p>Surface and organise prospects, then turn them into a working pipeline you can act on.</p><div className="es-tag">PROSPECTING</div></div>
            <div className="es-card reveal"><div className="es-card-img"><img src="/static/images/tools/autoresponder.jpg" alt="Autoresponder & CRM" loading="lazy" /></div><h3>Autoresponder &amp; CRM</h3><p>Capture contacts, segment your audience, and send automated email campaigns that follow up for you.</p><div className="es-tag">EMAIL &amp; CONTACTS</div></div>
            <div className="es-card reveal"><div className="es-card-img"><img src="/static/images/tools/campaign.jpg" alt="Campaign Videos" loading="lazy" /></div><h3>Campaign Videos</h3><p>Launch video advertising campaigns and put your message in front of a real, engaged audience.</p><div className="es-tag">VIDEO ADVERTISING</div></div>
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
              </ul>
              <Link to="/register" className="es-btn es-primary es-lg" style={{ width: '100%', justifyContent: 'center' }}>Start for $20/mo</Link>
            </div>
          </div>

          <div className="es-aff reveal">
            <p><b>Already love AdvantageLife?</b> Refer others and earn through our optional affiliate programme.</p>
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
.explore-sales{
  --es-ink:#0a1438;--es-ink2:#1e2c54;--es-dim:#5b6b8c;--es-line:#e6edf8;
  --es-cy1:#0891b2;--es-cy2:#06b6d4;--es-cy3:#22d3ee;--es-sky:#0ea5e9;--es-cob:#1e3a8a;--es-vio:#7c3aed;--es-grn:#16a34a;
  --es-shadow:0 30px 70px -36px rgba(20,45,110,.32);--es-shadow-sm:0 14px 36px -20px rgba(20,45,110,.30);
  position:relative;color:var(--es-ink);font-family:'DM Sans',sans-serif;line-height:1.6;min-height:100vh;overflow-x:hidden;
  background:
    radial-gradient(760px 420px at 50% -4%, rgba(6,182,212,.07), transparent 65%),
    radial-gradient(820px 640px at 8% 10%, rgba(124,58,237,.045), transparent 55%),
    linear-gradient(180deg,#fbfdff 0%,#f4f8ff 26%,#ffffff 55%);}
.explore-sales *{box-sizing:border-box}
.explore-sales a{text-decoration:none}
.explore-sales h1,.explore-sales h2,.explore-sales h3,.explore-sales h4{font-family:'Sora',sans-serif;color:var(--es-ink)}
.explore-sales .es-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;height:74px;padding:0 28px;max-width:1180px;margin:0 auto;background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--es-line)}
.explore-sales .es-logo{display:flex;align-items:center;gap:11px;font-family:'Sora',sans-serif;font-weight:800;color:var(--es-ink);font-size:21px;letter-spacing:-.02em}
.explore-sales .es-logo em{font-style:normal;color:var(--es-cy1)}
.explore-sales .es-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--es-cy2),var(--es-cob));display:grid;place-items:center;box-shadow:0 8px 20px -6px rgba(8,145,178,.6)}
.explore-sales .es-mark svg{margin-left:1px}
.explore-sales .es-mark svg polygon{fill:#fff}
.explore-sales .es-links{display:flex;gap:8px}
.explore-sales .es-links a{color:var(--es-ink2);font-size:15px;font-weight:600;padding:9px 14px;border-radius:9px;transition:background .2s}
.explore-sales .es-links a:hover{background:#f3f7ff}
.explore-sales .es-nav-cta{display:flex;gap:9px;align-items:center}
.explore-sales .es-btn{font-family:'Sora',sans-serif;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .25s,background .2s;border:none}
.explore-sales .es-ghost{color:var(--es-ink);background:#fff;padding:10px 16px;font-size:14px;border:1.5px solid var(--es-line);border-radius:11px;box-shadow:var(--es-shadow-sm)}
.explore-sales .es-ghost:hover{transform:translateY(-2px);border-color:var(--es-cy2)}
.explore-sales .es-primary{color:#fff;background:linear-gradient(135deg,var(--es-cy1),var(--es-cob));padding:11px 20px;font-size:14.5px;border-radius:11px;box-shadow:0 14px 30px -14px rgba(8,145,178,.6)}
.explore-sales .es-primary:hover{transform:translateY(-2px);box-shadow:0 18px 38px -14px rgba(8,145,178,.75)}
.explore-sales .es-lg{padding:15px 30px;font-size:16px;border-radius:13px}
.explore-sales .es-lang-wrap{position:relative}
.explore-sales .es-lang{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border-radius:10px;background:#fff;border:1px solid var(--es-line);color:var(--es-ink2);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;cursor:pointer}
.explore-sales .es-lang:hover{background:#f3f7ff}
.explore-sales .es-flag{font-size:14px}
.explore-sales .es-lang-menu{position:absolute;top:48px;right:0;background:#fff;border:1px solid var(--es-line);border-radius:12px;padding:6px;display:flex;flex-direction:column;max-height:300px;overflow:auto;min-width:180px;box-shadow:var(--es-shadow);z-index:60}
.explore-sales .es-lang-item{display:flex;align-items:center;gap:9px;padding:9px 12px;background:transparent;border:none;color:var(--es-dim);font-size:13.5px;cursor:pointer;border-radius:8px;text-align:left;white-space:nowrap}
.explore-sales .es-lang-item:hover{background:#f3f7ff;color:var(--es-ink)}
.explore-sales .es-hero{max-width:980px;margin:0 auto;padding:74px 24px 70px;text-align:center}
.explore-sales .es-pill{display:inline-flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:11.5px;letter-spacing:.1em;font-weight:700;color:var(--es-cy1);border:1px solid var(--es-line);background:#fff;padding:9px 16px;border-radius:999px;text-transform:uppercase;box-shadow:var(--es-shadow-sm)}
.explore-sales .es-dot{width:7px;height:7px;border-radius:50%;background:var(--es-cy2)}
.explore-sales .es-hero h1{font-weight:800;font-size:clamp(40px,6vw,64px);line-height:1.04;letter-spacing:-.03em;margin:24px auto 0;max-width:16ch}
.explore-sales .es-grad{background:linear-gradient(115deg,var(--es-cy1),var(--es-cy2) 55%,var(--es-vio));-webkit-background-clip:text;background-clip:text;color:transparent}
.explore-sales .es-sub{font-size:clamp(16px,2vw,20px);color:var(--es-dim);max-width:60ch;margin:22px auto 0}
.explore-sales .es-cta-row{display:flex;gap:14px;justify-content:center;margin-top:34px;flex-wrap:wrap}
.explore-sales .es-stats{display:flex;justify-content:center;margin-top:44px}
.explore-sales .es-stat{padding:0 28px;border-left:1px solid var(--es-line)}
.explore-sales .es-stat:first-child{border-left:none}
.explore-sales .es-num{font-family:'Sora',sans-serif;font-weight:800;color:var(--es-ink);font-size:32px;letter-spacing:-.02em;line-height:1}
.explore-sales .es-lbl{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--es-dim);margin-top:7px}
.explore-sales .es-sec{max-width:1180px;margin:0 auto;padding:88px 24px}
.explore-sales .es-video-wrap{max-width:880px;margin:40px auto 0;border:1px solid var(--es-line);border-radius:20px;overflow:hidden;background:#0a1640;box-shadow:var(--es-shadow);line-height:0}
.explore-sales .es-video-wrap video{display:block;width:100%;height:auto}
.explore-sales .es-eyebrow{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--es-cy1);text-align:center}
.explore-sales h2{font-weight:800;font-size:clamp(28px,3.6vw,42px);line-height:1.1;letter-spacing:-.02em;text-align:center;margin:14px auto 0;max-width:18ch}
.explore-sales .es-lead{color:var(--es-dim);text-align:center;max-width:56ch;margin:16px auto 0;font-size:17px}
.explore-sales .es-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:50px}
.explore-sales .es-card{border:1px solid var(--es-line);border-radius:18px;background:#fff;padding:0 0 24px;overflow:hidden;box-shadow:var(--es-shadow-sm);transition:transform .25s,box-shadow .25s}
.explore-sales .es-card:hover{transform:translateY(-5px);box-shadow:var(--es-shadow)}
.explore-sales .es-card-img{margin:0 0 18px;border-radius:0;overflow:hidden;aspect-ratio:3/2;background:#eef4fb;border-bottom:1px solid var(--es-line)}
.explore-sales .es-card-img img{display:block;width:100%;height:100%;object-fit:cover}
.explore-sales .es-card h3{font-weight:800;font-size:19px;margin:0 24px 8px;letter-spacing:-.01em}
.explore-sales .es-card p{font-size:14.5px;color:var(--es-dim);margin:0 24px}
.explore-sales .es-tag{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--es-cy1);background:#eaf6fb;border-radius:7px;padding:5px 9px;margin:14px 24px 0;display:inline-block}
.explore-sales .es-studio{margin-top:0;border-radius:24px;border:1px solid var(--es-line);background:#fff;padding:48px;position:relative;overflow:hidden;display:grid;grid-template-columns:1.05fr 1fr;gap:44px;align-items:center;box-shadow:var(--es-shadow-sm)}
.explore-sales .es-studio::before{content:'';position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,211,238,.16),transparent);pointer-events:none}
.explore-sales .es-studio h2{text-align:left;margin:14px 0 0;max-width:none}
.explore-sales .es-studio .es-eyebrow,.explore-sales .es-studio .es-lead{text-align:left}
.explore-sales .es-studio .es-lead{margin:18px 0 0;max-width:none}
.explore-sales .es-chips{display:flex;gap:9px;flex-wrap:wrap;margin-top:24px}
.explore-sales .es-chip{font-size:13px;font-weight:600;color:var(--es-ink2);border:1px solid var(--es-line);background:#fff;padding:8px 15px;border-radius:999px;box-shadow:var(--es-shadow-sm)}
.explore-sales .es-reel{border-radius:20px;border:1px solid var(--es-line);background:#0a1640;padding:0;box-shadow:var(--es-shadow);overflow:hidden;position:relative}
.explore-sales .es-reel-video{display:block;width:100%;height:auto}
.explore-sales .es-promptbar{display:flex;align-items:center;gap:10px;position:absolute;bottom:14px;left:14px;right:14px;border:1px solid var(--es-line);border-radius:11px;background:rgba(255,255,255,.95);padding:11px 14px;box-shadow:0 8px 20px rgba(0,0,0,.25)}
.explore-sales .es-ph{font-size:13px;color:var(--es-dim)}
.explore-sales .es-go{margin-left:auto;width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--es-cy1),var(--es-cob));display:grid;place-items:center}
.explore-sales .es-go svg{width:15px;height:15px;color:#fff}
.explore-sales .es-who{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:48px}
.explore-sales .es-persona{border:1px solid var(--es-line);border-radius:18px;background:#fff;padding:30px 26px;text-align:center;box-shadow:var(--es-shadow-sm)}
.explore-sales .es-em{width:56px;height:56px;border-radius:15px;margin:0 auto 18px;display:grid;place-items:center;background:linear-gradient(135deg,var(--es-cy1),var(--es-cy3))}
.explore-sales .es-em svg{width:26px;height:26px;color:#fff}
.explore-sales .es-persona h4{font-weight:800;font-size:19px;margin-bottom:9px}
.explore-sales .es-persona p{font-size:14px;color:var(--es-dim)}
.explore-sales .es-price-wrap{max-width:460px;margin:50px auto 0}
.explore-sales .es-price{border:1px solid var(--es-line);border-radius:24px;background:#fff;padding:42px;text-align:center;position:relative;overflow:hidden;box-shadow:var(--es-shadow)}
.explore-sales .es-price::before{content:'';position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,var(--es-cy1),var(--es-cy3))}
.explore-sales .es-plan{font-family:'Sora',sans-serif;font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--es-cy1);margin-top:6px}
.explore-sales .es-amount{font-family:'JetBrains Mono',monospace;font-weight:800;color:var(--es-ink);font-size:60px;letter-spacing:-.02em;margin:12px 0 2px;line-height:1}
.explore-sales .es-amount span{font-size:22px;color:var(--es-dim);font-weight:700}
.explore-sales .es-price ul{list-style:none;text-align:left;margin:24px 0;padding:0;display:grid;gap:13px}
.explore-sales .es-price li{display:flex;gap:11px;align-items:center;font-size:15px;color:var(--es-ink2)}
.explore-sales .es-price li svg{flex:none;width:20px;height:20px;color:var(--es-grn)}
.explore-sales .es-fine{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--es-dim);margin-top:6px}
.explore-sales .es-aff{max-width:1180px;margin:40px auto 0;border:1px solid var(--es-line);border-radius:16px;background:#fff;padding:22px 28px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;text-align:center;box-shadow:var(--es-shadow-sm)}
.explore-sales .es-aff p{font-size:15px;color:var(--es-dim)}
.explore-sales .es-aff b{color:var(--es-ink);font-weight:700}
.explore-sales .es-aff a{color:var(--es-cy1);font-weight:700;font-size:15px}
.explore-sales .es-aff a:hover{text-decoration:underline}
.explore-sales .es-final{text-align:center;padding:96px 24px;background:linear-gradient(135deg,var(--es-cob),#0a1438);position:relative;overflow:hidden;border-radius:0;margin-top:40px}
.explore-sales .es-final::before{content:'';position:absolute;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.2),transparent 62%);left:50%;top:-300px;transform:translateX(-50%);pointer-events:none}
.explore-sales .es-final h2{color:#fff;position:relative}
.explore-sales .es-final .es-lead{color:#bcd0f0;position:relative}
.explore-sales .es-final .es-cta-row{position:relative}
.explore-sales .reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
.explore-sales .reveal.in{opacity:1;transform:none}
@media(max-width:900px){.explore-sales .es-tools{grid-template-columns:repeat(2,1fr)}.explore-sales .es-studio{grid-template-columns:1fr;padding:32px}.explore-sales .es-studio h2,.explore-sales .es-studio .es-eyebrow,.explore-sales .es-studio .es-lead{text-align:center}.explore-sales .es-who{grid-template-columns:1fr}.explore-sales .es-links{display:none}}
@media(max-width:580px){.explore-sales .es-tools{grid-template-columns:1fr}.explore-sales .es-stat{padding:0 16px}.explore-sales .es-hero h1{font-size:36px}}
`;
