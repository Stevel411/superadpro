import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Flame, Check, Star, ChevronDown, ChevronUp } from 'lucide-react';

function Spin() {
  return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'#f59e0b', borderRadius:'50%', animation:'spin .8s linear infinite' }}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;
}

var DOT_COLORS = {
  done: '#22c55e',
  today: '#fbbf24',
  today_done: '#22c55e',
  missed: '#ef4444',
  future: 'rgba(255,255,255,0.08)',
};

var WEEK_COLORS = ['#22c55e', '#f59e0b', '#8b5cf6', '#0ea5e9'];

export default function Challenge() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [completing, setCompleting] = useState(null);
  var [showWeeks, setShowWeeks] = useState(false);

  function load() {
    apiGet('/api/challenge').then(function(d) { setData(d); setLoading(false); }).catch(function() { setLoading(false); });
  }

  useEffect(load, []);

  function completeTask(taskId) {
    setCompleting(taskId);
    apiPost('/api/challenge/complete-task', { task_id: taskId }).then(function(r) {
      setCompleting(null);
      if (r.ok) load();
    }).catch(function() { setCompleting(null); });
  }

  if (loading) return <AppLayout title="30-Day Challenge"><Spin/></AppLayout>;

  if (!data || !data.started) {
    return (
      <AppLayout title="30-Day Challenge" subtitle="Your guided path to success">
        <div style={{ textAlign:'center', padding:'80px 32px', background:'#fff', borderRadius:16, border:'1px solid #e8ecf2' }}>
          <div style={{ fontSize:56, marginBottom:16, opacity:0.3 }}>&#128293;</div>
          <div style={{ fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Challenge starts when you activate</div>
          <div style={{ fontSize:14, color:'#94a3b8', maxWidth:400, margin:'0 auto', lineHeight:1.7 }}>Activate your membership to begin the 30-Day Launch Challenge. Daily tasks, XP rewards, and badges to guide your first month.</div>
          <Link to="/upgrade" style={{ display:'inline-block', marginTop:20, padding:'12px 32px', borderRadius:10, background:'linear-gradient(135deg,#f59e0b,#fbbf24)', color:'#fff', fontSize:14, fontWeight:800, textDecoration:'none' }}>Activate Now</Link>
        </div>
      </AppLayout>
    );
  }

  var d = data;
  var R = 28, C = 2 * Math.PI * R;
  var ringOffset = C - (C * (d.pct || 0) / 100);
  var currentWeek = Math.ceil(d.current_day / 7);

  return (
    <AppLayout title="30-Day Challenge" subtitle="Your guided path to SuperAdPro success">
      <style>{`
        @keyframes chPulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.4)}70%{box-shadow:0 0 0 8px rgba(251,191,36,0)}}
      `}</style>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0f1d3a 0%,#172554 50%,#172554 100%)', borderRadius:20, padding:'28px 32px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'rgba(255,255,255,.4)' }}>30-day launch challenge</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#fff', marginTop:6 }}>Day {d.current_day} of 30</div>
          </div>
          <svg width="68" height="68" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
            <circle cx="32" cy="32" r={R} fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset} style={{ transform:'rotate(-90deg)', transformOrigin:'center' }}/>
            <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fill="#fbbf24" style={{ fontSize:16, fontWeight:900 }}>{d.pct}%</text>
          </svg>
        </div>

        {/* 30 dot streak */}
        <div style={{ display:'flex', gap:4, marginBottom:20, flexWrap:'wrap' }}>
          {(d.day_dots || []).map(function(status, i) {
            var isToday = status === 'today' || status === 'today_done';
            return (
              <div key={i} style={{
                width:18, height:18, borderRadius:'50%',
                background: DOT_COLORS[status] || DOT_COLORS.future,
                border: isToday ? '2px solid #fff' : 'none',
                animation: isToday && status === 'today' ? 'chPulse 2s infinite' : 'none',
              }} title={'Day ' + (i + 1)}/>
            );
          })}
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:12 }}>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#22c55e' }}>{d.streak}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Day streak</div>
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#fbbf24' }}>{d.xp}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>XP earned</div>
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#8b5cf6' }}>{(d.badges || []).length}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Badges</div>
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#0ea5e9' }}>{d.days_completed}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Days done</div>
          </div>
        </div>
      </div>

      {/* Today's tasks */}
      <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Today's tasks — Day {d.current_day}</div>
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8ecf2', overflow:'hidden', marginBottom:20 }}>
        {(d.tasks || []).map(function(t, i) {
          var isDone = t.completed;
          return (
            <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 20px', borderBottom: i < d.tasks.length - 1 ? '1px solid #f5f6f8' : 'none' }}>
              <div style={{
                width:24, height:24, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1,
                background: isDone ? '#f0fdf4' : '#fefce8',
                border: isDone ? '1px solid #bbf7d0' : '1px solid #fde68a',
              }}>
                {isDone ? <Check size={14} color="#22c55e" strokeWidth={3}/> : <div style={{ width:8, height:8, borderRadius:'50%', background:'#fbbf24' }}/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color: isDone ? '#94a3b8' : '#0f172a', textDecoration: isDone ? 'line-through' : 'none' }}>{t.title}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>+{t.xp} XP</div>
              </div>
              {isDone ? (
                <span style={{ fontSize:11, fontWeight:700, color:'#22c55e', padding:'4px 12px', borderRadius:6, background:'#f0fdf4' }}>Done</span>
              ) : (
                <button onClick={function() { completeTask(t.id); }}
                  disabled={completing === t.id}
                  style={{ fontSize:12, fontWeight:700, color:'#fff', padding:'6px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
                    background: completing === t.id ? '#94a3b8' : '#f59e0b',
                  }}>
                  {completing === t.id ? '...' : 'Do it'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming milestone */}
      {d.next_milestone && (
        <>
          <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Upcoming milestone</div>
          <div style={{ background:'#fff', borderRadius:14, border:'2px solid #fde68a', padding:'18px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Star size={24} color="#f59e0b" fill="#f59e0b"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>{d.next_milestone.title}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:3, lineHeight:1.5 }}>{d.next_milestone.desc}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:11, color:'#94a3b8' }}>{d.next_milestone.days_left === 0 ? 'Today!' : d.next_milestone.days_left + ' days left'}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b', marginTop:2 }}>+{d.next_milestone.xp} XP</div>
            </div>
          </div>
        </>
      )}

      {/* Week structure */}
      <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>Challenge structure</span>
        <button onClick={function() { setShowWeeks(!showWeeks); }}
          style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#94a3b8', fontFamily:'inherit' }}>
          {showWeeks ? 'Hide' : 'Show'} {showWeeks ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </div>

      {showWeeks && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {(d.weeks || []).map(function(w, i) {
            var isCurrentWeek = currentWeek === w.week;
            var isPast = w.week < currentWeek;
            var clr = WEEK_COLORS[i] || '#94a3b8';
            return (
              <div key={w.week} style={{
                background: isPast ? '#f0fdf4' : isCurrentWeek ? '#fefce8' : '#f8fafc',
                border: isPast ? '1px solid #bbf7d0' : isCurrentWeek ? '1px solid #fde68a' : '1px solid #e2e8f0',
                borderRadius:12, padding:'14px 12px', textAlign:'center',
              }}>
                <div style={{ fontSize:13, fontWeight:700, color: isPast ? '#166534' : isCurrentWeek ? '#854d0e' : '#475569' }}>Week {w.week}</div>
                <div style={{ fontSize:11, color: isPast ? '#16a34a' : isCurrentWeek ? '#a16207' : '#64748b', marginTop:3 }}>{w.title}</div>
                <div style={{ fontSize:10, color: isPast ? '#86efac' : isCurrentWeek ? '#fbbf24' : '#94a3b8', marginTop:4 }}>{w.desc.split(',')[0]}</div>
                {isPast && <div style={{ marginTop:6 }}><Check size={14} color="#22c55e"/></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Badges earned */}
      {d.badges && d.badges.length > 0 && (
        <>
          <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Badges earned</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
            {d.badges.map(function(b) {
              var badgeInfo = {
                week1: { title: 'Week 1 Complete', color: '#22c55e', bg: '#f0fdf4' },
                week2: { title: 'Week 2 Complete', color: '#f59e0b', bg: '#fefce8' },
                week3: { title: 'Week 3 Complete', color: '#8b5cf6', bg: '#faf5ff' },
                champion: { title: 'Challenge Champion', color: '#0ea5e9', bg: '#ecfeff' },
              };
              var info = badgeInfo[b] || { title: b, color: '#64748b', bg: '#f8fafc' };
              return (
                <div key={b} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, background:info.bg, border:'1px solid ' + info.color + '30' }}>
                  <Star size={16} color={info.color} fill={info.color}/>
                  <span style={{ fontSize:13, fontWeight:700, color:info.color }}>{info.title}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Challenge complete banner */}
      {d.is_complete && (
        <div style={{ background:'linear-gradient(135deg,#f0fdf4,#ecfeff)', border:'2px solid #86efac', borderRadius:16, padding:'32px', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>&#127942;</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#166534' }}>Challenge Complete!</div>
          <div style={{ fontSize:14, color:'#16a34a', marginTop:8, lineHeight:1.6 }}>You've completed the 30-Day Launch Challenge. You earned {d.xp} XP and {(d.badges || []).length} badges. You're officially a SuperAdPro pro!</div>
        </div>
      )}

      <div style={{ height:80 }}/>
    </AppLayout>
  );
}
