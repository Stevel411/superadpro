/*
 * StartPage.jsx — /start
 * ─────────────────────────────────────────────────────────────
 * Public marketing surface for SuperAdPro. Hero is a real 3D
 * constellation (see ConstellationHero); the rest of the page
 * is GSAP+ScrollTrigger driven cinematic motion. Visitors who
 * sign up through here are assigned a sponsor from the rotator
 * queue (backend at /api/start/register).
 *
 * The hero is lazy-loaded (Suspense) so visitors on slow
 * connections still see the page chrome and copy while the
 * 3D scene boots. If WebGL fails or prefers-reduced-motion is
 * set, ConstellationHero shunts to a static SVG fallback.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PublicLayout from '../../../components/layout/PublicLayout';
import { apiGet, apiPost } from '../../../utils/api';
import BackgroundVideo from './BackgroundVideo';

var ConstellationHero = lazy(function() { return import('./ConstellationHero'); });

gsap.registerPlugin(ScrollTrigger);

export default function StartPage() {
  var pageRef = useRef(null);
  var heroTextRef = useRef(null);
  var [stats, setStats] = useState({ members: 138, foundingRemaining: 77 });
  var [claiming, setClaiming] = useState(false);
  var navigate = useNavigate();

  // Claim handler — pings /api/start/peek-next-sponsor to advance the
  // rotator and get the next Founder, then navigates to /register with
  // that Founder as the ref. Each click of the CTA consumes one queue
  // position, so the next visitor (or the same visitor on a second
  // click) sees a different Founder. Steve's spec verbatim.
  function handleClaim(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (claiming) return;
    setClaiming(true);
    apiPost('/api/start/peek-next-sponsor', {})
      .then(function(d) {
        var sponsor = (d && d.sponsor_username) ? d.sponsor_username : 'SuperAdPro';
        // Pass both via=start (funnel marker) AND the picked sponsor
        // as ref. Backend register handler will use the explicit ref
        // rather than re-engaging the rotator.
        navigate('/register?via=start&ref=' + encodeURIComponent(sponsor));
      })
      .catch(function() {
        // Network/backend hiccup — don't trap the user, send them to
        // register without a ref so the rotator fires at submit time
        // as a last-resort fallback.
        navigate('/register?via=start');
      });
  }

  // Fetch live platform numbers — never hardcode what the DB knows.
  // Falls back to the static values above if the endpoint is missing
  // or returns garbage; page still loads.
  useEffect(function() {
    apiGet('/api/start/stats').then(function(d) {
      if (d && typeof d.total_members === 'number') {
        setStats({
          members: d.total_members,
          foundingRemaining: typeof d.founding_remaining === 'number' ? d.founding_remaining : 77,
        });
      }
    }).catch(function() { /* silent — stats are decorative, not blocking */ });
  }, []);

  // GSAP choreography — registers on mount, cleans up on unmount
  useEffect(function() {
    var ctx = gsap.context(function() {

      // ── Hero text: word-by-word stagger, then the big number ──
      var heroWords = gsap.utils.toArray('.hero-word');
      gsap.fromTo(heroWords,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, stagger: 0.09, ease: 'expo.out', delay: 0.6 }
      );
      gsap.fromTo('.hero-tag',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power2.out', delay: 0.3 }
      );
      gsap.fromTo('.hero-promise',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', delay: 1.5 }
      );
      gsap.fromTo('.hero-sub',
        { opacity: 0 },
        { opacity: 1, duration: 1.4, ease: 'power2.out', delay: 1.9 }
      );
      gsap.fromTo('.hero-stats > *',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out', delay: 2.2 }
      );
      // Hero CTA — appears after the stats so the offer (price/locked/spots)
      // has registered before we ask for the click. Subtle continuous
      // pulse to draw the eye without being aggressive.
      gsap.fromTo('.hero-cta-row > *',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.18, ease: 'expo.out', delay: 2.55 }
      );
      gsap.to('.hero-cta-primary', {
        boxShadow: '0 14px 48px rgba(6,182,212,.65), inset 0 0 0 1px rgba(255,255,255,.35)',
        duration: 1.8,
        delay: 3.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Animated counter for the founding spots remaining — counts DOWN
      // from 100 to the live remaining count. Tells the scarcity story
      // far better than counting up to a member-count number.
      var counter = { val: 100 };
      gsap.to(counter, {
        val: stats.foundingRemaining,
        duration: 2.4,
        ease: 'power3.out',
        delay: 1.8,
        onUpdate: function() {
          var el = document.getElementById('memberCount');
          if (el) el.textContent = Math.round(counter.val).toLocaleString();
        },
      });

      // ── Beat 2: fusion seam ── reveal both sides + the central pulser
      gsap.fromTo('.fusion-left',
        { x: -80, opacity: 0 },
        { x: 0, opacity: 1, duration: 1.4, ease: 'expo.out',
          scrollTrigger: { trigger: '.fusion-section', start: 'top 75%' } }
      );
      gsap.fromTo('.fusion-right',
        { x: 80, opacity: 0 },
        { x: 0, opacity: 1, duration: 1.4, ease: 'expo.out',
          scrollTrigger: { trigger: '.fusion-section', start: 'top 75%' } }
      );
      gsap.fromTo('.fusion-seam',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.6, ease: 'elastic.out(1, 0.5)',
          scrollTrigger: { trigger: '.fusion-section', start: 'top 70%' },
          delay: 0.4 }
      );

      // ── Beat 3: tools grid ── each tool card slides up with stagger
      gsap.fromTo('.tool-card',
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.15,
          scrollTrigger: { trigger: '.tools-section', start: 'top 70%' } }
      );

      // ── Beat 4: convergence ── this is the scroll-pinned cinematic.
      // As the visitor scrolls through this section, the four corner
      // labels fade in one by one and the streams animate to converge.
      var convergeTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.converge-section',
          start: 'top top',
          end: '+=1200',
          pin: true,
          scrub: 0.8,
        }
      });
      convergeTl
        .fromTo('.converge-svg', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 1 })
        .fromTo('.converge-stream-1', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 1.5 }, '<0.2')
        .fromTo('.converge-label-1', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '<0.3')
        .fromTo('.converge-stream-2', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 1.5 }, '<0.2')
        .fromTo('.converge-label-2', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '<0.3')
        .fromTo('.converge-stream-3', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 1.5 }, '<0.2')
        .fromTo('.converge-label-3', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '<0.3')
        .fromTo('.converge-stream-4', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 1.5 }, '<0.2')
        .fromTo('.converge-label-4', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '<0.3')
        .fromTo('.converge-hub', { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'expo.out' }, '+=0.2');

      // ── Beat 5: founding moment ── dots cascade, price reveals
      gsap.fromTo('.founding-dot',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: { each: 0.008, from: 'random' },
          scrollTrigger: { trigger: '.founding-section', start: 'top 65%' } }
      );
      gsap.fromTo('.founding-price',
        { y: 60, opacity: 0, scale: 0.85 },
        { y: 0, opacity: 1, scale: 1, duration: 1.6, ease: 'expo.out',
          scrollTrigger: { trigger: '.founding-section', start: 'top 50%' } }
      );

      // ── Beat 6: portal CTA ── breathe in
      gsap.fromTo('.portal-headline',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4, ease: 'expo.out',
          scrollTrigger: { trigger: '.portal-section', start: 'top 75%' } }
      );
      gsap.fromTo('.portal-cta',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.15, delay: 0.3,
          scrollTrigger: { trigger: '.portal-section', start: 'top 75%' } }
      );

    }, pageRef);

    return function() { ctx.revert(); };
  }, [stats.foundingRemaining]);

  return (
    <PublicLayout>
      <style>{startStyles}</style>

      <div className="start-page" ref={pageRef}>

        {/* ═════════ BEAT 1 — 3D CONSTELLATION + VIDEO HERO ═════════ */}
        <section className="hero-section">
          <div className="hero-canvas-wrap bgmode-both">
            <BackgroundVideo force={true} />
            <Suspense fallback={<div className="hero-canvas-loading"/>}>
              <ConstellationHero />
            </Suspense>
            <div className="hero-vignette"/>
          </div>

          <div className="hero-overlay" ref={heroTextRef}>
            <div className="hero-tag">100 Founding Partner spots · price locked for life</div>
            <h1 className="hero-headline">
              <span className="hero-word">Be</span>{' '}
              <span className="hero-word">one of the</span>{' '}
              <span className="hero-word hero-word-bright">first 100.</span><br/>
              <span className="hero-headline-line2">
                <span className="hero-word">Locked at</span>{' '}
                <span className="hero-word hero-word-bright">$15/mo</span>{' '}
                <span className="hero-word">forever.</span>
              </span>
            </h1>

            <div className="hero-promise">
              <div className="hero-promise-label">// Founding spots remaining</div>
              <span className="hero-promise-val" id="memberCount">0</span>
              <div className="hero-promise-sub">// Out of 100 · price never increases</div>
            </div>

            <p className="hero-sub">When spot #100 is claimed this offer closes forever. Standard membership reverts to $20/month. Founding Partners keep their $15 rate for life — no exceptions, no annual increases.</p>

            <div className="hero-cta-row">
              <a href="/register?via=start" onClick={handleClaim} className="hero-cta-primary" style={claiming ? {pointerEvents:'none',opacity:.6} : undefined}>
                <span className="hero-cta-label">{claiming ? 'Finding your sponsor…' : 'Claim your Founder spot'}</span>
                <span className="hero-cta-arrow">→</span>
                <span className="hero-cta-shimmer"/>
              </a>
              <Link to="#how-it-works" className="hero-cta-ghost">See how it works</Link>
            </div>

            <div className="hero-stats">
              <div className="hero-stat"><span className="hero-stat-num">$15</span><div className="hero-stat-label">/mo locked</div></div>
              <div className="hero-stat"><span className="hero-stat-num">100</span><div className="hero-stat-label">total spots</div></div>
              <div className="hero-stat"><span className="hero-stat-num">$0</span><div className="hero-stat-label">to sign up</div></div>
            </div>
          </div>

          <div className="hero-scroll-cue">Scroll into the network &darr;</div>
        </section>

        {/* ═════════ BEAT 2 — FUSION ═════════ */}
        <section className="fusion-section beat">
          <div className="beat-inner">
            <div className="beat-header">
              <div className="beat-tag">Section 02 &mdash; What it actually is</div>
              <h2 className="beat-h">Two halves of one platform.<span className="beat-h-accent">Fused at the seam.</span></h2>
              <p className="beat-sub">Most affiliate platforms have no real product. Most AI tools have no upside structure. SuperAdPro is what happens when you build both, on purpose, into one system.</p>
            </div>

            <div className="fusion-grid">
              <div className="fusion-left fusion-side">
                <div className="side-tag">// Left half</div>
                <h3>AI tools that work</h3>
                <p>A complete content and marketing suite. Real software with margin and substance &mdash; the kind you would pay separate subscriptions for.</p>
                <ul>
                  <li>Creative Studio &mdash; ten AI content tools</li>
                  <li>Brand Poster Generator &mdash; six templates</li>
                  <li>Lead Finder &mdash; live web-sourced prospects</li>
                  <li>SuperPages &mdash; drag-and-drop landing pages</li>
                  <li>SuperDeck &mdash; AI presentations</li>
                </ul>
              </div>
              <div className="fusion-seam-wrap">
                <div className="fusion-seam"/>
              </div>
              <div className="fusion-right fusion-side">
                <div className="side-tag">// Right half</div>
                <h3>A network that compounds</h3>
                <p>Four income streams running on one membership. The same network powers all four &mdash; build once, earn from each.</p>
                <ul>
                  <li>Membership commissions</li>
                  <li>8&times;8 Campaign Grid spillover</li>
                  <li>3&times;3 Credit Nexus matrix</li>
                  <li>Course Academy cascade</li>
                  <li>Transparent live commission ledger</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════ BEAT 3 — THE TOOLS ═════════ */}
        <section id="how-it-works" className="tools-section beat">
          <div className="beat-inner">
            <div className="beat-header">
              <div className="beat-tag">Section 03 &mdash; The tools</div>
              <h2 className="beat-h">Real software for operators.<span className="beat-h-accent">Not feature theatre.</span></h2>
              <p className="beat-sub">Each of these ships, runs daily, and is used by real members. Membership unlocks every one of them.</p>
            </div>

            <div className="tools-grid">
              {[
                { title: 'Creative Studio', desc: 'Ten AI content tools under one roof. Video, images, music, voiceover, lip sync, storyboards, captions, editor, gallery, credit packs.', icon: 'M12 2L2 7v10l10 5 10-5V7l-10-5z' },
                { title: 'Brand Poster Generator', desc: 'Six AI templates. Branded marketing posters in sixty seconds. Your referral link baked in automatically.', icon: 'M4 4h16v16H4zM4 9h16M9 4v16' },
                { title: 'Lead Finder', desc: 'Search-driven prospect lists with live contact details. Filter by sector, geography, and intent signals.', icon: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35' },
                { title: 'SuperPages & Funnels', desc: 'Drag-and-drop landing page builder. Eight templates, AI copy, free-form canvas, conversion tracking.', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10' },
                { title: 'SuperDeck', desc: 'AI-powered slide presentations. Free-form drag canvas, eighteen typefaces, present mode, multilingual.', icon: 'M3 3h18v12H3zM7 19h10M9 15v4M15 15v4' },
                { title: 'MyLeads CRM', desc: 'Lead capture, autoresponder with visual email timeline, AI-generated outreach. Native Brevo integration.', icon: 'M2 3h20v14H2z M2 7l10 6 10-6' },
              ].map(function(tool) {
                return (
                  <div className="tool-card" key={tool.title}>
                    <div className="tool-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={tool.icon}/>
                      </svg>
                    </div>
                    <h4>{tool.title}</h4>
                    <p>{tool.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═════════ BEAT 4 — CONVERGENCE (PINNED) ═════════ */}
        <section className="converge-section beat">
          <div className="beat-inner converge-inner">
            <div className="beat-header">
              <div className="beat-tag">Section 04 &mdash; The earning</div>
              <h2 className="beat-h">Four streams. One destination.<span className="beat-h-accent">Everything funnels back.</span></h2>
              <p className="beat-sub">Most platforms ask you to stack disconnected income sources. SuperAdPro runs four streams off the same network &mdash; the activity that drives one feeds the others.</p>
            </div>

            <svg className="converge-svg" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="streamGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#22d3ee" stopOpacity="0"/>
                  <stop offset="0.5" stopColor="#22d3ee" stopOpacity="1"/>
                  <stop offset="1" stopColor="#0ea5e9" stopOpacity="0.8"/>
                </linearGradient>
                <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#ecfeff"/>
                  <stop offset="0.4" stopColor="#22d3ee"/>
                  <stop offset="0.8" stopColor="#0ea5e9"/>
                  <stop offset="1" stopColor="#0f172a" stopOpacity="0"/>
                </radialGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                </filter>
              </defs>

              {/* Stream paths — each ~1000 units long for clean strokeDashoffset animation */}
              <path className="converge-stream-1" d="M100 100 Q 450 100 450 240" fill="none" stroke="url(#streamGrad)" strokeWidth="2" strokeDasharray="1000" filter="url(#glow)"/>
              <path className="converge-stream-2" d="M800 100 Q 450 100 450 240" fill="none" stroke="url(#streamGrad)" strokeWidth="2" strokeDasharray="1000" filter="url(#glow)"/>
              <path className="converge-stream-3" d="M100 380 Q 450 380 450 240" fill="none" stroke="url(#streamGrad)" strokeWidth="2" strokeDasharray="1000" filter="url(#glow)"/>
              <path className="converge-stream-4" d="M800 380 Q 450 380 450 240" fill="none" stroke="url(#streamGrad)" strokeWidth="2" strokeDasharray="1000" filter="url(#glow)"/>

              {/* Corner nodes + labels */}
              <g className="converge-label-1">
                <circle cx="100" cy="100" r="10" fill="#22d3ee"/>
                <text x="100" y="74" fontFamily="JetBrains Mono,monospace" fontSize="12" fontWeight="700" fill="#22d3ee" textAnchor="middle" letterSpacing="3">01 MEMBERSHIP</text>
              </g>
              <g className="converge-label-2">
                <circle cx="800" cy="100" r="10" fill="#22d3ee"/>
                <text x="800" y="74" fontFamily="JetBrains Mono,monospace" fontSize="12" fontWeight="700" fill="#22d3ee" textAnchor="middle" letterSpacing="3">02 GRID</text>
              </g>
              <g className="converge-label-3">
                <circle cx="100" cy="380" r="10" fill="#22d3ee"/>
                <text x="100" y="412" fontFamily="JetBrains Mono,monospace" fontSize="12" fontWeight="700" fill="#22d3ee" textAnchor="middle" letterSpacing="3">03 NEXUS</text>
              </g>
              <g className="converge-label-4">
                <circle cx="800" cy="380" r="10" fill="#22d3ee"/>
                <text x="800" y="412" fontFamily="JetBrains Mono,monospace" fontSize="12" fontWeight="700" fill="#22d3ee" textAnchor="middle" letterSpacing="3">04 ACADEMY</text>
              </g>

              {/* Central hub */}
              <g className="converge-hub">
                <circle cx="450" cy="240" r="80" fill="url(#hubGrad)">
                  <animate attributeName="r" values="80;92;80" dur="3.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="450" cy="240" r="36" fill="#22d3ee"/>
                <text x="450" y="247" fontFamily="Sora,sans-serif" fontSize="18" fontWeight="900" fill="#fff" textAnchor="middle" letterSpacing="-0.5">YOU</text>
              </g>
            </svg>
          </div>
        </section>

        {/* ═════════ BEAT 5 — FOUNDING MOMENT ═════════ */}
        <section className="founding-section beat">
          <div className="beat-inner founding-inner">
            <div className="beat-header">
              <div className="beat-tag">Section 05 &mdash; The founding</div>
              <h2 className="beat-h">A founding rate. Locked for life.<span className="beat-h-accent">Only one hundred members get it.</span></h2>
            </div>

            <div className="founding-dots-grid">
              {Array.from({ length: 100 }).map(function(_, i) {
                var isLit = i < (100 - stats.foundingRemaining);
                return <span key={i} className={'founding-dot ' + (isLit ? 'lit' : 'dim')}/>;
              })}
            </div>

            <div className="founding-price">
              <div className="founding-price-label">// Founding Partner</div>
              <span className="founding-price-val">$15</span>
              <div className="founding-price-foot">/ month &mdash; locked for life</div>
            </div>
            <p className="beat-sub" style={{maxWidth:560,margin:'24px auto 0'}}>
              This price will not exist after spot 100. The standard membership is $20/month. The difference compounds over years.
            </p>
          </div>
        </section>

        {/* ═════════ BEAT 6 — PORTAL ═════════ */}
        <section className="portal-section beat">
          <div className="beat-inner portal-inner">
            <div className="beat-header">
              <div className="beat-tag">Section 06 &mdash; The doorway</div>
              <h2 className="portal-headline">Step in.</h2>
              <p className="portal-sub portal-cta">Free to create an account. No credit card. Activate membership when you are ready.</p>
            </div>
            <div className="portal-ctas">
              <a href="/register?via=start" onClick={handleClaim} className="portal-cta portal-cta-primary" style={claiming ? {pointerEvents:'none',opacity:.6} : undefined}>
                {claiming ? 'Finding your sponsor…' : 'Create free account →'}
                <span className="portal-shimmer"/>
              </a>
              <Link to="/explore" className="portal-cta portal-cta-ghost">Take the 60-second tour</Link>
            </div>
            <div className="portal-signoff portal-cta">Made in the UK &middot; Built for operators</div>
            <div className="portal-disclaimer portal-cta">
              Income depends on individual effort and many other factors. No earnings are guaranteed.
              See the <Link to="/income-disclaimer" style={{color:'#22d3ee'}}>full income disclaimer</Link>.
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

/* ════════════════════════════════════════════════════════════
   STYLES — all inline, scoped via .start-page parent class
   ════════════════════════════════════════════════════════════ */
var startStyles = `
.start-page{font-family:'DM Sans',sans-serif;color:#fafbff;background:#050a1f;position:relative;overflow-x:hidden}
.start-page *{box-sizing:border-box}

/* ═══════════ HERO (Beat 1) ═══════════ */
.hero-section{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 32px 60px;overflow:hidden}
.hero-canvas-wrap{position:absolute;inset:0;z-index:1}
.hero-canvas-loading{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(14,165,233,.08),transparent 60%)}
.hero-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(5,10,31,.25) 75%,rgba(5,10,31,.55) 100%);pointer-events:none;z-index:4}

/* ── BackgroundVideo: poster + lazy video + dark overlay ── */
.bg-video-wrap{position:absolute;inset:0;z-index:1;overflow:hidden}
.bg-video-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1) brightness(.92)}
.bg-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s ease-out;filter:saturate(1) brightness(.92)}
.bg-video-loaded{opacity:1}
.bg-video-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,10,31,.15) 0%,rgba(5,10,31,.25) 55%,rgba(5,10,31,.55) 100%);pointer-events:none}

/* When layered with the constellation, dim the video a touch more
   so the network metaphor still reads above it — but nowhere near
   the gloom of the previous treatment */
.bgmode-both .bg-video-poster,
.bgmode-both .bg-video{filter:saturate(.92) brightness(.78)}
.bgmode-both .bg-video-overlay{background:linear-gradient(180deg,rgba(5,10,31,.25) 0%,rgba(5,10,31,.35) 55%,rgba(5,10,31,.65) 100%)}

/* When video-only, no constellation layer needs to be visible */
.bgmode-video canvas{display:none}
/* Constellation needs to render above the video when both are present;
   the canvas auto-positions to inset:0 via inline style */
.bgmode-both canvas{z-index:2;mix-blend-mode:screen;opacity:.85}
.hero-overlay{position:relative;z-index:5;max-width:1100px}

.hero-tag{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#22d3ee;letter-spacing:.26em;text-transform:uppercase;margin-bottom:32px;display:inline-flex;align-items:center;gap:14px}
.hero-tag::before,.hero-tag::after{content:'';width:36px;height:1px;background:#22d3ee;opacity:.6}

.hero-headline{font-family:'Sora',sans-serif;font-size:clamp(48px,7vw,108px);font-weight:900;line-height:.93;letter-spacing:-.05em;margin-bottom:24px;text-shadow:0 2px 24px rgba(5,10,31,.55), 0 1px 2px rgba(5,10,31,.4)}
.hero-headline-line2{display:block;margin-top:8px;font-weight:300;letter-spacing:-.03em;font-size:.62em;color:#a5f3fc;opacity:.85}
.hero-word{display:inline-block;opacity:0;will-change:transform,opacity}
.hero-word-bright{color:#22d3ee;text-shadow:0 0 40px rgba(6,182,212,.4)}

.hero-promise{margin:36px 0 22px;opacity:0}
.hero-promise-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(250,251,255,.45);font-weight:700;margin-bottom:10px}
.hero-promise-val{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(64px,8.5vw,124px);letter-spacing:-.06em;line-height:.85;background:linear-gradient(180deg,#ecfeff 0%,#22d3ee 38%,#0284c7 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 70px rgba(6,182,212,.55));display:inline-block;will-change:filter}
.hero-promise-sub{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(250,251,255,.55);font-weight:600;margin-top:12px}

.hero-sub{font-size:19px;line-height:1.55;color:rgba(250,251,255,.85);max-width:660px;margin:24px auto 56px;opacity:0;text-shadow:0 1px 12px rgba(5,10,31,.6)}

.hero-stats{display:flex;gap:64px;margin:0 auto 60px;justify-content:center;flex-wrap:wrap;width:100%;max-width:720px}
.hero-stat{text-align:left;opacity:0}
.hero-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:38px;letter-spacing:-.03em;color:#22d3ee;line-height:1;text-shadow:0 0 28px rgba(6,182,212,.3);display:block;margin-bottom:6px}
.hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(250,251,255,.42);font-weight:600}

/* ── Hero CTA row — sits between sub-headline and stats, the
   primary conversion surface above the fold ── */
.hero-cta-row{display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center;margin:8px auto 40px;width:100%;max-width:720px}
.hero-cta-primary{display:inline-flex;align-items:center;gap:14px;padding:22px 48px;border-radius:14px;font-family:'Sora',sans-serif;font-size:18px;font-weight:800;letter-spacing:.005em;text-decoration:none;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:#fff;box-shadow:0 8px 32px rgba(6,182,212,.45),inset 0 0 0 1px rgba(255,255,255,.22);transition:transform .25s ease-out;position:relative;overflow:hidden;will-change:transform,box-shadow;opacity:0}
.hero-cta-primary:hover{transform:translateY(-3px)}
.hero-cta-label{position:relative;z-index:2}
.hero-cta-arrow{position:relative;z-index:2;font-size:22px;transition:transform .25s}
.hero-cta-primary:hover .hero-cta-arrow{transform:translateX(4px)}
.hero-cta-shimmer{position:absolute;inset:0;background:linear-gradient(135deg,transparent,rgba(255,255,255,.3),transparent);transform:translateX(-100%);transition:transform .7s;z-index:1}
.hero-cta-primary:hover .hero-cta-shimmer{transform:translateX(100%)}
.hero-cta-ghost{display:inline-flex;align-items:center;gap:8px;padding:22px 32px;border-radius:14px;font-family:'Sora',sans-serif;font-size:15px;font-weight:600;text-decoration:none;background:rgba(250,251,255,.06);color:#fff;border:1px solid rgba(250,251,255,.16);backdrop-filter:blur(8px);transition:background .3s,border-color .3s;opacity:0}
.hero-cta-ghost:hover{background:rgba(250,251,255,.1);border-color:rgba(34,211,238,.4)}

.hero-scroll-cue{position:absolute;bottom:24px;left:0;right:0;text-align:center;z-index:5;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(250,251,255,.5);letter-spacing:.22em;text-transform:uppercase;animation:scrollNudge 2.6s ease-in-out 3.8s infinite both}
@keyframes scrollNudge{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(8px);opacity:.95}}

/* ═══════════ BEAT SHARED STYLES ═══════════ */
.beat{position:relative;padding:140px 32px}
.beat-inner{max-width:1280px;margin:0 auto}

/* Centred section header wrapper used by beats 2-4. Beats 5 and 6
   were already centred via inline styles. Constrains text width for
   readability rather than letting the headline stretch the full
   1280px container. */
.beat-header{max-width:780px;margin:0 auto 64px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}
.beat-tag{display:inline-flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#22d3ee;letter-spacing:.22em;text-transform:uppercase;justify-content:center}
.beat-tag::before,.beat-tag::after{content:'';width:40px;height:1px;background:#22d3ee;opacity:.7}
.beat-h{font-family:'Sora',sans-serif;font-size:clamp(38px,5vw,72px);font-weight:900;line-height:1;letter-spacing:-.04em;margin:0}
.beat-h-accent{display:block;font-weight:300;letter-spacing:-.025em;opacity:.7;line-height:1.1;font-size:.6em;margin-top:8px;color:#a5f3fc}
.beat-sub{font-size:18px;line-height:1.6;color:rgba(250,251,255,.6);max-width:620px;margin:0}

/* Softer section transitions — fade-out at bottom of each beat and
   fade-in at top of the next, instead of a hard divider line. Adds
   atmospheric depth that makes the page feel continuous, like film. */
.beat::before{content:'';position:absolute;top:0;left:0;right:0;height:120px;background:linear-gradient(180deg,rgba(5,10,31,.6),transparent);pointer-events:none;z-index:1}
.beat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:120px;background:linear-gradient(0deg,rgba(5,10,31,.6),transparent);pointer-events:none;z-index:1}
.beat > *{position:relative;z-index:2}
.sap-divider{display:none}  /* hard dividers replaced by gradient fades above */

/* ═══════════ BEAT 2 — FUSION ═══════════ */
.fusion-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch;margin-top:64px}
.fusion-side{padding:48px;background:linear-gradient(180deg,rgba(23,37,84,.5),rgba(11,18,48,.3));border:1px solid rgba(250,251,255,.08);border-radius:24px;backdrop-filter:blur(12px)}
.fusion-side .side-tag{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#22d3ee;margin-bottom:18px;font-weight:700}
.fusion-side h3{font-family:'Sora',sans-serif;font-size:30px;font-weight:900;line-height:1;margin-bottom:16px;letter-spacing:-.03em}
.fusion-side p{font-size:15px;line-height:1.65;color:rgba(250,251,255,.6);margin-bottom:22px}
.fusion-side ul{list-style:none;padding:0;margin:0}
.fusion-side ul li{padding:10px 0;font-size:14px;color:rgba(250,251,255,.72);border-bottom:1px solid rgba(250,251,255,.06);display:flex;align-items:center;gap:12px}
.fusion-side ul li::before{content:'';width:6px;height:6px;background:#22d3ee;border-radius:50%;flex-shrink:0;box-shadow:0 0 8px rgba(6,182,212,.6)}

.fusion-seam-wrap{display:flex;align-items:center;justify-content:center;padding:0 32px;height:100%;min-width:120px}
.fusion-seam{width:88px;height:88px;border-radius:50%;background:radial-gradient(circle,#22d3ee 0%,#0ea5e9 50%,transparent 80%);box-shadow:0 0 80px rgba(6,182,212,.7);position:relative;will-change:transform,opacity}
.fusion-seam::before{content:'';position:absolute;inset:-24px;border-radius:50%;border:1px solid rgba(34,211,238,.4);animation:fusionRing 3.5s ease-in-out infinite}
.fusion-seam::after{content:'';position:absolute;inset:-50px;border-radius:50%;border:1px solid rgba(34,211,238,.15);animation:fusionRing 3.5s ease-in-out infinite .5s}
@keyframes fusionRing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.4);opacity:.1}}

/* ═══════════ BEAT 3 — TOOLS ═══════════ */
.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:60px}
.tool-card{padding:36px 30px;background:linear-gradient(180deg,rgba(23,37,84,.55),rgba(11,18,48,.4));border:1px solid rgba(250,251,255,.08);border-radius:20px;backdrop-filter:blur(12px);position:relative;overflow:hidden;transition:border-color .35s,transform .5s,box-shadow .5s;will-change:transform,opacity}
.tool-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#22d3ee,transparent);opacity:0;transition:opacity .4s}
.tool-card:hover{transform:translateY(-6px);border-color:rgba(34,211,238,.4);box-shadow:0 24px 60px rgba(6,182,212,.12)}
.tool-card:hover::before{opacity:1}
.tool-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(6,182,212,.18),rgba(14,165,233,.08));display:flex;align-items:center;justify-content:center;margin-bottom:20px;border:1px solid rgba(34,211,238,.25)}
.tool-icon svg{width:26px;height:26px;color:#22d3ee}
.tool-card h4{font-family:'Sora',sans-serif;font-size:20px;font-weight:700;margin-bottom:10px;letter-spacing:-.01em}
.tool-card p{font-size:14px;line-height:1.6;color:rgba(250,251,255,.55)}

/* ═══════════ BEAT 4 — CONVERGENCE (PINNED) ═══════════ */
.converge-section{min-height:100vh;display:flex;align-items:center}
.converge-inner{width:100%}
.converge-svg{width:100%;max-width:1000px;margin:60px auto 0;display:block;height:auto;will-change:transform,opacity}

/* ═══════════ BEAT 5 — FOUNDING ═══════════ */
.founding-section{background:radial-gradient(ellipse 80% 60% at 50% 50%,rgba(15,20,50,.85),transparent 70%)}
.founding-inner{text-align:center;max-width:840px;margin:0 auto}
.founding-dots-grid{display:grid;grid-template-columns:repeat(20,1fr);gap:8px;margin:56px auto 64px;max-width:560px}
.founding-dot{width:100%;aspect-ratio:1;border-radius:50%;will-change:transform,opacity}
.founding-dot.lit{background:radial-gradient(circle,#22d3ee 0%,#0ea5e9 70%);box-shadow:0 0 10px rgba(6,182,212,.55);animation:dotBreath 4s ease-in-out infinite}
.founding-dot.dim{background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.12)}
.founding-dot.lit:nth-child(3n){animation-delay:.4s}
.founding-dot.lit:nth-child(5n){animation-delay:1.1s}
.founding-dot.lit:nth-child(7n){animation-delay:1.8s}
.founding-dot.lit:nth-child(11n){animation-delay:2.6s}
@keyframes dotBreath{0%,100%{opacity:.85;box-shadow:0 0 10px rgba(6,182,212,.55)}50%{opacity:1;box-shadow:0 0 18px rgba(6,182,212,.85)}}

.founding-price{margin:56px 0 32px;will-change:transform,opacity}
.founding-price-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(250,251,255,.55);margin-bottom:14px;font-weight:700}
.founding-price-val{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(80px,10vw,140px);letter-spacing:-.06em;line-height:.85;background:linear-gradient(180deg,#ecfeff 0%,#22d3ee 38%,#0284c7 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 80px rgba(6,182,212,.55));display:inline-block}
.founding-price-foot{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#22d3ee;margin-top:20px;font-weight:700}

/* ═══════════ BEAT 6 — PORTAL ═══════════ */
.portal-inner{text-align:center;max-width:760px;margin:0 auto}
.portal-headline{font-family:'Sora',sans-serif;font-size:clamp(56px,8vw,128px);font-weight:900;line-height:.9;letter-spacing:-.05em;margin-bottom:24px;background:linear-gradient(180deg,#fff 0%,#22d3ee 70%,#0ea5e9 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 60px rgba(6,182,212,.4));display:inline-block;will-change:transform,opacity}
.portal-sub{font-size:18px;line-height:1.55;color:rgba(250,251,255,.6);max-width:540px;margin:0 auto 56px}

.portal-ctas{display:inline-flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-bottom:80px}
.portal-cta-primary{display:inline-flex;align-items:center;gap:10px;padding:22px 50px;border-radius:14px;font-family:'Sora',sans-serif;font-size:17px;font-weight:700;text-decoration:none;letter-spacing:.01em;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:#fff;box-shadow:0 8px 32px rgba(6,182,212,.45),inset 0 0 0 1px rgba(255,255,255,.25);transition:transform .25s, box-shadow .35s;position:relative;overflow:hidden}
.portal-cta-primary:hover{transform:translateY(-4px);box-shadow:0 16px 56px rgba(6,182,212,.6),inset 0 0 0 1px rgba(255,255,255,.25)}
.portal-shimmer{position:absolute;inset:0;background:linear-gradient(135deg,transparent,rgba(255,255,255,.3),transparent);transform:translateX(-100%);transition:transform .7s}
.portal-cta-primary:hover .portal-shimmer{transform:translateX(100%)}
.portal-cta-ghost{display:inline-flex;align-items:center;gap:10px;padding:22px 38px;border-radius:14px;font-family:'Sora',sans-serif;font-size:16px;font-weight:600;text-decoration:none;background:rgba(250,251,255,.05);color:#fff;border:1px solid rgba(250,251,255,.12);backdrop-filter:blur(8px);transition:background .35s,border-color .35s}
.portal-cta-ghost:hover{background:rgba(250,251,255,.1);border-color:rgba(34,211,238,.35)}

.portal-signoff{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(250,251,255,.32);font-weight:600;margin-bottom:32px}
.portal-signoff::before,.portal-signoff::after{content:'';display:inline-block;width:36px;height:1px;background:rgba(250,251,255,.18);margin:0 14px;vertical-align:middle}
.portal-disclaimer{font-size:12px;color:rgba(250,251,255,.4);max-width:520px;margin:0 auto;line-height:1.7}

/* ═══════════ RESPONSIVE — mobile ═══════════ */
@media (max-width:768px){
  .hero-section{padding:64px 20px 48px;min-height:100svh}
  .hero-headline{font-size:clamp(36px,10vw,56px)}
  .hero-promise-val{font-size:clamp(48px,16vw,72px)}
  .hero-sub{font-size:16px;margin:20px auto 36px}
  .hero-stats{gap:28px;flex-wrap:wrap;justify-content:center}
  .hero-stat{text-align:center}
  .beat{padding:80px 20px}
  .beat-h{font-size:clamp(32px,7vw,48px)}
  .fusion-grid{grid-template-columns:1fr;gap:32px}
  .fusion-seam-wrap{padding:0;height:auto}
  .fusion-seam{width:64px;height:64px}
  .tools-grid{grid-template-columns:1fr;gap:14px}
  .tool-card{padding:28px 22px}
  .founding-dots-grid{grid-template-columns:repeat(10,1fr);max-width:340px;gap:6px}
  .founding-price-val{font-size:clamp(64px,18vw,96px)}
  .portal-headline{font-size:clamp(48px,12vw,80px)}
  .portal-cta-primary,.portal-cta-ghost{padding:18px 32px;font-size:15px}
  .converge-section{min-height:auto}
}
`;
