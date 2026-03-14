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
  const [counting, setCounting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [paused, setPaused] = useState(false);
  const [watchComplete, setWatchComplete] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    apiGet('/api/watch').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (counting && !paused && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    }
    if (counting && timeLeft <= 0 && !watchComplete) {
      setWatchComplete(true);
      setCounting(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [counting, paused, timeLeft, watchComplete]);

  useEffect(() => {
    const handleVis = () => { if (document.hidden && counting) setPaused(true); };
    const handleBlur = () => { if (counting) setPaused(true); };
    const handleFocus = () => { if (paused) setPaused(false); };
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [counting, paused]);

  const startWatching = () => { setCounting(true); setPaused(false); setTimeLeft(30); setWatchComplete(false); };

  const completeWatch = async () => {
    const video = (data?.videos || [])[currentIdx];
    if (!video) return;
    try {
      await apiPost('/api/watch/complete', { video_id: video.id });
      const newData = await apiGet('/api/watch');
      setData(newData);
      setCounting(false); setWatchComplete(false); setTimeLeft(30);
      if (currentIdx < (newData.videos?.length || 0) - 1) setCurrentIdx(currentIdx + 1);
    } catch (e) { alert(e.message); }
  };

  if (loading) return <AppLayout title="Watch to Earn"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;
  if (!data) return <AppLayout title="Watch to Earn"><div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Unable to load</div></AppLayout>;

  const d = data;
  const videos = d.videos || [];
  const current = videos[currentIdx];
  const quotaReached = d.quota_reached;
  const watched = d.watched_today || 0;
  const limit = d.daily_limit || 10;
  const ringR = 42;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - Math.min(1, watched / limit));
  const timerR = 25;
  const timerC = 2 * Math.PI * timerR;
  const timerOffset = timerC - ((30 - timeLeft) / 30) * timerC;

  // ═══ QUOTA COMPLETE ═══
  if (quotaReached) {
    return (
      <AppLayout title="Watch to Earn" subtitle="Daily quota complete">
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,padding:'48px 36px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#0ea5e9,#22c55e)'}}/>
            <div style={{fontSize:52,marginBottom:14}}>🎉</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:900,color:'#0f172a',marginBottom:8}}>Quota Complete!</div>
            <div style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:28}}>You watched {watched} video{watched !== 1 ? 's' : ''} today. Your commissions are fully qualified.</div>
            <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:28}}>
              {[
                {v:`${watched}/${limit}`,l:'Videos',c:'#16a34a'},
                {v:`$${(d.earned_today||0).toFixed(2)}`,l:'Earned',c:'#16a34a'},
                {v:`${watched*30}s`,l:'Watch Time',c:'#0ea5e9'},
              ].map((s,i) => (
                <div key={i} style={{background:'#f8f9fb',border:'1px solid #e8ecf2',borderRadius:8,padding:'16px 28px',minWidth:100}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginTop:4}}>{s.l}</div>
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
      <AppLayout title="Watch to Earn" subtitle="No campaigns available">
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,padding:'56px 32px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{fontSize:48,marginBottom:16,opacity:.5}}>📺</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:8}}>No Active Campaigns</div>
            <div style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>Check back soon — campaigns are added as advertisers activate their tiers.</div>
            <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:8,padding:'12px 28px',textDecoration:'none'}}>← Dashboard</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ═══ MAIN WATCH SESSION ═══
  return (
    <AppLayout title="Watch to Earn" subtitle="Complete your daily quota to stay commission-eligible">
      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:18,alignItems:'start'}}>

        {/* ═══ LEFT: Player ═══ */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>

            {/* Header */}
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{current?.title || 'Loading...'}</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{current?.platform || 'Video'} · {current?.category || 'General'}</div>
              </div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'5px 14px',borderRadius:8,whiteSpace:'nowrap',
                ...(counting
                  ? {color:'#16a34a',background:'rgba(22,163,74,.08)',border:'1px solid rgba(22,163,74,.15)'}
                  : {color:'#0ea5e9',background:'rgba(14,165,233,.06)',border:'1px solid rgba(14,165,233,.12)'}),
              }}>{counting ? '● Now Playing' : '▶ Ready'}</div>
            </div>

            {/* Video frame */}
            <div style={{position:'relative',width:'100%',aspectRatio:'16/9',background:'#0a0a0a',overflow:'hidden'}}>
              {current?.embed_url ? (
                <iframe src={current.embed_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}} allowFullScreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"/>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',flexDirection:'column',gap:12}}>
                  <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(14,165,233,.12)',border:'1px solid rgba(14,165,233,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  <div style={{fontSize:13,color:'#64748b'}}>Video will appear here</div>
                </div>
              )}

              {/* Pause overlay */}
              {paused && (
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,backdropFilter:'blur(8px)'}}>
                  <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(245,158,11,.15)',border:'1px solid rgba(245,158,11,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏸</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#fbbf24'}}>Video Paused</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,.5)'}}>Timer paused — switch back to this tab to continue</div>
                  <button onClick={() => setPaused(false)} style={{padding:'12px 28px',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',border:'none',borderRadius:8,fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer',marginTop:4}}>▶ Resume Watching</button>
                </div>
              )}
            </div>

            {/* Footer — timer + action */}
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,background:'#f8f9fb',borderTop:'1px solid #f1f3f7'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                {/* Timer ring */}
                <div style={{width:56,height:56,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="56" height="56" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                    <defs><linearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
                    <circle cx="28" cy="28" r={timerR} fill="none" stroke="#eef1f8" strokeWidth="4"/>
                    <circle cx="28" cy="28" r={timerR} fill="none" stroke="url(#tGrad)" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={timerC} strokeDashoffset={counting ? timerOffset : timerC}
                      style={{transition:'stroke-dashoffset 1s linear'}}/>
                  </svg>
                  <span style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:watchComplete?'#16a34a':counting?'#0f172a':'#94a3b8',zIndex:1}}>{timeLeft}</span>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:watchComplete?'#16a34a':counting?(paused?'#d97706':'#0ea5e9'):'#94a3b8'}}>
                    {watchComplete ? '✓ Watch Complete!' : counting ? (paused ? '⚠ Paused — switch back' : '⏱ Watching — stay on this tab') : 'Press Start to begin'}
                  </div>
                  <div style={{fontSize:10,color:'#b8c4d0',marginTop:2}}>30 seconds required per video</div>
                </div>
              </div>

              {!counting && !watchComplete && (
                <button onClick={startWatching} disabled={current?.is_watched} style={{
                  fontSize:14,fontWeight:700,color:'#fff',border:'none',borderRadius:8,padding:'12px 28px',cursor:current?.is_watched?'default':'pointer',whiteSpace:'nowrap',fontFamily:'inherit',
                  background:current?.is_watched?'#cbd5e1':'linear-gradient(135deg,#0ea5e9,#38bdf8)',
                  opacity:current?.is_watched?0.5:1,
                }}>{current?.is_watched ? '✓ Watched' : '▶ Start Watching'}</button>
              )}
              {watchComplete && (
                <button onClick={completeWatch} className="claim-btn" style={{
                  fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#22c55e,#16a34a)',
                  border:'none',borderRadius:8,padding:'12px 28px',cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit',
                }}>✓ Claim & Next →</button>
              )}
            </div>
          </div>

          <div style={{fontSize:11,color:'#b8c4d0',textAlign:'center',lineHeight:1.6}}>Videos must be watched for 30 seconds with this tab active. Tabbing away pauses the timer.</div>
        </div>

        {/* ═══ RIGHT: Progress Panel ═══ */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Progress ring */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f3f7'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Today's Progress</div>
            </div>
            <div style={{padding:'20px',display:'flex',alignItems:'center',gap:18}}>
              <div style={{width:96,height:96,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="96" height="96" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                  <defs><linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
                  <circle cx="48" cy="48" r={ringR} fill="none" stroke="#eef1f8" strokeWidth="6"/>
                  <circle cx="48" cy="48" r={ringR} fill="none" stroke="url(#pGrad)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={ringC} strokeDashoffset={ringOffset} style={{transition:'stroke-dashoffset 0.5s ease'}}/>
                </svg>
                <div style={{textAlign:'center',zIndex:1}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:900,color:'#0f172a'}}>{watched}</div>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>of {limit}</div>
                </div>
              </div>
              <div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#16a34a'}}>{watched}<span style={{fontSize:14,color:'#94a3b8',fontWeight:500}}> / {limit}</span></div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>videos watched</div>
                <div style={{fontSize:12,fontWeight:700,color:watched>=limit?'#16a34a':'#0ea5e9',marginTop:4}}>{watched>=limit?'✓ Quota complete!':`${limit-watched} remaining`}</div>
              </div>
            </div>

            {/* Quota dots */}
            <div style={{padding:'0 20px 16px',display:'flex',flexWrap:'wrap',gap:6}}>
              {Array.from({length:limit}).map((_,i) => (
                <div key={i} style={{
                  width:30,height:30,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,transition:'all .3s',
                  ...(i < watched
                    ? {background:'linear-gradient(135deg,#22c55e,#16a34a)',color:'#fff'}
                    : i === currentIdx && counting
                      ? {background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',animation:'pulseBlue 1.5s ease-in-out infinite'}
                      : {background:'#f1f3f7',color:'#94a3b8',border:'1px solid #e5e7eb'}),
                }}>{i < watched ? '✓' : i + 1}</div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,padding:'16px 20px',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            {[
              {l:'Earned Today',v:`$${(d.earned_today||0).toFixed(2)}`,c:'#16a34a'},
              {l:'All-Time Earnings',v:`$${(d.total_watch_earnings||0).toFixed(2)}`,c:'#0ea5e9'},
              {l:'Total Watch Time',v:`${d.total_minutes||0}m`,c:'#0f172a'},
            ].map((s,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<2?'1px solid #f1f3f7':'none'}}>
                <span style={{fontSize:13,color:'#94a3b8'}}>{s.l}</span>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>

          {/* Video list */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f3f7',fontSize:12,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1}}>Up Next</div>
            <div style={{maxHeight:280,overflowY:'auto',padding:'8px 12px'}}>
              {videos.map((v,i) => (
                <div key={v.id} onClick={() => { if(!counting) setCurrentIdx(i); }} style={{
                  display:'flex',alignItems:'center',gap:10,padding:'10px 10px',borderRadius:6,cursor:counting?'default':'pointer',marginBottom:2,transition:'all .15s',
                  background:i===currentIdx?'rgba(14,165,233,.04)':'transparent',
                }}>
                  <div style={{
                    width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,
                    ...(v.is_watched
                      ? {background:'#dcfce7',color:'#16a34a'}
                      : i===currentIdx
                        ? {background:'#e0f2fe',color:'#0ea5e9',border:'1px solid #bae6fd'}
                        : {background:'#f1f3f7',color:'#b8c4d0'}),
                  }}>{v.is_watched ? '✓' : i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:i===currentIdx?'#0f172a':'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</div>
                    <div style={{fontSize:10,color:'#b8c4d0'}}>{v.platform}</div>
                  </div>
                  {v.is_watched && <span style={{fontSize:9,fontWeight:700,color:'#16a34a',background:'#dcfce7',padding:'2px 6px',borderRadius:4}}>Done</span>}
                  {i===currentIdx && counting && <div style={{width:6,height:6,borderRadius:'50%',background:'#16a34a',animation:'pulseGreen 1s ease-in-out infinite'}}/>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseBlue{0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,.3)}50%{box-shadow:0 0 0 6px rgba(14,165,233,0)}}
        @keyframes pulseGreen{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
        .claim-btn{animation:claimPulse 1.5s ease-in-out infinite}
        @keyframes claimPulse{0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.4)}50%{box-shadow:0 0 0 8px rgba(22,163,74,0)}}
      `}</style>
    </AppLayout>
  );
}
