import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { formatMoney } from '../utils/money';
import AppLayout from '../components/layout/AppLayout';
import { Users, LayoutGrid, GraduationCap, Rocket, Store, BookOpen, PenSquare, Zap, Bot, Eye, DollarSign, Gauge, Gift, Compass, Share2 } from 'lucide-react';
import { TYPE } from '../styles/typography';
import CoPilot from './CoPilot';
import FastStartHero from '../components/FastStartHero';
import PendingCommissionsCard from '../components/PendingCommissionsCard';

// ── Dashboard data cache — survives navigation, clears on full page reload ──
var _dashCache = { data: null, ts: 0 };

export default function Dashboard() {
  var { t } = useTranslation();
  const { user, setUser } = useAuth();

  // Onboarding wizard redirect REMOVED 10 May 2026 (launch day).
  // New users were being bounced to a full-page wizard before they
  // could see their dashboard. Steve flagged: 'this needs to come
  // when the user lands on the dashboard page, not before'. Replaced
  // with a dismissible banner below (see onboardingBanner block).

  // Start with cached data if fresh enough (< 30 seconds old)
  var hasFreshCache = _dashCache.data && (Date.now() - _dashCache.ts < 30000);
  const [data, setData] = useState(hasFreshCache ? _dashCache.data : null);
  const [loading, setLoading] = useState(!hasFreshCache);
  const [refCopied, setRefCopied] = useState(false);

  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [goals, setGoals] = useState(null);

  // Team Pulse — 28 May 2026. Surfaces time-sensitive sponsor prompts
  // (new joins, unactivated nudges, just-activated welcomes) at the top
  // of the dashboard so members act in the activation window (median
  // time-to-activation is <1h per activation-funnel data).
  const [teamPulse, setTeamPulse] = useState(null);
  // Collapsed/expanded state. Auto-default: <=2 prompts expanded, >2 collapsed
  // (so small teams see everything inline, big teams aren't overwhelmed). Once
  // the user manually toggles, that choice persists in sessionStorage for the
  // session — they don't have to re-click on every dashboard visit.
  const [teamPulseExpanded, setTeamPulseExpanded] = useState(null);  // null=auto, true/false=user-set
  useEffect(function() {
    var cancelled = false;
    apiGet('/api/team-pulse')
      .then(function(d) {
        if (cancelled || !d || !d.team) return;
        setTeamPulse(d);
        // Honour any prior user toggle from this session
        var stored = null;
        try { stored = sessionStorage.getItem('sap_team_pulse_expanded'); } catch (e) {}
        if (stored === 'true') setTeamPulseExpanded(true);
        else if (stored === 'false') setTeamPulseExpanded(false);
        else {
          // Auto rule: 2 or fewer prompts = expanded; 3+ = collapsed
          setTeamPulseExpanded((d.prompts || []).length <= 2);
        }
      })
      .catch(function() { /* degrade gracefully — card just doesn't render */ });
    return function() { cancelled = true; };
  }, []);
  function toggleTeamPulse() {
    var next = !teamPulseExpanded;
    setTeamPulseExpanded(next);
    try { sessionStorage.setItem('sap_team_pulse_expanded', String(next)); } catch (e) {}
  }

  // Story prompt nudge — shown to members with ≥1 paid commission who
  // haven't submitted a story. Dismissal persists SERVER-SIDE via
  // /api/member/story/prompt-dismiss so it syncs across devices. The
  // localStorage flag is kept as a fast-path so the banner doesn't flash
  // before the network round-trip completes on subsequent loads.
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
    // Optimistic: hide immediately, mark localStorage for fast-path,
    // then persist server-side. If the network call fails the local
    // dismissal still survives the current session; next login the
    // banner will reappear and the user can dismiss again — annoying
    // but not destructive.
    setStoryPromptDismissed(true);
    try { localStorage.setItem('story-prompt-dismissed', '1'); } catch(e) {}
    apiPost('/api/member/story/prompt-dismiss', {}).catch(function() {});
  }

  // ── Platform maintenance status ──
  // Polled on mount and every 60s so members see the banner appear
  // shortly after admin flips maintenance mode. Fail-silent: if the
  // endpoint errors, we assume live (no banner).
  const [platformMode, setPlatformMode] = useState('live');
  useEffect(function() {
    function fetchStatus() {
      apiGet('/api/platform-status')
        .then(function(r) { if (r && r.mode) setPlatformMode(r.mode); })
        .catch(function() {});
    }
    fetchStatus();
    var interval = setInterval(fetchStatus, 60000);
    return function() { clearInterval(interval); };
  }, []);

  // ── Profit Grid migration banner (25 May 2026 → 1 June 2026) ────────
  // One-week notice after the 6×6/36-seat migration. Shows at the top of
  // the dashboard for any user who hasn't dismissed it. Auto-hides after
  // 1 June 2026 regardless — no need to clean this banner up later, it
  // self-expires. Same localStorage pattern as gift-welcome below.
  const [gridMigration, setGridMigration] = useState(function() {
    try {
      // Auto-expire after 1 June 2026 23:59 UTC
      if (Date.now() > Date.UTC(2026, 5, 1, 23, 59)) return false;
      // Honour user dismissal
      if (localStorage.getItem('grid-migration-25may-dismissed') === '1') return false;
      return true;
    } catch (e) { return true; }
  });
  function dismissGridMigration() {
    setGridMigration(false);
    try { localStorage.setItem('grid-migration-25may-dismissed', '1'); } catch (e) {}
  }

  // ── Gift voucher welcome banner ──────────────────────────────────────
  // Shows a celebratory top banner ONLY on first dashboard load after a
  // successful gift voucher claim. The seamless claim flow redirects to
  // /dashboard?just_claimed=1&from=<gifter_name>; we read those params
  // here. Dismissal persists in localStorage with a 30-day expiry so a
  // member who's been around for a while can still see this banner if
  // they ever receive ANOTHER gift later.
  const [giftWelcome, setGiftWelcome] = useState(function() {
    try {
      var qs = new URLSearchParams(window.location.search);
      if (qs.get('just_claimed') !== '1') return null;
      // Check the dismissal flag — only suppress if dismissed within last 30 days
      var stored = localStorage.getItem('gift-welcome-dismissed');
      if (stored) {
        var dismissedAt = parseInt(stored, 10);
        if (!isNaN(dismissedAt) && (Date.now() - dismissedAt) < 30 * 24 * 60 * 60 * 1000) {
          return null;
        }
      }
      var fromName = qs.get('from');
      return { gifterName: fromName ? decodeURIComponent(fromName) : null };
    } catch (e) { return null; }
  });
  function dismissGiftWelcome() {
    setGiftWelcome(null);
    try { localStorage.setItem('gift-welcome-dismissed', String(Date.now())); } catch(e) {}
    // Strip ?just_claimed=1 from URL so a refresh doesn't re-trigger
    // (defensive — the localStorage flag would suppress it anyway, but
    // a clean URL is just better hygiene).
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete('just_claimed');
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.toString());
    } catch(e) {}
  }

  // ── Onboarding banner ────────────────────────────────────────────────
  // Replaces the full-page wizard redirect that used to fire on first
  // dashboard visit. Banner shows above other content when user.onboarding_completed
  // is false, with two paths:
  //   1. "Start Setup →" → /onboarding (the original wizard, still works)
  //   2. "Maybe later" or × button → marks onboarding_completed=true on
  //      the server so the banner doesn't reappear across devices/sessions
  // Dismissal is server-side (not localStorage) because this is account
  // state, not browser state — a member dismissing on mobile shouldn't
  // see the banner again on desktop.
  function dismissOnboardingBanner() {
    // Optimistic update — hide immediately so the click feels instant.
    // If the API call fails, the banner will reappear on the next page
    // load, which is fine (the action is idempotent and harmless).
    if (setUser && user) {
      setUser(Object.assign({}, user, { onboarding_completed: true }));
    }
    apiPost('/api/onboarding/complete', {}).catch(function() {
      // Silent — if dismiss fails, banner will be back next reload, no harm done.
    });
  }

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

  // ── Achievement toasts (26 May 2026) ─────────────────────────────────
  // On dashboard load + every 60s, check for unseen achievement notifs.
  // Each one slides out as a purple gradient toast for the badge.
  //
  // NOT marked as seen on appearance — only when the user explicitly
  // dismisses (clicks ✕) or clicks the View Badges link. This means a
  // toast that the user navigates away from will reappear on their
  // next dashboard visit, maximising the chance they actually engage
  // with the badge (esp. the grid bonus marketing showpiece).
  //
  // Dedupe is keyed on notification_id — if the 60s poll returns rows
  // already on screen, they're skipped not re-added.
  useEffect(function() {
    function checkAchievements() {
      apiGet('/api/achievements/unseen')
        .then(function(r) {
          if (r && Array.isArray(r.unseen) && r.unseen.length > 0) {
            var anyAdded = false;
            r.unseen.forEach(function(a) {
              setToasts(function(prev) {
                // Dedupe — don't re-add a toast we're already showing
                if (prev.find(function(t) { return t.notification_id === a.notification_id; })) return prev;
                anyAdded = true;
                return prev.concat([{
                  key: 'ach-' + a.notification_id,
                  is_achievement: true,
                  notification_id: a.notification_id,
                  title: a.title,
                  message: a.message,
                  icon: a.icon,
                  link: a.link,
                  badge_id: a.badge_id,
                  metadata: a.metadata,
                }]);
              });
            });
            if (anyAdded) playChaChing();
          }
        }).catch(function() {});
    }
    checkAchievements(); // fire on mount
    var achInterval = setInterval(checkAchievements, 60000);
    return function() { clearInterval(achInterval); };
  }, []);

  function dismissToast(key) {
    // If this is an achievement toast, mark the notification as seen
    // server-side so it doesn't re-appear on next dashboard visit.
    // Non-achievement toasts (new-member) have no server-side seen
    // tracking — they're transient and only dedupe within session.
    setToasts(function(prev) {
      var match = prev.find(function(t) { return t.key === key; });
      if (match && match.is_achievement && match.notification_id) {
        apiPost('/api/achievements/mark-seen',
          { notification_ids: [match.notification_id] }).catch(function() {});
      }
      return prev.filter(function(t) { return t.key !== key; });
    });
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

  // ── Signup-funnel tracking (24 May 2026) ──
  // Fire-and-forget: log that this Free user landed on Dashboard so we can
  // measure the dashboard_view → upgrade_view → activation funnel. Server
  // is idempotent per (user, event, UTC date) so refreshes don't inflate
  // the count. Only fires for Free users; active members are no-op
  // server-side. Guarded by user.is_active so we don't even spend the
  // round-trip for paid members.
  useEffect(function() {
    if (!user || user.is_active) return;
    apiPost('/api/funnel/track', { event: 'dashboard_view_inactive' }).catch(function() {});
  }, [user?.id, user?.is_active]);


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
      {/* ── Maintenance banner ──
          Always-on banner that appears when the platform is in soft or
          hard maintenance mode. Sits above all other banners so it's
          impossible to miss. Member sees this and knows certain actions
          (withdraw / buy / etc.) will be rejected with a 503 right now.
          Disappears as soon as admin flips back to 'live' (polled every
          60s by the useEffect above). */}
      {platformMode !== 'live' && (
        <div style={{
          background: platformMode === 'hard_maintenance'
            ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 16,
          color: '#fff',
          fontFamily: 'Sora,sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          <div style={{fontSize: 24}}>
            {platformMode === 'hard_maintenance' ? '🔧' : '⚠️'}
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 14, fontWeight: 800, marginBottom: 2}}>
              {platformMode === 'hard_maintenance'
                ? 'Platform maintenance in progress'
                : 'Withdrawals temporarily paused'}
            </div>
            <div style={{fontSize: 13, fontWeight: 500, opacity: 0.95, lineHeight: 1.4}}>
              {platformMode === 'hard_maintenance'
                ? 'Money operations and new signups are paused while we resolve an issue. You can browse normally — please try transactions again shortly.'
                : 'Withdrawals are temporarily unavailable. All other features work normally. Please try again in a short while.'}
            </div>
          </div>
        </div>
      )}


      {/* ── Founding Partner banner REMOVED 28 May 2026 ──
          The 100-spot $15/mo founding offer is permanently closed (cap filled,
          pricing reverted to $20 Partner). The banner pitched a dead offer, so
          it's removed outright rather than left relying on a runtime is_open
          flag to hide. Founder *recognition* (the FOUNDER badge + gold toast
          below) stays — that honours the 100 real Founders. */}

      {/* ── Pending commissions (grace-period escrow) ──
          Shows when a downline has upgraded to a tier the member can't
          earn at yet. Self-hides when there's nothing pending. Live
          countdown timers tick every second; data refreshes every 60s.
          Added 26 May 2026. */}
      <PendingCommissionsCard />

      {/* ── Free member activation banner ──
          Moved up here on 24 May 2026 — was previously below the data cards
          and missed by Free users (82% of registered users never paying as
          of 23 May). Tools-first copy aligns with the brand positioning rule:
          we sell the toolkit, not the income claim. The "Get my referral
          link" secondary CTA stays so members who want to refer can. */}
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

      {/* ── Fast Start hero (added 17 May 2026) ──
          Drives Grid Tier 1 activation. Component handles its own
          state (loads /api/fast-start/state, conditionally renders
          hero / continue-card / nothing based on the server state
          machine). Mounting unconditionally is the right pattern —
          the component is null-render-safe. */}
      <FastStartHero />

      {/* ════════════════════════════════════════════════════════════
          REDESIGNED DASHBOARD CORE (30 May 2026, Steve direction)
          Replaces the old stacked heroes (carousel, welcome hero, VSP
          banner, Explore doors, Quick Actions) with a decluttered grid:
            1. Greeting + stats strip
            2. Focus row: Your next move (Team Pulse) + Share & grow
            3. Four doors: Business / Tools / Marketing / Campaign Videos
            4. Income at-a-glance strip
          Conditional banners above/below (free activation, fast start,
          grid migration, gift welcome, tier nudge, story prompt) are
          preserved — only the clutter blocks were removed.
          ════════════════════════════════════════════════════════════ */}
      {(function() {
        var refLink = 'https://www.superadpro.com/ref/' + (user?.username || '');
        var vspLink = refLink + '/video';
        var goalsList = Array.isArray(goals) ? goals : (goals && Array.isArray(goals.goals) ? goals.goals : []);
        var watchGoal = goalsList.find(function(g) { return g.type === 'watch'; });
        var tp = teamPulse && teamPulse.team ? teamPulse : null;
        var tpPrompts = tp ? (tp.prompts || []) : [];
        var tpHasPrompts = tpPrompts.length > 0;
        var tpTeamTotal = tp ? (tp.team.total || 0) : 0;
        var avColors = ['linear-gradient(135deg,#0ea5e9,#22d3ee)','linear-gradient(135deg,#1e3a8a,#0ea5e9)','linear-gradient(135deg,#06b6d4,#0ea5e9)'];

        return (
        <div className="dash-core">
          {/* 1 · Greeting + stats strip */}
          <div className="dc-strip">
            <div className="dc-greet">
              <div className="dc-av">
                {(d.avatar_url || user?.avatar_url)
                  ? <img src={d.avatar_url || user?.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={function(e){ e.target.style.display = 'none'; e.target.parentNode.textContent = (d.display_name || user?.username || 'M').charAt(0).toUpperCase(); }}/>
                  : (d.display_name || user?.username || 'M').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="dc-eyebrow">{t('dashboard.welcomeBack', { defaultValue: 'Welcome back' })}</div>
                <div className="dc-name">{d.display_name || user?.username}</div>
                <div className="dc-meta">
                  {user?.is_founding_member && <span className="dc-badge">{t('dashboard.founderBadge', { defaultValue: 'Founder' })}</span>}
                  {d.active_since && <span>{t('dashboard.activeSince', { date: d.active_since, defaultValue: 'Active since ' + d.active_since })}</span>}
                </div>
              </div>
            </div>
            <div className="dc-stats">
              <div className="dc-stat"><div className="l">{t('dashboard.available', { defaultValue: 'Available' })}</div><div className="v cyan">{formatMoney((d.balance || 0) + (d.campaign_balance || 0))}</div></div>
              <div className="dc-stat"><div className="l">{t('dashboard.thisMonth', { defaultValue: 'This month' })}</div><div className="v">{formatMoney(d.earnings_this_month != null ? d.earnings_this_month : (d.this_month || 0))}</div></div>
              <div className="dc-stat"><div className="l">{t('dashboard.team', { defaultValue: 'Team' })}</div><div className="v">{d.total_team || 0}</div></div>
              <div className="dc-stat"><div className="l">{t('dashboard.allTime', { defaultValue: 'All time' })}</div><div className="v">{formatMoney(d.total_earned)}</div></div>
            </div>
          </div>

          {/* 2 · Focus row */}
          <div className="dc-focus">
            {/* Your next move — Team Pulse promoted (only for members with a team) */}
            {tpTeamTotal > 0 ? (
              <div className="dc-card dc-pad">
                <div className="dc-card-eyebrow">⚡ {t('teamPulse.label', { defaultValue: 'Your next move' })}</div>
                <div className="dc-nm-title">
                  {tpHasPrompts
                    ? t('teamPulse.title', { count: tpPrompts.length, defaultValue: tpPrompts.length + ' team members need you' })
                    : t('teamPulse.titleCalm', { defaultValue: 'Your team is all caught up' })}
                </div>
                {tpHasPrompts ? (
                  <div className="dc-nm-list">
                    {tpPrompts.slice(0, 3).map(function(p, i) {
                      var nm = p.name || p.username || 'Member';
                      return (
                        <div className="dc-nm-row" key={i}>
                          <div className="dc-nm-ava" style={{ background: avColors[i % avColors.length] }}>{nm.charAt(0).toUpperCase()}</div>
                          <div className="dc-nm-who"><div className="n">{nm}</div><div className="s">{p.reason || p.subtitle || ''}</div></div>
                          {p.tag && <span className={'dc-nm-tag ' + (p.tag === 'hot' ? 'hot' : 'new')}>{p.tag}</span>}
                          <Link to="/command-centre" className="dc-nm-btn">{t('teamPulse.reachOut', { defaultValue: 'Reach out' })} →</Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="dc-nm-calm">{t('teamPulse.subCalm', { defaultValue: 'No urgent outreach needed right now.' })}</div>
                )}
                <div className="dc-nm-foot">
                  <span className="c">{tpHasPrompts ? t('teamPulse.needAttention', { count: tpPrompts.length, total: tpTeamTotal, defaultValue: tpPrompts.length + ' of ' + tpTeamTotal + ' team members need attention' }) : ''}</span>
                  <Link to="/command-centre">{t('teamPulse.openTeam', { defaultValue: 'Open Command Centre' })} →</Link>
                </div>
              </div>
            ) : (
              /* No team yet — show a share-first prompt in the focus slot */
              <div className="dc-card dc-pad">
                <div className="dc-card-eyebrow">⚡ {t('dashboard.nextMove', { defaultValue: 'Your next move' })}</div>
                <div className="dc-nm-title">{t('dashboard.growYourTeam', { defaultValue: 'Share your link to grow your team' })}</div>
                <div className="dc-nm-calm">{t('dashboard.growYourTeamBody', { defaultValue: 'Every Partner you refer earns you $10/month. Share your referral link or your Video Sales Page to get started.' })}</div>
                <div className="dc-nm-foot">
                  <span className="c"></span>
                  <Link to="/social-share">{t('dashboard.shareNow', { defaultValue: 'Share now' })} →</Link>
                </div>
              </div>
            )}

            {/* Share & grow — referral + VSP merged */}
            <div className="dc-card dc-pad">
              <div className="dc-card-eyebrow">{t('dashboard.shareGrow', { defaultValue: 'Share & grow' })}</div>
              <div className="dc-sg-title">{t('dashboard.yourLinks', { defaultValue: 'Your links' })}</div>
              <div className="dc-sg-block">
                <div className="dc-sg-lab">{t('dashboard.yourReferralLink', { defaultValue: 'Referral link' })}</div>
                <div className="dc-sg-link">
                  <span className="u">superadpro.com/ref/{user?.username}</span>
                  <button className="cp" onClick={function() { copyRefLink(refLink); }}>{refCopied ? t('dashboard.copied', { defaultValue: 'Copied' }) : t('dashboard.copy', { defaultValue: 'Copy' })}</button>
                </div>
              </div>
              <div className="dc-sg-vsp">
                <span className="badge">● {t('dashboard.new', { defaultValue: 'New' })}</span>
                <div className="t">{t('dashboard.videoSalesBanner.titleShort', { defaultValue: 'Your Video Sales Page' })}</div>
                <div className="d">{t('dashboard.videoSalesBanner.bodyShort', { defaultValue: 'A polished landing page with the platform overview and your link baked in.' })}</div>
                <div className="dc-sg-vsp-btns">
                  <button className="vb-copy" onClick={function() { copyRefLink(vspLink); }}>{t('dashboard.copyLink', { defaultValue: 'Copy link' })}</button>
                  <a className="vb-prev" href={vspLink} target="_blank" rel="noopener noreferrer">{t('dashboard.preview', { defaultValue: 'Preview' })}</a>
                </div>
              </div>
            </div>
          </div>

          {/* 3 · Four doors */}
          <div className="dc-section-label">
            <span className="t">{t('dashboard.whereToStart', { defaultValue: 'Where to start' })}</span>
            <span className="sub">{t('dashboard.whereToStartSub', { defaultValue: 'Four ways into the platform — pick wherever you want to begin.' })}</span>
          </div>
          <div className="dc-doors">
            <Link to="/income" className="dc-door">
              <div className="dc-door-ico" style={{ background: 'linear-gradient(135deg,#1e3a8a,#0ea5e9)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg></div>
              <h4>{t('dashboard.doorBusiness', { defaultValue: 'Business' })}</h4>
              <p>{t('dashboard.doorBusinessDesc', { defaultValue: 'Your income, team, commissions and stats.' })}</p>
              <span className="dc-door-go">{t('dashboard.doorOpen', { defaultValue: 'Open' })} →</span>
            </Link>

            <Link to="/tools" className="dc-door">
              <div className="dc-door-ico" style={{ background: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 6l4 4-9 9-4 1 1-4z"/><path d="M16 4l4 4"/></svg></div>
              <h4>{t('dashboard.doorTools', { defaultValue: 'Tools' })}</h4>
              <p>{t('dashboard.doorToolsDesc', { defaultValue: 'All your AI tools, builders and creators.' })}</p>
              <span className="dc-door-go">{t('dashboard.doorOpen', { defaultValue: 'Open' })} →</span>
            </Link>

            {/* Marketing — hub not built yet, Coming soon state (Steve, 30 May 2026) */}
            <div className="dc-door dc-door-soon" aria-disabled="true">
              <div className="dc-door-ico" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l16-7v16L3 13zM3 11v4M8 13v5a2 2 0 004 0"/></svg></div>
              <h4>{t('dashboard.doorMarketing', { defaultValue: 'Marketing' })}</h4>
              <p>{t('dashboard.doorMarketingDesc', { defaultValue: 'Your links, posters, pages and campaigns.' })}</p>
              <span className="dc-door-soon-tag">{t('dashboard.comingSoon', { defaultValue: 'Coming soon' })}</span>
            </div>

            {/* Campaign Videos — live daily-task card for Grid owners, soft door otherwise */}
            <Link to="/watch" className="dc-door dc-door-video">
              <div className="dc-door-ico" style={{ background: 'linear-gradient(135deg,#0a1438,#0ea5e9)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z" fill="currentColor"/></svg></div>
              <h4>{t('dashboard.doorCampaignVideos', { defaultValue: 'Campaign Videos' })}</h4>
              {watchGoal ? (
                <>
                  <p>{t('dashboard.doorVideoDescQualify', { defaultValue: "Watch today's videos to stay qualified for campaign withdrawals." })}</p>
                  <div className="dc-vid-prog">
                    <div className="dc-vid-bar"><span style={{ width: (watchGoal.progress || 0) + '%' }}></span></div>
                    <div className="dc-vid-lab">{goalText(watchGoal, 'progress_label')}{watchGoal.completed ? ' · ' + t('dashboard.resetsMidnight', { defaultValue: 'resets at midnight' }) : ''}</div>
                  </div>
                  <span className="dc-door-go">{watchGoal.completed ? t('dashboard.watchMore', { defaultValue: 'Watch more' }) : t('dashboard.watchNow', { defaultValue: 'Watch now' })} →</span>
                </>
              ) : (
                <>
                  <p>{t('dashboard.doorVideoDescSoft', { defaultValue: 'Own a Campaign Tier to earn by watching daily videos.' })}</p>
                  <span className="dc-door-go">{t('dashboard.doorOpen', { defaultValue: 'Open' })} →</span>
                </>
              )}
            </Link>
          </div>

          {/* 4 · Income at-a-glance */}
          <div className="dc-section-label">
            <span className="t">{t('dashboard.yourIncome', { defaultValue: 'Your income' })}</span>
            <span className="sub">{t('dashboard.yourIncomeSub', { defaultValue: 'Three streams, at a glance.' })}</span>
          </div>
          <div className="dc-income">
            <Link to="/income" className="dc-inc-card">
              <div className="dc-inc-ico" style={{ background: '#dcfce7' }}>👥</div>
              <div className="dc-inc-body"><div className="dc-inc-name">{t('dashboard.streamMembership', { defaultValue: 'Membership' })}</div><div className="dc-inc-sub">{t('dashboard.directsPaying', { count: d.directs_active || 0, defaultValue: (d.directs_active || 0) + ' directs paying' })}</div></div>
              <div className="dc-inc-amt">{formatMoney(d.membership_earned)}</div>
            </Link>
            <Link to="/income" className="dc-inc-card">
              <div className="dc-inc-ico" style={{ background: '#e0f2fe' }}>🎯</div>
              <div className="dc-inc-body"><div className="dc-inc-name">{t('dashboard.streamGrid', { defaultValue: 'Campaign Grid' })}</div><div className="dc-inc-sub">{t('dashboard.inYourTeam', { count: d.total_team || 0, defaultValue: (d.total_team || 0) + ' in your team' })}</div></div>
              <div className="dc-inc-amt">{formatMoney(d.grid_earned)}</div>
            </Link>
            <Link to="/my-credits" className="dc-inc-card">
              <div className="dc-inc-ico" style={{ background: '#cffafe' }}>⚡</div>
              <div className="dc-inc-body"><div className="dc-inc-name">{t('dashboard.streamCredits', { defaultValue: 'Creator Credits' })}</div><div className="dc-inc-sub">{t('dashboard.referrals', { count: d.direct_referrals_count || 0, defaultValue: (d.direct_referrals_count || 0) + ' referrals' })}</div></div>
              <div className="dc-inc-amt">{formatMoney(d.creative_studio_earned)}</div>
            </Link>
          </div>
        </div>
        );
      })()}



      {/* Onboarding banner — replaces the old full-page wizard redirect.
          Shown when user.onboarding_completed is false. Two paths out:
          'Start Setup →' link to the still-existing /onboarding wizard,
          or dismissal (× button or 'Maybe later'). Dismissal is server-
          side (POST /api/onboarding/complete) so it persists across
          devices, not localStorage. Purple gradient picked to match the
          wizard's step-marker colour for visual continuity. Uses the
          same banner architecture as giftWelcome below for consistency. */}
      {user && user.onboarding_completed === false && (
        <div style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 45%, #8b5cf6 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(124,58,237,.25)',
        }}>
          {/* Decorative background circles — same soft-circle pattern as the
              giftWelcome banner so the dashboard's banner system feels
              cohesive. Positioned to catch the eye without competing with text. */}
          <div style={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: 100, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />

          {/* Dismiss × — top-right, low-emphasis but findable. Same
              positioning as the gift banner's X for consistency. */}
          <button
            onClick={dismissOnboardingBanner}
            aria-label={t('dashboard.onboardingBannerDismissAria')}
            style={{
              position: 'absolute',
              top: 12, right: 12,
              width: 28, height: 28,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255,255,255,.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              fontFamily: 'inherit',
              transition: 'background .15s',
              zIndex: 2,
            }}
            onMouseOver={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.28)'; }}
            onMouseOut={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; }}
          >
            ×
          </button>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Hand wave emoji — matches the wizard's welcome step icon (👋)
                so users who saw the wizard during testing recognise this. */}
            <div style={{
              fontSize: 48,
              lineHeight: 1,
              flexShrink: 0,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.15))',
            }}>👋</div>

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 22,
                fontWeight: 800,
                color: '#fff',
                marginBottom: 6,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}>
                {t('dashboard.onboardingBannerTitle', { name: user.first_name || user.username })}
              </div>
              <div style={{
                fontSize: 14,
                color: 'rgba(255,255,255,.85)',
                marginBottom: 14,
                lineHeight: 1.5,
              }}>
                {t('dashboard.onboardingBannerSubtitle')}
              </div>

              {/* Mini steps preview — same 4-step list the wizard shows in
                  its 'Here's what we'll do' card. Compact format so the
                  banner stays narrow vertically. */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 16px',
                marginBottom: 16,
                fontSize: 13,
                color: 'rgba(255,255,255,.92)',
              }}>
                <span>1. {t('dashboard.onboardingBannerStep1')}</span>
                <span>2. {t('dashboard.onboardingBannerStep2')}</span>
                <span>3. {t('dashboard.onboardingBannerStep3')}</span>
                <span>4. {t('dashboard.onboardingBannerStep4')}</span>
              </div>

              {/* CTA row — primary white button drives to wizard, secondary
                  text-only button dismisses. Matches the dashboard's
                  existing CTA hierarchy on other banners. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  to="/onboarding"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    background: '#fff',
                    color: '#6d28d9',
                    fontSize: 14,
                    fontWeight: 800,
                    fontFamily: 'Sora, sans-serif',
                    borderRadius: 10,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(0,0,0,.15)',
                    transition: 'transform .15s',
                  }}
                  onMouseOver={function(e) { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={function(e) { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {t('dashboard.onboardingBannerCTA')}
                </Link>
                <button
                  onClick={dismissOnboardingBanner}
                  style={{
                    background: 'transparent',
                    color: 'rgba(255,255,255,.85)',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 4px',
                    textDecoration: 'underline',
                  }}
                >
                  {t('dashboard.onboardingBannerSkip')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gift voucher welcome banner — only on first load after claim.
          Top of dashboard, full width, dismissible. Pink-to-amber gradient
          matches the gift card's emotional register. The gifter's name
          (if available) is the emotional anchor — it pulls the relationship
          forward into the experience rather than showing a generic welcome.

          Stays visible until the user dismisses it (X button) or clicks
          through to /pay-it-forward (which also dismisses it). No auto-
          timer — the welcome moment deserves the user's full attention,
          not a 2-second flash. */}

      {/* ── Profit Grid 6×6/36 migration banner (auto-expires 1 June 2026) ── */}
      {gridMigration && (
        <div style={{
          background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 50%, #0891b2 100%)',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(8,145,178,0.22)',
        }}>
          {/* Cyan radial glow accent — matches the visualiser header treatment */}
          <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 280, height: '200%', background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 65%)', pointerEvents: 'none' }} />

          {/* Dismiss × */}
          <button
            onClick={dismissGridMigration}
            aria-label="Dismiss grid update banner"
            style={{
              position: 'absolute',
              top: 12, right: 12,
              width: 28, height: 28,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255,255,255,0.12)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'inherit',
              zIndex: 2,
            }}
            onMouseOver={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseOut={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >×</button>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {/* Crown badge — matches the bonus seat colour family */}
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #c4b5fd)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 26, color: '#fff',
              boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
            }}>♛</div>

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 18, fontWeight: 800,
                color: '#fff', marginBottom: 6,
                letterSpacing: '-0.2px',
              }}>
                Profit Grid update — faster cycles
              </div>
              <div style={{
                fontSize: 13.5,
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.55,
                marginBottom: 4,
              }}>
                From today, grids complete at <strong style={{ color: '#22d3ee', fontWeight: 800 }}>36 seats</strong> instead of 64. Same commission rates, same 8-level uni-level depth, same total earning potential — just delivered in shorter cycles so you reach your completion bonus sooner.
              </div>
              <div style={{
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}>
                Visit the Profit Grid page to see the redesigned visualiser.
              </div>
            </div>
          </div>
        </div>
      )}

      {giftWelcome && (
        <div style={{
          background: 'linear-gradient(135deg, #be185d 0%, #ec4899 45%, #f59e0b 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(236,72,153,.28)',
        }}>
          {/* Decorative background circles for warmth — soft and out of focus,
              positioned so they catch the eye without distracting from text. */}
          <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -50, left: 120, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />

          {/* Dismiss X — top-right, low-emphasis but findable. Stays
              visible regardless of mouse position so the user can find
              it instantly when they're ready to dismiss. */}
          <button
            onClick={dismissGiftWelcome}
            aria-label="Dismiss welcome banner"
            style={{
              position: 'absolute',
              top: 14, right: 14,
              width: 30, height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255,255,255,.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              fontFamily: 'inherit',
              transition: 'background .15s',
              zIndex: 2,
            }}
            onMouseOver={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.28)'; }}
            onMouseOut={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; }}
          >
            ×
          </button>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Gift emoji — large, warm, scales the moment */}
            <div style={{
              fontSize: 56,
              lineHeight: 1,
              flexShrink: 0,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.15))',
            }}>🎁</div>

            <div style={{ flex: 1, minWidth: 240 }}>
              {/* Line 1: warm welcome with the new member's first name */}
              <div style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                marginBottom: 8,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}>
                Welcome to SuperAdPro{user && user.first_name ? ', ' + user.first_name : ''} 🎁
              </div>

              {/* Line 2: confirmation of gift + breathing room */}
              <div style={{
                fontSize: 16,
                color: 'rgba(255,255,255,.95)',
                lineHeight: 1.5,
                marginBottom: 6,
              }}>
                {giftWelcome.gifterName
                  ? <>Your gift from <strong style={{ fontWeight: 700 }}>{giftWelcome.gifterName}</strong> is active. Take your time looking around — there's no rush.</>
                  : <>Your gift is active. Take your time looking around — there's no rush.</>
                }
              </div>

              {/* Line 3: soft narrative invitation, NOT a CTA */}
              <div style={{
                fontSize: 14,
                color: 'rgba(255,255,255,.78)',
                lineHeight: 1.5,
                fontStyle: 'italic',
                marginBottom: 16,
              }}>
                When you're ready, you can pay it forward to someone you know. That's how this community grows.
              </div>

              {/* Soft CTA — clear but not aggressive. Clicks through to
                  the existing /pay-it-forward page where they can learn
                  in their own time. Also dismisses the banner. */}
              <button
                onClick={function() {
                  dismissGiftWelcome();
                  window.location.href = '/pay-it-forward';
                }}
                style={{
                  padding: '11px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'rgba(255,255,255,.95)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#be185d',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'transform .15s, background .15s',
                  boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                }}
                onMouseOver={function(e) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.95)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Learn how Pay It Forward works <span style={{ fontSize: 16 }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free member activation banner moved up next to FoundingPartnerBanner
          on 24 May 2026 — was previously buried below the data cards and
          getting missed by Free users. */}

      {/* Active member but no Campaign Tier yet — nudge to buy first tier so
          they can unlock Watch-to-Earn + Create Campaign + commission earning.
          Only shown when user.is_active = true (membership paid) AND they have
          no active Grid (highest_tier <= 0 or null). */}
      {d.is_active && !(user?.highest_tier && user.highest_tier > 0) && (
        <div style={{
          background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', border: '1px solid #93c5fd',
          borderRadius: 12, padding: '20px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{...TYPE.cardTitleBold, color: '#1e3a8a', marginBottom: 6}}>
              ⚡ {t('dashboard.tierNudgeTitle', { defaultValue: 'Activate a Campaign Tier to start earning' })}
            </div>
            <p style={{...TYPE.bodyLarge, color: '#1e40af', margin: 0}}>
              {t('dashboard.tierNudgeBody', { defaultValue: 'Your membership is active — now activate a Campaign Tier to unlock Watch-to-Earn, create your own video campaigns, and earn commissions on every downline tier purchase.' })}
            </p>
          </div>
          <Link to="/campaign-tiers" style={{
            fontSize: 14, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg,#1e40af,#2563eb)',
            padding: '11px 22px', borderRadius: 9, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(30,64,175,0.35)', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {t('dashboard.tierNudgeCta', { defaultValue: 'View Campaign Tiers' })} →
          </Link>
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


      {/* ── Smart Goals removed (26 Apr 2026, founder direction) ──
          The "Your Goals This Week" and "More Opportunities" cards used
          to render here from server-driven `goals` data. Removed because
          they duplicated the function of the Quick Actions row above
          (e.g. the goals shareLink card and quick action Affiliate Share
          both pointed members to grow their team; the goals watchVideo
          card and a quick action Watch Video card pointed to /watch).
          The /api/dashboard/smart-goals endpoint and its server-side
          logic in app/main.py are left intact in case we want to reuse
          the data elsewhere later. */}

      {/* ── Network strip moved to Command Centre 7 May 2026 ──
          See note above on the earnings strip move. The full team
          metrics (Direct Referrals, Active Network, Lifetime Earned,
          This Month) now render at the top of /command-centre as part
          of the Performance Snapshot section. Dashboard reads cleaner
          without competing analytics noise. */}

      {/* Welcome banner animations */}
      <style>{`
        @keyframes wbBag{0%,100%{transform:rotate(-5deg)}50%{transform:translateY(-10px) rotate(3deg)}}

        @keyframes wbStar{0%,100%{opacity:0}50%{opacity:1}}
        .stream-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-2px)}
        .action-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-3px)}
        @media(max-width:1100px){
          .actions-grid{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(max-width:767px){
          .income-grid{grid-template-columns:repeat(2,1fr)!important}
          .doors-grid{grid-template-columns:repeat(2,1fr)!important}
          .actions-grid{grid-template-columns:repeat(2,1fr)!important}
          .goals-grid{grid-template-columns:1fr!important}
          .bottom-grid{grid-template-columns:1fr!important}
        }
        .action-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-3px)}
        @keyframes toastSlideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}

        /* ── Redesigned dashboard core (30 May 2026) ── */
        .dash-core{--dc-line:#e6ecf5;--dc-ink:#0f172a;--dc-ink2:#475569;--dc-ink3:#94a3b8}
        .dc-strip{background:linear-gradient(135deg,#0a1438,#1e3a8a);border-radius:18px;padding:22px 26px;margin-bottom:18px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;box-shadow:0 1px 2px rgba(10,20,56,.04),0 8px 24px rgba(10,20,56,.06)}
        .dc-greet{display:flex;align-items:center;gap:15px;flex:1;min-width:240px}
        .dc-av{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#22d3ee);display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:800;font-size:20px;color:#041027;flex-shrink:0;overflow:hidden}
        .dc-eyebrow{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,.5)}
        .dc-name{font-family:'Sora',sans-serif;font-weight:800;font-size:22px;color:#fff;line-height:1.1;margin:1px 0 4px}
        .dc-meta{display:flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(255,255,255,.6)}
        .dc-badge{font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#fde68a;border:1px solid rgba(253,230,138,.4);padding:2px 8px;border-radius:5px}
        .dc-stats{display:flex;gap:10px;flex-wrap:wrap}
        .dc-stat{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 18px;min-width:112px}
        .dc-stat .l{font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:4px}
        .dc-stat .v{font-family:'Sora',sans-serif;font-weight:800;font-size:21px;color:#fff}
        .dc-stat .v.cyan{color:#22d3ee}
        .dc-focus{display:grid;grid-template-columns:1.55fr 1fr;gap:18px;margin-bottom:22px}
        .dc-card{background:#fff;border:1px solid var(--dc-line);border-radius:18px;box-shadow:0 1px 2px rgba(10,20,56,.04),0 8px 24px rgba(10,20,56,.06)}
        .dc-pad{padding:22px 24px}
        .dc-card-eyebrow{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#0ea5e9}
        .dc-nm-title{font-family:'Sora',sans-serif;font-weight:800;font-size:20px;color:var(--dc-ink);margin:6px 0 16px;letter-spacing:-.01em}
        .dc-nm-list{display:flex;flex-direction:column;gap:9px}
        .dc-nm-row{display:flex;align-items:center;gap:13px;padding:11px 13px;border-radius:12px;background:#f6f9fd;border:1px solid #eef3f9}
        .dc-nm-ava{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:800;font-size:15px;color:#fff;flex-shrink:0}
        .dc-nm-who{flex:1;min-width:0}
        .dc-nm-who .n{font-weight:700;font-size:14.5px;color:var(--dc-ink)}
        .dc-nm-who .s{font-size:12.5px;color:var(--dc-ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dc-nm-tag{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;padding:3px 8px;border-radius:5px}
        .dc-nm-tag.hot{background:#fee2e2;color:#b91c1c}
        .dc-nm-tag.new{background:#cffafe;color:#0e7490}
        .dc-nm-btn{margin-left:6px;font-family:'Sora',sans-serif;font-weight:700;font-size:12.5px;color:#fff;background:linear-gradient(135deg,#0a1438,#0ea5e9);border:none;padding:8px 14px;border-radius:9px;cursor:pointer;white-space:nowrap;text-decoration:none}
        .dc-nm-calm{font-size:14px;color:var(--dc-ink2);line-height:1.6;padding:4px 0 2px}
        .dc-nm-foot{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .dc-nm-foot .c{font-size:12.5px;color:var(--dc-ink3)}
        .dc-nm-foot a{font-family:'Sora',sans-serif;font-weight:700;font-size:13px;color:#0ea5e9;text-decoration:none;white-space:nowrap}
        .dc-sg-title{font-family:'Sora',sans-serif;font-weight:800;font-size:18px;color:var(--dc-ink);margin:6px 0 14px;letter-spacing:-.01em}
        .dc-sg-block{margin-bottom:14px}
        .dc-sg-lab{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--dc-ink3);margin-bottom:6px}
        .dc-sg-link{display:flex;align-items:center;gap:8px;background:#f6f9fd;border:1px solid #e6ecf5;border-radius:10px;padding:9px 12px}
        .dc-sg-link .u{flex:1;min-width:0;font-size:13px;font-weight:600;color:#0a1438;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dc-sg-link .cp{font-family:'Sora',sans-serif;font-weight:700;font-size:12px;color:#fff;background:#0ea5e9;border:none;padding:6px 12px;border-radius:7px;cursor:pointer;flex-shrink:0}
        .dc-sg-vsp{background:linear-gradient(135deg,#0f1d3a,#16294f);border-radius:12px;padding:14px 16px;color:#fff}
        .dc-sg-vsp .badge{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#22d3ee;border:1px solid rgba(34,211,238,.4);padding:2px 7px;border-radius:5px;margin-bottom:8px}
        .dc-sg-vsp .t{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;margin-bottom:3px}
        .dc-sg-vsp .d{font-size:12.5px;color:rgba(255,255,255,.65);line-height:1.5;margin-bottom:11px}
        .dc-sg-vsp-btns{display:flex;gap:8px}
        .dc-sg-vsp-btns button,.dc-sg-vsp-btns a{font-family:'Sora',sans-serif;font-weight:700;font-size:12px;border-radius:8px;padding:7px 13px;cursor:pointer;border:none;text-decoration:none;display:inline-block}
        .dc-sg-vsp-btns .vb-copy{background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#041027}
        .dc-sg-vsp-btns .vb-prev{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2)}
        .dc-section-label{display:flex;align-items:baseline;gap:10px;margin:8px 2px 14px;flex-wrap:wrap}
        .dc-section-label .t{font-family:'Sora',sans-serif;font-weight:800;font-size:15px;color:var(--dc-ink);letter-spacing:-.01em}
        .dc-section-label .sub{font-size:13px;color:var(--dc-ink3)}
        .dc-doors{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:26px}
        .dc-door{background:#fff;border:1px solid var(--dc-line);border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(10,20,56,.04),0 8px 24px rgba(10,20,56,.06);position:relative;transition:.2s;cursor:pointer;text-decoration:none;display:block}
        .dc-door:hover{box-shadow:0 2px 4px rgba(10,20,56,.06),0 16px 40px rgba(10,20,56,.12);transform:translateY(-3px)}
        .dc-door-ico{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:#fff}
        .dc-door-ico svg{width:23px;height:23px}
        .dc-door h4{font-family:'Sora',sans-serif;font-weight:700;font-size:16px;color:var(--dc-ink);margin-bottom:5px}
        .dc-door p{font-size:13px;color:var(--dc-ink2);line-height:1.5;margin-bottom:12px}
        .dc-door-go{font-family:'Sora',sans-serif;font-weight:700;font-size:13px;color:#0ea5e9}
        .dc-door-soon{cursor:default;opacity:.92}
        .dc-door-soon:hover{transform:none;box-shadow:0 1px 2px rgba(10,20,56,.04),0 8px 24px rgba(10,20,56,.06)}
        .dc-door-soon-tag{display:inline-block;font-family:'Sora',sans-serif;font-weight:700;font-size:11px;color:#0e7490;background:#cffafe;padding:4px 10px;border-radius:6px}
        .dc-door-video{border-color:#bae6fd;background:linear-gradient(180deg,#f7fcff,#fff)}
        .dc-vid-prog{margin:2px 0 12px}
        .dc-vid-bar{height:7px;border-radius:99px;background:#e2eefb;overflow:hidden;margin-bottom:6px}
        .dc-vid-bar span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#0ea5e9,#22d3ee)}
        .dc-vid-lab{font-size:11.5px;font-weight:600;color:var(--dc-ink3)}
        .dc-income{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .dc-inc-card{background:#fff;border:1px solid var(--dc-line);border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(10,20,56,.04),0 8px 24px rgba(10,20,56,.06);display:flex;align-items:center;gap:14px;text-decoration:none;transition:.2s}
        .dc-inc-card:hover{box-shadow:0 2px 4px rgba(10,20,56,.06),0 16px 40px rgba(10,20,56,.12);transform:translateY(-2px)}
        .dc-inc-ico{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}
        .dc-inc-body{flex:1;min-width:0}
        .dc-inc-name{font-family:'Sora',sans-serif;font-weight:700;font-size:14px;color:var(--dc-ink)}
        .dc-inc-sub{font-size:12px;color:var(--dc-ink3)}
        .dc-inc-amt{font-family:'Sora',sans-serif;font-weight:800;font-size:18px;color:#0a1438;text-align:right}
        @media(max-width:900px){
          .dc-focus{grid-template-columns:1fr}
          .dc-doors{grid-template-columns:repeat(2,1fr)}
          .dc-income{grid-template-columns:1fr}
        }
      `}</style>


      {/* Toast notifications: new members + achievement unlocks */}
      {toasts.length > 0 && <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420, transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)', willChange: 'transform' }}>
        {toasts.map(function(toast) {
          // ── Achievement toast (26 May 2026) ─────────────────────────
          // Purple gradient matching the grid bonus badge theme. Shows
          // the icon, badge name, and (for grid_bonus_paid) the actual
          // $ amount earned + tier — same visual story as the badge wall.
          if (toast.is_achievement) {
            var isGridBonus = toast.badge_id === 'grid_bonus_paid' && toast.metadata && toast.metadata.amount;
            var achBg = isGridBonus
              ? 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #6366f1 100%)';
            var achGlow = isGridBonus ? 'rgba(124,58,237,.35)' : 'rgba(99,102,241,.25)';
            return <div key={toast.key} style={{
              background: achBg, borderRadius: 14, padding: '18px 20px',
              boxShadow: '0 12px 40px rgba(0,0,0,.5), 0 2px 16px ' + achGlow,
              border: '1px solid rgba(255,255,255,.22)',
              animation: 'toastSlideIn .4s ease-out',
              display: 'flex', alignItems: 'flex-start', gap: 14,
              minWidth: 'min(380px, calc(100vw - 48px))',
              color: '#fff',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'rgba(255,255,255,.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '1px solid rgba(255,255,255,.22)',
                fontSize: 28,
                textShadow: '0 2px 8px rgba(255,255,255,.3)',
              }}>{toast.icon || '🏆'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>
                  Badge Unlocked
                </div>
                {isGridBonus ? (
                  <>
                    <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px', textShadow: '0 2px 8px rgba(255,255,255,.2)' }}>
                      ${Number(toast.metadata.amount).toFixed(0)}
                    </div>
                    <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', color: '#fff', fontFamily: 'JetBrains Mono,ui-monospace,monospace', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, marginTop: 6, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                      Tier {toast.metadata.tier} Bonus
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                    {(toast.title || '').replace('Badge earned:', '').replace('!', '').trim()}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.82)', marginTop: 8, lineHeight: 1.5 }}>
                  {toast.message}
                </div>
                {toast.link && (
                  <a href={toast.link}
                     onClick={function(e) {
                       e.preventDefault();
                       // Mark as seen so refocusing the dashboard
                       // doesn't re-toast the same badge.
                       apiPost('/api/achievements/mark-seen',
                         { notification_ids: [toast.notification_id] }).catch(function() {});
                       // Force full-page navigation rather than React Router.
                       // /achievements is a server-rendered Jinja template,
                       // not a React route — letting React Router handle it
                       // would 404 and bounce back to /dashboard.
                       window.location.href = toast.link;
                     }}
                     style={{
                    display: 'inline-block', marginTop: 10,
                    background: 'rgba(255,255,255,.18)',
                    color: '#fff', textDecoration: 'none',
                    fontFamily: 'Sora,sans-serif', fontSize: 12, fontWeight: 700,
                    padding: '6px 14px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,.22)',
                  }}>View badges →</a>
                )}
              </div>
              <button onClick={function() { dismissToast(toast.key); }}
                style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,.85)', fontSize: 13, flexShrink: 0 }}>✕</button>
            </div>;
          }

          // ── Tier-aware new-member toast styling (Sprint 2c follow-up, 15 May 2026) ──
          // Under the flat-pricing model toasts have two visual variants:
          //   - Founding (gold): toast.tier === 'founding' OR toast.is_founding_member
          //   - Partner (silver): everyone else (includes legacy 'basic'/'pro'
          //     users mapped server-side to 'partner').
          // Sponsor commission is flat $10/mo regardless of variant.
          var isFounding = toast.tier === 'founding' || toast.is_founding_member === true;
          var commission = '$10.00';
          var bg = isFounding
            ? 'linear-gradient(135deg, #b8860b, #daa520 30%, #ffd700 50%, #daa520 70%, #b8860b)'
            : 'linear-gradient(135deg, #8e9aaf, #b8c4d4 30%, #d4dce8 50%, #b8c4d4 70%, #8e9aaf)';
          var borderColor = isFounding ? 'rgba(255,235,150,.3)' : 'rgba(220,230,240,.4)';
          var glowColor = isFounding ? 'rgba(255,215,0,.2)' : 'rgba(180,195,215,.15)';
          var iconBg = isFounding ? 'rgba(23,37,84,.3)' : 'rgba(23,37,84,.15)';
          var iconBorder = isFounding ? 'rgba(23,37,84,.2)' : 'rgba(23,37,84,.1)';
          var subColor = isFounding ? 'rgba(15,29,58,.65)' : 'rgba(15,29,58,.6)';
          var badgeBg = isFounding ? 'rgba(15,29,58,.15)' : 'rgba(15,29,58,.1)';
          var badgeBorder = isFounding ? 'rgba(15,29,58,.12)' : 'rgba(15,29,58,.08)';
          var closeBg = isFounding ? 'rgba(15,29,58,.1)' : 'rgba(15,29,58,.06)';

          return <div key={toast.key} style={{
            background: bg, borderRadius: 14, padding: '18px 20px',
            boxShadow: '0 12px 40px rgba(0,0,0,.5), 0 2px 16px ' + glowColor,
            border: '1px solid ' + borderColor,
            animation: 'toastSlideIn .4s ease-out', display: 'flex', alignItems: 'flex-start', gap: 14,
            minWidth: 'min(380px, calc(100vw - 48px))',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid ' + iconBorder }}>
              <span style={{ fontSize: 24 }}>🎉</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--sap-cobalt-deep)', marginBottom: 4, letterSpacing: '.3px' }}>{isFounding ? t('dashboard.newFoundingMember', { defaultValue: 'New Founding Partner!' }) : t('dashboard.newTeamMember', { defaultValue: 'New Team Member!' })}</div>
              <div style={{ fontSize: 13, color: 'var(--sap-cobalt-deep)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--sap-cobalt-deep)' }}>{toast.first_name} {toast.last_name}</strong> {t('dashboard.justJoinedYourTeam', { defaultValue: 'just joined your team' })}
              </div>
              <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>
                {t('dashboard.youllEarn', { defaultValue: "You'll earn" })} <strong style={{ color: 'var(--sap-cobalt-deep)' }}>{commission}{t('dashboard.perMonth', { defaultValue: '/month from this referral' })}</strong>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 12px', borderRadius: 6, background: badgeBg, border: '1px solid ' + badgeBorder, color: 'var(--sap-cobalt-deep)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{isFounding ? '★ ' + t('dashboard.foundingPartner', { defaultValue: 'Founder' }) : t('dashboard.partnerMember', { defaultValue: 'Partner' })}</span>
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
