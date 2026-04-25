/**
 * BucketList.jsx — Shared drill-down list for Command Centre Layer 2
 *
 * One component handles all 5 bucket types via props:
 *   - Active directs   (/command-centre/directs/active)
 *   - Lapsed directs   (/command-centre/directs/lapsed)
 *   - Never-paid       (/command-centre/directs/never-paid)
 *   - Grid team        (/command-centre/grid-team)
 *   - Nexus team       (/command-centre/nexus-team)
 *
 * Pattern: Option B from the mockups (search + hidden filter icon).
 * As-you-type filter, click row to expand, no per-member earnings shown.
 *
 * Privacy: backend returns only public profile fields + signup/last-paid
 * dates. NO earnings, NO email, NO balance — see _direct_member_payload
 * in main.py.
 *
 * Layer 3 will add per-member actions (message, re-activation email).
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { TYPE } from '../styles/typography';
import { Search, Filter, ArrowLeft, Users } from 'lucide-react';

// Bucket-specific config — what URL to fetch, what label to show, what
// accent colour to use, how to format the secondary line on each row.
const BUCKET_CONFIG = {
  'directs-active': {
    apiUrl: '/api/command-centre/directs?bucket=active',
    titleKey: 'commandCentre.activeDirectsLabel',
    sublabelKey: 'commandCentre.activeDirectsSublabel',
    accent: 'var(--sap-green)',
    accentPale: '#bbf7d0',
    secondaryLine: function(m, t) {
      // Active member: "Joined Mar 2026 · last paid Apr 12"
      const joined = m.signed_up_at ? formatMonthYear(m.signed_up_at) : null;
      const paid = m.last_paid_at ? formatDate(m.last_paid_at) : null;
      const parts = [];
      if (joined) parts.push(t('commandCentre.rowJoined', { defaultValue: 'Joined' }) + ' ' + joined);
      if (paid) parts.push(t('commandCentre.rowLastPaid', { defaultValue: 'last paid' }) + ' ' + paid);
      return parts.join(' · ');
    },
  },
  'directs-lapsed': {
    apiUrl: '/api/command-centre/directs?bucket=lapsed',
    titleKey: 'commandCentre.lapsedDirectsLabel',
    sublabelKey: 'commandCentre.lapsedDirectsSublabel',
    accent: 'var(--sap-amber-dark)',
    accentPale: '#fed7aa',
    secondaryLine: function(m, t) {
      // Lapsed: "Last paid Mar 12 · 47 days ago"
      if (!m.last_paid_at) return t('commandCentre.rowJoined', { defaultValue: 'Joined' }) + ' ' + (m.signed_up_at ? formatMonthYear(m.signed_up_at) : '?');
      const days = daysBetween(m.last_paid_at, new Date().toISOString());
      return t('commandCentre.rowLastPaid', { defaultValue: 'last paid' }) + ' ' + formatDate(m.last_paid_at) + ' · ' + days + ' ' + t('commandCentre.rowDaysAgo', { defaultValue: 'days ago' });
    },
  },
  'directs-never-paid': {
    apiUrl: '/api/command-centre/directs?bucket=never_paid',
    titleKey: 'commandCentre.neverPaidDirectsLabel',
    sublabelKey: 'commandCentre.neverPaidDirectsSublabel',
    accent: 'var(--sap-text-muted)',
    accentPale: '#e2e8f0',
    secondaryLine: function(m, t) {
      // Never-paid: "Joined Mar 2026 · 12 days ago"
      if (!m.signed_up_at) return '';
      const days = daysBetween(m.signed_up_at, new Date().toISOString());
      return t('commandCentre.rowJoined', { defaultValue: 'Joined' }) + ' ' + formatMonthYear(m.signed_up_at) + ' · ' + days + ' ' + t('commandCentre.rowDaysAgo', { defaultValue: 'days ago' });
    },
  },
  'grid-team': {
    apiUrl: '/api/command-centre/grid-team',
    titleKey: 'commandCentre.gridTeamLabel',
    sublabelKey: 'commandCentre.gridTeamSublabel',
    accent: 'var(--sap-violet)',
    accentPale: '#ddd6fe',
    secondaryLine: function(m, t) {
      // Grid: just show their tier + active state
      const tier = m.membership_tier ? m.membership_tier.toUpperCase() : '';
      const status = m.is_active ? t('commandCentre.rowActive', { defaultValue: 'Active' }) : t('commandCentre.rowInactive', { defaultValue: 'Inactive' });
      return [tier, status].filter(Boolean).join(' · ');
    },
  },
  'nexus-team': {
    apiUrl: '/api/command-centre/nexus-team',
    titleKey: 'commandCentre.nexusTeamLabel',
    sublabelKey: 'commandCentre.nexusTeamSublabel',
    accent: 'var(--sap-indigo)',
    accentPale: '#c7d2fe',
    secondaryLine: function(m, t) {
      const tier = m.membership_tier ? m.membership_tier.toUpperCase() : '';
      const status = m.is_active ? t('commandCentre.rowActive', { defaultValue: 'Active' }) : t('commandCentre.rowInactive', { defaultValue: 'Inactive' });
      return [tier, status].filter(Boolean).join(' · ');
    },
  },
};

// Sort options used by the filter panel. Same set for all buckets.
const SORT_OPTIONS = [
  { id: 'recent', labelKey: 'commandCentre.sortRecent' },
  { id: 'oldest', labelKey: 'commandCentre.sortOldest' },
  { id: 'name', labelKey: 'commandCentre.sortName' },
];

// ── Helpers ─────────────────────────────────────────────────────

function formatDate(isoString) {
  // "Apr 12" — short, no year (year is implicit on the page context)
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMonthYear(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

// Country code → emoji flag. ISO 3166-1 alpha-2 codes get converted to
// their regional indicator pair which renders as a flag emoji on most
// platforms. Falls back to nothing if code is missing or not 2 chars.
function flagEmoji(country) {
  if (!country || country.length !== 2) return '';
  const A = 0x1f1e6;
  const codes = country.toUpperCase().split('').map(function(c) {
    return A + c.charCodeAt(0) - 65;
  });
  if (codes.some(function(c) { return c < A || c > A + 25; })) return '';
  return String.fromCodePoint.apply(String, codes);
}

// ── Component ──────────────────────────────────────────────────

export default function BucketList(props) {
  const { bucketKey } = props;
  const { t } = useTranslation();
  const config = BUCKET_CONFIG[bucketKey];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(function() {
    if (!config) {
      setLoading(false);
      return;
    }
    apiGet(config.apiUrl)
      .then(function(r) { setData(r); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, [bucketKey]);

  // Filter + sort applied client-side (the bucket lists are small enough
  // — capped by total team size — that this is faster than re-querying).
  const visibleMembers = useMemo(function() {
    if (!data || !data.members) return [];
    const q = search.trim().toLowerCase();
    let out = data.members;
    if (q) {
      out = out.filter(function(m) {
        return (m.username || '').toLowerCase().includes(q)
          || (m.display_name || '').toLowerCase().includes(q);
      });
    }
    // Sort. Default 'recent' = most recent signup first (already from API).
    if (sortBy === 'oldest') {
      out = out.slice().sort(function(a, b) {
        return (a.signed_up_at || '').localeCompare(b.signed_up_at || '');
      });
    } else if (sortBy === 'name') {
      out = out.slice().sort(function(a, b) {
        return (a.display_name || a.username || '').localeCompare(b.display_name || b.username || '');
      });
    }
    return out;
  }, [data, search, sortBy]);

  if (!config) {
    return (
      <AppLayout title="Command Centre">
        <div style={{ padding: 24 }}>{t('common.notFound', { defaultValue: 'Page not found' })}</div>
      </AppLayout>
    );
  }

  const titleText = t(config.titleKey);
  const totalCount = data ? data.count : 0;

  return (
    <AppLayout title={titleText}>

      {/* ── HERO — narrower than Command Centre, focused on this bucket ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid))',
        borderRadius: 14,
        padding: '18px 22px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        boxShadow: '0 8px 32px rgba(30,58,138,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <Link to="/command-centre" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 9,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', textDecoration: 'none', flexShrink: 0,
          }}>
            <ArrowLeft size={16} />
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.6,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
              marginBottom: 2,
            }}>{t('commandCentre.eyebrow')}</div>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 900,
              color: '#fff', lineHeight: 1.1, letterSpacing: '-0.3px',
              display: 'inline-flex', alignItems: 'center', gap: 10,
            }}>
              {titleText}
              <span style={{
                fontSize: 13, fontWeight: 700,
                padding: '3px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>{totalCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH + FILTER ICON ─────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--sap-bg-card)',
          border: '1px solid var(--sap-border)',
          borderRadius: 10,
          padding: '10px 14px',
        }}>
          <Search size={16} color="var(--sap-text-faint)" />
          <input
            type="text"
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            placeholder={t('commandCentre.searchPlaceholder', { defaultValue: 'Search by name' })}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--sap-text-primary)',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <button onClick={function() { setFilterOpen(!filterOpen); }}
          style={{
            width: 42, height: 42, borderRadius: 10,
            background: filterOpen ? 'var(--sap-cobalt-mid)' : 'var(--sap-bg-card)',
            border: '1px solid ' + (filterOpen ? 'var(--sap-cobalt-mid)' : 'var(--sap-border)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
          <Filter size={16} color={filterOpen ? '#fff' : 'var(--sap-text-muted)'} />
        </button>
      </div>

      {/* ── FILTER PANEL (toggled by icon) ───────────────── */}
      {filterOpen && (
        <div style={{
          background: 'var(--sap-bg-card)',
          border: '1px solid var(--sap-border)',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
            textTransform: 'uppercase', color: 'var(--sap-text-muted)',
            marginBottom: 10,
          }}>{t('commandCentre.sortBy', { defaultValue: 'Sort by' })}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map(function(opt) {
              const active = sortBy === opt.id;
              return (
                <button key={opt.id} onClick={function() { setSortBy(opt.id); }}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    padding: '6px 12px', borderRadius: 14,
                    background: active ? 'var(--sap-cobalt-mid)' : 'var(--sap-bg-hover)',
                    color: active ? '#fff' : 'var(--sap-text-muted)',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  {t(opt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIST ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--sap-bg-card)',
        border: '1px solid var(--sap-border)',
        borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* 4px accent bar matching the bucket colour */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, ' + config.accent + ', ' + config.accentPale + ')',
        }} />
        <div style={{ paddingTop: 4 }}>
          {loading && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', width: 28, height: 28, borderRadius: '50%',
                border: '3px solid var(--sap-border)',
                borderTopColor: config.accent,
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            </div>
          )}
          {!loading && visibleMembers.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--sap-text-muted)' }}>
              <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{...TYPE.bodyMuted}}>
                {search ? t('commandCentre.noSearchResults', { defaultValue: 'No matches' })
                       : t('commandCentre.bucketEmpty', { defaultValue: 'Nobody in this bucket yet' })}
              </div>
            </div>
          )}
          {!loading && visibleMembers.map(function(m) {
            const isExpanded = expandedId === m.id;
            const flag = flagEmoji(m.country);
            const initial = (m.display_name || m.username || '?').charAt(0).toUpperCase();
            return (
              <div key={m.id} style={{ borderBottom: '1px solid var(--sap-border-light)' }}>
                <div onClick={function() { setExpandedId(isExpanded ? null : m.id); }}
                  className="cc-bucket-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}>
                  {/* Avatar */}
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" style={{
                      width: 42, height: 42, borderRadius: '50%',
                      objectFit: 'cover', flexShrink: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: config.accent,
                      color: '#fff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                      fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800,
                    }}>{initial}</div>
                  )}
                  {/* Main column: name (with flag + tier) and secondary line */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{...TYPE.cardTitleBold, fontSize: 14}}>{m.display_name || m.username}</span>
                      {flag && <span style={{ fontSize: 13 }}>{flag}</span>}
                      {m.membership_tier && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: 1,
                          padding: '2px 7px', borderRadius: 4,
                          background: m.membership_tier === 'pro' ? '#fef3c7' : 'var(--sap-bg-hover)',
                          color: m.membership_tier === 'pro' ? '#92400e' : 'var(--sap-text-muted)',
                          textTransform: 'uppercase',
                        }}>{m.membership_tier}</span>
                      )}
                    </div>
                    <div style={{...TYPE.bodyMuted, fontSize: 12, marginTop: 2}}>
                      {config.secondaryLine(m, t)}
                    </div>
                  </div>
                  {/* Username column on the right when display_name differs */}
                  {m.display_name && m.display_name !== m.username && (
                    <div style={{
                      ...TYPE.bodyMuted, fontSize: 11, fontFamily: 'monospace',
                      flexShrink: 0,
                    }}>@{m.username}</div>
                  )}
                </div>
                {/* Expanded panel — Layer 3 will populate this with actions.
                    For Layer 2 it just shows extra info politely. */}
                {isExpanded && (
                  <div style={{
                    padding: '14px 18px 18px 74px',
                    background: 'var(--sap-bg-hover)',
                    borderTop: '1px solid var(--sap-border-light)',
                  }}>
                    <div style={{...TYPE.bodyMuted, fontSize: 12, lineHeight: 1.6}}>
                      {m.signed_up_at && (
                        <div><strong style={{ color: 'var(--sap-text-primary)' }}>{t('commandCentre.rowJoined', { defaultValue: 'Joined' })}:</strong> {formatMonthYear(m.signed_up_at)}</div>
                      )}
                      {m.last_paid_at && (
                        <div><strong style={{ color: 'var(--sap-text-primary)' }}>{t('commandCentre.rowLastPaid', { defaultValue: 'last paid' })}:</strong> {formatDate(m.last_paid_at)}</div>
                      )}
                      {m.country && (
                        <div><strong style={{ color: 'var(--sap-text-primary)' }}>{t('commandCentre.rowCountry', { defaultValue: 'Country' })}:</strong> {flag} {m.country}</div>
                      )}
                    </div>
                    {/* Layer 3 placeholder */}
                    <div style={{ marginTop: 14, ...TYPE.bodyMuted, fontSize: 11, fontStyle: 'italic' }}>
                      {t('commandCentre.actionsComingSoon', { defaultValue: 'Message and re-activation actions coming soon' })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .cc-bucket-row:hover { background: var(--sap-bg-hover); }
      `}</style>
    </AppLayout>
  );
}
