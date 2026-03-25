import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';

var IncomeGrid3D = lazy(function() { return import('../components/IncomeGrid3D'); });

var TIERS = [
  { tier: 1, price: 20, payout: 144, color: '#38bdf8' },
  { tier: 2, price: 50, payout: 360, color: '#6366f1' },
  { tier: 3, price: 100, payout: 720, color: '#8b5cf6' },
  { tier: 4, price: 200, payout: 1440, color: '#10b981' },
  { tier: 5, price: 400, payout: 2880, color: '#f59e0b' },
  { tier: 6, price: 600, payout: 4320, color: '#f97316' },
  { tier: 7, price: 800, payout: 5760, color: '#ef4444' },
  { tier: 8, price: 1000, payout: 7200, color: '#fbbf24' },
];

var TOOLS = [
  { name: 'SuperSeller AI', desc: 'Complete campaigns in minutes — pages, posts, emails, scripts', badge: 'PRO', color: '#38bdf8', icon: 'M13,2 L3,14 L12,14 L11,22 L21,10 L12,10Z' },
  { name: 'Campaign Studio', desc: 'AI content for any niche — captions, blogs, emails, ad copy', badge: 'BASIC', color: '#818cf8', icon: null, grid: true },
  { name: 'LinkHub', desc: 'Your bio link page — all your offers, one URL', badge: 'BASIC', color: '#34d399', icon: null, people: true },
  { name: 'SuperPages', desc: 'Drag-and-drop landing pages, funnels, opt-ins — no code', badge: 'PRO', color: '#a78bfa', icon: null, check: true },
  { name: 'Email Autoresponder', desc: 'Automated follow-up sequences that convert while you sleep', badge: 'PRO', color: '#f43f5e', icon: null, screen: true },
  { name: 'Training Centre', desc: 'Step-by-step from zero to earning — marketing mastery', badge: 'BASIC', color: '#fbbf24', icon: null, cap: true },
  { name: 'Link Tools', desc: 'Smart links, QR codes, click tracking, retargeting pixels', badge: 'BASIC', color: '#ec4899', icon: 'M15,3 L21,3 L21,9 M9,21 L3,21 L3,15 M21,3 L14,10 M3,21 L10,14' },
  { name: 'Social Share Suite', desc: 'Ready-made posts, stories, swipe copy for every platform', badge: 'BASIC', color: '#22d3ee', icon: null, clock: true },
  { name: 'ProSeller AI', desc: 'AI sales assistant — handles prospect objections 24/7', badge: 'PRO', color: '#a855f7', icon: null, chat: true },
];

function ToolIcon({ t }) {
  var s = 24;
  if (t.icon) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d={t.icon} fill={t.grid||t.people||t.check||t.screen||t.cap||t.clock||t.chat?'none':t.color} stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (t.grid) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" fill={t.color}/><rect x="14" y="3" width="7" height="7" rx="1.5" fill={t.color} opacity="0.6"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill={t.color} opacity="0.6"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill={t.color}/></svg>;
  if (t.people) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" fill={t.color}/><path d="M2 20v-1a6 6 0 0114 0v1" fill={t.color} opacity="0.4"/><circle cx="18" cy="8" r="2.5" fill={t.color} opacity="0.7"/></svg>;
  if (t.check) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill={t.color} opacity="0.3"/><rect x="6" y="6" width="12" height="12" rx="2" fill={t.color}/><path d="M10 10l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (t.screen) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="12" rx="2" fill={t.color} opacity="0.3" stroke={t.color} strokeWidth="1.5"/><path d="M8 20h8M12 16v4" stroke={t.color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
  if (t.cap) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3L2 8l10 5 10-5-10-5z" fill={t.color}/><path d="M2 16l10 5 10-5" stroke={t.color} strokeWidth="1.8" opacity="0.5"/><path d="M2 12l10 5 10-5" stroke={t.color} strokeWidth="1.8" opacity="0.7"/></svg>;
  if (t.clock) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={t.color} strokeWidth="1.5"/><path d="M12 8v4l3 3" stroke={t.color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (t.chat) return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill={t.color} opacity="0.3" stroke={t.color} strokeWidth="1.5"/></svg>;
  return null;
}

// ── Particle Canvas ──
function ParticleHero() {
  var ref = useRef(null);
  useEffect(function() {
    var c = ref.current; if (!c) return;
    var ctx = c.getContext('2d'), nodes = [], t = 0, mouse = { x: 0, y: 0 }, pulses = [], raf;
    var cols = ['99,102,241','14,165,233','139,92,246','16,185,129','251,191,36'];
    function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    for (var i = 0; i < 80; i++) nodes.push({ x: Math.random()*2000-500, y: Math.random()*2000-500, z: Math.random()*600+200, r: Math.random()*2+1, c: cols[~~(Math.random()*cols.length)], ox: Math.random()*Math.PI*2, oy: Math.random()*Math.PI*2 });
    function proj(x, y, z) { var f = 800/(800+z); return { x: c.width/2+(x-c.width/2)*f, y: c.height/2+(y-c.height/2)*f, s: f }; }
    function draw() {
      t += 0.003; ctx.clearRect(0, 0, c.width, c.height);
      var mx = (mouse.x - c.width/2)*0.02, my = (mouse.y - c.height/2)*0.02;
      var pr = nodes.map(function(n) { var p = proj(n.x + Math.sin(t+n.ox)*30+mx, n.y + Math.cos(t+n.oy)*30+my, n.z); return { px: p.x, py: p.y, s: p.s, c: n.c, r: n.r }; });
      for (var i = 0; i < pr.length; i++) for (var j = i+1; j < pr.length; j++) { var a = pr[i], b = pr[j], d = Math.sqrt((a.px-b.px)**2+(a.py-b.py)**2); if (d < 150) { ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.strokeStyle = 'rgba('+a.c+','+(0.06*(1-d/150)*a.s)+')'; ctx.lineWidth = 0.5; ctx.stroke(); } }
      pr.forEach(function(p) { ctx.beginPath(); ctx.arc(p.px, p.py, p.r*p.s*1.5, 0, Math.PI*2); ctx.fillStyle = 'rgba('+p.c+','+(0.25*p.s)+')'; ctx.fill(); ctx.beginPath(); ctx.arc(p.px, p.py, p.r*p.s*4, 0, Math.PI*2); ctx.fillStyle = 'rgba('+p.c+','+(0.04*p.s)+')'; ctx.fill(); });
      if (Math.random() < 0.04 && pr.length > 2) { var ai = ~~(Math.random()*pr.length), bi = ~~(Math.random()*pr.length); if (ai !== bi) { var pa = pr[ai], pb = pr[bi], dd = Math.sqrt((pa.px-pb.px)**2+(pa.py-pb.py)**2); if (dd < 150) pulses.push({ ax: pa.px, ay: pa.py, bx: pb.px, by: pb.py, p: 0, speed: 0.02+Math.random()*0.02 }); } }
      pulses = pulses.filter(function(pl) { pl.p += pl.speed; if (pl.p > 1) return false; var px = pl.ax+(pl.bx-pl.ax)*pl.p, py = pl.ay+(pl.by-pl.ay)*pl.p, o = pl.p < 0.5 ? pl.p*2 : (1-pl.p)*2; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fillStyle = 'rgba(251,191,36,'+0.8*o+')'; ctx.fill(); ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI*2); ctx.fillStyle = 'rgba(251,191,36,'+0.2*o+')'; ctx.fill(); return true; });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return function() { cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}/>;
}

// ── Animated counter ──
function Counter({ target, prefix, suffix, color, duration }) {
  var [val, setVal] = useState(0);
  var ref = useRef(null);
  var started = useRef(false);
  useEffect(function() {
    var obs = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        var start = Date.now();
        var dur = duration || 2000;
        (function step() {
          var elapsed = Date.now() - start;
          var progress = Math.min(elapsed / dur, 1);
          var ease = 1 - Math.pow(1 - progress, 3);
          setVal(Math.round(target * ease));
          if (progress < 1) requestAnimationFrame(step);
        })();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return function() { obs.disconnect(); };
  }, [target]);
  return <span ref={ref} style={{ color: color }}>{prefix || ''}{val.toLocaleString()}{suffix || ''}</span>;
}

// ── Scroll reveal wrapper ──
function Reveal({ children, delay }) {
  var ref = useRef(null);
  var [vis, setVis] = useState(false);
  useEffect(function() {
    var obs = new IntersectionObserver(function(entries) { if (entries[0].isIntersecting) setVis(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return function() { obs.disconnect(); };
  }, []);
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(40px)', transition: 'opacity 0.8s cubic-bezier(.16,1,.3,1) '+(delay||0)+'s, transform 0.8s cubic-bezier(.16,1,.3,1) '+(delay||0)+'s' }}>{children}</div>;
}

export default function SuperLinkPage() {
  var [sponsor, setSponsor] = useState('Steve');
  var [sponsorInitial, setSponsorInitial] = useState('S');

  // Extract sponsor from URL or cookie
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref') || '';
    if (!ref) {
      var match = document.cookie.match(/ref=([^;]+)/);
      if (match) ref = match[1];
    }
    if (!ref) {
      var path = window.location.pathname;
      var m = path.match(/\/join\/([^/]+)/);
      if (m) ref = m[1];
    }
    if (ref) {
      setSponsor(ref);
      setSponsorInitial(ref.charAt(0).toUpperCase());
    }
  }, []);

  var S = {
    page: { background: '#030712', color: '#e2e8f0', fontFamily: "'DM Sans',sans-serif", minHeight: '100vh' },
    gold: { background: 'linear-gradient(135deg,#fbbf24,#fde68a,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    section: { position: 'relative', zIndex: 1, padding: 'clamp(80px,10vw,120px) 24px', overflow: 'hidden' },
    inner: { maxWidth: 960, margin: '0 auto' },
    bb: { textAlign: 'center' },
    h2: { fontFamily: "'Sora',sans-serif", fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, color: '#fff', marginBottom: 8 },
    blurb: { fontSize: 17, color: '#64748b', maxWidth: 540, margin: '12px auto 0' },
    cta: { display: 'inline-block', padding: '22px 60px', borderRadius: 16, fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900, textDecoration: 'none', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#0a0a0a', boxShadow: '0 0 40px rgba(251,191,36,0.2),0 0 80px rgba(251,191,36,0.08)', transition: 'all 0.4s cubic-bezier(.16,1,.3,1)' },
    ctaNote: { fontSize: 13, color: '#475569', marginTop: 14 },
  };

  return (
    <div style={S.page}>

      {/* ═══ SECTION 1 — HERO ═══ */}
      <section style={{ ...S.section, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <ParticleHero />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 820, textAlign: 'center' }}>
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 22px 8px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 15, fontWeight: 600, color: '#a5b4fc', marginBottom: 20, backdropFilter: 'blur(8px)' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#fff' }}>{sponsorInitial}</div>
              {sponsor} invited you to…
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(42px,8vw,84px)', fontWeight: 900, lineHeight: 0.92, color: '#fff', marginBottom: 12 }}>
              Build Real<br/>Online Income
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 700, color: '#94a3b8', marginBottom: 32, fontStyle: 'italic' }}>
              "One Link to Rule Them All"
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: '#94a3b8', maxWidth: 620, margin: '0 auto 20px', lineHeight: 1.7 }}>
              Your business = <strong style={{ color: '#fff' }}>four income streams</strong>. AI-powered tools.
              A Profit Grid that pays you up to <strong style={S.gold}>$22,824</strong> across all 8 campaign tiers.
              Recurring campaigns that never stop.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(16px,2vw,22px)', fontWeight: 800, marginBottom: 44 }}>
              <span style={S.gold}>Your one link to financial freedom.</span>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div>
              <a href="/register" style={S.cta}>Create Your Free Account →</a>
              <div style={S.ctaNote}>Free to join · No credit card · 60 seconds</div>
            </div>
          </Reveal>

          <Reveal delay={0.55}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 36, marginBottom: 0 }}>
              {TIERS.map(function(t) {
                return (
                  <div key={t.tier} style={{ padding: '14px 20px', borderRadius: 14, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 105, transition: 'all 0.3s', cursor: 'default' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569' }}>Tier {t.tier}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, color: t.color, marginTop: 4 }}>${t.payout.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>


      {/* ═══ SECTION 2 — FOUR WAYS TO EARN ═══ */}
      <section style={{ ...S.section, background: 'linear-gradient(180deg,#030712 0%,#0a1628 50%,#030712 100%)' }}>
        <div style={{ ...S.inner, ...S.bb }}>
          <Reveal><h2 style={S.h2}>Four Ways to Earn.</h2></Reveal>
          <Reveal delay={0.1}><p style={S.blurb}>Each stream works independently. Together, they compound into real recurring income.</p></Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginTop: 48 }}>
            {[
              { name: 'Membership Commissions', rate: '50% recurring', rateColor: '#34d399', desc: 'Earn $10 to $29.50 per member every month — for as long as they stay active. Three tiers: Basic, Pro, and Creator.', accent: '#10b981' },
              { name: '8×8 Profit Grid', rate: 'Up to $7,200 per cycle', rateColor: '#818cf8', desc: '8 campaign tiers from $20 to $1,000. Your grid has 64 positions — each one pays you 6.25%. Grids auto-renew on completion.', accent: '#6366f1' },
              { name: 'Course Marketplace', rate: '100% commissions', rateColor: '#fbbf24', desc: 'Keep 100% of every sale. Sales 2, 4, 6, 8 pass up — cascading infinitely deep. Income from people you\'ve never met.', accent: '#f59e0b' },
              { name: 'SuperMarket', rate: '50 / 25 / 25', rateColor: '#38bdf8', desc: 'Sell digital products. Creators earn 50%, affiliates 25%. Create once, earn forever.', accent: '#0ea5e9' },
            ].map(function(stream, i) {
              return (
                <Reveal key={i} delay={i * 0.1}>
                  <div style={{ padding: '36px 28px', borderRadius: 24, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderTop: '3px solid ' + stream.accent, textAlign: 'left', height: '100%' }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{stream.name}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, color: stream.rateColor, marginBottom: 12 }}>{stream.rate}</div>
                    <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{stream.desc}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* 3D Grid */}
          <Reveal delay={0.2}>
            <div style={{ marginTop: 60, borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: '#050d1a' }}>
              <div style={{ textAlign: 'center', padding: '24px 20px 0' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(18px,3vw,24px)', fontWeight: 900, color: '#fff' }}>
                  Watch Your <span style={{ color: '#38bdf8' }}>Profit Grid</span> Build
                </div>
                <p style={{ fontSize: 13, color: 'rgba(200,220,255,0.4)', marginTop: 6 }}>Select a tier and watch 64 positions fill in real-time</p>
              </div>
              <div style={{ height: 380, padding: '8px 16px 16px' }}>
                <Suspense fallback={<div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700 }}>Loading 3D Grid...</div>}>
                  <IncomeGrid3D height={360} showControls autoPlay />
                </Suspense>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ═══ SECTION 3 — YOUR TOTAL MARKETING SUITE ═══ */}
      <section style={{ ...S.section, background: 'linear-gradient(180deg,#030712 0%,#0c1025 50%,#030712 100%)' }}>
        <div style={{ ...S.inner, ...S.bb }}>
          <Reveal><h2 style={S.h2}>Your Total Marketing Suite.</h2></Reveal>
          <Reveal delay={0.1}><p style={S.blurb}>Build any business with the Super Tools that come from being a member of SuperAdPro.</p></Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 48 }}>
            {TOOLS.map(function(t, i) {
              return (
                <Reveal key={i} delay={i * 0.05}>
                  <div style={{ padding: '28px 22px', borderRadius: 20, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.4s', height: '100%' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: t.color + '18', border: '1px solid ' + t.color + '33' }}>
                      <ToolIcon t={t} />
                    </div>
                    <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{t.name}</h3>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>{t.desc}</p>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', background: t.badge === 'PRO' ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.1)', color: t.badge === 'PRO' ? '#a78bfa' : '#38bdf8', border: '1px solid ' + (t.badge === 'PRO' ? 'rgba(139,92,246,0.2)' : 'rgba(14,165,233,0.2)') }}>{t.badge}</span>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 680, margin: '48px auto 0' }}>
            <Reveal>
              <div style={{ padding: '40px 28px', borderRadius: 24, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>Basic</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1 }}>$20<span style={{ fontSize: 16, color: '#64748b', fontWeight: 600 }}>/mo</span></div>
                <div style={{ fontSize: 13, color: '#64748b', margin: '6px 0 20px' }}>All the essentials</div>
                {['Your SuperLink','50% recurring commissions','8×8 Profit Grid','Campaign Studio','LinkHub + Link Tools','Course Marketplace','Training Centre','Social Share Suite'].map(function(f,i) {
                  return <div key={i} style={{ fontSize: 13, color: '#94a3b8', padding: '7px 0', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>✓ {f}</div>;
                })}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ padding: '40px 28px', borderRadius: 24, textAlign: 'center', background: 'linear-gradient(180deg,rgba(14,165,233,0.04),rgba(99,102,241,0.02))', border: '1px solid rgba(14,165,233,0.3)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontFamily: "'Sora',sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: 2, padding: '4px 16px', borderRadius: '0 0 8px 8px' }}>POPULAR</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>Pro</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1 }}>$35<span style={{ fontSize: 16, color: '#64748b', fontWeight: 600 }}>/mo</span></div>
                <div style={{ fontSize: 13, color: '#64748b', margin: '6px 0 20px' }}>Full AI automation</div>
                {['Everything in Basic','SuperSeller AI Autopilot','AI Funnel Generator','SuperPages builder','Email Autoresponder','ProSeller AI assistant','Lead Dashboard','Priority support'].map(function(f,i) {
                  return <div key={i} style={{ fontSize: 13, color: '#94a3b8', padding: '7px 0', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>✓ {f}</div>;
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </section>


      {/* ═══ FINAL CTA ═══ */}
      <section style={{ ...S.section, textAlign: 'center', padding: '80px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(251,191,36,0.06),transparent 60%)', pointerEvents: 'none' }}/>
        <div style={S.inner}>
          <Reveal>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(36px,6vw,56px)', fontWeight: 900, color: '#fff', marginBottom: 24 }}>
              {sponsor} is building.<br/><span style={S.gold}>Now it's your turn.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <div>
              <a href="/register" style={S.cta}>Create Your Free Account →</a>
              <div style={S.ctaNote}>Free · No credit card · Cancel anytime</div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <p style={{ fontSize: 11, color: '#1e293b', lineHeight: 1.7 }}>SuperAdPro · <a href="/legal" style={{ color: '#334155', textDecoration: 'none' }}>Terms</a> · <a href="/legal" style={{ color: '#334155', textDecoration: 'none' }}>Privacy</a> · <a href="/support" style={{ color: '#334155', textDecoration: 'none' }}>Support</a></p>
        <p style={{ fontSize: 11, color: '#1e293b', marginTop: 6 }}>Income figures represent the compensation plan structure. Actual results depend on individual effort, market conditions, and team activity.</p>
      </footer>
    </div>
  );
}
