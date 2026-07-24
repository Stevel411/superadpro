// ─── ReferralVideo ─ personal invitation page ────────────────────────
// Route: /ref/:username/video  (public — no auth, drops the sponsor cookie)
//
// REBUILT 24 Jul 2026, mockup approved by Steve.
//
// What this replaced: the page shipped 26 May 2026 for SuperAdPro and came
// across to AdvantageLife untouched. Until today it was public, promoted from
// the live My Marketing menu as "Personal Sales Video", and sold a plan that
// was retired in June — a 4x4 grid of 16 seats, 6.25% across 8 uni-level
// generations, a $3,200 completion bonus, "Join — $20/mo" in the header and a
// "$20 replaces $200+ of tools" comparison table. Zero mentions of the pass-up.
//
// Every figure below is from code, not memory:
//   $100 join + 7-day full refund ... stripe_service REFUND_SHARES al_lifetime
//   pack prices and view targets .... campaign_packs (level IS the $ price)
//   3/6/9 pass-up + infinite chains . passup_engine (verified by execution)
//   three earning gates ............. al_engine.py:190 folds payable() into
//                                     the qualification check, so a member
//                                     with no payout method is skipped
//   watch quota 1-5/day, 48h grace .. DAILY_WATCH_BY_TIER + WATCH_GRACE_HOURS
//
// The custom VideoPlayer below is carried over unchanged and still works.
// VIDEO_URL is a placeholder until Steve supplies the new overview video —
// swapping it is a one-line change.

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const VIDEO_URL = 'https://pub-c65d78296e574524bdcda856c402c7a1.r2.dev/funnel-videos/AdvantageLife%20Overview1.mp4';

// Nine packs live in campaign_packs; these five are the shape of the ladder.
// Shown as illustration only — /packs and /compensation-plan read the API.
const PACKS = [
  ['$10', 'Launchpad', '1,000 views'],
  ['$50', 'Builder', '4,000 views'],
  ['$200', 'Advanced', '15,000 views'],
  ['$600', 'Elite', '50,000 views'],
  ['$1,000', 'Champion', '120,000 views'],
];

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const CHAIN_AT = { 3: 1, 6: 2, 9: 3 };

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
  const sponsor = username ? `@${username}` : 'an AdvantageLife member';

  return (
    <div className="rv">
      <style>{styles}</style>

      <header className="rv-head">
        <div className="rv-hw">
          <div className="rv-logo"><span className="rv-mk">A</span>Advantage<em>Life</em></div>
          <div className="rv-inv">Invited by <b>{sponsor}</b></div>
          <a href={ctaUrl} className="rv-cta">Get lifetime access &mdash; $100</a>
        </div>
      </header>

      <div className="rv-hero">
        <div className="rv-wrap">
          <div className="rv-eyebrow">A personal invitation</div>
          <h1>Real ads. Real views.<br /><em>100% of every sale.</em></h1>
          <p className="rv-sub">
            AdvantageLife members sell advertising that actually gets watched &mdash; and keep
            the entire price of every pack they sell. One payment to join. Nothing monthly, ever.
          </p>
          <div className="rv-vidwrap"><VideoPlayer src={VIDEO_URL} /></div>
          <div className="rv-trust">
            <span>$100 once &mdash; lifetime access</span>
            <span>No subscription</span>
            <span>Full refund inside 7 days</span>
          </div>
        </div>
      </div>

      <section className="rv-sec">
        <div className="rv-wrap">
          <div className="rv-eyebrow">What it costs</div>
          <h2>One payment. That&rsquo;s the whole thing.</h2>
          <p className="rv-lede">
            $100 gets you lifetime access to the platform and every tool on it. There is no
            monthly membership, no renewal and nothing that recurs. If it isn&rsquo;t for you,
            ask within 7 days and you get the full $100 back &mdash; no deductions.
          </p>
          <div className="rv-cards">
            <Card n="1" title="Nobody earns on your join"
              body="No commission, bonus or override is paid on the $100. The person who invited you earns nothing from you signing up, so nobody has a reason to push you." />
            <Card n="2" title="You own it for life"
              body="Access doesn't lapse and can't be cancelled out from under you. There is no tier to maintain and no bill arriving next month." />
            <Card n="3" title="Seven days to change your mind"
              body="Full refund, no questions and no partial figure. The policy is published before you pay." />
          </div>
        </div>
      </section>

      <section className="rv-sec rv-tight">
        <div className="rv-wrap">
          <div className="rv-eyebrow">What you actually sell</div>
          <h2>Advertising that gets watched.</h2>
          <p className="rv-lede">
            Campaign packs are a real product with a defined deliverable: each one buys a set
            number of video views, delivered by real members watching. That&rsquo;s what members
            buy, and it&rsquo;s what you sell.
          </p>
          <div className="rv-packs">
            {PACKS.map(([price, name, views]) => (
              <div className="rv-pack" key={name}>
                <div className="rv-p">{price}</div>
                <div className="rv-nm">{name}</div>
                <div className="rv-v">{views}</div>
              </div>
            ))}
          </div>
          <p className="rv-lede rv-small">Nine packs in total, $10 to $1,000.</p>
        </div>
      </section>

      <section className="rv-sec rv-tight">
        <div className="rv-wrap">
          <div className="rv-eyebrow">How you get paid</div>
          <h2>The price is the commission.</h2>
          <p className="rv-lede">
            A $200 sale pays you $200. There is no split and no company share &mdash; the buyer
            pays you directly, member to member. The platform never holds the money.
          </p>
          <div className="rv-big">
            <h3>You pass up three sales. Three chains pay you back.</h3>
            <p>
              Your 3rd, 6th and 9th sales go to a qualified member above you. Every other sale
              is yours, and from your 10th onward nothing is passed up again. In return, each of
              those three opens a chain that keeps paying you &mdash; from any depth, with no limit.
            </p>
            <div className="rv-strip">
              {SLOTS.map((n) => (
                <div className={'rv-slot' + (CHAIN_AT[n] ? ' up' : '')} key={n}>
                  <div className="rv-n2">{n}</div>
                  <div className="rv-t2">{CHAIN_AT[n] ? 'Chain ' + CHAIN_AT[n] : 'Yours'}</div>
                </div>
              ))}
              <div className="rv-tail">10 onward &mdash; all yours</div>
            </div>
            <a className="rv-plink" href="/plan">See the full plan &rarr;</a>
          </div>
        </div>
      </section>

      <section className="rv-sec rv-tight">
        <div className="rv-wrap">
          <div className="rv-eyebrow">What it takes</div>
          <h2>Three things, or the sale passes you by.</h2>
          <div className="rv-cards">
            <Card n="1" title="Own that pack level or higher"
              body="You can only earn on packs at or below the one you own. Your level is the ceiling on what you can be paid." />
            <Card n="2" title="Do your daily watch"
              body="Between 1 and 5 videos a day depending on your pack. You stay qualified for 48 hours after hitting quota, and watching is what unlocks withdrawals." />
            <Card n="3" title="Have a payout method saved"
              body="Crypto, or Cash App, PayPal, Wise or Zelle. Without one on file, sales route past you." />
          </div>
        </div>
      </section>

      <div className="rv-final">
        <div className="rv-wrap">
          <h2>Ready when you are.</h2>
          <p className="rv-lede">
            One payment, lifetime access, and a full refund if you change your mind inside a week.
          </p>
          <a href={ctaUrl} className="rv-cta-lg">Get lifetime access &mdash; $100</a>
          <p className="rv-fine">
            Invited by <b>{sponsor}</b> &middot; no subscription &middot; nobody earns a commission on your join
          </p>
        </div>
      </div>

      <footer className="rv-foot">
        &copy; 2026 AdvantageLife &middot; Income examples are illustrative.
        Results depend on individual effort.
      </footer>
    </div>
  );
}

function Card({ n, title, body }) {
  return (
    <div className="rv-card">
      <div className="rv-cn">{n}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

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


const styles = `
.rv{font-family:'Inter',system-ui,sans-serif;background:#fff;color:#0a1f52;-webkit-font-smoothing:antialiased}
.rv *{box-sizing:border-box}
.rv-wrap{max-width:1120px;margin:0 auto;padding:0 22px}
.rv-head{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);
  -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border-bottom:1px solid #e4eaf3}
.rv-hw{max-width:1120px;margin:0 auto;padding:0 22px;height:66px;display:flex;align-items:center;
  justify-content:space-between;gap:16px}
.rv-logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:19px;letter-spacing:-.02em}
.rv-logo em{font-style:normal;color:#c8102e}
.rv-mk{width:32px;height:32px;border-radius:9px;background:linear-gradient(160deg,#12388f,#0a1f52);
  color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px}
.rv-inv{font-size:12.5px;color:#5b6b8c;font-weight:600}
.rv-inv b{color:#0a1f52;font-weight:800}
.rv-cta{background:#c8102e;color:#fff;font-weight:800;font-size:14px;padding:10px 18px;border-radius:9px;
  text-decoration:none;box-shadow:0 8px 20px -8px rgba(200,16,46,.65);white-space:nowrap}
.rv-hero{background:#f4f7fd;border-bottom:1px solid #e9eefa;padding:52px 0 58px}
.rv-eyebrow{font-size:11.5px;font-weight:800;color:#c8102e;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px}
.rv h1{font-size:clamp(31px,5.2vw,52px);font-weight:900;letter-spacing:-.035em;line-height:1.03;margin:0 0 16px;max-width:17ch}
.rv h1 em{font-style:normal;color:#c8102e}
.rv-sub{font-size:17px;color:#5b6b8c;line-height:1.65;max-width:56ch;margin:0}
.rv-vidwrap{margin-top:34px;border-radius:18px;overflow:hidden;
  box-shadow:0 30px 60px -30px rgba(10,31,82,.55);border:1px solid #d7e0f2}
.rv-trust{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px;font-size:13.5px;font-weight:700;color:#3c4770}
.rv-trust span::before{content:'✓ ';color:#c8102e;font-weight:900}
.rv-sec{padding:56px 0}
.rv-tight{padding-top:0}
.rv h2{font-size:clamp(25px,4.2vw,36px);font-weight:900;letter-spacing:-.03em;line-height:1.1;margin:0 0 12px}
.rv-lede{font-size:16.5px;color:#5b6b8c;max-width:60ch;line-height:1.65;margin:0}
.rv-small{font-size:14.5px;margin-top:18px}
.rv-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-top:26px;align-items:stretch}
.rv-card{background:#fff;border:1px solid #e4eaf3;border-radius:15px;padding:24px;display:flex;flex-direction:column}
.rv-cn{width:28px;height:28px;border-radius:8px;background:#0a1f52;color:#fff;font-size:13px;font-weight:900;
  display:flex;align-items:center;justify-content:center;margin-bottom:13px}
.rv-card h3{font-size:17px;font-weight:800;margin:0 0 6px;letter-spacing:-.01em}
.rv-card p{font-size:14.5px;color:#5b6b8c;line-height:1.65;margin:0;flex:1}
.rv-packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:11px;margin-top:24px}
.rv-pack{border:1px solid #e4eaf3;border-radius:12px;padding:15px;background:#fff}
.rv-p{font-size:19px;font-weight:900;color:#c8102e;letter-spacing:-.02em}
.rv-nm{font-size:13px;font-weight:800;margin:2px 0 5px}
.rv-v{font-size:12px;color:#8a97b4;font-weight:600}
.rv-big{background:#0a1f52;border-radius:20px;padding:36px;color:#fff;margin-top:26px}
.rv-big h3{font-size:23px;font-weight:900;letter-spacing:-.02em;margin:0 0 8px}
.rv-big p{color:#b9c8e8;font-size:15px;line-height:1.7;max-width:62ch;margin:0}
.rv-strip{display:flex;gap:7px;margin-top:24px;flex-wrap:wrap;align-items:center}
.rv-slot{width:52px;border-radius:9px;padding:10px 0 8px;text-align:center;background:rgba(255,255,255,.09);
  border:1.5px solid rgba(255,255,255,.2)}
.rv-slot.up{background:#c8102e;border-color:#c8102e}
.rv-n2{font-size:16px;font-weight:900;line-height:1}
.rv-t2{font-size:8px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-top:5px;opacity:.72}
.rv-tail{font-size:13px;font-weight:800;color:#fff;padding-left:8px}
.rv-plink{display:inline-block;margin-top:20px;color:#fff;font-weight:800;font-size:14.5px;
  border-bottom:2px solid #c8102e;text-decoration:none;padding-bottom:2px}
.rv-final{background:#f4f7fd;border-top:1px solid #e9eefa;padding:62px 0;text-align:center}
.rv-final .rv-lede{margin:0 auto 26px}
.rv-cta-lg{display:inline-block;background:#c8102e;color:#fff;font-weight:900;font-size:17px;
  padding:16px 34px;border-radius:12px;text-decoration:none;box-shadow:0 16px 36px -12px rgba(200,16,46,.7)}
.rv-fine{margin-top:16px;font-size:13.5px;color:#5b6b8c}
.rv-fine b{color:#0a1f52}
.rv-foot{background:#0a1f52;color:rgba(255,255,255,.5);padding:30px 22px;font-size:12.5px;text-align:center}
@media(max-width:640px){
  .rv-inv{display:none}
  .rv-hw{gap:10px}
  .rv-big{padding:24px}
}

/* ── carried over from the previous build: custom video player ── */
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
.rv-video-wrap { padding: 0 16px; }
.rv-video-wrap-inner::before { inset: -8px -8px 8px 8px; }
.rv-controls { padding: 10px 12px 12px; gap: 8px; }
.rv-ctrl-btn { width: 32px; height: 32px; }
.rv-time { font-size: 11px; min-width: 78px; }
.rv-play-big { width: 68px; height: 68px; }
.rv-play-big svg { width: 26px; height: 26px; }
`;
