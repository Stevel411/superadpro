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
      if (!data) { setError(t('dashboard.loadingTimeout')); setLoading(false); }
    }, 10000);
    apiGet('/api/dashboard')
      .then(d => { clearTimeout(timeout); _dashCache.data = d; _dashCache.ts = Date.now(); setData(d); setLoading(false); })
      .catch(e => { clearTimeout(timeout); if (!data) { setError(e?.message || t('dashboard.loadFailed')); setLoading(false); } });
    apiGet('/api/dashboard/goals').then(g => setGoals(g)).catch(() => {});
    return function() { clearTimeout(timeout); };
  }, []);

  if (loading) {
    return <AppLayout title={t("dashboard.title")}><div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: 'var(--sap-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div></AppLayout>;
  }

  if (error || !data) {
    return <AppLayout title={t("dashboard.title")}><div style={{ textAlign: 'center', padding: 80, color: 'var(--sap-text-muted)' }}>
      <div style={{ fontSize: 16, marginBottom: 12 }}>{error || t('dashboard.unableToLoad')}</div>
      <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: 'var(--sap-accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{t('dashboard.refreshPage')}</button>
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

  // Goal text translation helper
  var goalText = function(g, field) {
    if (!g.goal_key) return g[field];
    var keyMap = {
      shareLink: { title: 'goalShareLink', desc: 'goalShareLinkDesc', cta: 'goalShareLink2', progress_label: 'goalOfReferrals' },
      '1more': { title: 'goal1MoreReferral', desc: 'goal1MoreDesc', cta: 'goalShareLink2', progress_label: 'goalOfReferrals' },
      nmore: { title: 'goalNMoreReferrals', desc: 'goalNMoreDesc', cta: 'goalShareLink2', progress_label: 'goalOfReferrals' },
      earning: { title: 'goalEarningMonth', desc: 'goalEarningMonthDesc', cta: 'goalKeepGrowing', progress_label: 'goalOfReferrals' },
      grid: { title: 'goalGridComplete', desc: 'goalGridDesc', cta: 'goalViewGrid', progress_label: 'goalOfPositions' },
      withdraw: { title: 'goalWithdrawMore', desc: 'goalWithdrawDesc', cta: 'goalViewWallet', progress_label: 'goalOfBalance' },
      watchDone: { title: 'goalWatchComplete', desc: 'goalWatchCompleteDesc', cta: 'goalWatchMore', progress_label: 'goalWatchOfToday' },
      watchNeed: { title: 'goalWatchNMore', desc: 'goalWatchNowDesc', cta: 'goalWatchNow', progress_label: 'goalWatchOfToday' },
      watchStart: { title: 'goalStartWatching', desc: 'goalStartWatchingDesc', cta: 'goalWatchNow', progress_label: 'goalWatchOfToday' },
    };
    var keys = keyMap[g.goal_key];
    if (!keys || !keys[field]) return g[field];
    return t('dashboard.' + keys[field], g.params || {});
  };

  return (
    <AppLayout
      title={t("dashboard.title")}
      topbarActions={<>
        <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, padding: '7px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{t('dashboard.balance')}</div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 900, color: 'var(--sap-green)' }}>${formatMoney(d.balance)}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
          ...(d.is_active
            ? { background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }
            : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--sap-amber-bright)' })
        }}>
          {d.is_active ? '● ' + t('dashboard.activeMember') : '○ ' + t('dashboard.inactive')}
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
            <div style={{ fontSize: 15, fontWeight: 800, color: '#132044', marginBottom: 6 }}>🎯 {t('dashboard.activationTitle')}</div>
            <p style={{ fontSize: 14, color: 'var(--sap-text-secondary)', lineHeight: 1.7, margin: 0 }}>
              {t('dashboard.activationDesc1')} <strong>{t('dashboard.activationDesc2')}</strong>. {t('dashboard.activationDesc3')} <strong style={{ color: '#0891b2' }}>{t('dashboard.activationPaidFor')}</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
            <a href="/upgrade" style={{
              fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
              padding: '11px 22px', borderRadius: 9, textDecoration: 'none', boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
            }}>{t('dashboard.activateNow')}</a>
            <Link to="/affiliate" style={{ fontSize: 13, fontWeight: 600, color: '#0891b2', textDecoration: 'none' }}>{t('dashboard.getMyReferralLink')}</Link>
          </div>
        </div>
      )}

      {/* Welcome Banner — Cosmic Purple with referral link */}
      <div style={{
        background: 'linear-gradient(135deg,#172554,#1e3a8a,#4338ca)',
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
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.65)', marginBottom:8 }}>{t('dashboard.welcomeBack')}</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#fff', marginBottom:8 }}>{d.display_name || user?.username}</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, maxWidth:420, marginBottom:16 }}>
            {t('dashboard.networkMembers', { count: d.total_team || 0 })}{(d.total_earned || 0) > 0 && ` ${t('dashboard.andEarned', { amount: formatMoney(d.total_earned) })}`}.
          </div>

          {/* Referral link bar */}
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(0,0,0,0.25)', borderRadius:10, padding:'10px 16px', maxWidth:520 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', flexShrink:0 }}>{t('dashboard.yourLink')}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--sap-accent-light)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace' }}>
              www.superadpro.com/ref/{user?.username}
            </div>
            <button onClick={function() { copyRefLink('https://www.superadpro.com/ref/' + (user?.username || '')); }}
              style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'var(--sap-accent)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              {refCopied ? t('dashboard.copied') : t('dashboard.copy')}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Income Streams */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 12 }}>{t('dashboard.yourIncomeStreams', { defaultValue: 'Your 4 Income Streams' })}</div>
      <div className="income-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            color: 'var(--sap-green)', bg: 'var(--sap-green-bg-mid)', badge: t('dashboard.perReferral'),
            val: d.membership_earned, name: t('dashboard.membership'),
            detail: t('dashboard.personalReferrals', { count: d.personal_referrals || 0 }),
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7" r="4" fill="var(--sap-green)" opacity="0.9"/>
                <path d="M2 21v-1a7 7 0 0 1 14 0v1" stroke="var(--sap-green)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="19" cy="8" r="2.5" fill="#4ade80"/>
                <path d="M22 21v-.5a4.5 4.5 0 0 0-6-4.24" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )
          },
          {
            color: 'var(--sap-amber-dark)', bg: 'var(--sap-amber-bg)', badge: t('dashboard.watchAndGrid'),
            val: d.boost_earned, name: t('dashboard.campaigns'),
            detail: t('dashboard.watchGridCommissions'),
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="var(--sap-amber)"/>
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="url(#zapGrad)"/>
                <defs>
                  <linearGradient id="zapGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--sap-amber-bright)"/>
                    <stop offset="1" stopColor="var(--sap-amber-dark)"/>
                  </linearGradient>
                </defs>
              </svg>
            )
          },
          {
            color: 'var(--sap-purple)', bg: 'var(--sap-purple-pale)', badge: t('dashboard.profitNexus'),
            val: d.creative_studio_earned || 0, name: t('dashboard.creditNexus', { defaultValue: 'Credit Nexus' }),
            detail: t('dashboard.nexusCommissions'),
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="3" fill="var(--sap-purple)" opacity=".8"/>
                <polygon points="10,7 10,14 16,10.5" fill="#fff"/>
                <rect x="6" y="19" width="12" height="2" rx="1" fill="var(--sap-purple-light)"/>
              </svg>
            )
          },
          {
            color: 'var(--sap-accent)', bg: '#ecfeff', badge: t('dashboard.courseSales', { defaultValue: 'Pass-Up' }),
            val: d.course_earnings || 0, name: t('dashboard.courseIncome', { defaultValue: 'Courses' }),
            detail: t('dashboard.courseCommissions', { defaultValue: 'Course sales + pass-ups' }),
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="2" width="18" height="18" rx="3" fill="var(--sap-accent)" opacity=".8"/>
                <path d="M8 7h8M8 11h6M8 15h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="6" y="20" width="12" height="2" rx="1" fill="#7dd3fc"/>
              </svg>
            )
          },
        ].map((s, i) => (
          <div key={i} className="stream-card" style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
            position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: \`linear-gradient(90deg, \${s.color}, \${s.bg})\`, borderRadius: '14px 14px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg }}>
                {s.icon}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, letterSpacing: 0.3, background: s.bg, color: s.color }}>{s.badge}</span>
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 6 }}>\${formatMoney(s.val)}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 3 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>{s.detail}</div>
          </div>
        ))}
      </div>

      {/* ── Smart Goals ── */}
      {goals && ((goals.goals && goals.goals.length > 0) || (goals.opportunities && goals.opportunities.length > 0)) && (
        <>
          {goals.goals && goals.goals.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 12 }}>{t('dashboard.goalsThisWeek')}</div>
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
                    <div key={i} style={{ background: isCompleted ? 'var(--sap-green-bg)' : '#fff', borderRadius:14, border: isCompleted ? '1px solid #bbf7d0' : '1px solid #e8ecf2', padding:'18px 20px', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${g.color},${g.color}80)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                            <div style={{ width:38, height:38, borderRadius:10, background:g.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {ICONS[g.icon] || ICONS.zap}
                            </div>
                            <div style={{ fontSize:14, fontWeight:800, color:'var(--sap-text-primary)', lineHeight:1.3 }}>{goalText(g, 'title')}</div>
                          </div>
                          <div style={{ fontSize:12, color:'var(--sap-text-muted)', lineHeight:1.5, marginBottom:14 }}>{goalText(g, 'desc')}</div>
                          {g.progress !== undefined && !g.ring && (
                            <>
                              <div style={{ height:6, borderRadius:99, background:`${g.color}18`, overflow:'hidden', marginBottom:6 }}>
                                <div style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${g.color},${g.color}cc)`, width:`${g.progress}%`, transition:'width .8s ease-out' }}/>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--sap-text-muted)' }}>
                                <span>{goalText(g, 'progress_label')}</span>
                                <span style={{ color:g.color, fontWeight:700 }}>{g.progress}%</span>
                              </div>
                            </>
                          )}
                          <Link to={g.cta_link} style={{ display:'inline-block', fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:8, background:g.color, color:'#fff', textDecoration:'none', marginTop:10 }}>{goalText(g, 'cta')}</Link>
                        </div>
                        {g.ring && (
                          <svg width="56" height="56" viewBox="0 0 52 52" style={{ flexShrink:0, marginTop:4 }}>
                            <circle cx="26" cy="26" r={R} fill="none" stroke="var(--sap-bg-page)" strokeWidth="5"/>
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
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 12 }}>{t('dashboard.moreOpportunities')}</div>
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
                        <div style={{ fontSize:14, fontWeight:800, color:'var(--sap-text-primary)', lineHeight:1.3 }}>{goalText(g, 'title')}</div>
                      </div>
                      <div style={{ fontSize:12, color:'var(--sap-text-muted)', lineHeight:1.5, marginBottom:14 }}>{goalText(g, 'desc')}</div>
                      <Link to={g.cta_link} style={{ display:'inline-block', fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:8, background:g.color, color:'#fff', textDecoration:'none' }}>{goalText(g, 'cta')}</Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Quick Actions — 6 cards, same for all members */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>{t('dashboard.quickActions')}</div>
      <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            name: t('dashboard.platformTour'), desc: t('dashboard.platformTourDesc'), link: '/tour',
            color: 'var(--sap-violet)', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="var(--sap-purple-pale)" stroke="var(--sap-violet)" strokeWidth="1.5"/><path d="M12 8v4l3 3" stroke="var(--sap-violet)" strokeWidth="2" strokeLinecap="round"/><path d="M9 3l3-1 3 1" stroke="var(--sap-purple-light)" strokeWidth="1.5" strokeLinecap="round"/></svg>)
          },
          {
            name: t('dashboard.shareYourLink'), desc: t('dashboard.shareYourLinkDesc'), link: '/affiliate',
            color: 'var(--sap-accent)', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#cffafe" stroke="var(--sap-accent)" strokeWidth="1.5"/><path d="M8 12h8M12 8v8" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/><circle cx="18" cy="6" r="3" fill="var(--sap-accent)"/><text x="18" y="8" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#fff">$</text></svg>)
          },
          {
            name: t('dashboard.campaignTiers'), desc: t('dashboard.campaignTiersDesc'), link: '/campaign-tiers',
            color: 'var(--sap-green)', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="url(#qaZap)"/><defs><linearGradient id="qaZap" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#4ade80"/><stop offset="1" stopColor="var(--sap-green)"/></linearGradient></defs></svg>)
          },
          {
            name: t('dashboard.compPlanAction'), desc: t('dashboard.compPlanDesc'), link: '/compensation-plan',
            color: 'var(--sap-indigo)', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#e0e7ff" stroke="var(--sap-indigo)" strokeWidth="1.5"/><path d="M8 8h8M8 12h6M8 16h4" stroke="var(--sap-indigo)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="6" r="4" fill="var(--sap-indigo)"/><text x="18" y="8" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#fff">5</text></svg>)
          },
          {
            name: t('dashboard.analytics'), desc: t('dashboard.analyticsDesc'), link: '/analytics',
            color: 'var(--sap-purple)', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="14" width="4" height="7" rx="1" fill="#c4b5fd"/><rect x="10" y="9" width="4" height="12" rx="1" fill="var(--sap-purple-light)"/><rect x="17" y="4" width="4" height="17" rx="1" fill="var(--sap-purple)"/></svg>)
          },
          {
            name: t('dashboard.myNetwork'), desc: t('dashboard.myNetworkDesc'), link: '/network',
            color: 'var(--sap-pink)', bg: 'linear-gradient(135deg,#fdf2f8,#fce7f3)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="#fce7f3" stroke="var(--sap-pink)" strokeWidth="1.5"/><circle cx="5" cy="18" r="3" fill="#f9a8d4"/><circle cx="19" cy="18" r="3" fill="#f9a8d4"/><path d="M12 12v3M8 15l-3 3M16 15l3 3" stroke="var(--sap-pink)" strokeWidth="1.5" strokeLinecap="round"/></svg>)
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
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{a.name}</div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.5 }}>{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
        {/* Recent Activity */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{t('dashboard.recentActivity')}</div>
            <Link to="/courses/commissions" style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-accent)', textDecoration: 'none' }}>{t('dashboard.viewAll')}</Link>
          </div>
          {(!Array.isArray(d.recent_activity) || d.recent_activity.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--sap-text-muted)', fontSize: 13 }}>{t('dashboard.noRecentActivity')}</div>
          ) : d.recent_activity.map((a, i) => {
            const colorMap = { green: 'var(--sap-green-bg-mid)', cyan: '#e0f2fe', purple: 'var(--sap-purple-pale)', amber: 'var(--sap-amber-bg)' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < d.recent_activity.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, background: colorMap[a.color] || 'var(--sap-bg-page)' }}>{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>{a.sub}</div>
                </div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--sap-green)' }}>+${formatMoney(a.amount)}</div>
              </div>
            );
          })}
        </div>

        {/* Network Snapshot */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{t('dashboard.yourNetwork')}</div>
            <Link to="/courses/commissions" style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-accent)', textDecoration: 'none' }}>{t('dashboard.fullNetwork')}</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { val: d.personal_referrals || 0, lbl: t('dashboard.directReferrals') },
              { val: d.total_team || 0, lbl: t('dashboard.totalNetwork') },
              { val: `$${formatMoney(d.total_earned)}`, lbl: t('dashboard.lifetimeEarned') },
              { val: `$${formatMoney(d.creative_studio_earned || 0)}`, lbl: t('dashboard.nexusEarned', { defaultValue: 'Nexus Earned' }) },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--sap-bg-page)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--sap-green)' }}>{s.val}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--sap-bg-page)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)' }}>{t('dashboard.yourReferralLink')}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-accent)', wordBreak: 'break-all' }}>www.superadpro.com/ref/{user?.username}</div>
            </div>
            <button onClick={copyRef} style={{
              padding: '6px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 11, fontWeight: 700, color: 'var(--sap-text-secondary)', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            }}>{refCopied ? t('dashboard.copied') : t('dashboard.copy')}</button>
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
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--sap-cobalt-deep)', marginBottom: 4, letterSpacing: '.3px' }}>{isPro ? t('dashboard.newProMember') : t('dashboard.newTeamMember')}</div>
              <div style={{ fontSize: 13, color: 'var(--sap-cobalt-deep)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--sap-cobalt-deep)' }}>{toast.first_name} {toast.last_name}</strong> {t('dashboard.justJoinedYourTeam')}
              </div>
              <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>
                {t('dashboard.youllEarn')} <strong style={{ color: 'var(--sap-cobalt-deep)' }}>{commission}{t('dashboard.perMonth')}</strong>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 12px', borderRadius: 6, background: badgeBg, border: '1px solid ' + badgeBorder, color: 'var(--sap-cobalt-deep)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{isPro ? '★ ' + t('dashboard.proMember') : t('dashboard.basicMember')}</span>
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
