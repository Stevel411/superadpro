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
import DashboardHeroCarousel from '../components/DashboardHeroCarousel';
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

      {/* ── Team Pulse card (28 May 2026) ──
          Surfaces time-sensitive sponsor prompts at the top of the dashboard
          so members can act in the activation window. Renders ONLY for
          members who actually have a team (>0 direct referrals). Empty
          state shown when team exists but no prompts are urgent. Hidden
          entirely for members with no downline (no value to show). Data
          from /api/team-pulse. */}
      {teamPulse && teamPulse.team && teamPulse.team.total > 0 && (function() {
        var prompts = teamPulse.prompts || [];
        var team = teamPulse.team || {};
        var hasPrompts = prompts.length > 0;

        function initials(n) {
          if (!n) return '?';
          var parts = String(n).trim().split(/\s+/);
          return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
        }
        function avatarGradient(idx) {
          var grads = [
            'linear-gradient(135deg,#0a1438,#0ea5e9)',
            'linear-gradient(135deg,#7c3aed,#a855f7)',
            'linear-gradient(135deg,#0e7490,#14b8a6)',
            'linear-gradient(135deg,#1e3a8a,#22d3ee)',
            'linear-gradient(135deg,#0f766e,#10b981)',
          ];
          return grads[idx % grads.length];
        }
        function indicatorColour(kind) {
          if (kind === 'just_joined' || kind === 'just_activated') return 'var(--sap-green)';
          if (kind === 'unactivated_warm') return '#d97706';
          return '#94a3b8';
        }
        function tagStyle(kind) {
          if (kind === 'just_joined') return { bg: 'var(--sap-green-bg)', fg: 'var(--sap-green)', bd: 'rgba(22,163,74,.25)' };
          if (kind === 'just_activated') return { bg: '#ecfeff', fg: '#0e7490', bd: 'rgba(14,116,144,.25)' };
          if (kind === 'unactivated_warm') return { bg: '#fef3c7', fg: '#d97706', bd: 'rgba(217,119,6,.25)' };
          return { bg: '#f1f5f9', fg: '#475569', bd: 'var(--sap-border)' };
        }
        function onAction(p) {
          // Pass the prompt kind through to TeamMessenger so it can fire
          // the dismissal AFTER the message is actually sent — not just
          // because the sponsor clicked through. Sponsor might arrive,
          // change their mind, and close the page without sending; in
          // that case the prompt should stay visible. Dismissal-on-send
          // is the correct trigger (29 May 2026 — revised from initial
          // click-time dismissal that fired too early).
          var params = new URLSearchParams({
            to: String(p.user_id),
            template: p.welcome_template || '',
            kind: p.kind || '',
          });
          window.location.href = '/team-messenger?' + params.toString();
        }

        return (
          <div style={{
            background:'var(--sap-bg-card)', border:'1px solid var(--sap-border)',
            borderRadius:18, boxShadow:'0 4px 16px rgba(10,20,56,.05)',
            overflow:'hidden', marginBottom:18,
          }}>
            {/* tappable header — toggles expand/collapse */}
            <div
              onClick={hasPrompts ? toggleTeamPulse : undefined}
              style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'18px 22px',
                borderBottom: teamPulseExpanded ? '1px solid var(--sap-border-light)' : 'none',
                flexWrap:'wrap', gap:12,
                cursor: hasPrompts ? 'pointer' : 'default',
              }}
            >
              <div style={{display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0}}>
                <div style={{
                  width:38, height:38, borderRadius:11, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'linear-gradient(135deg,var(--sap-cobalt-deep),var(--sap-accent))',
                  color:'#fff', fontSize:18,
                }}>⚡</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{
                    fontSize:10.5, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase',
                    color:'var(--sap-accent)', marginBottom:3,
                    fontFamily:'JetBrains Mono,monospace',
                  }}>
                    {t('teamPulse.label', { defaultValue: 'Team Pulse' })}
                  </div>
                  <div style={{
                    fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16,
                    color:'var(--sap-text-primary)',
                  }}>
                    {hasPrompts
                      ? (prompts.length + ' team member' + (prompts.length === 1 ? '' : 's') + ' need' + (prompts.length === 1 ? 's' : '') + ' you')
                      : t('teamPulse.titleCalm', { defaultValue: 'Your team is all caught up' })}
                  </div>
                  <div style={{
                    fontSize:12.5, color:'var(--sap-text-faint)', marginTop:2,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {hasPrompts && !teamPulseExpanded
                      ? prompts.slice(0,3).map(function(p){return p.name;}).join(' · ') + (prompts.length > 3 ? ' · +' + (prompts.length - 3) + ' more' : '')
                      : (hasPrompts
                          ? t('teamPulse.sub', { defaultValue: 'The first 24 hours after a sign-up is where activation happens.' })
                          : t('teamPulse.subCalm', { defaultValue: 'No urgent outreach needed right now.' }))}
                  </div>
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:10, flexShrink:0}}>
                <div style={{
                  display:'flex', alignItems:'center', gap:6,
                  fontSize:12, fontFamily:'JetBrains Mono,monospace', fontWeight:600,
                  color:'var(--sap-text-secondary)', background:'#f8fafc',
                  padding:'6px 12px', borderRadius:99, border:'1px solid var(--sap-border)',
                }}>
                  <strong style={{color:'var(--sap-text-primary)', fontWeight:800}}>{team.active}</strong>
                  <span style={{color:'var(--sap-text-faint)'}}>/</span>
                  <strong style={{color:'var(--sap-text-primary)', fontWeight:800}}>{team.total}</strong>
                </div>
                {hasPrompts && (
                  <div style={{
                    width:28, height:28, borderRadius:8, display:'flex',
                    alignItems:'center', justifyContent:'center',
                    color:'var(--sap-text-faint)', fontSize:18,
                    transition:'transform .15s',
                    transform: teamPulseExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>▾</div>
                )}
              </div>
            </div>

            {/* prompts (only when expanded) */}
            {hasPrompts && teamPulseExpanded && prompts.map(function(p, i) {
              var ts = tagStyle(p.kind);
              return (
                <div key={p.user_id + '-' + p.kind} style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'16px 22px',
                  borderBottom: i < prompts.length - 1 ? '1px solid var(--sap-border-light)' : 'none',
                }}>
                  <div style={{
                    width:6, alignSelf:'stretch', borderRadius:3, flexShrink:0,
                    marginLeft:-8, background: indicatorColour(p.kind),
                  }}/>
                  <div style={{
                    width:44, height:44, borderRadius:14, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:'#fff',
                    background: avatarGradient(i),
                  }}>{initials(p.name)}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{
                      fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:15,
                      color:'var(--sap-text-primary)', marginBottom:2,
                    }}>
                      {p.name}
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:4,
                        fontSize:11, fontFamily:'JetBrains Mono,monospace', fontWeight:600,
                        padding:'2px 7px', borderRadius:99, marginLeft:8, verticalAlign:1,
                        background: ts.bg, color: ts.fg, border:'1px solid ' + ts.bd,
                      }}>{p.tag}</span>
                    </div>
                    <div style={{fontSize:13, color:'var(--sap-text-secondary)'}}>{p.meta}</div>
                  </div>
                  <button onClick={function() { onAction(p); }} style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    padding:'9px 16px', borderRadius:10, cursor:'pointer',
                    fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:13,
                    background:'linear-gradient(135deg,var(--sap-cobalt-deep),var(--sap-accent))',
                    color:'#fff', boxShadow:'0 4px 12px rgba(10,20,56,.2)', border:'none',
                    whiteSpace:'nowrap',
                  }}>{p.action_label} →</button>
                </div>
              );
            })}

            {/* No oversized empty-state block when calm — the compact header
                ('Your team is all caught up') already says it. A big checkmark
                hero here just duplicated the message and dominated the page. */}

            {/* footer — only when expanded (or when card has no prompts at all) */}
            {(teamPulseExpanded || !hasPrompts) && (
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 22px', background:'#fafbfd', fontSize:12.5,
                color:'var(--sap-text-secondary)', flexWrap:'wrap', gap:8,
                borderTop:'1px solid var(--sap-border-light)',
              }}>
                <span>
                  {hasPrompts
                    ? prompts.length + ' of ' + team.total + ' team members need attention'
                    : team.active + ' active out of ' + team.total + ' total'}
                </span>
                <Link to="/team-messenger" style={{color:'var(--sap-accent)', fontWeight:700, textDecoration:'none'}}>
                  {t('teamPulse.openTeam', { defaultValue: 'Open TeamMessenger →' })}
                </Link>
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Hero carousel — rotating display of platform products & income streams.
          60-second rotation between Credit Nexus, Brand Poster Generator, Pay
          It Forward. The Dashboard top is treated as a storefront for the
          platform per Steve's product direction 12 May 2026.
          V1: hardcoded slides. V2 (Week 2): admin-managed slide CMS.
          24 May 2026: gated on is_active. Free users were seeing 5 product
          slides for things they couldn't access yet, contributing to the
          decision-paralysis on Dashboard. Carousel now reserved for paid
          members — Free users see the single Upgrade CTA instead. */}
      {user?.is_active && <DashboardHeroCarousel />}

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
              {/* ── Tier badge (rewritten 15 May 2026 — flat partner pricing) ──
                  Three states with distinct treatments:
                    - free       → "Become a Partner →" CTA (clickable, routes to /upgrade)
                    - partner    → PARTNER badge, silver text
                    - founding   → FOUNDER badge, gold text (premium treatment)
                  Legacy 'basic' / 'pro' values are mapped to 'partner' defensively
                  so any pre-migration cached data doesn't render as raw text.

                  The free-user CTA replaces what used to be a passive FREE badge.
                  This converts dead pixel space into an inline conversion prompt
                  that surfaces alongside the dismissable gold banner above. */}
              {user && (function() {
                var tier = (user.membership_tier || 'free').toLowerCase();
                // Founding-ness is tracked on a SEPARATE boolean field —
                // tier is just 'partner' or 'free' under flat-pricing,
                // founding members are flagged via is_founding_member.
                // (Previous version only looked at tier === 'founding'
                // and never matched, so founding partners rendered as
                // PARTNER on their own dashboard — Steve caught this
                // checking Test12 after activation.)
                var isFounder = user.is_founding_member === true;
                var isPartner = !isFounder && (tier === 'partner' || tier === 'basic' || tier === 'pro');
                if (!isFounder && !isPartner) {
                  // Free user — render an active CTA link rather than a dead badge.
                  return (
                    <Link to="/upgrade" style={{
                      padding: '3px 11px', borderRadius: 6,
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.18) 100%)',
                      border: '1px solid rgba(251,191,36,0.4)',
                      fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                      color: '#fcd34d',
                      textDecoration: 'none',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}>
                      {t('dashboard.becomePartner', { defaultValue: 'Become a Partner →' })}
                    </Link>
                  );
                }
                // Active member — render the appropriate badge.
                var label = isFounder ? 'FOUNDER' : 'PARTNER';
                var color = isFounder ? '#ffd700' : '#d4dce8';
                var shadow = isFounder ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.3)';
                return (
                  <span style={{
                    padding: '3px 11px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: 11, fontWeight: 900, letterSpacing: 1.4,
                    color: color,
                    textShadow: shadow,
                  }}>{label}</span>
                );
              })()}
              {/* Active since — only shown for genuinely active members.
                  Previously this rendered for everyone using created_at,
                  which lied about free users (they have a created date but
                  no active date). For free users we hide it; once they
                  activate, the date populates from user.created_at server-
                  side. The 'Active since' phrase only makes sense once
                  active, so the line is omitted entirely otherwise. */}
              {user?.is_active && d.active_since && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{t('dashboard.activeSince', { date: d.active_since, defaultValue: 'Active since {{date}}' })}</span>
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

      {/* ── NEW (26 May 2026): Video Sales Page banner ──
          Surfaces the new /ref/{username}/video page that ships
          tonight. Sits between the welcome card and EXPLORE doors so
          it's above-the-fold on first dashboard load. Temporary
          placement — moves into the My Marketing hub when that lands
          in a future session.

          Two CTAs: "Copy link" gives them the shareable URL in 1 click,
          "Preview" opens the page in a new tab so they can see what
          they're sharing before they share it. */}
      {user?.username && (
        <div className="vsp-banner" style={{
          background: 'linear-gradient(135deg, #0e1a3e 0%, #1e3a8a 55%, #0e7490 100%)',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px -8px rgba(34,211,238,0.35), 0 0 0 1px rgba(34,211,238,0.2)',
        }}>
          {/* Subtle inner gloss + cyan accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.7), transparent)',
          }}/>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent)',
            pointerEvents: 'none',
          }}/>

          {/* NEW pill — left side */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px',
            borderRadius: 999,
            background: 'rgba(34,211,238,0.18)',
            border: '1px solid rgba(34,211,238,0.4)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, fontWeight: 800,
            color: '#67e8f9',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            flexShrink: 0,
            position: 'relative',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#22d3ee',
              boxShadow: '0 0 8px rgba(34,211,238,0.8)',
            }}/>
            NEW
          </div>

          {/* Copy block */}
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 17, fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.01em',
              marginBottom: 4,
            }}>
              {t('dashboard.videoSalesBanner.title', { defaultValue: 'Your Video Sales Page is live' })}
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.5,
            }}>
              {t('dashboard.videoSalesBanner.body', { defaultValue: 'A polished landing page with our 22-minute platform overview and your affiliate link baked in. Share it anywhere — every signup is tagged to you.' })}
            </div>
          </div>

          {/* URL + CTAs */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
            flexWrap: 'wrap',
            position: 'relative',
          }}>
            <code style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(34,211,238,0.2)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, fontWeight: 600,
              color: '#a5f3fc',
              maxWidth: 320,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>superadpro.com/ref/{user.username}/video</code>
            <button
              onClick={() => copyRefLink(`https://www.superadpro.com/ref/${user.username}/video`)}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
                color: '#fff',
                fontFamily: 'Sora, sans-serif',
                fontSize: 12, fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 4px 12px rgba(34,211,238,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}>
              📋 {refCopied ? t('dashboard.copied') : t('dashboard.copy')}
            </button>
            <a
              href={`/ref/${user.username}/video`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                background: 'transparent',
                color: '#fff',
                fontFamily: 'Sora, sans-serif',
                fontSize: 12, fontWeight: 800,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'background .15s, border-color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}>
              👁 {t('dashboard.videoSalesBanner.preview', { defaultValue: 'Preview' })}
            </a>
          </div>
        </div>
      )}

      {/* ── Explore the platform · 4 doors (1×4 row) ──
          Dashboard is the member's entry point. These 4 doors are the
          navigation out to each major area of the platform. The Command
          Centre door stays on /dashboard (= "home") — other three take
          the member outward. Uses only design-tokens.css variables,
          same responsive pattern as income-grid (4 cols → 2 on mobile). */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>{t('dashboard.exploreSection', { defaultValue: 'Explore the platform' })}</div>
      <div className="doors-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
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
            icon: DollarSign,
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
            link: '/tools',
          },
          {
            id: 'learn',
            label: t('dashboard.doorLearnLabel', { defaultValue: 'Skill up' }),
            title: t('dashboard.doorLearn', { defaultValue: 'Learn' }),
            desc: t('dashboard.doorLearnDesc', { defaultValue: 'Training, comp plan, promotional assets, community.' }),
            count: t('dashboard.doorItems', { count: 9, defaultValue: '9 items' }),
            colourVar: 'var(--sap-amber-dark)',
            icon: BookOpen,
            link: '/learn',
          },
        ].map((door) => {
          const Icon = door.icon;
          return (
            <Link key={door.id} to={door.link} className="action-card" style={{
              background: 'linear-gradient(180deg, var(--sap-bg-card) 0%, #f8fafc 100%)',
              border: '1px solid var(--sap-border)',
              borderRadius: 14,
              padding: '26px 24px 22px 32px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
              textDecoration: 'none',
              transition: 'all 0.18s',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              position: 'relative',
              overflow: 'hidden',
              color: 'inherit',
              minHeight: 240,
            }}>
              {/* Inset 5px LEFT accent stripe — sits 12px in from top and
                  bottom edges with rounded right cap, so the card's
                  rounded corners are preserved. Switched from top→inset-left
                  7 May 2026 (Grok-style redesign). */}
              <div style={{ position: 'absolute', top: 12, bottom: 12, left: 0, width: 6, background: door.colourVar, borderRadius: '0 4px 4px 0' }} />
              {/* Centered unframed icon — 44px, colour-only stroke. Replaces
                  the previous 64px filled colour block + white icon inside. */}
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <Icon size={72} color={door.colourVar} strokeWidth={2.8} style={{ display: 'inline-block' }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 4 }}>
                {door.label}
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 25, fontWeight: 800, color: 'var(--sap-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 10 }}>
                {door.title}
              </div>
              <div style={{...TYPE.bodyMuted, fontSize: 14, lineHeight: 1.5, marginBottom: 14, flex: 1}}>
                {door.desc}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: 'var(--sap-text-faint)' }}>{door.count}</span>
                <span style={{ color: door.colourVar, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {t('dashboard.doorOpen', { defaultValue: 'Open' })} →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Quick actions · 4 cards matching the door card template ──
          Same visual weight as the doors row above — 5px top accent
          stripe, 64px icon block, eyebrow + 28px Sora title, description,
          footer with action label + Open pill. Members get four shortcut
          actions that don't belong inside a door but still deserve
          prominent placement on the home page:

            - Pay It Forward · gift a membership to someone starting out
            - Platform Tour · onboarding refresher for new members
            - Today's Watch Video · the campaign-grid earning video
            - Affiliate Share · jump straight to the share page

          Same hover lift + same typography as the four doors so the page
          reads as two consistent rows of cards rather than a heroic row
          followed by a smaller secondary row. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>{t('dashboard.quickActions')}</div>
      <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          {
            id: 'payItForward',
            label: t('dashboard.payItForwardLabel', { defaultValue: 'Help others' }),
            title: t('dashboard.payItForward', { defaultValue: 'Pay It Forward' }),
            desc: t('dashboard.payItForwardDesc', { defaultValue: 'Gift a membership to someone starting out — help others while you grow.' }),
            cta: t('dashboard.payItForwardCta', { defaultValue: 'Gift now' }),
            colourVar: 'var(--sap-pink)',
            icon: Gift,
            link: '/pay-it-forward',
          },
          {
            id: 'platformTour',
            label: t('dashboard.platformTourLabel', { defaultValue: 'Get oriented' }),
            title: t('dashboard.platformTour', { defaultValue: 'Platform Tour' }),
            desc: t('dashboard.platformTourDesc', { defaultValue: 'Quick walkthrough of the platform so you know where everything lives.' }),
            cta: t('dashboard.platformTourCta', { defaultValue: 'Start tour' }),
            colourVar: 'var(--sap-violet)',
            icon: Compass,
            link: '/tour',
          },
          {
            id: 'watchVideo',
            label: t('dashboard.todaysWatchLabel', { defaultValue: 'Stay qualified' }),
            title: t('dashboard.todaysWatch', { defaultValue: "Watch Video" }),
            desc: t('dashboard.todaysWatchDesc', { defaultValue: 'Watch your daily campaign-grid video to activate Grid Payouts.' }),
            cta: t('dashboard.todaysWatchCta', { defaultValue: 'Watch now' }),
            colourVar: 'var(--sap-accent)',
            icon: Eye,
            link: '/watch',
          },
          {
            id: 'affiliateShare',
            label: t('dashboard.affiliateShareLabel', { defaultValue: 'Grow your team' }),
            title: t('dashboard.affiliateShare', { defaultValue: 'Affiliate Share' }),
            desc: t('dashboard.affiliateShareDesc', { defaultValue: 'Share your link and story to bring more members onto your team.' }),
            cta: t('dashboard.affiliateShareCta', { defaultValue: 'Open share' }),
            colourVar: 'var(--sap-green)',
            icon: Share2,
            link: '/social-share',
          },
        ].map(function(action, i) {
          var Icon = action.icon;
          return (
            <Link key={i} to={action.link} className="action-card" style={{
              background: 'linear-gradient(180deg, #fff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '26px 24px 22px 32px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
              textDecoration: 'none',
              transition: 'all 0.18s',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              position: 'relative',
              overflow: 'hidden',
              color: 'inherit',
              minHeight: 240,
            }}
            onMouseEnter={function(e) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(15,23,42,0.06), 0 12px 32px rgba(15,23,42,0.10)';
            }}
            onMouseLeave={function(e) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)';
            }}>
              {/* Inset 5px LEFT accent stripe — same pattern as doors row */}
              <div style={{ position: 'absolute', top: 12, bottom: 12, left: 0, width: 6, background: action.colourVar, borderRadius: '0 4px 4px 0' }} />
              {/* Centered unframed icon — 44px stroke icon, no background block */}
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <Icon size={72} color={action.colourVar} strokeWidth={2.8} style={{ display: 'inline-block' }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 4 }}>
                {action.label}
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 25, fontWeight: 800, color: 'var(--sap-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 10 }}>
                {action.title}
              </div>
              <div style={{...TYPE.bodyMuted, fontSize: 14, lineHeight: 1.5, marginBottom: 14, flex: 1}}>
                {action.desc}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: 'var(--sap-text-faint)' }}>{action.cta}</span>
                <span style={{ color: action.colourVar, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {t('dashboard.doorOpen', { defaultValue: 'Open' })} →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

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
