import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Single source of truth for the member sidebar nav. Rendered by both the
// AlShell (most pages) and NewDashboard (which has its own shell copy), so the
// collapsible sections stay identical everywhere and can't drift.
export const NAV = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', link: true },
  { header: 'GET STARTED' },
  { key: 'start', label: 'Start Here', to: '/start-here', link: false, big: true },
  { key: 'packs', label: 'Campaign Packs', to: '/packs', link: false },
  { key: 'campaigns', label: 'My Campaigns', to: '/campaigns', link: true },
  { key: 'wallet', label: 'Payment Details', to: '/payout-methods', link: false },
  { key: 'watch', label: 'Daily Watch', to: '/watch', link: true },
  { header: 'RUN YOUR BUSINESS' },
  { key: 'sales', label: 'Confirm a Sale', to: '/my-sales', link: false },
  { key: 'team', label: 'My Team', to: '/my-team', link: true },
  { key: 'leaderboard', label: 'Leaderboard', to: '/leaderboard', link: true },
  { key: 'ai-tools', label: 'Marketing Tools', to: '/ai-tools', link: true },
  { key: 'marketing', label: 'My Marketing', to: '/my-marketing', link: true },
  { key: 'traffic', label: 'Your Traffic', to: '/my-traffic', link: true },
  { key: 'kit', label: 'Content Kit', to: '/content-kit', link: true },
  { key: 'comp', label: 'Compensation Plan', to: '/compensation-plan', link: true },
  { header: 'MORE' },
  { key: 'wisdom', label: 'Daily Wisdom', to: '/wisdom', link: true },
  { key: 'extras', label: 'Vetted Extras', to: '/collaborations', link: true },
];

const NAV_GROUPS = (function () {
  const groups = []; let cur = { header: null, items: [] };
  NAV.forEach(function (n) {
    if (n.header) { if (cur.items.length || cur.header) groups.push(cur); cur = { header: n.header, items: [] }; }
    else cur.items.push(n);
  });
  if (cur.items.length || cur.header) groups.push(cur);
  return groups;
})();

export default function SideNav({ active }) {
  const [collapsed, setCollapsed] = useState(function () {
    try { return JSON.parse(localStorage.getItem('al_nav_collapsed') || '{}') || {}; } catch (e) { return {}; }
  });
  const activeHeader = (function () {
    for (var i = 0; i < NAV_GROUPS.length; i++) {
      var g = NAV_GROUPS[i];
      if (g.header && g.items.some(function (n) { return n.key === active; })) return g.header;
    }
    return null;
  })();
  function isCollapsed(h) {
    if (!h) return false;
    return (h in collapsed) ? !!collapsed[h] : (h !== activeHeader);
  }
  function toggleGroup(h) {
    setCollapsed(function (prev) {
      const next = Object.assign({}, prev);
      next[h] = !((h in prev) ? prev[h] : (h !== activeHeader));
      try { localStorage.setItem('al_nav_collapsed', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }
  function renderItem(n) {
    const cls = n.key === active ? 'on' : undefined;
    if (n.big) {
      return <a key={n.key} className={cls} href={n.to} style={{ fontSize: 18, fontWeight: 900, color: '#2ecc71' }}><span style={{ fontSize: 20 }}>⭐</span> {n.label}</a>;
    }
    return n.link
      ? <Link key={n.key} className={cls} to={n.to}>{n.label}</Link>
      : <a key={n.key} className={cls} href={n.to}>{n.label}</a>;
  }
  return (
    <>
      {NAV_GROUPS.map(function (g, gi) {
        if (!g.header) return <div key={'g' + gi}>{g.items.map(renderItem)}</div>;
        const isCol = isCollapsed(g.header);
        return (
          <div key={'g' + gi} style={{ marginTop: 8 }}>
            <div onClick={function () { toggleGroup(g.header); }} role="button" aria-expanded={!isCol}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', padding: '11px 13px', borderRadius: 11, background: isCol ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.10)', marginBottom: isCol ? 0 : 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.82)' }}>{g.header}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ transform: isCol ? 'rotate(-90deg)' : 'none', transition: 'transform .18s ease', flex: 'none' }}>
                <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.65)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ overflow: 'hidden', maxHeight: isCol ? 0 : 1000, transition: 'max-height .22s ease', paddingLeft: 4 }}>
              {g.items.map(renderItem)}
            </div>
          </div>
        );
      })}
    </>
  );
}
