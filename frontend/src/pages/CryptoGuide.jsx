import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { Shield, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';

// STEPS moved inside component

export default function CryptoGuide() {
  var { t } = useTranslation();
  var [expanded, setExpanded] = useState(null);

  var STEPS = [
    { num:'1', title:t('cryptoGuide.step1Title'), color:'#0ea5e9', bg:'#e0f2fe', content:[t('cryptoGuide.step1P1'),t('cryptoGuide.step1P2')], warning:t('cryptoGuide.step1Warning'), link:{url:'https://metamask.io/download/',label:t('cryptoGuide.step1Link')} },
    { num:'2', title:t('cryptoGuide.step2Title'), color:'#10b981', bg:'#d1fae5', content:[t('cryptoGuide.step2P1'),t('cryptoGuide.step2P2')], comparison:{bad:{label:t('cryptoGuide.ethereum'),cost:t('cryptoGuide.ethereumCost'),color:'#dc2626'},good:{label:t('cryptoGuide.polygon'),cost:t('cryptoGuide.polygonCost'),color:'#16a34a'}} },
    { num:'3', title:t('cryptoGuide.step3Title'), color:'#8b5cf6', bg:'#ede9fe', content:[t('cryptoGuide.step3P1'),t('cryptoGuide.step3P2')], tip:t('cryptoGuide.step3Tip') },
    { num:'4', title:t('cryptoGuide.step4Title'), color:'#f59e0b', bg:'#fef3c7', content:[t('cryptoGuide.step4P1'),t('cryptoGuide.step4P2')], warning:t('cryptoGuide.step4Warning'), tip:t('cryptoGuide.step4Tip') },
    { num:'5', title:t('cryptoGuide.step5Title'), color:'#16a34a', bg:'#dcfce7', content:[t('cryptoGuide.step5P1'),t('cryptoGuide.step5P2')] },
  ];

  return (
    <AppLayout title={t("cryptoGuide.title")} subtitle={t("cryptoGuide.subtitle")}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 18,
        padding: '32px 36px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(14,165,233,.1)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, position: 'relative' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={28} color="#fff"/>
          </div>
          <div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 24, fontWeight: 800, color: '#fff' }}>{t("cryptoGuide.heroTitle")}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>{t("cryptoGuide.heroSubtitle")}</div>
          </div>
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 600, position: 'relative' }}>
          {t('cryptoGuide.heroDesc')}
        </div>
      </div>

      {/* Quick overview */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {STEPS.map(function(s) {
          return <div key={s.num} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{s.num}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{s.title}</div>
          </div>;
        })}
      </div>

      {/* Step cards */}
      {STEPS.map(function(s, i) {
        var isOpen = expanded === i || expanded === null;
        return <div key={s.num} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 14, overflow: 'hidden' }}>
          <div onClick={function() { setExpanded(expanded === i ? -1 : i); }}
            style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: s.color }}>{s.num}</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{s.title}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>{t('cryptoGuide.stepOf', {num: s.num})}</div>
              </div>
            </div>
            {isOpen ? <ChevronUp size={20} color="#94a3b8"/> : <ChevronDown size={20} color="#94a3b8"/>}
          </div>

          {isOpen && (
            <div style={{ padding: '0 24px 24px' }}>
              {s.content.map(function(p, pi) {
                return <p key={pi} style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, margin: '0 0 12px' }}>{p}</p>;
              })}

              {s.warning && (
                <div style={{ display: 'flex', gap: 12, padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 12 }}>
                  <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }}/>
                  <div style={{ fontSize: 15, color: '#991b1b', lineHeight: 1.7, fontWeight: 600 }}>{s.warning}</div>
                </div>
              )}

              {s.tip && (
                <div style={{ display: 'flex', gap: 12, padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 12 }}>
                  <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }}/>
                  <div style={{ fontSize: 15, color: '#166534', lineHeight: 1.7 }}>{s.tip}</div>
                </div>
              )}

              {s.comparison && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: '#fef2f2', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#991b1b' }}>{s.comparison.bad.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{s.comparison.bad.cost}</div>
                  </div>
                  <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>{s.comparison.good.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{s.comparison.good.cost}</div>
                  </div>
                </div>
              )}

              {s.link && (
                <a href={s.link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: s.color, textDecoration: 'none', padding: '8px 16px', border: '1px solid ' + s.color, borderRadius: 10 }}>
                  {s.link.label} <ExternalLink size={14}/>
                </a>
              )}
            </div>
          )}
        </div>;
      })}

      {/* Security footer */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Shield size={24} color="#0ea5e9"/>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{t("cryptoGuide.securityTitle")}</div>
          <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7 }}>{t("cryptoGuide.securityDesc")}</div>
        </div>
      </div>

    </AppLayout>
  );
}
