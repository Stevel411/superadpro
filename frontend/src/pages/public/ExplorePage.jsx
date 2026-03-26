import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

  return (
    <div style={{ background:'#030712', color:'#fff', fontFamily:"'DM Sans',sans-serif", minHeight:'100vh' }}>
      <style>{`
        .exp-path{transition:all 0.3s!important}
        .exp-path:hover{transform:translateY(-6px)!important;box-shadow:0 20px 60px rgba(0,0,0,0.5)!important}
        .exp-nav a:hover{color:#fff!important}
        @media(max-width:768px){
          .exp-nav-links{display:none!important}
          .exp-paths{grid-template-columns:1fr!important}
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
          <Link to="/explore" style={{ fontSize:14, fontWeight:600, color:'#38bdf8', textDecoration:'none' }}>Explore</Link>
          <Link to="/login" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>Sign In</Link>
          <Link to="/register" style={{ padding:'10px 24px', borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', fontSize:13, fontWeight:800, textDecoration:'none' }}>Join Free</Link>
        </div>
      </nav>

      {/* ═══ HERO + VIDEO ═══ */}
      <section style={{ position:'relative', padding:'140px 24px 60px', overflow:'hidden', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0 }}>
          <img src="/static/images/explore-bg.jpg" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(3,7,18,0.7) 0%,rgba(3,7,18,0.5) 30%,rgba(3,7,18,0.6) 70%,rgba(3,7,18,0.95) 100%)' }}/>
          <Particles />
        </div>

        <div style={{ position:'relative', zIndex:1, maxWidth:800, margin:'0 auto' }}>
          <div style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(36px,6vw,56px)', fontWeight:900, lineHeight:0.95, marginBottom:16 }}>
            Welcome to<br/><span style={{ color:'#38bdf8' }}>SuperAdPro.</span>
          </div>
          <p style={{ fontSize:'clamp(16px,2vw,19px)', color:'rgba(255,255,255,0.5)', maxWidth:480, margin:'0 auto 40px', lineHeight:1.7 }}>
            The platform where creativity meets income.<br/>
            Watch this short video to see what we're all about.
          </p>

          {/* Video */}
          <div style={{ position:'relative', borderRadius:20, overflow:'hidden', border:'1px solid rgba(14,165,233,0.12)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', cursor:'pointer', background:'#0a1628', maxWidth:720, margin:'0 auto' }} onClick={togglePlay}>
            <video ref={vidRef} src="/static/images/how-it-works-video.mp4" style={{ width:'100%', display:'block', borderRadius:20 }} playsInline onEnded={function(){setPlaying(false)}}/>
            {!playing && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)' }}>
                <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(14,165,233,0.4)', marginBottom:14 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polygon points="9,5 9,19 20,12" fill="#fff"/></svg>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>Watch the overview</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ TWO PATHS ═══ */}
      <section style={{ padding:'60px 24px 80px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(24px,4vw,36px)', fontWeight:900, marginBottom:8 }}>Ready to learn more?</div>
            <p style={{ fontSize:16, color:'rgba(255,255,255,0.4)' }}>Choose your path</p>
          </div>

          <div className="exp-paths" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {/* Path 1 — What is SuperAdPro */}
            <Link to="/how-it-works" className="exp-path" style={{ textDecoration:'none', background:'linear-gradient(135deg,rgba(14,165,233,0.06),rgba(99,102,241,0.04))', border:'1px solid rgba(14,165,233,0.15)', borderRadius:24, padding:'44px 32px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:72, height:72, borderRadius:20, background:'rgba(14,165,233,0.1)', border:'1px solid rgba(14,165,233,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, marginBottom:24 }}>🚀</div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:900, color:'#fff', marginBottom:10 }}>What is SuperAdPro?</div>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:24, flex:1 }}>
                Discover the platform, the creative tools,<br/>
                and how everything works together.
              </p>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#0ea5e9', display:'flex', alignItems:'center', gap:8 }}>
                Explore the platform <span style={{ fontSize:18 }}>→</span>
              </div>
            </Link>

            {/* Path 2 — How Do I Earn */}
            <Link to="/earn" className="exp-path" style={{ textDecoration:'none', background:'linear-gradient(135deg,rgba(251,191,36,0.06),rgba(245,158,11,0.04))', border:'1px solid rgba(251,191,36,0.15)', borderRadius:24, padding:'44px 32px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:72, height:72, borderRadius:20, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, marginBottom:24 }}>💰</div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:900, color:'#fff', marginBottom:10 }}>How Do I Earn?</div>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:24, flex:1 }}>
                See the full affiliate programme,<br/>
                the income streams, and what you can make.
              </p>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#fbbf24', display:'flex', alignItems:'center', gap:8 }}>
                See the plan <span style={{ fontSize:18 }}>→</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding:'40px 24px 80px', textAlign:'center' }}>
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(22px,3.5vw,32px)', fontWeight:900, marginBottom:16 }}>
          Already convinced? <span style={{ color:'#38bdf8' }}>Join now.</span>
        </div>
        <p style={{ fontSize:15, color:'rgba(255,255,255,0.35)', marginBottom:28 }}>Free to join · No credit card · 60 seconds</p>
        <Link to="/register" style={{ display:'inline-block', padding:'18px 52px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, textDecoration:'none', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', boxShadow:'0 4px 24px rgba(14,165,233,0.25)', transition:'all 0.3s' }}>Create Your Free Account →</Link>
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
