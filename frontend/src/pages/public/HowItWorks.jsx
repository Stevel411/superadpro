import { Link } from 'react-router-dom';

export default function HowItWorks() {
  return (
    <div style={{ background:'#030712', color:'#fff', fontFamily:"'DM Sans',sans-serif", minHeight:'100vh' }}>
      <style>{`
        .hiw-nav a:hover{color:#fff!important}
        @media(max-width:768px){.hiw-nav-links{display:none!important}}
      `}</style>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:72, background:'rgba(3,7,18,0.7)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 12px rgba(14,165,233,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="10,4 10,20 21,12" fill="#fff"/></svg>
          </div>
          <span style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:900, color:'#fff' }}>SuperAd<span style={{ color:'#38bdf8' }}>Pro</span></span>
        </Link>
        <div className="hiw-nav-links hiw-nav" style={{ display:'flex', alignItems:'center', gap:24 }}>
          <Link to="/explore" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>Explore</Link>
          <Link to="/login" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>Sign In</Link>
          <Link to="/register" style={{ padding:'10px 24px', borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', fontSize:13, fontWeight:800, textDecoration:'none' }}>Join Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'72px 24px' }}>
        <div style={{ maxWidth:600 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 20px', borderRadius:99, background:'rgba(14,165,233,0.06)', border:'1px solid rgba(14,165,233,0.15)', fontSize:12, fontWeight:700, color:'#38bdf8', marginBottom:28, letterSpacing:1, textTransform:'uppercase' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#38bdf8' }}/>
            What is SuperAdPro?
          </div>
          <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(36px,6vw,56px)', fontWeight:900, lineHeight:0.95, marginBottom:20 }}>
            The Platform.<br/><span style={{ color:'#38bdf8' }}>The Tools.</span>
          </h1>
          <p style={{ fontSize:18, color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:32 }}>
            This page is being built with video walkthroughs of every tool, the Watch-to-Earn system, the Ad Board, and more.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/explore" style={{ padding:'16px 40px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, textDecoration:'none', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', transition:'all 0.3s' }}>← Back to Explore</Link>
            <Link to="/earn" style={{ padding:'16px 40px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, textDecoration:'none', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', boxShadow:'0 4px 24px rgba(14,165,233,0.25)', transition:'all 0.3s' }}>See the Affiliate Plan →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
