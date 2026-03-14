import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';

export default function Watch() {
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

  // Load data
  useEffect(() => {
    apiGet('/api/watch').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Auto-select first unwatched video on data load or after advance
  useEffect(() => {
    if (!data?.videos?.length) return;
    if (currentIdx >= 0) return; // already selected, wait for reset to -1
    const firstUnwatched = data.videos.findIndex(v => !v.is_watched);
    if (firstUnwatched >= 0) {
      setCurrentIdx(firstUnwatched);
    } else if (data.videos.length > 0) {
      // All watched — show last one
      setCurrentIdx(data.videos.length - 1);
    }
  }, [data, currentIdx]);

  // Reset timer when switching to a new video
  useEffect(() => {
    if (currentIdx < 0 || !data?.videos?.length) return;
    const current = data.videos[currentIdx];
    if (current?.is_watched) {
      setTimerDone(true);
      setSecondsLeft(0);
    } else {
      setSecondsLeft(30);
      setTimerDone(false);
      setSubmitted(false);
      setMuted(true);
    }
  }, [currentIdx, data]);

  // Countdown — auto-runs for unwatched videos
  useEffect(() => {
    if (currentIdx < 0 || !data?.videos?.length) return;
    const current = data.videos[currentIdx];
    if (current?.is_watched || paused || timerDone) return;
    if (secondsLeft > 0) {
      timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    } else {
      setTimerDone(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [secondsLeft, paused, timerDone, data, currentIdx]);

  // Tab visibility — pause/resume
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
      // Find next unwatched in the fresh data
      const nextIdx = newData.videos.findIndex((v, i) => !v.is_watched);
      if (nextIdx >= 0 && nextIdx !== currentIdx) {
        // Force timer reset by setting index to -1 first, then to the new index
        setCurrentIdx(-1);
        setData(newData);
        setTimeout(() => setCurrentIdx(nextIdx), 50);
      } else {
        // All watched or no more — update data to show current state
        setData(newData);
        setSubmitted(false);
      }
    } catch (e) { setSubmitted(false); alert(e.message); }
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    // Reload iframe with updated mute parameter
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

  if (loading) return <AppLayout title="Watch to Earn"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;
  if (!data) return <AppLayout title="Watch to Earn"><div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Unable to load</div></AppLayout>;

  const d = data;
  const videos = d.videos || [];
  const current = currentIdx >= 0 ? videos[currentIdx] : null;
  const watched = d.watched_today || 0;
  const limit = d.daily_required || d.daily_limit || 10;
  const timerR = 25;
  const timerC = 2 * Math.PI * timerR;
  const timerOffset = timerC * (secondsLeft / 30);
  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - Math.min(1, watched / limit));
  const isCurrentWatched = current?.is_watched;

  // Status
  const statusText = isCurrentWatched ? '✓ Watched' : timerDone ? '✓ Complete — mark as watched' : paused ? '⏸ Paused — return to this tab' : '⏱ Watching — timer counting down';
  const statusColor = isCurrentWatched || timerDone ? '#16a34a' : paused ? '#d97706' : '#0ea5e9';

  // Check if ALL available videos are already watched
  const allWatched = videos.length > 0 && videos.every(v => v.is_watched);

  // ═══ QUOTA COMPLETE or ALL WATCHED ═══
  if (d.quota_reached || allWatched) {
    const videosCompleted = Math.max(watched, videos.filter(v => v.is_watched).length);
    return (
      <AppLayout title="Watch to Earn" subtitle="Daily quota complete">
        <div style={{maxWidth:750,margin:'0 auto'}}>
          <div style={{background:'linear-gradient(135deg,#0b1729 0%,#132240 50%,#0e1c30 100%)',borderRadius:8,padding:'52px 40px',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.2),0 8px 24px rgba(0,0,0,.15)'}}>
            {/* Animated orbs */}
            <div className="cmp-orb co1"/><div className="cmp-orb co2"/><div className="cmp-orb co3"/>
            <div className="cmp-line cl1"/><div className="cmp-line cl2"/>
            <div className="cmp-dot cd1"/><div className="cmp-dot cd2"/><div className="cmp-dot cd3"/>

            <div style={{position:'relative',zIndex:1}}>
              {/* Success icon */}
              <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(74,222,128,.12)',border:'2px solid rgba(74,222,128,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>

              <div style={{display:'inline-block',fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#4ade80',background:'rgba(74,222,128,.1)',border:'1px solid rgba(74,222,128,.2)',padding:'5px 16px',borderRadius:8,marginBottom:16}}>✓ Fully Qualified</div>

              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#fff',marginBottom:8}}>Today's Quota Complete!</div>
              <div style={{fontSize:14,color:'rgba(200,220,255,.45)',lineHeight:1.7,marginBottom:32,maxWidth:440,margin:'0 auto 32px'}}>You've watched all {videosCompleted} required videos today. Your commissions are fully qualified. Come back tomorrow for your next session.</div>

              {/* Stats row */}
              <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:32}}>
                {[
                  {v:videosCompleted,l:'Videos Watched',c:'#4ade80'},
                  {v:`${videosCompleted * 30}s`,l:'Watch Time',c:'#38bdf8'},
                  {v:d.streak_days||0,l:'Day Streak',c:'#fbbf24'},
                  {v:`Tier ${d.tier||1}`,l:'Your Level',c:'#a78bfa'},
                ].map((s,i) => (
                  <div key={i} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'18px 22px',minWidth:100}}>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:9,fontWeight:700,color:'rgba(200,220,255,.3)',textTransform:'uppercase',letterSpacing:1,marginTop:4}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:15,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:8,padding:'14px 36px',textDecoration:'none',boxShadow:'0 4px 16px rgba(14,165,233,.3)'}}>← Back to Dashboard</Link>
            </div>
          </div>
        </div>

        <style>{`
          .cmp-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:0}
          .co1{width:200px;height:200px;top:-60px;right:10%;background:radial-gradient(circle,rgba(74,222,128,.2),transparent 70%);animation:cPulse 4s ease-in-out infinite}
          .co2{width:150px;height:150px;bottom:-40px;left:15%;background:radial-gradient(circle,rgba(14,165,233,.2),transparent 70%);animation:cPulse 5s ease-in-out 1s infinite}
          .co3{width:120px;height:120px;top:20%;left:5%;background:radial-gradient(circle,rgba(99,102,241,.15),transparent 70%);animation:cPulse 6s ease-in-out 2s infinite}
          .cmp-line{position:absolute;height:1.5px;background:linear-gradient(90deg,transparent,rgba(74,222,128,.2),transparent);pointer-events:none;z-index:0}
          .cl1{width:60%;top:30%;left:20%;animation:cSlide 8s linear infinite}
          .cl2{width:40%;top:70%;left:35%;animation:cSlide 10s linear 2s infinite}
          .cmp-dot{position:absolute;width:4px;height:4px;border-radius:50%;pointer-events:none;z-index:0}
          .cd1{background:rgba(74,222,128,.6);top:20%;right:20%;animation:cDrift 5s ease-in-out infinite}
          .cd2{background:rgba(14,165,233,.5);top:60%;left:25%;animation:cDrift 6s ease-in-out 1s infinite}
          .cd3{background:rgba(251,191,36,.5);bottom:25%;right:30%;animation:cDrift 7s ease-in-out 2s infinite}
          @keyframes cPulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.2);opacity:1}}
          @keyframes cSlide{0%{transform:translateX(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(100%);opacity:0}}
          @keyframes cDrift{0%,100%{transform:translate(0,0);opacity:.4}25%{transform:translate(-8px,5px);opacity:.9}50%{transform:translate(5px,-6px);opacity:.6}75%{transform:translate(-4px,-3px);opacity:.8}}
        `}</style>
      </AppLayout>
    );
  }

  // ═══ NO VIDEOS ═══
  if (videos.length === 0) {
    return (
      <AppLayout title="Watch to Earn" subtitle="No active campaigns">
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,padding:'56px 32px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{fontSize:48,marginBottom:16,opacity:.5}}>📭</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:8}}>No Active Campaigns</div>
            <div style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>Check back soon — campaigns are added as advertisers activate their tiers.</div>
            <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:8,padding:'12px 28px',textDecoration:'none'}}>← Dashboard</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ═══ WATCH SESSION ═══
  return (
    <AppLayout title="Watch to Earn" subtitle="Complete your daily quota to stay commission-eligible"
      topbarActions={<>
        <div style={{background:'rgba(14,165,233,.12)',border:'1px solid rgba(14,165,233,.2)',borderRadius:8,padding:'6px 14px',textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:'#38bdf8'}}>Tier {d.tier}</div>
          <div style={{fontSize:9,color:'rgba(186,230,253,.4)',marginTop:1}}>{limit} videos/day</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,padding:'6px 14px',borderRadius:8,
          ...(watched>=limit ? {background:'rgba(22,163,74,.1)',border:'1px solid rgba(22,163,74,.2)',color:'#22c55e'} : {background:'rgba(14,165,233,.1)',border:'1px solid rgba(14,165,233,.2)',color:'#38bdf8'}),
        }}>
          <span style={{width:7,height:7,borderRadius:'50%',background:watched>=limit?'#22c55e':'#38bdf8',animation:'pulse 1.5s infinite'}}/>
          {watched>=limit ? 'Qualified' : 'Watching'}
        </div>
      </>}>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:20,alignItems:'start',maxWidth:1400,margin:'0 auto'}}>

        {/* ═══ LEFT: Player ═══ */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>

            <div style={{padding:'8px 16px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{minWidth:0,display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current?.title || 'Loading...'}</div>
                <div style={{fontSize:11,color:'#94a3b8',whiteSpace:'nowrap',flexShrink:0}}>{current?.platform || 'video'} · {current?.category || 'General'}</div>
              </div>
              <div style={{fontSize:8,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#0ea5e9',background:'rgba(14,165,233,.06)',border:'1px solid rgba(14,165,233,.12)',padding:'4px 10px',borderRadius:6,whiteSpace:'nowrap'}}>▶ Now Playing</div>
            </div>

            {/* Video — full width, no controls */}
            <div style={{position:'relative',width:'100%',aspectRatio:'16/9',background:'#000',overflow:'hidden'}}>
              {current?.embed_url ? (
                <iframe key={currentIdx} ref={iframeRef} src={buildEmbedUrl(current.embed_url)}
                  style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen/>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',color:'#64748b'}}>No video available</div>
              )}

              {/* Unmute overlay */}
              {muted && current?.embed_url && !paused && (
                <div onClick={toggleMute} style={{position:'absolute',top:12,right:12,zIndex:20,background:'rgba(5,13,26,0.75)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,padding:'7px 12px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',backdropFilter:'blur(6px)'}}>
                  <span style={{fontSize:13}}>🔇</span>
                  <span style={{fontSize:11,fontWeight:700,color:'#fff'}}>Click to unmute</span>
                </div>
              )}

              {/* Pause overlay */}
              {paused && !isCurrentWatched && (
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,backdropFilter:'blur(8px)'}}>
                  <div style={{fontSize:40}}>⏸</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#fff'}}>Paused</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>Return to this tab to continue</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,background:'#f8f9fb',borderTop:'1px solid #f1f3f7'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:56,height:56,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="56" height="56" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                    <defs><linearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient></defs>
                    <circle cx="28" cy="28" r={timerR} fill="none" stroke="#eef1f8" strokeWidth="5"/>
                    <circle cx="28" cy="28" r={timerR} fill="none" stroke="url(#tGrad)" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={timerC} strokeDashoffset={isCurrentWatched ? 0 : timerOffset}
                      style={{transition:'stroke-dashoffset 1s linear'}}/>
                  </svg>
                  <span style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',zIndex:1}}>{isCurrentWatched ? '✓' : secondsLeft}</span>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:statusColor}}>{statusText}</div>
                  <div style={{fontSize:10,color:'#b8c4d0',marginTop:2}}>Must watch 30s to qualify</div>
                </div>
              </div>

              <button onClick={markAsWatched}
                disabled={(!timerDone && !isCurrentWatched) || submitted || isCurrentWatched}
                style={{
                  fontSize:14,fontWeight:700,color:'#fff',border:'none',borderRadius:8,padding:'12px 28px',whiteSpace:'nowrap',fontFamily:'inherit',
                  background:timerDone && !isCurrentWatched ? 'linear-gradient(180deg,#38bdf8,#0ea5e9)' : '#cbd5e1',
                  opacity:timerDone && !isCurrentWatched ? 1 : 0.35,
                  cursor:timerDone && !isCurrentWatched ? 'pointer' : 'default',
                  boxShadow:timerDone && !isCurrentWatched ? '0 4px 0 #0284c7' : 'none',
                  pointerEvents:timerDone && !isCurrentWatched ? 'auto' : 'none',
                }}>
                {submitted ? 'Submitting...' : '✓ Mark as Watched →'}
              </button>
            </div>
          </div>

          <div style={{fontSize:11,color:'#b8c4d0',textAlign:'center',lineHeight:1.6}}>
            Videos must be watched for 30 seconds with this tab active to qualify. Complete {limit} per day to maintain commission eligibility.
          </div>
        </div>

        {/* ═══ RIGHT: Progress Panel ═══ */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>

          {/* Today's Progress */}
          <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:8,padding:22,boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>Today's Progress</div>
            <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:16}}>
              <div style={{width:90,height:90,position:'relative',flexShrink:0}}>
                <svg width="90" height="90" style={{transform:'rotate(-90deg)'}}>
                  <defs><linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="#eef1f8" strokeWidth="7"/>
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="url(#pGrad)" strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={ringC} strokeDashoffset={ringOffset} style={{transition:'stroke-dashoffset 0.6s'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:'#0f172a'}}>{watched}</div>
              </div>
              <div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:800,color:'#0f172a',lineHeight:1}}>{watched}<span style={{fontSize:16,color:'#94a3b8',fontWeight:500}}> / {limit}</span></div>
                <div style={{fontSize:13,color:'#7b91a8',marginTop:3}}>videos watched</div>
                <div style={{fontSize:12,fontWeight:600,color:watched>=limit?'#16a34a':'#3d5068',marginTop:4}}>{watched>=limit?'✓ Quota complete!':`${limit-watched} remaining`}</div>
              </div>
            </div>
            {/* Dots — circular like original */}
            <div style={{display:'flex',gap:5,flexWrap:'nowrap',marginTop:6}}>
              {Array.from({length:limit}).map((_,i) => (
                <div key={i} style={{
                  width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0,transition:'all .3s',
                  ...(i < watched
                    ? {background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',border:'2px solid #0ea5e9',boxShadow:'0 2px 8px rgba(14,165,233,.25)'}
                    : i === watched
                      ? {border:'2px solid #38bdf8',background:'rgba(56,189,248,.1)',color:'#0ea5e9'}
                      : {border:'2px solid rgba(15,25,60,.1)',color:'#cbd5e1',background:'#f6f8fc'}),
                }}>{i < watched ? '✓' : i + 1}</div>
              ))}
            </div>
          </div>

          {/* Session Stats */}
          <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:8,padding:22,boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8',marginBottom:14}}>Session Stats</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                {v:d.streak_days||0,l:'Day Streak'},
                {v:d.total_watched||0,l:'Total Videos'},
                {v:`Tier ${d.tier||1}`,l:'Your Level'},
                {v:d.commissions_paused?'Paused':'Active',l:'Commissions',red:d.commissions_paused},
              ].map((s,i) => (
                <div key={i} style={{background:'#f6f8fc',border:'1px solid rgba(15,25,60,.07)',borderRadius:8,padding:14,textAlign:'center'}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:s.red?'#ef4444':'#0ea5e9'}}>{s.v}</div>
                  <div style={{fontSize:10,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'#7b91a8',marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}`}</style>
    </AppLayout>
  );
}
