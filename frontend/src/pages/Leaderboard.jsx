import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { Trophy, Users, UserPlus, Zap, Layers, GraduationCap, Crown, TrendingUp } from 'lucide-react';

// TABS moved inside component

var RANK_STYLES = [
  { bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#92400e', border: '#fcd34d', glow: 'rgba(251,191,36,0.4)' },
  { bg: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', color: 'var(--sap-text-secondary)', border: 'var(--sap-text-ghost)', glow: 'rgba(148,163,184,0.4)' },
  { bg: 'linear-gradient(135deg,#fed7aa,#fdba74)', color: '#9a3412', border: '#fb923c', glow: 'rgba(251,146,60,0.4)' },
];

function PodiumCard({ user, place, tab }) {
  // First place gets the visual emphasis: bigger avatar, taller pedestal,
  // floating crown. 2nd and 3rd are smaller, sit lower on the podium.
  var heights = { 1: 120, 2: 90, 3: 70 };
  var sizes =   { 1: 76,  2: 60, 3: 56 };
  var medals =  { 1: '🥇', 2: '🥈', 3: '🥉' };
  var rs = RANK_STYLES[place - 1];
  var val = tab.metric(user);
  var isFirst = place === 1;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: isFirst ? '0 0 200px' : '0 0 160px',
    }}>
      {/* Crown reserved for 1st place — fixed height block keeps 2nd/3rd
          aligned to the same baseline as 1st despite the crown's extra space. */}
      {isFirst
        ? <div style={{ fontSize: 30, marginBottom: 8, animation: 'float 3s ease-in-out infinite' }}>👑</div>
        : <div style={{ height: 38 }} />
      }
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{
          width: sizes[place], height: sizes[place],
          borderRadius: '50%',
          background: tab.grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: sizes[place] * 0.42, fontWeight: 800, color: '#fff',
          fontFamily: 'Sora, sans-serif',
          border: '3px solid ' + rs.border,
          boxShadow: '0 0 ' + (isFirst ? 32 : 18) + 'px ' + rs.glow,
        }}>{(user.first_name || user.username || 'U')[0].toUpperCase()}</div>
        <div style={{
          position: 'absolute', bottom: -6, right: -6,
          fontSize: isFirst ? 26 : 20,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}>{medals[place]}</div>
      </div>
      <div style={{
        fontWeight: 800, fontSize: isFirst ? 15 : 13,
        color: 'var(--sap-text-primary)', textAlign: 'center',
        marginBottom: 4, maxWidth: 150,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{user.first_name || user.username}</div>
      <div style={{
        fontFamily: 'Sora, sans-serif',
        fontSize: isFirst ? 22 : 16, fontWeight: 900,
        color: tab.color, marginBottom: 14,
      }}>{val}</div>
      {/* Pedestal */}
      <div style={{
        width: '100%', height: heights[place],
        background: 'linear-gradient(180deg, ' + tab.color + '20, ' + tab.color + '06)',
        border: '1px solid ' + tab.color + '25',
        borderBottom: 'none',
        borderRadius: '14px 14px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: isFirst ? 56 : 40, fontWeight: 900,
          color: tab.color + '20',
        }}>{place}</span>
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
  // Five leaderboard categories. Sign-ups (any join via your link) +
  // Active Members (paid-only via personal_referrals) + the three income
  // streams. Default to 'signups' since it fills up faster on new
  // platforms and gives early adopters something to climb.
  var TABS = [
    { key: 'signups',   label: t('leaderboard.signupsLabel', { defaultValue: 'Sign-ups' }),                 icon: UserPlus,      color: '#0ea5e9',                grad: 'linear-gradient(135deg,#0284c7,#38bdf8)', metric: function(u){ return u.total_team || 0; },                  metricLabel: t('leaderboard.signupsMetric', { defaultValue: 'Sign-ups' }) },
    { key: 'referrals', label: t('leaderboard.activeMembersLabel', { defaultValue: 'Active Members' }),     icon: Users,         color: 'var(--sap-green-mid)',  grad: 'linear-gradient(135deg,#059669,#34d399)', metric: function(u){ return u.personal_referrals || 0; },          metricLabel: t('leaderboard.referrals', { defaultValue: 'Active' }) },
    { key: 'grid',      label: t('leaderboard.profitGridLabel', { defaultValue: 'Profit Grid' }),           icon: Zap,           color: '#f59e0b',                grad: 'linear-gradient(135deg,#b45309,#f59e0b)', metric: function(u){ return u._grid_count || u.grid_count || 0; }, metricLabel: t('leaderboard.grid', { defaultValue: 'Team' }) },
    { key: 'nexus',     label: t('leaderboard.nexusLabel', { defaultValue: 'Nexus' }),                      icon: Layers,        color: '#8b5cf6',                grad: 'linear-gradient(135deg,#6d28d9,#a78bfa)', metric: function(u){ return u._nexus_count || 0; },                  metricLabel: t('leaderboard.nexusMetric', { defaultValue: 'Nexus team' }) },
    { key: 'courses',   label: t('leaderboard.courseSales', { defaultValue: 'Course Sales' }),              icon: GraduationCap, color: 'var(--sap-amber-dark)', grad: 'linear-gradient(135deg,#9a3412,#ea580c)', metric: function(u){ return u.course_sale_count || u._course_count || 0; }, metricLabel: t('leaderboard.sales', { defaultValue: 'Sales' }) },
  ];
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [tab, setTab] = useState('signups');

  useEffect(function() {
    apiGet('/api/leaderboard').then(function(d){ setData(d); setLoading(false); }).catch(function(){ setLoading(false); });
  }, []);

  if (loading) return <AppLayout title={t("leaderboard.title")}><Spin/></AppLayout>;

  var d = data || {};
  var allData = {
    signups:   d.signup_users || [],
    referrals: d.ref_leaders  || [],
    grid:      d.grid_users   || [],
    nexus:     d.nexus_users  || [],
    courses:   d.course_users || [],
  };
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

      {/* ── Hero — matches Dashboard cobalt pattern ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sap-cobalt-deep, #172554), var(--sap-cobalt-mid, #1e3a8a))',
        borderRadius: 18,
        padding: '22px 28px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        boxShadow: '0 8px 32px rgba(30,58,138,0.35)',
      }}>
        {/* Left — trophy icon + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 28px rgba(251,191,36,0.45)',
          }}>
            <Trophy size={34} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
              marginBottom: 4,
            }}>{t('leaderboard.heroEyebrow', { defaultValue: 'Affiliate Leaderboard' })}</div>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 900,
              color: '#fff', marginBottom: 6, lineHeight: 1.1,
              letterSpacing: '-0.3px',
            }}>{t('leaderboard.heroTitle', { defaultValue: 'Top performers' })}</div>
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.65)',
            }}>{t('leaderboard.heroSubtitle', { defaultValue: 'Across the SuperAdPro network' })}</div>
          </div>
        </div>

        {/* Right — Your Rank card */}
        {myRank >= 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: '12px 24px',
            textAlign: 'center',
            flexShrink: 0,
            minWidth: 180,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
              marginBottom: 4,
            }}>{t('leaderboard.yourRank', { defaultValue: 'Your rank' })}</div>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 900,
              color: 'var(--sap-amber-bright, #fbbf24)', lineHeight: 1,
            }}>#{myRank+1}</div>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.45)',
              marginTop: 4,
            }}>{t('leaderboard.of', { count: leaders.length, defaultValue: 'of {{count}}' })}</div>
          </div>
        )}
      </div>

      {/* ── Category pill row — same styling as the new top-of-page nav pills.
          Five tabs: Sign-ups · Active Members · Profit Grid · Nexus · Course Sales.
          White bg, cobalt text, soft dark-grey shadow lift. Active pill
          gets cobalt border + stronger shadow + filled icon halo so the
          "you're viewing this leaderboard" cue reads clearly. */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
        marginBottom: 20,
      }}>
        {TABS.map(function(tb) {
          var count = (allData[tb.key]||[]).length;
          var Icon = tb.icon;
          var isActive = tab === tb.key;
          return (
            <button key={tb.key} onClick={function(){ setTab(tb.key); }}
              style={{
                flex: '1 1 180px',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: '#fff',
                border: isActive ? '1px solid var(--sap-cobalt-deep, #172554)' : '1px solid #e2e8f0',
                borderRadius: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                transition: 'all 0.15s',
                boxShadow: isActive
                  ? '0 4px 12px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.08)'
                  : '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
              }}
              onMouseEnter={function(e){ if (!isActive) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(15,23,42,0.1), 0 2px 4px rgba(15,23,42,0.06)'; } }}
              onMouseLeave={function(e){ if (!isActive) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)'; } }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: isActive ? tb.grad : tb.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isActive ? '0 0 14px ' + tb.color + '50' : 'none',
                transition: 'all 0.2s',
              }}>
                <Icon size={16} color={isActive ? '#fff' : tb.color} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--sap-cobalt-deep, #172554)',
                  marginBottom: 2,
                }}>{tb.label}</div>
                <div style={{
                  fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 900,
                  color: tb.color, lineHeight: 1,
                }}>{count} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sap-text-muted, #64748b)' }}>{t('leaderboard.onTheBoard', { defaultValue: 'on the board' })}</span></div>
              </div>
            </button>
          );
        })}
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
          {leaders.length >= 3 && (
            <div style={{
              background: '#fff', borderRadius: 18,
              border: '1px solid #e8ecf2',
              padding: '28px 28px 0',
              marginBottom: 16, overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  letterSpacing: 2, textTransform: 'uppercase',
                  color: 'var(--sap-text-muted)',
                }}>{t('leaderboard.topPerformersLabel', { defaultValue: 'Top performers' })}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: 12,
              }}>
                <PodiumCard user={leaders[1]} place={2} tab={activeTab} />
                <PodiumCard user={leaders[0]} place={1} tab={activeTab} />
                <PodiumCard user={leaders[2]} place={3} tab={activeTab} />
              </div>
            </div>
          )}

          {/* ── Rankings Table ── */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #e8ecf2',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            animation: 'fadeUp .3s ease-out',
          }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: activeTab.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TrendingUp size={16} color={activeTab.color} strokeWidth={2.4} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 800,
                  color: 'var(--sap-text-primary)', lineHeight: 1.2,
                }}>{t('leaderboard.fullRankings', { defaultValue: 'Full rankings' })}</div>
                <div style={{
                  fontSize: 12, color: 'var(--sap-text-muted)',
                  marginTop: 2,
                }}>{activeTab.label}</div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {[t('leaderboard.rank', { defaultValue: 'Rank' }),
                    t('leaderboard.member', { defaultValue: 'Member' }),
                    t('leaderboard.tierLabel', { defaultValue: 'Tier' }),
                    activeTab.metricLabel,
                    t('leaderboard.progress', { defaultValue: 'Progress' })].map(function(h, i) {
                    return <th key={h} style={{
                      fontSize: 11, fontWeight: 800,
                      color: 'var(--sap-text-muted)',
                      textTransform: 'uppercase', letterSpacing: 1,
                      padding: '12px 18px',
                      borderBottom: '1px solid #e8ecf2',
                      textAlign: i >= 3 ? 'right' : 'left',
                    }}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {leaders.slice(0, 20).map(function(u, i) {
                  var isMe = u.id === user?.id;
                  var val = activeTab.metric(u);
                  var pct = Math.round((val / maxVal) * 100);
                  var rs = RANK_STYLES[i] || null;
                  var medals = ['🥇', '🥈', '🥉'];
                  return (
                    <tr key={u.id || i}
                      style={{
                        background: isMe ? activeTab.color + '08' : 'transparent',
                        borderLeft: isMe ? '3px solid ' + activeTab.color : '3px solid transparent',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={function(e) { if (!isMe) e.currentTarget.style.background = '#fafbfc'; }}
                      onMouseLeave={function(e) { if (!isMe) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #f5f6f8' }}>
                        {i < 3 ? (
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: rs.bg,
                            border: '1px solid ' + rs.border,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 17,
                            boxShadow: '0 2px 8px ' + rs.glow,
                          }}>{medals[i]}</div>
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Sora, sans-serif',
                            fontSize: 14, fontWeight: 800,
                            color: 'var(--sap-text-muted)',
                          }}>{i + 1}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #f5f6f8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: i < 3 ? activeTab.grad : 'linear-gradient(135deg,#e2e8f0,#cbd5e1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 800,
                            color: i < 3 ? '#fff' : 'var(--sap-text-muted)',
                            flexShrink: 0,
                            fontFamily: 'Sora, sans-serif',
                            boxShadow: i < 3 ? '0 2px 8px ' + activeTab.color + '30' : 'none',
                          }}>{(u.first_name || u.username || 'U')[0].toUpperCase()}</div>
                          <div>
                            <div style={{
                              fontSize: 14, fontWeight: 700,
                              color: 'var(--sap-text-primary)',
                              display: 'flex', alignItems: 'center', gap: 6,
                              marginBottom: 1,
                            }}>
                              {u.first_name || u.username}
                              {isMe && <span style={{
                                fontSize: 11, fontWeight: 700,
                                padding: '2px 8px', borderRadius: 5,
                                background: activeTab.color + '15',
                                color: activeTab.color,
                              }}>{t('leaderboard.you', { defaultValue: 'You' })}</span>}
                              {i === 0 && <Crown size={13} color="var(--sap-amber)" />}
                            </div>
                            <div style={{
                              fontSize: 12, color: 'var(--sap-text-muted)',
                            }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #f5f6f8' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          padding: '4px 10px', borderRadius: 6,
                          background: activeTab.color + '10',
                          color: activeTab.color,
                          border: '1px solid ' + activeTab.color + '20',
                        }}>{t('leaderboard.tierLabel', { defaultValue: 'Tier' })} {u.grid_tier || 0}</span>
                      </td>
                      <td style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid #f5f6f8',
                        textAlign: 'right',
                      }}>
                        <span style={{
                          fontFamily: 'Sora, sans-serif',
                          fontSize: 18, fontWeight: 900,
                          color: i < 3 ? activeTab.color : 'var(--sap-text-primary)',
                        }}>{val}</span>
                        <div style={{
                          fontSize: 11, color: 'var(--sap-text-muted)',
                          fontWeight: 600, marginTop: 2,
                          textTransform: 'uppercase', letterSpacing: 0.6,
                        }}>{activeTab.metricLabel}</div>
                      </td>
                      <td style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid #f5f6f8',
                        textAlign: 'right', width: 160,
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          justifyContent: 'flex-end',
                        }}>
                          <div style={{
                            flex: 1, height: 7,
                            background: '#f1f5f9',
                            borderRadius: 99, overflow: 'hidden',
                            minWidth: 90,
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              background: i < 3 ? activeTab.grad : activeTab.color + '60',
                              width: pct + '%',
                              transition: 'width .8s ease-out',
                            }} />
                          </div>
                          <span style={{
                            fontSize: 12, fontWeight: 700,
                            color: 'var(--sap-text-muted)',
                            minWidth: 32, textAlign: 'right',
                          }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {leaders.length > 20 && (
              <div style={{
                padding: '14px 22px', textAlign: 'center',
                fontSize: 12, color: 'var(--sap-text-muted)',
                borderTop: '1px solid #f1f5f9',
                background: '#fafbfc',
              }}>{t('leaderboard.showingTop', { count: leaders.length, defaultValue: 'Showing top 20 of {{count}}' })}</div>
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

        {/* Platform Stats — clean white cards matching the rest of the page.
            Removed the heavy cobalt-navy and emerald-green gradient backgrounds
            that felt out of place against the white podium and table. */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{
            background: '#fff',
            border: '1px solid #e8ecf2',
            borderRadius: 16,
            padding: '20px 22px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 14, left: 14,
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--sap-cobalt-mid, #1e3a8a)',
            }} />
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'var(--sap-text-muted)',
              marginBottom: 8,
            }}>{t('leaderboard.activeMembers')}</div>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 900,
              color: 'var(--sap-cobalt-deep, #172554)',
              lineHeight: 1,
            }}>{(d.stats||{}).total_members||0}</div>
            <div style={{
              fontSize: 12, color: 'var(--sap-text-muted)',
              marginTop: 6,
            }}>{t('leaderboard.andGrowing')}</div>
          </div>
          <div style={{
            background: '#fff',
            border: '1px solid #e8ecf2',
            borderRadius: 16,
            padding: '20px 22px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 14, left: 14,
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--sap-green-mid, #10b981)',
            }} />
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'var(--sap-text-muted)',
              marginBottom: 8,
            }}>{t('leaderboard.totalEarnedByMembers')}</div>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 900,
              color: 'var(--sap-green-mid, #10b981)',
              lineHeight: 1,
            }}>${Math.round((d.stats||{}).total_earned||0).toLocaleString()}</div>
            <div style={{
              fontSize: 12, color: 'var(--sap-text-muted)',
              marginTop: 6,
            }}>{t('leaderboard.paidOut')}</div>
          </div>
          <div style={{
            background: '#fff',
            border: '1px solid #e8ecf2',
            borderRadius: 16,
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
          }}>
            <div style={{
              fontSize: 14, fontWeight: 800,
              color: 'var(--sap-text-primary)',
              marginBottom: 6,
            }}>{t('leaderboard.wantToBeOnBoard')}</div>
            <div style={{
              fontSize: 12, color: 'var(--sap-text-muted)',
              lineHeight: 1.6, marginBottom: 14,
            }}>{t('leaderboard.shareAndClimb')}</div>
            <a href="/affiliate" style={{
              display: 'inline-block',
              padding: '10px 22px', borderRadius: 10,
              background: 'var(--sap-cobalt-deep, #172554)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
            }}>{t('leaderboard.shareYourLink')}</a>
          </div>
        </div>
      </div>

      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}'}</style>
    </AppLayout>
  );
}
