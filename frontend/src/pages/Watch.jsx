import { useState, useEffect, useRef, useCallback } from 'react';
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

  // Countdown timer
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

  // Tab visibility detection
  useEffect(() => {
    const handleVis = () => {
      if (document.hidden && counting) setPaused(true);
    };
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

  const startWatching = () => {
    setCounting(true);
    setPaused(false);
    setTimeLeft(30);
    setWatchComplete(false);
  };

  const completeWatch = async () => {
    const video = data.videos[currentIdx];
    if (!video) return;
    try {
      await apiPost('/api/watch/complete', { video_id: video.id });
      // Refresh data
      const newData = await apiGet('/api/watch');
      setData(newData);
      setCounting(false);
      setWatchComplete(false);
      setTimeLeft(30);
      // Move to next video
      if (currentIdx < (newData.videos?.length || 0) - 1) {
        setCurrentIdx(currentIdx + 1);
      }
    } catch (e) { alert(e.message); }
  };

  if (loading) return <AppLayout title="Watch to Earn"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;
  if (!data) return <AppLayout title="Watch to Earn"><div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Unable to load</div></AppLayout>;

  const d = data;
  const videos = d.videos || [];
  const current = videos[currentIdx];
  const quotaReached = d.quota_reached;
  const circumference = 2 * Math.PI * 25;
  const dashOffset = circumference - ((30 - timeLeft) / 30) * circumference;

  // Quota complete state
  if (quotaReached) {
    return (
      <AppLayout title="Watch to Earn" subtitle="Complete your daily quota to stay commission-eligible">
        <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:18,padding:'48px 36px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',position:'relative',overflow:'hidden',maxWidth:900,margin:'0 auto'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'linear-gradient(90deg,#0ea5e9,#38bdf8,#22c55e)'}}/>
          <div style={{fontSize:52,marginBottom:14}}>🎉</div>
          <div style={{display:'inline-block',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#22c55e',background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',padding:'4px 14px',borderRadius:20,marginBottom:12}}>✓ Daily Quota Complete</div>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,background:'linear-gradient(135deg,#0ea5e9,#22c55e)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:8}}>You're done for today!</div>
          <div style={{fontSize:14,color:'#3d5068',lineHeight:1.7,marginBottom:28,maxWidth:420,margin:'0 auto 28px'}}>You watched {d.watched_today} video{d.watched_today !== 1 ? 's' : ''} today. Come back tomorrow for your next quota.</div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:28}}>
            <div style={{background:'#f6f8fc',border:'1px solid rgba(15,25,60,.07)',borderRadius:12,padding:'16px 24px',minWidth:120}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#0ea5e9'}}>{d.watched_today}/{d.daily_limit}</div>
              <div style={{fontSize:10,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,marginTop:3}}>Videos Today</div>
            </div>
            <div style={{background:'#f6f8fc',border:'1px solid rgba(15,25,60,.07)',borderRadius:12,padding:'16px 24px',minWidth:120}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#22c55e'}}>${d.earned_today?.toFixed(2)}</div>
              <div style={{fontSize:10,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,marginTop:3}}>Earned Today</div>
            </div>
            <div style={{background:'#f6f8fc',border:'1px solid rgba(15,25,60,.07)',borderRadius:12,padding:'16px 24px',minWidth:120}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#0ea5e9'}}>{d.total_minutes}m</div>
              <div style={{fontSize:10,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,marginTop:3}}>Watch Time</div>
            </div>
          </div>
          <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(180deg,#38bdf8,#0ea5e9)',borderRadius:10,padding:'13px 32px',textDecoration:'none',boxShadow:'0 4px 0 #0284c7'}}>← Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  // No videos available
  if (videos.length === 0) {
    return (
      <AppLayout title="Watch to Earn" subtitle="Complete your daily quota to stay commission-eligible">
        <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:18,padding:'56px 32px',textAlign:'center',maxWidth:900,margin:'0 auto',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)'}}>
          <div style={{fontSize:48,marginBottom:16,opacity:0.5}}>📺</div>
          <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:6}}>No campaigns available right now</div>
          <div style={{fontSize:14,color:'#7b91a8',marginBottom:24}}>Check back soon — advertisers are adding new video campaigns daily.</div>
          <Link to="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(180deg,#38bdf8,#0ea5e9)',borderRadius:10,padding:'12px 28px',textDecoration:'none',boxShadow:'0 4px 0 #0284c7'}}>← Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Watch to Earn" subtitle="Complete your daily quota to stay commission-eligible">
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:20,alignItems:'start'}}>
        {/* Left: Player */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)'}}>
            {/* Header */}
            <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(15,25,60,.06)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{current?.title || 'Loading...'}</div>
                <div style={{fontSize:12,color:'#7b91a8',marginTop:2}}>{current?.platform || 'Video'} · {current?.category || 'General'}</div>
              </div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#0ea5e9',background:'rgba(14,165,233,0.08)',padding:'4px 12px',borderRadius:20,whiteSpace:'nowrap'}}>Campaign</div>
            </div>
            {/* Video */}
            <div style={{position:'relative',width:'100%',aspectRatio:'16/9',background:'#000',overflow:'hidden'}}>
              {current?.embed_url ? (
                <iframe src={current.embed_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}} allowFullScreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"/>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',color:'#475569',fontSize:14}}>No video URL</div>
              )}
              {/* Pause overlay */}
              {paused && (
                <div style={{position:'absolute',inset:0,background:'rgba(5,13,26,0.92)',zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,backdropFilter:'blur(8px)'}}>
                  <div style={{fontSize:28}}>⚠️</div>
                  <div style={{fontSize:16,fontWeight:800,color:'#fbbf24'}}>Video Paused</div>
                  <div style={{fontSize:13,color:'rgba(200,220,255,.5)'}}>Click here or switch back to resume</div>
                  <button onClick={() => setPaused(false)} style={{padding:'10px 24px',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',border:'none',borderRadius:10,fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer',marginTop:8}}>▶ Resume</button>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,background:'#f6f8fc',borderTop:'1px solid rgba(15,25,60,.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                {/* Timer circle */}
                <div style={{width:56,height:56,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="56" height="56" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                    <defs><linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
                    <circle cx="28" cy="28" r="25" fill="none" stroke="#eef1f8" strokeWidth="5"/>
                    <circle cx="28" cy="28" r="25" fill="none" stroke="url(#timerGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={counting ? dashOffset : circumference} style={{transition:'stroke-dashoffset 1s linear'}}/>
                  </svg>
                  <span style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',zIndex:1}}>{timeLeft}</span>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:counting?700:600,color:watchComplete?'#22c55e':counting?'#0ea5e9':'#7b91a8'}}>
                    {watchComplete ? '✓ Watch Complete!' : counting ? (paused ? '⚠ Paused' : 'Watching...') : 'Click Start to begin'}
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>30 seconds required per video</div>
                </div>
              </div>
              {!counting && !watchComplete && (
                <button onClick={startWatching} disabled={current?.is_watched} style={{fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(180deg,#38bdf8,#0ea5e9)',border:'none',borderRadius:10,padding:'12px 28px',cursor:current?.is_watched?'default':'pointer',opacity:current?.is_watched?0.35:1,whiteSpace:'nowrap',boxShadow:'0 4px 0 #0284c7'}}>
                  {current?.is_watched ? '✓ Already Watched' : '▶ Start Watching'}
                </button>
              )}
              {watchComplete && (
                <button onClick={completeWatch} style={{fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(180deg,#22c55e,#16a34a)',border:'none',borderRadius:10,padding:'12px 28px',cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 4px 0 #15803d'}}>
                  ✓ Claim & Next →
                </button>
              )}
            </div>
          </div>
          <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',lineHeight:1.6}}>Videos must be watched for a minimum of 30 seconds with the tab active. Tabbing away will pause the timer.</div>
        </div>

        {/* Right: Progress Panel */}
        <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',position:'sticky',top:90}}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid rgba(15,25,60,.06)'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>Today's Progress</div>
            <div style={{fontSize:12,color:'#7b91a8'}}>{d.watched_today || 0} of {d.daily_limit || 10} complete</div>
          </div>
          <div style={{padding:'16px 18px'}}>
            {/* Progress bar */}
            <div style={{height:6,background:'#eef1f8',borderRadius:99,overflow:'hidden',marginBottom:14}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#0ea5e9,#22c55e)',borderRadius:99,width:`${Math.min(100,((d.watched_today||0)/(d.daily_limit||10))*100)}%`,transition:'width 0.3s'}}/>
            </div>
            {/* Quota dots */}
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:16}}>
              {Array.from({length:d.daily_limit||10}).map((_,i) => (
                <div key={i} style={{width:32,height:32,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,
                  background:i<(d.watched_today||0)?'linear-gradient(135deg,#22c55e,#16a34a)':i===currentIdx&&counting?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'#eef1f8',
                  color:i<(d.watched_today||0)||( i===currentIdx&&counting)?'#fff':'#94a3b8',
                  border:i===currentIdx&&!counting?'2px solid #0ea5e9':'none',
                }}>{i<(d.watched_today||0)?'✓':i+1}</div>
              ))}
            </div>
            {/* Stats */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'#7b91a8'}}>Earned Today</span>
                <span style={{fontWeight:800,color:'#16a34a'}}>${d.earned_today?.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'#7b91a8'}}>All-Time</span>
                <span style={{fontWeight:800,color:'#0ea5e9'}}>${d.total_watch_earnings?.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'#7b91a8'}}>Watch Time</span>
                <span style={{fontWeight:700,color:'#0f172a'}}>{d.total_minutes}m</span>
              </div>
            </div>
          </div>
          {/* Video list */}
          <div style={{borderTop:'1px solid rgba(15,25,60,.06)',padding:'12px 18px',maxHeight:300,overflowY:'auto'}}>
            <div style={{fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Videos</div>
            {videos.map((v,i) => (
              <div key={v.id} onClick={() => { if(!counting) setCurrentIdx(i); }} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 6px',borderRadius:8,cursor:counting?'default':'pointer',background:i===currentIdx?'rgba(14,165,233,.06)':'transparent',marginBottom:2}}>
                <div style={{width:24,height:24,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0,
                  background:v.is_watched?'#dcfce7':i===currentIdx?'#e0f2fe':'#f1f3f7',
                  color:v.is_watched?'#16a34a':i===currentIdx?'#0ea5e9':'#94a3b8',
                }}>{v.is_watched?'✓':i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{v.platform}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
