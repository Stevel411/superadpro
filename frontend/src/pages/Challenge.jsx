import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Flame, Check, Star, ChevronDown, ChevronUp } from 'lucide-react';

function Spin() {
  return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'var(--sap-amber)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;
}

var DOT_COLORS = {
  done: 'var(--sap-green-bright)',
  today: 'var(--sap-amber-bright)',
  today_done: 'var(--sap-green-bright)',
  missed: 'var(--sap-red-bright)',
  future: 'rgba(255,255,255,0.08)',
};

var WEEK_COLORS = ['var(--sap-green-bright)', 'var(--sap-amber)', 'var(--sap-purple)', 'var(--sap-accent)'];

export default function Challenge() {
  var { t } = useTranslation();
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

  if (loading) return <AppLayout title={t("challenge.title")}><Spin/></AppLayout>;

  if (!data || !data.started) {
    return (
      <AppLayout title={t("challenge.title")} subtitle={t("challenge.subtitle")}>
        <div style={{ textAlign:'center', padding:'80px 32px', background:'#fff', borderRadius:16, border:'1px solid #e8ecf2' }}>
          <div style={{ fontSize:56, marginBottom:16, opacity:0.3 }}>&#128293;</div>
          <div style={{ fontSize:20, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:8 }}>{t("challenge.startsWhenActivate")}</div>
          <div style={{ fontSize:14, color:'var(--sap-text-muted)', maxWidth:400, margin:'0 auto', lineHeight:1.7 }}>{t("challenge.activateDesc")}</div>
          <Link to="/upgrade" style={{ display:'inline-block', marginTop:20, padding:'12px 32px', borderRadius:10, background:'linear-gradient(135deg,#f59e0b,#fbbf24)', color:'#fff', fontSize:14, fontWeight:800, textDecoration:'none' }}>{t("challenge.activateNow")}</Link>
        </div>
      </AppLayout>
    );
  }

  var d = data;
  var R = 28, C = 2 * Math.PI * R;
  var ringOffset = C - (C * (d.pct || 0) / 100);
  var currentWeek = Math.ceil(d.current_day / 7);

  return (
    <AppLayout title={t("challenge.title")} subtitle={t("challenge.subtitleFull")}>
      <style>{`
        @keyframes chPulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.4)}70%{box-shadow:0 0 0 8px rgba(251,191,36,0)}}
      `}</style>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#172554 0%,#172554 50%,#172554 100%)', borderRadius:20, padding:'28px 32px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'rgba(255,255,255,.4)' }}>{t("challenge.launchChallenge")}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#fff', marginTop:6 }}>{t("challenge.dayOf", {day: d.current_day})}</div>
          </div>
          <svg width="68" height="68" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
            <circle cx="32" cy="32" r={R} fill="none" stroke="var(--sap-amber-bright)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset} style={{ transform:'rotate(-90deg)', transformOrigin:'center' }}/>
            <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fill="var(--sap-amber-bright)" style={{ fontSize:16, fontWeight:900 }}>{d.pct}%</text>
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
              }} title={t('challenge.dayLabel', {n: i + 1})}/>
            );
          })}
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:12 }}>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--sap-green-bright)' }}>{d.streak}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{t("challenge.dayStreak")}</div>
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--sap-amber-bright)' }}>{d.xp}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{t("challenge.xpEarned")}</div>
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--sap-purple)' }}>{(d.badges || []).length}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{t("challenge.badges")}</div>
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--sap-accent)' }}>{d.days_completed}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{t("challenge.daysDone")}</div>
          </div>
        </div>
      </div>

      {/* Today's tasks */}
      <div style={{ fontSize:15, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:12 }}>{t('challenge.todaysTasks', {day: d.current_day})}</div>
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8ecf2', overflow:'hidden', marginBottom:20 }}>
        {(d.tasks || []).map(function(t, i) {
          var isDone = t.completed;
          return (
            <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 20px', borderBottom: i < d.tasks.length - 1 ? '1px solid #f5f6f8' : 'none' }}>
              <div style={{
                width:24, height:24, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1,
                background: isDone ? 'var(--sap-green-bg)' : '#fefce8',
                border: isDone ? '1px solid #bbf7d0' : '1px solid #fde68a',
              }}>
                {isDone ? <Check size={14} color="var(--sap-green-bright)" strokeWidth={3}/> : <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--sap-amber-bright)' }}/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color: isDone ? 'var(--sap-text-muted)' : 'var(--sap-text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>{t.title}</div>
                <div style={{ fontSize:12, color:'var(--sap-text-muted)', marginTop:2 }}>+{t.xp} XP</div>
              </div>
              {isDone ? (
                <span style={{ fontSize:11, fontWeight:700, color:'var(--sap-green-bright)', padding:'4px 12px', borderRadius:6, background:'var(--sap-green-bg)' }}>{t('challenge.done')}</span>
              ) : (
                <button onClick={function() { completeTask(t.id); }}
                  disabled={completing === t.id}
                  style={{ fontSize:12, fontWeight:700, color:'#fff', padding:'6px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
                    background: completing === t.id ? 'var(--sap-text-muted)' : 'var(--sap-amber)',
                  }}>
                  {completing === t.id ? '...' : t('challenge.doIt')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming milestone */}
      {d.next_milestone && (
        <>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:12 }}>{t("challenge.upcomingMilestone")}</div>
          <div style={{ background:'#fff', borderRadius:14, border:'2px solid #fde68a', padding:'18px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'var(--sap-amber-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Star size={24} color="var(--sap-amber)" fill="var(--sap-amber)"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--sap-text-primary)' }}>{d.next_milestone.title}</div>
              <div style={{ fontSize:12, color:'var(--sap-text-muted)', marginTop:3, lineHeight:1.5 }}>{d.next_milestone.desc}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:11, color:'var(--sap-text-muted)' }}>{d.next_milestone.days_left === 0 ? t('challenge.today') : t('challenge.daysLeft', {count: d.next_milestone.days_left})}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--sap-amber)', marginTop:2 }}>+{d.next_milestone.xp} XP</div>
            </div>
          </div>
        </>
      )}

      {/* Week structure */}
      <div style={{ fontSize:15, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>{t("challenge.challengeStructure")}</span>
        <button onClick={function() { setShowWeeks(!showWeeks); }}
          style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--sap-text-muted)', fontFamily:'inherit' }}>
          {showWeeks ? t('challenge.hide') : t('challenge.show')} {showWeeks ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </div>

      {showWeeks && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {(d.weeks || []).map(function(w, i) {
            var isCurrentWeek = currentWeek === w.week;
            var isPast = w.week < currentWeek;
            var clr = WEEK_COLORS[i] || 'var(--sap-text-muted)';
            return (
              <div key={w.week} style={{
                background: isPast ? 'var(--sap-green-bg)' : isCurrentWeek ? '#fefce8' : 'var(--sap-bg-elevated)',
                border: isPast ? '1px solid #bbf7d0' : isCurrentWeek ? '1px solid #fde68a' : '1px solid #e2e8f0',
                borderRadius:12, padding:'14px 12px', textAlign:'center',
              }}>
                <div style={{ fontSize:13, fontWeight:700, color: isPast ? '#166534' : isCurrentWeek ? '#854d0e' : 'var(--sap-text-secondary)' }}>{t("challenge.week", {n: w.week})}</div>
                <div style={{ fontSize:11, color: isPast ? 'var(--sap-green)' : isCurrentWeek ? '#a16207' : 'var(--sap-text-muted)', marginTop:3 }}>{w.title}</div>
                <div style={{ fontSize:10, color: isPast ? '#86efac' : isCurrentWeek ? 'var(--sap-amber-bright)' : 'var(--sap-text-muted)', marginTop:4 }}>{w.desc.split(',')[0]}</div>
                {isPast && <div style={{ marginTop:6 }}><Check size={14} color="var(--sap-green-bright)"/></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Badges earned */}
      {d.badges && d.badges.length > 0 && (
        <>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:12 }}>{t("challenge.badgesEarned")}</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
            {d.badges.map(function(b) {
              var badgeInfo = {
                week1: { title: t('challenge.week1Complete'), color: 'var(--sap-green-bright)', bg: 'var(--sap-green-bg)' },
                week2: { title: t('challenge.week2Complete'), color: 'var(--sap-amber)', bg: '#fefce8' },
                week3: { title: t('challenge.week3Complete'), color: 'var(--sap-purple)', bg: '#faf5ff' },
                champion: { title: t('challenge.challengeChampion'), color: 'var(--sap-accent)', bg: '#ecfeff' },
              };
              var info = badgeInfo[b] || { title: b, color: 'var(--sap-text-muted)', bg: 'var(--sap-bg-elevated)' };
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
          <div style={{ fontSize:22, fontWeight:900, color:'#166534' }}>{t("challenge.challengeComplete")}</div>
          <div style={{ fontSize:14, color:'var(--sap-green)', marginTop:8, lineHeight:1.6 }}>{t('challenge.challengeCompleteDesc', {xp: d.xp, badges: (d.badges || []).length})}</div>
        </div>
      )}

      <div style={{ height:80 }}/>
    </AppLayout>
  );
}
