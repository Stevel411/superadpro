import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { Trophy, Users, Zap, GraduationCap, Crown, TrendingUp } from 'lucide-react';

// TABS moved inside component

var RANK_STYLES = [
  { bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#92400e', border: '#fcd34d', glow: 'rgba(251,191,36,0.4)' },
  { bg: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', color: 'var(--sap-text-secondary)', border: 'var(--sap-text-ghost)', glow: 'rgba(148,163,184,0.4)' },
  { bg: 'linear-gradient(135deg,#fed7aa,#fdba74)', color: '#9a3412', border: '#fb923c', glow: 'rgba(251,146,60,0.4)' },
];

function PodiumCard({ user, place, tab }) {
  var heights = { 1: 110, 2: 80, 3: 60 };
  var sizes =   { 1: 68,  2: 56, 3: 52 };
  var medals =  { 1: '🥇', 2: '🥈', 3: '🥉' };
  var rs = RANK_STYLES[place - 1];
  var val = tab.metric(user);
  var isFirst = place === 1;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex: isFirst ? '0 0 180px' : '0 0 150px' }}>
      {isFirst ? <div style={{ fontSize:26, marginBottom:6, animation:'float 3s ease-in-out infinite' }}>👑</div> : <div style={{ height:38 }}/>}
      <div style={{ position:'relative', marginBottom:10 }}>
        <div style={{
          width:sizes[place], height:sizes[place], borderRadius:sizes[place]*0.28,
          background:tab.grad, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:sizes[place]*0.42, fontWeight:800, color:'#fff', fontFamily:'Sora,sans-serif',
          border:`3px solid ${rs.border}`, boxShadow:`0 0 ${isFirst?28:16}px ${rs.glow}`,
        }}>{(user.first_name||user.username||'U')[0].toUpperCase()}</div>
        <div style={{ position:'absolute', bottom:-8, right:-8, fontSize:isFirst?22:16 }}>{medals[place]}</div>
      </div>
      <div style={{ fontWeight:800, fontSize:isFirst?14:12, color:'var(--sap-text-primary)', textAlign:'center', marginBottom:2, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {user.first_name||user.username}
      </div>
      <div style={{ fontFamily:'Sora,sans-serif', fontSize:isFirst?20:15, fontWeight:900, color:tab.color, marginBottom:12 }}>{val}</div>
      <div style={{ width:'100%', height:heights[place], background:`linear-gradient(180deg,${tab.color}20,${tab.color}06)`, border:`1px solid ${tab.color}25`, borderBottom:'none', borderRadius:'12px 12px 0 0', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'Sora,sans-serif', fontSize:isFirst?48:36, fontWeight:900, color:`${tab.color}18` }}>{place}</span>
      </div>
    </div>
  );
}

function Spin() {
  return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'var(--sap-accent)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;
}

export default function Leaderboard() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var TABS = [
    { key: 'referrals', label: t('leaderboard.membersReferred'), icon: Users, color: 'var(--sap-accent)', grad: 'linear-gradient(135deg,#0284c7,#38bdf8)', metric: function(u){ return u.personal_referrals || 0; }, metricLabel: t('leaderboard.referrals') },
    { key: 'grid', label: t('leaderboard.gridMembers'), icon: Zap, color: 'var(--sap-green-mid)', grad: 'linear-gradient(135deg,#059669,#34d399)', metric: function(u){ return u._grid_count || u.grid_count || 0; }, metricLabel: t('leaderboard.grid') },
    { key: 'courses', label: t('leaderboard.courseSales'), icon: GraduationCap, color: 'var(--sap-purple)', grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)', metric: function(u){ return u.course_sale_count || u._course_count || 0; }, metricLabel: t('leaderboard.sales') },
  ];
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [tab, setTab] = useState('referrals');

  useEffect(function() {
    apiGet('/api/leaderboard').then(function(d){ setData(d); setLoading(false); }).catch(function(){ setLoading(false); });
  }, []);

  if (loading) return <AppLayout title={t("leaderboard.title")}><Spin/></AppLayout>;

  var d = data || {};
  var allData = { referrals: d.ref_leaders||[], grid: d.grid_users||[], courses: d.course_users||[] };
  var activeTab = TABS.find(function(tb){ return tb.key===tab; })||TABS[0];
  var leaders = allData[tab]||[];
  var maxVal = leaders.length>0 ? Math.max(1, activeTab.metric(leaders[0])) : 1;
  var myRank = leaders.findIndex(function(u){ return u.id===user?.id; });

  return (
    <AppLayout title={t("leaderboard.title")} subtitle={t("leaderboard.subtitle")}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── Hero ── */}
      <div style={{ background:'linear-gradient(135deg,#172554 0%,#172554 50%,#172554 100%)', borderRadius:20, padding:'32px 36px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        {[...Array(8)].map(function(_,i){
          return <div key={i} style={{ position:'absolute', borderRadius:'50%', width:[6,8,5,10,6,4,8,5][i], height:[6,8,5,10,6,4,8,5][i], background:activeTab.color, opacity:0.12+(i%3)*0.08, left:`${[8,18,35,55,70,82,90,45][i]}%`, top:`${[20,70,40,15,60,30,75,85][i]}%`, animation:`float ${2.5+i*0.4}s ease-in-out infinite`, animationDelay:`${i*0.3}s` }}/>;
        })}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#fbbf24,#f59e0b)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 24px rgba(251,191,36,0.4)' }}>
              <Trophy size={28} color="#fff"/>
            </div>
            <div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:900, color:'#fff' }}>{t('leaderboard.affiliateLeaderboard')} <span style={{ color:'var(--sap-amber-bright)' }}>{t('leaderboard.leaderboardHighlight')}</span></div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{t('leaderboard.topPerformers')}</div>
            </div>
          </div>
          {myRank>=0 && (
            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, padding:'12px 20px', textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{t('leaderboard.yourRank')}</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'var(--sap-amber-bright)' }}>#{myRank+1}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{t('leaderboard.of', {count: leaders.length})}</div>
            </div>
          )}
        </div>

        {/* Category tabs inside hero */}
        <div style={{ display:'flex', gap:10, marginTop:24, position:'relative' }}>
          {TABS.map(function(tb){
            var count=(allData[tb.key]||[]).length;
            var Icon=tb.icon;
            var isActive=tab===tb.key;
            return (
              <div key={tb.key} onClick={function(){ setTab(tb.key); }} style={{ flex:1, background:isActive?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)', border:isActive?`1px solid ${tb.color}60`:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all .2s', boxShadow:isActive?`0 0 20px ${tb.color}20`:'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:isActive?tb.grad:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={14} color={isActive?'#fff':'rgba(255,255,255,0.3)'}/>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:isActive?'#fff':'rgba(255,255,255,0.4)' }}>{tb.label}</span>
                </div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:900, color:isActive?tb.color:'rgba(255,255,255,0.2)' }}>{count}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{t('leaderboard.onTheBoard')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {leaders.length===0 ? (
        <div style={{ textAlign:'center', padding:'64px 32px', background:'#fff', borderRadius:16, border:'1px solid #e8ecf2' }}>
          <div style={{ fontSize:56, marginBottom:12, opacity:0.25 }}>🏆</div>
          <div style={{ fontSize:18, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:6 }}>{t('leaderboard.noActivityYet')}</div>
          <div style={{ fontSize:13, color:'var(--sap-text-muted)' }}>{t('leaderboard.beFirst')}</div>
        </div>
      ) : (
        <>
          {/* ── Podium ── */}
          {leaders.length>=3 && (
            <div style={{ background:'#fff', borderRadius:20, border:'1px solid #e8ecf2', padding:'28px 24px 0', marginBottom:20, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <span style={{ fontSize:13, fontWeight:800, letterSpacing:2, textTransform:'uppercase', color:'var(--sap-text-muted)' }}>{t('leaderboard.topPerformersLabel')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:8 }}>
                <PodiumCard user={leaders[1]} place={2} tab={activeTab}/>
                <PodiumCard user={leaders[0]} place={1} tab={activeTab}/>
                <PodiumCard user={leaders[2]} place={3} tab={activeTab}/>
              </div>
            </div>
          )}

          {/* ── Rankings Table ── */}
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8ecf2', overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)', animation:'fadeUp .3s ease-out' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={16} color={activeTab.color}/>
              <span style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:800, color:'var(--sap-text-primary)' }}>{t('leaderboard.fullRankings')}</span>
              <span style={{ fontSize:13, color:'var(--sap-text-muted)', marginLeft:4 }}>— {activeTab.label}</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--sap-bg-input)' }}>
                  {[t('leaderboard.rank'),t('leaderboard.member'),t('leaderboard.tierLabel'),activeTab.metricLabel,t('leaderboard.progress')].map(function(h,i){
                    return <th key={h} style={{ fontSize:13, fontWeight:800, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:1, padding:'10px 16px', borderBottom:'1px solid #e8ecf2', textAlign:i>=3?'right':'left' }}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {leaders.slice(0,20).map(function(u,i){
                  var isMe=u.id===user?.id;
                  var val=activeTab.metric(u);
                  var pct=Math.round((val/maxVal)*100);
                  var rs=RANK_STYLES[i]||null;
                  var medals=['🥇','🥈','🥉'];
                  return (
                    <tr key={u.id||i}
                      style={{ background:isMe?`${activeTab.color}08`:'transparent', borderLeft:isMe?`3px solid ${activeTab.color}`:'3px solid transparent', transition:'background .15s' }}
                      onMouseEnter={function(e){if(!isMe)e.currentTarget.style.background='#fafbfc';}}
                      onMouseLeave={function(e){if(!isMe)e.currentTarget.style.background='transparent';}}
                    >
                      <td style={{ padding:'12px 16px', borderBottom:'1px solid #f5f6f8' }}>
                        {i<3 ? (
                          <div style={{ width:34, height:34, borderRadius:10, background:rs.bg, border:`1px solid ${rs.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:`0 2px 8px ${rs.glow}` }}>{medals[i]}</div>
                        ) : (
                          <div style={{ width:34, height:34, borderRadius:10, background:'var(--sap-bg-input)', border:'1px solid #e8ecf2', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Sora,sans-serif', fontSize:13, fontWeight:800, color:'var(--sap-text-muted)' }}>{i+1}</div>
                        )}
                      </td>
                      <td style={{ padding:'12px 16px', borderBottom:'1px solid #f5f6f8' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:38, height:38, borderRadius:11, background:i<3?activeTab.grad:'linear-gradient(135deg,#e2e8f0,#cbd5e1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:i<3?'#fff':'var(--sap-text-muted)', flexShrink:0, fontFamily:'Sora,sans-serif', boxShadow:i<3?`0 2px 8px ${activeTab.color}30`:'none' }}>
                            {(u.first_name||u.username||'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--sap-text-primary)', display:'flex', alignItems:'center', gap:6 }}>
                              {u.first_name||u.username}
                              {isMe && <span style={{ fontSize:13, fontWeight:700, padding:'2px 7px', borderRadius:5, background:`${activeTab.color}15`, color:activeTab.color }}>{t('leaderboard.you')}</span>}
                              {i===0 && <Crown size={12} color="var(--sap-amber)"/>}
                            </div>
                            <div style={{ fontSize:13, color:'var(--sap-text-muted)' }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', borderBottom:'1px solid #f5f6f8' }}>
                        <span style={{ fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:6, background:`${activeTab.color}10`, color:activeTab.color, border:`1px solid ${activeTab.color}20` }}>{t('leaderboard.tierLabel')} {u.grid_tier||0}</span>
                      </td>
                      <td style={{ padding:'12px 16px', borderBottom:'1px solid #f5f6f8', textAlign:'right' }}>
                        <span style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:900, color:i<3?activeTab.color:'var(--sap-text-primary)' }}>{val}</span>
                        <div style={{ fontSize:13, color:'var(--sap-text-muted)', fontWeight:600, marginTop:1 }}>{activeTab.metricLabel}</div>
                      </td>
                      <td style={{ padding:'12px 16px', borderBottom:'1px solid #f5f6f8', textAlign:'right', width:140 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                          <div style={{ flex:1, height:6, background:'var(--sap-bg-page)', borderRadius:99, overflow:'hidden', minWidth:80 }}>
                            <div style={{ height:'100%', borderRadius:99, background:i<3?activeTab.grad:`${activeTab.color}60`, width:`${pct}%`, transition:'width .8s ease-out' }}/>
                          </div>
                          <span style={{ fontSize:13, fontWeight:700, color:'var(--sap-text-muted)', minWidth:28, textAlign:'right' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {leaders.length>20 && (
              <div style={{ padding:'12px 20px', textAlign:'center', fontSize:12, color:'var(--sap-text-muted)', borderTop:'1px solid #f1f5f9' }}>
                {t('leaderboard.showingTop', {count: leaders.length})}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Community Activity Feed + Platform Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, marginTop:20 }}>
        {/* Activity Feed */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8ecf2', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--sap-green-bright)', animation:'pulse 2s infinite' }}/>
            <span style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:800, color:'var(--sap-text-primary)' }}>{t('leaderboard.liveActivity')}</span>
          </div>
          <div style={{ maxHeight:340, overflowY:'auto' }}>
            {(d.activity||[]).length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--sap-text-muted)', fontSize:13 }}>{t('leaderboard.noRecentActivity')}</div>
            ) : (d.activity||[]).map(function(a, i) {
              var timeAgo = '';
              if (a.time) {
                var diff = (Date.now() - new Date(a.time).getTime()) / 1000;
                if (diff < 60) timeAgo = t('leaderboard.justNow');
                else if (diff < 3600) timeAgo = t('leaderboard.mAgo', {m: Math.floor(diff / 60)});
                else if (diff < 86400) timeAgo = t('leaderboard.hAgo', {h: Math.floor(diff / 3600)});
                else timeAgo = t('leaderboard.dAgo', {d: Math.floor(diff / 86400)});
              }
              return (
                <div key={i} style={{ padding:'12px 20px', borderBottom:'1px solid #f8f9fb', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontSize:18, flexShrink:0 }}>{a.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'var(--sap-text-primary)', fontWeight:500 }}>{a.text}</div>
                  </div>
                  <div style={{ fontSize:13, color:'var(--sap-text-ghost)', flexShrink:0 }}>{timeAgo}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Stats */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:8 }}>{t('leaderboard.activeMembers')}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:900, color:'#fff' }}>{(d.stats||{}).total_members||0}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.3)', marginTop:4 }}>{t('leaderboard.andGrowing')}</div>
          </div>
          <div style={{ background:'linear-gradient(135deg,#065f46,#059669)', borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:8 }}>{t('leaderboard.totalEarnedByMembers')}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:900, color:'#fff' }}>${Math.round((d.stats||{}).total_earned||0).toLocaleString()}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.3)', marginTop:4 }}>{t('leaderboard.paidOut')}</div>
          </div>
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8ecf2', padding:'20px', textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--sap-text-primary)', marginBottom:8 }}>{t('leaderboard.wantToBeOnBoard')}</div>
            <div style={{ fontSize:12, color:'var(--sap-text-muted)', lineHeight:1.6, marginBottom:12 }}>{t('leaderboard.shareAndClimb')}</div>
            <a href="/affiliate" style={{ display:'inline-block', padding:'10px 24px', background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:800, textDecoration:'none' }}>{t('leaderboard.shareYourLink')}</a>
          </div>
        </div>
      </div>

      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}'}</style>
    </AppLayout>
  );
}
