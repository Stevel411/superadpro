import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';

export default function Watch() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
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

  // Auto-start timer when video loads
  useEffect(() => {
    if (!data || !data.videos?.length || data.quota_reached) return;
    const current = data.videos[currentIdx];
    if (current?.is_watched) return;
    // Start countdown
    setSecondsLeft(30);
    setTimerDone(false);
    setSubmitted(false);
    setMuted(true);
  }, [currentIdx, data]);

  // Countdown
  useEffect(() => {
    if (paused || timerDone || !data?.videos?.length || data.quota_reached) return;
    const current = data.videos[currentIdx];
    if (current?.is_watched) return;
    if (secondsLeft > 0) {
      timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    } else if (!timerDone) {
      setTimerDone(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [secondsLeft, paused, timerDone, data, currentIdx]);

  // Tab visibility
  useEffect(() => {
    const handleVis = () => { if (document.hidden) setPaused(true); };
    const handleBlur = () => setPaused(true);
    const handleFocus = () => setPaused(false);
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const markAsWatched = async () => {
    if (submitted) return;
    const video = data.videos[currentIdx];
    if (!video) return;
    setSubmitted(true);
    try {
      await apiPost('/api/watch/complete', { video_id: video.id });
      const newData = await apiGet('/api/watch');
      setData(newData);
      setTimerDone(false);
      setSecondsLeft(30);
      setSubmitted(false);
      if (currentIdx < (newData.videos?.length || 0) - 1) setCurrentIdx(currentIdx + 1);
    } catch (e) { setSubmitted(false); alert(e.message); }
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    try {
      const frame = iframeRef.current;
      if (!frame) return;
      const url = current?.embed_url || '';
      if (url.includes('vimeo')) {
        // Vimeo Player API
        const cmd = newMuted
          ? '{"method":"setVolume","value":0}'
          : '{"method":"setVolume","value":1}';
        frame.contentWindow.postMessage(cmd, '*');
      } else {
        // YouTube Player API
        const func = newMuted ? 'mute' : 'unMute';
        frame.contentWindow.postMessage(`{"event":"command","func":"${func}Video","args":""}`, '*');
      }
    } catch(e) {}
  };

  if (loading) return <AppLayout title="Watch to Earn"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;
  if (!data) return <AppLayout title="Watch to Earn"><div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Unable to load</div></AppLayout>;

  const d = data;
  const videos = d.videos || [];
  const current = videos[currentIdx];
  const watched = d.watched_today || 0;
  const limit = d.daily_limit || 10;
  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - Math.min(1, watched / limit));
  const timerR = 25;
  const timerC = 2 * Math.PI * timerR;
  const timerOffset = timerC * (secondsLeft / 30);

  // Build embed URL — autoplay, muted, no controls
  const buildEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('vimeo')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}autoplay=1&muted=1&controls=0&title=0&byline=0&portrait=0`;
    }
    // YouTube / default
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;
  };

  // ═══ QUOTA COMPLETE ═══
  if (d.quota_reached) {
    return (
      <AppLayout title="Watch to Earn" subtitle="Daily quota complete"
        topbarActions={<>
          <span style={{fontSize:11,fontWeight:700,padding:'5px 14px',borderRadius:8,background:'rgba(22,163,74,.08)',border:'1px solid rgba(22,163,74,.15)',color:'#16a34a'}}>● Qualified</span>
        </>}>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,padding:'48px 36px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#0ea5e9,#22c55e)'}}/>
            <div style={{fontSize:52,marginBottom:14}}>🎉</div>
            <div style={{display:'inline-block',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#22c55e',background:'rgba(22,163,74,.08)',border:'1px solid rgba(22,163,74,.2)',padding:'4px 14px',borderRadius:8,marginBottom:12}}>✓ Fully Qualified</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'#0f172a',marginBottom:8}}>Today's Quota Complete!</div>
            <div style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:28,maxWidth:420,margin:'0 auto 28px'}}>You've watched all {limit} required video{limit !== 1 ? 's' : ''} today. Your commissions are fully qualified. Come back tomorrow for your next session.</div>
            <div style={{display:'flex',gap:12,justifyContent:'center',marginBottom:28}}>
              {[{v:watched,l:'Videos Today'},{v:`${watched*30}s`,l:'Watch Time'},{v:d.streak_days||0,l:'Day Streak'}].map((s,i) => (
                <div key={i} style={{background:'#f8f9fb',border:'1px solid #e8ecf2',borderRadius:8,padding:'16px 24px',minWidth:100}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#0ea5e9'}}>{s.v}</div>
                  <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginTop:3}}>{s.l}</div>
                </div>
              ))}
            </div>
            <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:8,padding:'13px 32px',textDecoration:'none'}}>← Back to Dashboard</Link>
          </div>
        </div>
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
            <div style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>There are no active video campaigns in the pool right now. Check back soon — campaigns are added as advertisers activate their tiers.</div>
            <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:8,padding:'12px 28px',textDecoration:'none'}}>← Back to Dashboard</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ═══ WATCH SESSION ═══
  const statusText = timerDone ? '✓ Complete — mark as watched' : paused ? '⏸ Paused — return to this tab to continue' : current?.is_watched ? '✓ Already watched' : '⏱ Watching — timer counting down';
  const statusColor = timerDone ? '#16a34a' : paused ? '#d97706' : current?.is_watched ? '#16a34a' : '#0ea5e9';

  return (
    <AppLayout title="Watch to Earn" subtitle="Complete your daily quota to stay commission-eligible"
      topbarActions={<>
        <div style={{background:'#f8f9fb',border:'1px solid #e8ecf2',borderRadius:8,padding:'5px 14px',textAlign:'center'}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#94a3b8'}}>Tier {d.tier}</div>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{d.daily_required} videos/day</div>
        </div>
        <span style={{fontSize:11,fontWeight:700,padding:'5px 14px',borderRadius:8,
          ...(watched>=limit ? {background:'rgba(22,163,74,.08)',border:'1px solid rgba(22,163,74,.15)',color:'#16a34a'} : {background:'rgba(14,165,233,.06)',border:'1px solid rgba(14,165,233,.12)',color:'#0ea5e9'}),
        }}>{watched>=limit ? '● Qualified' : '● Watching'}</span>
      </>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:16,alignItems:'start'}}>

        {/* LEFT: Player */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>

            {/* Header */}
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{current?.title || 'Loading...'}</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{current?.platform || 'Video'} · {current?.category || 'General'}</div>
              </div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#0ea5e9',background:'rgba(14,165,233,.06)',border:'1px solid rgba(14,165,233,.12)',padding:'5px 14px',borderRadius:8,whiteSpace:'nowrap'}}>▶ Now Playing</div>
            </div>

            {/* Video — no YouTube controls, autoplay muted */}
            <div style={{position:'relative',width:'100%',aspectRatio:'16/9',background:'#000',overflow:'hidden'}}>
              {current?.embed_url ? (
                <iframe ref={iframeRef} src={buildEmbedUrl(current.embed_url)}
                  style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                  allowFullScreen/>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',color:'#64748b',fontSize:14}}>No video available</div>
              )}

              {/* Unmute overlay — top right */}
              {muted && current?.embed_url && !paused && (
                <div onClick={toggleMute} style={{
                  position:'absolute',top:12,right:12,zIndex:20,
                  background:'rgba(5,13,26,0.75)',border:'1px solid rgba(255,255,255,0.15)',
                  borderRadius:8,padding:'7px 12px',display:'flex',alignItems:'center',gap:6,
                  cursor:'pointer',backdropFilter:'blur(6px)',transition:'background 0.2s',
                }}>
                  <span style={{fontSize:13}}>🔇</span>
                  <span style={{fontSize:11,fontWeight:700,color:'#fff'}}>Click to unmute</span>
                </div>
              )}

              {/* Pause overlay */}
              {paused && (
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,backdropFilter:'blur(8px)'}}>
                  <div style={{fontSize:40}}>⏸</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#fff'}}>Paused</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>Return to this tab to continue</div>
                </div>
              )}
            </div>

            {/* Footer: timer + mark as watched */}
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,background:'#f8f9fb',borderTop:'1px solid #f1f3f7'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:56,height:56,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="56" height="56" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                    <defs><linearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient></defs>
                    <circle cx="28" cy="28" r={timerR} fill="none" stroke="#eef1f8" strokeWidth="5"/>
                    <circle cx="28" cy="28" r={timerR} fill="none" stroke="url(#tGrad)" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={timerC} strokeDashoffset={current?.is_watched ? 0 : timerOffset}
                      style={{transition:'stroke-dashoffset 1s linear'}}/>
                  </svg>
                  <span style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',zIndex:1}}>{current?.is_watched ? '✓' : secondsLeft}</span>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:statusColor}}>{statusText}</div>
                  <div style={{fontSize:10,color:'#b8c4d0',marginTop:2}}>Must watch 30s to qualify</div>
                </div>
              </div>

              <button onClick={markAsWatched}
                disabled={!timerDone || submitted || current?.is_watched}
                style={{
                  fontSize:14,fontWeight:700,color:'#fff',border:'none',borderRadius:8,padding:'12px 28px',whiteSpace:'nowrap',fontFamily:'inherit',
                  background:timerDone && !current?.is_watched ? 'linear-gradient(180deg,#38bdf8,#0ea5e9)' : '#cbd5e1',
                  opacity:timerDone && !current?.is_watched ? 1 : 0.35,
                  cursor:timerDone && !current?.is_watched ? 'pointer' : 'default',
                  boxShadow:timerDone && !current?.is_watched ? '0 4px 0 #0284c7' : 'none',
                  transition:'all 0.3s',
                }}>
                {submitted ? 'Submitting...' : current?.is_watched ? '✓ Watched' : '✓ Mark as Watched →'}
              </button>
            </div>
          </div>

          <div style={{fontSize:11,color:'#b8c4d0',textAlign:'center',lineHeight:1.6}}>
            Videos must be watched for 30 seconds with this tab active to qualify. Complete {limit} per day to maintain commission eligibility.
          </div>
        </div>

        {/* RIGHT: Progress Panel */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Today's Progress */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f3f7'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Today's Progress</div>
            </div>
            <div style={{padding:'20px',display:'flex',alignItems:'center',gap:18}}>
              <div style={{width:90,height:90,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="90" height="90" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                  <defs><linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="#eef1f8" strokeWidth="5"/>
                  <circle cx="45" cy="45" r={ringR} fill="none" stroke="url(#pGrad)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={ringC} strokeDashoffset={ringOffset} style={{transition:'stroke-dashoffset 0.5s ease'}}/>
                </svg>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'#0f172a',zIndex:1}}>{watched}</div>
              </div>
              <div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:900,color:'#0f172a'}}>{watched}<span style={{fontSize:16,color:'#94a3b8',fontWeight:500}}> / {limit}</span></div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>videos watched</div>
                <div style={{fontSize:12,fontWeight:700,color:watched>=limit?'#16a34a':'#0ea5e9',marginTop:4}}>{watched>=limit?'✓ Quota complete!':`${limit-watched} remaining`}</div>
              </div>
            </div>
            <div style={{padding:'0 20px 16px',display:'flex',flexWrap:'wrap',gap:6}}>
              {Array.from({length:limit}).map((_,i) => (
                <div key={i} style={{
                  width:30,height:30,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,
                  ...(i < watched ? {background:'linear-gradient(135deg,#22c55e,#16a34a)',color:'#fff'}
                    : i === watched ? {background:'#e0f2fe',color:'#0ea5e9',border:'2px solid #0ea5e9'}
                    : {background:'#f1f3f7',color:'#b8c4d0'}),
                }}>{i < watched ? '✓' : i + 1}</div>
              ))}
            </div>
          </div>

          {/* Session Stats */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f3f7'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Session Stats</div>
            </div>
            <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                {v:d.streak_days||0,l:'Day Streak'},
                {v:d.total_watched||0,l:'Total Videos'},
                {v:`Tier ${d.tier||1}`,l:'Your Level'},
                {v:d.commissions_paused?'Paused':'Active',l:'Commissions',red:d.commissions_paused},
              ].map((s,i) => (
                <div key={i} style={{background:'#f8f9fb',borderRadius:8,padding:'12px 14px',textAlign:'center'}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:s.red?'#ef4444':'#0f172a'}}>{s.v}</div>
                  <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginTop:3}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Video list */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f3f7',fontSize:12,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1}}>Up Next</div>
            <div style={{maxHeight:280,overflowY:'auto',padding:'8px 12px'}}>
              {videos.map((v,i) => (
                <div key={v.id} onClick={() => setCurrentIdx(i)} style={{
                  display:'flex',alignItems:'center',gap:10,padding:'10px 10px',borderRadius:6,cursor:'pointer',marginBottom:2,
                  background:i===currentIdx?'rgba(14,165,233,.04)':'transparent',
                }}>
                  <div style={{
                    width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,
                    ...(v.is_watched ? {background:'#dcfce7',color:'#16a34a'} : i===currentIdx ? {background:'#e0f2fe',color:'#0ea5e9',border:'1px solid #bae6fd'} : {background:'#f1f3f7',color:'#b8c4d0'}),
                  }}>{v.is_watched ? '✓' : i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:i===currentIdx?'#0f172a':'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</div>
                    <div style={{fontSize:10,color:'#b8c4d0'}}>{v.platform}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
