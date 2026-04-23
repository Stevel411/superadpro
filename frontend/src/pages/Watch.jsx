import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';

var CSS = `
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.6)}}
@keyframes wbPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.2);opacity:1}}
@keyframes wbSlide{0%{transform:translateX(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(100%);opacity:0}}
@keyframes wbDrift{0%,100%{transform:translate(0,0);opacity:.4}25%{transform:translate(-8px,5px);opacity:.9}50%{transform:translate(5px,-6px);opacity:.6}75%{transform:translate(-4px,-3px);opacity:.8}}
@keyframes cPulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.2);opacity:1}}
@keyframes cSlide{0%{transform:translateX(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(100%);opacity:0}}
@keyframes cDrift{0%,100%{transform:translate(0,0);opacity:.4}25%{transform:translate(-8px,5px);opacity:.9}50%{transform:translate(5px,-6px);opacity:.6}75%{transform:translate(-4px,-3px);opacity:.8}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes dotPop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}

/* Mobile-first responsive styles */
.watch-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 1400px;
  margin: 0 auto;
}

/* On desktop — two column */
@media(min-width:768px){
  .watch-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 20px;
    align-items: start;
  }
  .watch-player-col { display: flex; flex-direction: column; gap: 10px; }
  .watch-panel-col { display: flex; flex-direction: column; gap: 12px; }
  .watch-mobile-timer { display: none !important; }
  .watch-mobile-progress { display: none !important; }
  .watch-mobile-stats { display: none !important; }
  .watch-mobile-warning { display: none !important; }
  .watch-desktop-panel { display: flex !important; }
  .watch-hint { display: block; }
}

/* On mobile — single column, full bleed */
@media(max-width:767px){
  .watch-layout {
    width: 100%;
  }
  .watch-player-col { display: flex; flex-direction: column; }
  .watch-panel-col { display: none; }
  .watch-mobile-timer { display: flex !important; }
  .watch-mobile-progress { display: block !important; }
  .watch-mobile-stats { display: grid !important; }
  .watch-desktop-panel { display: none !important; }
  .watch-hint { display: none !important; }
  .watch-video-card { border-radius: 0 !important; border: none !important; }
  .watch-player-card { border-radius: 0 !important; border: none !important; box-shadow: none !important; }
}

.mark-btn {
  font-size: 14px; font-weight: 800; color: #fff; border: none; border-radius: 10px;
  padding: 13px 24px; white-space: nowrap; font-family: inherit; cursor: pointer;
  transition: all .2s;
}
.mark-btn.ready {
  background: linear-gradient(180deg,#38bdf8,#0ea5e9);
  box-shadow: 0 4px 0 #0284c7, 0 6px 16px rgba(14,165,233,.3);
}
.mark-btn.ready:active { transform: translateY(2px); box-shadow: 0 2px 0 #0284c7; }
.mark-btn.disabled { background: #e2e8f0; color: #475569; cursor: default; box-shadow: none; }

.dot-item {
  flex: 1; aspect-ratio: 1; max-width: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  transition: all .3s;
}
.dot-done { background: linear-gradient(135deg,#0ea5e9,#38bdf8); color: #fff; box-shadow: 0 2px 8px rgba(14,165,233,.3); }
.dot-current { background: rgba(56,189,248,.1); border: 2px solid #38bdf8; color: #0ea5e9; }
.dot-empty { background: #f1f5f9; border: 2px solid #e2e8f0; color: #7a8899; }

.stat-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 12px; text-align: center; }

.ring-pulse { animation: ring-pulse 2s ease-in-out infinite; }
@keyframes ring-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
`;

export default function Watch() {
  var { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [timerDone, setTimerDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [muted, setMuted] = useState(true);
  const timerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    apiGet('/api/watch').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data?.videos?.length) return;
    if (currentIdx >= 0) return;
    const first = data.videos.findIndex(v => !v.is_watched);
    setCurrentIdx(first >= 0 ? first : data.videos.length - 1);
  }, [data, currentIdx]);

  useEffect(() => {
    if (currentIdx < 0 || !data?.videos?.length) return;
    const cur = data.videos[currentIdx];
    if (cur?.is_watched) { setTimerDone(true); setSecondsLeft(0); }
    else { setSecondsLeft(30); setTimerDone(false); setSubmitted(false); setMuted(true); }
  }, [currentIdx, data]);

  useEffect(() => {
    if (currentIdx < 0 || !data?.videos?.length) return;
    const cur = data.videos[currentIdx];
    if (cur?.is_watched || paused || timerDone) return;
    if (secondsLeft > 0) { timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000); }
    else { setTimerDone(true); }
    return () => clearTimeout(timerRef.current);
  }, [secondsLeft, paused, timerDone, data, currentIdx]);

  useEffect(() => {
    const onHide = () => { if (document.hidden) setPaused(true); };
    const onBlur = () => setPaused(true);
    const onFocus = () => setPaused(false);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const markAsWatched = async () => {
    if (submitted || currentIdx < 0) return;
    const video = data.videos[currentIdx];
    if (!video) return;
    setSubmitted(true);
    try {
      await apiPost('/api/watch/complete', { video_id: video.id });
      const newData = await apiGet('/api/watch');
      const nextIdx = newData.videos.findIndex((v, i) => !v.is_watched);
      if (nextIdx >= 0 && nextIdx !== currentIdx) {
        setCurrentIdx(-1); setData(newData);
        setTimeout(() => setCurrentIdx(nextIdx), 50);
      } else { setData(newData); setSubmitted(false); }
    } catch (e) { setSubmitted(false); alert(e.message); }
  };

  const toggleMute = () => {
    const newMuted = !muted; setMuted(newMuted);
    const frame = iframeRef.current;
    if (!frame || !current?.embed_url) return;
    const url = current.embed_url;
    // Use postMessage to control the player without reloading the iframe
    if (url.includes('vimeo')) {
      // Vimeo Player API via postMessage
      frame.contentWindow.postMessage(JSON.stringify({
        method: 'setVolume', value: newMuted ? 0 : 0.8
      }), '*');
    } else if (url.includes('youtube') || url.includes('youtu.be')) {
      // YouTube iframe API via postMessage
      if (newMuted) {
        frame.contentWindow.postMessage(JSON.stringify({
          event: 'command', func: 'mute', args: []
        }), '*');
      } else {
        frame.contentWindow.postMessage(JSON.stringify({
          event: 'command', func: 'unMute', args: []
        }), '*');
      }
    }
  };

  const buildEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('vimeo')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}autoplay=1&muted=1&controls=0&title=0&byline=0&portrait=0&api=1`;
    }
    const sep = url.includes('?') ? '&' : '?';
    const origin = encodeURIComponent(window.location.origin);
    return `${url}${sep}autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;
  };

  if (loading) return (
    <AppLayout title={t('watch.title')}>
      <div style={{display:'flex',justifyContent:'center',padding:80}}>
        <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppLayout>
  );

  if (!data) return (
    <AppLayout title={t('watch.title')}>
      <div style={{textAlign:'center',padding:80,color:'var(--sap-text-muted)'}}>{t('watch.unableToLoad')}</div>
    </AppLayout>
  );

  const d = data;
  const videos = d.videos || [];
  const current = currentIdx >= 0 ? videos[currentIdx] : null;
  const watched = d.watched_today || 0;
  const limit = d.daily_required || d.daily_limit || 1;
  const timerR = 23;
  const timerC = 2 * Math.PI * timerR;
  const timerOffset = timerC * (secondsLeft / 30);
  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - Math.min(1, watched / limit));
  const isCurrentWatched = current?.is_watched;
  const allWatched = videos.length > 0 && videos.every(v => v.is_watched);
  const quotaComplete = d.quota_reached || watched >= limit;
  const btnReady = timerDone && !isCurrentWatched && !submitted;
  const statusText = isCurrentWatched ? t('watch.statusWatched') : timerDone ? t('watch.statusReady') : paused ? t('watch.statusPaused') : t('watch.statusWatching');
  const statusColor = isCurrentWatched || timerDone ? 'var(--sap-green)' : paused ? 'var(--sap-amber-dark)' : 'var(--sap-accent)';

  // Shared sub-components
  const TimerRing = ({ size = 56 }) => {
    var r = size === 56 ? timerR : 28;
    var c = 2 * Math.PI * r;
    var off = c * (secondsLeft / 30);
    return (
      <div style={{width:size,height:size,position:'relative',flexShrink:0}}>
        <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
          <defs><linearGradient id="tGrad2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--sap-accent)"/><stop offset="100%" stopColor="var(--sap-accent-light)"/></linearGradient></defs>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eef1f8" strokeWidth={size===56?5:4}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#tGrad2)" strokeWidth={size===56?5:4}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={isCurrentWatched ? 0 : off}
            style={{transition:'stroke-dashoffset 1s linear'}}/>
        </svg>
        <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:size===56?18:14,fontWeight:900,color:'var(--sap-text-primary)'}}>
          {isCurrentWatched ? '✓' : secondsLeft}
        </span>
      </div>
    );
  };

  const ProgressDots = () => (
    <div style={{display:'flex',gap:6}}>
      {Array.from({length:limit}).map((_,i) => (
        <div key={i} className={'dot-item ' + (i < watched ? 'dot-done' : i === watched ? 'dot-current' : 'dot-empty')}>
          {i < watched ? '✓' : i + 1}
        </div>
      ))}
    </div>
  );

  const StatsGrid = ({ dark = false }) => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      {[
        {v:d.streak_days||0, l:t('watch.dayStreakLabel'), c:'var(--sap-amber)'},
        {v:d.total_watched||0, l:t('watch.totalWatched'), c:'var(--sap-accent)'},
        {v:t('watch.tier', {n:d.tier||1}), l:t('watch.yourLevel'), c:'var(--sap-purple-light)'},
        {v:d.commissions_paused?t('watch.paused'):t('watch.active'), l:t('watch.commissions'), c:d.commissions_paused?'var(--sap-red-bright)':'var(--sap-green)'},
      ].map((s,i) => (
        <div key={i} style={{background:dark?'rgba(255,255,255,.04)':'var(--sap-bg-page)',border:`1px solid ${dark?'rgba(255,255,255,.08)':'var(--sap-border)'}`,borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:dark?'rgba(200,220,255,.3)':'var(--sap-text-muted)',marginTop:4}}>{s.l}</div>
        </div>
      ))}
    </div>
  );

  // ── ALL AVAILABLE VIDEOS WATCHED BUT QUOTA NOT MET ──
  if (allWatched && !quotaComplete) {
    return (
      <AppLayout title={t('watch.title')} subtitle={t('watch.videosWatched', {watched, limit})}>
        <style>{CSS}</style>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'56px 32px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:48,marginBottom:16,opacity:.5}}>⏳</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:8}}>{t('watch.noMoreVideos')}</div>
            <div style={{fontSize:16,color:'var(--sap-text-muted)',lineHeight:1.7,marginBottom:12}}>{t('watch.watchedAllAvailable', {watched, limit})}</div>
            <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:24}}>
              {Array.from({length:limit}).map((_,i)=>(
                <div key={i} style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,
                  background: i < watched ? 'linear-gradient(135deg,#06b6d4,#0891b2)' : 'var(--sap-border)',
                  color: i < watched ? '#fff' : 'var(--sap-text-muted)'}}>
                  {i < watched ? '✓' : i+1}
                </div>
              ))}
            </div>
            <a href="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:10,padding:'12px 28px',textDecoration:'none'}}>{t('watch.backToDashboard')}</a>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── QUOTA COMPLETE ──
  if (quotaComplete) {
    const done = limit;  // On completion, show the full quota as done
    const actualWatched = Math.max(watched, videos.filter(v => v.is_watched).length);
    return (
      <AppLayout title={t('watch.title')} subtitle={t('watch.quotaComplete')}
        bgStyle={{padding:0,margin:0,display:'flex',flexDirection:'column',minHeight:'calc(100vh - 72px)'}}>
        <style>{CSS}</style>
        <style>{`
@keyframes confFall1{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(800px) rotate(720deg);opacity:0}}
@keyframes confFall2{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(820px) rotate(-540deg);opacity:0}}
@keyframes confFall3{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(780px) rotate(360deg);opacity:0}}
@keyframes glowPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.4}50%{transform:translate(-50%,-50%) scale(1.3);opacity:.8}}
@keyframes trophyBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes badgeSlide{0%{transform:translateY(10px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes fadeUp{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}
        `}</style>
        <div style={{flex:1,background:'linear-gradient(145deg,#ecfeff,#e0f7fa,#ecfdf5)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',padding:'40px 24px'}}>

            {/* Confetti particles */}
            <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
              {[
                {w:8,h:8,bg:'var(--sap-amber)',t:'12%',l:'8%',a:'confFall1',d:'3s',dl:'0s',r:'45deg'},
                {w:6,h:10,bg:'var(--sap-accent)',t:'6%',l:'18%',a:'confFall2',d:'2.6s',dl:'0.3s',r:'0deg'},
                {w:9,h:6,bg:'var(--sap-green-bright)',t:'4%',l:'32%',a:'confFall3',d:'3.2s',dl:'0.7s',r:'30deg'},
                {w:6,h:8,bg:'var(--sap-pink)',t:'9%',l:'46%',a:'confFall1',d:'2.8s',dl:'0.5s',r:'60deg'},
                {w:8,h:5,bg:'var(--sap-purple)',t:'7%',l:'58%',a:'confFall2',d:'3.4s',dl:'1s',r:'15deg'},
                {w:7,h:7,bg:'#f97316',t:'11%',l:'70%',a:'confFall3',d:'2.5s',dl:'0.2s',r:'0deg'},
                {w:5,h:9,bg:'#06b6d4',t:'14%',l:'82%',a:'confFall1',d:'3.1s',dl:'1.2s',r:'75deg'},
                {w:8,h:5,bg:'#eab308',t:'3%',l:'92%',a:'confFall2',d:'2.9s',dl:'0.8s',r:'40deg'},
                {w:6,h:8,bg:'var(--sap-red-bright)',t:'8%',l:'25%',a:'confFall3',d:'3.3s',dl:'0.4s',r:'55deg'},
                {w:7,h:6,bg:'#14b8a6',t:'16%',l:'55%',a:'confFall1',d:'3s',dl:'0.6s',r:'20deg'},
                {w:5,h:7,bg:'#a855f7',t:'5%',l:'42%',a:'confFall2',d:'2.7s',dl:'1.1s',r:'70deg'},
                {w:8,h:6,bg:'#fb923c',t:'13%',l:'75%',a:'confFall3',d:'3.5s',dl:'0.9s',r:'35deg'},
                {w:6,h:9,bg:'var(--sap-accent-light)',t:'10%',l:'5%',a:'confFall1',d:'2.4s',dl:'0.1s',r:'50deg'},
                {w:7,h:5,bg:'#34d399',t:'2%',l:'65%',a:'confFall2',d:'3.6s',dl:'1.4s',r:'25deg'},
              ].map((c,i) => (
                <div key={i} style={{position:'absolute',width:c.w,height:c.h,background:c.bg,borderRadius:c.w===c.h?'50%':'2px',top:c.t,left:c.l,animation:`${c.a} ${c.d} linear infinite ${c.dl}`,transform:`rotate(${c.r})`}}/>
              ))}
            </div>

            {/* Glow ring */}
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,.15),transparent 70%)',animation:'glowPulse 2s ease-in-out infinite',pointerEvents:'none'}}/>

            <div style={{position:'relative',zIndex:1}}>
              {/* Trophy circle */}
              <div style={{width:100,height:100,borderRadius:'50%',background:'linear-gradient(145deg,#06b6d4,#0891b2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 30px rgba(6,182,212,.3), 0 0 60px rgba(6,182,212,.15)',animation:'trophyBounce 1.5s ease-in-out infinite'}}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>

              {/* Badge */}
              <div style={{display:'inline-block',fontSize:13,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#fff',background:'linear-gradient(135deg,#06b6d4,#0891b2)',padding:'6px 20px',borderRadius:20,marginBottom:16,boxShadow:'0 2px 10px rgba(6,182,212,.3)',animation:'badgeSlide .6s ease-out'}}>{t('watch.fullyQualified')}</div>

              {/* Title */}
              <div style={{fontFamily:'Sora,sans-serif',fontSize:30,fontWeight:900,color:'#0c4a6e',marginBottom:8,animation:'fadeUp .8s ease-out'}}>{t('watch.todaysQuotaComplete')}</div>
              <div style={{fontSize:16,color:'#0e7490',lineHeight:1.7,maxWidth:420,margin:'0 auto 28px',opacity:.7,animation:'fadeUp 1s ease-out'}}>
                {t('watch.watchedAllRequired', {count: done})}
              </div>

              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:24,animation:'fadeUp 1.2s ease-out'}}>
                {[
                  {v:done,l:t('watch.watched'),c:'#06b6d4'},
                  {v:`${Math.floor(done*30/60)}m ${done*30%60>0?(done*30%60)+'s':''}`.trim(),l:t('watch.watchTime'),c:'var(--sap-accent-light)'},
                  {v:d.streak_days||0,l:t('watch.streak'),c:'var(--sap-amber)'},
                  {v:t('watch.tier', {n:d.tier||1}),l:t('watch.level'),c:'var(--sap-purple)'},
                ].map((s,i)=>(
                  <div key={i} style={{background:'#fff',border:'1px solid rgba(6,182,212,.12)',borderRadius:12,padding:'14px 8px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,color:'#67e8f9',marginTop:3}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Completed circles — one per required video */}
              <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:28,animation:'fadeUp 1.4s ease-out'}}>
                {Array.from({length:limit}).map((_,i)=>(
                  <div key={i} style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#06b6d4,#0891b2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',boxShadow:'0 2px 8px rgba(6,182,212,.3)'}}>✓</div>
                ))}
              </div>

              {/* Streak message */}
              {(d.streak_days||0) > 1 && (
                <div style={{background:'#fff',borderRadius:12,padding:'14px 20px',border:'1px solid rgba(6,182,212,.1)',marginBottom:24,display:'inline-flex',alignItems:'center',gap:10,boxShadow:'0 2px 8px rgba(0,0,0,.03)',animation:'fadeUp 1.6s ease-out'}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#fef3c7,#fde68a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'#b45309',flexShrink:0}}>{d.streak_days}</div>
                  <div style={{textAlign:'left'}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#0c4a6e'}}>{d.streak_days} {t('watch.dayStreak')}</div>
                    <div style={{fontSize:14,color:'#22d3ee',marginTop:1}}>{t('watch.topEarners')}</div>
                  </div>
                </div>
              )}

              <div style={{animation:'fadeUp 1.8s ease-out'}}>
                <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:15,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#06b6d4,#0891b2)',borderRadius:12,padding:'14px 36px',textDecoration:'none',boxShadow:'0 4px 16px rgba(6,182,212,.3)'}}>{t('watch.backToDashboard')}</Link>
              </div>
            </div>
        </div>
      </AppLayout>
    );
  }

  // ── NO VIDEOS ──
  if (videos.length === 0 && !quotaComplete) {
    return (
      <AppLayout title={t('watch.title')} subtitle={t('watch.noActiveCampaigns')}>
        <style>{CSS}</style>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'56px 32px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:48,marginBottom:16,opacity:.5}}>📭</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:8}}>{t('watch.noActiveCampaigns')}</div>
            <div style={{fontSize:16,color:'var(--sap-text-muted)',lineHeight:1.7,marginBottom:24}}>{t('watch.checkBackSoon')}</div>
            <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:10,padding:'12px 28px',textDecoration:'none'}}>{t('watch.dashboard')}</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── QUOTA COMPLETE — all videos watched ──
  if (videos.length === 0 && quotaComplete) {
    const doneRingR = 38;
    const doneRingC = 2 * Math.PI * doneRingR;
    return (
      <AppLayout title={t('watch.title')} subtitle={t('watch.quotaComplete') + '!'}
        topbarActions={<>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,padding:'6px 14px',borderRadius:8,background:'rgba(22,163,74,.1)',border:'1px solid rgba(22,163,74,.2)',color:'var(--sap-green-bright)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'var(--sap-green-bright)'}}/>{t('watch.qualified')}
          </div>
        </>}>
        <style>{CSS}</style>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,padding:'48px 32px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{width:120,height:120,margin:'0 auto 24px',position:'relative'}}>
              <svg width="120" height="120" style={{transform:'rotate(-90deg)'}}>
                <defs><linearGradient id="doneGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--sap-green-bright)"/><stop offset="100%" stopColor="var(--sap-green)"/></linearGradient></defs>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--sap-green-bg-mid)" strokeWidth="8"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#doneGrad)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={2*Math.PI*50} strokeDashoffset={0}
                  style={{transition:'stroke-dashoffset .6s'}}/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>✓</div>
            </div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'var(--sap-green)',marginBottom:8}}>{t('watch.todaysWatchComplete')}</div>
            <div style={{fontSize:15,color:'var(--sap-text-muted)',lineHeight:1.7,marginBottom:8}}>
              {t('watch.watchedOfToday', {watched, limit})}
            </div>
            <div style={{fontSize:14,color:'var(--sap-text-muted)',marginBottom:24}}>{t('watch.resetsAtMidnight')}</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,maxWidth:320,margin:'0 auto 24px'}}>
              {[
                {v:d.streak_days||0, l:t('watch.dayStreakLabel'), c:'var(--sap-amber)'},
                {v:d.total_watched||0, l:t('watch.totalWatched'), c:'var(--sap-accent)'},
                {v:t('watch.tier', {n:d.tier||1}), l:t('watch.yourLevel'), c:'var(--sap-purple-light)'},
                {v:t('watch.active'), l:t('watch.commissions'), c:'var(--sap-green)'},
              ].map((s,i) => (
                <div key={i} style={{background:'var(--sap-bg-elevated)',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 12px',textAlign:'center'}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,color:'var(--sap-text-muted)',marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>

            <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#16a34a,#22c55e)',borderRadius:10,padding:'12px 28px',textDecoration:'none',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>{t('watch.backToDashboard')}</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── MAIN WATCH SESSION ──
  return (
    <AppLayout title={t('watch.title')} subtitle={t('watch.videosWatched', {watched, limit})}
      bgStyle={window.innerWidth < 768 ? {padding: 0, paddingBottom: 80} : {}}
      topbarActions={<>
        <div style={{background:'rgba(14,165,233,.12)',border:'1px solid rgba(14,165,233,.2)',borderRadius:8,padding:'6px 14px',textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:'var(--sap-accent-light)'}}>{t('watch.tier', {n:d.tier})}</div>
          <div style={{fontSize:14,color:'rgba(186,230,253,.55)',marginTop:1}}>{t('watch.videosPerDay', {count:limit})}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,padding:'6px 14px',borderRadius:8,
          ...(watched>=limit?{background:'rgba(22,163,74,.1)',border:'1px solid rgba(22,163,74,.2)',color:'var(--sap-green-bright)'}:{background:'rgba(14,165,233,.1)',border:'1px solid rgba(14,165,233,.2)',color:'var(--sap-accent-light)'})}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:watched>=limit?'var(--sap-green-bright)':'var(--sap-accent-light)',animation:'pulse 1.5s infinite'}}/>
          {watched>=limit?t('watch.qualified'):t('watch.watching')}
        </div>
      </>}>

      <style>{CSS}</style>

      <div className="watch-layout">

        {/* ── LEFT / MAIN COLUMN ── */}
        <div className="watch-player-col">

          {/* Commission warning — mobile only */}
          {d.consecutive_missed > 0 && (
            <div className="watch-mobile-warning" style={{display:'none',background:'#fffbeb',borderLeft:'4px solid #f59e0b',padding:'12px 20px',alignItems:'center',gap:10,fontSize:14,fontWeight:600,color:'#92400e'}}>
              ⚠️ {t('watch.missedDays', {count: d.consecutive_missed})}
            </div>
          )}

          {/* Video card */}
          <div className="watch-player-card" style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04)'}}>

            {/* Title bar — desktop only */}
            <div className="watch-hint" style={{padding:'10px 16px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{minWidth:0,display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current?.title||t('watch.loading')}</div>
                <div style={{fontSize:14,color:'var(--sap-text-muted)',whiteSpace:'nowrap',flexShrink:0}}>{current?.platform||'video'} · {current?.category||t('watch.general')}</div>
              </div>
              <div style={{fontSize:8,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--sap-accent)',background:'rgba(14,165,233,.06)',border:'1px solid rgba(14,165,233,.12)',padding:'4px 10px',borderRadius:6,whiteSpace:'nowrap'}}>▶ {t('watch.watching')}</div>
            </div>

            {/* Video */}
            <div style={{position:'relative',width:'100%',aspectRatio:'16/9',background:'#000',overflow:'hidden'}}>
              {current?.embed_url ? (
                <iframe key={currentIdx} ref={iframeRef} src={buildEmbedUrl(current.embed_url)}
                  style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen/>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',color:'var(--sap-text-muted)'}}>{t('watch.unableToLoad')}</div>
              )}
              {/* Unmute */}
              {muted && current?.embed_url && !paused && (
                <div onClick={toggleMute} style={{position:'absolute',top:12,right:12,zIndex:20,background:'rgba(5,13,26,.75)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'7px 12px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',backdropFilter:'blur(6px)'}}>
                  <span style={{fontSize:13}}>🔇</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{t('common.tapToUnmute')}</span>
                </div>
              )}
              {/* Pause overlay */}
              {paused && !isCurrentWatched && (
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)',zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,backdropFilter:'blur(8px)'}}>
                  <div style={{fontSize:40}}>⏸</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#fff'}}>{t('watch.pausedOverlay')}</div>
                  <div style={{fontSize:14,color:'rgba(255,255,255,.7)'}}>{t('watch.returnToTab')}</div>
                </div>
              )}
            </div>

            {/* CTA — "Visit Website" — only shown after 30s watch complete and if advertiser set one */}
            {timerDone && current?.cta_url && (
              <div style={{padding:'10px 16px',background:'linear-gradient(90deg, rgba(14,165,233,.06), rgba(124,58,237,.06))',borderTop:'1px solid #e8ecf2',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div style={{fontSize:13,color:'var(--sap-text-muted)',fontWeight:600}}>
                  {t('watch.ctaPrompt', { defaultValue: 'Interested? Visit the advertiser\u2019s site.' })}
                </div>
                <a href={'/campaign-cta/' + current.id} target="_blank" rel="noopener noreferrer nofollow"
                  style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',background:'var(--sap-accent)',color:'#fff',borderRadius:8,fontSize:14,fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>
                  {t('watch.visitWebsite', { defaultValue: 'Visit Website' })} →
                </a>
              </div>
            )}

            {/* Desktop footer */}
            <div className="watch-hint" style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,background:'var(--sap-bg-input)',borderTop:'1px solid #f1f3f7'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <TimerRing size={56}/>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:statusColor}}>{statusText}</div>
                  <div style={{fontSize:14,color:'#b8c4d0',marginTop:2}}>{t('watch.mustWatch30s')}</div>
                </div>
              </div>
              <button onClick={markAsWatched} disabled={!btnReady}
                className={'mark-btn ' + (btnReady ? 'ready' : 'disabled')}>
                {submitted ? t('watch.submitting') : t('watch.markAsWatched')}
              </button>
            </div>
          </div>

          {/* ── MOBILE: Timer + Mark button ── */}
          <div className="watch-mobile-timer" style={{display:'none',alignItems:'center',gap:14,padding:'14px 20px',background:'#fff',borderTop:'1px solid #e8ecf2',borderBottom:'1px solid #e8ecf2'}}>
            <TimerRing size={56}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:statusColor,marginBottom:2}}>{statusText}</div>
              <div style={{fontSize:14,color:'var(--sap-text-muted)',fontWeight:500}}>{t('watch.ofVideos', {watched, limit})}</div>
            </div>
            <button onClick={markAsWatched} disabled={!btnReady}
              className={'mark-btn ' + (btnReady ? 'ready' : 'disabled')}
              style={{padding:'13px 20px',fontSize:13}}>
              {submitted ? '...' : btnReady ? t('watch.mark') : `${secondsLeft}s`}
            </button>
          </div>

          {/* ── MOBILE: Progress dots (only when limit > 1) ── */}
          {limit > 1 && (
            <div className="watch-mobile-progress" style={{display:'none',padding:'16px 20px',background:'#fff',borderBottom:'1px solid #e8ecf2'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'var(--sap-text-muted)'}}>{t('watch.todaysProgress')}</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:900,color:'var(--sap-text-primary)'}}>
                  {watched} <span style={{fontSize:14,color:'var(--sap-text-muted)',fontWeight:500}}>/ {limit}</span>
                </div>
              </div>
              <ProgressDots/>
            </div>
          )}

          {/* ── MOBILE: Status pill for single-video days ── */}
          {limit === 1 && (
            <div className="watch-mobile-progress" style={{display:'none',padding:'16px 20px',background:'#fff',borderBottom:'1px solid #e8ecf2'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'var(--sap-text-muted)'}}>{t('watch.todaysProgress')}</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:900,color:'var(--sap-text-primary)'}}>
                  {watched} <span style={{fontSize:14,color:'var(--sap-text-muted)',fontWeight:500}}>/ {limit}</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,
                           background: watched >= 1 ? 'rgba(22,163,74,.08)' : 'rgba(14,165,233,.06)',
                           border: `1px solid ${watched >= 1 ? 'rgba(22,163,74,.2)' : 'rgba(14,165,233,.18)'}`}}>
                <div style={{fontSize:16}}>{watched >= 1 ? '✅' : '▶️'}</div>
                <div style={{fontSize:13,fontWeight:700,color: watched >= 1 ? 'var(--sap-green)' : 'var(--sap-accent)'}}>
                  {watched >= 1 ? t('watch.quotaCompleteLabel') : t('watch.watchOneToQualify')}
                </div>
              </div>
            </div>
          )}

          {/* ── MOBILE: Stats grid ── */}
          <div className="watch-mobile-stats" style={{display:'none',gridTemplateColumns:'1fr 1fr',gap:10,padding:'16px 20px',background:'#f0f3f9'}}>
            {[
              {v:d.streak_days||0, l:t('watch.dayStreakLabel'), c:'var(--sap-amber)'},
              {v:d.total_watched||0, l:t('watch.totalWatched'), c:'var(--sap-accent)'},
              {v:t('watch.tier', {n:d.tier||1}), l:t('watch.yourLevel'), c:'var(--sap-purple-light)'},
              {v:d.commissions_paused?t('watch.paused'):t('watch.active'), l:t('watch.commissions'), c:d.commissions_paused?'var(--sap-red-bright)':'var(--sap-green)'},
            ].map((s,i) => (
              <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 12px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,color:'var(--sap-text-muted)',marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Desktop hint text */}
          <div className="watch-hint" style={{fontSize:13,color:'#b8c4d0',textAlign:'center',lineHeight:1.6}}>
            {t('watch.watchInstructions', {limit})}
          </div>
        </div>

        {/* ── RIGHT: Desktop progress panel ── */}
        <div className="watch-panel-col">

          {/* Commission warning */}
          {d.consecutive_missed > 0 && (
            <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'flex-start',gap:10}}>
              <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#92400e',marginBottom:2}}>{t('watch.commissionsAtRisk')}</div>
                <div style={{fontSize:13,color:'#a16207',lineHeight:1.5}}>{t('watch.missedDays', {count: d.consecutive_missed})}</div>
              </div>
            </div>
          )}

          {/* Today's progress */}
          <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:12,padding:22,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>{t('watch.todaysProgress')}</div>
            <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:16}}>
              <div style={{width:90,height:90,position:'relative',flexShrink:0}}>
                <svg width="90" height="90" style={{transform:'rotate(-90deg)'}}>
                  <defs><linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--sap-accent)"/><stop offset="100%" stopColor="var(--sap-green-bright)"/></linearGradient></defs>
                  {/* Track circle — always visible */}
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="#eef1f8" strokeWidth="7"/>
                  {/* Progress stroke — starts at a visible dot even at 0% */}
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="url(#pGrad)" strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(3, ringC * Math.min(1, watched / limit))} ${ringC}`}
                    className={watched === 0 ? 'ring-pulse' : ''}
                    style={{transition:'stroke-dasharray .6s'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:'var(--sap-text-primary)'}}>{watched}</div>
              </div>
              <div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:800,color:'var(--sap-text-primary)',lineHeight:1}}>
                  {watched}<span style={{fontSize:16,color:'var(--sap-text-muted)',fontWeight:500}}> / {limit}</span>
                </div>
                <div style={{fontSize:13,color:'#7b91a8',marginTop:3}}>{t('watch.videosWatchedLabel')}</div>
                <div style={{fontSize:13,fontWeight:600,color:watched>=limit?'var(--sap-green)':'#3d5068',marginTop:4}}>
                  {watched>=limit ? t('watch.quotaCompleteLabel') : t('watch.remaining', {count: limit-watched})}
                </div>
              </div>
            </div>
            {limit > 1 && <ProgressDots/>}
            {limit === 1 && (
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,
                           background: watched >= 1 ? 'rgba(22,163,74,.08)' : 'rgba(14,165,233,.06)',
                           border: `1px solid ${watched >= 1 ? 'rgba(22,163,74,.2)' : 'rgba(14,165,233,.18)'}`}}>
                <div style={{fontSize:16}}>{watched >= 1 ? '✅' : '▶️'}</div>
                <div style={{fontSize:13,fontWeight:700,color: watched >= 1 ? 'var(--sap-green)' : 'var(--sap-accent)'}}>
                  {watched >= 1 ? t('watch.quotaCompleteLabel') : t('watch.watchOneToQualify')}
                </div>
              </div>
            )}
          </div>

          {/* Session stats */}
          <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:12,padding:22,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>{t('watch.sessionStats')}</div>
            <StatsGrid/>
          </div>

          {/* Video list — desktop only */}
          {videos.length > 1 && (
            <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:12,padding:22,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:13,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>
                {t('watch.upNext', {count: videos.length})}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {videos.map((v,i) => (
                  <button key={v.id} onClick={()=>{setCurrentIdx(-1);setTimeout(()=>setCurrentIdx(i),50);}}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,border:`1px solid ${i===currentIdx?'rgba(14,165,233,.3)':'rgba(15,25,60,.07)'}`,background:i===currentIdx?'rgba(14,165,233,.06)':'var(--sap-bg-input)',cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'all .15s'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:v.is_watched?'linear-gradient(135deg,#0ea5e9,#38bdf8)':i===currentIdx?'rgba(14,165,233,.12)':'var(--sap-border)',border:i===currentIdx&&!v.is_watched?'2px solid #38bdf8':'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:v.is_watched?'#fff':i===currentIdx?'var(--sap-accent)':'var(--sap-text-muted)',flexShrink:0}}>
                      {v.is_watched ? '✓' : i + 1}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:i===currentIdx?'var(--sap-accent)':'var(--sap-text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</div>
                      <div style={{fontSize:13,color:'var(--sap-text-muted)',marginTop:1}}>{v.platform} · {v.category}</div>
                    </div>
                    {i===currentIdx&&!v.is_watched && <div style={{fontSize:13,fontWeight:700,color:'var(--sap-accent)',background:'rgba(14,165,233,.08)',border:'1px solid rgba(14,165,233,.15)',padding:'2px 8px',borderRadius:4,flexShrink:0}}>{t('watch.playing')}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
