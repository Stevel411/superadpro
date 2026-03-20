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
    margin-left: -16px;
    margin-right: -16px;
    margin-top: -16px;
    width: calc(100% + 32px);
    overflow-x: hidden;
  }
  .watch-player-col { display: flex; flex-direction: column; }
  .watch-panel-col { display: none; }
  .watch-mobile-timer { display: flex !important; }
  .watch-mobile-progress { display: block !important; }
  .watch-mobile-stats { display: grid !important; }
  .watch-desktop-panel { display: none !important; }
  .watch-hint { display: none !important; }
  .watch-video-card { border-radius: 0 !important; border: none !important; }
  .watch-player-card { border-radius: 0 !important; border: none !important; box-shadow: none !important; margin: 0 !important; }
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
.mark-btn.disabled { background: #e2e8f0; color: #94a3b8; cursor: default; box-shadow: none; }

.dot-item {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
  transition: all .3s;
}
.dot-done { background: linear-gradient(135deg,#0ea5e9,#38bdf8); color: #fff; box-shadow: 0 2px 8px rgba(14,165,233,.3); animation: dotPop .3s ease; }
.dot-current { background: rgba(56,189,248,.1); border: 2px solid #38bdf8; color: #0ea5e9; }
.dot-empty { background: #f1f5f9; border: 2px solid #e2e8f0; color: #cbd5e1; }

.stat-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 12px; text-align: center; }
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
    if (url.includes('vimeo')) {
      const sep = url.includes('?') ? '&' : '?';
      frame.src = `${url}${sep}autoplay=1&muted=${newMuted?1:0}&controls=0&title=0&byline=0&portrait=0`;
    } else {
      const sep = url.includes('?') ? '&' : '?';
      frame.src = `${url}${sep}autoplay=1&mute=${newMuted?1:0}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;
    }
  };

  const buildEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('vimeo')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}autoplay=1&muted=1&controls=0&title=0&byline=0&portrait=0`;
    }
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;
  };

  if (loading) return (
    <AppLayout title={t('watch.title')}>
      <div style={{display:'flex',justifyContent:'center',padding:80}}>
        <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppLayout>
  );

  if (!data) return (
    <AppLayout title={t('watch.title')}>
      <div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Unable to load</div>
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
  const btnReady = timerDone && !isCurrentWatched && !submitted;
  const statusText = isCurrentWatched ? '✓ Watched' : timerDone ? '✓ Ready — tap to mark as watched' : paused ? '⏸ Paused — return to this tab' : '⏱ Watching — keep this tab open';
  const statusColor = isCurrentWatched || timerDone ? '#16a34a' : paused ? '#d97706' : '#0ea5e9';

  // Shared sub-components
  const TimerRing = ({ size = 56 }) => {
    var r = size === 56 ? timerR : 28;
    var c = 2 * Math.PI * r;
    var off = c * (secondsLeft / 30);
    return (
      <div style={{width:size,height:size,position:'relative',flexShrink:0}}>
        <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
          <defs><linearGradient id="tGrad2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient></defs>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eef1f8" strokeWidth={size===56?5:4}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#tGrad2)" strokeWidth={size===56?5:4}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={isCurrentWatched ? 0 : off}
            style={{transition:'stroke-dashoffset 1s linear'}}/>
        </svg>
        <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:size===56?18:14,fontWeight:900,color:'#0f172a'}}>
          {isCurrentWatched ? '✓' : secondsLeft}
        </span>
      </div>
    );
  };

  const ProgressDots = () => (
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
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
        {v:d.streak_days||0, l:'Day Streak 🔥', c:'#f59e0b'},
        {v:d.total_watched||0, l:'Total Watched', c:'#0ea5e9'},
        {v:`Tier ${d.tier||1}`, l:'Your Level', c:'#a78bfa'},
        {v:d.commissions_paused?'Paused':'Active', l:'Commissions', c:d.commissions_paused?'#ef4444':'#16a34a'},
      ].map((s,i) => (
        <div key={i} style={{background:dark?'rgba(255,255,255,.04)':'#f1f5f9',border:`1px solid ${dark?'rgba(255,255,255,.08)':'#e2e8f0'}`,borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:dark?'rgba(200,220,255,.3)':'#94a3b8',marginTop:4}}>{s.l}</div>
        </div>
      ))}
    </div>
  );

  // ── QUOTA COMPLETE ──
  if (d.quota_reached || allWatched) {
    const done = Math.max(watched, videos.filter(v => v.is_watched).length);
    return (
      <AppLayout title={t('watch.title')} subtitle="Daily quota complete">
        <style>{CSS}</style>
        <div style={{maxWidth:750,margin:'0 auto'}}>
          <div style={{background:'linear-gradient(135deg,#0b1729 0%,#132240 50%,#0e1c30 100%)',borderRadius:12,padding:'52px 40px',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>
            <div className="cmp-orb co1"/><div className="cmp-orb co2"/><div className="cmp-orb co3"/>
            <div className="cmp-line cl1"/><div className="cmp-line cl2"/>
            <div style={{position:'relative',zIndex:1}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(74,222,128,.12)',border:'2px solid rgba(74,222,128,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{display:'inline-block',fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#4ade80',background:'rgba(74,222,128,.1)',border:'1px solid rgba(74,222,128,.2)',padding:'5px 16px',borderRadius:8,marginBottom:16}}>✓ Fully Qualified</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#fff',marginBottom:8}}>Today's Quota Complete!</div>
              <div style={{fontSize:14,color:'rgba(200,220,255,.5)',lineHeight:1.7,marginBottom:32,maxWidth:440,margin:'0 auto 32px'}}>
                You've watched all {done} required videos today. Your commissions are fully qualified. Come back tomorrow for your next session.
              </div>
              <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:32}}>
                {[{v:done,l:'Videos Watched',c:'#4ade80'},{v:`${done*30}s`,l:'Watch Time',c:'#38bdf8'},{v:d.streak_days||0,l:'Day Streak',c:'#fbbf24'},{v:`Tier ${d.tier||1}`,l:'Your Level',c:'#a78bfa'}].map((s,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:'16px 20px',minWidth:90,textAlign:'center'}}>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:9,fontWeight:700,color:'rgba(200,220,255,.3)',textTransform:'uppercase',letterSpacing:1,marginTop:4}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:15,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:10,padding:'14px 36px',textDecoration:'none',boxShadow:'0 4px 16px rgba(14,165,233,.3)'}}>← Back to Dashboard</Link>
            </div>
          </div>
        </div>
        <style>{`.cmp-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:0}.co1{width:200px;height:200px;top:-60px;right:10%;background:radial-gradient(circle,rgba(74,222,128,.2),transparent 70%);animation:cPulse 4s ease-in-out infinite}.co2{width:150px;height:150px;bottom:-40px;left:15%;background:radial-gradient(circle,rgba(14,165,233,.2),transparent 70%);animation:cPulse 5s ease-in-out 1s infinite}.co3{width:120px;height:120px;top:20%;left:5%;background:radial-gradient(circle,rgba(99,102,241,.15),transparent 70%);animation:cPulse 6s ease-in-out 2s infinite}.cmp-line{position:absolute;height:1.5px;background:linear-gradient(90deg,transparent,rgba(74,222,128,.2),transparent);pointer-events:none;z-index:0}.cl1{width:60%;top:30%;left:20%;animation:cSlide 8s linear infinite}.cl2{width:40%;top:70%;left:35%;animation:cSlide 10s linear 2s infinite}`}</style>
      </AppLayout>
    );
  }

  // ── NO VIDEOS ──
  if (videos.length === 0) {
    return (
      <AppLayout title={t('watch.title')} subtitle="No active campaigns">
        <style>{CSS}</style>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'56px 32px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:48,marginBottom:16,opacity:.5}}>📭</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:8}}>No Active Campaigns</div>
            <div style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>Check back soon — campaigns are added as advertisers activate their tiers.</div>
            <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:10,padding:'12px 28px',textDecoration:'none'}}>← Dashboard</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── MAIN WATCH SESSION ──
  return (
    <AppLayout title={t('watch.title')} subtitle="Complete your daily quota to stay commission-eligible"
      topbarActions={<>
        <div style={{background:'rgba(14,165,233,.12)',border:'1px solid rgba(14,165,233,.2)',borderRadius:8,padding:'6px 14px',textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:'#38bdf8'}}>Tier {d.tier}</div>
          <div style={{fontSize:9,color:'rgba(186,230,253,.4)',marginTop:1}}>{limit} video{limit!==1?'s':''}/day</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,padding:'6px 14px',borderRadius:8,
          ...(watched>=limit?{background:'rgba(22,163,74,.1)',border:'1px solid rgba(22,163,74,.2)',color:'#22c55e'}:{background:'rgba(14,165,233,.1)',border:'1px solid rgba(14,165,233,.2)',color:'#38bdf8'})}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:watched>=limit?'#22c55e':'#38bdf8',animation:'pulse 1.5s infinite'}}/>
          {watched>=limit?'Qualified':'Watching'}
        </div>
      </>}>

      <style>{CSS}</style>

      <div className="watch-layout">

        {/* ── LEFT / MAIN COLUMN ── */}
        <div className="watch-player-col">

          {/* Commission warning — mobile only */}
          {d.consecutive_missed > 0 && (
            <div className="watch-mobile-warning" style={{display:'none',background:'#fffbeb',borderLeft:'4px solid #f59e0b',padding:'12px 20px',alignItems:'center',gap:10,fontSize:13,fontWeight:600,color:'#92400e'}}>
              ⚠️ You've missed {d.consecutive_missed} day{d.consecutive_missed!==1?'s':''}. Complete today's quota to protect your commissions.
            </div>
          )}

          {/* Video card */}
          <div className="watch-player-card" style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04)'}}>

            {/* Title bar — desktop only */}
            <div className="watch-hint" style={{padding:'10px 16px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{minWidth:0,display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current?.title||'Loading...'}</div>
                <div style={{fontSize:11,color:'#94a3b8',whiteSpace:'nowrap',flexShrink:0}}>{current?.platform||'video'} · {current?.category||'General'}</div>
              </div>
              <div style={{fontSize:8,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#0ea5e9',background:'rgba(14,165,233,.06)',border:'1px solid rgba(14,165,233,.12)',padding:'4px 10px',borderRadius:6,whiteSpace:'nowrap'}}>▶ Now Playing</div>
            </div>

            {/* Video */}
            <div style={{position:'relative',width:'100%',aspectRatio:'16/9',background:'#000',overflow:'hidden'}}>
              {current?.embed_url ? (
                <iframe key={currentIdx} ref={iframeRef} src={buildEmbedUrl(current.embed_url)}
                  style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen/>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',color:'#64748b'}}>No video available</div>
              )}
              {/* Unmute */}
              {muted && current?.embed_url && !paused && (
                <div onClick={toggleMute} style={{position:'absolute',top:12,right:12,zIndex:20,background:'rgba(5,13,26,.75)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'7px 12px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',backdropFilter:'blur(6px)'}}>
                  <span style={{fontSize:13}}>🔇</span>
                  <span style={{fontSize:11,fontWeight:700,color:'#fff'}}>Tap to unmute</span>
                </div>
              )}
              {/* Pause overlay */}
              {paused && !isCurrentWatched && (
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)',zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,backdropFilter:'blur(8px)'}}>
                  <div style={{fontSize:40}}>⏸</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#fff'}}>Paused</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>Return to this tab to continue</div>
                </div>
              )}
            </div>

            {/* Desktop footer */}
            <div className="watch-hint" style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,background:'#f8f9fb',borderTop:'1px solid #f1f3f7'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <TimerRing size={56}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:statusColor}}>{statusText}</div>
                  <div style={{fontSize:10,color:'#b8c4d0',marginTop:2}}>Must watch 30s to qualify</div>
                </div>
              </div>
              <button onClick={markAsWatched} disabled={!btnReady}
                className={'mark-btn ' + (btnReady ? 'ready' : 'disabled')}>
                {submitted ? 'Submitting...' : '✓ Mark as Watched →'}
              </button>
            </div>
          </div>

          {/* ── MOBILE: Timer + Mark button ── */}
          <div className="watch-mobile-timer" style={{display:'none',alignItems:'center',gap:14,padding:'14px 20px',background:'#fff',borderTop:'1px solid #e8ecf2',borderBottom:'1px solid #e8ecf2'}}>
            <TimerRing size={56}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:statusColor,marginBottom:2}}>{statusText}</div>
              <div style={{fontSize:11,color:'#94a3b8',fontWeight:500}}>{watched} of {limit} video{limit!==1?'s':''} watched today</div>
            </div>
            <button onClick={markAsWatched} disabled={!btnReady}
              className={'mark-btn ' + (btnReady ? 'ready' : 'disabled')}
              style={{padding:'13px 20px',fontSize:13}}>
              {submitted ? '...' : btnReady ? '✓ Mark' : `${secondsLeft}s`}
            </button>
          </div>

          {/* ── MOBILE: Progress dots ── */}
          <div className="watch-mobile-progress" style={{display:'none',padding:'16px 20px',background:'#fff',borderBottom:'1px solid #e8ecf2'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'#64748b'}}>Today's Progress</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:900,color:'#0f172a'}}>
                {watched} <span style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>/ {limit}</span>
              </div>
            </div>
            <ProgressDots/>
          </div>

          {/* ── MOBILE: Stats grid ── */}
          <div className="watch-mobile-stats" style={{display:'none',gridTemplateColumns:'1fr 1fr',gap:10,padding:'16px 20px',background:'#f0f3f9'}}>
            {[
              {v:d.streak_days||0, l:'Day Streak 🔥', c:'#f59e0b'},
              {v:d.total_watched||0, l:'Total Watched', c:'#0ea5e9'},
              {v:`Tier ${d.tier||1}`, l:'Your Level', c:'#a78bfa'},
              {v:d.commissions_paused?'Paused':'Active', l:'Commissions', c:d.commissions_paused?'#ef4444':'#16a34a'},
            ].map((s,i) => (
              <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 12px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,color:'#94a3b8',marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Desktop hint text */}
          <div className="watch-hint" style={{fontSize:11,color:'#b8c4d0',textAlign:'center',lineHeight:1.6}}>
            Videos must be watched for 30 seconds with this tab active to qualify. Complete {limit} per day to maintain commission eligibility.
          </div>
        </div>

        {/* ── RIGHT: Desktop progress panel ── */}
        <div className="watch-panel-col">

          {/* Commission warning */}
          {d.consecutive_missed > 0 && (
            <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'flex-start',gap:10}}>
              <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#92400e',marginBottom:2}}>Commissions at risk</div>
                <div style={{fontSize:12,color:'#a16207',lineHeight:1.5}}>You've missed {d.consecutive_missed} day{d.consecutive_missed!==1?'s':''}. Complete today's quota to protect your earnings.</div>
              </div>
            </div>
          )}

          {/* Today's progress */}
          <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:12,padding:22,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>Today's Progress</div>
            <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:16}}>
              <div style={{width:90,height:90,position:'relative',flexShrink:0}}>
                <svg width="90" height="90" style={{transform:'rotate(-90deg)'}}>
                  <defs><linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="#eef1f8" strokeWidth="7"/>
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="url(#pGrad)" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringOffset}
                    style={{transition:'stroke-dashoffset .6s'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:'#0f172a'}}>{watched}</div>
              </div>
              <div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:800,color:'#0f172a',lineHeight:1}}>
                  {watched}<span style={{fontSize:16,color:'#94a3b8',fontWeight:500}}> / {limit}</span>
                </div>
                <div style={{fontSize:13,color:'#7b91a8',marginTop:3}}>videos watched</div>
                <div style={{fontSize:12,fontWeight:600,color:watched>=limit?'#16a34a':'#3d5068',marginTop:4}}>
                  {watched>=limit ? '✓ Quota complete!' : `${limit-watched} remaining`}
                </div>
              </div>
            </div>
            <ProgressDots/>
          </div>

          {/* Session stats */}
          <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:12,padding:22,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>Session Stats</div>
            <StatsGrid/>
          </div>

          {/* Video list — desktop only */}
          {videos.length > 1 && (
            <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:12,padding:22,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>
                Up Next ({videos.length} videos)
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {videos.map((v,i) => (
                  <button key={v.id} onClick={()=>{setCurrentIdx(-1);setTimeout(()=>setCurrentIdx(i),50);}}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,border:`1px solid ${i===currentIdx?'rgba(14,165,233,.3)':'rgba(15,25,60,.07)'}`,background:i===currentIdx?'rgba(14,165,233,.06)':'#f8f9fb',cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'all .15s'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:v.is_watched?'linear-gradient(135deg,#0ea5e9,#38bdf8)':i===currentIdx?'rgba(14,165,233,.12)':'#e2e8f0',border:i===currentIdx&&!v.is_watched?'2px solid #38bdf8':'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:v.is_watched?'#fff':i===currentIdx?'#0ea5e9':'#94a3b8',flexShrink:0}}>
                      {v.is_watched ? '✓' : i + 1}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:i===currentIdx?'#0ea5e9':'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</div>
                      <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{v.platform} · {v.category}</div>
                    </div>
                    {i===currentIdx&&!v.is_watched && <div style={{fontSize:9,fontWeight:700,color:'#0ea5e9',background:'rgba(14,165,233,.08)',border:'1px solid rgba(14,165,233,.15)',padding:'2px 8px',borderRadius:4,flexShrink:0}}>▶ Playing</div>}
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
