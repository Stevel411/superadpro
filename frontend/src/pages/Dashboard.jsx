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
              {/* Tier badge — shows FREE / BASIC / PRO based on actual tier.
                  Three states with distinct colour treatments:
                    - FREE  → cool slate text, signals "register first"
                    - BASIC → silver text, the workhorse tier
                    - PRO   → gold text, premium tier
                  Now that the data model is honest (membership_tier='free'
                  for unpaid users), this can simply render the value
                  directly without any membership-gating logic. */}
              {user?.membership_tier && (
                <span style={{
                  padding: '3px 11px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 11, fontWeight: 900, letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: user.membership_tier === 'pro' ? '#ffd700'
                       : user.membership_tier === 'basic' ? '#d4dce8'
                       : '#94a3b8',  // FREE — cooler slate
                  textShadow: user.membership_tier === 'pro'
                    ? '0 1px 2px rgba(0,0,0,0.4)'
                    : '0 1px 2px rgba(0,0,0,0.3)',
                }}>{user.membership_tier}</span>
              )}
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

      {/* ── Earnings strip & Network strip moved to Command Centre ──
          7 May 2026: dashboard simplified to action-only (EXPLORE +
          QUICK ACTIONS, 8 cards total, no analytics strips). The
          earnings-by-stream and network metrics now live in a
          Performance Snapshot section at the top of /command-centre
          where they belong — Dashboard answers "what do you want to
          do?", Command Centre answers "how am I performing?". */}

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
            animation: 'toastSlideIn .4s ease-out', display: 'flex', alignItems: 'flex-start', gap: 14,
            // minWidth 380 is what we want on desktop, but on a 360px
            // phone this caused the toast to extend off the right edge
            // (toast container is `position:fixed; right:24` so a 380px
            // child clips badly). Capping to min(380, viewport - margins)
            // keeps the desktop look intact while letting the toast shrink
            // to fit phones. The container's maxWidth: 420 elsewhere caps
            // the upper bound.
            minWidth: 'min(380px, calc(100vw - 48px))',
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
