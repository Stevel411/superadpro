import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import AppLayout from '../components/layout/AppLayout';
import { Users, LayoutGrid, GraduationCap, Rocket, Store, BookOpen, PenSquare, Zap, Bot, Eye, TrendingUp } from 'lucide-react';
import PassiveIncome from './PassiveIncome';
import CoPilot from './CoPilot';

export default function Dashboard() {
  var { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refCopied, setRefCopied] = useState(false);
  const [dashTab, setDashTab] = useState('overview');

  useEffect(() => {
    apiGet('/api/dashboard')
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <AppLayout title={t("dashboard.title")}><div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div></AppLayout>;
  }

  if (!data) {
    return <AppLayout title={t("dashboard.title")}><div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Unable to load dashboard data</div></AppLayout>;
  }

  const d = data;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    return 'evening';
  })();

  const copyRef = () => {
    const link = `https://superadpro.com/ref/${user?.username}`;
    navigator.clipboard.writeText(link);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };

  const dismissOnboard = () => {
    const el = document.getElementById('onboardWizard');
    if (el) {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      setTimeout(() => el.remove(), 300);
    }
    apiPost('/api/launch-wizard/complete', {}).catch(() => {});
  };

  return (
    <AppLayout
      title={t("dashboard.title")}
      subtitle={`Good ${greeting}, ${d.display_name || user?.first_name || user?.username} 👋`}
      topbarActions={<>
        <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, padding: '7px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#64748b' }}>Balance</div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 900, color: '#16a34a' }}>${d.balance?.toFixed(2)}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
          ...(d.is_active
            ? { background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }
            : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' })
        }}>
          {d.is_active ? '● Active Member' : '○ Inactive'}
        </span>
      </>}
    >
      {/* Free member activation banner */}
      {!d.is_active && (
        <div style={{
          background: 'linear-gradient(135deg,#f0fdf4,#ecfeff)', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '20px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>🎯 Refer just 2 people and your membership activates itself</div>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: 0 }}>
              As a free member you earn <strong>$10 for every person you refer</strong>. Two referrals = $20 → your membership <strong style={{ color: '#0891b2' }}>activates automatically</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
            <a href="/upgrade" style={{
              fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
              padding: '11px 22px', borderRadius: 9, textDecoration: 'none', boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
            }}>Activate Now — $20 →</a>
            <Link to="/affiliate" style={{ fontSize: 13, fontWeight: 600, color: '#0891b2', textDecoration: 'none' }}>Get my referral link →</Link>
          </div>
        </div>
      )}

      {/* Onboarding Wizard */}
      {user && !user.onboarding_completed && (
        <div id="onboardWizard" style={{
          background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 8,
          padding: '28px 32px', marginBottom: 20, border: '1px solid rgba(14,165,233,0.15)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: '50%', height: '80%', background: 'radial-gradient(circle,rgba(14,165,233,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: '#fff' }}>🚀 Let's get you set up</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Complete these steps to start earning</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { done: false, num: '1', name: 'Set up your profile', desc: 'Add a photo and your name', link: '/account' },
              { done: false, num: '2', name: 'Choose your niche', desc: 'Find the right market for you', link: '/niche-finder' },
              { done: !!d.has_linkhub, num: '3', name: 'Create your LinkHub', desc: 'Your personal link-in-bio page', link: '/linkhub' },
              { done: (d.total_team || 0) > 0, num: '4', name: 'Share your referral link', desc: 'Start building your team', link: '/affiliate' },
              { done: (d.watch_count || 0) > 0, num: '5', name: 'Watch your first campaign', desc: 'Earn from video views', link: '/watch' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: s.done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${s.done ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: s.done ? 'rgba(16,185,129,0.15)' : 'rgba(14,165,233,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 800,
                  color: s.done ? '#10b981' : '#0ea5e9',
                }}>{s.done ? '✓' : s.num}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{s.desc}</div>
                <Link to={s.link} style={{
                  fontSize: 11, fontWeight: 700, color: s.done ? '#10b981' : '#0ea5e9',
                  textDecoration: 'none', padding: '5px 14px', borderRadius: 8,
                  background: s.done ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)',
                  marginTop: 'auto',
                }}>Go →</Link>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <button onClick={dismissOnboard} style={{
              background: 'none', border: 'none', color: '#475569', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', padding: '6px 12px', borderRadius: 6,
            }}>I'll do this later</button>
          </div>
        </div>
      )}

      {/* ── Dashboard Tabs ── */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[
          { key:'overview', label:'Overview', icon:'📊' },
          { key:'passive',  label:'Recurring Income', icon:'💸' },
        ].map(function(t) {
          var on = dashTab === t.key;
          return (
            <button key={t.key} onClick={function(){ setDashTab(t.key); }} style={{
              display:'flex', alignItems:'center', gap:6, padding:'9px 18px',
              borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700,
              border: on ? '2px solid #6366f1' : '2px solid #e8ecf2',
              background: on ? 'rgba(99,102,241,0.08)' : '#fff',
              color: on ? '#6366f1' : '#64748b', transition:'all .15s',
            }}>
              <span>{t.icon}</span>{t.label}
              {t.key === 'passive' && <span style={{ fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:99, background:'linear-gradient(135deg,#fbbf24,#f59e0b)', color:'#fff', marginLeft:2 }}>NEW</span>}
            </button>
          );
        })}
      </div>

      {/* ── Recurring Income Tab ── */}
      {dashTab === 'passive' && <PassiveIncome d={d} />}

      {/* ── Overview Tab ── */}
      {dashTab === 'overview' && <>

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg,#0b1729 0%,#132240 50%,#0e1c30 100%)',
        borderRadius: 14, padding: '30px 32px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12)',
      }}>
        <div className="wb-orb wb-o1" /><div className="wb-orb wb-o2" /><div className="wb-orb wb-o3" />
        <div className="wb-line wb-l1" /><div className="wb-line wb-l2" />
        <div className="wb-dot wb-d1" /><div className="wb-dot wb-d2" /><div className="wb-dot wb-d3" /><div className="wb-dot wb-d4" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, color: 'rgba(56,189,248,0.8)', fontWeight: 600, marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8 }}>{d.display_name || user?.username}</div>
          <div style={{ fontSize: 14, color: 'rgba(200,220,255,0.65)', lineHeight: 1.6, maxWidth: 420 }}>
            You have {d.total_team || 0} members in your network{(d.total_earned || 0) > 0 && ` and earned $${Math.round(d.total_earned)} across all income streams`}.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1 }}>
          <Link to="/affiliate" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 22px', borderRadius: 11, fontSize: 13, fontWeight: 700, textDecoration: 'none', background: '#0ea5e9', color: '#fff', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share & Earn
          </Link>
          <Link to="/wallet" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 22px', borderRadius: 11, fontSize: 13, fontWeight: 700, textDecoration: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(200,220,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Withdraw
          </Link>
        </div>
      </div>

      {/* 5 Income Streams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { color: '#16a34a', bg: '#dcfce7', Icon: Users, badge: '$10/referral', val: d.membership_earned, name: 'Membership', detail: `${d.personal_referrals || 0} personal referrals` },
          { color: '#0ea5e9', bg: '#e0f2fe', Icon: LayoutGrid, badge: '40% + uni-level', val: d.grid_earnings, name: 'Income Grid', detail: `${d.grid_stats?.completed_advances || 0} advance${d.grid_stats?.completed_advances !== 1 ? 's' : ''} completed` },
          { color: '#6366f1', bg: '#ede9fe', Icon: GraduationCap, badge: '100% commission', val: d.course_earnings, name: 'Course Sales', detail: `${d.course_sale_count || 0} sale${d.course_sale_count !== 1 ? 's' : ''} made` },
          { color: '#d97706', bg: '#fef3c7', Icon: Rocket, badge: 'tier bonus', val: d.boost_earned, name: 'Campaigns', detail: 'Video campaign earnings' },
          { color: '#e11d48', bg: '#ffe4e6', Icon: Store, badge: '50/25/25', val: d.marketplace_earnings, name: 'Marketplace', detail: `${d.marketplace_sales || 0} sale${d.marketplace_sales !== 1 ? 's' : ''} · ${d.marketplace_courses || 0} course${d.marketplace_courses !== 1 ? 's' : ''}` },
        ].map((s, i) => (
          <div key={i} className="stream-card" style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
            position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '8px 8px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg }}>
                <s.Icon size={20} color={s.color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, letterSpacing: 0.3, background: s.bg, color: s.color }}>{s.badge}</span>
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 30, fontWeight: 900, color: '#16a34a', marginBottom: 2 }}>${Math.round(s.val || 0)}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 2 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.detail}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b', marginBottom: 14 }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { Icon: BookOpen, color: '#6366f1', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', name: 'Browse Courses', desc: 'Learn skills & earn 100% commissions', link: '/courses' },
          { Icon: PenSquare, color: '#0ea5e9', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', name: 'Create Course', desc: 'Build & sell courses on the marketplace', link: '/courses/create' },
          { Icon: Zap, color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', name: 'Campaign Tiers', desc: 'Activate a tier to unlock the earning engine', link: '/campaign-tiers' },
          { Icon: Bot, color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', name: 'AI Marketing', desc: 'Generate campaigns, social posts & scripts', link: '/campaign-studio' },
          { Icon: Eye, color: '#6366f1', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', name: 'Watch to Earn', desc: 'Watch daily videos for bonus earnings', link: '/watch' },
        ].map((a, i) => (
          <Link key={i} to={a.link} className="action-card" style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
            textDecoration: 'none', transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center', gap: 10,
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg }}>
              <a.Icon size={24} color={a.color} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{a.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
        {/* Recent Activity */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Recent Activity</div>
            <Link to="/courses/commissions" style={{ fontSize: 12, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none' }}>View all →</Link>
          </div>
          {(!Array.isArray(d.recent_activity) || d.recent_activity.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>No recent activity yet. Share your link to start earning!</div>
          ) : d.recent_activity.map((a, i) => {
            const colorMap = { green: '#dcfce7', cyan: '#e0f2fe', purple: '#ede9fe', amber: '#fef3c7' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < d.recent_activity.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, background: colorMap[a.color] || '#f1f5f9' }}>{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{a.sub}</div>
                </div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 800, color: '#16a34a' }}>+${Math.round(a.amount || 0)}</div>
              </div>
            );
          })}
        </div>

        {/* Network Snapshot */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Your Network</div>
            <Link to="/courses/commissions" style={{ fontSize: 12, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none' }}>Full network →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { val: d.personal_referrals || 0, lbl: 'Direct Referrals' },
              { val: d.total_team || 0, lbl: 'Total Network' },
              { val: `$${Math.round(d.total_earned || 0)}`, lbl: 'Lifetime Earned' },
              { val: d.course_sale_count || 0, lbl: 'Course Sales' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f1f5f9', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{s.val}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Your Referral Link</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9', wordBreak: 'break-all' }}>superadpro.com/ref/{user?.username}</div>
            </div>
            <button onClick={copyRef} style={{
              padding: '6px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            }}>{refCopied ? 'Copied!' : 'Copy'}</button>
          </div>
        </div>
      </div>

      {/* Welcome banner animations */}
      <style>{`
        .wb-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:0}
        .wb-o1{width:200px;height:200px;top:-50px;right:15%;background:radial-gradient(circle,rgba(14,165,233,.3),transparent 70%);animation:wbPulse 4s ease-in-out infinite}
        .wb-o2{width:140px;height:140px;bottom:-30px;right:35%;background:radial-gradient(circle,rgba(99,102,241,.25),transparent 70%);animation:wbPulse 5s ease-in-out 1s infinite}
        .wb-o3{width:120px;height:120px;top:10px;right:5%;background:radial-gradient(circle,rgba(16,185,129,.2),transparent 70%);animation:wbPulse 6s ease-in-out 2s infinite}
        .wb-line{position:absolute;height:1.5px;background:linear-gradient(90deg,transparent,rgba(14,165,233,.3),transparent);pointer-events:none;z-index:0}
        .wb-l1{width:60%;top:25%;left:30%;animation:wbSlide 8s linear infinite}
        .wb-l2{width:40%;top:65%;left:40%;animation:wbSlide 10s linear 2s infinite}
        .wb-dot{position:absolute;width:5px;height:5px;border-radius:50%;pointer-events:none;z-index:0}
        .wb-d1{background:rgba(14,165,233,.65);top:20%;right:20%;animation:wbDrift 5s ease-in-out infinite}
        .wb-d2{background:rgba(16,185,129,.55);top:60%;right:30%;animation:wbDrift 6s ease-in-out 1s infinite}
        .wb-d3{background:rgba(139,92,246,.55);top:40%;right:10%;animation:wbDrift 7s ease-in-out 2s infinite}
        .wb-d4{background:rgba(245,158,11,.5);top:70%;right:15%;animation:wbDrift 5.5s ease-in-out .5s infinite}
        @keyframes wbPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.2);opacity:1}}
        @keyframes wbSlide{0%{transform:translateX(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(100%);opacity:0}}
        @keyframes wbDrift{0%,100%{transform:translate(0,0);opacity:.5}25%{transform:translate(-10px,6px);opacity:1}50%{transform:translate(5px,-7px);opacity:.7}75%{transform:translate(-4px,-4px);opacity:1}}
        .stream-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-2px)}
        .action-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-3px)}
      `}</style>
      </>
    }
    </AppLayout>
  );
}
