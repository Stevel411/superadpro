// AdminPageHeader — compact cobalt header for admin sub-pages.
// Carries the dashboard hero's cobalt + cyan-glow signature down to every
// admin page so the whole section reads as one surface. Replaces the page
// title that the old Topbar used to render (gone once a page opts into the
// CategoryTopBar chrome via categoryChrome). Built 28 Jun 2026.
export default function AdminPageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 18,
      padding: '20px 24px', color: '#fff',
      background: 'linear-gradient(135deg,#0a1438 0%,#15275f 60%,#0e7490 150%)',
      boxShadow: '0 14px 34px rgba(10,20,56,.14)', marginBottom: 18
    }}>
      <div style={{
        position: 'absolute', right: -50, top: -70, width: 260, height: 260,
        borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(34,211,238,.18),transparent 66%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {Icon && (
            <div style={{
              width: 46, height: 46, borderRadius: 13,
              background: 'rgba(34,211,238,.16)', color: '#67e8f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: '0 0 auto'
            }}><Icon size={23} /></div>
          )}
          <div>
            <div style={{
              fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22,
              letterSpacing: '-.4px', lineHeight: 1.12
            }}>{title}</div>
            {subtitle && (
              <div style={{ color: '#bcd0f0', fontSize: 13.5, marginTop: 4 }}>{subtitle}</div>
            )}
          </div>
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>
        )}
      </div>
    </div>
  );
}
