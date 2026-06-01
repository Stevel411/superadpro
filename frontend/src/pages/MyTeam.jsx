// ═══════════════════════════════════════════════════════════════
// MyTeam — member-facing team / downline page
// ═══════════════════════════════════════════════════════════════
//
// Route: /my-team
//
// Redesigned 1 Jun 2026 (Steve): team-only + tabbed.
//   • De-duped — the old "Your earnings / earnings by stream / recent
//     commissions" blocks were removed. That data lives on Wallet and
//     Performance; My Team now owns the ROSTER only (referral link,
//     team KPIs, direct referrals, network tree, activation leads).
//   • Layout — slim referral banner, one 4-stat KPI strip above the
//     fold, then a single tabbed card so the two heavy lists (directs
//     table + network tree) no longer stack. Cut the page from seven
//     stacked blocks to ~1.5 screens.
//   • Activation leads recoloured from amber → cobalt/cyan to stay in
//     the brand palette.
//
// Data source: /api/network (returns balance + activated_at per
// referral). Deep tree: /api/my-network-tree (lazy, on tab open).
//
// Privacy: members see usernames + status + their referral's balance +
// team count. No email / wallet / KYC — those are admin-only, enforced
// by /api/network.

import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Users, TrendingUp, Zap, Copy, Check, AlertCircle, Network, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function MyTeam() {
  const { user: authUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Which tab is showing. Direct referrals is the default view.
  const [activeTab, setActiveTab] = useState('directs');

  // Deep-tree state — populated lazily when the Network tree tab opens.
  const [tree, setTree] = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    apiGet('/api/network')
      .then(r => { setData(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadTree = () => {
    if (tree || treeLoading) return;
    setTreeLoading(true);
    apiGet('/api/my-network-tree')
      .then(r => { setTree(r); setTreeLoading(false); })
      .catch(() => setTreeLoading(false));
  };

  const openTab = (id) => {
    setActiveTab(id);
    if (id === 'tree') loadTree();
  };

  if (loading) return <AppLayout title="My Team"><Spin /></AppLayout>;

  const d = data || {};
  const myUsername = d.username || (authUser && authUser.username) || 'member';
  const referrals = d.referrals || [];

  const copyLink = () => {
    const link = 'https://www.superadpro.com/ref/' + myUsername;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Warm activation leads ────────────────────────────────────
  // Inactive direct referrals who have a non-zero balance — they EARNED
  // sponsor commission (accrues even while inactive) but never activated
  // to use it. The warmest possible activation lead.
  const activationLeads = referrals.filter(
    r => !r.is_active && (r.balance || 0) > 0
  ).sort((a, b) => (b.balance || 0) - (a.balance || 0));

  const tabs = [
    { id: 'directs', label: 'Direct referrals', icon: Users, count: referrals.length },
    { id: 'tree', label: 'Network tree', icon: Network, count: d.total_team || 0 },
    { id: 'leads', label: 'Activation leads', icon: AlertCircle, count: activationLeads.length, badge: true },
  ];

  const cardWrap = {
    background: '#fff', border: '1px solid #e8ecf2', borderTop: 'none',
    borderRadius: '0 0 14px 14px', overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(23,37,84,.06)',
  };

  return (
    <AppLayout
      title="My Team"
      subtitle="Your direct referrals, their status, and your wider network"
    >
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:767px){ .mt-kpi{grid-template-columns:repeat(2,1fr)!important} }
      `}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Referral link banner ── */}
        <div style={{
          background: 'linear-gradient(135deg,#0b1e4c,#1e3a8a 60%,#2563eb)',
          borderRadius: 16, padding: '18px 24px', marginBottom: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 14, boxShadow: '0 8px 30px rgba(23,37,84,0.25)',
        }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: '#7dd3fc', marginBottom: 5 }}>
              Your referral link
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.85)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' }}>
              https://www.superadpro.com/ref/{myUsername}
            </div>
          </div>
          <button onClick={copyLink} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px',
            borderRadius: 12, border: 'none', cursor: 'pointer',
            background: copied ? '#16a34a' : '#0ea5e9', color: '#fff',
            fontSize: 14, fontWeight: 800, fontFamily: 'inherit', transition: 'all .2s',
            boxShadow: '0 4px 14px rgba(14,165,233,.35)',
          }}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
          </button>
        </div>

        {/* ── KPI strip (team metrics only) ── */}
        <div className="mt-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard icon={Users} value={d.personal_referrals || 0} label="Direct referrals" sub="People you sponsored" color="#0ea5e9" iconBg="rgba(14,165,233,.12)" />
          <StatCard icon={TrendingUp} value={d.total_team || 0} label="Total network" sub="Including their downline" color="#1e3a8a" iconBg="rgba(30,58,138,.12)" />
          <StatCard icon={Zap} value={d.active_this_month || 0} label="Active members" sub="Currently paying" color="#16a34a" iconBg="rgba(22,163,74,.12)" />
          <StatCard icon={AlertCircle} value={activationLeads.length} label="Activation leads" sub="Earned but not active" color="#0891b2" iconBg="rgba(8,145,178,.12)" />
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e8ecf2', overflowX: 'auto' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => openTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
                padding: '11px 18px', border: 'none', cursor: 'pointer', background: 'transparent',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                color: active ? '#172554' : '#64748b',
                borderBottom: active ? '2px solid #172554' : '2px solid transparent',
                marginBottom: -1,
              }}>
                <Icon size={16} />
                {tab.label}
                {tab.badge && tab.count > 0 ? (
                  <span style={{ background: 'rgba(8,145,178,.12)', color: '#0891b2', fontSize: 12, fontWeight: 800, padding: '1px 8px', borderRadius: 10 }}>{tab.count}</span>
                ) : (
                  <span style={{ color: active ? '#64748b' : '#94a3b8', fontWeight: 600 }}>({tab.count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <div style={cardWrap}>

          {activeTab === 'directs' && (
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
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
                            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg,#1e3a8a,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'Sora,sans-serif' }}>
                              {((r.first_name || r.username || '?').charAt(0)).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{r.first_name || r.username}</div>
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
                          <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 800, color: (r.balance || 0) > 0 ? '#16a34a' : '#94a3b8' }}>
                            ${(r.balance || 0).toFixed(2)}
                          </span>
                          {!r.is_active && (r.balance || 0) > 0 && (
                            <div style={{ fontSize: 10, color: '#0891b2', marginTop: 2, fontWeight: 700 }}>activation lead</div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#0ea5e9' }}>{r.personal_referrals || 0}</span>
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
          )}

          {activeTab === 'tree' && (
            <div style={{ padding: '14px 24px 20px' }}>
              {treeLoading && <Spin />}
              {!treeLoading && tree && tree.nodes && tree.nodes.length > 1 && (
                <DeepTree nodes={tree.nodes} rootId={tree.root_id} expanded={expanded} setExpanded={setExpanded} />
              )}
              {!treeLoading && tree && (!tree.nodes || tree.nodes.length <= 1) && (
                <EmptyState icon="🌱" title="Just you so far" subtitle="When your direct referrals build their own teams, they'll appear here" />
              )}
              {!treeLoading && !tree && (
                <EmptyState icon="🌐" title="Network tree" subtitle="Loading your full downline…" />
              )}
            </div>
          )}

          {activeTab === 'leads' && (
            <div style={{ padding: '18px 24px 22px' }}>
              {activationLeads.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, marginBottom: 14, maxWidth: 640 }}>
                    These members earned commission but haven't activated yet. They already have a balance to put toward their first month — a perfect time to reach out personally.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {activationLeads.map(r => (
                      <div key={r.id} style={{
                        background: '#f0fbff', borderRadius: 12, padding: '12px 16px',
                        border: '1px solid rgba(8,145,178,.18)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.first_name || r.username}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>@{r.username}</div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, color: '#0891b2' }}>
                            ${(r.balance || 0).toFixed(0)}
                          </div>
                          <div style={{ fontSize: 10, color: '#0891b2', fontWeight: 600 }}>earned</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon="✨" title="No activation leads" subtitle="Inactive referrals who've earned a balance will show here — a warm list to re-engage." />
              )}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}

// ── Deep tree renderer ─────────────────────────────────────────
// Recursive, indented list. Mounted only when the Network tree tab is
// opened — the payload can be hundreds of nodes for active sponsors.
function DeepTree({ nodes, rootId, expanded, setExpanded }) {
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
            <button onClick={() => setExpanded(s => ({ ...s, [node.id]: !isOpen }))} style={{
              width: 22, height: 22, padding: 0, border: 'none', background: 'transparent',
              cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div style={{ width: 22 }} />
          )}
          <div style={{ width: 8, height: 8, borderRadius: 4, background: node.is_active ? '#22c55e' : '#94a3b8', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: node.is_you ? 800 : 600, color: node.is_you ? '#0ea5e9' : '#0f172a' }}>
            @{node.username} {node.is_you && <span style={{ fontSize: 10, color: '#0ea5e9' }}>(you)</span>}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#7a8899', fontFamily: 'monospace' }}>
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
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 800, color: props.color, marginBottom: 4, letterSpacing: -.5 }}>
        {props.value}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{props.label}</div>
      <div style={{ fontSize: 14, color: '#475569' }}>{props.sub}</div>
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
      <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
