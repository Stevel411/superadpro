import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import VoiceGuide from '../components/VoiceGuide';
import { Map, Share2, DollarSign, Link2, Users, Zap, Eye, Sparkles, Wallet, Heart, Play, ArrowRight, ChevronLeft, ChevronRight, Wrench, Lock } from 'lucide-react';

function getSections(t) { return [
  {
    id: 'dashboard', num: '1', title: t('platformTour.s1_title'), shortTitle: t('platformTour.s1_short'),
    desc: t('platformTour.s1_desc'),
    tips: [t('platformTour.s1_tip1'), t('platformTour.s1_tip2'), t('platformTour.s1_tip3'), t('platformTour.s1_tip4')],
    link: '/dashboard', linkLabel: t('platformTour.s1_link'),
    Icon: Map, color: 'var(--sap-indigo)', bg: '#eef2ff',
    videoSrc: '/static/downloads/tour-videos/how-you-earn-tour.mp4',
  },
  {
    id: 'howyouearn', num: '2', title: t('platformTour.s2_title'), shortTitle: t('platformTour.s2_short'),
    desc: t('platformTour.s2_desc'),
    tips: [t('platformTour.s2_tip1'), t('platformTour.s2_tip2'), t('platformTour.s2_tip3'), t('platformTour.s2_tip4'), t('platformTour.s2_tip5')],
    link: '/compensation-plan', linkLabel: t('platformTour.s2_link'),
    Icon: DollarSign, color: 'var(--sap-green)', bg: 'var(--sap-green-bg-mid)',
  },
  {
    id: 'watchearn', num: '3', title: t('platformTour.s3_title'), shortTitle: t('platformTour.s3_short'),
    desc: t('platformTour.s3_desc'),
    tips: [t('platformTour.s3_tip1'), t('platformTour.s3_tip2'), t('platformTour.s3_tip3'), t('platformTour.s3_tip4'), t('platformTour.s3_tip5')],
    link: '/watch', linkLabel: t('platformTour.s3_link'),
    Icon: Eye, color: 'var(--sap-amber)', bg: 'var(--sap-amber-bg)',
  },
  {
    id: 'basictools', num: '4', title: t('platformTour.s4_title'), shortTitle: t('platformTour.s4_short'),
    desc: t('platformTour.s4_desc'),
    tips: [t('platformTour.s4_tip1'), t('platformTour.s4_tip2'), t('platformTour.s4_tip3'), t('platformTour.s4_tip4')],
    link: '/creative-studio', linkLabel: t('platformTour.s4_link'),
    Icon: Wrench, color: 'var(--sap-accent)', bg: '#e0f2fe',
  },
  {
    id: 'protools', num: '5', title: t('platformTour.s5_title'), shortTitle: t('platformTour.s5_short'),
    desc: t('platformTour.s5_desc'),
    tips: [t('platformTour.s5_tip1'), t('platformTour.s5_tip2'), t('platformTour.s5_tip3'), t('platformTour.s5_tip4')],
    link: '/upgrade', linkLabel: t('platformTour.s5_link'),
    Icon: Lock, color: 'var(--sap-purple)', bg: 'var(--sap-purple-pale)',
    pro: true,
  },
  {
    id: 'wallet', num: '6', title: t('platformTour.s6_title'), shortTitle: t('platformTour.s6_short'),
    desc: t('platformTour.s6_desc'),
    tips: [t('platformTour.s6_tip1'), t('platformTour.s6_tip2'), t('platformTour.s6_tip3'), t('platformTour.s6_tip4'), t('platformTour.s6_tip5')],
    link: '/wallet', linkLabel: t('platformTour.s6_link'),
    Icon: Wallet, color: 'var(--sap-green-dark)', bg: '#d1fae5',
  },
];}

export default function PlatformTour() {
  var { t } = useTranslation();
  var [activeIdx, setActiveIdx] = useState(0);
  var SECTIONS = getSections(t);
  var s = SECTIONS[activeIdx];

  return (
    <AppLayout title={t("platformTour.title")} subtitle={t("platformTour.subtitle")}>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
        {SECTIONS.map(function(sec, i) {
          var isActive = i === activeIdx;
          return <button key={sec.id} onClick={function() { setActiveIdx(i); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10,
              border: isActive ? '1.5px solid ' + sec.color : '1px solid #e2e8f0',
              background: isActive ? sec.bg : '#fff',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? sec.color : 'var(--sap-text-muted)', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all .15s',
            }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? sec.color : sec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <sec.Icon size={12} color={isActive ? '#fff' : sec.color}/>
            </div>
            {sec.shortTitle}
          </button>;
        })}
      </div>

      {/* Active section content */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>

        {/* Section header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <s.Icon size={26} color={s.color}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{s.title}</span>
              {s.pro && <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,.1)', fontSize: 12, fontWeight: 700, color: 'var(--sap-violet)' }}>{t('platformTour.proLabel')}</span>}
            </div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', marginTop: 2 }}>Step {s.num} of 6</div>
          </div>
        </div>

        {/* Video or placeholder */}
        <div style={{ margin: '24px 28px 0', borderRadius: 14, overflow: 'hidden', aspectRatio: '16/9', position: 'relative', background: '#000' }}>
          {s.videoSrc ? (
            <video
              key={s.id}
              controls
              preload="metadata"
              style={{ width: '100%', height: '100%', borderRadius: 14, display: 'block' }}
              poster=""
            >
              <source src={s.videoSrc} type="video/mp4"/>
              Your browser does not support the video tag.
            </video>
          ) : s.videoId ? (
            <iframe
              src={'https://www.youtube-nocookie.com/embed/' + s.videoId + '?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white'}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 14 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={s.title}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: s.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed ' + s.color + '30' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
                <Play size={24} color={s.color}/>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{t('platformTour.screenshotComingSoon')}</div>
              <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginTop: 4 }}>A visual walkthrough of {s.shortTitle} will appear here</div>
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ padding: '20px 28px 0' }}>
          <p style={{ fontSize: 16, color: 'var(--sap-text-secondary)', lineHeight: 1.8, margin: 0 }}>{s.desc}</p>
        </div>

        {/* Tips */}
        <div style={{ margin: '20px 28px 0' }}>
          <div style={{ background: 'var(--sap-bg-elevated)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('platformTour.keyThings')}</div>
            {s.tips.map(function(tip, ti) {
              return <div key={ti} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: ti < s.tips.length - 1 ? 10 : 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginTop: 8, flexShrink: 0 }}/>
                <div style={{ fontSize: 15, color: 'var(--sap-text-secondary)', lineHeight: 1.7 }}>{tip}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Navigation + action */}
        <div style={{ padding: '20px 28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeIdx > 0 && (
              <button onClick={function() { setActiveIdx(activeIdx - 1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--sap-text-muted)' }}>
                <ChevronLeft size={16}/> Previous
              </button>
            )}
            {activeIdx < SECTIONS.length - 1 && (
              <button onClick={function() { setActiveIdx(activeIdx + 1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--sap-text-muted)' }}>
                Next <ChevronRight size={16}/>
              </button>
            )}
          </div>
          <Link to={s.link} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
            background: s.color, color: '#fff', fontSize: 14, fontWeight: 700,
            boxShadow: '0 3px 0 ' + s.color + '90, 0 5px 12px ' + s.color + '30',
          }}>
            {s.linkLabel} <ArrowRight size={15}/>
          </Link>
        </div>
      </div>

      {/* Voice Guide Widget */}
      <VoiceGuide />

    </AppLayout>
  );
}

