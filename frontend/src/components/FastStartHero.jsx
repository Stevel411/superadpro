// FastStartHero — dashboard hero that prompts paid Partners to activate
// their Grid Tier 1 ($20 grid_1 product).
//
// State machine (driven by /api/fast-start/state):
//   - "hero"     → full hero with the red ignition button
//   - "continue" → degraded "Continue activation →" link with × dismiss
//   - "hidden"   → renders null
//
// State transitions persist server-side on users.fast_start_pressed_at
// and users.fast_start_hidden_at so the experience is consistent across
// devices and sessions.
//
// Visual language:
//   - Cobalt + cyan + white background (matches brand)
//   - Red ONLY on the ignition button (deliberate accent)
//   - Pulsing rings on the button to draw the eye
//   - Three live stats below the headline (position #, 24h, 1h)
//
// Added 17 May 2026 for Grid Tier 1 activation funnel.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';

const css = `
@keyframes fsh-ignition-pulse {
  0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.55; }
  100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0;    }
}
@keyframes fsh-button-breathe {
  0%, 100% { box-shadow: 0 12px 28px -8px rgba(220,38,38,.55), 0 0 0 0 rgba(220,38,38,.4); }
  50%      { box-shadow: 0 14px 34px -6px rgba(220,38,38,.65), 0 0 0 14px rgba(220,38,38,0); }
}
@keyframes fsh-stat-tick {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fsh-wrap {
  position: relative;
  border-radius: 22px;
  padding: 44px 36px 40px;
  margin-bottom: 22px;
  background:
    radial-gradient(circle at 80% -20%, rgba(34,211,238,.18), transparent 55%),
    radial-gradient(circle at -10% 120%, rgba(14,165,233,.22), transparent 55%),
    linear-gradient(135deg, #0a1438 0%, #1e3a8a 65%, #1e40af 100%);
  color: #fff;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.06);
}
.fsh-wrap::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    radial-gradient(circle, rgba(255,255,255,.04) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
  opacity: .5;
}

.fsh-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 36px;
  align-items: center;
  position: relative;
  z-index: 1;
}
@media (max-width: 720px) {
  .fsh-grid { grid-template-columns: 1fr; gap: 28px; }
  .fsh-wrap { padding: 32px 24px 28px; }
}

.fsh-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  color: #22d3ee;
  margin-bottom: 10px;
}
.fsh-headline {
  font-family: 'Sora', sans-serif;
  font-size: 34px;
  font-weight: 800;
  line-height: 1.05;
  margin: 0 0 12px;
  color: #fff;
  letter-spacing: -0.5px;
}
@media (max-width: 720px) {
  .fsh-headline { font-size: 26px; }
}
.fsh-welcome {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255,255,255,.78);
  margin-bottom: 4px;
}
.fsh-welcome strong {
  color: #22d3ee;
  font-weight: 700;
}
.fsh-tagline {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: rgba(255,255,255,.65);
  margin: 0 0 22px;
  max-width: 480px;
}

.fsh-stats {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
}
.fsh-stat {
  animation: fsh-stat-tick .5s ease-out backwards;
}
.fsh-stat:nth-child(1) { animation-delay: .15s; }
.fsh-stat:nth-child(2) { animation-delay: .25s; }
.fsh-stat:nth-child(3) { animation-delay: .35s; }
.fsh-stat-value {
  font-family: 'Sora', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}
.fsh-stat-value.fsh-stat-position {
  color: #22d3ee;
}
.fsh-stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: rgba(255,255,255,.55);
  margin-top: 6px;
}

.fsh-button-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}
.fsh-ignition {
  position: relative;
  width: 160px; height: 160px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: radial-gradient(circle at 35% 30%, #fca5a5 0%, #ef4444 25%, #dc2626 55%, #991b1b 100%);
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: .5px;
  text-transform: uppercase;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px;
  animation: fsh-button-breathe 2.2s ease-in-out infinite;
  transition: transform .15s ease;
  z-index: 2;
}
.fsh-ignition:hover { transform: scale(1.04); }
.fsh-ignition:active { transform: scale(.96); }
.fsh-ignition .arrow { font-size: 24px; line-height: 1; }
.fsh-ignition .sublabel {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(255,255,255,.85);
  text-transform: uppercase;
}

/* Pulsing rings — three offset waves emanating from the button. */
.fsh-ring {
  position: absolute;
  left: 50%; top: 50%;
  width: 160px; height: 160px;
  border-radius: 50%;
  border: 1px solid #dc2626;
  pointer-events: none;
  animation: fsh-ignition-pulse 2.4s ease-out infinite;
  z-index: 1;
}
.fsh-ring:nth-child(2) { animation-delay: .8s; }
.fsh-ring:nth-child(3) { animation-delay: 1.6s; }
.fsh-button-cell { position: relative; }

/* Degraded "Continue activation" state — much smaller than the hero,
   one line with a × dismiss button. */
.fsh-continue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-radius: 14px;
  margin-bottom: 18px;
  background: linear-gradient(135deg, rgba(10,20,56,.92) 0%, rgba(30,58,138,.92) 100%);
  border: 1px solid rgba(34,211,238,.25);
  color: #fff;
}
.fsh-continue-text {
  display: flex; align-items: center; gap: 12px;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
  color: rgba(255,255,255,.85);
}
.fsh-continue-text .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #dc2626;
  box-shadow: 0 0 0 3px rgba(220,38,38,.25);
}
.fsh-continue-link {
  color: #22d3ee;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
}
.fsh-continue-link:hover { color: #67e8f9; }
.fsh-dismiss {
  background: transparent;
  border: none;
  color: rgba(255,255,255,.4);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all .15s ease;
}
.fsh-dismiss:hover {
  color: rgba(255,255,255,.85);
  background: rgba(255,255,255,.08);
}
`;

export default function FastStartHero() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  // Load state on mount. We don't poll — the dashboard re-mounts on
  // navigation back, which is enough to refresh.
  useEffect(function() {
    let alive = true;
    apiGet('/api/fast-start/state')
      .then(function(r) { if (alive) setData(r); })
      .catch(function() { if (alive) setData({ state: 'hidden' }); });
    return function() { alive = false; };
  }, []);

  // Pre-load: render nothing while waiting. The hero is high-up so
  // a brief blank space is preferable to a flash of unstyled content.
  if (!data) return null;
  if (data.state === 'hidden') return null;

  function handleIgnition() {
    if (busy) return;
    setBusy(true);
    // Record the press (server-side). Always navigate to the explainer
    // page — even on network failure, since the explainer is the next
    // step the user expects. The pressed_at column is best-effort
    // tracking, not a hard dependency.
    apiPost('/api/fast-start/press', {})
      .catch(function() {})
      .finally(function() {
        navigate('/grid/activate');
      });
  }

  function handleDismiss() {
    if (busy) return;
    setBusy(true);
    // Optimistic hide — set state immediately so the card disappears.
    // The server call persists across devices. On failure the local
    // hide still survives this session.
    setData({ state: 'hidden' });
    apiPost('/api/fast-start/hide', {}).catch(function() {});
  }

  // ── State: continue ──────────────────────────────────────────────
  if (data.state === 'continue') {
    return (
      <>
        <style>{css}</style>
        <div className="fsh-continue">
          <div className="fsh-continue-text">
            <span className="dot" />
            <span>Your Grid activation is waiting — pick up where you left off.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <a className="fsh-continue-link"
               href="/grid/activate"
               onClick={function(e) { e.preventDefault(); navigate('/grid/activate'); }}>
              Continue activation →
            </a>
            <button className="fsh-dismiss"
                    aria-label="Dismiss"
                    title="Dismiss"
                    onClick={handleDismiss}>×</button>
          </div>
        </div>
      </>
    );
  }

  // ── State: hero ──────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="fsh-wrap">
        <div className="fsh-grid">
          <div className="fsh-content">
            <div className="fsh-eyebrow">★ Grid activation</div>
            <h2 className="fsh-headline">Your Grid is waiting.<br/>Activate it for $20.</h2>
            <div className="fsh-welcome">
              Welcome <strong>@{data.username}</strong>
            </div>
            <p className="fsh-tagline">
              One $20 activation unlocks your Video Campaign system and your affiliate income stream.
            </p>
            <div className="fsh-stats">
              {data.next_position && (
                <div className="fsh-stat">
                  <div className="fsh-stat-value fsh-stat-position">{data.next_position}</div>
                  <div className="fsh-stat-label">Your position</div>
                </div>
              )}
              <div className="fsh-stat">
                <div className="fsh-stat-value">{data.activated_last_24h ?? 0}</div>
                <div className="fsh-stat-label">Activated today</div>
              </div>
              <div className="fsh-stat">
                <div className="fsh-stat-value">{data.activated_last_hour ?? 0}</div>
                <div className="fsh-stat-label">Last hour</div>
              </div>
            </div>
          </div>
          <div className="fsh-button-cell">
            <div className="fsh-ring" />
            <div className="fsh-ring" />
            <div className="fsh-ring" />
            <button className="fsh-ignition"
                    onClick={handleIgnition}
                    disabled={busy}
                    aria-label="Activate Grid">
              <span className="arrow">⚡</span>
              <span>Activate</span>
              <span>Grid</span>
              <span className="sublabel">$20 once</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
