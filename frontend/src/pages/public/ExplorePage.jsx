import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

function Particles() {
  var ref = useRef(null);
  useEffect(function() {
    var c = ref.current; if (!c) return;
    var ctx = c.getContext('2d'), pts = [], raf;
    var cols = ['99,102,241','14,165,233','139,92,246','251,191,36'];
    function resize() { c.width = c.parentElement.offsetWidth; c.height = c.parentElement.offsetHeight; }
    resize(); window.addEventListener('resize', resize);
    for (var i = 0; i < 30; i++) pts.push({ x:Math.random()*2000, y:Math.random()*2000, vx:(Math.random()-0.5)*0.15, vy:(Math.random()-0.5)*0.15, r:Math.random()*1.2+0.4, o:Math.random()*0.06+0.02, c:cols[~~(Math.random()*cols.length)] });
    function draw() {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(function(p) { p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0; if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0; ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba('+p.c+','+p.o+')';ctx.fill(); });
      for(var i=0;i<pts.length;i++) for(var j=i+1;j<pts.length;j++){var a=pts[i],b=pts[j],d=Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);if(d<100){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='rgba(99,102,241,'+(0.02*(1-d/100))+')';ctx.lineWidth=0.5;ctx.stroke();}}
      raf=requestAnimationFrame(draw);
    }
    draw();
    return function() { cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:0 }}/>;
}

export default function ExplorePage() {
  var [playing, setPlaying] = useState(false);
  var vidRef = useRef(null);

  function togglePlay() {
    if (!vidRef.current) return;
    if (playing) { vidRef.current.pause(); setPlaying(false); }
    else { vidRef.current.play(); setPlaying(true); }
  }

  var pages = [
    {
      title: 'How It Works',
      desc: 'Three simple steps to start earning. No experience needed, no tech skills required. See exactly how the platform works.',
      link: '/how-it-works',
      color: '#0ea5e9',
      icon: '🚀',
      tag: 'Start here',
    },
    {
      title: 'Compensation Plan',
      desc: 'Four income streams, eight grid tiers, 100% course commissions, and infinite pass-up depth. The full breakdown.',
      link: '/earn',
      color: '#fbbf24',
      icon: '💰',
      tag: 'The numbers',
    },
    {
      title: 'Marketing Tools',
      desc: 'AI Campaign Studio, SuperPages builder, LinkHub, Email Autoresponder — tools to build any business.',
      link: '/how-it-works#tools',
      color: '#8b5cf6',
      icon: '🛠️',
      tag: 'Your toolkit',
    },
    {
      title: 'FAQ',
      desc: 'Common questions answered. How much does it cost, how do you get paid, what makes this different.',
      link: '/faq',
      color: '#10b981',
      icon: '❓',
      tag: 'Got questions?',
    },
  ];

  return (
    <div style={{ background:'#030712', color:'#fff', fontFamily:"'DM Sans',sans-serif", minHeight:'100vh' }}>
      <style>{`
        .exp-card{transition:all 0.3s!important}
        .exp-card:hover{transform:translateY(-6px)!important;border-color:var(--card-color,rgba(255,255,255,0.15))!important;box-shadow:0 20px 60px rgba(0,0,0,0.4)!important}
        .exp-nav a:hover{color:#fff!important}
        @media(max-width:768px){
          .exp-nav-links{display:none!important}
          .exp-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:72, background:'rgba(3,7,18,0.7)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 12px rgba(14,165,233,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="10,4 10,20 21,12" fill="#fff"/></svg>
          </div>
          <span style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:900, color:'#fff' }}>SuperAd<span style={{ color:'#38bdf8' }}>Pro</span></span>
        </Link>
        <div className="exp-nav-links exp-nav" style={{ display:'flex', alignItems:'center', gap:24 }}>
          <Link to="/explore" style={{ fontSize:14, fontWeight:600, color:'#38bdf8', textDecoration:'none', transition:'color 0.2s' }}>Explore</Link>
          <Link to="/login" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>Sign In</Link>
          <Link to="/register" style={{ padding:'10px 24px', borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', fontSize:13, fontWeight:800, textDecoration:'none' }}>Join Free</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ position:'relative', padding:'160px 24px 80px', overflow:'hidden', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0 }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#030712 0%,#0a1628 50%,#030712 100%)' }}/>
          <Particles />
        </div>
        <div style={{ position:'relative', zIndex:1, maxWidth:700, margin:'0 auto' }}>
          <Reveal>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 20px', borderRadius:99, background:'rgba(14,165,233,0.06)', border:'1px solid rgba(14,165,233,0.15)', fontSize:12, fontWeight:700, color:'#38bdf8', marginBottom:28, letterSpacing:1, textTransform:'uppercase' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#38bdf8' }}/>
              Explore SuperAdPro
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(36px,6vw,60px)', fontWeight:900, lineHeight:0.95, marginBottom:20, letterSpacing:-2 }}>
              Discover What's<br/><span style={{ color:'#38bdf8' }}>Possible.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontSize:'clamp(16px,2vw,19px)', color:'rgba(255,255,255,0.5)', maxWidth:500, margin:'0 auto 40px', lineHeight:1.7 }}>
              Learn how SuperAdPro works, see the compensation plan,<br/>
              and discover the tools that power your income.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══ WELCOME VIDEO ═══ */}
      <section style={{ padding:'0 24px 80px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(22px,3.5vw,32px)', fontWeight:900, marginBottom:8 }}>Welcome to SuperAdPro</h2>
              <p style={{ fontSize:16, color:'rgba(255,255,255,0.4)' }}>Watch this short overview to see what we're all about</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ position:'relative', borderRadius:20, overflow:'hidden', border:'1px solid rgba(14,165,233,0.12)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', cursor:'pointer', background:'#0a1628' }} onClick={togglePlay}>
              <video ref={vidRef} src="/static/images/how-it-works-video.mp4" style={{ width:'100%', display:'block', borderRadius:20 }} playsInline onEnded={function(){setPlaying(false)}}/>
              {!playing && (
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.35)' }}>
                  <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(14,165,233,0.4)', marginBottom:16 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polygon points="9,5 9,19 20,12" fill="#fff"/></svg>
                  </div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>Click to play</div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ EXPLORE CARDS ═══ */}
      <section style={{ padding:'0 24px 80px' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:40 }}>
              <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(24px,4vw,36px)', fontWeight:900, marginBottom:8 }}>Dive Deeper.</h2>
              <p style={{ fontSize:16, color:'rgba(255,255,255,0.4)' }}>Choose what you'd like to learn about</p>
            </div>
          </Reveal>

          <div className="exp-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}>
            {pages.map(function(page, i) {
              return (
                <Reveal key={i} delay={i * 0.1}>
                  <Link to={page.link} className="exp-card" style={{ '--card-color': page.color+'40', display:'block', textDecoration:'none', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'36px 32px', position:'relative', overflow:'hidden', height:'100%' }}>
                    {/* Accent glow */}
                    <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:page.color, opacity:0.04, filter:'blur(40px)', pointerEvents:'none' }}/>

                    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                      <div style={{ width:52, height:52, borderRadius:14, background:page.color+'15', border:'1px solid '+page.color+'25', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{page.icon}</div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:800, color:page.color, textTransform:'uppercase', letterSpacing:1.5, marginBottom:2 }}>{page.tag}</div>
                        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#fff' }}>{page.title}</div>
                      </div>
                    </div>

                    <div style={{ fontSize:15, color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:20 }}>{page.desc}</div>

                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:800, color:page.color, display:'flex', alignItems:'center', gap:6 }}>
                      Learn more <span style={{ fontSize:16 }}>→</span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding:'60px 24px 80px', textAlign:'center' }}>
        <Reveal>
          <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(28px,4.5vw,44px)', fontWeight:900, marginBottom:16 }}>
            Seen enough?<br/><span style={{ color:'#38bdf8' }}>Let's go.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={{ fontSize:17, color:'rgba(255,255,255,0.4)', marginBottom:32 }}>Free to join. No credit card. Set up in 60 seconds.</p>
        </Reveal>
        <Reveal delay={0.2}>
          <Link to="/register" style={{ display:'inline-block', padding:'20px 56px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, textDecoration:'none', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', boxShadow:'0 4px 24px rgba(14,165,233,0.25)', transition:'all 0.3s' }}>Create Your Free Account →</Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer style={{ textAlign:'center', padding:'40px 24px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.15)', lineHeight:1.7 }}>
          SuperAdPro · <Link to="/legal" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>Terms</Link> · <Link to="/legal" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>Privacy</Link> · <Link to="/support" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>Support</Link>
        </p>
      </footer>
    </div>
  );
}
