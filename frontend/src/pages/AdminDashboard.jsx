import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { Shield, Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle, XCircle, Search, ChevronRight, Eye, Ban, CreditCard, Activity, FileText, UserCheck, Clock, RefreshCw, ArrowUpDown, Mail, Sparkles, Send } from 'lucide-react';
import { formatMoney } from '../utils/money';

var TABS = [
  {key:'overview',label:'Overview',icon:Activity},
  {key:'users',label:'Users',icon:Users},
  {key:'moderation',label:'Moderation',icon:Eye},
  {key:'finances',label:'Finances',icon:DollarSign},
  {key:'withdrawals',label:'Withdrawals',icon:CreditCard},
  {key:'kyc',label:'KYC Queue',icon:UserCheck},
  {key:'commissions',label:'Commissions',icon:TrendingUp},
  {key:'email',label:'Email Analytics',icon:Mail},
  {key:'broadcast',label:'Broadcast',icon:Send},
  {key:'superscene',label:'Creative Studio',icon:Sparkles},
  {key:'health',label:'System Health',icon:Shield},
];

export default function AdminDashboard() {
  var { t } = useTranslation();
  var [tab, setTab] = useState('overview');
  var navigate = useNavigate();

  function handleTabClick(key) {
    // Broadcast is a separate full page (the 3-tab compose/members/history
    // editor at /admin/email-broadcast). Tab click navigates rather than
    // switching the inline tab state.
    if (key === 'broadcast') {
      navigate('/admin/email-broadcast');
      return;
    }
    // System Health is a self-contained admin page at /admin/health
    // (built 13 May 2026 — plain HTML/JS dashboard for platform-wide
    // diagnostic scanners). Navigate rather than embed.
    if (key === 'health') {
      window.location.href = '/admin/health';
      return;
    }
    setTab(key);
  }

  return (
    <AppLayout title="Admin Dashboard" subtitle="Platform Management — Owner Access">
      <div className="admin-tabs" style={{display:'flex',gap:6,marginBottom:24,borderBottom:'2px solid #e8ecf2',paddingBottom:0,flexWrap:'wrap'}}>
        {TABS.map(function(t) {
          var Icon = t.icon;
          var on = tab === t.key;
          return (
            <button key={t.key} onClick={function() { handleTabClick(t.key); }}
              style={{display:'flex',alignItems:'center',gap:5,padding:'10px 16px',fontSize:12,fontWeight:on?800:600,
                border:'none',borderBottom:on?'3px solid #dc2626':'3px solid transparent',
                cursor:'pointer',fontFamily:'inherit',background:on?'rgba(220,38,38,.04)':'transparent',
                color:on?'var(--sap-red)':'var(--sap-text-faint)',marginBottom:-2,borderRadius:'6px 6px 0 0',transition:'all .15s'}}>
              <Icon size={13}/>{t.label}
            </button>
          );
        })}
      </div>
      {tab === 'overview' && <OverviewTab/>}
      {tab === 'users' && <UsersTab/>}
      {tab === 'moderation' && <ModerationTab/>}
      {tab === 'finances' && <FinancesTab/>}
      {tab === 'withdrawals' && <WithdrawalsTab/>}
      {tab === 'kyc' && <KYCTab/>}
      {tab === 'commissions' && <CommissionsTab/>}
      {tab === 'email' && <EmailAnalyticsTab/>}
      {tab === 'superscene' && <SuperSceneAnalyticsTab/>}
      {/* health: handled via navigate() in handleTabClick — no inline tab */}
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════

// ── Maintenance Mode 'panic button' ─────────────────────────
// Top of the admin Overview tab. Two clear buttons:
//   - "Pause withdrawals only" (soft_maintenance)
//   - "Pause EVERYTHING money-related" (hard_maintenance)
// Plus a "Resume normal operation" button to return to 'live'.
// Always visible — when 'live' the panel is collapsed/quiet; when in
// either maintenance mode it expands into a prominent red/amber banner
// so the admin can't miss that the platform is paused.
function MaintenancePanel() {
  var [status, setStatus] = useState(null);
  var [busy, setBusy] = useState(false);
  var [expanded, setExpanded] = useState(false);
  var [reason, setReason] = useState('');

  function refresh() {
    apiGet('/admin/api/maintenance-status').then(setStatus).catch(function() {});
  }
  useEffect(function() { refresh(); }, []);

  if (!status) return null;

  var mode = status.mode || 'live';
  var isLive = mode === 'live';
  var isSoft = mode === 'soft_maintenance';
  var isHard = mode === 'hard_maintenance';

  function setMode(newMode) {
    var confirmMsg = (
      newMode === 'soft_maintenance' ? 'Pause withdrawals platform-wide?\n\nMembers will still be able to log in, view their wallet, sign up, and buy tiers. Only withdrawals will be blocked. The withdrawal cron will also pause.' :
      newMode === 'hard_maintenance' ? 'Pause ALL money flows + signups?\n\nWithdrawals, tier purchases, course purchases, P2P transfers, and new registrations will all be blocked. Members can still log in and view their data.' :
      'Resume normal operation?\n\nAll endpoints will accept transactions again. Any queued withdrawals will resume processing on the next cron tick.'
    );
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    apiPost('/admin/api/maintenance-set', { mode: newMode, reason: reason })
      .then(function() {
        setReason('');
        refresh();
      })
      .catch(function(err) {
        alert('Failed to change mode: ' + (err && err.message ? err.message : 'unknown error'));
      })
      .finally(function() { setBusy(false); });
  }

  // ── LIVE state: small green pill, click to expand the controls ──
  if (isLive && !expanded) {
    return (
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,
                    padding:'10px 16px',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:10,height:10,borderRadius:'50%',background:'#16a34a'}}/>
          <span style={{fontSize:13,fontWeight:700,color:'#15803d'}}>
            Platform live — all systems operational
          </span>
        </div>
        <button onClick={function(){ setExpanded(true); }}
          style={{padding:'6px 12px',borderRadius:6,border:'1px solid #bbf7d0',
                  background:'#fff',color:'#15803d',fontSize:12,fontWeight:700,
                  cursor:'pointer',fontFamily:'inherit'}}>
          Panic button…
        </button>
      </div>
    );
  }

  // ── MAINTENANCE state OR expanded LIVE: show full panel ──
  var panelBg = isHard ? '#fef2f2' : isSoft ? '#fffbeb' : '#fff';
  var panelBorder = isHard ? '#fecaca' : isSoft ? '#fed7aa' : '#e8ecf2';
  var titleColor = isHard ? '#991b1b' : isSoft ? '#92400e' : 'var(--sap-text-primary)';

  return (
    <div style={{background:panelBg,border:'2px solid '+panelBorder,borderRadius:14,
                  padding:'18px 22px',marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:titleColor,fontFamily:'Sora,sans-serif',marginBottom:4}}>
            {isHard ? '🔴 HARD MAINTENANCE — all money flows paused'
              : isSoft ? '🟡 SOFT MAINTENANCE — withdrawals paused'
              : '⚙️ Platform controls'}
          </div>
          {!isLive && status.set_at && (
            <div style={{fontSize:12,color:'#64748b'}}>
              Set {new Date(status.set_at).toLocaleString()}
              {status.set_by_username ? ' by @' + status.set_by_username : ''}
              {status.reason ? ' · ' + status.reason : ''}
            </div>
          )}
        </div>
        {isLive && expanded && (
          <button onClick={function(){ setExpanded(false); }}
            style={{padding:'4px 10px',borderRadius:6,border:'none',background:'transparent',
                    color:'#64748b',fontSize:12,cursor:'pointer'}}>
            Close
          </button>
        )}
      </div>

      {/* Reason input (optional) — only when LIVE since you need it BEFORE flipping. */}
      {isLive && (
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>
            Reason (optional, recorded with the toggle)
          </label>
          <input type="text" value={reason} onChange={function(e){ setReason(e.target.value); }}
            placeholder="e.g. Investigating commission anomaly"
            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',
                    fontSize:13,fontFamily:'inherit'}}/>
        </div>
      )}

      {/* Buttons */}
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        {isLive && (
          <>
            <button onClick={function(){ setMode('soft_maintenance'); }} disabled={busy}
              style={{padding:'10px 16px',borderRadius:8,border:'1.5px solid #f59e0b',
                      background:'#fff',color:'#92400e',fontSize:13,fontWeight:700,
                      cursor:busy?'not-allowed':'pointer',fontFamily:'inherit'}}>
              🟡 Pause withdrawals only
            </button>
            <button onClick={function(){ setMode('hard_maintenance'); }} disabled={busy}
              style={{padding:'10px 16px',borderRadius:8,border:'none',
                      background:'#dc2626',color:'#fff',fontSize:13,fontWeight:700,
                      cursor:busy?'not-allowed':'pointer',fontFamily:'inherit'}}>
              🔴 Pause EVERYTHING money-related
            </button>
          </>
        )}
        {!isLive && (
          <button onClick={function(){ setMode('live'); }} disabled={busy}
            style={{padding:'10px 18px',borderRadius:8,border:'none',
                    background:'#16a34a',color:'#fff',fontSize:14,fontWeight:800,
                    cursor:busy?'not-allowed':'pointer',fontFamily:'inherit'}}>
            ✅ Resume normal operation
          </button>
        )}
        {isSoft && (
          <button onClick={function(){ setMode('hard_maintenance'); }} disabled={busy}
            style={{padding:'10px 16px',borderRadius:8,border:'none',
                    background:'#dc2626',color:'#fff',fontSize:13,fontWeight:700,
                    cursor:busy?'not-allowed':'pointer',fontFamily:'inherit'}}>
            🔴 Escalate to hard maintenance
          </button>
        )}
      </div>

      {/* Quick reference of what each mode does */}
      {isLive && expanded && (
        <div style={{marginTop:14,padding:'12px 14px',background:'#f8fafc',borderRadius:8,fontSize:12,color:'#64748b',lineHeight:1.6}}>
          <div><strong style={{color:'#92400e'}}>Soft</strong>: blocks withdrawals (+ pauses retry cron). Everything else stays live.</div>
          <div><strong style={{color:'#991b1b'}}>Hard</strong>: blocks withdrawals, tier purchases, course purchases, credit packs, P2P transfers, and new signups.</div>
          <div style={{marginTop:6}}>Members can always log in and view their wallet. Support page always works.</div>
        </div>
      )}
    </div>
  );
}


function OverviewTab() {
  var [data, setData] = useState(null);
  var [health, setHealth] = useState(null);
  var ovNavigate = useNavigate();
  useEffect(function() {
    apiGet('/admin/api/finances').then(setData).catch(function(){});
    apiGet('/admin/api/health').then(setHealth).catch(function(){});
  }, []);
  if (!data) return <Spin/>;

  var stats = [
    {label:'Total Members',value:data.total_users||0,color:'var(--sap-accent)',icon:Users},
    {label:'Active Members',value:data.active_users||0,color:'var(--sap-green)',icon:CheckCircle},
    {label:'Total Revenue',value:'$'+(data.total_revenue||0).toLocaleString(),color:'var(--sap-purple)',icon:DollarSign},
    {label:'Commissions Paid',value:'$'+(data.total_commissions_paid||0).toLocaleString(),color:'var(--sap-amber)',icon:TrendingUp},
    {label:'Pending Withdrawals',value:data.pending_withdrawals_count||0,color:'var(--sap-red)',icon:Clock},
    {label:'Active Grids',value:data.active_grids||0,color:'var(--sap-accent)',icon:Activity},
  ];

  return (
    <div>
      <MaintenancePanel/>

      {/* Quick actions — high-frequency admin tasks, one click away */}
      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <button
          onClick={function() { ovNavigate('/admin/email-broadcast'); }}
          style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 18px',
            background:'linear-gradient(135deg,#0ea5e9,#0284c7)',color:'#fff',
            border:'none',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',
            cursor:'pointer',boxShadow:'0 2px 8px rgba(14,165,233,.25)'}}>
          <Send size={15}/>
          Send broadcast email
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        {stats.map(function(s,i) {
          var Icon = s.icon;
          return (
            <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:12,right:12,width:36,height:36,borderRadius:10,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={18} color={s.color}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)',marginTop:2}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* System health quick view */}
      {health && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>System Health</div>
          </div>
          <div style={{padding:'16px 20px'}}>
            {(health.checks || []).map(function(c,i) {
              var color = c.status === 'ok' ? 'var(--sap-green)' : c.status === 'warn' ? 'var(--sap-amber)' : 'var(--sap-red)';
              return (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:i<(health.checks||[]).length-1?'1px solid #f5f6f8':'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--sap-text-primary)'}}>{c.name}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:color,textTransform:'uppercase'}}>{c.detail || c.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════

function UsersTab() {
  var [users, setUsers] = useState([]);
  var [total, setTotal] = useState(0);
  var [loading, setLoading] = useState(false);
  var [search, setSearch] = useState('');
  var [debouncedSearch, setDebouncedSearch] = useState('');
  var [statusFilter, setStatusFilter] = useState('');   // '' | 'active' | 'inactive'
  var [sortMode, setSortMode] = useState('newest');     // 'newest' | 'oldest' | 'balance' | 'earned'
  var [page, setPage] = useState(1);
  var [pageSize] = useState(25);
  var [selected, setSelected] = useState(null);
  var [detail, setDetail] = useState(null);
  var [adjustAmt, setAdjustAmt] = useState('');
  var [adjustReason, setAdjustReason] = useState('');
  var [msg, setMsg] = useState('');

  // Debounce search input so we don't fire an API call on every keystroke.
  // 300ms feels responsive without being chatty.
  useEffect(function() {
    var t = setTimeout(function() { setDebouncedSearch(search); }, 300);
    return function() { clearTimeout(t); };
  }, [search]);

  // Reset to page 1 whenever the search/filter/sort changes — otherwise
  // a user on page 4 of "all members" who types a name keeps trying to
  // look up page 4 of the filtered results, which usually has no rows.
  useEffect(function() {
    setPage(1);
  }, [debouncedSearch, statusFilter, sortMode]);

  // Load users whenever any query param changes.
  useEffect(function() {
    setLoading(true);
    var params = new URLSearchParams({
      q: debouncedSearch,
      status: statusFilter,
      sort: sortMode,
      limit: String(pageSize),
      offset: String((page - 1) * pageSize),
    });
    apiGet('/admin/api/users?' + params.toString()).then(function(d) {
      setUsers(d.users || []);
      setTotal(d.total || 0);
      setLoading(false);
    }).catch(function(err) {
      // Don't silently swallow — surface so we can see issues during dev.
      // Was previously `.catch(function(){})` which masked real errors.
      console.error('admin users load failed', err);
      setUsers([]);
      setTotal(0);
      setLoading(false);
    });
  }, [debouncedSearch, statusFilter, sortMode, page, pageSize]);

  function reloadCurrentPage() {
    // Trigger the load effect by bumping a value — easiest is to re-set page
    // to itself, but React deduplicates that. Use a dummy approach: re-set
    // debouncedSearch to itself, which is benign and triggers the effect.
    setDebouncedSearch(function(v) { return v; });
    // Actually neither of those forces a refetch. Cleanest is a direct call:
    setLoading(true);
    var params = new URLSearchParams({
      q: debouncedSearch, status: statusFilter, sort: sortMode,
      limit: String(pageSize), offset: String((page - 1) * pageSize),
    });
    apiGet('/admin/api/users?' + params.toString()).then(function(d) {
      setUsers(d.users || []);
      setTotal(d.total || 0);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  function openUser(id) {
    apiGet('/admin/api/user/' + id).then(function(d) {
      // API returns {user: {...}, grids: [], commissions: []}
      // Flatten so detail = user object with extra arrays attached
      var u = d.user || d;
      u._grids = d.grids || [];
      u._commissions = d.recent_commissions || [];
      u._payments = d.payments || [];
      u._withdrawals = d.withdrawals || [];
      setDetail(u);
      setSelected(id);
    });
  }

  function adjustBalance() {
    if (!adjustAmt) return;
    apiPost('/admin/api/user/' + selected + '/adjust-balance', {amount: parseFloat(adjustAmt), reason: adjustReason}).then(function(r) {
      setMsg(r.success ? 'Balance adjusted' : (r.error || 'Failed'));
      openUser(selected);
      setAdjustAmt(''); setAdjustReason('');
    });
  }

  function toggleActive() {
    apiPost('/admin/api/user/' + selected + '/toggle-active', {}).then(function(r) {
      setMsg(r.success ? 'Status toggled' : (r.error || 'Failed'));
      openUser(selected);
      reloadCurrentPage();
    });
  }

  var totalPages = Math.max(1, Math.ceil(total / pageSize));
  var rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  var rangeEnd = Math.min(page * pageSize, total);

  // Helper for the filter/sort pill buttons
  function pillBtn(label, isActive, onClick) {
    return (
      <button onClick={onClick} style={{
        padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        border: '1px solid ' + (isActive ? 'var(--sap-accent)' : '#e2e8f0'),
        background: isActive ? 'var(--sap-accent)' : '#fff',
        color: isActive ? '#fff' : 'var(--sap-text-muted)',
      }}>{label}</button>
    );
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:selected?'1fr 1fr':'1fr',gap:16}}>
      {/* User list */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
        <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>
            Members ({total})
            {loading && <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.6)',marginLeft:8}}>loading…</span>}
          </div>
        </div>

        {/* Search */}
        <div style={{padding:'12px 16px',borderBottom:'1px solid #e8ecf2'}}>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:12,top:10,color:'var(--sap-text-faint)'}}/>
            <input value={search} onChange={function(e) { setSearch(e.target.value); }}
              placeholder="Search by name, email, username, ID..."
              style={{width:'100%',padding:'8px 12px 8px 34px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>

        {/* Filters + sort */}
        <div style={{padding:'10px 16px',borderBottom:'1px solid #e8ecf2',display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,fontWeight:700,color:'var(--sap-text-faint)',textTransform:'uppercase',letterSpacing:.5,marginRight:2}}>Status:</span>
          {pillBtn('All', statusFilter === '', function() { setStatusFilter(''); })}
          {pillBtn('Active', statusFilter === 'active', function() { setStatusFilter('active'); })}
          {pillBtn('Inactive', statusFilter === 'inactive', function() { setStatusFilter('inactive'); })}

          <span style={{flex:1}}/>

          <span style={{fontSize:11,fontWeight:700,color:'var(--sap-text-faint)',textTransform:'uppercase',letterSpacing:.5,marginRight:2}}>Sort:</span>
          <select value={sortMode} onChange={function(e) { setSortMode(e.target.value); }}
            style={{padding:'5px 8px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',background:'#fff',cursor:'pointer'}}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="balance">Highest balance</option>
            <option value="earned">Highest earned</option>
          </select>
        </div>

        {/* User rows */}
        <div style={{minHeight:200,maxHeight:600,overflowY:'auto'}}>
          {!loading && users.length === 0 && (
            <div style={{padding:'40px 20px',textAlign:'center',color:'var(--sap-text-faint)',fontSize:13}}>
              {debouncedSearch || statusFilter ? 'No matches for this search/filter.' : 'No members yet.'}
            </div>
          )}
          {users.map(function(u) {
            var isActive = u.is_active;
            var isSel = selected === u.id;
            return (
              <div key={u.id} onClick={function() { openUser(u.id); }}
                style={{padding:'10px 16px',borderBottom:'1px solid #f5f6f8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:isSel?'rgba(14,165,233,.04)':'transparent',transition:'background .1s'}}
                onMouseEnter={function(e) { if (!isSel) e.currentTarget.style.background='var(--sap-bg-input)'; }}
                onMouseLeave={function(e) { if (!isSel) e.currentTarget.style.background='transparent'; }}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'var(--sap-border-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'var(--sap-text-muted)'}}>
                    {((u.first_name||'')[0]||'')+(((u.last_name||u.username||'')[0])||'')}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)'}}>
                      {u.first_name || u.username} {u.last_name || ''}
                      {u.is_admin && <span style={{fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(245,158,11,.15)',color:'#b45309',marginLeft:6,verticalAlign:'middle'}}>ADMIN</span>}
                    </div>
                    <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>@{u.username} · ID: {u.id}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:13,fontWeight:700,padding:'2px 6px',borderRadius:3,background:isActive?'var(--sap-green-bg-mid)':'var(--sap-red-bg)',color:isActive?'var(--sap-green)':'var(--sap-red)'}}>{isActive?'Active':'Inactive'}</span>
                  {u.membership_tier === 'pro' && <span style={{fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(139,92,246,.1)',color:'var(--sap-purple)'}}>PRO</span>}
                  {u.membership_tier === 'basic' && <span style={{fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(14,165,233,.1)',color:'var(--sap-accent)'}}>BASIC</span>}
                  {(!u.membership_tier || u.membership_tier === 'free') && <span style={{fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(148,163,184,.15)',color:'var(--sap-text-muted, #64748b)'}}>FREE</span>}
                  <span style={{fontSize:13,fontWeight:700,color:'var(--sap-accent)'}}>${(u.balance||0).toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination footer */}
        {total > 0 && (
          <div style={{padding:'10px 16px',borderTop:'1px solid #e8ecf2',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fafbfc'}}>
            <div style={{fontSize:12,color:'var(--sap-text-muted)'}}>
              Showing <strong style={{color:'var(--sap-text-primary)'}}>{rangeStart}–{rangeEnd}</strong> of <strong style={{color:'var(--sap-text-primary)'}}>{total}</strong>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button onClick={function() { setPage(1); }} disabled={page === 1}
                style={{padding:'4px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,fontWeight:700,cursor:page===1?'not-allowed':'pointer',opacity:page===1?.4:1,fontFamily:'inherit'}}>« First</button>
              <button onClick={function() { setPage(function(p) { return Math.max(1, p - 1); }); }} disabled={page === 1}
                style={{padding:'4px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,fontWeight:700,cursor:page===1?'not-allowed':'pointer',opacity:page===1?.4:1,fontFamily:'inherit'}}>‹ Prev</button>
              <span style={{padding:'0 8px',fontSize:12,fontWeight:700,color:'var(--sap-text-primary)'}}>
                Page {page} / {totalPages}
              </span>
              <button onClick={function() { setPage(function(p) { return Math.min(totalPages, p + 1); }); }} disabled={page >= totalPages}
                style={{padding:'4px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,fontWeight:700,cursor:page>=totalPages?'not-allowed':'pointer',opacity:page>=totalPages?.4:1,fontFamily:'inherit'}}>Next ›</button>
              <button onClick={function() { setPage(totalPages); }} disabled={page >= totalPages}
                style={{padding:'4px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,fontWeight:700,cursor:page>=totalPages?'not-allowed':'pointer',opacity:page>=totalPages?.4:1,fontFamily:'inherit'}}>Last »</button>
            </div>
          </div>
        )}
      </div>

      {/* User detail */}
      {selected && detail && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {msg && <div style={{padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:700,background:msg.includes('adjust')||msg.includes('toggle')?'var(--sap-green-bg-mid)':'var(--sap-red-bg)',color:msg.includes('adjust')||msg.includes('toggle')?'var(--sap-green)':'var(--sap-red)'}}>{msg}</div>}

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{detail.first_name || detail.username} {detail.last_name || ''}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,.4)'}}>@{detail.username} · SAP-{String(detail.id).padStart(5,'0')}</div>
              </div>
              <button onClick={function(){setSelected(null);setDetail(null);}} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:6,color:'#fff',fontSize:13,fontWeight:700,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>✕ Close</button>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12}}>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Email:</span> <span style={{color:'var(--sap-text-primary)'}}>{detail.email}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Tier:</span> <span style={{color:'var(--sap-text-primary)',textTransform:'capitalize'}}>{detail.membership_tier || 'basic'}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Balance:</span> <span style={{color:'var(--sap-green)',fontWeight:800}}>${formatMoney(detail.balance)}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Total Earned:</span> <span style={{color:'var(--sap-accent)',fontWeight:800}}>${formatMoney(detail.total_earned)}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Status:</span> <span style={{color:detail.is_active?'var(--sap-green)':'var(--sap-red)',fontWeight:700}}>{detail.is_active?'Active':'Inactive'}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Sponsor:</span> <span style={{color:'var(--sap-text-primary)'}}>{detail.sponsor_username ? '@'+detail.sponsor_username+' (ID '+detail.sponsor_id+')' : 'Direct'}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Referrals:</span> <span style={{color:'var(--sap-text-primary)'}}>{detail.personal_referrals || 0}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Joined:</span> <span style={{color:'var(--sap-text-primary)'}}>{detail.created_at ? new Date(detail.created_at).toLocaleDateString('en-GB') : '—'}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>KYC:</span> <span style={{color:'var(--sap-text-primary)',textTransform:'capitalize'}}>{detail.kyc_status || 'none'}</span></div>
                <div><span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>2FA:</span> <span style={{color:detail.two_factor_enabled?'var(--sap-green)':'var(--sap-text-faint)'}}>{detail.two_factor_enabled?'Enabled':'Off'}</span></div>
              </div>

              {/* ── Membership billing (added 16 May 2026) ──
                  Shows next-renewal date, locked price (for founders),
                  and founding-spot status. Lets admin verify billing
                  state at a glance — previously these fields were
                  in the DB but invisible in the UI. */}
              {(() => {
                var exp = detail.membership_expires_at;
                var expDate = exp ? new Date(exp) : null;
                var expYear = expDate ? expDate.getFullYear() : null;
                var isLegacyBug = expYear && expYear >= 2099;
                var daysLeft = expDate ? Math.floor((expDate.getTime() - Date.now()) / 86400000) : null;
                var expDisplay = !expDate ? '—'
                  : isLegacyBug ? '⚠ 2099-12-31 (legacy bug)'
                  : expDate.toLocaleDateString('en-GB') + (daysLeft !== null ? ' (' + (daysLeft >= 0 ? 'in ' + daysLeft + 'd' : daysLeft + 'd ago') + ')' : '');
                return (
                  <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #e8ecf2'}}>
                    <div style={{fontSize:11,fontWeight:800,color:'var(--sap-text-muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Membership billing</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12}}>
                      <div>
                        <span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Next renewal:</span>{' '}
                        <span style={{color: isLegacyBug ? 'var(--sap-red)' : (daysLeft !== null && daysLeft < 3 ? 'var(--sap-amber-dark, #b45309)' : 'var(--sap-text-primary)'), fontWeight: isLegacyBug ? 800 : 500}}>
                          {expDisplay}
                        </span>
                      </div>
                      <div>
                        <span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Price/mo:</span>{' '}
                        <span style={{color:'var(--sap-text-primary)',fontWeight:700}}>
                          {detail.membership_price_locked != null
                            ? '$' + Number(detail.membership_price_locked).toFixed(2) + ' (locked)'
                            : detail.is_active ? '$20.00 (standard)' : '—'}
                        </span>
                      </div>
                      <div>
                        <span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Founder:</span>{' '}
                        {detail.is_founding_member ? (
                          <span style={{color:'var(--sap-amber-dark, #b45309)',fontWeight:800}}>
                            ★ Yes{detail.founding_spot_number ? ' (spot #' + detail.founding_spot_number + '/100)' : ' (gifted)'}
                          </span>
                        ) : (
                          <span style={{color:'var(--sap-text-faint)'}}>No</span>
                        )}
                      </div>
                      <div>
                        <span style={{fontWeight:700,color:'var(--sap-text-muted)'}}>Activated:</span>{' '}
                        <span style={{color:'var(--sap-text-primary)'}}>{detail.created_at ? new Date(detail.created_at).toLocaleDateString('en-GB') : '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Actions */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Actions</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              {/* Toggle active */}
              <button onClick={toggleActive}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
                  background:detail.is_active?'var(--sap-red-bg)':'var(--sap-green-bg-mid)',color:detail.is_active?'var(--sap-red)':'var(--sap-green)',marginBottom:8}}>
                {detail.is_active ? '⛔ Deactivate Account' : '✅ Activate Account'}
              </button>

              {/* Change tier — DEPRECATED 15 May 2026 under flat partner pricing.
                  Legacy Basic/Pro toggle no longer applies; every paying member
                  is a Partner. Button hidden but underlying admin endpoint
                  /admin/api/user/{id}/change-tier still works if needed for
                  data fixes during the transition period. */}
              {false && !detail.is_admin && (
                <button onClick={function() {
                  var newTier = (detail.membership_tier || 'basic') === 'pro' ? 'basic' : 'pro';
                  if (!window.confirm('Change ' + detail.username + ' to ' + newTier.toUpperCase() + '?')) return;
                  apiPost('/admin/api/user/' + selected + '/change-tier', {tier: newTier}).then(function(r) {
                    setMsg(r.success ? 'Tier changed to ' + newTier : (r.error || 'Failed'));
                    openUser(selected); reloadCurrentPage();
                  });
                }}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
                  background:(detail.membership_tier||'basic')==='pro'?'var(--sap-amber-bg)':'var(--sap-purple-pale)',color:(detail.membership_tier||'basic')==='pro'?'var(--sap-amber-dark)':'var(--sap-violet)',marginBottom:8}}>
                  {(detail.membership_tier||'basic')==='pro' ? '⬇ Downgrade to Basic' : '⬆ Upgrade to Pro'}
                </button>
              )}

              {/* Reset 2FA — for members who have lost their authenticator device */}
              {detail.two_factor_enabled && (
                <button onClick={function() {
                  if (!window.confirm('Reset 2FA for ' + detail.username + '?\n\nThis disables their two-factor authentication and clears their stored secret. They will need to set up 2FA again from their Account page before they can make withdrawals.\n\nUse only when the member has confirmed they have lost access to their authenticator app.')) return;
                  apiPost('/admin/api/user/' + selected + '/reset-2fa', {}).then(function(r) {
                    if (r.success) { setMsg('2FA reset for ' + detail.username + '. They have been notified in-app.'); openUser(selected); reloadCurrentPage(); }
                    else setMsg(r.error || 'Reset failed');
                  }).catch(function(e) { setMsg(e.message || 'Reset failed'); });
                }}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid #fde68a',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:'var(--sap-amber-bg)',color:'var(--sap-amber-dark)',marginBottom:8}}>
                  🔐 Reset 2FA (Lost Authenticator)
                </button>
              )}

              {/* Delete user */}
              {!detail.is_admin && (
                <button onClick={function() {
                  if (!window.confirm('PERMANENTLY DELETE ' + detail.username + '? This cannot be undone.')) return;
                  apiDelete('/admin/api/user/' + selected).then(function(r) {
                    if (r.ok) { setMsg('User deleted'); setSelected(null); setDetail(null); reloadCurrentPage(); }
                    else setMsg(r.error || 'Delete failed');
                  }).catch(function(e) { setMsg(e.message || 'Delete failed'); });
                }}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid #fecaca',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:'#fff',color:'var(--sap-red)',marginBottom:12}}>
                  🗑 Delete User Permanently
                </button>
              )}

              {/* Activate Paid Membership — for bank transfers / off-platform
                  payments. Routes through the proper commission cascade so
                  the resulting state is identical to a crypto-paid signup. */}
              {!detail.is_admin && <PaidActivation userId={selected} username={detail.username} onDone={function(m) { setMsg(m); openUser(selected); reloadCurrentPage(); }}/>}

              {/* Gift Free Membership — for influencers, team, or promo.
                  No commission paid, no Payment row. Founder gifts bypass
                  the 100-spot count so they don't burn real customer inventory. */}
              {!detail.is_admin && <GiftMembership userId={selected} username={detail.username} onDone={function(m) { setMsg(m); openUser(selected); reloadCurrentPage(); }}/>}

              {/* Activate Grid Tier — manual recovery for members who paid
                  via a path that didn't auto-activate (rare, but happens).
                  Calls the same /admin/diagnostic/manual-grid-activation
                  endpoint that the URL-based recipe uses; the endpoint
                  routes through process_tier_purchase so upline commissions
                  cascade identically to the normal payment flow. */}
              {!detail.is_admin && <GridActivation userId={selected} username={detail.username} onDone={function(m) { setMsg(m); openUser(selected); reloadCurrentPage(); }}/>}

              {/* Adjust balance */}
              <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:6}}>Adjust Balance</div>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                <input value={adjustAmt} onChange={function(e) { setAdjustAmt(e.target.value); }}
                  placeholder="Amount (+ or -)" type="number" step="0.01"
                  style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
                <input value={adjustReason} onChange={function(e) { setAdjustReason(e.target.value); }}
                  placeholder="Reason"
                  style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
              </div>
              <button onClick={adjustBalance}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:'var(--sap-accent)',color:'#fff'}}>
                Apply Balance Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MODERATION — Approve/reject flagged ads & banners
// ══════════════════════════════════════════════════════════

function ModerationTab() {
  var [queue, setQueue] = useState({ ads: [], banners: [], total: 0 });
  var [loading, setLoading] = useState(true);
  var [msg, setMsg] = useState('');

  function load() {
    setLoading(true);
    apiGet('/admin/api/moderation-queue').then(function(d) { setQueue(d); setLoading(false); }).catch(function() { setLoading(false); });
  }
  useEffect(load, []);

  function approve(type, id) {
    apiPost('/admin/api/moderation/' + type + '/' + id + '/approve', {}).then(function() { setMsg('Approved!'); load(); });
  }
  function reject(type, id) {
    if (!window.confirm('Reject this item?')) return;
    apiPost('/admin/api/moderation/' + type + '/' + id + '/reject', {}).then(function() { setMsg('Rejected'); load(); });
  }

  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--sap-text-faint)'}}>Loading...</div>;

  return (
    <div>
      {msg && <div style={{padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:700,background:'var(--sap-green-bg-mid)',color:'var(--sap-green)',marginBottom:16}}>{msg}</div>}

      <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:16}}>
        {queue.total === 0 ? '✅ Nothing to review — all content is approved' : queue.total + ' item' + (queue.total !== 1 ? 's' : '') + ' awaiting review'}
      </div>

      {queue.ads.length > 0 && (
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,fontWeight:800,color:'var(--sap-green-mid)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📋 Classified Ads ({queue.ads.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {queue.ads.map(function(a) {
              return (
                <div key={a.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:4}}>{a.title}</div>
                      <div style={{fontSize:12,color:'var(--sap-text-muted)',lineHeight:1.5,marginBottom:6}}>{a.description}</div>
                      <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>
                        {a.category} · by @{a.owner} · {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB') : ''}
                      </div>
                      {a.link_url && <div style={{fontSize:13,color:'var(--sap-accent)',marginTop:4}}>{a.link_url}</div>}
                      {a.keywords && <div style={{fontSize:13,color:'var(--sap-text-faint)',marginTop:4}}>Keywords: {a.keywords}</div>}
                    </div>
                    {a.image_url && <img src={a.image_url} alt="" style={{width:80,height:60,objectFit:'cover',borderRadius:6,flexShrink:0}} />}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button onClick={function(){approve('ad',a.id);}} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'var(--sap-green)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✅ Approve</button>
                    <button onClick={function(){reject('ad',a.id);}} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>❌ Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {queue.banners.length > 0 && (
        <div>
          <div style={{fontSize:12,fontWeight:800,color:'var(--sap-amber)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>🖼️ Banner Ads ({queue.banners.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {queue.banners.map(function(b) {
              return (
                <div key={b.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:16}}>
                  <div style={{display:'flex',gap:16,alignItems:'center'}}>
                    {b.image_url && <img src={b.image_url} alt="" style={{maxWidth:200,maxHeight:100,objectFit:'contain',borderRadius:6,flexShrink:0,background:'var(--sap-bg-page)'}} />}
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:4}}>{b.title}</div>
                      {b.description && <div style={{fontSize:12,color:'var(--sap-text-muted)',marginBottom:4}}>{b.description}</div>}
                      <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>{b.size} · {b.category} · by @{b.owner}</div>
                      {b.link_url && <div style={{fontSize:13,color:'var(--sap-accent)',marginTop:4}}>{b.link_url}</div>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button onClick={function(){approve('banner',b.id);}} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'var(--sap-green)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✅ Approve</button>
                    <button onClick={function(){reject('banner',b.id);}} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>❌ Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// FINANCES
// ══════════════════════════════════════════════════════════

function FinancesTab() {
  var [data, setData] = useState(null);
  useEffect(function() { apiGet('/admin/api/finances').then(setData).catch(function(){}); }, []);
  if (!data) return <Spin/>;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {label:'Total Revenue',value:'$'+(data.total_revenue||0).toLocaleString(),color:'var(--sap-green)'},
          {label:'Commissions Paid',value:'$'+(data.total_commissions_paid||0).toLocaleString(),color:'var(--sap-amber)'},
          {label:'Pending Payouts',value:'$'+(data.pending_payouts||0).toLocaleString(),color:'var(--sap-red)'},
          {label:'Platform Earnings',value:'$'+(data.platform_revenue||0).toLocaleString(),color:'var(--sap-purple)'},
        ].map(function(s,i) {
          return (
            <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-faint)',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {data.recent_payments && data.recent_payments.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Recent Payments</div>
          </div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            {data.recent_payments.map(function(p,i) {
              return (
                <div key={i} style={{padding:'10px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)'}}>{p.username || 'User #'+p.user_id}</div>
                    <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>{p.type || 'payment'} · {p.date || '—'}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:'var(--sap-green)'}}>${formatMoney(p.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// WITHDRAWALS
// ══════════════════════════════════════════════════════════

function WithdrawalsTab() {
  var [data, setData] = useState(null);
  useEffect(function() { apiGet('/admin/api/withdrawals').then(setData).catch(function(){}); }, []);
  if (!data) return <Spin/>;

  var pending = (data.withdrawals || []).filter(function(w) { return w.status === 'pending'; });
  var completed = (data.withdrawals || []).filter(function(w) { return w.status !== 'pending'; });

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'var(--sap-red)'}}>{pending.length}</div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-faint)'}}>Pending Withdrawals</div>
        </div>
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'var(--sap-green)'}}>{completed.length}</div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-faint)'}}>Processed</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:16}}>
          <div style={{background:'var(--sap-red)',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Pending — Requires Action</div>
          </div>
          {pending.map(function(w,i) {
            return (
              <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)'}}>{w.username || 'User #'+w.user_id}</div>
                  <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>Wallet: {(w.wallet_address||'').slice(0,20)}... · {w.date || '—'}</div>
                </div>
                <div style={{fontSize:16,fontWeight:800,color:'var(--sap-red)'}}>${formatMoney(w.amount)}</div>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Processed Withdrawals</div>
          </div>
          <div style={{maxHeight:300,overflowY:'auto'}}>
            {completed.slice(0,20).map(function(w,i) {
              return (
                <div key={i} style={{padding:'10px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--sap-text-primary)'}}>{w.username || 'User #'+w.user_id}</div>
                    <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>{w.date || '—'}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--sap-green)'}}>${formatMoney(w.amount)}</span>
                    <span style={{fontSize:13,fontWeight:700,padding:'2px 6px',borderRadius:3,background:'var(--sap-green-bg-mid)',color:'var(--sap-green)',textTransform:'capitalize'}}>{w.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// KYC QUEUE
// ══════════════════════════════════════════════════════════

function KYCTab() {
  var [pending, setPending] = useState([]);
  var [msg, setMsg] = useState('');
  useEffect(function() { apiGet('/admin/api/kyc-pending').then(function(d) { setPending(Array.isArray(d) ? d : d.pending || []); }).catch(function(){}); }, []);

  function reviewKYC(userId, action) {
    apiPost('/admin/api/kyc-review/' + userId, {action: action}).then(function(r) {
      setMsg(r.success ? 'KYC ' + action + 'd' : (r.error || 'Failed'));
      setPending(function(prev) { return prev.filter(function(u) { return u.id !== userId; }); });
    });
  }

  return (
    <div>
      {msg && <div style={{padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:700,background:'var(--sap-green-bg-mid)',color:'var(--sap-green)',marginBottom:14}}>{msg}</div>}

      {pending.length > 0 ? (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'var(--sap-amber)',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>KYC Verification Queue ({pending.length})</div>
          </div>
          {pending.map(function(u,i) {
            return (
              <div key={u.id} style={{padding:'16px 20px',borderBottom:'1px solid #f5f6f8'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)'}}>{u.first_name||''} {u.last_name||''} <span style={{fontWeight:400,color:'var(--sap-text-faint)'}}>@{u.username}</span></div>
                    <div style={{fontSize:13,color:'var(--sap-text-muted)',marginTop:2}}>{u.email}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={function() { reviewKYC(u.id, 'approve'); }}
                      style={{padding:'8px 18px',borderRadius:8,border:'none',background:'var(--sap-green)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      ✓ Approve
                    </button>
                    <button onClick={function() { reviewKYC(u.id, 'reject'); }}
                      style={{padding:'8px 18px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      ✗ Reject
                    </button>
                  </div>
                </div>
                <div style={{display:'flex',gap:16,fontSize:13,color:'var(--sap-text-secondary)',flexWrap:'wrap'}}>
                  <span><strong>ID Type:</strong> {(u.kyc_id_type||'—').replace('_',' ')}</span>
                  <span><strong>DOB:</strong> {u.kyc_dob||'—'}</span>
                  <span><strong>Country:</strong> {u.country||'—'}</span>
                  <span><strong>Submitted:</strong> {u.submitted_at ? new Date(u.submitted_at).toLocaleDateString('en-GB') : '—'}</span>
                  {u.kyc_id_filename && (
                    <a href={'/admin/api/kyc-document/'+u.kyc_id_filename} target="_blank" rel="noopener noreferrer"
                      style={{color:'var(--sap-accent)',fontWeight:700,textDecoration:'none'}}>
                      📎 View Document
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}>
          <div style={{fontSize:40,marginBottom:12,opacity:.3}}>✅</div>
          <div style={{fontSize:16,fontWeight:700,color:'var(--sap-text-primary)'}}>KYC queue is clear</div>
          <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>No pending verifications</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMMISSIONS
// ══════════════════════════════════════════════════════════

function CommissionsTab() {
  var [data, setData] = useState(null);
  useEffect(function() { apiGet('/admin/api/commissions').then(setData).catch(function(){}); }, []);
  if (!data) return <Spin/>;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {label:'Total Commissions',value:data.total_count||0,color:'var(--sap-accent)'},
          {label:'Total Paid',value:'$'+(data.total_amount||0).toLocaleString(),color:'var(--sap-green)'},
          {label:'This Month',value:'$'+(data.this_month||0).toLocaleString(),color:'var(--sap-purple)'},
          {label:'Avg Per Member',value:'$'+(data.avg_per_member||0).toFixed(0),color:'var(--sap-amber)'},
        ].map(function(s,i) {
          return (
            <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-faint)',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {data.recent && data.recent.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Recent Commissions</div>
          </div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            {data.recent.map(function(c,i) {
              var typeColors = {membership:'var(--sap-green)',grid:'var(--sap-accent)',course:'var(--sap-purple)',platform:'var(--sap-text-muted)'};
              return (
                <div key={i} style={{padding:'10px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:700,padding:'2px 6px',borderRadius:3,background:(typeColors[c.type]||'var(--sap-text-muted)')+'15',color:typeColors[c.type]||'var(--sap-text-muted)',textTransform:'uppercase'}}>{c.type}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--sap-text-primary)'}}>{c.to_username || 'User #'+c.to_user_id}</span>
                    <span style={{fontSize:13,color:'var(--sap-text-faint)'}}>from {c.from_username || 'User #'+c.from_user_id}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:'var(--sap-green)'}}>${formatMoney(c.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ══════════════════════════════════════════════════════════

function HealthTab() {
  var [data, setData] = useState(null);
  var [stuckOrders, setStuckOrders] = useState(null);
  var [fixing, setFixing] = useState('');
  var [fixMsg, setFixMsg] = useState('');
  var [recovering, setRecovering] = useState(0);
  var [recoveryMsg, setRecoveryMsg] = useState('');

  function loadStuckOrders() {
    apiGet('/admin/api/stuck-orders').then(setStuckOrders).catch(function(){ setStuckOrders({orders:[],count:0}); });
  }

  useEffect(function() {
    apiGet('/admin/api/health').then(setData).catch(function(){});
    loadStuckOrders();
  }, []);

  if (!data) return <Spin/>;

  function fixIssue(type) {
    setFixing(type);
    apiPost('/admin/api/fix/' + type, {}).then(function(r) {
      setFixMsg(type + ': ' + (r.message || r.action || 'Fixed'));
      setFixing('');
      apiGet('/admin/api/health').then(setData);
    }).catch(function() { setFixing(''); });
  }

  function recoverOrder(orderId) {
    if (!confirm('Recover order ' + orderId + '? This will verify with NOWPayments that the payment is genuinely complete, then re-run activation. Refuses if already finished.')) return;
    setRecovering(orderId);
    setRecoveryMsg('');
    apiPost('/admin/api/nowpayments-order/' + orderId + '/recover', {}).then(function(r) {
      setRecovering(0);
      if (r.success) {
        setRecoveryMsg('✓ Recovered order ' + orderId + ' — activated ' + (r.product_key || r.product_type) + ' for ' + (r.username || 'user ' + r.user_id));
      } else {
        setRecoveryMsg('✗ ' + (r.error || 'Unknown error'));
      }
      loadStuckOrders();
    }).catch(function(e) {
      setRecovering(0);
      setRecoveryMsg('✗ Recovery failed: ' + (e.message || 'Network error'));
    });
  }

  return (
    <div>
      {fixMsg && <div style={{padding:'10px 14px',borderRadius:8,background:'var(--sap-green-bg-mid)',border:'1px solid #bbf7d0',marginBottom:14,fontSize:12,fontWeight:700,color:'var(--sap-green)'}}>{fixMsg}</div>}

      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:16}}>
        <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Health Checks</div>
        </div>
        {(data.checks || []).map(function(c,i) {
          var color = c.status === 'ok' ? 'var(--sap-green)' : c.status === 'warn' ? 'var(--sap-amber)' : 'var(--sap-red)';
          var Icon = c.status === 'ok' ? CheckCircle : c.status === 'warn' ? AlertTriangle : XCircle;
          return (
            <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Icon size={16} color={color}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)'}}>{c.name}</div>
                  <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>{c.detail}</div>
                </div>
              </div>
              <span style={{fontSize:13,fontWeight:800,padding:'3px 10px',borderRadius:4,background:color+'12',color:color,textTransform:'uppercase'}}>{c.status}</span>
            </div>
          );
        })}
      </div>

      {(data.issues || []).length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'var(--sap-red)',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Issues Found ({data.issues.length})</div>
          </div>
          {data.issues.map(function(issue,i) {
            return (
              <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)'}}>{issue.type}</div>
                  <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>Severity: {issue.severity} · Count: {issue.count || '—'}</div>
                </div>
                <button onClick={function() { fixIssue(issue.type); }} disabled={fixing===issue.type}
                  style={{padding:'6px 14px',borderRadius:6,border:'none',background:'var(--sap-amber)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:fixing===issue.type?0.5:1}}>
                  {fixing===issue.type ? 'Fixing...' : 'Auto-Fix'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stuck NOWPayments Orders / Recovery panel ── */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginTop:16}}>
        <div style={{background:'var(--sap-indigo)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Stuck NOWPayments Orders {stuckOrders ? ('(' + stuckOrders.count + ')') : ''}</div>
          <button onClick={loadStuckOrders} style={{padding:'6px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            ↻ Refresh
          </button>
        </div>
        {recoveryMsg && (
          <div style={{padding:'10px 20px',background:recoveryMsg.startsWith('✓')?'var(--sap-green-bg-mid)':'var(--sap-red-bg-soft)',borderBottom:'1px solid #f5f6f8',fontSize:12,fontWeight:700,color:recoveryMsg.startsWith('✓')?'var(--sap-green)':'var(--sap-red)'}}>
            {recoveryMsg}
          </div>
        )}
        {stuckOrders === null ? (
          <div style={{padding:'20px',textAlign:'center',color:'var(--sap-text-faint)',fontSize:13}}>Loading…</div>
        ) : stuckOrders.count === 0 ? (
          <div style={{padding:'20px',textAlign:'center',color:'var(--sap-text-faint)',fontSize:13}}>No stuck orders. ✓</div>
        ) : (
          <>
            <div style={{padding:'10px 20px',background:'var(--sap-bg-elevated)',borderBottom:'1px solid #f5f6f8',fontSize:11,color:'var(--sap-text-muted)'}}>
              Click Recover to verify with NOWPayments and complete activation. Orders confirmed-paid on their side will be activated; abandoned/expired orders refused.
            </div>
            {stuckOrders.orders.map(function(o) {
              return (
                <div key={o.id} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)'}}>
                      {o.internal_order_id} — {o.username || ('user ' + o.user_id)}
                    </div>
                    <div style={{fontSize:12,color:'var(--sap-text-faint)',marginTop:2}}>
                      {o.product_type}/{o.product_key} · ${o.price_usd.toFixed(2)} · status: {o.status} · {o.age_hours}h old
                    </div>
                  </div>
                  <button onClick={function() { recoverOrder(o.id); }} disabled={recovering === o.id}
                    style={{padding:'8px 16px',borderRadius:6,border:'none',background:recovering===o.id?'var(--sap-text-muted)':'var(--sap-accent)',color:'#fff',fontSize:13,fontWeight:700,cursor:recovering===o.id?'wait':'pointer',fontFamily:'inherit',flexShrink:0}}>
                    {recovering === o.id ? 'Recovering…' : 'Recover'}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function EmailAnalyticsTab() {
  var [data, setData] = useState(null);
  useEffect(function() { apiGet('/admin/api/email-analytics').then(setData).catch(function(){}); }, []);
  if (!data) return <Spin/>;

  var totals = data.totals || {};
  var c = data.costs || {};
  var ps = data.platform_stats || {};

  return (
    <div>
      <h3 style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,margin:'0 0 16px'}}>Email Delivery Analytics</h3>

      {/* Volume stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[
          {v:totals.today||0, l:'Sent today', c:'var(--sap-indigo)'},
          {v:totals.this_week||0, l:'This week', c:'var(--sap-accent)'},
          {v:(totals.this_month||0).toLocaleString(), l:'This month', c:'var(--sap-green)'},
          {v:(totals.all_time||0).toLocaleString(), l:'All time', c:'var(--sap-purple)'},
        ].map(function(s,i){return <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,textAlign:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:'var(--sap-text-secondary)',fontWeight:600,marginTop:4}}>{s.l}</div></div>;})}
      </div>

      {/* Cost analysis */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Brevo Cost Analysis</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Current tier</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:c.brevo_tier==='Free'?'var(--sap-green)':'var(--sap-amber)'}}>{c.brevo_tier}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Est. monthly cost</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-text-primary)'}}>${c.estimated_monthly_brevo}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Cost per email</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-text-primary)'}}>${c.cost_per_email}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Free cap</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-text-muted)'}}>{c.free_daily_cap}/day</div>
          </div>
        </div>
        {c.brevo_tier === 'Free' && <div style={{marginTop:12,padding:'10px 14px',background:'var(--sap-green-bg)',borderRadius:8,fontSize:12,color:'var(--sap-green-dark)',fontWeight:600}}>You are within the free tier. No Brevo charges this month.</div>}
        {c.brevo_tier !== 'Free' && <div style={{marginTop:12,padding:'10px 14px',background:'var(--sap-amber-bg)',borderRadius:8,fontSize:12,color:'var(--sap-amber-dark)',fontWeight:600}}>Volume exceeds free tier. Consider upgrading Brevo plan to avoid sending pauses.</div>}
      </div>

      {/* Platform stats */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Platform Email Stats</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Total leads</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-indigo)'}}>{ps.total_leads||0}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Nurturing</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-accent)'}}>{ps.leads_nurturing||0}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Active sequences</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-green)'}}>{ps.active_sequences||0}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Boost credits out</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-amber)'}}>{(ps.total_boost_credits||0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Top senders */}
      {data.top_senders && data.top_senders.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:20}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>Top Email Senders (30 days)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'var(--sap-bg-elevated)'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>User</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Emails sent</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Boost credits</th>
            </tr></thead>
            <tbody>
              {data.top_senders.map(function(s,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'var(--sap-text-primary)'}}>{s.name} <span style={{color:'var(--sap-text-faint)',fontWeight:400}}>@{s.username}</span></td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'var(--sap-indigo)'}}>{s.emails_sent}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'var(--sap-text-muted)'}}>{(s.boost_credits||0).toLocaleString()}</td>
              </tr>;})}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily chart — simple bar representation */}
      {data.daily_breakdown && data.daily_breakdown.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Daily Send Volume (30 days)</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:2,height:120}}>
            {(function(){
              var maxVal = Math.max.apply(null, data.daily_breakdown.map(function(d){return d.count;})) || 1;
              return data.daily_breakdown.map(function(d,i){
                var h = Math.max(4, (d.count / maxVal) * 100);
                return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}} title={d.date+': '+d.count+' emails'}>
                  <div style={{fontSize:13,color:'var(--sap-text-faint)',fontWeight:600}}>{d.count>0?d.count:''}</div>
                  <div style={{width:'100%',height:h,background:'linear-gradient(180deg,#6366f1,#818cf8)',borderRadius:'3px 3px 0 0',minHeight:4}}/>
                </div>;
              });
            })()}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:13,color:'var(--sap-text-faint)'}}>{data.daily_breakdown[0]?.date}</span>
            <span style={{fontSize:13,color:'var(--sap-text-faint)'}}>{data.daily_breakdown[data.daily_breakdown.length-1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SuperSceneAnalyticsTab() {
  var [data, setData] = useState(null);
  useEffect(function() { apiGet('/admin/api/superscene-analytics').then(setData).catch(function(){}); }, []);
  if (!data) return <Spin/>;

  var v = data.volume || {};
  var cr = data.credits || {};
  var fin = data.financials || {};

  return (
    <div>
      <h3 style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,margin:'0 0 16px'}}>Creative Studio Credit Analytics</h3>

      {/* Generation volume */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[
          {v:v.today||0, l:'Generations today', c:'var(--sap-purple)'},
          {v:v.this_week||0, l:'This week', c:'var(--sap-accent)'},
          {v:(v.this_month||0).toLocaleString(), l:'This month', c:'var(--sap-green)'},
          {v:(v.total||0).toLocaleString(), l:'All time', c:'var(--sap-indigo)'},
        ].map(function(s,i){return <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,textAlign:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:'var(--sap-text-secondary)',fontWeight:600,marginTop:4}}>{s.l}</div></div>;})}
      </div>

      {/* Financial overview */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Financial Overview</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
          <div style={{background:'var(--sap-green-bg)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-green-dark)',marginBottom:4}}>Revenue (month)</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-green-dark)'}}>${fin.revenue_this_month||0}</div>
          </div>
          <div style={{background:'var(--sap-red-bg)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-red)',marginBottom:4}}>Provider cost</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-red)'}}>${fin.estimated_provider_cost||0}</div>
          </div>
          <div style={{background:'#fff7ed',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#ea580c',marginBottom:4}}>Sponsor comms</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#ea580c'}}>${fin.sponsor_commissions||0}</div>
          </div>
          <div style={{background:'var(--sap-green-bg)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-green-dark)',marginBottom:4}}>Net margin</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-green-dark)'}}>${fin.estimated_margin||0}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Margin %</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:fin.margin_pct>=50?'var(--sap-green-dark)':fin.margin_pct>=20?'var(--sap-amber-dark)':'var(--sap-red)'}}>{fin.margin_pct||0}%</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Total revenue</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-text-primary)'}}>${fin.total_revenue||0}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Sell price/credit</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-text-primary)'}}>${cr.credit_sell_price||'0.22'}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Provider/credit</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-text-primary)'}}>${fin.provider_cost_per_credit||'0.08'}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Sponsor/credit</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-text-primary)'}}>${fin.sponsor_rate_per_credit||'0.025'}</div>
          </div>
        </div>
      </div>

      {/* Credit stats */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Credit Usage</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Used this month</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-purple)'}}>{(cr.used_this_month||0).toLocaleString()}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Used this week</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-accent)'}}>{(cr.used_this_week||0).toLocaleString()}</div>
          </div>
          <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>Total used (all time)</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-indigo)'}}>{(cr.total_used||0).toLocaleString()}</div>
          </div>
          <div style={{background:'var(--sap-amber-bg)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--sap-amber-dark)',marginBottom:4}}>Outstanding balance</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-amber-dark)'}}>{(cr.outstanding_balance||0).toLocaleString()}</div>
          </div>
        </div>
        {cr.outstanding_balance > 0 && <div style={{marginTop:10,padding:'10px 14px',background:'var(--sap-amber-bg)',borderRadius:8,fontSize:12,color:'#92400e',fontWeight:600}}>Outstanding credits represent your liability — credits purchased but not yet used. Est. cost to fulfil: ${((cr.outstanding_balance||0) * (fin.total_cost_per_credit||0.105)).toFixed(2)} (provider ${((cr.outstanding_balance||0) * (fin.provider_cost_per_credit||0.08)).toFixed(2)} + sponsor comms ${((cr.outstanding_balance||0) * (fin.sponsor_rate_per_credit||0.025)).toFixed(2)})</div>}
      </div>

      {/* Model usage breakdown */}
      {data.model_usage && data.model_usage.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:20}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>Model Usage (30 days)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'var(--sap-bg-elevated)'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Model</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Generations</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Credits used</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Est. cost</th>
            </tr></thead>
            <tbody>
              {data.model_usage.map(function(m,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'var(--sap-text-primary)'}}>{m.model}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'var(--sap-text-secondary)'}}>{m.generations}</td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'var(--sap-purple)'}}>{m.credits}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'var(--sap-text-secondary)'}}>${(m.credits * (fin.cost_per_credit||0.08)).toFixed(2)}</td>
              </tr>;})}
            </tbody>
          </table>
        </div>
      )}

      {/* Pack sales */}
      {data.pack_sales && data.pack_sales.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:20}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>Credit Pack Sales</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'var(--sap-bg-elevated)'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Pack</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Sales</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Credits sold</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Revenue</th>
            </tr></thead>
            <tbody>
              {data.pack_sales.map(function(p,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'var(--sap-text-primary)',textTransform:'capitalize'}}>{p.pack}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'var(--sap-text-secondary)'}}>{p.sales}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'var(--sap-purple)',fontWeight:600}}>{(p.credits_sold||0).toLocaleString()}</td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'var(--sap-green-dark)'}}>${p.revenue.toFixed(2)}</td>
              </tr>;})}
            </tbody>
          </table>
        </div>
      )}

      {/* Top users */}
      {data.top_users && data.top_users.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:20}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>Top Users (30 days)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'var(--sap-bg-elevated)'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>User</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Generations</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Credits used</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13}}>Remaining</th>
            </tr></thead>
            <tbody>
              {data.top_users.map(function(u,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'var(--sap-text-primary)'}}>{u.name} <span style={{color:'var(--sap-text-faint)',fontWeight:400}}>@{u.username}</span></td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'var(--sap-text-secondary)'}}>{u.generations}</td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'var(--sap-purple)'}}>{u.credits_used}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'var(--sap-text-muted)'}}>{u.credits_remaining}</td>
              </tr>;})}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily chart */}
      {data.daily_breakdown && data.daily_breakdown.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Daily Generation Volume (30 days)</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:2,height:120}}>
            {(function(){
              var maxVal = Math.max.apply(null, data.daily_breakdown.map(function(d){return d.credits;})) || 1;
              return data.daily_breakdown.map(function(d,i){
                var h = Math.max(4, (d.credits / maxVal) * 100);
                return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}} title={d.date+': '+d.generations+' gens, '+d.credits+' credits'}>
                  <div style={{fontSize:13,color:'var(--sap-text-faint)',fontWeight:600}}>{d.credits>0?d.credits:''}</div>
                  <div style={{width:'100%',height:h,background:'linear-gradient(180deg,#8b5cf6,#a78bfa)',borderRadius:'3px 3px 0 0',minHeight:4}}/>
                </div>;
              });
            })()}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:13,color:'var(--sap-text-faint)'}}>{data.daily_breakdown[0]?.date}</span>
            <span style={{fontSize:13,color:'var(--sap-text-faint)'}}>{data.daily_breakdown[data.daily_breakdown.length-1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-red)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }

function PaidActivation(props) {
  var [tier, setTier] = useState('founder');
  var [months, setMonths] = useState(1);
  var [bankRef, setBankRef] = useState('');
  var [activating, setActivating] = useState(false);

  var amountReceived = tier === 'founder' ? 15 : (20 * months);
  var sponsorGets = tier === 'founder' ? 10 : (10 * months);
  var companyGets = tier === 'founder' ? 5 : (10 * months);
  // Founders pay $15/month (price locked for life, never the term). Partners
  // can be activated for 1/3/6/9/12 months upfront. The "lifetime" descriptor
  // belongs on the price, not on the membership duration.
  var durationLabel = tier === 'founder'
    ? '1 month at $15 (price locked for life)'
    : (months === 12 ? '1 year' : months + ' months');

  function activate() {
    if (activating) return;
    var msg = 'Activate @' + props.username + ' as ' + tier.toUpperCase() +
      ' (' + durationLabel + ')?\n\n' +
      '$' + amountReceived + ' received via bank transfer\n' +
      'Sponsor gets $' + sponsorGets + '\n' +
      'Company retains $' + companyGets;
    if (!window.confirm(msg)) return;
    setActivating(true);
    var body = { tier: tier, months: months };
    if (bankRef.trim()) body.bank_reference = bankRef.trim();
    apiPost('/admin/api/user/' + props.userId + '/activate-paid-membership', body)
      .then(function(r) {
        if (r.success) props.onDone(r.message || 'Activated');
        else props.onDone(r.error || r.detail || 'Failed');
        setActivating(false);
      })
      .catch(function(e) { props.onDone(e.message || 'Failed'); setActivating(false); });
  }

  return (
    <div style={{borderTop:'1px solid #e2e8f0',paddingTop:12,marginTop:4,marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>💳 Activate Paid Membership</div>
      <div style={{fontSize:11,color:'var(--sap-text-faint)',marginBottom:8,fontStyle:'italic'}}>
        For real money received via bank transfer or off-platform payment. Triggers sponsor commission.
      </div>
      <div style={{display:'flex',gap:6,marginBottom:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:'var(--sap-text-faint)',marginBottom:3}}>Tier</div>
          <div style={{display:'flex',gap:4}}>
            {['founder','partner'].map(function(t) {
              return <button key={t} onClick={function() { setTier(t); }}
                style={{flex:1,padding:'7px 0',borderRadius:6,border:'1px solid ' + (tier===t?'#f59e0b':'var(--sap-border)'),
                  background:tier===t?(t==='founder'?'#f59e0b':'var(--sap-purple)'):'#fff',
                  color:tier===t?'#fff':'var(--sap-text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase'}}>
                {t}
              </button>;
            })}
          </div>
        </div>
        {tier === 'partner' && (
          <div style={{flex:1.5}}>
            <div style={{fontSize:13,color:'var(--sap-text-faint)',marginBottom:3}}>Months</div>
            <div style={{display:'flex',gap:3}}>
              {[1,3,6,9,12].map(function(m) {
                return <button key={m} onClick={function() { setMonths(m); }}
                  style={{flex:1,padding:'7px 0',borderRadius:6,border:'1px solid ' + (months===m?'var(--sap-purple)':'var(--sap-border)'),
                    background:months===m?'var(--sap-purple)':'#fff',color:months===m?'#fff':'var(--sap-text-muted)',
                    fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {m === 12 ? '1yr' : m + 'mo'}
                </button>;
              })}
            </div>
          </div>
        )}
        {tier === 'founder' && (
          <div style={{flex:1.5,display:'flex',alignItems:'flex-end'}}>
            <div style={{padding:'7px 10px',borderRadius:6,background:'#fef3c7',color:'#92400e',fontSize:12,fontWeight:700,width:'100%',textAlign:'center'}}>
              ★ $15/month · price locked for life
            </div>
          </div>
        )}
      </div>
      <input
        value={bankRef}
        onChange={function(e) { setBankRef(e.target.value); }}
        placeholder="Bank reference (optional, for your audit trail)"
        style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid var(--sap-border)',fontSize:12,fontFamily:'inherit',marginBottom:8,boxSizing:'border-box'}}
      />
      <div style={{fontSize:11,color:'var(--sap-text-faint)',marginBottom:8,textAlign:'center'}}>
        Received: <strong>${amountReceived}</strong> · Sponsor gets: <strong>${sponsorGets}</strong> · Company retains: <strong>${companyGets}</strong>
      </div>
      <button onClick={activate} disabled={activating}
        style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:activating?'default':'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
          background: tier === 'founder' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
          color:'#fff',opacity:activating?.6:1}}>
        {activating ? 'Activating...' : '💳 Activate ' + tier.toUpperCase() + ' (' + durationLabel + ') · $' + amountReceived + ' received'}
      </button>
    </div>
  );
}


function GiftMembership(props) {
  var [tier, setTier] = useState('partner');
  var [months, setMonths] = useState(1);
  var [gifting, setGifting] = useState(false);

  var durationLabel = tier === 'founder'
    ? '1 month free, then $15/mo'
    : (months === 12 ? '1 year' : months + ' months');

  function gift() {
    if (gifting) return;
    if (!window.confirm('Gift ' + tier.toUpperCase() + ' membership (' + durationLabel + ') to @' + props.username + '?\n\nNo commission paid. No Payment record. Founder gifts do NOT consume a founding spot.')) return;
    setGifting(true);
    apiPost('/admin/api/user/' + props.userId + '/gift-membership', { tier: tier, months: months })
      .then(function(r) {
        if (r.success) props.onDone(r.message || 'Membership gifted');
        else props.onDone(r.error || r.detail || 'Failed');
        setGifting(false);
      })
      .catch(function(e) { props.onDone(e.message || 'Failed'); setGifting(false); });
  }

  return (
    <div style={{borderTop:'1px solid #e2e8f0',paddingTop:12,marginTop:4}}>
      <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>🎁 Gift Free Membership</div>
      <div style={{fontSize:11,color:'var(--sap-text-faint)',marginBottom:8,fontStyle:'italic'}}>
        For influencers, team, or promo. No commission paid. Founder gifts bypass the 100-spot cap.
      </div>
      <div style={{display:'flex',gap:6,marginBottom:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:'var(--sap-text-faint)',marginBottom:3}}>Tier</div>
          <div style={{display:'flex',gap:4}}>
            {['founder','partner'].map(function(t) {
              return <button key={t} onClick={function() { setTier(t); }}
                style={{flex:1,padding:'7px 0',borderRadius:6,border:'1px solid ' + (tier===t?'#f59e0b':'var(--sap-border)'),
                  background:tier===t?(t==='founder'?'#f59e0b':'var(--sap-purple)'):'#fff',
                  color:tier===t?'#fff':'var(--sap-text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase'}}>
                {t}
              </button>;
            })}
          </div>
        </div>
        {tier === 'partner' && (
          <div style={{flex:1.5}}>
            <div style={{fontSize:13,color:'var(--sap-text-faint)',marginBottom:3}}>Months</div>
            <div style={{display:'flex',gap:3}}>
              {[1,3,6,9,12].map(function(m) {
                return <button key={m} onClick={function() { setMonths(m); }}
                  style={{flex:1,padding:'7px 0',borderRadius:6,border:'1px solid ' + (months===m?'var(--sap-purple)':'var(--sap-border)'),
                    background:months===m?'var(--sap-purple)':'#fff',color:months===m?'#fff':'var(--sap-text-muted)',
                    fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {m === 12 ? '1yr' : m + 'mo'}
                </button>;
              })}
            </div>
          </div>
        )}
        {tier === 'founder' && (
          <div style={{flex:1.5,display:'flex',alignItems:'flex-end'}}>
            <div style={{padding:'7px 10px',borderRadius:6,background:'#fef3c7',color:'#92400e',fontSize:12,fontWeight:700,width:'100%',textAlign:'center'}}>
              ★ 1 month free · then $15/mo
            </div>
          </div>
        )}
      </div>
      <button onClick={gift} disabled={gifting}
        style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:gifting?'default':'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
          background: tier === 'founder' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
          color:'#fff',opacity:gifting?.6:1}}>
        {gifting ? 'Gifting...' : '🎁 Gift ' + tier.toUpperCase() + ' (' + durationLabel + ') to @' + props.username}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// GRID ACTIVATION — manual one-off activation of a Campaign Tier grid
// for a member who paid via a path that didn't auto-activate (e.g.
// member sent USDT direct to treasury without going through the WC
// order flow, or admin manually upgraded them after a failed payment).
//
// Backend: POST /admin/diagnostic/manual-grid-activation/{user_id}/{tier}
//   - Admin-session gated (no secret required as of 13 May 2026)
//   - Two idempotency guards: refuses if member already has active
//     campaign at this tier, refuses if a manual_recovery Payment
//     row already exists.
//   - Calls process_tier_purchase — the same function the normal IPN
//     payment flow uses — so upline commissions cascade identically.
//   - Writes an admin_repair_log audit row recording the admin who
//     triggered, target user, tier, price, grids filled.
//
// Prices per tier match docs/commission-spec.md section 2:
//   1=$20, 2=$50, 3=$100, 4=$200, 5=$400, 6=$600, 7=$800, 8=$1000
//
// UX: tier selector pills + a confirmation modal with the price spelled
// out (activating a Tier 8 by accident would mean cascading $1000 of
// commissions into the network, so make the confirmation explicit).
// ──────────────────────────────────────────────────────────────────
var GRID_TIER_PRICES = {1:20,2:50,3:100,4:200,5:400,6:600,7:800,8:1000};

function GridActivation(props) {
  var [tier, setTier] = useState(1);
  var [activating, setActivating] = useState(false);

  function activate() {
    if (activating) return;
    var price = GRID_TIER_PRICES[tier];
    var confirmMsg = (
      'Activate Grid Tier ' + tier + ' ($' + price + ' value) for @' + props.username + '?\n\n' +
      'This will:\n' +
      '  • Create a campaign for them at Tier ' + tier + '\n' +
      '  • Cascade direct + uni-level commissions to their upline\n' +
      '  • Record a manual-recovery Payment row\n' +
      '  • Write an audit log entry under your admin username\n\n' +
      'Cannot be undone without DB intervention. Continue?'
    );
    if (!window.confirm(confirmMsg)) return;
    setActivating(true);
    // Note encoded as query string since the endpoint takes it as a query param.
    var note = 'Admin UI activation by admin user, tier ' + tier;
    var url = '/admin/diagnostic/manual-grid-activation/' + props.userId + '/' + tier +
              '?note=' + encodeURIComponent(note);
    fetch(url, { method: 'POST', credentials: 'include' })
      .then(function(r) { return r.json(); })
      .then(function(r) {
        if (r.status === 'activated') {
          var gridsFilled = (r.process_tier_purchase_result && r.process_tier_purchase_result.grids_filled) || [];
          var msg = 'Grid Tier ' + tier + ' activated for @' + props.username + '. ';
          if (gridsFilled.length) {
            msg += gridsFilled.length + ' upline grid(s) filled.';
          }
          props.onDone(msg);
        } else if (r.error) {
          props.onDone('Activation refused: ' + r.error);
        } else {
          props.onDone('Activation completed with unexpected response — check audit log');
        }
        setActivating(false);
      })
      .catch(function(e) {
        props.onDone('Activation failed: ' + (e.message || 'network error'));
        setActivating(false);
      });
  }

  return (
    <div style={{borderTop:'1px solid #e2e8f0',paddingTop:12,marginTop:12}}>
      <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:8}}>🎯 Activate Campaign Grid Tier</div>
      <div style={{fontSize:11,color:'var(--sap-text-faint)',marginBottom:8,lineHeight:1.4}}>
        For members who paid via a path that didn't auto-activate. Routes through the same
        commission cascade as a normal payment.
      </div>
      <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
        {[1,2,3,4,5,6,7,8].map(function(t) {
          var price = GRID_TIER_PRICES[t];
          var sel = tier === t;
          return (
            <button key={t} onClick={function() { setTier(t); }}
              style={{
                flex:'1 1 calc(25% - 4px)', minWidth:60, padding:'8px 4px',
                borderRadius:6,
                border:'1px solid ' + (sel ? 'var(--sap-purple)' : 'var(--sap-border)'),
                background: sel ? 'var(--sap-purple)' : '#fff',
                color: sel ? '#fff' : 'var(--sap-text-muted)',
                fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                display:'flex', flexDirection:'column', gap:2, lineHeight:1.1
              }}>
              <span>T{t}</span>
              <span style={{fontSize:10,fontWeight:500,opacity:0.85}}>${price}</span>
            </button>
          );
        })}
      </div>
      <button onClick={activate} disabled={activating}
        style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:activating?'default':'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
          background:'linear-gradient(135deg,#0ea5e9,#0284c7)',color:'#fff',opacity:activating?.6:1}}>
        {activating ? 'Activating...' : '🎯 Activate Tier ' + tier + ' ($' + GRID_TIER_PRICES[tier] + ' value) for @' + props.username}
      </button>
    </div>
  );
}
