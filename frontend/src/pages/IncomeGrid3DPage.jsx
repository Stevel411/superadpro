import { useTranslation } from 'react-i18next';
import IncomeGrid3D from '../components/IncomeGrid3D';

export default function IncomeGrid3DPage() {
  var { t } = useTranslation();
  var h = typeof window !== 'undefined' ? Math.max(500, window.innerHeight - 260) : 500;
  return (
    <div style={{ background: 'var(--sap-cobalt-deep)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <a href="/" style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', textDecoration: 'none' }}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>Pro</span></a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/how-it-works" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.5)', textDecoration: 'none' }}>{t('incomeGrid3D.howItWorksBtn')}</a>
          <a href="/explore" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.5)', textDecoration: 'none' }}>{t('incomeGrid3D.exploreBtn')}</a>
          <a href="/earn" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,220,255,.5)', textDecoration: 'none' }}>{t('incomeGrid3D.earnBtn')}</a>
          <a href="/register" style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>{t('incomeGrid3D.getStartedBtn')}</a>
        </div>
      </nav>
      <div style={{ textAlign: 'center', padding: '32px 20px 0' }}>
        <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--sap-accent)', border: '1px solid rgba(14,165,233,.3)', padding: '6px 16px', borderRadius: 20, marginBottom: 12 }}>{t('incomeGrid3D.interactive3D')}</div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, color: '#fff', margin: '0 0 8px', lineHeight: 1.1 }}>
          Watch Your <span style={{ color: 'var(--sap-accent-light)' }}>Income Grid</span> Build
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(200,220,255,.4)', maxWidth: 550, margin: '0 auto', lineHeight: 1.6 }}>{t("incomeGrid3D.select3DDesc")}</p>
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
