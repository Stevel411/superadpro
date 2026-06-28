// ═══════════════════════════════════════════════════════════════
// AdminNetworkTree — full god-view of the network graph
// ═══════════════════════════════════════════════════════════════
//
// Route: /admin/network-tree (admin only — gate enforced on the
// /admin/api/network-tree endpoint, not in the React layer).
//
// Renders every user as a row in a hierarchical tree with status,
// balance, total earned, and downline size at each node. Filterable
// by username / activation status / balance threshold.
//
// Created 20 May 2026 alongside the member-facing /my-team page so
// admin can see the same picture members see, plus deeper details
// members can't access (other members' email, balance, kyc state).
//
// Data source: /admin/api/network-tree which returns the FULL flat
// list of all users (nodes) — this component builds the tree client-
// side because the API is already cheap (single query) and tree
// shapes vary by which root the admin picks.

import { useState, useEffect, useMemo } from 'react';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { ChevronDown, ChevronRight, Search, Users, Filter } from 'lucide-react';

export default function AdminNetworkTree() {
  const [nodes, setNodes] = useState([]);
  const [rootId, setRootId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive' | 'with_balance'
  const [expanded, setExpanded] = useState({});
  const [customRoot, setCustomRoot] = useState('');

  // Initial load — fetch full tree
  useEffect(() => {
    apiGet('/admin/api/network-tree')
      .then(d => {
        setNodes(d.nodes || []);
        setRootId(d.root_id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Allow admin to re-root the tree on any user (helpful for inspecting
  // a specific sponsor's downline in isolation). Passes ?root_id=N to
  // the endpoint which returns the same data with a different rootId.
  const rerootOn = (uid) => {
    if (!uid) return;
    setLoading(true);
    apiGet('/admin/api/network-tree?root_id=' + uid)
      .then(d => {
        setNodes(d.nodes || []);
        setRootId(d.root_id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // ── Index nodes for fast lookup ──
  // Both an id→node map and a parent→children map so the recursive
  // renderer below stays O(N) per render rather than O(N²).
  const indices = useMemo(() => {
    const byId = {};
    const childrenOf = {};
    nodes.forEach(n => {
      byId[n.id] = n;
      if (n.sponsor_id != null) {
        if (!childrenOf[n.sponsor_id]) childrenOf[n.sponsor_id] = [];
        childrenOf[n.sponsor_id].push(n);
      }
    });
    return { byId, childrenOf };
  }, [nodes]);

  // ── Filter & search ──
  // For matching nodes we also keep their ancestor chain visible so
  // the admin can see the context — a match buried 5 levels deep
  // wouldn't be useful without showing where in the tree it sits.
  const visibleIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const passesStatus = (n) => {
      if (filterStatus === 'active') return n.is_active;
      if (filterStatus === 'inactive') return !n.is_active;
      if (filterStatus === 'with_balance') return (n.balance || 0) > 0;
      return true;
    };
    const passesQuery = (n) => {
      if (!q) return true;
      return (n.username || '').toLowerCase().includes(q);
    };
    const matches = new Set();
    nodes.forEach(n => {
      if (passesStatus(n) && passesQuery(n)) matches.add(n.id);
    });
    // Add ancestors of every match so the tree path is visible
    const withAncestors = new Set(matches);
    matches.forEach(id => {
      let cur = indices.byId[id];
      while (cur && cur.sponsor_id != null) {
        withAncestors.add(cur.sponsor_id);
        cur = indices.byId[cur.sponsor_id];
      }
    });
    return withAncestors;
  }, [nodes, searchQuery, filterStatus, indices]);

  // ── Counts for the summary strip ──
  const counts = useMemo(() => {
    let active = 0, inactive = 0, withBalance = 0, totalBalance = 0;
    nodes.forEach(n => {
      if (n.is_active) active++; else inactive++;
      if ((n.balance || 0) > 0) {
        withBalance++;
        totalBalance += (n.balance || 0);
      }
    });
    return { total: nodes.length, active, inactive, withBalance, totalBalance };
  }, [nodes]);

  if (loading) return <AppLayout categoryChrome title="Network Tree" subtitle="Loading…"><Spin /></AppLayout>;

  const root = indices.byId[rootId];

  return (
    <AppLayout categoryChrome
      title="Network Tree"
      subtitle="Full downline graph across all members"
    >
      <AdminPageHeader title="Network Tree" subtitle="Full downline graph across all members" />
      {/* ── Summary strip ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20,
      }}>
        <StatTile label="Total members" value={counts.total} colour="#0ea5e9" />
        <StatTile label="Active" value={counts.active} colour="#16a34a" />
        <StatTile label="Inactive" value={counts.inactive} colour="#94a3b8" />
        <StatTile label="With balance" value={counts.withBalance} sub={'$' + counts.totalBalance.toFixed(0) + ' total'} colour="#b45309" />
      </div>

      {/* ── Controls strip ── */}
      <div style={{
        background: '#fff', border: '1px solid #e8ecf2', borderRadius: 12,
        padding: 16, marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Search by username */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by username…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 6,
              border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={16} color="#64748b" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 10px', borderRadius: 6,
              border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
              background: '#fff', cursor: 'pointer',
            }}>
            <option value="all">All members</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="with_balance">With balance &gt; 0</option>
          </select>
        </div>

        {/* Re-root */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            placeholder="Root by user ID…"
            value={customRoot}
            onChange={e => setCustomRoot(e.target.value)}
            style={{
              width: 130, padding: '8px 10px', borderRadius: 6,
              border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => rerootOn(customRoot)}
            style={{
              padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#0ea5e9', color: '#fff', fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit',
            }}>
            Reroot
          </button>
        </div>
      </div>

      {/* ── Tree ── */}
      <div style={{
        background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14,
        overflow: 'hidden', boxShadow: '0 4px 20px rgba(23,37,84,.06)',
      }}>
        <div style={{
          background: 'linear-gradient(90deg,#172554,#1e3a8a)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Users size={18} color="#fff" />
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
            Rooted on @{root ? root.username : '(unknown)'}
          </div>
        </div>
        <div style={{ padding: 20, maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
          {!root && <div style={{ padding: 20, color: '#94a3b8' }}>No data to display.</div>}
          {root && (
            <TreeNode
              node={root}
              depth={0}
              childrenOf={indices.childrenOf}
              expanded={expanded}
              setExpanded={setExpanded}
              visibleIds={visibleIds}
              hasFilter={searchQuery.trim() !== '' || filterStatus !== 'all'}
              onRerootClick={rerootOn}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// ── Recursive node renderer ──────────────────────────────────────
//
// Each row shows: indent guide / expand chevron / status dot / username
// (admin-only context: id, balance, total earned, owned course tiers).
// Click chevron → expand/collapse. Click username → reroot tree on
// that user.
function TreeNode({ node, depth, childrenOf, expanded, setExpanded, visibleIds, hasFilter, onRerootClick }) {
  const kids = childrenOf[node.id] || [];
  const visibleKids = hasFilter ? kids.filter(k => visibleIds.has(k.id)) : kids;
  // Default expanded for top-level when filtered, collapsed otherwise.
  const defaultOpen = depth === 0 || hasFilter;
  const isOpen = expanded[node.id] !== undefined ? expanded[node.id] : defaultOpen;

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 0', paddingLeft: depth * 22,
        borderBottom: depth === 0 ? '1px solid #f1f5f9' : 'none',
      }}>
        {/* Expand control */}
        {visibleKids.length > 0 ? (
          <button
            onClick={() => setExpanded(s => ({ ...s, [node.id]: !isOpen }))}
            style={{
              width: 22, height: 22, padding: 0, border: 'none', background: 'transparent',
              cursor: 'pointer', color: '#64748b', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div style={{ width: 22, flexShrink: 0 }} />
        )}

        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: 4, flexShrink: 0,
          background: node.is_admin ? '#a855f7' : (node.is_active ? '#22c55e' : '#94a3b8'),
        }} />

        {/* Username + admin click-to-reroot */}
        <button
          onClick={() => onRerootClick(node.id)}
          title="Click to reroot tree on this user"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 0, fontSize: 13, fontWeight: 700,
            color: node.is_admin ? '#7e22ce' : '#0f172a', fontFamily: 'inherit',
            textAlign: 'left',
          }}>
          @{node.username}
        </button>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>#{node.id}</span>

        {node.is_admin && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
            background: 'rgba(168,85,247,.12)', color: '#7e22ce',
            border: '1px solid rgba(168,85,247,.2)', letterSpacing: .4,
          }}>ADMIN</span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Right-side metrics — balance, total earned, downline count */}
        {(node.balance || 0) > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: node.is_active ? 'rgba(22,163,74,.08)' : 'rgba(180,83,9,.1)',
            color: node.is_active ? '#15803d' : '#92400e',
            border: '1px solid ' + (node.is_active ? 'rgba(22,163,74,.18)' : 'rgba(180,83,9,.2)'),
            fontFamily: 'monospace',
          }} title="Current balance">
            ${(node.balance || 0).toFixed(2)}
          </span>
        )}
        {(node.course_earnings || 0) > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: 'rgba(139,92,246,.08)', color: '#7c3aed',
            border: '1px solid rgba(139,92,246,.18)', fontFamily: 'monospace',
          }} title="Course earnings (lifetime)">
            ${(node.course_earnings || 0).toFixed(0)} course
          </span>
        )}
        {kids.length > 0 && (
          <span style={{
            fontSize: 11, color: '#64748b', minWidth: 60, textAlign: 'right',
            fontFamily: 'monospace',
          }}>
            {kids.length} below
          </span>
        )}
      </div>
      {isOpen && visibleKids.map(k => (
        <TreeNode
          key={k.id}
          node={k}
          depth={depth + 1}
          childrenOf={childrenOf}
          expanded={expanded}
          setExpanded={setExpanded}
          visibleIds={visibleIds}
          hasFilter={hasFilter}
          onRerootClick={onRerootClick}
        />
      ))}
    </div>
  );
}

function StatTile({ label, value, sub, colour }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8ecf2', borderRadius: 10,
      padding: '14px 16px', boxShadow: '0 2px 10px rgba(23,37,84,.04)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
        textTransform: 'uppercase', color: '#64748b', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Sora,sans-serif', fontSize: 24, fontWeight: 800,
        color: colour, letterSpacing: -.3,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

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
