import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { formatMoney } from '../utils/money';
import AppLayout from '../components/layout/AppLayout';
import { Users, LayoutGrid, GraduationCap, Rocket, Store, BookOpen, PenSquare, Zap, Bot, Eye, TrendingUp } from 'lucide-react';
import CoPilot from './CoPilot';

// ── Dashboard data cache — survives navigation, clears on full page reload ──
var _dashCache = { data: null, ts: 0 };

export default function Dashboard() {
  var { t } = useTranslation();
  const { user } = useAuth();

  // Redirect to onboarding wizard if not completed
  if (user && user.onboarding_completed === false) return <Navigate to="/onboarding" replace />;

  // Start with cached data if fresh enough (< 30 seconds old)
  var hasFreshCache = _dashCache.data && (Date.now() - _dashCache.ts < 30000);
  const [data, setData] = useState(hasFreshCache ? _dashCache.data : null);
  const [loading, setLoading] = useState(!hasFreshCache);
  const [refCopied, setRefCopied] = useState(false);

  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [goals, setGoals] = useState(null);
  var pollRef = useRef(null);
  var lastCheckRef = useRef(new Date().toISOString());
  var chachingRef = useRef(null);

  // Cha-ching sound (short, synthesised)
  function playChaChing() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      function playTone(freq, start, dur) {
        var osc = ctx.createOscillator(); var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
      }
      playTone(1200, 0, 0.1); playTone(1600, 0.08, 0.1); playTone(2000, 0.16, 0.15);
      playTone(2400, 0.28, 0.2);
    } catch(e) {}
  }

  // Poll for new team members every 30 seconds
  useEffect(function() {
    pollRef.current = setInterval(function() {
      apiGet('/api/dashboard/new-members?since=' + encodeURIComponent(lastCheckRef.current))
        .then(function(r) {
          if (r.members && r.members.length > 0) {
            r.members.forEach(function(m) {
              setToasts(function(prev) {
                if (prev.find(function(t) { return t.id === m.id; })) return prev;
                return prev.concat([{ ...m, key: Date.now() + '-' + m.id }]);
              });
              playChaChing();
            });
          }
          if (r.checked_at) lastCheckRef.current = r.checked_at;
        }).catch(function() {});
    }, 30000);
    return function() { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function dismissToast(key) {
    setToasts(function(prev) { return prev.filter(function(t) { return t.key !== key; }); });
  }

  useEffect(() => {
    var timeout = setTimeout(function() {
      if (!data) { setError('Dashboard is taking too long to load. Please refresh the page.'); setLoading(false); }
    }, 10000);
    apiGet('/api/dashboard')
      .then(d => { clearTimeout(timeout); _dashCache.data = d; _dashCache.ts = Date.now(); setData(d); setLoading(false); })
      .catch(e => { clearTimeout(timeout); if (!data) { setError(e?.message || 'Failed to load dashboard'); setLoading(false); } });
    apiGet('/api/dashboard/goals').then(g => setGoals(g)).catch(() => {});
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
  const copyRef = () => {
    const link = `https://www.superadpro.com/ref/${user?.username}`;
    navigator.clipboard.writeText(link);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };

  const copyRefLink = (link) => {
    navigator.clipboard.writeText(link);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };

  return (
    <AppLayout
      title={t("dashboard.title")}
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
            <div style={{ fontSize: 15, fontWeight: 800, color: '#132044', marginBottom: 6 }}>🎯 Refer just 2 Basic members and your membership pays for itself</div>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: 0 }}>
              As a free member you earn <strong>$10 for every Basic member you refer</strong>. Two referrals = $20 → your membership <strong style={{ color: '#0891b2' }}>paid for</strong>.
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

      {/* Welcome Banner — Cosmic Purple with referral link */}
      <div style={{
        background: 'linear-gradient(135deg,#1e1b4b,#2d2a7a,#4338ca)',
        borderRadius: 18, padding: '30px 34px', marginBottom: 20,
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
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, maxWidth:420, marginBottom:16 }}>
            You have {d.total_team || 0} members in your network{(d.total_earned || 0) > 0 && ` and earned $${formatMoney(d.total_earned)} across all income streams`}.
          </div>

          {/* Referral link bar */}
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(0,0,0,0.25)', borderRadius:10, padding:'10px 16px', maxWidth:520 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', flexShrink:0 }}>Your link</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#38bdf8', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace' }}>
              www.superadpro.com/ref/{user?.username}
            </div>
            <button onClick={function() { copyRefLink('https://www.superadpro.com/ref/' + (user?.username || '')); }}
              style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#0ea5e9', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              {refCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

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
            color: '#8b5cf6', bg: '#ede9fe', badge: 'credit matrix',
            val: d.creative_studio_earned || 0, name: 'Creative Studio',
            detail: 'Matrix + credit usage commissions',
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="3" fill="#8b5cf6" opacity=".8"/>
                <polygon points="10,7 10,14 16,10.5" fill="#fff"/>
                <rect x="6" y="19" width="12" height="2" rx="1" fill="#a78bfa"/>
              </svg>
            )
          },
          {
            color: '#d97706', bg: '#fef3c7', badge: 'watch & grid',
            val: d.boost_earned, name: 'Campaigns',
            detail: 'Watch to Earn + grid commissions',
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

      {/* ── Smart Goals ── */}
      {goals && ((goals.goals && goals.goals.length > 0) || (goals.opportunities && goals.opportunities.length > 0)) && (
        <>
          {goals.goals && goals.goals.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>Your goals this week</div>
              <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: goals.goals.length === 1 ? '1fr' : 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
                {goals.goals.map(function(g, i) {
                  var ICONS = {
                    users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" fill={g.color}/><path d="M2 21v-1a7 7 0 0114 0v1" stroke={g.color} strokeWidth="2" strokeLinecap="round"/><path d="M16 3.13a4 4 0 010 7.75" stroke={g.color} strokeWidth="2" strokeLinecap="round" opacity=".6"/></svg>,
                    grid: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" fill={g.color}/><rect x="14" y="3" width="7" height="7" rx="2" fill={g.color} opacity=".7"/><rect x="3" y="14" width="7" height="7" rx="2" fill={g.color} opacity=".7"/><rect x="14" y="14" width="7" height="7" rx="2" fill={g.color} opacity=".4"/></svg>,
                    wallet: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="3" fill={g.color} opacity=".8"/><circle cx="16" cy="13" r="2" fill="#fff"/><path d="M3 10h18" stroke="#fff" strokeWidth="1" opacity=".3"/></svg>,
                    zap: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill={g.color}/></svg>,
                    check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={g.color}/><path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  };
                  var R = 22, C = 2 * Math.PI * R;
                  var ringOffset = C - (C * (g.progress || 0) / 100);
                  var isCompleted = g.completed;
                  return (
                    <div key={i} style={{ background: isCompleted ? '#f0fdf4' : '#fff', borderRadius:14, border: isCompleted ? '1px solid #bbf7d0' : '1px solid #e8ecf2', padding:'18px 20px', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${g.color},${g.color}80)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                            <div style={{ width:38, height:38, borderRadius:10, background:g.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {ICONS[g.icon] || ICONS.zap}
                            </div>
                            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', lineHeight:1.3 }}>{g.title}</div>
                          </div>
                          <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5, marginBottom:14 }}>{g.desc}</div>
                          {g.progress !== undefined && !g.ring && (
                            <>
                              <div style={{ height:6, borderRadius:99, background:`${g.color}18`, overflow:'hidden', marginBottom:6 }}>
                                <div style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${g.color},${g.color}cc)`, width:`${g.progress}%`, transition:'width .8s ease-out' }}/>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#94a3b8' }}>
                                <span>{g.progress_label}</span>
                                <span style={{ color:g.color, fontWeight:700 }}>{g.progress}%</span>
                              </div>
                            </>
                          )}
                          <Link to={g.cta_link} style={{ display:'inline-block', fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:8, background:g.color, color:'#fff', textDecoration:'none', marginTop:10 }}>{g.cta}</Link>
                        </div>
                        {g.ring && (
                          <svg width="56" height="56" viewBox="0 0 52 52" style={{ flexShrink:0, marginTop:4 }}>
                            <circle cx="26" cy="26" r={R} fill="none" stroke="#f1f5f9" strokeWidth="5"/>
                            <circle cx="26" cy="26" r={R} fill="none" stroke={g.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset} style={{ transform:'rotate(-90deg)', transformOrigin:'center' }}/>
                            <text x="26" y="26" textAnchor="middle" dominantBaseline="central" fill={g.color} style={{ fontSize:13, fontWeight:800 }}>{g.progress}%</text>
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {goals.opportunities && goals.opportunities.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>More opportunities</div>
              <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: goals.opportunities.length === 1 ? '1fr' : 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
                {goals.opportunities.map(function(g, i) {
                  var ICONS = {
                    video: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="3" fill={g.color} opacity=".8"/><polygon points="10,7 10,14 16,10.5" fill="#fff"/><rect x="6" y="19" width="12" height="2" rx="1" fill={g.color} opacity=".4"/></svg>,
                    link: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill={g.bg} stroke={g.color} strokeWidth="1.5"/><path d="M10 14l4-4" stroke={g.color} strokeWidth="2" strokeLinecap="round"/><path d="M14 10a2 2 0 012 2" stroke={g.color} strokeWidth="2" strokeLinecap="round"/><path d="M10 14a2 2 0 01-2-2" stroke={g.color} strokeWidth="2" strokeLinecap="round"/></svg>,
                    target: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={g.color} strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke={g.color} strokeWidth="1.5"/><circle cx="12" cy="12" r="1.5" fill={g.color}/></svg>,
                  };
                  return (
                    <div key={i} style={{ background:'#fff', borderRadius:'0 14px 14px 0', border:'1px solid #e8ecf2', borderLeft:`3px solid ${g.color}`, padding:'18px 20px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:g.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {ICONS[g.icon] || ICONS.target}
                        </div>
                        <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', lineHeight:1.3 }}>{g.title}</div>
                      </div>
                      <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5, marginBottom:14 }}>{g.desc}</div>
                      <Link to={g.cta_link} style={{ display:'inline-block', fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:8, background:g.color, color:'#fff', textDecoration:'none' }}>{g.cta}</Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Quick Actions — 6 cards, same for all members */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b', marginBottom: 14 }}>Quick Actions</div>
      <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            name: 'Platform Tour', desc: 'Take a guided walkthrough of every feature and tool available to you', link: '/tour',
            color: '#7c3aed', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/><path d="M12 8v4l3 3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/><path d="M9 3l3-1 3 1" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/></svg>)
          },
          {
            name: 'Share Your Link', desc: 'Copy your referral link and share it to start earning 50% commissions', link: '/affiliate',
            color: '#0ea5e9', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#cffafe" stroke="#0ea5e9" strokeWidth="1.5"/><path d="M8 12h8M12 8v8" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/><circle cx="18" cy="6" r="3" fill="#0ea5e9"/><text x="18" y="8" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#fff">$</text></svg>)
          },
          {
            name: 'Campaign Tiers', desc: 'Activate a tier to unlock grid commissions and the full earning engine', link: '/campaign-tiers',
            color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="url(#qaZap)"/><defs><linearGradient id="qaZap" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#4ade80"/><stop offset="1" stopColor="#16a34a"/></linearGradient></defs></svg>)
          },
          {
            name: 'Comp Plan', desc: 'Understand how you earn \u2014 5 income streams, 95% paid to members', link: '/compensation-plan',
            color: '#6366f1', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5"/><path d="M8 8h8M8 12h6M8 16h4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="6" r="4" fill="#6366f1"/><text x="18" y="8" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#fff">5</text></svg>)
          },
          {
            name: 'Analytics', desc: 'Track your earnings, referrals, and campaign performance in real time', link: '/analytics',
            color: '#8b5cf6', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="14" width="4" height="7" rx="1" fill="#c4b5fd"/><rect x="10" y="9" width="4" height="12" rx="1" fill="#a78bfa"/><rect x="17" y="4" width="4" height="17" rx="1" fill="#8b5cf6"/></svg>)
          },
          {
            name: 'My Network', desc: 'See your team growing \u2014 track referrals, levels, and network activity', link: '/network',
            color: '#ec4899', bg: 'linear-gradient(135deg,#fdf2f8,#fce7f3)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5"/><circle cx="5" cy="18" r="3" fill="#f9a8d4"/><circle cx="19" cy="18" r="3" fill="#f9a8d4"/><path d="M12 12v3M8 15l-3 3M16 15l3 3" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round"/></svg>)
          },
        ].map((a, i) => (
          <Link key={i} to={a.link} className="action-card" style={{
            background: '#fff',
            border: '1px solid #e2e8f0', borderRadius: 14, padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
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
              { val: `$${formatMoney(d.creative_studio_earned || 0)}`, lbl: 'Studio Earned' },
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
          .goals-grid{grid-template-columns:1fr!important}
          .bottom-grid{grid-template-columns:1fr!important}
        }
        .action-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-3px)}
        @keyframes toastSlideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
      `}</style>

      {/* New member toast notifications */}
      {toasts.length > 0 && <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
        {toasts.map(function(toast) {
          var isPro = toast.tier === 'pro';
          var commission = isPro ? '$17.50' : '$10.00';
          var bg = isPro
            ? 'linear-gradient(135deg, #b8860b, #daa520 30%, #ffd700 50%, #daa520 70%, #b8860b)'
            : 'linear-gradient(135deg, #8e9aaf, #b8c4d4 30%, #d4dce8 50%, #b8c4d4 70%, #8e9aaf)';
          var borderColor = isPro ? 'rgba(255,235,150,.3)' : 'rgba(220,230,240,.4)';
          var glowColor = isPro ? 'rgba(255,215,0,.2)' : 'rgba(180,195,215,.15)';
          var iconBg = isPro ? 'rgba(23,37,84,.3)' : 'rgba(23,37,84,.15)';
          var iconBorder = isPro ? 'rgba(23,37,84,.2)' : 'rgba(23,37,84,.1)';
          var subColor = isPro ? 'rgba(15,29,58,.65)' : 'rgba(15,29,58,.6)';
          var badgeBg = isPro ? 'rgba(15,29,58,.15)' : 'rgba(15,29,58,.1)';
          var badgeBorder = isPro ? 'rgba(15,29,58,.12)' : 'rgba(15,29,58,.08)';
          var closeBg = isPro ? 'rgba(15,29,58,.1)' : 'rgba(15,29,58,.06)';

          return <div key={toast.key} style={{
            background: bg, borderRadius: 14, padding: '18px 20px',
            boxShadow: '0 12px 40px rgba(0,0,0,.5), 0 2px 16px ' + glowColor,
            border: '1px solid ' + borderColor,
            animation: 'toastSlideIn .4s ease-out', display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 380
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid ' + iconBorder }}>
              <span style={{ fontSize: 24 }}>🎉</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 800, color: '#0f1d3a', marginBottom: 4, letterSpacing: '.3px' }}>{isPro ? 'New Pro Member!' : 'New Team Member!'}</div>
              <div style={{ fontSize: 13, color: '#172554', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f1d3a' }}>{toast.first_name} {toast.last_name}</strong> just joined your team
              </div>
              <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>
                You'll earn <strong style={{ color: '#0f1d3a' }}>{commission}/month</strong> from this referral
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 12px', borderRadius: 6, background: badgeBg, border: '1px solid ' + badgeBorder, color: '#0f1d3a', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{isPro ? '★ Pro member' : 'Basic member'}</span>
                <span style={{ fontSize: 10, color: 'rgba(15,29,58,.4)' }}>@{toast.username}</span>
              </div>
            </div>
            <button onClick={function() { dismissToast(toast.key); }}
              style={{ background: closeBg, border: '1px solid ' + badgeBorder, borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(15,29,58,.5)', fontSize: 13, flexShrink: 0 }}>✕</button>
          </div>;
        })}
      </div>}
    </AppLayout>
  );
}
