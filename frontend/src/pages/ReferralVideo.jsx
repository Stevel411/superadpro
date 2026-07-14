// ─── ReferralVideo ─ Personalised video sales page ──────────────────
// Route: /ref/:username/video
// Shipped: 26 May 2026
//
// Purpose: every active member gets a polished, branded sales page they
// share with their network. Page is identical for every member — only
// the affiliate link injection changes per URL. They share the link,
// visitor watches the founder's 22-min overview, every CTA on the page
// routes to /ref/{username} so the sponsor cookie is dropped before
// signup.
//
// Architecture decisions:
//   - Pure frontend page; backend just serves the React shell at the
//     /ref/:username/video URL (no SSR needed — content is identical per
//     visitor, only the URL parameter differs)
//   - Video hosted on Cloudflare R2 (superadpro-media/funnel-videos/).
//     R2 serves with accept-ranges:bytes so iOS Safari plays correctly,
//     and R2 has zero egress fees so viral sharing doesn't blow up the
//     Railway dyno bandwidth.
//   - Custom video player (no native HTML5 controls) so the controls
//     bar lives in a separate dark band BELOW the video frame, never
//     overlaying Steve's webcam in the bottom-right of the recording
//   - Profit Grid section uses a custom SVG showing the actual 4×4
//     grid structure (40% direct, 6.25%×8 uni-level, $3,200 completion
//     bonus). All numbers verified against app/grid.py — the spec doc
//     is out of date.
//   - CTAs go to /ref/{username} which is the existing backend redirect
//     (drops sponsor cookie, lands on /register with ref pre-filled)
//
// Design language: light & punchy (white bg, cobalt text, cyan accents,
// gold highlights on the Profit Grid). Matches mockup-2-light-punchy.

import { useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

// ── R2 asset URLs ────────────────────────────────────────────────────
const VIDEO_URL = 'https://pub-c65d78296e574524bdcda856c402c7a1.r2.dev/funnel-videos/AdvantageLife%20Overview1.mp4';
// Hero background — uploaded to R2 26 May 2026.
const HERO_BG_URL = 'https://pub-c65d78296e574524bdcda856c402c7a1.r2.dev/marketing-bg/R9K1t.jpg';

export default function ReferralVideo() {
  const { username } = useParams();

  // ── Sponsor cookie drop ──
  // Belt-and-braces. The visitor's CTAs already point to /ref/{username}
  // which drops the cookie when clicked, but if they bookmark this page
  // and come back later we want them tagged regardless. Fires once on
  // mount, redirect:'manual' so we don't follow the 302 to /register.
  useEffect(() => {
    if (!username) return;
    fetch(`/ref/${encodeURIComponent(username)}`, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
    }).catch(() => { /* silent, the CTAs are the real path */ });
  }, [username]);

  const ctaUrl = username ? `/ref/${encodeURIComponent(username)}` : '/register';
  const displayUsername = username ? `@${username}` : 'a AdvantageLife member';

  return (
    <>
      <style>{styles}</style>

      <header className="rv-header">
        <div className="rv-header-inner">
          <div className="rv-brand">Super<span className="rv-brand-accent">AdPro</span></div>
          <a href={ctaUrl} className="rv-header-cta">Join — $20/mo →</a>
        </div>
      </header>

      <main className="rv-main">
        {/* ── Hero ── compressed copy, video sits high on the page ── */}
        <section className="rv-hero">
          <div className="rv-pill">
            <span className="rv-pill-dot"/>
            <span>Invited by {displayUsername}</span>
          </div>
          <h1 className="rv-h1">
            The AI marketing toolkit<br/>
            built for <span className="rv-highlight">affiliate marketers.</span>
          </h1>
          <p className="rv-subhead">
            Watch the 22-minute overview. The complete toolkit to capture
            leads, build pages, and grow your audience — plus an optional
            comp plan that pays you to share what you already love using.
          </p>
          <div className="rv-hero-meta">
            <span className="rv-meta-item">$20/month</span>
            <span className="rv-meta-item">Cancel anytime</span>
            <span className="rv-meta-item">No upsells</span>
          </div>
        </section>

        {/* ── Custom video player ── */}
        <VideoPlayer src={VIDEO_URL}/>

        {/* ── Profit Grid — dedicated section with SVG visual ── */}
        <ProfitGridSection/>

        {/* ── Toolkit — 5 coloured cards ── */}
        <section className="rv-section">
          <div className="rv-eyebrow">◆ The toolkit</div>
          <h2 className="rv-section-heading">Built for affiliate marketers.<br/>Every tool you actually use.</h2>
          <p className="rv-section-subhead">Capture leads, build pages, run email campaigns, and brand yourself — under one roof, one login, one price.</p>
          <div className="rv-value-grid">
            <ValueCard emoji="🪄" tint="blue" title="AI Page Builder" body="Generate landing pages, opt-ins, sales pages and full funnels with AI. Drag-edit anything. Publish in minutes."/>
            <ValueCard emoji="🎨" tint="pink" title="Creative Studio" body="Banners, posters, ad creatives, even AI video. Same models the top creators pay premium subscriptions for."/>
            <ValueCard emoji="📧" tint="green" title="CRM + Email Engine" body="Capture leads from your pages, segment automatically, send broadcasts and full autoresponder sequences."/>
            <ValueCard emoji="🔗" tint="amber" title="LinkHub + Bio Tools" body="Replace Linktree with a fully-branded bio page. Lead Finder, QR codes, custom shortlinks — all included."/>
            <ValueCard emoji="⚡" tint="lavender" title="No upsells, ever" body="One price. Full access. No 'next tier' gating. Cancel anytime from your account in two clicks."/>
          </div>
        </section>

        {/* ── The maths — comparison vs typical stack ── */}
        <section className="rv-compare-section">
          <div className="rv-eyebrow">◆ The maths</div>
          <h2 className="rv-section-heading">$20 replaces $200+ of tools</h2>
          <p className="rv-section-subhead">Most affiliates stitch together five subscriptions to run their business. AdvantageLife does it all in one.</p>
          <div className="rv-compare-grid">
            <div className="rv-compare-row rv-header-row">
              <div>Job to be done</div>
              <div>Typical stack</div>
              <div>AdvantageLife</div>
            </div>
            <CompareRow task="Page builder" them="$49/mo"/>
            <CompareRow task="CRM + email autoresponder" them="$49/mo"/>
            <CompareRow task="Bio link page" them="$9/mo"/>
            <CompareRow task="AI creative generator" them="$25/mo"/>
            <CompareRow task="AI video tools" them="$40/mo"/>
            <div className="rv-compare-row rv-total-row">
              <div className="rv-compare-task">Total monthly cost</div>
              <div className="rv-compare-them-strike">$172/mo</div>
              <div className="rv-compare-us-bright">$20/mo</div>
            </div>
          </div>
        </section>

        {/* ── Final CTA — clean Join button ── */}
        <section className="rv-final-cta">
          <a href={ctaUrl} className="rv-cta-join">
            Join AdvantageLife <span className="rv-cta-arrow">→</span>
          </a>
          <p className="rv-final-cta-meta">$20/month · cancel anytime · invited by <span>{displayUsername}</span></p>
        </section>
      </main>

      <footer className="rv-footer">
        <p>AdvantageLife provides marketing tools and an optional compensation program. Results from the optional comp program depend entirely on the effort, skill, and network of each member. No income is guaranteed.</p>
        <p style={{ opacity: 0.7, marginTop: 12 }}>© {new Date().getFullYear()} AdvantageLife Ltd · superadpro.com</p>
      </footer>
    </>
  );
}

// ── Custom Video Player ──────────────────────────────────────────────
// HTML5 native controls deliberately NOT used — they overlay the bottom
// of the video frame which is where Steve's webcam sits in the source
// recording. Custom controls below the frame keep him fully visible.
function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const scrubRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const isDraggingRef = useRef(false);

  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const seekFromEvent = (e) => {
    const scrub = scrubRef.current;
    const v = videoRef.current;
    if (!scrub || !v || !v.duration) return;
    const rect = scrub.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
  };

  const onScrubMouseDown = (e) => { e.stopPropagation(); isDraggingRef.current = true; seekFromEvent(e); };
  const onScrubTouchStart = (e) => { e.stopPropagation(); isDraggingRef.current = true; seekFromEvent(e); };

  useEffect(() => {
    const onMove = (e) => { if (isDraggingRef.current) seekFromEvent(e); };
    const onUp = () => { isDraggingRef.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'BUTTON') return;
      e.preventDefault();
      togglePlay();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onFullscreen = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (!document.fullscreenElement) {
      (v.requestFullscreen || v.webkitRequestFullscreen || (() => {})).call(v);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
    }
  };

  const onMuteToggle = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rv-video-wrap">
      <div className="rv-video-wrap-inner">
        <div className={`rv-video-player ${playing ? 'rv-playing' : ''}`}>
          <div className="rv-video-frame" onClick={togglePlay}>
            <video
              ref={videoRef}
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
              onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
              onProgress={(e) => {
                const v = e.target;
                if (v.buffered.length > 0 && v.duration) {
                  setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
                }
              }}
            >
              <source src={src} type="video/mp4"/>
            </video>
            {!playing && (
              <div className="rv-play-overlay">
                <button
                  className="rv-play-big"
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  aria-label="Play video"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            )}
          </div>
          <div className="rv-controls">
            <button className="rv-ctrl-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }} aria-label="Play / pause">
              {playing
                ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <div className="rv-scrub" ref={scrubRef} onMouseDown={onScrubMouseDown} onTouchStart={onScrubTouchStart}>
              <div className="rv-scrub-buffer" style={{ width: `${buffered}%` }}/>
              <div className="rv-scrub-progress" style={{ width: `${pct}%` }}/>
              <div className="rv-scrub-thumb" style={{ left: `${pct}%` }}/>
            </div>
            <div className="rv-time">{fmt(currentTime)} / {fmt(duration)}</div>
            <button className="rv-ctrl-btn" onClick={onMuteToggle} aria-label="Mute / unmute">
              {muted
                ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77S18.01 4.14 14 3.23z"/></svg>}
            </button>
            <button className="rv-ctrl-btn" onClick={onFullscreen} aria-label="Fullscreen">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profit Grid Section ──────────────────────────────────────────────
function ProfitGridSection() {
  return (
    <section className="rv-pg-section">
      <div className="rv-pg-inner">
        <div className="rv-pg-layout">
          {/* LEFT: copy + bullets */}
          <div className="rv-pg-copy">
            <div className="rv-eyebrow rv-eyebrow-left">◆ The Profit Grid</div>
            <h2 className="rv-pg-headline">
              Build a Grid.<br/>
              <span className="rv-pg-headline-accent">Every position pays.</span>
            </h2>
            <p className="rv-pg-subhead">
              Every member you refer becomes a seat in your Profit Grid —
              a <strong>4 × 4 grid</strong> of 16 positions that fills as
              your team buys campaigns. Earn <strong>40% direct</strong>
              on every entry, plus <strong>6.25% across 8 uni-level
              levels</strong> as commissions walk up the chain.
            </p>
            <div className="rv-pg-bullets">
              <PgBullet dot="gold" title="Gold seats — your directs" body="30% commission on every campaign entry from anyone you personally refer."/>
              <PgBullet dot="cyan" title="Cyan seats — your uni-level" body="6.25% from every entry across 8 levels deep — 50% in total uni-level commission."/>
              <PgBullet dot="pulse" title="Completion bonus — seat 16" body={<>When the final seat fills, the bonus pool pays out — up to <strong>$3,200</strong>. Then the grid cycles again.</>}/>
            </div>
            <div className="rv-pg-footer-pill">
              <span className="rv-pg-footer-dot"/>
              100% optional · the toolkit works standalone
            </div>
          </div>
          {/* RIGHT: SVG */}
          <div className="rv-pg-visual">
            <div className="rv-pg-visual-frame">
              <ProfitGridSVG/>
              <div className="rv-pg-tag rv-pg-tag-gold">+40% direct</div>
              <div className="rv-pg-tag rv-pg-tag-cyan">+6.25% × 8 levels</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PgBullet({ dot, title, body }) {
  return (
    <div className="rv-pg-bullet">
      <div className={`rv-pg-bullet-dot rv-dot-${dot}`}/>
      <div>
        <div className="rv-pg-bullet-title">{title}</div>
        <div className="rv-pg-bullet-body">{body}</div>
      </div>
    </div>
  );
}

// ── ProfitGridSVG ──
// 4×4 grid (16 seats) + YOU node + uni-level depth annotation. All
// numbers + structure verified against app/grid.py. Same SVG as the
// locked mockup — re-rendered via React with the same paths.
function ProfitGridSVG() {
  return (
    <svg viewBox="0 0 480 540" xmlns="http://www.w3.org/2000/svg" className="rv-pg-svg">
      <defs>
        <radialGradient id="rvGold" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fde047"/>
          <stop offset="50%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#b45309"/>
        </radialGradient>
        <radialGradient id="rvCyan" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f5b8c2"/>
          <stop offset="50%" stopColor="#e8203f"/>
          <stop offset="100%" stopColor="#a00d24"/>
        </radialGradient>
        <radialGradient id="rvYou" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="40%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#92400e"/>
        </radialGradient>
        <radialGradient id="rvComplete" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="40%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#b45309"/>
        </radialGradient>
        <linearGradient id="rvLineGold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3"/>
        </linearGradient>
        <filter id="rvGlowGold" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="rvGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="240" cy="50" r="28" fill="none" stroke="#fde047" strokeWidth="2" opacity="0.5">
        <animate attributeName="r" values="28;44;28" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <g filter="url(#rvGlowGold)">
        <circle cx="240" cy="50" r="28" fill="url(#rvYou)"/>
        <circle cx="240" cy="50" r="28" fill="none" stroke="#fde047" strokeWidth="2" opacity="0.85"/>
        <text x="240" y="55" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="800" fontSize="12" fill="#451a03">YOU</text>
      </g>
      {/* YOU → 4 direct seats (row 1) */}
      <line x1="240" y1="78" x2="108" y2="175" stroke="url(#rvLineGold)" strokeWidth="2"/>
      <line x1="240" y1="78" x2="196" y2="175" stroke="url(#rvLineGold)" strokeWidth="2"/>
      <line x1="240" y1="78" x2="284" y2="175" stroke="url(#rvLineGold)" strokeWidth="2"/>
      <line x1="240" y1="78" x2="372" y2="175" stroke="url(#rvLineGold)" strokeWidth="2"/>
      <rect x="48" y="140" width="384" height="345" rx="14" fill="rgba(255,255,255,0.4)" stroke="rgba(10,20,56,0.08)" strokeWidth="1"/>
      <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill="#94a3b8" textAnchor="end">
        <text x="40" y="179">L1</text>
        <text x="40" y="269">L2</text>
        <text x="40" y="359">L3</text>
        <text x="40" y="449">L4</text>
      </g>
      {/* Row 1 — gold direct referrals (4) */}
      <g filter="url(#rvGlowGold)">
        {[108, 196, 284, 372].map(cx => (
          <circle key={cx} cx={cx} cy="175" r="22" fill="url(#rvGold)"/>
        ))}
      </g>
      {/* Rows 2–4 — cyan spillover (last seat of row 4 is the completion seat) */}
      <g filter="url(#rvGlowCyan)">
        {[265, 355].flatMap(cy =>
          [108, 196, 284, 372].map(cx => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="18" fill="url(#rvCyan)"/>
          ))
        )}
        {[108, 196, 284].map(cx => (
          <circle key={`r4-${cx}`} cx={cx} cy="445" r="18" fill="url(#rvCyan)"/>
        ))}
      </g>
      {/* Completion seat — position 16, bottom-right */}
      <circle cx="372" cy="445" r="20" fill="none" stroke="#fde047" strokeWidth="2" opacity="0.6">
        <animate attributeName="r" values="20;32;20" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <g filter="url(#rvGlowGold)">
        <circle cx="372" cy="445" r="22" fill="url(#rvComplete)"/>
        <circle cx="372" cy="445" r="22" fill="none" stroke="#fde047" strokeWidth="1.5" opacity="0.8"/>
        <text x="372" y="450" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="800" fontSize="11" fill="#451a03">16</text>
      </g>
      <text x="240" y="512" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill="#0a1f52" letterSpacing="0.4">4 WIDE × 4 DEEP = 16 SEATS</text>
      <text x="240" y="530" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill="#64748b" letterSpacing="0.3">commissions pay 8 levels deep ↓</text>
    </svg>
  );
}

function ValueCard({ emoji, tint, title, body }) {
  return (
    <div className="rv-value-card">
      <div className={`rv-value-icon rv-tint-${tint}`}>{emoji}</div>
      <div className="rv-value-title">{title}</div>
      <div className="rv-value-body">{body}</div>
    </div>
  );
}

function CompareRow({ task, them }) {
  return (
    <div className="rv-compare-row">
      <div className="rv-compare-task">{task}</div>
      <div className="rv-compare-them">{them}</div>
      <div className="rv-compare-us">included</div>
    </div>
  );
}

// ─── Stylesheet ────────────────────────────────────────────────────
// All styles scoped to rv- prefix to avoid collisions with the rest of
// the app. Imported as a JS template literal + injected via <style> in
// the component above. Lifted verbatim from the locked mockup, with
// class names converted to react-camelCase only where needed (className,
// strokeWidth etc above — actual CSS is the same kebab-case).
const styles = `
  .rv-header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(10,20,56,0.08);
  }
  .rv-header-inner {
    max-width: 1120px; margin: 0 auto;
    padding: 14px 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .rv-brand {
    font-family: 'Sora', sans-serif;
    font-size: 19px; font-weight: 800;
    color: #0a1f52;
    letter-spacing: -0.02em;
  }
  .rv-brand-accent { color: #e8203f; }
  .rv-header-cta {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 11px 20px;
    border-radius: 10px;
    background: #0a1f52;
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 13px; font-weight: 800;
    letter-spacing: 0.2px;
    text-decoration: none;
    transition: all .2s;
    box-shadow: 0 4px 14px rgba(10,20,56,0.15);
    border: none;
  }
  .rv-header-cta:hover {
    background: #12388f;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(10,20,56,0.25);
  }

  .rv-main {
    position: relative;
    background-color: #fafbfd;
    background-image: url('${HERO_BG_URL}');
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: #0a1f52;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    line-height: 1.55;
  }

  .rv-hero {
    max-width: 1120px; margin: 0 auto;
    padding: 44px 24px 24px;
    position: relative;
    z-index: 1;
  }
  .rv-pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 12px;
    border-radius: 999px;
    background: #ecfeff;
    border: 1px solid #a5f3fc;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 700;
    color: #a00d24;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .rv-pill-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #e8203f;
  }
  .rv-h1 {
    font-family: 'Sora', sans-serif;
    font-size: clamp(28px, 4.6vw, 48px);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: #0a1f52;
    margin: 0 0 14px;
  }
  .rv-highlight {
    background: linear-gradient(135deg, #e8203f 0%, #c8102e 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .rv-subhead {
    font-size: clamp(14px, 1.7vw, 16px);
    color: #475569;
    max-width: 640px;
    line-height: 1.55;
    margin: 0 0 18px;
  }
  .rv-hero-meta {
    display: inline-flex; flex-wrap: wrap; gap: 8px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px; font-weight: 700;
    color: #64748b;
    letter-spacing: 0.3px;
  }
  .rv-meta-item { display: inline-flex; align-items: center; gap: 6px; }
  .rv-meta-item::before { content: '◆'; color: #e8203f; font-size: 8px; }

  /* Video player */
  .rv-video-wrap { max-width: 1120px; margin: 16px auto 0; padding: 0 24px; }
  .rv-video-wrap-inner { position: relative; }
  .rv-video-wrap-inner::before {
    content: '';
    position: absolute;
    inset: -12px -12px 12px 12px;
    background: linear-gradient(135deg, #e8203f 0%, #c8102e 100%);
    border-radius: 22px;
    z-index: 0;
    opacity: 0.18;
    transform: rotate(0.6deg);
  }
  .rv-video-player {
    position: relative; z-index: 1;
    border-radius: 20px;
    overflow: hidden;
    background: #0e1a3e;
    box-shadow:
      0 30px 80px -20px rgba(10,20,56,0.35),
      0 0 0 1px rgba(34,211,238,0.18);
  }
  .rv-video-frame {
    position: relative;
    background: #000;
    aspect-ratio: 1796 / 1080;
    overflow: hidden;
    cursor: pointer;
  }
  .rv-video-frame video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }
  .rv-play-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    transition: opacity .25s;
    z-index: 2;
    pointer-events: none;
  }
  .rv-playing .rv-play-overlay { opacity: 0; }
  .rv-play-big {
    width: 88px; height: 88px;
    border-radius: 50%;
    background: rgba(255,255,255,0.96);
    color: #0a1f52;
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      0 12px 40px rgba(0,0,0,0.35),
      0 0 0 8px rgba(255,255,255,0.18);
    transition: transform .2s;
    border: none;
    pointer-events: auto;
    cursor: pointer;
  }
  .rv-video-frame:hover .rv-play-big { transform: scale(1.06); }
  .rv-play-big svg { width: 32px; height: 32px; margin-left: 4px; }
  .rv-controls {
    background: linear-gradient(180deg, #0e1a3e 0%, #0a1f52 100%);
    padding: 12px 16px 14px;
    display: flex; align-items: center; gap: 12px;
    color: #fff;
    border-top: 1px solid rgba(34,211,238,0.18);
  }
  .rv-ctrl-btn {
    background: transparent; border: none; color: #fff;
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s;
    flex-shrink: 0;
    cursor: pointer;
  }
  .rv-ctrl-btn:hover { background: rgba(34,211,238,0.15); }
  .rv-ctrl-btn svg { width: 20px; height: 20px; }
  .rv-scrub {
    flex: 1;
    position: relative;
    height: 6px;
    background: rgba(255,255,255,0.15);
    border-radius: 999px;
    cursor: pointer;
    margin: 0 4px;
  }
  .rv-scrub-buffer { position: absolute; top: 0; left: 0; height: 100%; background: rgba(255,255,255,0.25); border-radius: 999px; }
  .rv-scrub-progress { position: absolute; top: 0; left: 0; height: 100%; background: linear-gradient(90deg, #e8203f, #e8203f); border-radius: 999px; }
  .rv-scrub-thumb {
    position: absolute; top: 50%;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    transform: translate(-50%, -50%);
    transition: transform .15s;
  }
  .rv-scrub:hover .rv-scrub-thumb { transform: translate(-50%, -50%) scale(1.2); }
  .rv-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; font-weight: 700;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.3px;
    min-width: 92px;
    text-align: center;
    user-select: none;
  }

  /* ── Profit Grid section ── */
  .rv-pg-section {
    background:
      radial-gradient(circle at 0% 0%, rgba(34,211,238,0.12), transparent 50%),
      radial-gradient(circle at 100% 100%, rgba(14,165,233,0.08), transparent 55%),
      linear-gradient(180deg, #ecfeff 0%, #f0fafb 100%);
    padding: 72px 0;
    position: relative;
    overflow: hidden;
    border-top: 1px solid rgba(6,182,212,0.15);
    border-bottom: 1px solid rgba(6,182,212,0.15);
    margin-top: 48px;
  }
  .rv-pg-section::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    pointer-events: none;
  }
  .rv-pg-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
  .rv-pg-layout {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 48px;
    align-items: center;
  }
  .rv-pg-copy { max-width: 540px; }
  .rv-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px; font-weight: 700;
    color: #e8203f;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    margin-bottom: 12px;
    text-align: center;
  }
  .rv-eyebrow-left { text-align: left; margin-bottom: 16px; }
  .rv-pg-headline {
    font-family: 'Sora', sans-serif;
    font-size: clamp(32px, 4.4vw, 50px);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: #0a1f52;
    margin: 0 0 18px;
  }
  .rv-pg-headline-accent {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .rv-pg-subhead {
    font-size: 16px;
    color: #475569;
    line-height: 1.6;
    margin: 0 0 28px;
  }
  .rv-pg-subhead strong { color: #0a1f52; font-weight: 800; }
  .rv-pg-bullets { display: flex; flex-direction: column; gap: 18px; margin-bottom: 28px; }
  .rv-pg-bullet { display: flex; gap: 14px; align-items: flex-start; }
  .rv-pg-bullet-dot {
    flex-shrink: 0;
    width: 14px; height: 14px;
    border-radius: 50%;
    margin-top: 4px;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.85);
  }
  .rv-dot-gold {
    background: radial-gradient(circle at 30% 30%, #fde047, #d97706);
    box-shadow: 0 0 0 3px rgba(251,191,36,0.18), 0 0 12px rgba(251,191,36,0.5);
  }
  .rv-dot-cyan {
    background: radial-gradient(circle at 30% 30%, #f5b8c2, #a00d24);
    box-shadow: 0 0 0 3px rgba(34,211,238,0.18), 0 0 12px rgba(34,211,238,0.4);
  }
  .rv-dot-pulse {
    background: radial-gradient(circle at 30% 30%, #fef3c7, #fbbf24);
    box-shadow: 0 0 0 3px rgba(251,191,36,0.18), 0 0 14px rgba(251,191,36,0.6);
    animation: rvDotPulse 2.2s ease-in-out infinite;
  }
  @keyframes rvDotPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.18); }
  }
  .rv-pg-bullet-title {
    font-family: 'Sora', sans-serif;
    font-size: 15px; font-weight: 800;
    color: #0a1f52;
    margin-bottom: 3px;
    letter-spacing: -0.005em;
  }
  .rv-pg-bullet-body {
    font-size: 13.5px;
    color: #64748b;
    line-height: 1.5;
  }
  .rv-pg-bullet-body strong { color: #0a1f52; font-weight: 800; }
  .rv-pg-visual { display: flex; align-items: center; justify-content: center; }
  .rv-pg-visual-frame { position: relative; width: 100%; max-width: 480px; aspect-ratio: 480 / 540; }
  .rv-pg-svg { width: 100%; height: 100%; display: block; }
  .rv-pg-tag {
    position: absolute;
    padding: 7px 13px;
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 800;
    letter-spacing: 0.3px;
    box-shadow: 0 6px 18px rgba(10,20,56,0.18);
    white-space: nowrap;
  }
  .rv-pg-tag-gold {
    top: 18%; left: -8px;
    background: linear-gradient(135deg, #fde047, #f59e0b);
    color: #451a03;
    border: 1px solid rgba(180, 83, 9, 0.4);
  }
  .rv-pg-tag-cyan {
    top: 50%; right: -8px;
    background: linear-gradient(135deg, #f5b8c2, #e8203f);
    color: #083344;
    border: 1px solid rgba(8, 145, 178, 0.4);
  }
  .rv-pg-footer-pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 18px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid rgba(6,182,212,0.3);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; font-weight: 700;
    color: #a00d24;
    letter-spacing: 0.4px;
  }
  .rv-pg-footer-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #e8203f;
    box-shadow: 0 0 10px rgba(34,211,238,0.8);
  }

  /* ── Toolkit section ── */
  .rv-section { max-width: 1120px; margin: 0 auto; padding: 80px 24px; }
  .rv-section-heading {
    font-family: 'Sora', sans-serif;
    font-size: clamp(28px, 4.5vw, 44px);
    font-weight: 900;
    color: #0a1f52;
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-align: center;
    margin: 0 0 14px;
  }
  .rv-section-subhead {
    text-align: center;
    color: #64748b;
    font-size: 16px;
    margin: 0 auto 52px;
    max-width: 600px;
    line-height: 1.6;
  }
  .rv-value-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }
  .rv-value-card {
    background: #fff;
    border: 1px solid #e6eaf0;
    border-radius: 16px;
    padding: 28px 26px;
    transition: all .2s;
    position: relative;
    overflow: hidden;
  }
  .rv-value-card:hover {
    border-color: #e8203f;
    transform: translateY(-3px);
    box-shadow: 0 12px 32px -8px rgba(6,182,212,0.18);
  }
  .rv-value-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #e8203f, #c8102e);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform .25s;
  }
  .rv-value-card:hover::after { transform: scaleX(1); }
  .rv-value-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px;
    border-radius: 12px;
    margin-bottom: 18px;
    font-size: 22px;
    border: 1px solid #a5f3fc;
  }
  .rv-tint-blue   { background: linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%); border-color: #93c5fd; }
  .rv-tint-pink   { background: linear-gradient(135deg,#fce7f3 0%,#fbcfe8 100%); border-color: #f9a8d4; }
  .rv-tint-green  { background: linear-gradient(135deg,#dcfce7 0%,#bbf7d0 100%); border-color: #86efac; }
  .rv-tint-amber  { background: linear-gradient(135deg,#fef3c7 0%,#fde68a 100%); border-color: #fcd34d; }
  .rv-tint-lavender { background: linear-gradient(135deg,#ede9fe 0%,#ddd6fe 100%); border-color: #c4b5fd; }
  .rv-value-title {
    font-family: 'Sora', sans-serif;
    font-size: 18px; font-weight: 800;
    color: #0a1f52;
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }
  .rv-value-body {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
  }

  /* ── Maths comparison ── */
  .rv-compare-section {
    background:
      radial-gradient(circle at 20% 0%, rgba(6,182,212,0.06), transparent 50%),
      radial-gradient(circle at 80% 100%, rgba(30,58,138,0.05), transparent 50%),
      #f5f7fb;
    padding: 80px 0;
    border-top: 1px solid #e6eaf0;
    border-bottom: 1px solid #e6eaf0;
  }
  .rv-compare-grid {
    max-width: 800px;
    margin: 40px auto 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 0 24px;
  }
  .rv-compare-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 20px;
    align-items: center;
    padding: 18px 24px;
    background: #fff;
    border: 1px solid #e6eaf0;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
  }
  .rv-compare-row.rv-header-row {
    background: transparent;
    border: none;
    padding: 0 24px 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .rv-compare-row.rv-total-row {
    background: #0a1f52;
    color: #fff;
    border-color: #0a1f52;
  }
  .rv-compare-task { font-weight: 600; color: #0a1f52; }
  .rv-compare-row.rv-total-row .rv-compare-task { color: #fff; }
  .rv-compare-them { color: #94a3b8; text-align: right; font-weight: 600; }
  .rv-compare-them-strike { color: rgba(255,255,255,0.6); text-align: right; font-weight: 600; text-decoration: line-through; }
  .rv-compare-us {
    color: #e8203f; font-weight: 800;
    text-align: right;
    font-family: 'Sora', sans-serif;
  }
  .rv-compare-us-bright {
    color: #e8203f; font-weight: 800;
    text-align: right;
    font-family: 'Sora', sans-serif;
  }

  /* ── Final CTA ── */
  .rv-final-cta {
    max-width: 720px;
    margin: 0 auto;
    padding: 72px 24px 96px;
    text-align: center;
  }
  .rv-cta-join {
    display: inline-flex; align-items: center; gap: 12px;
    padding: 22px 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, #e8203f 0%, #c8102e 100%);
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 22px; font-weight: 800;
    letter-spacing: 0.3px;
    text-decoration: none;
    box-shadow: 0 12px 32px rgba(6,182,212,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
    transition: all .2s;
  }
  .rv-cta-join:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 44px rgba(6,182,212,0.55), inset 0 1px 0 rgba(255,255,255,0.25);
  }
  .rv-cta-arrow { font-size: 24px; transition: transform .2s; }
  .rv-cta-join:hover .rv-cta-arrow { transform: translateX(4px); }
  .rv-final-cta-meta {
    margin-top: 22px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; font-weight: 700;
    color: #64748b;
    letter-spacing: 0.3px;
  }
  .rv-final-cta-meta span { color: #e8203f; }

  /* ── Footer ── */
  .rv-footer {
    background: #fafbfd;
    padding: 40px 24px;
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.65;
    border-top: 1px solid #e6eaf0;
  }
  .rv-footer p { max-width: 720px; margin: 0 auto 8px; }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    .rv-hero { padding: 28px 20px 18px; }
    .rv-header-cta { padding: 9px 16px; font-size: 12px; }
    .rv-video-wrap { padding: 0 16px; }
    .rv-video-wrap-inner::before { inset: -8px -8px 8px 8px; }
    .rv-controls { padding: 10px 12px 12px; gap: 8px; }
    .rv-ctrl-btn { width: 32px; height: 32px; }
    .rv-time { font-size: 11px; min-width: 78px; }
    .rv-play-big { width: 68px; height: 68px; }
    .rv-play-big svg { width: 26px; height: 26px; }
    .rv-section { padding: 56px 20px; }
    .rv-value-card { padding: 22px 20px; }
    .rv-pg-section { padding: 56px 0; }
    .rv-pg-layout { grid-template-columns: 1fr; gap: 36px; }
    .rv-pg-copy { max-width: 100%; }
    .rv-eyebrow-left { text-align: center; }
    .rv-pg-headline { text-align: center; }
    .rv-pg-subhead { text-align: center; }
    .rv-pg-visual-frame { max-width: 360px; margin: 0 auto; }
    .rv-pg-tag-gold { left: 0; }
    .rv-pg-tag-cyan { right: 0; }
    .rv-compare-row { font-size: 13px; padding: 14px 16px; grid-template-columns: 1.2fr auto auto; }
    .rv-final-cta { padding: 48px 20px 72px; }
    .rv-cta-join { padding: 18px 36px; font-size: 18px; }
    .rv-cta-arrow { font-size: 20px; }
  }
`;
