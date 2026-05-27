/**
 * FoundingPartnerBanner.jsx
 * ════════════════════════════════════════════════════════════════
 * Gold-themed banner shown on the dashboard to free users (only),
 * promoting the 100-spot founding partner offer at $15/mo locked
 * for life.
 *
 * Behaviour:
 *  - Only renders for users with !user.is_active (i.e. free members)
 *  - Polls /api/founding-members/status every 60s to keep the
 *    remaining-spots count fresh
 *  - Hides automatically when spots fill (is_open becomes false)
 *  - Dismissable per session (remembered in sessionStorage so it
 *    comes back on next login but not on every dashboard refresh)
 *  - Clicking the CTA navigates to /upgrade (the activation flow)
 *
 * Visual style:
 *  - Vibrant gold gradient base with 15 twinkling sparkles
 *  - Embossed crown icon (subtle pulse)
 *  - "EXCLUSIVE INVITATION · Founding Partner Circle" eyebrow
 *  - Large spot count: "Only 85 of 100 seats remaining"
 *  - Single CTA: "Claim Your Founding Seat"
 *
 * Sprint 2b — 15 May 2026. Created alongside flat-pricing migration.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';

const SESSION_KEY = 'founding-banner-dismissed';

export default function FoundingPartnerBanner({ user }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(function() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  });

  // Poll founding status on mount and every 60s thereafter.
  // Active members ALSO see the banner during the deadline window — they
  // can't claim a spot themselves but can nudge their downline. Polling
  // runs for everyone so the count + countdown stay current.
  useEffect(function() {
    if (dismissed) return;

    let cancelled = false;
    function load() {
      apiGet('/api/founding-members/status')
        .then(function(r) {
          if (!cancelled && r && typeof r.spots_remaining === 'number') {
            setStatus(r);
          }
        })
        .catch(function() {});
    }
    load();
    const interval = setInterval(load, 60000);
    return function() {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dismissed, user]);

  // Countdown timer — ticks every second locally so the deadline counts
  // down smoothly without hammering the API. Reads status.deadline_utc
  // and recomputes the remaining time string. Added 27 May 2026 when
  // the offer became time-bounded as well as count-bounded.
  const [countdown, setCountdown] = useState(null);
  useEffect(function() {
    if (!status || !status.deadline_utc) { setCountdown(null); return; }
    function tick() {
      try {
        const deadline = new Date(status.deadline_utc.replace('Z', '') + 'Z');
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        if (diff <= 0) { setCountdown('Offer closed'); return; }
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        if (days > 0) {
          setCountdown(days + 'd ' + hours + 'h ' + minutes + 'm');
        } else if (hours > 0) {
          setCountdown(hours + 'h ' + minutes + 'm ' + seconds + 's');
        } else {
          setCountdown(minutes + 'm ' + seconds + 's');
        }
      } catch (e) { setCountdown(null); }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return function() { clearInterval(interval); };
  }, [status]);

  // Skip render conditions. Banner now shows to ALL logged-in users
  // during the deadline window: free members get the "claim a spot" CTA,
  // active members get the "share your link" CTA so they can push their
  // downline to claim before Friday.
  if (!user) return null;
  if (dismissed) return null;
  if (!status) return null;          // Wait for the first API response
  if (!status.is_open) return null;  // Spots filled OR deadline passed — banner retires

  const remaining = status.spots_remaining;
  const claimed = status.spots_claimed;
  const isActive = user.is_active === true;

  function handleDismiss(e) {
    e.stopPropagation();
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (err) {}
    setDismissed(true);
  }

  // Action differs per user state:
  //   Free members → /upgrade (claim a spot)
  //   Active members → /my-team (share their ref link, push their downline)
  function handlePrimaryAction() {
    if (isActive) {
      navigate('/my-team');
    } else {
      navigate('/upgrade');
    }
  }

  const ctaLabel = isActive ? 'Push my team →' : 'Claim Your Seat →';
  const eyebrow = isActive ? 'Final Call · Push your team before Friday' : 'Final Call · Founding Partner Circle';
  const subline = isActive
    ? 'Founder pricing closes Friday — share your referral link now to lock in $10 sponsor commissions on every Founder activation before the deadline.'
    : 'Lock in $15/month for life — $5 off every month, forever. After the deadline the price is $20/month, no exceptions.';

  // Generate 15 sparkle positions (deterministic — same on every render)
  const sparkles = [];
  const positions = [
    { top: 12, left: 8, size: 6, delay: 0 },
    { top: 24, left: 22, size: 4, delay: 0.4 },
    { top: 64, left: 14, size: 5, delay: 0.8 },
    { top: 78, left: 32, size: 4, delay: 1.2 },
    { top: 18, left: 45, size: 5, delay: 0.2 },
    { top: 56, left: 58, size: 6, delay: 0.6 },
    { top: 72, left: 70, size: 4, delay: 1.0 },
    { top: 28, left: 82, size: 5, delay: 1.4 },
    { top: 14, left: 92, size: 4, delay: 0.3 },
    { top: 68, left: 87, size: 5, delay: 0.7 },
    { top: 42, left: 38, size: 3, delay: 1.1 },
    { top: 48, left: 65, size: 4, delay: 1.5 },
    { top: 36, left: 12, size: 4, delay: 0.5 },
    { top: 82, left: 50, size: 4, delay: 0.9 },
    { top: 32, left: 76, size: 3, delay: 1.3 },
  ];
  positions.forEach(function(p, i) {
    sparkles.push(
      <div key={i} style={{
        position: 'absolute',
        top: p.top + '%',
        left: p.left + '%',
        width: p.size + 'px',
        height: p.size + 'px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 0 ' + (p.size * 2) + 'px rgba(255, 255, 255, 0.8)',
        animation: 'foundingSparkle 2s ease-in-out infinite',
        animationDelay: p.delay + 's',
        pointerEvents: 'none',
      }} />
    );
  });

  return (
    <>
      <style>{`
        @keyframes foundingSparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.6); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes foundingCountBreath {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes foundingCrownPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 35%, #fbbf24 70%, #d97706 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 18,
        boxShadow: '0 8px 24px rgba(217, 119, 6, 0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
        color: '#1f1410',
        fontFamily: 'Sora, sans-serif',
        cursor: 'pointer',
      }}
      onClick={handlePrimaryAction}>
        {sparkles}

        {/* Dismiss × button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss founding partner banner"
          style={{
            position: 'absolute',
            top: 10, right: 12,
            width: 26, height: 26,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(31, 20, 16, 0.15)',
            color: '#1f1410',
            cursor: 'pointer',
            fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}>
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>

          {/* Crown icon */}
          <div style={{
            fontSize: 44,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            animation: 'foundingCrownPulse 3s ease-in-out infinite',
            flexShrink: 0,
          }}>
            👑
          </div>

          {/* Text block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.8,
              marginBottom: 4,
            }}>
              {eyebrow}
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: 6,
            }}>
              <span style={{
                display: 'inline-block',
                animation: 'foundingCountBreath 4s ease-in-out infinite',
                fontWeight: 900,
              }}>{remaining}</span> of 100 seats left
              {countdown && (
                <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85, marginLeft: 10 }}>
                  · closes in <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800 }}>{countdown}</span>
                </span>
              )}
            </div>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              opacity: 0.85,
              lineHeight: 1.4,
            }}>
              {subline}
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={function(e) { e.stopPropagation(); handlePrimaryAction(); }}
            style={{
              flexShrink: 0,
              padding: '14px 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #1f1410 0%, #3d2817 100%)',
              color: '#fbbf24',
              fontFamily: 'Sora, sans-serif',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </>
  );
}
