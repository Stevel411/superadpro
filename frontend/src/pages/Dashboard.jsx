import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { formatMoney } from '../utils/money';
import AppLayout from '../components/layout/AppLayout';
import { Users, LayoutGrid, GraduationCap, Rocket, Store, BookOpen, PenSquare, Zap, Bot, Eye, TrendingUp, Gauge } from 'lucide-react';
import { TYPE } from '../styles/typography';
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

  // Story prompt nudge — shown to members with ≥1 paid commission who
  // haven't submitted a story. Dismissal persists in localStorage.
  const [storyPrompt, setStoryPrompt] = useState(null);
  const [storyPromptDismissed, setStoryPromptDismissed] = useState(function() {
    try { return localStorage.getItem('story-prompt-dismissed') === '1'; } catch(e) { return false; }
  });
  useEffect(function() {
    if (storyPromptDismissed) return;
    apiGet('/api/member/story/prompt-check')
      .then(function(r) { if (r && r.show) setStoryPrompt(r); })
      .catch(function() {});
  }, [storyPromptDismissed]);
  function dismissStoryPrompt() {
    setStoryPromptDismissed(true);
    try { localStorage.setItem('story-prompt-dismissed', '1'); } catch(e) {}
  }

  // Annual upsell banner — shown to monthly-billing active members.
  // Dismissal persists in localStorage.
  const [annualUpsellDismissed, setAnnualUpsellDismissed] = useState(function() {
    try { return localStorage.getItem('annual-upsell-dismissed') === '1'; } catch(e) { return false; }
  });
  function dismissAnnualUpsell() {
    setAnnualUpsellDismissed(true);
    try { localStorage.setItem('annual-upsell-dismissed', '1'); } catch(e) {}
  }
  var showAnnualUpsell = !annualUpsellDismissed
    && user && user.is_active
    && (user.membership_billing || 'monthly') === 'monthly';

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
    >
      {/* Free member activation banner */}
      {!d.is_active && (
        <div style={{
          background: 'linear-gradient(135deg,#f0fdf4,#ecfeff)', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '20px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{...TYPE.cardTitleBold, color: '#132044', marginBottom: 6}}>🎯 {t('dashboard.activationTitle')}</div>
            <p style={{...TYPE.bodyLarge, margin: 0}}>
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

      {/* Story prompt nudge — only shown to members with ≥1 paid commission who
          haven't submitted a story yet. Server-gated via /api/member/story/prompt-check.
          Dismissible (localStorage). */}
      {storyPrompt && !storyPromptDismissed && (
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
          border: '1px solid #fcd34d',
          borderRadius: 12, padding: '18px 22px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          {/* Dismiss (×) — absolute top-right */}
          <button onClick={dismissStoryPrompt}
            aria-label={t('dashboard.storyPromptDismiss', { defaultValue: 'Dismiss' })}
            style={{
              position: 'absolute', top: 8, right: 10,
              background: 'transparent', border: 'none',
              fontSize: 20, lineHeight: 1, color: '#92400e',
              cursor: 'pointer', padding: '2px 6px', opacity: 0.55,
            }}>×</button>
          <div style={{ flex: 1, minWidth: 240, paddingRight: 24 }}>
            <div style={{...TYPE.cardTitleBold, color: '#78350f', marginBottom: 6}}>
              🎉 {t('dashboard.storyPromptTitle', { amount: formatMoney(storyPrompt.first_amount), defaultValue: 'You earned your first ' + formatMoney(storyPrompt.first_amount) + '!' })}
            </div>
            <p style={{...TYPE.bodyLarge, color: '#78350f', margin: 0}}>
              {t('dashboard.storyPromptBody', { defaultValue: 'Share the story of how you did it — your experience could inspire the next member. Takes 2 minutes. Our team reviews before it goes live on /explore.' })}
            </p>
          </div>
          <Link to="/share-story" style={{
            fontSize: 14, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg,#d97706,#f59e0b)',
            padding: '11px 22px', borderRadius: 9, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(217,119,6,0.35)', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {t('dashboard.storyPromptCta', { defaultValue: 'Share my story' })} →
          </Link>
        </div>
      )}

      {/* Annual billing upsell — shown to monthly members only, dismissible.
          State handled by showAnnualUpsell + dismissAnnualUpsell above. */}
      {showAnnualUpsell && (
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
          border: '1px solid #93c5fd',
          borderRadius: 12, padding: '18px 22px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <button onClick={dismissAnnualUpsell}
            aria-label={t('dashboard.annualUpsellDismiss', { defaultValue: 'Dismiss' })}
            style={{
              position: 'absolute', top: 8, right: 10,
              background: 'transparent', border: 'none',
              fontSize: 20, lineHeight: 1, color: '#1e40af',
              cursor: 'pointer', padding: '2px 6px', opacity: 0.55,
            }}>×</button>
          <div style={{ flex: 1, minWidth: 240, paddingRight: 24 }}>
            <div style={{...TYPE.cardTitleBold, color: '#1e3a8a', marginBottom: 6}}>
              💰 {t('dashboard.annualUpsellTitle', { defaultValue: 'Switch to annual billing and save up to $70/year' })}
            </div>
            <p style={{...TYPE.bodyLarge, color: '#1e40af', margin: 0}}>
              {t('dashboard.annualUpsellBody', { defaultValue: 'Pay yearly and save 17% — that\'s $40/year off Basic or $70/year off Pro. Switch anytime, no hassle.' })}
            </p>
          </div>
          <Link to="/upgrade" style={{
            fontSize: 14, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg,#1e40af,#2563eb)',
            padding: '11px 22px', borderRadius: 9, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(30,64,175,0.35)', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {t('dashboard.annualUpsellCta', { defaultValue: 'View plans' })} →
          </Link>
        </div>
      )}

      {/* ── Compact welcome hero ──────────────────────────────
          Narrower, cleaner hero replacing the taller cosmic-purple
          banner. Avatar + name/meta on left, referral pill on right.
          Uses design-token cobalt gradient matching other hero banners
          on the platform. */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid))',
        borderRadius: 18,
        padding: '22px 28px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        boxShadow: '0 8px 32px rgba(30,58,138,0.35)',
      }}>
        {/* Left — avatar + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
          {/* Avatar: show uploaded image if user has one, otherwise first letter */}
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt=""
              style={{
                width: 72, height: 72, borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
                border: '3px solid rgba(255,255,255,0.15)',
              }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sap-accent-pale), var(--sap-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 900,
              color: '#fff', flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 14px rgba(14,165,233,0.25)',
            }}>
              {(d.display_name || d.first_name || user?.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
              marginBottom: 4,
            }}>{t('dashboard.welcomeBack', { defaultValue: 'Welcome back' })}</div>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 900,
              color: '#fff', marginBottom: 6, lineHeight: 1.1,
              letterSpacing: '-0.3px',
            }}>
              {d.display_name || d.first_name || user?.username || ''}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: 'rgba(255,255,255,0.75)',
              flexWrap: 'wrap',
            }}>
              {/* Tier badge — subtle outline matching the rest of the
                  meta row, with solid gold (Pro) or silver (Basic) text
                  inside. The outline stays neutral — only the letterforms
                  carry the tier colour, which reads as premium without
                  shouting. */}
              {user?.membership_tier && (
                <span style={{
                  padding: '3px 11px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 11, fontWeight: 900, letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  // Solid metallic colour for the letterforms — gold for
                  // Pro (#ffd700 core gold), silver for Basic (#d4dce8
                  // cool silver). Chosen from the mid-stop of the 5-stop
                  // metallic gradients used on toast notifications.
                  color: user.membership_tier === 'pro' ? '#ffd700' : '#d4dce8',
                  textShadow: user.membership_tier === 'pro'
                    ? '0 1px 2px rgba(0,0,0,0.4)'
                    : '0 1px 2px rgba(0,0,0,0.3)',
                }}>{user.membership_tier}</span>
              )}
              {/* Active since — date from user.created_at, added server-side
                  to /api/dashboard as d.active_since (format: "Mar 2026") */}
              {d.active_since && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{t('dashboard.activeSince', { defaultValue: 'Active since' })} {d.active_since}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right — referral link pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12,
          padding: '10px 12px 10px 18px',
          flexShrink: 0,
          minWidth: 280,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.3,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
              marginBottom: 2,
            }}>{t('dashboard.yourReferralLink', { defaultValue: 'Your referral link' })}</div>
            <div style={{
              fontSize: 14, fontFamily: 'monospace', fontWeight: 600,
              color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              superadpro.com/ref/{user?.username}
            </div>
          </div>
          <button onClick={function() { copyRefLink('https://www.superadpro.com/ref/' + (user?.username || '')); }}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: '#fff', color: 'var(--sap-cobalt-mid)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
            📋 {refCopied ? t('dashboard.copied') : t('dashboard.copy')}
          </button>
        </div>
      </div>

      {/* ── Income strip · compact at-a-glance per-stream earnings ──
          This row used to be 4 hero-sized cards which competed with the
          door cards below for attention and made the hierarchy feel
          upside-down. Rebalanced 26 Apr 2026: shrunk to a tight one-row
          strip so the four doors below become the visual anchor of the
          page. Same data binding (membership_earned / boost_earned /
          creative_studio_earned / course_earnings from /api/dashboard).
          Members who want full income detail click the green Income door
          which has its own dedicated landing page. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 12 }}>{t('dashboard.earningsStrip', { defaultValue: 'Your earnings this month' })}</div>
      <div className="income-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { color: 'var(--sap-green)',       val: d.membership_earned,            name: t('dashboard.membership') },
          { color: 'var(--sap-amber-dark)',  val: d.boost_earned,                 name: t('dashboard.campaigns') },
          { color: 'var(--sap-purple)',      val: d.creative_studio_earned || 0,  name: t('dashboard.creditNexus', { defaultValue: 'Credit Nexus' }) },
          { color: 'var(--sap-accent)',      val: d.course_earnings || 0,         name: t('dashboard.courseIncome', { defaultValue: 'Courses' }) },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid var(--sap-border)',
            borderRadius: 10,
            padding: '14px 16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}>
            {/* Left-edge accent stripe in the stream's brand colour */}
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.color }} />
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: 'var(--sap-text-primary)' }}>
              ${formatMoney(s.val)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-text-muted)', marginTop: 2 }}>
              {s.name}
            </div>
          </div>
        ))}
      </div>

      {/* ── Explore the platform · 4 doors (1×4 row) ──
          Dashboard is the member's entry point. These 4 doors are the
          navigation out to each major area of the platform. The Command
          Centre door stays on /dashboard (= "home") — other three take
          the member outward. Uses only design-tokens.css variables,
          same responsive pattern as income-grid (4 cols → 2 on mobile). */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>{t('dashboard.exploreSection', { defaultValue: 'Explore the platform' })}</div>
      <div className="doors-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            id: 'command-centre',
            label: t('dashboard.doorCockpitLabel', { defaultValue: 'Your cockpit' }),
            title: t('dashboard.doorCommandCentre', { defaultValue: 'Command Centre' }),
            desc: t('dashboard.doorCommandCentreDesc', { defaultValue: "Daily briefing, team pulse, today's play." }),
            count: t('dashboard.doorItems', { count: 9, defaultValue: '9 items' }),
            colourVar: 'var(--sap-accent)',
            icon: Gauge,
            link: '/command-centre',
          },
          {
            id: 'income',
            label: t('dashboard.doorEarnLabel', { defaultValue: 'Where you earn' }),
            title: t('dashboard.doorIncome', { defaultValue: 'Income' }),
            desc: t('dashboard.doorIncomeDesc', { defaultValue: 'Earnings, wallet, and the 4 streams that pay you.' }),
            count: t('dashboard.doorItems', { count: 7, defaultValue: '7 items' }),
            colourVar: 'var(--sap-green)',
            icon: TrendingUp,
            link: '/income',
          },
          {
            id: 'tools',
            label: t('dashboard.doorBuildLabel', { defaultValue: 'Build your business' }),
            title: t('dashboard.doorTools', { defaultValue: 'Tools' }),
            desc: t('dashboard.doorToolsDesc', { defaultValue: 'Creative Studio, Lead Finder, funnels, outreach.' }),
            count: t('dashboard.doorTools', { count: 14, defaultValue: '14 tools' }),
            colourVar: 'var(--sap-violet)',
            icon: PenSquare,
            link: '/marketing-materials',
          },
          {
            id: 'learn',
            label: t('dashboard.doorLearnLabel', { defaultValue: 'Skill up' }),
            title: t('dashboard.doorLearn', { defaultValue: 'Learn' }),
            desc: t('dashboard.doorLearnDesc', { defaultValue: 'Fast Start, comp plan, traffic guide, community.' }),
            count: t('dashboard.doorItems', { count: 8, defaultValue: '8 items' }),
            colourVar: 'var(--sap-amber-dark)',
            icon: BookOpen,
            link: '/training',
          },
        ].map((door) => {
          const Icon = door.icon;
          return (
            <Link key={door.id} to={door.link} className="action-card" style={{
              background: 'var(--sap-bg-card)',
              border: '1px solid var(--sap-border)',
              borderRadius: 18,
              padding: '32px 28px 28px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.06)',
              textDecoration: 'none',
              transition: 'all 0.18s',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              position: 'relative',
              overflow: 'hidden',
              color: 'inherit',
              minHeight: 280,
            }}>
              {/* 5px top accent in the door's brand colour — slightly thicker
                  than before (4px → 5px) to read at the new larger card size */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: door.colourVar }} />
              <div style={{ width: 64, height: 64, borderRadius: 16, background: door.colourVar, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Icon size={28} color="#fff" />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 8 }}>
                {door.label}
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--sap-text-primary)', letterSpacing: '-0.6px', lineHeight: 1.1, marginBottom: 10 }}>
                {door.title}
              </div>
              <div style={{...TYPE.bodyMuted, fontSize: 14, lineHeight: 1.5, marginBottom: 16, flex: 1}}>
                {door.desc}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--sap-border-light)', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: 'var(--sap-text-faint)' }}>{door.count}</span>
                <span style={{ color: door.colourVar, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {t('dashboard.doorOpen', { defaultValue: 'Open' })} →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Quick actions · Pay It Forward + Platform Tour ──
          Two shortcuts that don't belong inside a door:
          - Pay It Forward: the generosity action — gift a membership to
            someone, reminds members to help others (distinct from
            self-promotion which the Smart Goals card already handles).
          - Platform Tour: helps brand-new members get oriented fast. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>{t('dashboard.quickActions')}</div>
      <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            name: t('dashboard.payItForward', { defaultValue: 'Pay It Forward' }),
            desc: t('dashboard.payItForwardDesc', { defaultValue: 'Gift a membership to someone starting out — help others while you grow.' }),
            link: '/pay-it-forward',
            color: 'var(--sap-pink)',
            // Pale end-stop for the accent bar gradient (solid colour, NOT a nested
            // gradient — nesting gradients produces invalid CSS that fails silently)
            accentPale: '#fbcfe8',
            bg: 'linear-gradient(135deg,#fdf2f8,#fce7f3)',
            // Gift icon — same shape as used inside PayItForward.jsx itself
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="13" rx="2" fill="#fce7f3" stroke="var(--sap-pink)" strokeWidth="1.5"/><path d="M3 12h18" stroke="var(--sap-pink)" strokeWidth="1.5"/><path d="M12 8v13" stroke="var(--sap-pink)" strokeWidth="1.5"/><path d="M7.5 8c-1.5 0-2.5-1-2.5-2.5S6 3 7.5 3C9 3 10 4.5 12 8c2-3.5 3-5 4.5-5S19 4 19 5.5 18 8 16.5 8" stroke="var(--sap-pink)" strokeWidth="1.5" fill="#fdf2f8"/></svg>),
          },
          {
            name: t('dashboard.platformTour'),
            desc: t('dashboard.platformTourDesc'),
            link: '/tour',
            color: 'var(--sap-violet)',
            accentPale: '#ddd6fe',
            bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
            icon: (<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="var(--sap-purple-pale)" stroke="var(--sap-violet)" strokeWidth="1.5"/><path d="M12 8v4l3 3" stroke="var(--sap-violet)" strokeWidth="2" strokeLinecap="round"/><path d="M9 3l3-1 3 1" stroke="var(--sap-purple-light)" strokeWidth="1.5" strokeLinecap="round"/></svg>),
          },
        ].map((a, i) => (
          <Link key={i} to={a.link} className="action-card" style={{
            background: '#fff',
            border: '1px solid #e2e8f0', borderRadius: 14, padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
            textDecoration: 'none', transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center', gap: 10,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Top accent bar — matches income-stream card pattern. Uses
                a.accentPale (SOLID colour) for the second gradient stop,
                NOT a.bg (which is a full nested gradient — invalid CSS). */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${a.color}, ${a.accentPale})`,
              borderRadius: '14px 14px 0 0',
            }} />
            <div style={{ width: 68, height: 68, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg }}>
              {a.icon}
            </div>
            <div style={TYPE.cardTitleBold}>{a.name}</div>
            <div style={{...TYPE.body, color: '#475569', lineHeight: 1.5}}>{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* ── Smart Goals ── */}
      {goals && ((goals.goals && goals.goals.length > 0) || (goals.opportunities && goals.opportunities.length > 0)) && (
        <>
          {goals.goals && goals.goals.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 12 }}>{t('dashboard.goalsThisWeek')}</div>
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
                            <div style={{...TYPE.cardTitleBold, lineHeight: 1.3}}>{goalText(g, 'title')}</div>
                          </div>
                          <div style={{...TYPE.bodyMuted, marginBottom: 14}}>{goalText(g, 'desc')}</div>
                          {g.progress !== undefined && !g.ring && (
                            <>
                              <div style={{ height:6, borderRadius:99, background:`${g.color}18`, overflow:'hidden', marginBottom:6 }}>
                                <div style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${g.color},${g.color}cc)`, width:`${g.progress}%`, transition:'width .8s ease-out' }}/>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, color:'var(--sap-text-muted)' }}>
                                <span>{goalText(g, 'progress_label')}</span>
                                <span style={{ color:g.color, fontWeight:700 }}>{g.progress}%</span>
                              </div>
                            </>
                          )}
                          <Link to={g.cta_link} style={{ display:'inline-block', ...TYPE.btn, padding:'10px 22px', borderRadius:8, background:g.color, color:'#fff', textDecoration:'none', marginTop:10 }}>{goalText(g, 'cta')}</Link>
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
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 12 }}>{t('dashboard.moreOpportunities')}</div>
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
                        <div style={{...TYPE.cardTitleBold, lineHeight: 1.3}}>{goalText(g, 'title')}</div>
                      </div>
                      <div style={{...TYPE.bodyMuted, marginBottom: 14}}>{goalText(g, 'desc')}</div>
                      <Link to={g.cta_link} style={{ display:'inline-block', ...TYPE.btn, padding:'10px 22px', borderRadius:8, background:g.color, color:'#fff', textDecoration:'none' }}>{goalText(g, 'cta')}</Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Network strip · compact at-a-glance team metrics ──
          Replaces the previous 'Bottom Row' which was Recent Activity +
          Your Network 2x2 metric grid + duplicate referral link.
          Rebalanced 26 Apr 2026 alongside the earnings strip up top so
          Dashboard reads as: Hero → Earnings strip → 4 BIG doors →
          Quick actions → Goals → Network strip. Same visual treatment
          as the earnings strip (12px pad, 22px Sora number, 12px label,
          3px left-edge accent) for clean symmetry.
          Recent Activity removed entirely — that information lives on
          Command Centre, where status content belongs. The duplicate
          referral link is dropped too — already in the welcome hero. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 12, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{t('dashboard.yourNetwork')}</span>
        <Link to="/courses/commissions" style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-accent)', textDecoration: 'none', textTransform: 'none', letterSpacing: 0 }}>
          {t('dashboard.fullNetwork')} →
        </Link>
      </div>
      <div className="income-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { color: 'var(--sap-green)',      val: d.direct_referrals_count || 0,                 name: t('dashboard.directReferrals') },
          { color: 'var(--sap-accent)',     val: d.total_team || 0,                             name: t('dashboard.totalNetwork') },
          { color: 'var(--sap-amber-dark)', val: `$${formatMoney(d.total_earned)}`,             name: t('dashboard.lifetimeEarned') },
          { color: 'var(--sap-purple)',     val: `$${formatMoney(d.creative_studio_earned || 0)}`, name: t('dashboard.nexusEarned', { defaultValue: 'Nexus Earned' }) },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid var(--sap-border)',
            borderRadius: 10,
            padding: '14px 16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}>
            {/* Left-edge accent stripe */}
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.color }} />
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: 'var(--sap-text-primary)' }}>
              {s.val}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-text-muted)', marginTop: 2 }}>
              {s.name}
            </div>
          </div>
        ))}
      </div>

      {/* Welcome banner animations */}
      <style>{`
        @keyframes wbBag{0%,100%{transform:rotate(-5deg)}50%{transform:translateY(-10px) rotate(3deg)}}

        @keyframes wbStar{0%,100%{opacity:0}50%{opacity:1}}
        .stream-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-2px)}
        .action-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-3px)}
        @media(max-width:767px){
          .income-grid{grid-template-columns:repeat(2,1fr)!important}
          .doors-grid{grid-template-columns:repeat(2,1fr)!important}
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
                <span style={{ padding: '3px 12px', borderRadius: 6, background: badgeBg, border: '1px solid ' + badgeBorder, color: 'var(--sap-cobalt-deep)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{isPro ? '★ ' + t('dashboard.proMember') : t('dashboard.basicMember')}</span>
                <span style={{ fontSize: 13, color: 'rgba(15,29,58,.4)' }}>@{toast.username}</span>
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
