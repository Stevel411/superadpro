// ═══════════════════════════════════════════════════════════════
// MyTeam — member-facing downline & earnings page
// ═══════════════════════════════════════════════════════════════
//
// Route: /my-team
//
// Restores the archived MyNetwork.jsx.bak page (archived in an earlier
// cleanup, never replaced) with two upgrades reflecting the 20 May
// 2026 commission-integrity investigation:
//
//   1. Each direct referral row now shows their BALANCE alongside
//      their team count. Free members who've accrued sponsor commission
//      under Option B (April 2026) — they earned but never activated —
//      become visible as "warm activation leads". The sponsor can see
//      "Lee has $13 in earned commission, never activated" and reach
//      out personally to encourage activation.
//
//   2. An "Activation leads" callout pulls those inactive-with-balance
//      referrals to the top of the page so the sponsor doesn't have to
//      scroll the full team table to find them.
//
//   3. Direct referrals are the default view. Deeper-tree drill-down
//      uses /api/my-network-tree (recursive, capped 500) when the user
//      asks to see more — added below as a toggle so the page stays
//      light by default.
//
// Data source: /api/network (already extended 20 May 2026 to return
// balance + activated_at per referral).
//
// Privacy: members see usernames + status + their referral's balance +
// total_earned. They do NOT see email, wallet, or KYC state — those
// are admin-only. The /api/network endpoint enforces this.

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Users, TrendingUp, Zap, Copy, Check, ExternalLink, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { formatMoney } from '../utils/money';
import { useAuth } from '../hooks/useAuth';

export default function MyTeam() {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Deep-tree state — populated lazily when user toggles "Show full tree"
  const [tree, setTree] = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [showTree, setShowTree] = useState(false);

  // Track which direct-referral rows are expanded to show their downline
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    apiGet('/api/network')
      .then(r => { setData(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Lazy-load the full tree when user clicks "Show full tree"
  const loadTree = () => {
    if (tree || treeLoading) return;
    setTreeLoading(true);
    apiGet('/api/my-network-tree')
      .then(r => { setTree(r); setTreeLoading(false); })
      .catch(() => setTreeLoading(false));
  };

  if (loading) return <AppLayout title="My Team"><Spin /></AppLayout>;

  const d = data || {};
  const myUsername = d.username || (authUser && authUser.username) || 'member';
  const referrals = d.referrals || [];
  const commissions = d.commissions || [];

  const copyLink = () => {
    const link = 'https://www.superadpro.com/ref/' + myUsername;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const membershipEarned = d.membership_earned || 0;
  const gridEarned = d.grid_earnings || 0;
  const courseEarned = d.course_earnings || 0;
  const nexusEarned = d.nexus_earnings || 0;

  const cobaltGradient = 'linear-gradient(90deg,#172554,#1e3a8a)';
  const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });

  // ── Warm activation leads ────────────────────────────────────
  // Inactive direct referrals who have a non-zero balance.
  // These are members who EARNED sponsor commission (under Option B
  // they accrue even while inactive) but haven't yet activated to use
  // those earnings. They're the warmest possible activation lead.
  const activationLeads = referrals.filter(
    r => !r.is_active && (r.balance || 0) > 0
  ).sort((a, b) => (b.balance || 0) - (a.balance || 0));

  return (
    <AppLayout
      title="My Team"
      subtitle="Your direct referrals, their status, and your downline earnings"
    >
      {/* ── Referral Link Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg,#0b1e4c,#1e3a8a 60%,#2563eb)',
        borderRadius: 16, padding: '22px 28px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
        boxShadow: '0 8px 30px rgba(23,37,84,0.25)',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, letterSpacing: 1.6,
            textTransform: 'uppercase', color: '#7dd3fc', marginBottom: 6,
          }}>
            Your referral link
          </div>
          <div style={{
            fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,.85)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            wordBreak: 'break-all',
          }}>
            https://www.superadpro.com/ref/{myUsername}
          </div>
        </div>
        <button
          onClick={copyLink}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: copied ? '#16a34a' : '#0ea5e9', color: '#fff',
            fontSize: 14, fontWeight: 800, fontFamily: 'inherit', transition: 'all .2s',
            boxShadow: '0 4px 14px rgba(14,165,233,.35)',
          }}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
        </button>
      </div>

      {/* ── Warm activation leads callout (only if any) ── */}
      {activationLeads.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
          border: '1px solid #fbbf24',
          borderRadius: 14, padding: '18px 24px', marginBottom: 24,
          boxShadow: '0 4px 16px rgba(251,191,36,.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertCircle size={20} color="#b45309" />
            <div style={{
              fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 800, color: '#78350f',
            }}>
              {activationLeads.length} warm activation {activationLeads.length === 1 ? 'lead' : 'leads'}
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5, marginBottom: 12 }}>
            These members have earned commission but haven't activated yet. They already have a balance to use toward their first month — a perfect time to reach out.
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10,
          }}>
            {activationLeads.slice(0, 6).map(r => (
              <div key={r.id} style={{
                background: '#fff', borderRadius: 10, padding: '10px 14px',
                border: '1px solid rgba(180,131,9,.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{r.username}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    earned ${(r.balance || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800,
                  color: '#b45309', whiteSpace: 'nowrap',
                }}>
                  ${(r.balance || 0).toFixed(0)}
                </div>
              </div>
            ))}
          </div>
          {activationLeads.length > 6 && (
            <div style={{ fontSize: 12, color: '#92400e', marginTop: 10, fontStyle: 'italic' }}>
              + {activationLeads.length - 6} more — see full team below
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/*  YOUR EARNINGS                                    */}
      {/* ═══════════════════════════════════════════════ */}

      <SectionHeading
        title="Your earnings"
        subtitle="Lifetime totals across all four streams"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 20 }}>
        <BigStatCard
          label="Lifetime earned"
          value={'$' + (d.total_earned || 0).toFixed(2)}
          sub="All commissions paid to your wallet"
          gradient="linear-gradient(135deg,#0b1e4c,#2563eb)"
        />
        <BigStatCard
          label="This month"
          value={'$' + (d.this_month_total || 0).toFixed(2)}
          sub={'Earnings in ' + monthName}
          gradient="linear-gradient(135deg,#1e3a8a,#0ea5e9)"
        />
      </div>

      {/* ── Stream breakdown card ── */}
      <div style={{
        background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14,
        overflow: 'hidden', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(23,37,84,.06)',
      }}>
        <div style={{ background: cobaltGradient, padding: '16px 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: .3 }}>
            Earnings by stream
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>
            Where your commissions come from
          </div>
        </div>
        <div>
          <StreamRow icon="🔗" name="Membership" desc="When your referrals activate or renew" amount={membershipEarned} colour="#16a34a" />
          <StreamRow icon="⚡" name="Campaign Grid" desc="When you or downline buy campaign tiers" amount={gridEarned} colour="#0ea5e9" />
          <StreamRow icon="🎓" name="Course Academy" desc="Course sales + pass-up cascade" amount={courseEarned} colour="#8b5cf6" />
          <StreamRow icon="💎" name="Creator Credits" desc="Flat 20% when your referrals buy credit packs" amount={nexusEarned} colour="#0ea5e9" last />
        </div>
      </div>

      {/* ── Recent Commissions ── */}
      <div style={{
        background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14,
        overflow: 'hidden', marginBottom: 36,
        boxShadow: '0 4px 20px rgba(23,37,84,.06)',
      }}>
        <div style={{
          background: cobaltGradient, padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4, background: '#0ea5e9',
              boxShadow: '0 0 8px rgba(14,165,233,.5)',
            }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: .3 }}>
              Recent commissions
            </div>
          </div>
          <a href="/wallet" style={{
            fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            See all <ExternalLink size={12} />
          </a>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {commissions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Source', 'Details', 'Amount', 'Date'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.slice(0, 15).map((c, i) => {
                  const info = streamFromType(c.commission_type || '');
                  return (
                    <tr key={i}>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 13, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
                          color: info.colour, background: info.colour + '12',
                          border: '1px solid ' + info.colour + '25', whiteSpace: 'nowrap',
                        }}>
                          <span>{info.icon}</span> {info.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 14, color: '#475569' }}>
                        {humaniseType(c.commission_type || '')}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#16a34a', fontSize: 16 }}>
                        +${formatMoney(c.amount_usdt || c.amount)}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 14, color: '#475569' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="💰" title="No commissions yet" subtitle="Share your link to start earning" />
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/*  YOUR TEAM                                        */}
      {/* ═══════════════════════════════════════════════ */}

      <SectionHeading
        title="Your team"
        subtitle="Direct referrals and your wider network"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} value={d.personal_referrals || 0} label="Direct referrals" sub="People you sponsored" color="#0ea5e9" iconBg="rgba(14,165,233,.12)" />
        <StatCard icon={TrendingUp} value={d.total_team || 0} label="Total network" sub="Including their downline" color="#6366f1" iconBg="rgba(99,102,241,.12)" />
        <StatCard icon={Zap} value={d.active_this_month || 0} label="Active members" sub="Currently paying" color="#16a34a" iconBg="rgba(22,163,74,.12)" />
      </div>

      {/* ── Direct Referrals Table ── */}
      <div style={{
        background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14,
        overflow: 'hidden', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(23,37,84,.06)',
      }}>
        <div style={{
          background: cobaltGradient, padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4, background: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,.5)',
            }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: .3 }}>
              Direct referrals
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>
            Total: {referrals.length}
          </div>
        </div>
        <div style={{ maxHeight: 440, overflowY: 'auto' }}>
          {referrals.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Member</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Their balance</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Their team</th>
                  <th style={thStyle}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 16,
                          background: 'linear-gradient(135deg,#1e3a8a,#0ea5e9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'Sora,sans-serif',
                        }}>
                          {((r.first_name || r.username || '?').charAt(0)).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            {r.first_name || r.username}
                          </div>
                          <div style={{ fontSize: 13, color: '#7a8899' }}>@{r.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
                        background: r.is_active ? 'rgba(22,163,74,.1)' : 'rgba(148,163,184,.15)',
                        color: r.is_active ? '#15803d' : '#475569',
                        border: '1px solid ' + (r.is_active ? 'rgba(22,163,74,.2)' : 'rgba(148,163,184,.25)'),
                      }}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {r.is_active && r.activated_at && (
                        <div style={{ fontSize: 11, color: '#7a8899', marginTop: 3 }}>
                          since {new Date(r.activated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 800,
                        color: (r.balance || 0) > 0 ? '#16a34a' : '#94a3b8',
                      }}>
                        ${(r.balance || 0).toFixed(2)}
                      </span>
                      {!r.is_active && (r.balance || 0) > 0 && (
                        <div style={{ fontSize: 10, color: '#b45309', marginTop: 2, fontWeight: 600 }}>
                          activation lead
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#0ea5e9' }}>
                        {r.personal_referrals || 0}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 14, color: '#475569' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="👥" title="No referrals yet" subtitle="Share your referral link to grow your team" />
          )}
        </div>
      </div>

      {/* ── Full deep tree (lazy-loaded) ── */}
      {referrals.length > 0 && (
        <div style={{
          background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14,
          overflow: 'hidden', marginBottom: 36,
          boxShadow: '0 4px 20px rgba(23,37,84,.06)',
        }}>
          <button
            onClick={() => { setShowTree(s => !s); if (!showTree) loadTree(); }}
            style={{
              width: '100%', background: cobaltGradient, padding: '16px 24px',
              border: 'none', cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'inherit',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {showTree ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: .3 }}>
                Full network tree {d.total_team ? `(${d.total_team} members)` : ''}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
              {showTree ? 'Hide' : 'Show all levels'}
            </span>
          </button>
          {showTree && (
            <div style={{ padding: '12px 24px 20px' }}>
              {treeLoading && <Spin />}
              {!treeLoading && tree && tree.nodes && (
                <DeepTree nodes={tree.nodes} rootId={tree.root_id} expanded={expanded} setExpanded={setExpanded} />
              )}
              {!treeLoading && tree && (!tree.nodes || tree.nodes.length <= 1) && (
                <EmptyState icon="🌱" title="Just you so far" subtitle="When your direct referrals build their own teams, they'll appear here" />
              )}
            </div>
          )}
        </div>
      )}

    </AppLayout>
  );
}

// ── Deep tree renderer ─────────────────────────────────────────
// Recursive, indented list. We only mount this when the user opts in
// (deep-tree toggle) — the data payload can be hundreds of nodes for
// active sponsors, and rendering all of them inline by default would
// make the page heavy.
function DeepTree({ nodes, rootId, expanded, setExpanded }) {
  // Build a parent-id → children map for O(N) tree walks.
  const childrenOf = {};
  nodes.forEach(n => {
    if (n.sponsor_id != null) {
      if (!childrenOf[n.sponsor_id]) childrenOf[n.sponsor_id] = [];
      childrenOf[n.sponsor_id].push(n);
    }
  });

  const renderNode = (node, depth) => {
    const kids = childrenOf[node.id] || [];
    const isOpen = expanded[node.id] !== false; // default open
    return (
      <div key={node.id}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 0', paddingLeft: depth * 24,
          borderBottom: depth === 0 ? '1px solid #f1f5f9' : 'none',
        }}>
          {kids.length > 0 ? (
            <button
              onClick={() => setExpanded(s => ({ ...s, [node.id]: !isOpen }))}
              style={{
                width: 22, height: 22, padding: 0, border: 'none', background: 'transparent',
                cursor: 'pointer', color: '#64748b', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div style={{ width: 22 }} />
          )}
          <div style={{
            width: 8, height: 8, borderRadius: 4,
            background: node.is_active ? '#22c55e' : '#94a3b8',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 13, fontWeight: node.is_you ? 800 : 600,
            color: node.is_you ? '#0ea5e9' : '#0f172a',
          }}>
            @{node.username} {node.is_you && <span style={{ fontSize: 10, color: '#0ea5e9' }}>(you)</span>}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{
            fontSize: 11, color: '#7a8899',
            fontFamily: 'monospace',
          }}>
            {kids.length > 0 ? `${kids.length} below` : ''}
          </span>
        </div>
        {isOpen && kids.map(k => renderNode(k, depth + 1))}
      </div>
    );
  };

  const root = nodes.find(n => n.id === rootId);
  if (!root) return <EmptyState icon="🔍" title="Tree not available" subtitle="Try refreshing the page" />;

  return <div>{renderNode(root, 0)}</div>;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function SectionHeading(props) {
  return (
    <div style={{ marginBottom: 14, marginTop: 4 }}>
      <div style={{
        fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800,
        color: '#0f172a', letterSpacing: -.2,
      }}>
        {props.title}
      </div>
      <div style={{ fontSize: 14, color: '#475569', marginTop: 2 }}>{props.subtitle}</div>
    </div>
  );
}

function StatCard(props) {
  const Icon = props.icon;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 20,
      position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(23,37,84,.04)',
    }}>
      <div style={{
        position: 'absolute', top: 14, right: 14, width: 38, height: 38,
        borderRadius: 10, background: props.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={props.color} />
      </div>
      <div style={{
        fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 800,
        color: props.color, marginBottom: 4, letterSpacing: -.5,
      }}>
        {props.value}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{props.label}</div>
      <div style={{ fontSize: 14, color: '#475569' }}>{props.sub}</div>
    </div>
  );
}

function BigStatCard(props) {
  return (
    <div style={{
      background: props.gradient, borderRadius: 14, padding: '24px 28px', color: '#fff',
      boxShadow: '0 8px 28px rgba(23,37,84,.25)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
        color: 'rgba(255,255,255,.75)', marginBottom: 8,
      }}>
        {props.label}
      </div>
      <div style={{
        fontFamily: 'Sora,sans-serif', fontSize: 38, fontWeight: 800,
        letterSpacing: -.8, marginBottom: 4,
      }}>
        {props.value}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)' }}>{props.sub}</div>
    </div>
  );
}

function StreamRow(props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '18px 24px',
      borderBottom: props.last ? 'none' : '1px solid #f1f5f9',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: props.colour + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, marginRight: 16, flexShrink: 0,
      }}>
        {props.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{props.name}</div>
        <div style={{ fontSize: 14, color: '#475569' }}>{props.desc}</div>
      </div>
      <div style={{
        fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800,
        color: props.colour, marginLeft: 16, whiteSpace: 'nowrap',
      }}>
        ${(props.amount || 0).toFixed(2)}
      </div>
    </div>
  );
}

function EmptyState(props) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: .35 }}>{props.icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{props.title}</div>
      <div style={{ fontSize: 14, color: '#475569' }}>{props.subtitle}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Type classifiers — same logic as the original archived page so
// commission stream colours/icons stay consistent across pages.
// ═══════════════════════════════════════════════════════════════

function streamFromType(type) {
  type = (type || '').toLowerCase();
  if (type.indexOf('matrix') >= 0 || type.indexOf('nexus') >= 0)
    return { icon: '💎', label: 'Creator Credits', colour: '#0ea5e9' };
  if (type.indexOf('course') >= 0 || type.indexOf('pass_up') >= 0 || type === 'direct_sale' || type === 'pass_up')
    return { icon: '🎓', label: 'Courses', colour: '#8b5cf6' };
  if (type.indexOf('membership') >= 0 || type === 'sponsor')
    return { icon: '🔗', label: 'Membership', colour: '#16a34a' };
  if (type.indexOf('direct_sponsor') >= 0 || type.indexOf('uni_level') >= 0 || type.indexOf('grid') >= 0 || type.indexOf('bonus') >= 0)
    return { icon: '⚡', label: 'Grid', colour: '#0ea5e9' };
  return { icon: '•', label: 'Other', colour: '#475569' };
}

function humaniseType(type) {
  type = (type || '').toLowerCase();
  if (type === 'direct_sponsor') return 'Direct sponsor bonus';
  if (type === 'uni_level') return 'Uni-level commission';
  if (type === 'grid_completion_bonus') return 'Grid completion bonus';
  if (type === 'platform') return 'Platform commission';
  if (type === 'matrix_level' || type === 'nexus_level') return 'Credit matrix level bonus';
  if (type === 'matrix_completion' || type === 'nexus_completion') return 'Credit matrix completion';
  if (type === 'nexus_sponsor') return 'Credit Nexus sponsor bonus';
  if (type === 'matrix_direct') return 'Credit Nexus direct (15%)';
  if (type === 'matrix_spillover') return 'Credit Nexus spillover (10%)';
  if (type === 'direct_sale') return 'Course direct sale (100%)';
  if (type === 'pass_up') return 'Course pass-up';
  if (type === 'membership' || type === 'sponsor') return 'Membership referral';
  if (type === 'membership_sponsor') return 'Membership sponsor bonus';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const thStyle = {
  fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase',
  letterSpacing: 1.2, padding: '12px 16px', borderBottom: '1px solid #e8ecf2',
  textAlign: 'left', background: '#f8fafc',
};

const tdStyle = {
  padding: '14px 16px', borderBottom: '1px solid #f5f6f8',
  fontSize: 14, color: '#0f172a', verticalAlign: 'middle',
};

function Spin() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{
        width: 40, height: 40, border: '3px solid #e5e7eb',
        borderTopColor: '#0ea5e9', borderRadius: '50%',
        animation: 'spin .8s linear infinite',
      }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
