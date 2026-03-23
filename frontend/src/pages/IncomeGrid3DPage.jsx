import IncomeGrid3D from '../components/IncomeGrid3D';

export default function IncomeGrid3DPage() {
  var h = typeof window !== 'undefined' ? Math.max(500, window.innerHeight - 260) : 500;
  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <a href="/" style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', textDecoration: 'none' }}>SuperAd<span style={{ color: '#38bdf8' }}>Pro</span></a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/how-it-works" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.5)', textDecoration: 'none' }}>How It Works</a>
          <a href="/explore" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.5)', textDecoration: 'none' }}>Explore</a>
          <a href="/earn" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.5)', textDecoration: 'none' }}>Earn</a>
          <a href="/register" style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Get Started</a>
        </div>
      </nav>
      <div style={{ textAlign: 'center', padding: '32px 20px 0' }}>
        <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#0ea5e9', border: '1px solid rgba(14,165,233,.3)', padding: '6px 16px', borderRadius: 20, marginBottom: 12 }}>Interactive 3D Visualisation</div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, color: '#fff', margin: '0 0 8px', lineHeight: 1.1 }}>
          Watch Your <span style={{ color: '#38bdf8' }}>Income Grid</span> Build
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(200,220,255,.4)', maxWidth: 550, margin: '0 auto', lineHeight: 1.6 }}>Select a campaign tier and watch 64 positions fill in real-time.</p>
      </div>
      <div style={{ flex: 1, padding: '16px 24px 24px' }}>
        <IncomeGrid3D height={h} showControls autoPlay />
      </div>
      <div style={{ textAlign: 'center', padding: '0 20px 32px' }}>
        <a href="/register" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 0 40px rgba(14,165,233,.25)' }}>Join Free & Build Your Grid →</a>
      </div>
    </div>
  );
}
