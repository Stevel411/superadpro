import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';

// Public landing page — light "Daylight" redesign (23 Jun 2026). Replaces the
// single-screen dark hero with a full landing page: hero, toolkit, the three
// income streams, a dedicated advertising-framed Campaign Grid section, how it
// works, value/pricing and footer. Hero core strings stay on i18n (existing
// homePage.* keys); the new section copy is English-first pending the i18n pass.
// All CSS scoped under .home-page with hp- prefixed classes.
export default function HomePage() {
  var { t, i18n } = useTranslation();
  var [langOpen, setLangOpen] = useState(false);
  var langRef = useRef(null);

  useEffect(function () {
    function onClick(e) { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); }
    document.addEventListener('pointerdown', onClick);
    return function () { document.removeEventListener('pointerdown', onClick); };
  }, []);

  var currentLang = LANGUAGES.find(function (l) { return l.code === i18n.language; }) || LANGUAGES[0];

  return (
    <>
      <style>{CSS_HOMEPAGE}</style>
      <div className="home-page">

        {/* NAV */}
        <nav className="hp-nav">
          <div className="hp-wrap hp-nav-in">
            <div className="hp-brand">
              <div className="hp-mk"><svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>
              <div className="hp-nm">SuperAd<em>Pro</em></div>
            </div>
            <div className="hp-links">
              <Link to="/explore" className="hp-navlink">{t('homePage.navExplore', { defaultValue: 'Explore' })}</Link>
              <div ref={langRef} className="hp-lang-wrap">
                <button type="button" className="hp-lang-pill" onClick={function () { setLangOpen(!langOpen); }}>
                  <span className="hp-lang-flag">{currentLang.flag}</span>
                  <span className="hp-lang-code">{currentLang.code.toUpperCase()}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .6 }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {langOpen && (
                  <div className="hp-lang-dropdown">
                    {LANGUAGES.map(function (lang) {
                      var active = lang.code === i18n.language;
                      return (
                        <button key={lang.code} type="button" className={'hp-lang-item' + (active ? ' active' : '')}
                          onClick={function () { changeLanguage(lang.code); setLangOpen(false); }}>
                          <span className="hp-lang-item-flag">{lang.flag}</span>
                          <span className="hp-lang-item-name">{lang.name}</span>
                          {active && <span className="hp-lang-item-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Link to="/login" className="hp-navlink">{t('homePage.navSignin', { defaultValue: 'Sign in' })}</Link>
              <Link to="/register" className="hp-btn hp-btn-pri hp-nav-cta">{t('homePage.navCta', { defaultValue: 'Create account' })}</Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="hp-hero">
          <div className="hp-slash"></div>
          <div className="hp-glow hp-glow-a"></div>
          <div className="hp-wrap hp-hero-in">
            <div className="hp-hero-copy">
              <span className="hp-eyebrow">The all-in-one creator platform</span>
              <h1 className="hp-h1">{t('homePage.headlineLine1')}<br/><span className="hp-g">{t('homePage.headlineLine2')}</span></h1>
              <p className="hp-sub" dangerouslySetInnerHTML={{ __html: t('homePage.sub') }}></p>
              <div className="hp-cta">
                <Link to="/register" className="hp-btn hp-btn-pri">{t('homePage.ctaPrimary')} &nbsp;→</Link>
                <Link to="/explore" className="hp-btn hp-btn-ghost">▷ &nbsp;{t('homePage.ctaSecondary')}</Link>
              </div>
              <div className="hp-trust"><span className="hp-dot"></span> No card to start &nbsp;·&nbsp; Full toolkit from $20/mo &nbsp;·&nbsp; Cancel anytime</div>
              <div className="hp-socials">
                <a href="#" title="YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg></a>
                <a href="#" title="X"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                <a href="#" title="Facebook"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
                <a href="#" title="TikTok"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z"/></svg></a>
                <a href="#" title="Instagram"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
              </div>
            </div>
            <div className="hp-visual">
              <div className="hp-glow hp-glow-b"></div>
              <div className="hp-win hp-win-main">
                <div className="hp-bar"><i></i><i></i><i></i></div>
                <div className="hp-win-body">
                  <div className="hp-tile a"><div className="hp-tl">Creative Studio</div><div className="hp-ts">AI video · images · voice</div></div>
                  <div className="hp-tile b"><div className="hp-tl">SuperPages</div><div className="hp-ts">Pages &amp; funnels</div></div>
                  <div className="hp-tile c"><div className="hp-tl">SuperLeads</div><div className="hp-ts">Find &amp; nurture leads</div></div>
                  <div className="hp-tile d"><div className="hp-tl">Ad Studio</div><div className="hp-ts">Video campaigns</div></div>
                </div>
              </div>
              <div className="hp-win hp-win-grid">
                <div className="hp-gt">Campaign Grid</div>
                <div className="hp-g4">
                  <div className="hp-cell g"></div><div className="hp-cell x"></div><div className="hp-cell x"></div><div className="hp-cell v"></div>
                  <div className="hp-cell g"></div><div className="hp-cell x"></div><div className="hp-cell"></div><div className="hp-cell v"></div>
                  <div className="hp-cell x"></div><div className="hp-cell"></div><div className="hp-cell"></div><div className="hp-cell v"></div>
                  <div className="hp-cell"></div><div className="hp-cell"></div><div className="hp-cell"></div><div className="hp-cell v"></div>
                </div>
              </div>
              <div className="hp-chip"><div className="hp-chip-ic">$</div><div><div className="hp-chip-t">100% to members</div><div className="hp-chip-s">on the Campaign Grid</div></div></div>
            </div>
          </div>
        </section>

        {/* TOOLKIT */}
        <section className="hp-sec">
          <div className="hp-wrap">
            <div className="hp-sechead">
              <span className="hp-eyebrow hp-eyebrow-c">One membership</span>
              <h2>The whole toolkit, included</h2>
              <p>Everything you need to build, market and sell — no add-ons, no per-tool pricing. Use them for your own business whether you ever refer anyone or not.</p>
            </div>
            <div className="hp-tools">
              <div className="hp-tcard t1"><div className="hp-tic"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 17l5-5 4 4 3-3 6 6M9 9h.01"/></svg></div><h4>Creative Studio</h4><p>Generate AI video, images, music and voiceover for your campaigns in minutes.</p></div>
              <div className="hp-tcard t2"><div className="hp-tic"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 7l-7 5 7 5V7zM1 5h15v14H1z"/></svg></div><h4>Ad Studio</h4><p>Launch targeted video advertising campaigns and reach real, watching audiences.</p></div>
              <div className="hp-tcard t3"><div className="hp-tic"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div><h4>SuperPages</h4><p>Build high-converting landing pages and funnels with a drag-and-drop editor.</p></div>
              <div className="hp-tcard t4"><div className="hp-tic"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></div><h4>SuperLeads</h4><p>Find leads and follow up automatically with a built-in email autoresponder.</p></div>
            </div>
          </div>
        </section>

        {/* STREAMS */}
        <section className="hp-sec hp-alt">
          <div className="hp-wrap">
            <div className="hp-sechead">
              <span className="hp-eyebrow hp-eyebrow-c">Optional · earn alongside</span>
              <h2>Three ways the money comes back</h2>
              <p>The tools stand on their own. But if you choose to share SuperAdPro, there are three income streams — explained in full in the compensation plan.</p>
            </div>
            <div className="hp-streams">
              <div className="hp-scard s1"><div className="hp-strip"></div><div className="hp-tag">Stream 1 · Membership</div><h4>Refer, earn monthly</h4><div className="hp-big">$10<span>/mo</span></div><div className="hp-lab">per active referral — 2 referrals cover your own membership</div></div>
              <div className="hp-scard s2"><div className="hp-strip"></div><div className="hp-tag">Stream 2 · Video advertising</div><h4>100% to members</h4><div className="hp-big">$80–$4,000</div><div className="hp-lab">a revenue-share advertising product — full breakdown below</div></div>
              <div className="hp-scard s3"><div className="hp-strip"></div><div className="hp-tag">Stream 3 · Creator Credits</div><h4>Flat share on packs</h4><div className="hp-big">20%</div><div className="hp-lab">to you on every credit pack your referrals buy — first buy &amp; every repurchase</div></div>
            </div>
            <div className="hp-center"><Link to="/compensation" className="hp-btn hp-btn-ghost">See the full compensation plan &nbsp;→</Link></div>
          </div>
        </section>

        {/* ADVERTISING ENGINE */}
        <section className="hp-sec">
          <div className="hp-wrap">
            <div className="hp-sechead">
              <span className="hp-eyebrow hp-eyebrow-c">Stream 2 · How the Campaign Grid works</span>
              <h2>It's an advertising platform first</h2>
              <p>The Campaign Grid isn't a money game — it's how SuperAdPro shares its advertising revenue. You buy a campaign tier to get your content seen, real members watch it, and 100% of that revenue is shared back across the network.</p>
            </div>
            <div className="hp-adgrid">
              <div>
                <div className="hp-adpoint"><div className="hp-ai">1</div><div><h4>Buy a campaign tier</h4><p>Activate a tier from $20 to $1,000 to put your content into the advertising rotation.</p></div></div>
                <div className="hp-adpoint"><div className="hp-ai">2</div><div><h4>Real members watch</h4><p>Every member watches daily to stay qualified — so your campaign reaches a genuinely engaged audience, not bots.</p></div></div>
                <div className="hp-adpoint"><div className="hp-ai">3</div><div><h4>100% of the revenue is shared</h4><p>Split 50% direct · 25% across five levels · 25% bonus pool. The company keeps 0%.</p></div></div>
                <div className="hp-adcallout"><b>$80 → $4,000</b> bonus pool per completed grid</div>
              </div>
              <div className="hp-advisual">
                <div className="hp-adsplit">
                  <div className="hp-adseg sa"><div className="hp-p">50%</div><div className="hp-t">Direct</div></div>
                  <div className="hp-adseg sb"><div className="hp-p">25%</div><div className="hp-t">Uni-level</div></div>
                  <div className="hp-adseg sc"><div className="hp-p">25%</div><div className="hp-t">Bonus</div></div>
                </div>
                <div className="hp-adg4">
                  <div className="hp-adcell g">1</div><div className="hp-adcell x">2</div><div className="hp-adcell x">3</div><div className="hp-adcell v">★</div>
                  <div className="hp-adcell g">5</div><div className="hp-adcell x">6</div><div className="hp-adcell o">7</div><div className="hp-adcell v">★</div>
                  <div className="hp-adcell x">9</div><div className="hp-adcell o">10</div><div className="hp-adcell o">11</div><div className="hp-adcell v">★</div>
                  <div className="hp-adcell o">13</div><div className="hp-adcell o">14</div><div className="hp-adcell o">15</div><div className="hp-adcell v">★</div>
                </div>
                <div className="hp-adtiers"><b>8 tiers</b> · $20 · $50 · $100 · $200 · $400 · $600 · $800 · $1,000</div>
              </div>
            </div>
            <div className="hp-addisc">100% to members applies to the Campaign Grid. Earnings depend on grid activity and completion; no income is guaranteed.</div>
          </div>
        </section>

        {/* HOW */}
        <section className="hp-sec hp-alt">
          <div className="hp-wrap">
            <div className="hp-sechead"><span className="hp-eyebrow hp-eyebrow-c">How it works</span><h2>Up and running in minutes</h2></div>
            <div className="hp-steps">
              <div className="hp-step"><div className="hp-n">1</div><h4>Create your free account</h4><p>Sign up in seconds — no card needed to look around and explore the platform.</p></div>
              <div className="hp-step"><div className="hp-n">2</div><h4>Unlock the toolkit</h4><p>One $20/month membership switches on every tool — Creative Studio, Ad Studio, SuperPages and SuperLeads.</p></div>
              <div className="hp-step"><div className="hp-n">3</div><h4>Build, grow &amp; optionally earn</h4><p>Grow your own business with the tools — and if you want, share the platform across the three income streams.</p></div>
            </div>
          </div>
        </section>

        {/* VALUE */}
        <section className="hp-sec">
          <div className="hp-wrap">
            <div className="hp-value">
              <div className="hp-vg"></div>
              <div>
                <h2>One membership.<br/>Everything included.</h2>
                <p className="hp-vsub">No tool tiers, no upsells, no per-seat pricing. Every creator tool, the page builder, the autoresponder and the advertising platform — all in.</p>
                <ul>
                  <li><span className="hp-ck">✓</span> AI Creative Studio — video, images, music &amp; voice</li>
                  <li><span className="hp-ck">✓</span> SuperPages builder + custom domains</li>
                  <li><span className="hp-ck">✓</span> SuperLeads finder + autoresponder</li>
                  <li><span className="hp-ck">✓</span> Ad Studio video advertising</li>
                  <li><span className="hp-ck">✓</span> Three optional income streams</li>
                </ul>
              </div>
              <div className="hp-pricecard">
                <div className="hp-pe">Full membership</div>
                <div className="hp-pv">$20<span>/mo</span></div>
                <div className="hp-pd">Everything above, one simple price</div>
                <Link to="/register" className="hp-btn hp-btn-pri hp-pcbtn">Create free account</Link>
                <div className="hp-fine">Start free · upgrade when you're ready · cancel anytime</div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL */}
        <section className="hp-final"><div className="hp-wrap">
          <h2>Build, market &amp; create —<br/>all in one place.</h2>
          <p>Join the creators growing their business with SuperAdPro.</p>
          <Link to="/register" className="hp-btn hp-btn-pri hp-final-btn">Create your free account &nbsp;→</Link>
        </div></section>

        {/* FOOTER */}
        <footer className="hp-footer">
          <div className="hp-wrap hp-foot-in">
            <div className="hp-fb">
              <div className="hp-fnm">SuperAd<span>Pro</span></div>
              <p>The all-in-one platform for creators to build, market and grow — from one simple membership.</p>
            </div>
            <div className="hp-cols">
              <div className="hp-col"><h5>Product</h5><Link to="/explore">Explore</Link><Link to="/explore">Free tools</Link><Link to="/compensation">Campaign Grid</Link><Link to="/register">Pricing</Link></div>
              <div className="hp-col"><h5>Company</h5><Link to="/faq">FAQ</Link><Link to="/compensation">Compensation plan</Link><Link to="/login">Sign in</Link></div>
              <div className="hp-col"><h5>Legal</h5><Link to="/legal">Terms &amp; legal</Link><Link to="/legal/income-disclosure">Income disclosure</Link><Link to="/legal">Privacy</Link></div>
            </div>
          </div>
          <div className="hp-wrap"><div className="hp-base">© 2026 SuperAdPro. Earnings depend on individual effort; no income is guaranteed. See <Link to="/legal/income-disclosure">full income disclosure</Link>.</div></div>
        </footer>

      </div>
    </>
  );
}

var CSS_HOMEPAGE = `
.home-page{
  --ink:#0a1438;--ink2:#1e2c54;--dim:#5b6b8c;--line:#e6edf8;
  --cy1:#0891b2;--cy2:#06b6d4;--cy3:#22d3ee;--sky:#0ea5e9;
  --grn:#16a34a;--grn2:#22c55e;--gold:#f59e0b;--vio:#7c3aed;--cob:#1e3a8a;
  --shadow:0 30px 70px -36px rgba(20,45,110,.32);--shadow-sm:0 14px 36px -20px rgba(20,45,110,.30);
  font-family:'DM Sans',sans-serif;color:var(--ink);background:#fff;min-height:100vh;overflow-x:hidden;
}
.home-page h1,.home-page h2,.home-page h3,.home-page h4,.home-page h5{font-family:'Sora',sans-serif}
.home-page .hp-wrap{max-width:1200px;margin:0 auto;padding:0 48px}
.home-page .hp-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:'Sora';font-weight:700;font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:var(--cy1)}
.home-page .hp-eyebrow::before{content:"";width:30px;height:2.5px;border-radius:3px;background:linear-gradient(90deg,var(--cy2),transparent)}
.home-page .hp-eyebrow-c{margin-bottom:2px}
.home-page .hp-btn{display:inline-flex;align-items:center;gap:8px;font-family:'Sora';font-weight:700;font-size:16px;border-radius:13px;padding:15px 28px;text-decoration:none;cursor:pointer;border:none;transition:transform .18s,box-shadow .2s}
.home-page .hp-btn-pri{background:linear-gradient(135deg,var(--cy1),var(--cob));color:#fff;box-shadow:0 16px 32px -14px rgba(8,145,178,.55)}
.home-page .hp-btn-pri:hover{transform:translateY(-2px)}
.home-page .hp-btn-ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line);box-shadow:var(--shadow-sm)}
.home-page .hp-btn-ghost:hover{transform:translateY(-2px)}
.home-page .hp-center{text-align:center}

/* NAV */
.home-page .hp-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.82);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.home-page .hp-nav-in{display:flex;align-items:center;height:78px;gap:24px}
.home-page .hp-brand{display:flex;align-items:center;gap:13px}
.home-page .hp-mk{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--cy2),var(--cob));display:grid;place-items:center;box-shadow:0 8px 20px -6px rgba(8,145,178,.6)}
.home-page .hp-mk svg{width:17px;height:17px}
.home-page .hp-nm{font-family:'Sora';font-weight:800;font-size:23px}
.home-page .hp-nm em{color:var(--cy1);font-style:normal}
.home-page .hp-links{margin-left:auto;display:flex;align-items:center;gap:8px}
.home-page .hp-navlink{font-weight:600;font-size:15px;color:var(--ink2);text-decoration:none;padding:10px 16px;border-radius:10px}
.home-page .hp-navlink:hover{background:#f3f7ff}
.home-page .hp-nav-cta{padding:11px 22px;font-size:15px}
.home-page .hp-lang-wrap{position:relative}
.home-page .hp-lang-pill{display:inline-flex;align-items:center;gap:6px;padding:9px 13px;border-radius:10px;background:#fff;border:1px solid var(--line);font-family:'Sora';font-weight:700;font-size:13px;color:var(--ink2);cursor:pointer}
.home-page .hp-lang-pill:hover{background:#f3f7ff}
.home-page .hp-lang-flag{font-size:15px;line-height:1}
.home-page .hp-lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:204px;max-height:360px;overflow-y:auto;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:5px;z-index:200}
.home-page .hp-lang-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans';font-size:13.5px;font-weight:500;background:transparent;color:var(--dim);text-align:left}
.home-page .hp-lang-item:hover{background:#f3f7ff;color:var(--ink)}
.home-page .hp-lang-item.active{background:#eaf6fb;color:var(--cy1);font-weight:700}
.home-page .hp-lang-item-flag{font-size:16px;line-height:1}
.home-page .hp-lang-item-name{flex:1}
.home-page .hp-lang-item-check{margin-left:auto;font-size:11px;color:var(--cy1)}

/* HERO */
.home-page .hp-hero{position:relative;overflow:hidden;background:radial-gradient(80% 90% at 90% 0%,#eaf3ff 0%,transparent 55%),radial-gradient(70% 80% at 0% 100%,#f0ecff 0%,transparent 55%),linear-gradient(180deg,#fbfdff,#f4f8ff)}
.home-page .hp-slash{position:absolute;inset:0;pointer-events:none;background:linear-gradient(118deg,transparent 0 58%,rgba(6,182,212,.06) 58% 63%,transparent 63%),linear-gradient(118deg,transparent 0 70%,rgba(124,58,237,.05) 70% 74%,transparent 74%)}
.home-page .hp-glow{position:absolute;border-radius:50%;filter:blur(50px);z-index:0}
.home-page .hp-glow-a{width:420px;height:420px;background:rgba(34,211,238,.18);right:8%;top:6%}
.home-page .hp-glow-b{width:340px;height:340px;background:rgba(124,58,237,.16);right:-40px;bottom:-30px;z-index:-1}
.home-page .hp-hero-in{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center;padding-top:74px;padding-bottom:84px;position:relative;z-index:1}
.home-page .hp-h1{font-weight:800;font-size:66px;line-height:1.02;letter-spacing:-1.5px;margin:22px 0}
.home-page .hp-h1 .hp-g{background:linear-gradient(115deg,var(--cy1),var(--cy2) 55%,var(--vio));-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.home-page .hp-sub{font-size:21px;line-height:1.55;color:var(--dim);max-width:540px}
.home-page .hp-sub strong,.home-page .hp-sub b{color:var(--ink);font-weight:700}
.home-page .hp-cta{display:flex;align-items:center;gap:16px;margin-top:34px;flex-wrap:wrap}
.home-page .hp-trust{display:flex;align-items:center;gap:10px;margin-top:34px;color:var(--dim);font-size:14px;font-weight:600}
.home-page .hp-dot{width:6px;height:6px;border-radius:50%;background:var(--grn2)}
.home-page .hp-socials{display:flex;gap:10px;margin-top:26px}
.home-page .hp-socials a{width:38px;height:38px;border-radius:11px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;color:var(--ink2);box-shadow:var(--shadow-sm);transition:transform .18s}
.home-page .hp-socials a:hover{transform:translateY(-2px)}
.home-page .hp-visual{position:relative;height:520px}
.home-page .hp-win{position:absolute;border-radius:20px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow);overflow:hidden}
.home-page .hp-bar{height:42px;background:linear-gradient(100deg,#f4f8ff,#eef4ff);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:7px;padding:0 16px}
.home-page .hp-bar i{width:10px;height:10px;border-radius:50%;background:#d6e2f3}
.home-page .hp-bar i:nth-child(1){background:#fda4af}.home-page .hp-bar i:nth-child(2){background:#fcd34d}.home-page .hp-bar i:nth-child(3){background:#86efac}
.home-page .hp-win-main{left:30px;top:40px;width:430px;height:300px}
.home-page .hp-win-body{padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
.home-page .hp-tile{border-radius:13px;padding:16px;color:#fff;min-height:80px;display:flex;flex-direction:column;justify-content:space-between}
.home-page .hp-tl{font-family:'Sora';font-weight:700;font-size:14px}
.home-page .hp-ts{font-size:11px;opacity:.9}
.home-page .hp-tile.a{background:linear-gradient(135deg,var(--cy1),var(--cy3))}
.home-page .hp-tile.b{background:linear-gradient(135deg,var(--vio),#a78bfa)}
.home-page .hp-tile.c{background:linear-gradient(135deg,var(--grn),var(--grn2))}
.home-page .hp-tile.d{background:linear-gradient(135deg,var(--gold),#fbbf24)}
.home-page .hp-win-grid{right:-14px;top:250px;width:226px;padding:16px}
.home-page .hp-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.home-page .hp-cell{aspect-ratio:1;border-radius:7px;background:#eef4fb;border:1px solid #e2e9f4}
.home-page .hp-cell.x{background:linear-gradient(135deg,var(--cy2),var(--cy3));border:none}
.home-page .hp-cell.v{background:linear-gradient(135deg,var(--vio),#a78bfa);border:none}
.home-page .hp-cell.g{background:linear-gradient(135deg,var(--gold),#fbbf24);border:none}
.home-page .hp-gt{font-family:'Sora';font-weight:700;font-size:12px;color:var(--ink2);margin-bottom:10px}
.home-page .hp-chip{position:absolute;left:-22px;bottom:18px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:12px 16px;display:flex;align-items:center;gap:11px;z-index:2}
.home-page .hp-chip-ic{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--grn),var(--grn2));display:grid;place-items:center;color:#fff;font-family:'Sora';font-weight:800;font-size:15px}
.home-page .hp-chip-t{font-family:'Sora';font-weight:700;font-size:14px}
.home-page .hp-chip-s{font-size:11px;color:var(--dim)}

/* SECTION SHELL */
.home-page .hp-sec{padding:96px 0}
.home-page .hp-alt{background:linear-gradient(180deg,#f6f9ff,#fff)}
.home-page .hp-sechead{text-align:center;max-width:680px;margin:0 auto 56px}
.home-page .hp-sechead h2{font-weight:800;font-size:46px;letter-spacing:-1px;margin:16px 0 14px}
.home-page .hp-sechead p{font-size:18px;color:var(--dim);line-height:1.6}

/* TOOLKIT */
.home-page .hp-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.home-page .hp-tcard{background:#fff;border:1px solid var(--line);border-radius:20px;padding:30px 26px;box-shadow:var(--shadow-sm);transition:transform .2s}
.home-page .hp-tcard:hover{transform:translateY(-4px)}
.home-page .hp-tic{width:56px;height:56px;border-radius:15px;display:grid;place-items:center;color:#fff;margin-bottom:20px}
.home-page .hp-tic svg{width:26px;height:26px}
.home-page .hp-tcard.t1 .hp-tic{background:linear-gradient(135deg,var(--vio),#a78bfa)}
.home-page .hp-tcard.t2 .hp-tic{background:linear-gradient(135deg,var(--gold),#fbbf24)}
.home-page .hp-tcard.t3 .hp-tic{background:linear-gradient(135deg,var(--cy1),var(--cy3))}
.home-page .hp-tcard.t4 .hp-tic{background:linear-gradient(135deg,var(--grn),var(--grn2))}
.home-page .hp-tcard h4{font-size:21px;font-weight:800;margin-bottom:9px}
.home-page .hp-tcard p{font-size:14.5px;color:var(--dim);line-height:1.6}

/* STREAMS */
.home-page .hp-streams{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-bottom:34px}
.home-page .hp-scard{background:#fff;border:1px solid var(--line);border-radius:20px;padding:32px 28px;box-shadow:var(--shadow-sm);position:relative;overflow:hidden}
.home-page .hp-tag{font-family:'Sora';font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase}
.home-page .hp-scard h4{font-size:24px;font-weight:800;margin:10px 0 16px}
.home-page .hp-big{font-family:'JetBrains Mono';font-weight:800;font-size:40px;line-height:1}
.home-page .hp-big span{font-size:20px}
.home-page .hp-lab{font-size:14px;color:var(--dim);margin-top:8px}
.home-page .hp-scard.s1 .hp-tag,.home-page .hp-scard.s1 .hp-big{color:var(--cob)}
.home-page .hp-scard.s2 .hp-tag,.home-page .hp-scard.s2 .hp-big{color:var(--cy1)}
.home-page .hp-scard.s3 .hp-tag,.home-page .hp-scard.s3 .hp-big{color:var(--vio)}
.home-page .hp-strip{position:absolute;top:0;left:0;right:0;height:5px}
.home-page .hp-scard.s1 .hp-strip{background:linear-gradient(90deg,var(--cob),#3b82f6)}
.home-page .hp-scard.s2 .hp-strip{background:linear-gradient(90deg,var(--cy1),var(--cy3))}
.home-page .hp-scard.s3 .hp-strip{background:linear-gradient(90deg,var(--vio),#a78bfa)}

/* ADVERTISING */
.home-page .hp-adgrid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.home-page .hp-adpoint{display:flex;gap:18px;margin-bottom:24px}
.home-page .hp-ai{width:42px;height:42px;flex:0 0 auto;border-radius:12px;background:linear-gradient(135deg,var(--cy1),var(--cob));color:#fff;font-family:'Sora';font-weight:800;font-size:18px;display:grid;place-items:center;box-shadow:0 10px 22px -10px rgba(8,145,178,.55)}
.home-page .hp-adpoint h4{font-size:19px;font-weight:800;margin-bottom:5px}
.home-page .hp-adpoint p{font-size:14.5px;color:var(--dim);line-height:1.55}
.home-page .hp-adcallout{margin-top:8px;display:inline-block;background:#ecfdf3;border:1.5px solid #86efac;border-radius:13px;padding:13px 22px;color:#15803d;font-weight:700;font-size:15px}
.home-page .hp-adcallout b{font-family:'JetBrains Mono';font-weight:800}
.home-page .hp-advisual{background:#fff;border:1px solid var(--line);border-radius:22px;padding:30px;box-shadow:var(--shadow)}
.home-page .hp-adsplit{display:flex;height:70px;border-radius:12px;overflow:hidden;border:1px solid var(--line);margin-bottom:22px}
.home-page .hp-adseg{display:flex;flex-direction:column;justify-content:center;padding:0 16px;color:#fff}
.home-page .hp-adseg.sa{flex:50;background:linear-gradient(135deg,var(--cy1),var(--cy2))}
.home-page .hp-adseg.sb{flex:25;background:linear-gradient(135deg,var(--sky),#38bdf8)}
.home-page .hp-adseg.sc{flex:25;background:linear-gradient(135deg,var(--vio),#a78bfa)}
.home-page .hp-adseg .hp-p{font-family:'JetBrains Mono';font-weight:800;font-size:21px;line-height:1}
.home-page .hp-adseg .hp-t{font-size:10px;font-weight:700;margin-top:3px}
.home-page .hp-adg4{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.home-page .hp-adcell{aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono';font-weight:800;font-size:15px;color:#fff}
.home-page .hp-adcell.x{background:linear-gradient(140deg,var(--cy2),var(--cy3));color:#02343f}
.home-page .hp-adcell.g{background:linear-gradient(140deg,var(--gold),#fde047);color:#3a1d00}
.home-page .hp-adcell.v{background:linear-gradient(140deg,var(--vio),#a78bfa)}
.home-page .hp-adcell.o{background:#eef4fb;border:1px solid #e2e9f4;color:#aab8d4}
.home-page .hp-adtiers{text-align:center;margin-top:18px;font-size:13px;color:var(--dim)}
.home-page .hp-adtiers b{color:var(--cy1);font-family:'Sora';font-weight:700}
.home-page .hp-addisc{text-align:center;font-size:12.5px;color:#94a3b8;margin-top:30px;font-style:italic}

/* HOW */
.home-page .hp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
.home-page .hp-step{text-align:center}
.home-page .hp-n{width:64px;height:64px;border-radius:50%;background:#fff;border:2px solid var(--cy2);color:var(--cy1);font-family:'Sora';font-weight:800;font-size:26px;display:grid;place-items:center;margin:0 auto 20px;box-shadow:0 10px 26px -12px rgba(8,145,178,.5)}
.home-page .hp-step h4{font-size:20px;font-weight:800;margin-bottom:10px}
.home-page .hp-step p{font-size:15px;color:var(--dim);line-height:1.6;max-width:300px;margin:0 auto}

/* VALUE */
.home-page .hp-value{background:linear-gradient(135deg,var(--cob),#0a1438);border-radius:28px;padding:64px;color:#fff;display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;position:relative;overflow:hidden}
.home-page .hp-vg{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.25),transparent 62%);right:-120px;top:-160px}
.home-page .hp-value h2{font-size:44px;font-weight:800;letter-spacing:-1px;line-height:1.05;position:relative}
.home-page .hp-vsub{font-size:18px;color:#bcd0f0;margin:18px 0 28px;line-height:1.6;position:relative}
.home-page .hp-value ul{list-style:none;display:grid;gap:13px;position:relative}
.home-page .hp-value li{display:flex;align-items:center;gap:12px;font-size:16px;color:#e8f0ff}
.home-page .hp-ck{width:24px;height:24px;border-radius:50%;background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.5);display:grid;place-items:center;color:#4ade80;flex:0 0 auto;font-size:13px}
.home-page .hp-pricecard{background:rgba(255,255,255,.06);border:1px solid rgba(120,160,230,.25);border-radius:22px;padding:38px;text-align:center;backdrop-filter:blur(8px);position:relative}
.home-page .hp-pe{font-family:'Sora';font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--cy3)}
.home-page .hp-pv{font-family:'JetBrains Mono';font-weight:800;font-size:72px;line-height:1;margin:14px 0 4px}
.home-page .hp-pv span{font-size:26px;color:#9fb6e0}
.home-page .hp-pd{color:#bcd0f0;font-size:15px;margin-bottom:26px}
.home-page .hp-pcbtn{width:100%;justify-content:center}
.home-page .hp-fine{font-size:12px;color:#8aa2cc;margin-top:16px}

/* FINAL + FOOTER */
.home-page .hp-final{text-align:center;padding:100px 0}
.home-page .hp-final h2{font-size:50px;font-weight:800;letter-spacing:-1.2px;margin-bottom:18px}
.home-page .hp-final p{font-size:19px;color:var(--dim);margin-bottom:34px}
.home-page .hp-final-btn{font-size:18px;padding:18px 36px}
.home-page .hp-footer{background:#0a1438;color:#bcd0f0;padding:56px 0 38px}
.home-page .hp-foot-in{display:flex;justify-content:space-between;gap:40px;flex-wrap:wrap}
.home-page .hp-fnm{font-family:'Sora';font-weight:800;font-size:21px;color:#fff;margin-bottom:10px}
.home-page .hp-fnm span{color:#22d3ee}
.home-page .hp-fb p{font-size:14px;max-width:300px;line-height:1.6;color:#8aa2cc}
.home-page .hp-cols{display:flex;gap:64px;flex-wrap:wrap}
.home-page .hp-col h5{font-family:'Sora';font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#fff;margin-bottom:16px}
.home-page .hp-col a{display:block;color:#9fb6e0;text-decoration:none;font-size:14.5px;margin-bottom:11px}
.home-page .hp-col a:hover{color:#fff}
.home-page .hp-base{border-top:1px solid rgba(120,160,230,.18);margin-top:44px;padding-top:24px;font-size:12.5px;color:#7d93bd;text-align:center}
.home-page .hp-base a{color:#9fb6e0}

/* RESPONSIVE */
@media(max-width:1080px){
  .home-page .hp-hero-in{grid-template-columns:1fr;gap:30px}
  .home-page .hp-visual{height:440px;max-width:560px}
  .home-page .hp-tools{grid-template-columns:repeat(2,1fr)}
  .home-page .hp-value,.home-page .hp-adgrid{grid-template-columns:1fr;gap:30px}
  .home-page .hp-value{padding:44px}
  .home-page .hp-h1{font-size:52px}
}
@media(max-width:680px){
  .home-page .hp-wrap{padding:0 22px}
  .home-page .hp-streams,.home-page .hp-steps{grid-template-columns:1fr}
  .home-page .hp-tools{grid-template-columns:1fr}
  .home-page .hp-navlink{display:none}
  .home-page .hp-h1{font-size:40px}
  .home-page .hp-sechead h2,.home-page .hp-final h2,.home-page .hp-value h2{font-size:32px}
  .home-page .hp-foot-in{flex-direction:column}
}
`;
