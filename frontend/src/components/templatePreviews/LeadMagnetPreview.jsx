// ─── LeadMagnetPreview ─ visual preview tile for the Lead Magnet template ───
// Hand-crafted miniature of the actual published page (badge → headline →
// subhead → form → benefit cards). Renders inside the tile cover on
// /pro/funnels/new so members see what the page looks like before clicking,
// instead of just an abstract gradient + icon.

export default function LeadMagnetPreview() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#f8fafc',
      padding: '8px 10px 0',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      {/* badge */}
      <div style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: 5.5, fontWeight: 700,
        color: '#0e7490', background: 'rgba(6,182,212,0.10)',
        border: '0.5px solid rgba(6,182,212,0.25)', borderRadius: 99,
        padding: '2px 6px', letterSpacing: 0.4,
      }}>★ FREE DOWNLOAD</div>

      {/* headline */}
      <div style={{
        fontFamily: "'Sora',sans-serif", fontWeight: 900, fontSize: 9.5,
        color: '#0a1438', textAlign: 'center', lineHeight: 1.05,
        letterSpacing: -0.2, padding: '0 6px',
      }}>Get the free guide that shows you how.</div>

      {/* subhead */}
      <div style={{
        fontSize: 5, color: '#64748b', textAlign: 'center', lineHeight: 1.3,
      }}>Enter your email and we'll send it right away.</div>

      {/* mini form card */}
      <div style={{
        marginTop: 2, width: '78%',
        background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 4,
        padding: '4px 5px', display: 'flex', flexDirection: 'column', gap: 2,
        boxShadow: '0 2px 6px rgba(10,20,56,0.06)',
      }}>
        <div style={{
          background: '#f1f5f9', border: '0.5px solid #e2e8f0', borderRadius: 2,
          height: 7,
        }}/>
        <div style={{
          background: 'linear-gradient(135deg,#0a1438,#0ea5e9)', borderRadius: 2,
          height: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 5,
        }}>Get the guide →</div>
      </div>
    </div>
  );
}
