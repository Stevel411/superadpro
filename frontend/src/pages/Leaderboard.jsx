import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';

export default function Leaderboard() {
  var { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('referrals');

  useEffect(() => { apiGet('/api/leaderboard').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <AppLayout title="🏆 Affiliate Leaderboard"><Spin/></AppLayout>;

  const d = data || {};
  const tabs = [
    { key: 'referrals', icon: '👥', label: 'Members Referred', data: d.ref_leaders || [], metric: u => u.personal_referrals, metricLabel: 'Referrals', barColor: 'linear-gradient(90deg,#0ea5e9,#38bdf8)' },
    { key: 'grid', icon: '⚡', label: 'Grid Members', data: d.grid_users || [], metric: u => u._grid_count || u.grid_count || 0, metricLabel: 'Grid Members', barColor: 'linear-gradient(90deg,#10b981,#059669)' },
    { key: 'courses', icon: '🎓', label: 'Course Sales', data: d.course_users || [], metric: u => u.course_sale_count || u._course_count || 0, metricLabel: 'Sales', barColor: 'linear-gradient(90deg,#6366f1,#818cf8)' },
  ];
  const activeTab = tabs.find(t => t.key === tab) || tabs[0];
  const leaders = activeTab.data;
  const maxVal = leaders.length > 0 ? Math.max(1, activeTab.metric(leaders[0])) : 1;

  return (
    <AppLayout title="🏆 Affiliate Leaderboard" subtitle="Top performers across the SuperAdPro network">
      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {tabs.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? '#fff' : '#f8f9fb', border: tab === t.key ? '2px solid #0ea5e9' : '1px solid #e5e7eb',
            borderRadius: 8, padding: '16px 20px', cursor: 'pointer', transition: 'all .15s', textAlign: 'center',
            boxShadow: tab === t.key ? '0 4px 12px rgba(14,165,233,0.15)' : 'none',
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: tab === t.key ? '#0f172a' : '#7b91a8' }}>{t.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.data.length} on the board</div>
          </div>
        ))}
      </div>

      {/* Podium */}
      {leaders.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
          {[{ idx: 1, w: 150, h: 80, color: '#94a3b8', medal: '🥈' }, { idx: 0, w: 170, h: 110, color: '#fbbf24', medal: '🥇' }, { idx: 2, w: 150, h: 60, color: '#d97706', medal: '🥉' }].map(p => {
            const u = leaders[p.idx];
            return (
              <div key={p.idx} style={{ width: p.w, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🌍</div>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 auto 8px' }}>{p.idx + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{u.first_name || u.username}</div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: '#0ea5e9', marginBottom: 8 }}>{activeTab.metric(u)}</div>
                <div style={{ height: p.h, background: `linear-gradient(180deg,${p.color}22,${p.color}11)`, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: p.idx === 0 ? 32 : 26, fontWeight: 800, color: `${p.color}50` }}>{p.idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {leaders.length > 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(15,25,60,.08)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Rank', 'Member', 'Tier', activeTab.metricLabel].map((h, i) => (
                <th key={h} style={{ fontSize: 11, fontWeight: 800, color: '#7b91a8', textTransform: 'uppercase', letterSpacing: 1, padding: '11px 14px', borderBottom: '1px solid rgba(15,25,60,.08)', textAlign: i === 3 ? 'right' : 'left', background: '#f6f8fc', ...(i === 0 ? { width: 60 } : {}) }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {leaders.slice(0, 20).map((u, i) => {
                const isMe = u.id === user?.id;
                const val = activeTab.metric(u);
                const rankColors = { 0: { bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#b45309', border: '#fcd34d' }, 1: { bg: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', color: '#64748b', border: '#cbd5e1' }, 2: { bg: 'linear-gradient(135deg,#fed7aa,#fdba74)', color: '#9a3412', border: '#fb923c' } };
                const rc = rankColors[i] || { bg: '#f8f9fb', color: '#94a3b8', border: '#e5e7eb' };
                return (
                  <tr key={u.id || i} style={{ background: isMe ? 'rgba(14,165,233,.04)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(15,25,60,.05)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: rc.bg, border: `1px solid ${rc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 800, color: rc.color }}>{i + 1}</div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(15,25,60,.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{(u.first_name || u.username || 'U')[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{u.first_name || u.username}{isMe && <span style={{ fontSize: 12, color: '#f59e0b' }}> (You)</span>}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(15,25,60,.05)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(14,165,233,.08)', color: '#0284c7' }}>Tier {u.grid_tier || 0}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(15,25,60,.05)', textAlign: 'right' }}>
                      <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{val}</span>
                      <div style={{ height: 4, background: '#eef1f8', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: activeTab.barColor, borderRadius: 99, width: `${(val / maxVal) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{activeTab.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3d5068', marginBottom: 4 }}>No activity yet</div>
          <div style={{ fontSize: 13, color: '#7b91a8' }}>Be the first to appear on this leaderboard!</div>
        </div>
      )}
    </AppLayout>
  );
}
function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>; }
