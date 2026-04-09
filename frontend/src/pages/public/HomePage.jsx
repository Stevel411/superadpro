import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function Particles() {
  var ref = useRef(null);
  useEffect(function() {
    var c = ref.current; if (!c) return;
    var ctx = c.getContext('2d'), pts = [], mouse = { x: 0, y: 0 }, raf;
    var cols = ['99,102,241','14,165,233','139,92,246','251,191,36','16,185,129'];
    function resize() { c.width = c.parentElement.offsetWidth; c.height = c.parentElement.offsetHeight; }
    resize(); window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    for (var i = 0; i < 45; i++) pts.push({ x: Math.random()*2000, y: Math.random()*2000, vx: (Math.random()-0.5)*0.2, vy: (Math.random()-0.5)*0.2, r: Math.random()*1.5+0.5, o: Math.random()*0.08+0.02, c: cols[~~(Math.random()*cols.length)] });
    var pulses = [];
    function draw() {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(function(p) { p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0; if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0; var dx=mouse.x-p.x,dy=mouse.y-p.y,dist=Math.sqrt(dx*dx+dy*dy),glow=dist<200?0.06*(1-dist/200):0; ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba('+p.c+','+(p.o+glow)+')';ctx.fill(); });
      for(var i=0;i<pts.length;i++) for(var j=i+1;j<pts.length;j++){var a=pts[i],b=pts[j],d=Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);if(d<110){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='rgba(99,102,241,'+(0.025*(1-d/110))+')';ctx.lineWidth=0.5;ctx.stroke();}}
      if(Math.random()<0.025&&pts.length>2){var ai=~~(Math.random()*pts.length),bi=~~(Math.random()*pts.length);if(ai!==bi){var pa=pts[ai],pb=pts[bi],dd=Math.sqrt((pa.px||pa.x-pb.x)**2+(pa.y-pb.y)**2);if(dd<110)pulses.push({ax:pa.x,ay:pa.y,bx:pb.x,by:pb.y,p:0,speed:0.015+Math.random()*0.02});}}
      pulses=pulses.filter(function(pl){pl.p+=pl.speed;if(pl.p>1)return false;var px=pl.ax+(pl.bx-pl.ax)*pl.p,py=pl.ay+(pl.by-pl.ay)*pl.p,o=pl.p<0.5?pl.p*2:(1-pl.p)*2;ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fillStyle='rgba(251,191,36,'+0.5*o+')';ctx.fill();ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fillStyle='rgba(251,191,36,'+0.08*o+')';ctx.fill();return true;});
      raf=requestAnimationFrame(draw);
    }
    draw();
    return function() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:1 }}/>;
}

export default function HomePage() {
  var [stats, setStats] = useState(null);
  useEffect(function() {
    fetch('/api/public/stats').then(function(r){ return r.json(); }).then(function(d){ setStats(d); }).catch(function(){});
  }, []);

  return (
    <div style={{ background:'#0f1d3a', color:'#fff', fontFamily:"'DM Sans',sans-serif", minHeight:'100vh' }}>
      <style>{`
        @keyframes hp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
        @keyframes hp-fadeUp{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:translateY(0)}}
        .hp-f1{opacity:0;animation:hp-fadeUp .8s ease forwards .1s}
        .hp-f2{opacity:0;animation:hp-fadeUp .8s ease forwards .25s}
        .hp-f3{opacity:0;animation:hp-fadeUp .8s ease forwards .4s}
        .hp-f4{opacity:0;animation:hp-fadeUp .8s ease forwards .55s}
        .hp-f5{opacity:0;animation:hp-fadeUp .8s ease forwards .7s}
        .hp-f6{opacity:0;animation:hp-fadeUp .8s ease forwards .85s}
        .hp-f7{opacity:0;animation:hp-fadeUp .8s ease forwards 1s}
        .hp-social a:hover{background:rgba(255,255,255,0.12)!important;color:#fff!important;transform:translateY(-2px)}
        .hp-nav a:hover{color:#fff!important}
        .hp-cta-p:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(14,165,233,0.35)!important}
        .hp-cta-s:hover{border-color:rgba(255,255,255,0.3)!important;background:rgba(255,255,255,0.06)!important;transform:translateY(-2px)}
        @media(max-width:768px){
          .hp-nav-links{display:none!important}
          .hp-hero-content{padding:100px 24px 40px!important}
          .hp-headline{font-size:38px!important}
          .hp-stats{justify-content:center!important}
          .hp-stat{text-align:center!important}
          .hp-cta-row{justify-content:center!important}
          .hp-social{justify-content:center!important}
        }
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:72, background:'rgba(3,7,18,0.5)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 12px rgba(14,165,233,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="10,4 10,20 21,12" fill="#fff"/></svg>
          </div>
          <span style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:900, color:'#fff' }}>SuperAd<span style={{ color:'#38bdf8' }}>Pro</span></span>
        </Link>
        <div className="hp-nav-links hp-nav" style={{ display:'flex', alignItems:'center', gap:24 }}>
          <Link to="/explore" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>Explore</Link>
          <Link to="/login" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>Sign In</Link>
          <Link to="/register" style={{ padding:'10px 24px', borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', fontSize:13, fontWeight:800, textDecoration:'none', transition:'all 0.2s' }}>Join Free</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden' }}>
        {/* Background layers */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="/static/images/hero-bg.jpg" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
          {/* Left-heavy gradient overlay */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(3,7,18,0.92) 0%,rgba(3,7,18,0.75) 35%,rgba(3,7,18,0.3) 65%,rgba(3,7,18,0.15) 100%)' }}/>
          {/* Top + bottom fade */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(3,7,18,0.6) 0%,transparent 25%,transparent 75%,rgba(3,7,18,0.8) 100%)' }}/>
          <Particles />
        </div>

        {/* Content */}
        <div className="hp-hero-content" style={{ position:'relative', zIndex:2, maxWidth:1200, margin:'0 auto', padding:'120px 48px 60px', width:'100%' }}>
          <div className="hp-f1" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 20px', borderRadius:99, background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:32, letterSpacing:1, textTransform:'uppercase', backdropFilter:'blur(8px)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'hp-pulse 2s ease-in-out infinite' }}/>
            The Creative Income Platform
          </div>

          <h1 className="hp-f2 hp-headline" style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(42px,6.5vw,80px)', fontWeight:900, lineHeight:0.92, marginBottom:24, letterSpacing:-2, color:'#fff', maxWidth:600 }}>
            Your Creativity<br/>
            <span style={{ background:'linear-gradient(135deg,#0ea5e9,#38bdf8,#7dd3fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Pays Here.</span>
          </h1>

          <p className="hp-f3" style={{ fontSize:'clamp(15px,1.8vw,18px)', color:'rgba(255,255,255,0.6)', maxWidth:460, lineHeight:1.7, fontWeight:500, marginBottom:36 }}>
            Create content. Share your link.<br/>
            Earn from four income streams. AI-powered tools,<br/>
            a generous affiliate programme, and a community<br/>
            that grows together.
          </p>

          <div className="hp-f4 hp-cta-row" style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <Link to="/register" className="hp-cta-p" style={{ padding:'18px 44px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:800, textDecoration:'none', border:'none', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', boxShadow:'0 4px 24px rgba(14,165,233,0.25)', transition:'all 0.3s' }}>Join Free →</Link>
            <Link to="/explore" className="hp-cta-s" style={{ padding:'18px 44px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:800, textDecoration:'none', border:'1px solid rgba(255,255,255,0.15)', background:'rgba(0,0,0,0.2)', color:'#fff', transition:'all 0.3s', backdropFilter:'blur(4px)' }}>Explore SuperAdPro</Link>
          </div>

          <div className="hp-f5 hp-social" style={{ display:'flex', gap:10, marginTop:32 }}>
            {[
              {title:'YouTube',d:'M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z',s:16},
              {title:'X',d:'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',s:14},
              {title:'Facebook',d:'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',s:14},
              {title:'TikTok',d:'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z',s:14},
              {title:'Instagram',d:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',s:14},
            ].map(function(icon, i) {
              return <a key={i} href="#" title={icon.title} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', color:'rgba(255,255,255,0.5)', transition:'all 0.2s', backdropFilter:'blur(4px)' }}><svg width={icon.s} height={icon.s} viewBox="0 0 24 24" fill="currentColor"><path d={icon.d}/></svg></a>;
            })}
          </div>

          <div className="hp-f6 hp-stats" style={{ display:'flex', gap:'clamp(20px,3vw,40px)', marginTop:48, flexWrap:'wrap', alignItems:'center' }}>
            {/* Live member counter */}
            {stats && stats.members > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', borderRadius:14, background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.08)', backdropFilter:'blur(8px)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'hp-pulse 2s ease-in-out infinite', flexShrink:0 }}/>
                <span style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:900, color:'#22c55e' }}>{stats.members.toLocaleString()}</span>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)', fontWeight:600 }}>active members</span>
              </div>
            )}
            {[
              { val: 'AI Creative Studio', color: '#38bdf8', label: 'Video, Images, Music & Voiceover' },
              { val: 'Video Advertising', color: '#34d399', label: 'Campaign Tiers & Targeted Views' },
              { val: 'Affiliate System', color: '#fbbf24', label: 'Earn From Every Referral' },
            ].map(function(s, i) {
              return (
                <div key={i} className="hp-stat" style={{ textAlign:'left' }}>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(16px,2vw,20px)', fontWeight:900, lineHeight:1.2, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', marginTop:5, lineHeight:1.4 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position:'relative', zIndex:1, padding:'40px 24px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display:'flex', justifyContent:'center', gap:20, marginBottom:14, flexWrap:'wrap' }}>
          <Link to="/free/meme-generator" style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textDecoration:'none' }}>Free Meme Generator</Link>
          <Link to="/free/qr-code-generator" style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textDecoration:'none' }}>Free QR Code Generator</Link>
          <Link to="/free/banner-creator" style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textDecoration:'none' }}>Free Banner Creator</Link>
        </div>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.15)', lineHeight:1.7, textAlign:'center' }}>
          SuperAdPro · <Link to="/legal" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>Terms</Link> · <Link to="/legal" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>Privacy</Link> · <Link to="/support" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>Support</Link>
        </p>
      </footer>
    </div>
  );
}
