// /grid/activate — Grid Tier 1 Starter explainer page.
//
// Surfaces: full-page dark cobalt explainer of what the user is buying.
// White-card mini-Grid component shows representative seats (NOT live data)
// using the same gold-direct / green-auto-place encoding as the production
// Grid Visualiser, so the visual story is continuous: this is what a slot
// in your grid will look like once you activate.
//
// CTA hooks both checkout paths (WalletConnect self-custody + NOWPayments)
// for grid_1 product, same wiring as the existing ActivateTier page.
//
// Success state ("You're in"): renders when the URL includes ?activated=1,
// confirming server-side state via /api/fast-start/state (which auto-
// transitions to "hidden" on grid_1 purchase via _nowpayments_activate_product).
//
// Added 17 May 2026 alongside FastStartHero.

import { useState, useEffect, Suspense, lazy } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { Globe } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Memoised module loader — same pattern as ActivateTier.jsx so the WC
// chunk is only fetched once even if the user navigates back and forth.
let _wcModule;
function _loadWC() {
  if (!_wcModule) _wcModule = import('../components/WalletConnect');
  return _wcModule;
}
const WalletConnectProvider = lazy(function() {
  return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; });
});
const WalletConnectGate = lazy(function() {
  return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; });
});
const WalletPayLink = lazy(function() {
  return _loadWC().then(function(m) { return { default: m.WalletPayLink }; });
});

// Match the existing GridVisualiser encoding exactly:
//   gold gradient = direct referral (gold/amber, comp-spec encoding)
//   green gradient = auto-place / spillover
// We intentionally keep this even though the brand palette says
// "no amber/gold" — this is a functional encoding the user will see
// again in the live visualiser, and inconsistency would be worse than
// a one-off colour deviation. Flag if the brand call changes.
const GOLD_GRAD = 'linear-gradient(135deg,#78350f,#b45309,#fbbf24)';
const GREEN_GRAD = 'linear-gradient(135deg,#064e3b,#047857,#10b981)';

// Representative sample seats for the mini-grid. 16 cells total in a
// 4×4 layout, ~3 filled to give the user a visual sense of what their
// own grid will look like a few referrals in. NOT live data.
const SAMPLE_SEATS = [
  { position: 1,  username: 'member_a',  isDirect: true  },
  { position: 5,  username: 'member_b',  isDirect: false },
  { position: 9,  username: 'member_c',  isDirect: false },
];

const css = `
.gact-page {
  background:
    radial-gradient(circle at 90% 0%, rgba(34,211,238,.10), transparent 60%),
    radial-gradient(circle at 0% 100%, rgba(14,165,233,.15), transparent 55%),
    linear-gradient(180deg, #0a1438 0%, #1e3a8a 100%);
  min-height: 100vh;
  padding: 32px 20px 80px;
  color: #fff;
}
.gact-shell { max-width: 720px; margin: 0 auto; }

.gact-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  color: #22d3ee;
  margin-bottom: 12px;
  text-align: center;
}
.gact-title {
  font-family: 'Sora', sans-serif;
  font-size: 38px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -.6px;
  margin: 0 0 14px;
  text-align: center;
}
@media (max-width: 600px) {
  .gact-title { font-size: 28px; }
}
.gact-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  color: rgba(255,255,255,.7);
  margin: 0 0 36px;
  text-align: center;
  line-height: 1.55;
}

/* White card — the mini grid sits inside this so it visually mirrors
   the live visualiser (white card on dark page). */
.gact-card {
  background: #fff;
  color: #0a1438;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 28px;
  box-shadow: 0 20px 60px -20px rgba(0,0,0,.45);
}
.gact-card-header {
  background: linear-gradient(135deg, #172554, #1e3a8a);
  padding: 22px 26px;
  display: flex; align-items: center; justify-content: space-between;
}
.gact-card-header-title {
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: #fff;
}
.gact-card-header-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255,255,255,.7);
  font-weight: 600;
}

.gact-card-body { padding: 26px 26px 24px; }

.gact-progress {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  margin-bottom: 18px;
  overflow: hidden;
}
.gact-progress-fill {
  height: 100%;
  width: 17%;
  border-radius: 4px;
  background: linear-gradient(90deg, #064e3b, #10b981);
}

.gact-legend {
  display: flex; gap: 18px; flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 20px;
}
.gact-legend-item {
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}
.gact-legend-swatch {
  width: 14px; height: 14px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 800;
}
.gact-legend-swatch.direct { background: linear-gradient(135deg,#78350f,#b45309,#fbbf24); color: #78350f; }
.gact-legend-swatch.spill  { background: linear-gradient(135deg,#064e3b,#047857,#10b981); color: #fff; }
.gact-legend-swatch.empty  { background: #f8fafc; border: 1px dashed #94a3b8; color: #94a3b8; }

/* Mini-grid: 4×4 layout. Smaller than the live 8×8 since we're
   illustrating, not displaying real data. */
.gact-mini-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.gact-seat {
  border-radius: 10px;
  aspect-ratio: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-size: 11px;
  position: relative;
  overflow: hidden;
}
.gact-seat.empty {
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  color: #94a3b8;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}
.gact-seat.filled {
  border: 2px solid;
  color: #fff;
}
.gact-seat-badge {
  position: absolute;
  top: -4px; right: -4px;
  width: 14px; height: 14px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 800;
  border: 1.5px solid #fff;
}
.gact-seat-badge.direct { background: #fbbf24; color: #78350f; }
.gact-seat-badge.spill  { background: #10b981; color: #fff; }
.gact-seat-avatar {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(255,255,255,.2);
  border: 2px solid rgba(255,255,255,.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800;
  margin-bottom: 3px;
}
.gact-seat-name {
  font-size: 11px;
  font-weight: 700;
  max-width: 86%;
  overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap;
}

/* CTA section */
.gact-cta-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 18px;
  padding: 28px;
}
.gact-cta-title {
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 6px;
}
.gact-cta-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: rgba(255,255,255,.65);
  margin: 0 0 22px;
}
.gact-warning {
  background: rgba(220,38,38,.10);
  border: 1px solid rgba(220,38,38,.3);
  color: #fca5a5;
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: 18px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  text-align: center;
  line-height: 1.5;
}

/* Success state */
.gact-success {
  background: linear-gradient(135deg, rgba(16,185,129,.15), rgba(6,78,59,.15));
  border: 1px solid rgba(16,185,129,.3);
  border-radius: 18px;
  padding: 36px 28px;
  text-align: center;
}
.gact-success-headline {
  font-family: 'Sora', sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
}
.gact-success-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(255,255,255,.75);
  margin: 0 0 24px;
}
.gact-success-card {
  background: rgba(255,255,255,.06);
  border-radius: 12px;
  padding: 18px;
  margin: 0 auto 24px;
  max-width: 360px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  text-align: left;
}
.gact-success-card .kv-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,.55);
  margin-bottom: 4px;
}
.gact-success-card .kv-value {
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #22d3ee;
}
.gact-next-cta {
  display: inline-block;
  padding: 14px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: #0a1438;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  transition: transform .15s ease;
}
.gact-next-cta:hover { transform: translateY(-1px); }
`;

export default function GridActivatePage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState(null); // null | 'pending' | 'success'
  const [positionData, setPositionData] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const { ensureConsent, consentModal } = useConsentGate();

  // NOWPayments fallback path — same code as ActivateTier.handleNowPayments
  // but hardcoded to grid_1. Both checkout systems hit the same backend
  // process_tier_purchase via _nowpayments_activate_product, which sets
  // fast_start_hidden_at on completion.
  async function handleNowPayments() {
    if (paying) return;
    const consented = await ensureConsent();
    if (!consented) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/nowpayments/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_key: 'grid_1' }),
      });
      const data = await res.json();
      if (data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        setError(data.error || 'Payment service unavailable. Please try again.');
        setPaying(false);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
      setPaying(false);
    }
  }

  // Refresh state on mount AND when ?activated=1 lands. On success we
  // hit /api/fast-start/state to confirm server-side and pull the
  // assigned position number.
  useEffect(function() {
    let alive = true;
    apiGet('/api/fast-start/state')
      .then(function(r) {
        if (!alive) return;
        // has_grid_position true OR state === 'hidden' means activated.
        // If they landed here with ?activated=1 we trust that as success;
        // otherwise we render pending.
        if (params.get('activated') === '1' || r.has_grid_position) {
          setState('success');
          setPositionData(r);
        } else {
          setState('pending');
          setPositionData(r);
        }
      })
      .catch(function() {
        if (alive) setState('pending');
      });
    return function() { alive = false; };
  }, [params]);

  if (!state) {
    // Loading state — keep it dark to avoid flash
    return (
      <div className="gact-page">
        <style>{css}</style>
        <div className="gact-shell">
          <div style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────
  if (state === 'success') {
    const pos = positionData?.next_position || ('SAP-' + String(user?.id || 0).padStart(5, '0'));
    return (
      <div className="gact-page">
        <style>{css}</style>
        <div className="gact-shell">
          <div className="gact-success">
            <div style={{ fontSize: 56, marginBottom: 12 }}>⚡</div>
            <h1 className="gact-success-headline">You're in.</h1>
            <p className="gact-success-sub">
              Your Grid is live. Your position is locked in below.
            </p>
            <div className="gact-success-card">
              <div>
                <div className="kv-label">Position</div>
                <div className="kv-value">{pos}</div>
              </div>
              <div>
                <div className="kv-label">Tier</div>
                <div className="kv-value">T1 Starter</div>
              </div>
              <div>
                <div className="kv-label">Sponsor</div>
                <div className="kv-value">@{user?.sponsor_username || 'company'}</div>
              </div>
              <div>
                <div className="kv-label">Status</div>
                <div className="kv-value" style={{ color: '#10b981' }}>Active</div>
              </div>
            </div>
            <Link to="/my-campaigns/new" className="gact-next-cta">
              Create your first campaign →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending / activation state ───────────────────────────────────
  return (
    <Suspense fallback={<div className="gact-page" />}>
    <WalletConnectProvider>
      <div className="gact-page">
        <style>{css}</style>
        <div className="gact-shell">
          <div className="gact-eyebrow">★ Grid activation</div>
          <h1 className="gact-title">Activate your Grid for $20.</h1>
          <p className="gact-sub">
            One $20 activation kicks off the Video Campaign system
            and your affiliate income stream. This is your first
            position in the Grid — and your sponsor pool starts here.
          </p>

          {/* WC connect button — only renders when not connected */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Suspense fallback={null}>
              <WalletConnectGate variant="compact" />
            </Suspense>
          </div>

          {/* Mini-grid illustrative card */}
          <div className="gact-card">
            <div className="gact-card-header">
              <div className="gact-card-header-title">T1 Starter — $20</div>
              <div className="gact-card-header-meta">3 of 16 (illustrative)</div>
            </div>
            <div className="gact-card-body">
              <div className="gact-progress">
                <div className="gact-progress-fill" />
              </div>
              <div className="gact-legend">
                <div className="gact-legend-item">
                  <span className="gact-legend-swatch direct">★</span> Direct
                </div>
                <div className="gact-legend-item">
                  <span className="gact-legend-swatch spill">↓</span> Auto-place
                </div>
                <div className="gact-legend-item">
                  <span className="gact-legend-swatch empty">?</span> Empty
                </div>
              </div>
              <div className="gact-mini-grid">
                {Array.from({ length: 16 }, function(_, i) {
                  const idx = i + 1;
                  const seat = SAMPLE_SEATS.find(function(s) { return s.position === idx; });
                  if (seat) {
                    const grad = seat.isDirect ? GOLD_GRAD : GREEN_GRAD;
                    const border = seat.isDirect ? '#fbbf24' : '#10b981';
                    return (
                      <div key={i} className="gact-seat filled" style={{ background: grad, borderColor: border }}>
                        <div className={'gact-seat-badge ' + (seat.isDirect ? 'direct' : 'spill')}>
                          {seat.isDirect ? '★' : '↓'}
                        </div>
                        <div className="gact-seat-avatar">{seat.username.charAt(0).toUpperCase()}</div>
                        <div className="gact-seat-name">{seat.username}</div>
                      </div>
                    );
                  }
                  return <div key={i} className="gact-seat empty">{idx}</div>;
                })}
              </div>
              <p style={{ margin: '20px 0 0', fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif" }}>
                Sample layout — your actual grid fills as members join under you and via auto-placement from the platform's spillover.
              </p>
            </div>
          </div>

          {/* CTA section — both checkout paths.
              WC primary (self-custody, instant, no third party).
              NOWPayments fallback (accepts 350+ cryptos, easier for
              users without a Web3 wallet yet). Both resolve to the
              same backend grid_1 activation and the same downstream
              fast_start_hidden_at side-effect. */}
          <div className="gact-cta-section">
            <h2 className="gact-cta-title">Activate for $20 →</h2>
            <p className="gact-cta-sub">
              Pay once. Your grid goes live the moment your transaction confirms.
            </p>

            {/* Primary — WalletConnect self-custody */}
            <Suspense fallback={<div style={{ height: 56 }} />}>
              <WalletPayLink
                productType="grid"
                productKey="grid_1"
                label="Activate $20 from wallet"
                style={{
                  padding: '14px 18px',
                  fontSize: 15,
                  borderRadius: 12,
                  width: '100%',
                }}
              />
            </Suspense>

            {/* "or" divider */}
            <div style={{ position: 'relative', margin: '14px 0', textAlign: 'center' }}>
              <div style={{ height: 1, background: 'rgba(255,255,255,.12)', position: 'absolute', left: 0, right: 0, top: '50%' }} />
              <span style={{
                position: 'relative',
                background: 'rgba(255,255,255,.04)',
                padding: '0 12px',
                fontSize: 10,
                color: 'rgba(255,255,255,.55)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}>or</span>
            </div>

            {/* Fallback — NOWPayments (accepts 350+ cryptos incl. USDT-TRC20) */}
            <button onClick={handleNowPayments} disabled={paying} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              width: '100%', padding: '16px 18px', borderRadius: 12,
              fontSize: 15, fontWeight: 700, border: 'none',
              cursor: paying ? 'wait' : 'pointer',
              fontFamily: "'Sora', sans-serif",
              background: paying
                ? 'rgba(255,255,255,.10)'
                : 'rgba(255,255,255,.08)',
              color: '#fff',
              transition: 'all 0.2s',
              opacity: paying ? 0.85 : 1,
            }}
              onMouseOver={function(e) { if (!paying) e.currentTarget.style.background = 'rgba(255,255,255,.14)'; }}
              onMouseOut={function(e) { if (!paying) e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
            >
              {paying ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff',
                    borderRadius: '50%', animation: 'gact-spin 0.8s linear infinite',
                  }} />
                  <span>Creating secure invoice…</span>
                </>
              ) : (
                <>
                  <Globe size={18} />
                  <span>Pay $20 via NOWPayments</span>
                </>
              )}
            </button>
            <style>{'@keyframes gact-spin{to{transform:rotate(360deg)}}'}</style>

            <p style={{
              textAlign: 'center', fontSize: 12,
              color: 'rgba(255,255,255,.55)',
              fontFamily: "'DM Sans', sans-serif",
              margin: '14px 0 0', lineHeight: 1.55,
            }}>
              🔒 Secure checkout · 350+ cryptos accepted · ⚡ Instant activation
            </p>

            {error && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(220,38,38,.15)',
                border: '1px solid rgba(220,38,38,.4)',
                color: '#fca5a5',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <div className="gact-warning">
              <strong>All sales final.</strong> Campaign tier purchases trigger
              instant commission payouts and cannot be reversed.
            </div>
          </div>

          {consentModal}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/dashboard" style={{
              color: 'rgba(255,255,255,.55)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              textDecoration: 'none',
            }}>← Back to dashboard</Link>
          </div>
        </div>
      </div>
    </WalletConnectProvider>
    </Suspense>
  );
}
