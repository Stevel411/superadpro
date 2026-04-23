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
    videoSrc: '/static/downloads/tour-videos/dashboard-tour.mp4',
    posterSrc: '/static/downloads/tour-videos/dashboard-tour-poster.jpg',
  },
  {
    id: 'howyouearn', num: '2', title: t('platformTour.s2_title'), shortTitle: t('platformTour.s2_short'),
    desc: t('platformTour.s2_desc'),
    tips: [t('platformTour.s2_tip1'), t('platformTour.s2_tip2'), t('platformTour.s2_tip3'), t('platformTour.s2_tip4'), t('platformTour.s2_tip5')],
    link: '/compensation-plan', linkLabel: t('platformTour.s2_link'),
    Icon: DollarSign, color: 'var(--sap-green)', bg: 'var(--sap-green-bg-mid)',
    videoSrc: '/static/downloads/tour-videos/how-you-earn-tour-v2.mp4',
    posterSrc: '/static/downloads/tour-videos/how-you-earn-tour-v2-poster.jpg',
  },
  {
    id: 'watchearn', num: '3', title: t('platformTour.s3_title'), shortTitle: t('platformTour.s3_short'),
    desc: t('platformTour.s3_desc'),
    tips: [t('platformTour.s3_tip1'), t('platformTour.s3_tip2'), t('platformTour.s3_tip3'), t('platformTour.s3_tip4'), t('platformTour.s3_tip5')],
    link: '/watch', linkLabel: t('platformTour.s3_link'),
    Icon: Eye, color: 'var(--sap-amber)', bg: 'var(--sap-amber-bg)',
    videoSrc: '/static/downloads/tour-videos/watch-to-earn-tour.mp4',
    posterSrc: '/static/downloads/tour-videos/watch-to-earn-tour-poster.jpg',
  },
  {
    id: 'basictools', num: '4', title: t('platformTour.s4_title'), shortTitle: t('platformTour.s4_short'),
    desc: t('platformTour.s4_desc'),
    tips: [t('platformTour.s4_tip1'), t('platformTour.s4_tip2'), t('platformTour.s4_tip3'), t('platformTour.s4_tip4')],
    link: '/creative-studio', linkLabel: t('platformTour.s4_link'),
    Icon: Wrench, color: 'var(--sap-accent)', bg: '#e0f2fe',
    videoSrc: '/static/downloads/tour-videos/basic-tools-tour.mp4',
    posterSrc: '/static/downloads/tour-videos/basic-tools-tour-poster.jpg',
  },
  {
    id: 'protools', num: '5', title: t('platformTour.s5_title'), shortTitle: t('platformTour.s5_short'),
    desc: t('platformTour.s5_desc'),
    tips: [t('platformTour.s5_tip1'), t('platformTour.s5_tip2'), t('platformTour.s5_tip3'), t('platformTour.s5_tip4')],
    link: '/upgrade', linkLabel: t('platformTour.s5_link'),
    Icon: Lock, color: 'var(--sap-purple)', bg: 'var(--sap-purple-pale)',
    pro: true,
    videoSrc: '/static/downloads/tour-videos/pro-tools-tour.mp4',
    posterSrc: '/static/downloads/tour-videos/pro-tools-tour-poster.jpg',
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
  var [playingIds, setPlayingIds] = useState({}); // which videos have been clicked to play
  var SECTIONS = getSections(t);
  var s = SECTIONS[activeIdx];

  // Preload: posters with HIGH fetchpriority (visual placeholder appears instantly),
  // videos in the background (faststart makes them start fast anyway)
  useEffect(function() {
    var allLinks = [];
    SECTIONS.forEach(function(sec) {
      // Poster — high priority, appears immediately so no black screen
      if (sec.posterSrc) {
        var pl = document.createElement('link');
        pl.rel = 'preload';
        pl.as = 'image';
        pl.href = sec.posterSrc;
        pl.setAttribute('fetchpriority', 'high');
        document.head.appendChild(pl);
        allLinks.push(pl);
      }
      // Video — background preload, low priority
      if (sec.videoSrc) {
        var vl = document.createElement('link');
        vl.rel = 'preload';
        vl.as = 'video';
        vl.href = sec.videoSrc;
        vl.type = 'video/mp4';
        document.head.appendChild(vl);
        allLinks.push(vl);
      }
    });
    return function() { allLinks.forEach(function(l) { try { document.head.removeChild(l); } catch(e) {} }); };
  }, []);

  // Pause all videos except the active one when switching tabs
  useEffect(function() {
    SECTIONS.forEach(function(sec, i) {
      if (!sec.videoSrc) return;
      var vid = document.getElementById('tour-vid-' + sec.id);
      if (vid && i !== activeIdx) {
        try { vid.pause(); } catch(e) {}
      }
    });
  }, [activeIdx]);

  return (
    <AppLayout title={t("platformTour.title")} subtitle={t("platformTour.subtitle")}>

      {/* Active section content */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>

        {/* Section header — tab navigation only. The active tab's
            coloured highlight (border + tinted background + filled icon)
            serves as the section title, so the old icon/title block on
            the left was redundant and has been removed. Arrows sit
            inline on either side of the tab group as a single centred
            unit — this keeps them visually tied to the tabs they
            control rather than floating at card edges. */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {/* Left arrow — inline, directly before the tab group */}
          <button onClick={function() { var el = document.getElementById('tour-tabs'); if (el) el.scrollBy({ left: -240, behavior: 'smooth' }); }}
            style={{ width: 36, height: 36, flexShrink: 0, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 9,
              cursor: 'pointer', fontSize: 22, fontWeight: 800, color: '#475569',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            aria-label={t('platformTour.scrollLeft', { defaultValue: 'Previous' })}>‹</button>

          {/* Tab strip — horizontally scrollable if it overflows. Tabs
              centred when they fit, scroll-anchored to start when they
              don't. Larger padding/fonts than the previous inline
              version since tabs now own the entire row. */}
          <div id="tour-tabs" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '2px 0', justifyContent: 'center', maxWidth: '100%' }}>
            <style>{`#tour-tabs::-webkit-scrollbar{display:none}`}</style>
            {SECTIONS.map(function(sec, i) {
              var isActive = i === activeIdx;
              return <button key={sec.id} onClick={function() { setActiveIdx(i); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '11px 18px', borderRadius: 11,
                  border: isActive ? '1.5px solid ' + sec.color : '1px solid #e2e8f0',
                  background: isActive ? sec.bg : '#fff',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: isActive ? 700 : 600,
                  color: isActive ? sec.color : 'var(--sap-text-muted)', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all .15s',
                  boxShadow: isActive ? '0 2px 8px ' + sec.color + '18' : 'none',
                }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: isActive ? sec.color : sec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <sec.Icon size={14} color={isActive ? '#fff' : sec.color}/>
                </div>
                {sec.shortTitle}
                {sec.pro && <span style={{ marginLeft: 2, padding: '2px 7px', borderRadius: 5, background: 'rgba(139,92,246,.12)', fontSize: 13, fontWeight: 700, color: 'var(--sap-violet)', letterSpacing: 0.3 }}>{t('platformTour.proLabel')}</span>}
              </button>;
            })}
          </div>

          {/* Right arrow — inline, directly after the tab group */}
          <button onClick={function() { var el = document.getElementById('tour-tabs'); if (el) el.scrollBy({ left: 240, behavior: 'smooth' }); }}
            style={{ width: 36, height: 36, flexShrink: 0, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 9,
              cursor: 'pointer', fontSize: 22, fontWeight: 800, color: '#475569',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            aria-label={t('platformTour.scrollRight', { defaultValue: 'Next' })}>›</button>
        </div>

        {/* Video container — shows poster image until user clicks play */}
        <div style={{ margin: '24px 28px 0', borderRadius: 14, overflow: 'hidden', aspectRatio: '16/9', position: 'relative', background: '#000' }}>
          {SECTIONS.map(function(sec, i) {
            if (!sec.videoSrc) return null;
            var isActive = i === activeIdx;
            var hasStartedPlaying = playingIds[sec.id];
            
            // Before first click: show poster image with play button overlay (instant, no buffering)
            // After first click: render actual <video> which will then play
            if (!hasStartedPlaying) {
              return <div key={sec.id}
                style={{
                  width: '100%', height: '100%',
                  display: isActive ? 'flex' : 'none',
                  position: 'absolute', top: 0, left: 0,
                  backgroundImage: sec.posterSrc ? 'url(' + sec.posterSrc + ')' : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 14,
                }}
                onClick={function() {
                  setPlayingIds(function(prev) {
                    var next = Object.assign({}, prev);
                    next[sec.id] = true;
                    return next;
                  });
                  // Autoplay once the video element mounts
                  setTimeout(function() {
                    var vid = document.getElementById('tour-vid-' + sec.id);
                    if (vid) { try { vid.play(); } catch(e) {} }
                  }, 50);
                }}
              >
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.95)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={function(e) { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {/* Play triangle */}
                  <div style={{
                    width: 0, height: 0,
                    borderTop: '16px solid transparent',
                    borderBottom: '16px solid transparent',
                    borderLeft: '26px solid ' + s.color,
                    marginLeft: 6,
                  }}/>
                </div>
              </div>;
            }
            
            return <video
              key={sec.id}
              id={'tour-vid-' + sec.id}
              controls
              preload="auto"
              playsInline
              poster={sec.posterSrc}
              style={{
                width: '100%', height: '100%', borderRadius: 14,
                display: isActive ? 'block' : 'none',
                position: 'absolute', top: 0, left: 0,
              }}
            >
              <source src={sec.videoSrc} type="video/mp4"/>
            </video>;
          })}

          {/* Fallback for sections with videoId (YouTube) or no video */}
          {!s.videoSrc && s.videoId && (
            <iframe
              src={'https://www.youtube-nocookie.com/embed/' + s.videoId + '?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white'}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 14 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={s.title}
            />
          )}
          {!s.videoSrc && !s.videoId && (
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

