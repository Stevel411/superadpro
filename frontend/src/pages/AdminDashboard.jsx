import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { Shield, Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle, XCircle, Search, ChevronRight, Eye, Ban, CreditCard, Activity, FileText, UserCheck, Clock, RefreshCw, ArrowUpDown, Mail, Sparkles } from 'lucide-react';
import { formatMoney } from '../utils/money';

var TABS = [
  {key:'overview',label:'Overview',icon:Activity},
  {key:'users',label:'Users',icon:Users},
  {key:'moderation',label:'Moderation',icon:Eye},
  {key:'finances',label:'Finances',icon:DollarSign},
  {key:'withdrawals',label:'Withdrawals',icon:CreditCard},
  {key:'kyc',label:'KYC Queue',icon:UserCheck},
  {key:'commissions',label:'Commissions',icon:TrendingUp},
  {key:'supermarket',label:'SuperMarket',icon:Shield},
  {key:'email',label:'Email Analytics',icon:Mail},
  {key:'superscene',label:'SuperScene',icon:Sparkles},
  {key:'health',label:'System Health',icon:Shield},
];

export default function AdminDashboard() {
  var [tab, setTab] = useState('overview');
  return (
    <AppLayout title="Admin Dashboard" subtitle="Platform Management — Owner Access">
      <div className="admin-tabs" style={{display:'flex',gap:6,marginBottom:24,borderBottom:'2px solid #e8ecf2',paddingBottom:0,flexWrap:'wrap'}}>
        {TABS.map(function(t) {
          var Icon = t.icon;
          var on = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              style={{display:'flex',alignItems:'center',gap:5,padding:'10px 16px',fontSize:12,fontWeight:on?800:600,
                border:'none',borderBottom:on?'3px solid #dc2626':'3px solid transparent',
                cursor:'pointer',fontFamily:'inherit',background:on?'rgba(220,38,38,.04)':'transparent',
                color:on?'#dc2626':'#94a3b8',marginBottom:-2,borderRadius:'6px 6px 0 0',transition:'all .15s'}}>
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
      {tab === 'supermarket' && <SuperMarketTab/>}
      {tab === 'email' && <EmailAnalyticsTab/>}
      {tab === 'superscene' && <SuperSceneAnalyticsTab/>}
      {tab === 'health' && <HealthTab/>}
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════

function OverviewTab() {
  var [data, setData] = useState(null);
  var [health, setHealth] = useState(null);
  useEffect(function() {
    apiGet('/admin/api/finances').then(setData).catch(function(){});
    apiGet('/admin/api/health').then(setHealth).catch(function(){});
  }, []);
  if (!data) return <Spin/>;

  var stats = [
    {label:'Total Members',value:data.total_users||0,color:'#0ea5e9',icon:Users},
    {label:'Active Members',value:data.active_users||0,color:'#16a34a',icon:CheckCircle},
    {label:'Total Revenue',value:'$'+(data.total_revenue||0).toLocaleString(),color:'#8b5cf6',icon:DollarSign},
    {label:'Commissions Paid',value:'$'+(data.total_commissions_paid||0).toLocaleString(),color:'#f59e0b',icon:TrendingUp},
    {label:'Pending Withdrawals',value:data.pending_withdrawals_count||0,color:'#dc2626',icon:Clock},
    {label:'Active Grids',value:data.active_grids||0,color:'#0ea5e9',icon:Activity},
  ];

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        {stats.map(function(s,i) {
          var Icon = s.icon;
          return (
            <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:12,right:12,width:36,height:36,borderRadius:10,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={18} color={s.color}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginTop:2}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* System health quick view */}
      {health && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#1c223d',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>System Health</div>
          </div>
          <div style={{padding:'16px 20px'}}>
            {(health.checks || []).map(function(c,i) {
              var color = c.status === 'ok' ? '#16a34a' : c.status === 'warn' ? '#f59e0b' : '#dc2626';
              return (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:i<(health.checks||[]).length-1?'1px solid #f5f6f8':'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
                    <span style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{c.name}</span>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:color,textTransform:'uppercase'}}>{c.detail || c.status}</span>
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
  var [search, setSearch] = useState('');
  var [selected, setSelected] = useState(null);
  var [detail, setDetail] = useState(null);
  var [adjustAmt, setAdjustAmt] = useState('');
  var [adjustReason, setAdjustReason] = useState('');
  var [msg, setMsg] = useState('');

  function loadUsers() {
    apiGet('/admin/api/users').then(function(d) { setUsers(d.users || []); }).catch(function(){});
  }

  useEffect(function() { loadUsers(); }, []);

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
    });
  }

  var filtered = users.filter(function(u) {
    if (!search) return true;
    var s = search.toLowerCase();
    return (u.username||'').toLowerCase().includes(s) || (u.email||'').toLowerCase().includes(s) || (u.first_name||'').toLowerCase().includes(s) || String(u.id).includes(s);
  });

  return (
    <div style={{display:'grid',gridTemplateColumns:selected?'1fr 1fr':'1fr',gap:16}}>
      {/* User list */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
        <div style={{background:'#1c223d',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Members ({users.length})</div>
        </div>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #e8ecf2'}}>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:12,top:10,color:'#94a3b8'}}/>
            <input value={search} onChange={function(e) { setSearch(e.target.value); }}
              placeholder="Search by name, email, username, ID..."
              style={{width:'100%',padding:'8px 12px 8px 34px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>
        <div style={{maxHeight:500,overflowY:'auto'}}>
          {filtered.slice(0,50).map(function(u) {
            var isActive = u.is_active;
            var isSel = selected === u.id;
            return (
              <div key={u.id} onClick={function() { openUser(u.id); }}
                style={{padding:'10px 16px',borderBottom:'1px solid #f5f6f8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:isSel?'rgba(14,165,233,.04)':'transparent',transition:'background .1s'}}
                onMouseEnter={function(e) { if (!isSel) e.currentTarget.style.background='#f8f9fb'; }}
                onMouseLeave={function(e) { if (!isSel) e.currentTarget.style.background='transparent'; }}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'#e8ecf2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#64748b'}}>
                    {((u.first_name||'')[0]||'')+(((u.last_name||u.username||'')[0])||'')}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{u.first_name || u.username} {u.last_name || ''}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>@{u.username} · ID: {u.id}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,background:isActive?'#dcfce7':'#fef2f2',color:isActive?'#16a34a':'#dc2626'}}>{isActive?'Active':'Inactive'}</span>
                  {u.membership_tier === 'pro' && <span style={{fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(139,92,246,.1)',color:'#8b5cf6'}}>PRO</span>}
                  {(!u.membership_tier || u.membership_tier === 'basic') && <span style={{fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(14,165,233,.1)',color:'#0ea5e9'}}>BASIC</span>}
                  <span style={{fontSize:10,fontWeight:700,color:'#0ea5e9'}}>${(u.balance||0).toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User detail */}
      {selected && detail && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {msg && <div style={{padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:700,background:msg.includes('adjust')||msg.includes('toggle')?'#dcfce7':'#fef2f2',color:msg.includes('adjust')||msg.includes('toggle')?'#16a34a':'#dc2626'}}>{msg}</div>}

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'#1c223d',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{detail.first_name || detail.username} {detail.last_name || ''}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>@{detail.username} · SAP-{String(detail.id).padStart(5,'0')}</div>
              </div>
              <button onClick={function(){setSelected(null);setDetail(null);}} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:6,color:'#fff',fontSize:11,fontWeight:700,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>✕ Close</button>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12}}>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Email:</span> <span style={{color:'#0f172a'}}>{detail.email}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Tier:</span> <span style={{color:'#0f172a',textTransform:'capitalize'}}>{detail.membership_tier || 'basic'}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Balance:</span> <span style={{color:'#16a34a',fontWeight:800}}>${formatMoney(detail.balance)}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Total Earned:</span> <span style={{color:'#0ea5e9',fontWeight:800}}>${formatMoney(detail.total_earned)}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Status:</span> <span style={{color:detail.is_active?'#16a34a':'#dc2626',fontWeight:700}}>{detail.is_active?'Active':'Inactive'}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Sponsor:</span> <span style={{color:'#0f172a'}}>{detail.sponsor_username ? '@'+detail.sponsor_username+' (ID '+detail.sponsor_id+')' : 'Direct'}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Referrals:</span> <span style={{color:'#0f172a'}}>{detail.personal_referrals || 0}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>Joined:</span> <span style={{color:'#0f172a'}}>{detail.created_at ? new Date(detail.created_at).toLocaleDateString('en-GB') : '—'}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>KYC:</span> <span style={{color:'#0f172a',textTransform:'capitalize'}}>{detail.kyc_status || 'none'}</span></div>
                <div><span style={{fontWeight:700,color:'#64748b'}}>2FA:</span> <span style={{color:detail.two_factor_enabled?'#16a34a':'#94a3b8'}}>{detail.two_factor_enabled?'Enabled':'Off'}</span></div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'#1c223d',padding:'14px 20px'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Actions</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              {/* Toggle active */}
              <button onClick={toggleActive}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
                  background:detail.is_active?'#fef2f2':'#dcfce7',color:detail.is_active?'#dc2626':'#16a34a',marginBottom:8}}>
                {detail.is_active ? '⛔ Deactivate Account' : '✅ Activate Account'}
              </button>

              {/* Change tier */}
              {!detail.is_admin && (
                <button onClick={function() {
                  var newTier = (detail.membership_tier || 'basic') === 'pro' ? 'basic' : 'pro';
                  if (!window.confirm('Change ' + detail.username + ' to ' + newTier.toUpperCase() + '?')) return;
                  apiPost('/admin/api/user/' + selected + '/change-tier', {tier: newTier}).then(function(r) {
                    setMsg(r.success ? 'Tier changed to ' + newTier : (r.error || 'Failed'));
                    openUser(selected); loadUsers();
                  });
                }}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
                  background:(detail.membership_tier||'basic')==='pro'?'#fef3c7':'#ede9fe',color:(detail.membership_tier||'basic')==='pro'?'#d97706':'#7c3aed',marginBottom:8}}>
                  {(detail.membership_tier||'basic')==='pro' ? '⬇ Downgrade to Basic' : '⬆ Upgrade to Pro'}
                </button>
              )}

              {/* Delete user */}
              {!detail.is_admin && (
                <button onClick={function() {
                  if (!window.confirm('PERMANENTLY DELETE ' + detail.username + '? This cannot be undone.')) return;
                  apiDelete('/admin/api/user/' + selected).then(function(r) {
                    if (r.ok) { setMsg('User deleted'); setSelected(null); setDetail(null); loadUsers(); }
                    else setMsg(r.error || 'Delete failed');
                  }).catch(function(e) { setMsg(e.message || 'Delete failed'); });
                }}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid #fecaca',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:'#fff',color:'#dc2626',marginBottom:12}}>
                  🗑 Delete User Permanently
                </button>
              )}

              {/* Gift Membership */}
              {!detail.is_admin && <GiftMembership userId={selected} username={detail.username} onDone={function(m) { setMsg(m); openUser(selected); loadUsers(); }}/>}

              {/* Adjust balance */}
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6}}>Adjust Balance</div>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                <input value={adjustAmt} onChange={function(e) { setAdjustAmt(e.target.value); }}
                  placeholder="Amount (+ or -)" type="number" step="0.01"
                  style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
                <input value={adjustReason} onChange={function(e) { setAdjustReason(e.target.value); }}
                  placeholder="Reason"
                  style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
              </div>
              <button onClick={adjustBalance}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:'#0ea5e9',color:'#fff'}}>
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

  if (loading) return <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Loading...</div>;

  return (
    <div>
      {msg && <div style={{padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:700,background:'#dcfce7',color:'#16a34a',marginBottom:16}}>{msg}</div>}

      <div style={{fontSize:13,fontWeight:700,color:'#64748b',marginBottom:16}}>
        {queue.total === 0 ? '✅ Nothing to review — all content is approved' : queue.total + ' item' + (queue.total !== 1 ? 's' : '') + ' awaiting review'}
      </div>

      {queue.ads.length > 0 && (
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,fontWeight:800,color:'#10b981',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📋 Classified Ads ({queue.ads.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {queue.ads.map(function(a) {
              return (
                <div key={a.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{a.title}</div>
                      <div style={{fontSize:12,color:'#64748b',lineHeight:1.5,marginBottom:6}}>{a.description}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>
                        {a.category} · by @{a.owner} · {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB') : ''}
                      </div>
                      {a.link_url && <div style={{fontSize:11,color:'#0ea5e9',marginTop:4}}>{a.link_url}</div>}
                      {a.keywords && <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Keywords: {a.keywords}</div>}
                    </div>
                    {a.image_url && <img src={a.image_url} alt="" style={{width:80,height:60,objectFit:'cover',borderRadius:6,flexShrink:0}} />}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button onClick={function(){approve('ad',a.id);}} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#16a34a',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✅ Approve</button>
                    <button onClick={function(){reject('ad',a.id);}} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>❌ Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {queue.banners.length > 0 && (
        <div>
          <div style={{fontSize:12,fontWeight:800,color:'#f59e0b',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>🖼️ Banner Ads ({queue.banners.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {queue.banners.map(function(b) {
              return (
                <div key={b.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:16}}>
                  <div style={{display:'flex',gap:16,alignItems:'center'}}>
                    {b.image_url && <img src={b.image_url} alt="" style={{maxWidth:200,maxHeight:100,objectFit:'contain',borderRadius:6,flexShrink:0,background:'#f1f5f9'}} />}
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{b.title}</div>
                      {b.description && <div style={{fontSize:12,color:'#64748b',marginBottom:4}}>{b.description}</div>}
                      <div style={{fontSize:11,color:'#94a3b8'}}>{b.size} · {b.category} · by @{b.owner}</div>
                      {b.link_url && <div style={{fontSize:11,color:'#0ea5e9',marginTop:4}}>{b.link_url}</div>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button onClick={function(){approve('banner',b.id);}} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#16a34a',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✅ Approve</button>
                    <button onClick={function(){reject('banner',b.id);}} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>❌ Reject</button>
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
          {label:'Total Revenue',value:'$'+(data.total_revenue||0).toLocaleString(),color:'#16a34a'},
          {label:'Commissions Paid',value:'$'+(data.total_commissions_paid||0).toLocaleString(),color:'#f59e0b'},
          {label:'Pending Payouts',value:'$'+(data.pending_payouts||0).toLocaleString(),color:'#dc2626'},
          {label:'Platform Earnings',value:'$'+(data.platform_revenue||0).toLocaleString(),color:'#8b5cf6'},
        ].map(function(s,i) {
          return (
            <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {data.recent_payments && data.recent_payments.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#1c223d',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Recent Payments</div>
          </div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            {data.recent_payments.map(function(p,i) {
              return (
                <div key={i} style={{padding:'10px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{p.username || 'User #'+p.user_id}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{p.type || 'payment'} · {p.date || '—'}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:'#16a34a'}}>${formatMoney(p.amount)}</div>
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
          <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#dc2626'}}>{pending.length}</div>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8'}}>Pending Withdrawals</div>
        </div>
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#16a34a'}}>{completed.length}</div>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8'}}>Processed</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:16}}>
          <div style={{background:'#dc2626',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Pending — Requires Action</div>
          </div>
          {pending.map(function(w,i) {
            return (
              <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{w.username || 'User #'+w.user_id}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>Wallet: {(w.wallet_address||'').slice(0,20)}... · {w.date || '—'}</div>
                </div>
                <div style={{fontSize:16,fontWeight:800,color:'#dc2626'}}>${formatMoney(w.amount)}</div>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#1c223d',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Processed Withdrawals</div>
          </div>
          <div style={{maxHeight:300,overflowY:'auto'}}>
            {completed.slice(0,20).map(function(w,i) {
              return (
                <div key={i} style={{padding:'10px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{w.username || 'User #'+w.user_id}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{w.date || '—'}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#16a34a'}}>${formatMoney(w.amount)}</span>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,background:'#dcfce7',color:'#16a34a',textTransform:'capitalize'}}>{w.status}</span>
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
      {msg && <div style={{padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:700,background:'#dcfce7',color:'#16a34a',marginBottom:14}}>{msg}</div>}

      {pending.length > 0 ? (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#f59e0b',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>KYC Verification Queue ({pending.length})</div>
          </div>
          {pending.map(function(u,i) {
            return (
              <div key={u.id} style={{padding:'16px 20px',borderBottom:'1px solid #f5f6f8'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{u.first_name||''} {u.last_name||''} <span style={{fontWeight:400,color:'#94a3b8'}}>@{u.username}</span></div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{u.email}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={function() { reviewKYC(u.id, 'approve'); }}
                      style={{padding:'8px 18px',borderRadius:8,border:'none',background:'#16a34a',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      ✓ Approve
                    </button>
                    <button onClick={function() { reviewKYC(u.id, 'reject'); }}
                      style={{padding:'8px 18px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      ✗ Reject
                    </button>
                  </div>
                </div>
                <div style={{display:'flex',gap:16,fontSize:11,color:'#475569',flexWrap:'wrap'}}>
                  <span><strong>ID Type:</strong> {(u.kyc_id_type||'—').replace('_',' ')}</span>
                  <span><strong>DOB:</strong> {u.kyc_dob||'—'}</span>
                  <span><strong>Country:</strong> {u.country||'—'}</span>
                  <span><strong>Submitted:</strong> {u.submitted_at ? new Date(u.submitted_at).toLocaleDateString('en-GB') : '—'}</span>
                  {u.kyc_id_filename && (
                    <a href={'/admin/api/kyc-document/'+u.kyc_id_filename} target="_blank" rel="noopener noreferrer"
                      style={{color:'#0ea5e9',fontWeight:700,textDecoration:'none'}}>
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
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>KYC queue is clear</div>
          <div style={{fontSize:13,color:'#94a3b8'}}>No pending verifications</div>
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
          {label:'Total Commissions',value:data.total_count||0,color:'#0ea5e9'},
          {label:'Total Paid',value:'$'+(data.total_amount||0).toLocaleString(),color:'#16a34a'},
          {label:'This Month',value:'$'+(data.this_month||0).toLocaleString(),color:'#8b5cf6'},
          {label:'Avg Per Member',value:'$'+(data.avg_per_member||0).toFixed(0),color:'#f59e0b'},
        ].map(function(s,i) {
          return (
            <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {data.recent && data.recent.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#1c223d',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Recent Commissions</div>
          </div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            {data.recent.map(function(c,i) {
              var typeColors = {membership:'#16a34a',grid:'#0ea5e9',course:'#8b5cf6',platform:'#64748b'};
              return (
                <div key={i} style={{padding:'10px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,background:(typeColors[c.type]||'#64748b')+'15',color:typeColors[c.type]||'#64748b',textTransform:'uppercase'}}>{c.type}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{c.to_username || 'User #'+c.to_user_id}</span>
                    <span style={{fontSize:10,color:'#94a3b8'}}>from {c.from_username || 'User #'+c.from_user_id}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:'#16a34a'}}>${formatMoney(c.amount)}</span>
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
// ══════════════════════════════════════════════════════════
// SUPERMARKET PRODUCT REVIEW
// ══════════════════════════════════════════════════════════

function SuperMarketTab() {
  var [products, setProducts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [acting, setActing] = useState('');
  var [rejectId, setRejectId] = useState(null);
  var [rejectReason, setRejectReason] = useState('');

  function load() {
    apiGet('/api/supermarket/admin/pending').then(function(d) { setProducts(d.products || []); setLoading(false); }).catch(function() { setLoading(false); });
  }
  useEffect(function() { load(); }, []);

  function approve(id) {
    setActing('approve-' + id);
    apiPost('/api/supermarket/admin/review/' + id, { action: 'approve' }).then(function() { load(); setActing(''); }).catch(function() { setActing(''); });
  }
  function reject(id) {
    setActing('reject-' + id);
    apiPost('/api/supermarket/admin/review/' + id, { action: 'reject', reason: rejectReason }).then(function() { load(); setActing(''); setRejectId(null); setRejectReason(''); }).catch(function() { setActing(''); });
  }

  if (loading) return <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Loading...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>SuperMarket Product Review</div>
          <div style={{fontSize:12,color:'#94a3b8'}}>{products.length} product{products.length !== 1 ? 's' : ''} pending review</div>
        </div>
      </div>

      {products.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',background:'#f8f9fb',borderRadius:12}}>
          <div style={{fontSize:32,opacity:.3,marginBottom:8}}>✅</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>All clear</div>
          <div style={{fontSize:12,color:'#94a3b8'}}>No products waiting for review</div>
        </div>
      ) : products.map(function(p) {
        return (
          <div key={p.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,marginBottom:12,overflow:'hidden'}}>
            <div style={{display:'flex',gap:16,padding:'16px 20px'}}>
              <div style={{width:120,height:80,borderRadius:8,background:'linear-gradient(135deg,#0b1729,#132240)',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {p.banner_url ? <img src={p.banner_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <span style={{fontSize:28,opacity:.2}}>📦</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:2}}>{p.title}</div>
                <div style={{fontSize:12,color:'#94a3b8',marginBottom:4}}>by {p.creator_name} · {p.category} · ${parseFloat(p.price).toFixed(0)}</div>
                <div style={{fontSize:12,color:'#475569',lineHeight:1.6}}>{(p.short_description || '').slice(0, 150)}</div>
                {p.file_name && <div style={{fontSize:10,color:'#10b981',fontWeight:700,marginTop:4}}>📎 {p.file_name}</div>}
                {p.ai_review && (
                  <div style={{display:'flex',gap:8,marginTop:6}}>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:p.ai_review.quality_score>=60?'#dcfce7':'#fef3c7',color:p.ai_review.quality_score>=60?'#16a34a':'#d97706'}}>Quality: {p.ai_review.quality_score}/100</span>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:p.ai_review.copyright_risk==='low'?'#dcfce7':p.ai_review.copyright_risk==='medium'?'#fef3c7':'#fef2f2',color:p.ai_review.copyright_risk==='low'?'#16a34a':p.ai_review.copyright_risk==='medium'?'#d97706':'#dc2626'}}>Copyright: {p.ai_review.copyright_risk}</span>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:p.ai_review.plagiarism_score<20?'#dcfce7':'#fef3c7',color:p.ai_review.plagiarism_score<20?'#16a34a':'#d97706'}}>Plagiarism: {p.ai_review.plagiarism_score}%</span>
                    {p.ai_review.summary && <span style={{fontSize:9,color:'#64748b',fontStyle:'italic'}}>{p.ai_review.summary}</span>}
                  </div>
                )}
                {p.ai_review && p.ai_review.flagged_issues && p.ai_review.flagged_issues.length > 0 && (
                  <div style={{marginTop:6,padding:'8px 10px',background:'#fef2f2',borderRadius:6,border:'1px solid #fecaca'}}>
                    <div style={{fontSize:9,fontWeight:800,color:'#dc2626',marginBottom:4}}>⚠️ AI Flagged Issues:</div>
                    {p.ai_review.flagged_issues.map(function(iss,j){
                      return <div key={j} style={{fontSize:10,color:'#dc2626',marginBottom:2}}>
                        <span style={{fontWeight:700,textTransform:'capitalize'}}>[{iss.severity||'medium'}]</span> {iss.type}: {iss.description}
                      </div>;
                    })}
                  </div>
                )}
                {p.admin_notes && (
                  <div style={{marginTop:6,fontSize:10,color:'#f59e0b',fontWeight:600}}>Admin notes: {p.admin_notes}</div>
                )}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                <button onClick={function() { approve(p.id); }} disabled={acting === 'approve-' + p.id}
                  style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {acting === 'approve-' + p.id ? '...' : '✓ Approve'}
                </button>
                <button onClick={function() { setRejectId(rejectId === p.id ? null : p.id); }}
                  style={{padding:'8px 20px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  ✗ Reject
                </button>
                <button onClick={function() { if(!confirm('Permanently delete "'+p.title+'"?')) return; setActing('del-'+p.id); apiDelete('/api/supermarket/products/'+p.id).then(function(){load();setActing('');}).catch(function(){setActing('');}); }}
                  disabled={acting==='del-'+p.id}
                  style={{padding:'8px 20px',borderRadius:8,border:'1px solid #e8ecf2',background:'#f8f9fb',color:'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {acting==='del-'+p.id?'...':'🗑 Delete'}
                </button>
              </div>
            </div>
            {rejectId === p.id && (
              <div style={{padding:'12px 20px',borderTop:'1px solid #f1f3f7',background:'#fef2f2'}}>
                <input value={rejectReason} onChange={function(e) { setRejectReason(e.target.value); }} placeholder="Reason for rejection..." style={{width:'100%',padding:'8px 12px',border:'1px solid #fecaca',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8}}/>
                <button onClick={function() { reject(p.id); }} disabled={acting === 'reject-' + p.id}
                  style={{padding:'6px 16px',borderRadius:6,border:'none',background:'#dc2626',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {acting === 'reject-' + p.id ? '...' : 'Confirm Reject'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ══════════════════════════════════════════════════════════

function HealthTab() {
  var [data, setData] = useState(null);
  var [fixing, setFixing] = useState('');
  var [fixMsg, setFixMsg] = useState('');
  useEffect(function() { apiGet('/admin/api/health').then(setData).catch(function(){}); }, []);
  if (!data) return <Spin/>;

  function fixIssue(type) {
    setFixing(type);
    apiPost('/admin/api/fix/' + type, {}).then(function(r) {
      setFixMsg(type + ': ' + (r.message || r.action || 'Fixed'));
      setFixing('');
      apiGet('/admin/api/health').then(setData);
    }).catch(function() { setFixing(''); });
  }

  return (
    <div>
      {fixMsg && <div style={{padding:'10px 14px',borderRadius:8,background:'#dcfce7',border:'1px solid #bbf7d0',marginBottom:14,fontSize:12,fontWeight:700,color:'#16a34a'}}>{fixMsg}</div>}

      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:16}}>
        <div style={{background:'#1c223d',padding:'14px 20px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Health Checks</div>
        </div>
        {(data.checks || []).map(function(c,i) {
          var color = c.status === 'ok' ? '#16a34a' : c.status === 'warn' ? '#f59e0b' : '#dc2626';
          var Icon = c.status === 'ok' ? CheckCircle : c.status === 'warn' ? AlertTriangle : XCircle;
          return (
            <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Icon size={16} color={color}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{c.name}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>{c.detail}</div>
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:4,background:color+'12',color:color,textTransform:'uppercase'}}>{c.status}</span>
            </div>
          );
        })}
      </div>

      {(data.issues || []).length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#dc2626',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Issues Found ({data.issues.length})</div>
          </div>
          {data.issues.map(function(issue,i) {
            return (
              <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{issue.type}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>Severity: {issue.severity} · Count: {issue.count || '—'}</div>
                </div>
                <button onClick={function() { fixIssue(issue.type); }} disabled={fixing===issue.type}
                  style={{padding:'6px 14px',borderRadius:6,border:'none',background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:fixing===issue.type?0.5:1}}>
                  {fixing===issue.type ? 'Fixing...' : 'Auto-Fix'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmailAnalyticsTab() {
  var [data, setData] = useState(null);
  useEffect(function() { apiGet('/admin/api/email-analytics').then(setData).catch(function(){}); }, []);
  if (!data) return <Spin/>;

  var t = data.totals || {};
  var c = data.costs || {};
  var ps = data.platform_stats || {};

  return (
    <div>
      <h3 style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,margin:'0 0 16px'}}>Email Delivery Analytics</h3>

      {/* Volume stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[
          {v:t.today||0, l:'Sent today', c:'#6366f1'},
          {v:t.this_week||0, l:'This week', c:'#0ea5e9'},
          {v:(t.this_month||0).toLocaleString(), l:'This month', c:'#16a34a'},
          {v:(t.all_time||0).toLocaleString(), l:'All time', c:'#8b5cf6'},
        ].map(function(s,i){return <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,textAlign:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:'#475569',fontWeight:600,marginTop:4}}>{s.l}</div></div>;})}
      </div>

      {/* Cost analysis */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Brevo Cost Analysis</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Current tier</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:c.brevo_tier==='Free'?'#16a34a':'#f59e0b'}}>{c.brevo_tier}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Est. monthly cost</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a'}}>${c.estimated_monthly_brevo}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Cost per email</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a'}}>${c.cost_per_email}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Free cap</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#64748b'}}>{c.free_daily_cap}/day</div>
          </div>
        </div>
        {c.brevo_tier === 'Free' && <div style={{marginTop:12,padding:'10px 14px',background:'#f0fdf4',borderRadius:8,fontSize:12,color:'#059669',fontWeight:600}}>You are within the free tier. No Brevo charges this month.</div>}
        {c.brevo_tier !== 'Free' && <div style={{marginTop:12,padding:'10px 14px',background:'#fef3c7',borderRadius:8,fontSize:12,color:'#d97706',fontWeight:600}}>Volume exceeds free tier. Consider upgrading Brevo plan to avoid sending pauses.</div>}
      </div>

      {/* Platform stats */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Platform Email Stats</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Total leads</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#6366f1'}}>{ps.total_leads||0}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Nurturing</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0ea5e9'}}>{ps.leads_nurturing||0}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Active sequences</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#16a34a'}}>{ps.active_sequences||0}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Boost credits out</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#f59e0b'}}>{(ps.total_boost_credits||0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Top senders */}
      {data.top_senders && data.top_senders.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:20}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>Top Email Senders (30 days)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#f8fafc'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>User</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Emails sent</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Boost credits</th>
            </tr></thead>
            <tbody>
              {data.top_senders.map(function(s,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'#0f172a'}}>{s.name} <span style={{color:'#94a3b8',fontWeight:400}}>@{s.username}</span></td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'#6366f1'}}>{s.emails_sent}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'#64748b'}}>{(s.boost_credits||0).toLocaleString()}</td>
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
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>{d.count>0?d.count:''}</div>
                  <div style={{width:'100%',height:h,background:'linear-gradient(180deg,#6366f1,#818cf8)',borderRadius:'3px 3px 0 0',minHeight:4}}/>
                </div>;
              });
            })()}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:9,color:'#94a3b8'}}>{data.daily_breakdown[0]?.date}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>{data.daily_breakdown[data.daily_breakdown.length-1]?.date}</span>
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
      <h3 style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,margin:'0 0 16px'}}>SuperScene Credit Analytics</h3>

      {/* Generation volume */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[
          {v:v.today||0, l:'Generations today', c:'#8b5cf6'},
          {v:v.this_week||0, l:'This week', c:'#0ea5e9'},
          {v:(v.this_month||0).toLocaleString(), l:'This month', c:'#16a34a'},
          {v:(v.total||0).toLocaleString(), l:'All time', c:'#6366f1'},
        ].map(function(s,i){return <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,textAlign:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:'#475569',fontWeight:600,marginTop:4}}>{s.l}</div></div>;})}
      </div>

      {/* Financial overview */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Financial Overview</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#059669',marginBottom:4}}>Revenue (month)</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#059669'}}>${fin.revenue_this_month||0}</div>
          </div>
          <div style={{background:'#fef2f2',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#dc2626',marginBottom:4}}>Provider cost</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#dc2626'}}>${fin.estimated_provider_cost||0}</div>
          </div>
          <div style={{background:'#fff7ed',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#ea580c',marginBottom:4}}>Sponsor comms</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#ea580c'}}>${fin.sponsor_commissions||0}</div>
          </div>
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#059669',marginBottom:4}}>Net margin</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#059669'}}>${fin.estimated_margin||0}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Margin %</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:fin.margin_pct>=50?'#059669':fin.margin_pct>=20?'#d97706':'#dc2626'}}>{fin.margin_pct||0}%</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Total revenue</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a'}}>${fin.total_revenue||0}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Sell price/credit</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a'}}>${cr.credit_sell_price||'0.22'}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Provider/credit</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a'}}>${fin.provider_cost_per_credit||'0.08'}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 12px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Sponsor/credit</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a'}}>${fin.sponsor_rate_per_credit||'0.025'}</div>
          </div>
        </div>
      </div>

      {/* Credit stats */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:14}}>Credit Usage</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Used this month</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#8b5cf6'}}>{(cr.used_this_month||0).toLocaleString()}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Used this week</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0ea5e9'}}>{(cr.used_this_week||0).toLocaleString()}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Total used (all time)</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#6366f1'}}>{(cr.total_used||0).toLocaleString()}</div>
          </div>
          <div style={{background:'#fef3c7',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#d97706',marginBottom:4}}>Outstanding balance</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#d97706'}}>{(cr.outstanding_balance||0).toLocaleString()}</div>
          </div>
        </div>
        {cr.outstanding_balance > 0 && <div style={{marginTop:10,padding:'10px 14px',background:'#fef3c7',borderRadius:8,fontSize:12,color:'#92400e',fontWeight:600}}>Outstanding credits represent your liability — credits purchased but not yet used. Est. cost to fulfil: ${((cr.outstanding_balance||0) * (fin.total_cost_per_credit||0.105)).toFixed(2)} (provider ${((cr.outstanding_balance||0) * (fin.provider_cost_per_credit||0.08)).toFixed(2)} + sponsor comms ${((cr.outstanding_balance||0) * (fin.sponsor_rate_per_credit||0.025)).toFixed(2)})</div>}
      </div>

      {/* Model usage breakdown */}
      {data.model_usage && data.model_usage.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:20}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>Model Usage (30 days)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#f8fafc'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Model</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Generations</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Credits used</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Est. cost</th>
            </tr></thead>
            <tbody>
              {data.model_usage.map(function(m,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'#0f172a'}}>{m.model}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'#475569'}}>{m.generations}</td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'#8b5cf6'}}>{m.credits}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'#475569'}}>${(m.credits * (fin.cost_per_credit||0.08)).toFixed(2)}</td>
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
            <thead><tr style={{background:'#f8fafc'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Pack</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Sales</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Credits sold</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Revenue</th>
            </tr></thead>
            <tbody>
              {data.pack_sales.map(function(p,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'#0f172a',textTransform:'capitalize'}}>{p.pack}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'#475569'}}>{p.sales}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'#8b5cf6',fontWeight:600}}>{(p.credits_sold||0).toLocaleString()}</td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'#059669'}}>${p.revenue.toFixed(2)}</td>
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
            <thead><tr style={{background:'#f8fafc'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>User</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Generations</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Credits used</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontWeight:700,color:'#475569',fontSize:11}}>Remaining</th>
            </tr></thead>
            <tbody>
              {data.top_users.map(function(u,i){return <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 16px',fontWeight:600,color:'#0f172a'}}>{u.name} <span style={{color:'#94a3b8',fontWeight:400}}>@{u.username}</span></td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'#475569'}}>{u.generations}</td>
                <td style={{padding:'10px 16px',textAlign:'right',fontWeight:700,color:'#8b5cf6'}}>{u.credits_used}</td>
                <td style={{padding:'10px 16px',textAlign:'right',color:'#64748b'}}>{u.credits_remaining}</td>
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
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>{d.credits>0?d.credits:''}</div>
                  <div style={{width:'100%',height:h,background:'linear-gradient(180deg,#8b5cf6,#a78bfa)',borderRadius:'3px 3px 0 0',minHeight:4}}/>
                </div>;
              });
            })()}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:9,color:'#94a3b8'}}>{data.daily_breakdown[0]?.date}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>{data.daily_breakdown[data.daily_breakdown.length-1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#dc2626',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }

function GiftMembership(props) {
  var [tier, setTier] = useState('pro');
  var [months, setMonths] = useState(12);
  var [gifting, setGifting] = useState(false);

  function gift() {
    if (gifting) return;
    if (!window.confirm('Gift ' + tier.toUpperCase() + ' membership for ' + months + ' months to @' + props.username + '?')) return;
    setGifting(true);
    apiPost('/admin/api/user/' + props.userId + '/gift-membership', { tier: tier, months: months })
      .then(function(r) {
        if (r.success) props.onDone(r.message || 'Membership gifted!');
        else props.onDone(r.error || 'Failed');
        setGifting(false);
      })
      .catch(function(e) { props.onDone(e.message || 'Failed'); setGifting(false); });
  }

  return (
    <div style={{borderTop:'1px solid #e2e8f0',paddingTop:12,marginTop:4}}>
      <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8}}>🎁 Gift Free Membership</div>
      <div style={{display:'flex',gap:6,marginBottom:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:'#94a3b8',marginBottom:3}}>Tier</div>
          <div style={{display:'flex',gap:4}}>
            {['basic','pro'].map(function(t) {
              return <button key={t} onClick={function() { setTier(t); }}
                style={{flex:1,padding:'7px 0',borderRadius:6,border:'1px solid ' + (tier===t?'#8b5cf6':'#e2e8f0'),
                  background:tier===t?(t==='pro'?'#8b5cf6':'#0ea5e9'):'#fff',
                  color:tier===t?'#fff':'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase'}}>
                {t}
              </button>;
            })}
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:'#94a3b8',marginBottom:3}}>Duration</div>
          <div style={{display:'flex',gap:4}}>
            {[1,3,6,12].map(function(m) {
              return <button key={m} onClick={function() { setMonths(m); }}
                style={{flex:1,padding:'7px 0',borderRadius:6,border:'1px solid ' + (months===m?'#8b5cf6':'#e2e8f0'),
                  background:months===m?'#8b5cf6':'#fff',color:months===m?'#fff':'#64748b',
                  fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {m === 12 ? '1yr' : m + 'mo'}
              </button>;
            })}
          </div>
        </div>
      </div>
      <button onClick={gift} disabled={gifting}
        style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:gifting?'default':'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,
          background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',color:'#fff',opacity:gifting?.6:1}}>
        {gifting ? 'Gifting...' : '🎁 Gift ' + tier.toUpperCase() + ' for ' + (months === 12 ? '1 year' : months + ' months') + ' to @' + props.username}
      </button>
    </div>
  );
}
