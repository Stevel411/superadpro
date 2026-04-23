import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { Shield, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CryptoGuide() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(null);

  // Step definitions. Using existing translation keys — all 32 keys already
  // populated across all 20 locale files from earlier i18n passes, so we
  // don't touch copy, only styling. Each step gets a distinct accent color
  // to echo the Dashboard's 4-income-streams pattern.
  const STEPS = [
    {
      num: '1',
      title: t('cryptoGuide.step1Title'),
      color: 'var(--sap-accent)',
      bg: '#e0f2fe',
      content: [t('cryptoGuide.step1P1'), t('cryptoGuide.step1P2')],
      warning: t('cryptoGuide.step1Warning'),
      link: { url: 'https://metamask.io/download/', label: t('cryptoGuide.step1Link') },
    },
    {
      num: '2',
      title: t('cryptoGuide.step2Title'),
      color: 'var(--sap-green-mid)',
      bg: '#d1fae5',
      content: [t('cryptoGuide.step2P1'), t('cryptoGuide.step2P2')],
      comparison: {
        bad: { label: t('cryptoGuide.ethereum'), cost: t('cryptoGuide.ethereumCost'), color: 'var(--sap-red)' },
        good: { label: t('cryptoGuide.polygon'), cost: t('cryptoGuide.polygonCost'), color: 'var(--sap-green)' },
      },
    },
    {
      num: '3',
      title: t('cryptoGuide.step3Title'),
      color: 'var(--sap-purple)',
      bg: 'var(--sap-purple-pale)',
      content: [t('cryptoGuide.step3P1'), t('cryptoGuide.step3P2')],
      tip: t('cryptoGuide.step3Tip'),
    },
    {
      num: '4',
      title: t('cryptoGuide.step4Title'),
      color: 'var(--sap-amber)',
      bg: 'var(--sap-amber-bg)',
      content: [t('cryptoGuide.step4P1'), t('cryptoGuide.step4P2')],
      warning: t('cryptoGuide.step4Warning'),
      tip: t('cryptoGuide.step4Tip'),
    },
    {
      num: '5',
      title: t('cryptoGuide.step5Title'),
      color: 'var(--sap-green)',
      bg: 'var(--sap-green-bg-mid)',
      content: [t('cryptoGuide.step5P1'), t('cryptoGuide.step5P2')],
    },
  ];

  return (
    <AppLayout title={t('cryptoGuide.title')} subtitle={t('cryptoGuide.subtitle')}>
      {/* Cobalt hero banner — matches Dashboard & CompensationPlan theme.
          Gradient: deep navy → cobalt → indigo. Subtle radar rings on the
          right echo the Dashboard welcome banner's visual language. */}
      <div style={{
        background: 'linear-gradient(135deg,#172554,#1e3a8a,#4338ca)',
        borderRadius: 18,
        padding: '30px 34px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(67,56,202,0.35)',
      }}>
        {/* Radar rings in the top-right corner */}
        <div style={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(196,181,253,0.2)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 18, borderRadius: '50%', border: '1px solid rgba(196,181,253,0.3)' }}>
              <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(196,181,253,0.45)' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={38} color="#c4b5fd" style={{ opacity: 0.7 }} />
            </div>
          </div>
        </div>

        {/* Twinkling stars for subtle visual interest */}
        {[[15, 35, 2.1, 0], [60, 55, 2.8, 0.6], [28, 72, 1.9, 1.2], [75, 28, 3, 0.9], [45, 82, 2.5, 1.8], [20, 65, 2.2, 0.4]].map(function ([top, left, dur, delay], i) {
          return (
            <div key={i} style={{
              position: 'absolute',
              width: i % 3 === 0 ? 5 : i % 3 === 1 ? 3 : 4,
              height: i % 3 === 0 ? 5 : i % 3 === 1 ? 3 : 4,
              borderRadius: '50%',
              background: i % 2 === 0 ? '#fff' : '#c4b5fd',
              top: `${top}%`,
              right: `${left * 0.5 + 2}%`,
              animation: `cgStar ${dur}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
              pointerEvents: 'none',
            }} />
          );
        })}

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 640 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
            {t('cryptoGuide.heroSubtitle')}
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.15 }}>
            {t('cryptoGuide.heroTitle')}
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
            {t('cryptoGuide.heroDesc')}
          </div>
        </div>
      </div>

      {/* Quick-overview strip — 5 small cards, one per step, showing the
          journey at a glance. Click a card to jump-expand that step below. */}
      <div className="cg-overview" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 22 }}>
        {STEPS.map(function (s, i) {
          const isActive = expanded === i;
          return (
            <button
              key={s.num}
              onClick={function () { setExpanded(isActive ? -1 : i); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#fff',
                borderRadius: 12,
                padding: '14px 16px',
                border: `1px solid ${isActive ? s.color : '#e2e8f0'}`,
                cursor: 'pointer',
                transition: 'all .15s',
                boxShadow: isActive ? `0 4px 14px ${s.color}20` : '0 1px 3px rgba(15,23,42,0.04)',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: s.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
                fontFamily: 'Sora,sans-serif',
              }}>{s.num}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text-primary)', lineHeight: 1.3 }}>{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* Expandable step cards with full content */}
      {STEPS.map(function (s, i) {
        const isOpen = expanded === i || expanded === null;
        return (
          <div key={s.num} style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            marginBottom: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}>
            {/* Clickable header row */}
            <div onClick={function () { setExpanded(expanded === i ? -1 : i); }}
              style={{
                padding: '18px 22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: isOpen ? '1px solid #f1f5f9' : 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: s.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: s.color }}>{s.num}</div>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--sap-text-primary)', fontFamily: 'Sora,sans-serif' }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', marginTop: 2 }}>{t('cryptoGuide.stepOf', { num: s.num })}</div>
                </div>
              </div>
              {isOpen
                ? <ChevronUp size={20} color="var(--sap-text-faint)" />
                : <ChevronDown size={20} color="var(--sap-text-faint)" />}
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: '18px 22px 22px' }}>
                {s.content.map(function (p, pi) {
                  return (
                    <p key={pi} style={{ fontSize: 16, color: 'var(--sap-text-secondary)', lineHeight: 1.7, margin: '0 0 12px' }}>{p}</p>
                  );
                })}

                {s.warning && (
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    padding: '14px 16px',
                    background: 'var(--sap-red-bg)',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    marginBottom: 12,
                  }}>
                    <AlertTriangle size={18} color="var(--sap-red)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 14, color: '#991b1b', lineHeight: 1.6, fontWeight: 600 }}>{s.warning}</div>
                  </div>
                )}

                {s.tip && (
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    padding: '14px 16px',
                    background: 'var(--sap-green-bg)',
                    border: '1px solid #bbf7d0',
                    borderRadius: 10,
                    marginBottom: 12,
                  }}>
                    <CheckCircle size={18} color="var(--sap-green)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 14, color: '#166534', lineHeight: 1.6 }}>{s.tip}</div>
                  </div>
                )}

                {s.comparison && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: 'var(--sap-red-bg)', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.comparison.bad.label}</div>
                      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-red)', marginTop: 4 }}>{s.comparison.bad.cost}</div>
                    </div>
                    <div style={{ background: 'var(--sap-green-bg)', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.comparison.good.label}</div>
                      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-green)', marginTop: 4 }}>{s.comparison.good.cost}</div>
                    </div>
                  </div>
                )}

                {s.link && (
                  <a href={s.link.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      textDecoration: 'none',
                      padding: '10px 18px',
                      background: `linear-gradient(135deg, ${s.color}, ${s.color})`,
                      borderRadius: 9,
                      boxShadow: `0 4px 12px ${s.color}35`,
                    }}>
                    {s.link.label} <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Security footer card — light theme, matches platform standard */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
        border: '1px solid #c7d2fe',
        borderRadius: 14,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginTop: 16,
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(14,165,233,0.25)',
        }}>
          <Shield size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)', fontFamily: 'Sora,sans-serif', marginBottom: 3 }}>{t('cryptoGuide.securityTitle')}</div>
          <div style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>{t('cryptoGuide.securityDesc')}</div>
        </div>
      </div>

      {/* Twinkle animation + responsive overview grid */}
      <style>{`
        @keyframes cgStar {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.1); }
        }
        @media (max-width: 960px) {
          .cg-overview { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .cg-overview { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppLayout>
  );
}
