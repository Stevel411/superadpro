import IncomeGrid3D from '../components/IncomeGrid3D';

export default function IncomeGrid3DPage() {
  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <a href="/" style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', textDecoration: 'none' }}>
          SuperAd<span style={{ color: '#38bdf8' }}>Pro</span>
        </a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/how-it-works" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.6)', textDecoration: 'none' }}>How It Works</a>
          <a href="/explore" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.6)', textDecoration: 'none' }}>Explore</a>
          <a href="/compensation-plan" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.6)', textDecoration: 'none' }}>Comp Plan</a>
          <a href="/register" style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Get Started</a>
        </div>
      </nav>

      {/* Hero text */}
      <div style={{ textAlign: 'center', padding: '40px 20px 0' }}>
        <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#0ea5e9', border: '1px solid rgba(14,165,233,.3)', padding: '6px 16px', borderRadius: 20, marginBottom: 16 }}>
          Interactive 3D Visualisation
        </div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.1 }}>
          Watch Your <span style={{ background: 'linear-gradient(135deg,#0ea5e9,#38bdf8,#4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Income Grid</span> Build
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(200,220,255,.5)', maxWidth: 600, margin: '0 auto 8px', lineHeight: 1.7 }}>
          Select a campaign tier and watch 64 positions fill in real-time. See exactly how commissions flow through 8 levels of your network.
        </p>
      </div>

      {/* 3D Grid - takes up most of the viewport */}
      <div style={{ flex: 1, padding: '20px 40px 40px', minHeight: 0 }}>
        <IncomeGrid3D height={Math.max(500, typeof window !== 'undefined' ? window.innerHeight - 280 : 500)} showControls={true} autoPlay={true} />
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', padding: '0 20px 40px' }}>
        <a href="/register" style={{
          display: 'inline-block', padding: '16px 40px', borderRadius: 12,
          background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff',
          fontWeight: 800, fontSize: 18, textDecoration: 'none',
          boxShadow: '0 0 40px rgba(14,165,233,.3)',
        }}>
          Join Free & Build Your Grid →
        </a>
      </div>
    </div>
  );
}
