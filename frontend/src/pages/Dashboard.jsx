import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { formatMoney } from '../utils/money';
import AppLayout from '../components/layout/AppLayout';
import { Users, LayoutGrid, GraduationCap, Rocket, Store, BookOpen, PenSquare, Zap, Bot, Eye, TrendingUp } from 'lucide-react';
import CoPilot from './CoPilot';
import WalletGuideCard from '../components/WalletGuideCard';

// ── Dashboard data cache — survives navigation, clears on full page reload ──
var _dashCache = { data: null, ts: 0 };

export default function Dashboard() {
  var { t } = useTranslation();
  const { user } = useAuth();
  // Start with cached data if fresh enough (< 30 seconds old)
  var hasFreshCache = _dashCache.data && (Date.now() - _dashCache.ts < 30000);
  const [data, setData] = useState(hasFreshCache ? _dashCache.data : null);
  const [loading, setLoading] = useState(!hasFreshCache);
  const [refCopied, setRefCopied] = useState(false);

  const [error, setError] = useState(null);

  useEffect(() => {
    var timeout = setTimeout(function() {
      if (!data) { setError('Dashboard is taking too long to load. Please refresh the page.'); setLoading(false); }
    }, 10000);
    apiGet('/api/dashboard')
      .then(d => { clearTimeout(timeout); _dashCache.data = d; _dashCache.ts = Date.now(); setData(d); setLoading(false); })
      .catch(e => { clearTimeout(timeout); if (!data) { setError(e?.message || 'Failed to load dashboard'); setLoading(false); } });
    return function() { clearTimeout(timeout); };
  }, []);

  if (loading) {
    return <AppLayout title={t("dashboard.title")}><div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div></AppLayout>;
  }

  if (error || !data) {
    return <AppLayout title={t("dashboard.title")}><div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
      <div style={{ fontSize: 16, marginBottom: 12 }}>{error || 'Unable to load dashboard data'}</div>
      <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Refresh Page</button>
    </div></AppLayout>;
  }

  const d = data;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    return 'evening';
  })();

  const copyRef = () => {
    const link = `https://www.superadpro.com/ref/${user?.username}`;
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
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Balance</div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 900, color: '#16a34a' }}>${formatMoney(d.balance)}</div>
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

      {/* Wallet setup guide for free/new members */}
      {!d.is_active && <WalletGuideCard />}

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

      {/* Welcome Banner — Cosmic Purple */}
      <div style={{
        background: 'linear-gradient(135deg,#1e1b4b,#2d2a7a,#4338ca)',
        borderRadius: 18, padding: '30px 34px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(67,56,202,0.35)',
      }}>

        {/* Radar rings + money bag */}
        <div style={{ position:'absolute', right:44, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <div style={{ width:110, height:110, borderRadius:'50%', border:'1px solid rgba(196,181,253,0.2)', position:'relative' }}>
            <div style={{ position:'absolute', inset:16, borderRadius:'50%', border:'1px solid rgba(196,181,253,0.3)' }}>
              <div style={{ position:'absolute', inset:14, borderRadius:'50%', background:'rgba(139,92,246,0.2)', border:'1px solid rgba(196,181,253,0.45)' }} />
            </div>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:42, opacity:0.45, animation:'wbBag 15.2s ease-in-out infinite', display:'inline-block' }}>💰</span>
            </div>
          </div>
        </div>

        {/* Twinkling stars */}
        {[[15,35,2.1,0],[60,55,2.8,0.6],[28,72,1.9,1.2],[75,28,3,0.9],[45,82,2.5,1.8],[20,65,2.2,0.4]].map(function([t,l,dur,delay],i){
          return <div key={i} style={{ position:'absolute', width: i%3===0?5:i%3===1?3:4, height: i%3===0?5:i%3===1?3:4, borderRadius:'50%', background: i%2===0?'#fff':'#c4b5fd', top:`${t}%`, right:`${l*0.5+2}%`, animation:`wbStar ${dur}s ease-in-out infinite`, animationDelay:`${delay}s`, pointerEvents:'none' }} />;
        })}

        <div style={{ position:'relative', zIndex:2 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.65)', marginBottom:8 }}>Welcome back</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#fff', marginBottom:8 }}>{d.display_name || user?.username}</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, maxWidth:420 }}>
            You have {d.total_team || 0} members in your network{(d.total_earned || 0) > 0 && ` and earned $${formatMoney(d.total_earned)} across all income streams`}.
          </div>
          </div>

        <div style={{ display:'flex', gap:8, position:'relative', zIndex:2, marginRight:140 }}>
          <Link to="/affiliate" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', background:'#7c3aed', color:'#fff' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share & Earn
          </Link>
          <Link to="/wallet" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.2)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Withdraw
          </Link>
        </div>
      </div>

      {/* Upgrade Banner — only for Basic members */}
      {user?.is_active && user?.membership_tier !== 'pro' && !user?.is_admin && (
        <Link to="/upgrade" style={{ display: 'block', textDecoration: 'none', marginBottom: 20 }}>
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#3730a3)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 14, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.2),transparent 70%)', pointerEvents: 'none' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 2 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{"\u26A1"}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Unlock Pro — just $15 upgrade</div>
                <div style={{ fontSize: 13, color: 'rgba(196,181,253,0.7)' }}>Get SuperPages, SuperSeller, AutoResponder & more Pro tools. Pay only the difference.</div>
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#8b5cf6,#a855f7)', color: '#fff', fontSize: 13, fontWeight: 800, padding: '10px 20px', borderRadius: 10, flexShrink: 0, position: 'relative', zIndex: 2, boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}>Upgrade →</div>
          </div>
        </Link>
      )}

      {/* 3 Income Streams */}
      <div className="income-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            color: '#16a34a', bg: '#dcfce7', badge: '$10 / referral',
            val: d.membership_earned, name: 'Membership',
            detail: `${d.personal_referrals || 0} personal referrals`,
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7" r="4" fill="#16a34a" opacity="0.9"/>
                <path d="M2 21v-1a7 7 0 0 1 14 0v1" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="19" cy="8" r="2.5" fill="#4ade80"/>
                <path d="M22 21v-.5a4.5 4.5 0 0 0-6-4.24" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )
          },
          {
            color: '#0ea5e9', bg: '#e0f2fe', badge: '40% + uni-level',
            val: d.grid_earnings, name: 'Income Grid',
            detail: `${d.grid_stats?.completed_advances || 0} advances completed`,
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#0ea5e9"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#38bdf8"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#38bdf8"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#0ea5e9"/>
              </svg>
            )
          },
          {
            color: '#d97706', bg: '#fef3c7', badge: 'tier bonus',
            val: d.boost_earned, name: 'Campaigns',
            detail: 'Video campaign earnings',
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="#f59e0b"/>
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="url(#zapGrad)"/>
                <defs>
                  <linearGradient id="zapGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbbf24"/>
                    <stop offset="1" stopColor="#d97706"/>
                  </linearGradient>
                </defs>
              </svg>
            )
          },
        ].map((s, i) => (
          <div key={i} className="stream-card" style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
            position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.bg})`, borderRadius: '14px 14px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg }}>
                {s.icon}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, letterSpacing: 0.3, background: s.bg, color: s.color }}>{s.badge}</span>
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 34, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 6 }}>${formatMoney(s.val)}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.detail}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions — dynamic based on membership tier */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b', marginBottom: 14 }}>Quick Actions</div>
      <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {(user?.membership_tier === 'pro' || user?.is_admin ? [
          {
            name: 'Share Your Link', desc: 'Copy your referral link and share it across social media to earn', link: '/affiliate',
            color: '#0ea5e9', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" fill="#cffafe" stroke="#0ea5e9" strokeWidth="1.5"/>
                <path d="M8 12h8M12 8v8" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="18" cy="6" r="3" fill="#0ea5e9"/><text x="18" y="8" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#fff">$</text>
              </svg>
            )
          },
          {
            name: 'Campaign Tiers', desc: 'Activate a tier to unlock grid commissions and the full earning engine', link: '/campaign-tiers',
            color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="url(#qaZapPro)"/>
                <defs><linearGradient id="qaZapPro" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#4ade80"/><stop offset="1" stopColor="#16a34a"/></linearGradient></defs>
              </svg>
            )
          },
          {
            name: 'Pay It Forward', desc: 'Gift a membership — become their sponsor and earn from their activity', link: '/pay-it-forward',
            color: '#ec4899', bg: 'linear-gradient(135deg,#fdf2f8,#fce7f3)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" fill="url(#pifH2)"/>
                <rect x="9" y="10" width="6" height="5" rx="1" fill="#fff" opacity="0.9"/>
                <path d="M10.5 12.5h3M12 11v3" stroke="#ec4899" strokeWidth="1.2" strokeLinecap="round"/>
                <defs><linearGradient id="pifH2" x1="3" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#f9a8d4"/><stop offset="1" stopColor="#ec4899"/></linearGradient></defs>
              </svg>
            )
          },
          {
            name: 'AI Tools', desc: 'SuperScene, SuperSeller, SuperDeck — let AI do the heavy lifting', link: '/superscene',
            color: '#22d3ee', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="14" rx="3" fill="#cffafe" stroke="#22d3ee" strokeWidth="1.5"/>
                <polygon points="10,8 10,15 16,11.5" fill="#0891b2"/>
                <rect x="6" y="20" width="12" height="2" rx="1" fill="#22d3ee"/>
              </svg>
            )
          },
          {
            name: 'Analytics', desc: 'Track your earnings, referrals, and campaign performance in real time', link: '/analytics',
            color: '#8b5cf6', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="14" width="4" height="7" rx="1" fill="#c4b5fd"/>
                <rect x="10" y="9" width="4" height="12" rx="1" fill="#a78bfa"/>
                <rect x="17" y="4" width="4" height="17" rx="1" fill="#8b5cf6"/>
              </svg>
            )
          },
          {
            name: 'Ad Hub', desc: 'Place and manage your video, banner and text ads', link: '/ad-hub',
            color: '#ef4444', bg: 'linear-gradient(135deg,#fef2f2,#fecaca)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M3 12l4-8h10l4 8-4 8H7l-4-8z" fill="#fecaca" stroke="#ef4444" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="3" fill="#ef4444"/>
                <path d="M12 6v2M12 16v2M6.5 9l1.5 1M16 14l1.5 1M6.5 15l1.5-1M16 10l1.5-1" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )
          },
        ] : [
          {
            name: 'Share Your Link', desc: 'Copy your referral link and share it to start earning 50% commissions', link: '/affiliate',
            color: '#0ea5e9', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" fill="#cffafe" stroke="#0ea5e9" strokeWidth="1.5"/>
                <path d="M8 12h8M12 8v8" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="18" cy="6" r="3" fill="#0ea5e9"/><text x="18" y="8" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#fff">$</text>
              </svg>
            )
          },
          {
            name: 'Compensation Plan', desc: 'Understand how you earn — 5 income streams, 95% paid to members', link: '/compensation-plan',
            color: '#6366f1', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5"/>
                <path d="M8 8h8M8 12h6M8 16h4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="18" cy="6" r="4" fill="#6366f1"/><text x="18" y="8" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#fff">5</text>
              </svg>
            )
          },
          {
            name: 'Platform Tour', desc: 'Take a guided walkthrough of every feature and tool available to you', link: '/tour',
            color: '#7c3aed', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/>
                <path d="M12 8v4l3 3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 3l3-1 3 1" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )
          },
          {
            name: 'Upgrade to Pro', desc: 'Unlock SuperSeller AI, SuperDeck, Campaign Tiers, AutoResponder & more', link: '/upgrade',
            color: '#8b5cf6', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', highlight: true,
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="url(#qaStarUp)"/>
                <defs><linearGradient id="qaStarUp" x1="2" y1="2" x2="22" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
              </svg>
            )
          },
          {
            name: 'Pay It Forward', desc: 'Gift a free membership — you become their sponsor and earn commissions', link: '/pay-it-forward',
            color: '#ec4899', bg: 'linear-gradient(135deg,#fdf2f8,#fce7f3)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" fill="url(#pifH3)"/>
                <rect x="9" y="10" width="6" height="5" rx="1" fill="#fff" opacity="0.9"/>
                <path d="M10.5 12.5h3M12 11v3" stroke="#ec4899" strokeWidth="1.2" strokeLinecap="round"/>
                <defs><linearGradient id="pifH3" x1="3" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#f9a8d4"/><stop offset="1" stopColor="#ec4899"/></linearGradient></defs>
              </svg>
            )
          },
          {
            name: 'Set Up LinkHub', desc: 'Build your personal branded page that converts visitors into referrals', link: '/linkhub',
            color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            icon: (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="3" width="16" height="18" rx="3" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="3" fill="#16a34a"/>
                <rect x="7" y="14" width="10" height="2" rx="1" fill="#4ade80"/>
                <rect x="8" y="17.5" width="8" height="1.5" rx="0.75" fill="#bbf7d0"/>
              </svg>
            )
          },
        ]).map((a, i) => (
          <Link key={i} to={a.link} className="action-card" style={{
            background: a.highlight ? 'linear-gradient(135deg,#f5f3ff,#ede9fe)' : '#fff',
            border: a.highlight ? '2px solid #8b5cf6' : '1px solid #e2e8f0', borderRadius: 14, padding: 24,
            boxShadow: a.highlight ? '0 4px 16px rgba(139,92,246,.15), 0 1px 4px rgba(0,0,0,.06)' : '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
            textDecoration: 'none', transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center', gap: 10,
          }}>
            <div style={{ width: 68, height: 68, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg }}>
              {a.icon}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{a.name}</div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
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
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 800, color: '#16a34a' }}>+${formatMoney(a.amount)}</div>
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
              { val: `$${formatMoney(d.total_earned)}`, lbl: 'Lifetime Earned' },
              { val: d.grid_stats?.completed_advances || 0, lbl: 'Grid Advances' },
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
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9', wordBreak: 'break-all' }}>www.superadpro.com/ref/{user?.username}</div>
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
        @keyframes wbBag{0%,100%{transform:rotate(-5deg)}50%{transform:translateY(-10px) rotate(3deg)}}

        @keyframes wbStar{0%,100%{opacity:0}50%{opacity:1}}
        .stream-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-2px)}
        .action-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-3px)}
        @media(max-width:767px){
          .income-grid{grid-template-columns:repeat(2,1fr)!important}
          .actions-grid{grid-template-columns:repeat(2,1fr)!important}
          .bottom-grid{grid-template-columns:1fr!important}
        }
        .action-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-3px)}
      `}</style>
    </AppLayout>
  );
}
