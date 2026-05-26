/**
 * PendingCommissionsCard
 *
 * Dashboard card showing grace-period commissions held in escrow.
 *
 * When a downline upgrades to a tier the current member isn't qualified
 * for, that commission is held for 3 days. This card surfaces:
 *   - Total $ pending
 *   - Per-event breakdown (who upgraded, how much, deadline)
 *   - Live countdown timers (ticking every second)
 *   - Primary CTA to /campaign-tiers so members can upgrade and claim
 *
 * Renders nothing when there are no pending commissions (so dashboards
 * stay clean for members not in any grace state). Refreshes silently
 * every 60s, and updates countdown locally without re-fetching.
 *
 * Brand: amber-tinted urgency callout (NOT alarm red — this is an
 * opportunity, not an error). Mirrors the email design language so
 * members get a consistent visual story across channels.
 *
 * Added 26 May 2026 per Steve's grace-period spec.
 */
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../utils/api';
import { Clock, ArrowRight, ChevronRight } from 'lucide-react';

function formatRemaining(seconds) {
  if (seconds <= 0) return 'Expired';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function commissionLabel(type) {
  if (type === 'direct_sponsor') return 'Direct (40%)';
  if (type === 'uni_level') return 'Uni-level (6.25%)';
  return type;
}

export default function PendingCommissionsCard() {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0);
  const fetchedAt = useRef(null);

  // Fetch on mount + every 60s
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await apiGet('/api/pending-commissions');
        if (mounted && r && Array.isArray(r.pending)) {
          setData(r);
          fetchedAt.current = Date.now();
        }
      } catch (e) {
        // Silent — card just stays empty if the call fails
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Tick once per second to refresh countdowns without refetching
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!data || !data.pending || data.pending.length === 0) {
    return null; // nothing pending — render nothing
  }

  // Recompute seconds_remaining locally from fetched expires_at so the
  // countdown is accurate even between 60s refetches.
  const now = Date.now();
  const rows = data.pending.map(p => {
    const expiresMs = new Date(p.expires_at).getTime();
    const seconds = Math.max(0, Math.floor((expiresMs - now) / 1000));
    return { ...p, seconds_remaining: seconds };
  }).filter(p => p.seconds_remaining > 0); // hide just-expired ones

  if (rows.length === 0) return null;

  const totalAmount = rows.reduce((acc, p) => acc + (p.amount || 0), 0);
  const soonest = Math.min(...rows.map(p => p.seconds_remaining));
  const requiredTier = Math.max(...rows.map(p => p.required_tier));

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      border: '1px solid #f59e0b',
      borderRadius: 14,
      padding: '20px 22px',
      marginBottom: 22,
      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.10)',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          <Clock size={22} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 16, fontWeight: 800, color: '#78350f',
            lineHeight: 1.2,
          }}>
            ${totalAmount.toFixed(2)} held in escrow
          </div>
          <div style={{
            fontSize: 13, color: '#92400e', marginTop: 4, lineHeight: 1.45,
          }}>
            Upgrade to <strong>Tier {requiredTier}</strong> within{' '}
            <strong>{formatRemaining(soonest)}</strong> to claim
            {rows.length > 1 ? ` ${rows.length} pending commissions` : ' this commission'}.
          </div>
        </div>
        <Link
          to="/campaign-tiers"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg, #0a1438, #1e3a8a)',
            color: '#fff', textDecoration: 'none',
            fontFamily: "'Sora', sans-serif",
            fontSize: 13, fontWeight: 700,
            boxShadow: '0 3px 10px rgba(10, 20, 56, 0.18)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          Upgrade <ArrowRight size={14} />
        </Link>
      </div>

      {/* Per-event list */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 10,
        border: '1px solid #fde68a',
        overflow: 'hidden',
      }}>
        {rows.slice(0, 5).map((row, idx) => (
          <div key={row.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            borderTop: idx === 0 ? 'none' : '1px solid #fde68a',
            fontSize: 13,
          }}>
            <div style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 700,
              color: '#0a1438', minWidth: 70,
            }}>
              ${row.amount.toFixed(2)}
            </div>
            <div style={{ flex: 1, color: '#78350f', minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{row.trigger_name}</span>
              <span style={{ color: '#92400e', opacity: 0.75 }}>
                {' '}· {commissionLabel(row.commission_type)} · Tier {row.package_tier}
              </span>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5, fontWeight: 600, color: '#b45309',
              minWidth: 100, textAlign: 'right',
            }}>
              {formatRemaining(row.seconds_remaining)}
            </div>
          </div>
        ))}
        {rows.length > 5 && (
          <div style={{
            padding: '8px 14px',
            background: 'rgba(254, 243, 199, 0.6)',
            borderTop: '1px solid #fde68a',
            fontSize: 11.5, color: '#92400e', textAlign: 'center',
            fontWeight: 600,
          }}>
            + {rows.length - 5} more pending
          </div>
        )}
      </div>
    </div>
  );
}
