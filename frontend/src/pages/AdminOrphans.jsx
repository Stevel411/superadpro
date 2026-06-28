import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import {
  AlertCircle, ExternalLink, Check, X, Link2, Search,
  RefreshCw, ChevronDown, ChevronUp, Copy as CopyIcon,
} from 'lucide-react';

// AdminOrphans
// ============
// Lists OnchainOrphanTransfer rows — incoming USDT-BSC transfers to the
// treasury that the cron scanner couldn't auto-match to a pending order.
//
// For each pending orphan, the backend pre-computes candidate WC orders
// within 1 cent of the on-chain amount (from the last 7 days). Admin
// can reconcile in one click, OR mark spam/manual without touching any
// member balance.
//
// This page deliberately mirrors the AdminStories visual style — dark
// header, white cards on a light background — so the admin section
// feels like a coherent toolset.

function shortAddr(addr) {
  if (!addr) return '';
  if (addr.length < 14) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}
function shortTx(tx) {
  if (!tx) return '';
  if (tx.length < 16) return tx;
  return tx.slice(0, 10) + '…' + tx.slice(-8);
}
function timeAgo(iso) {
  if (!iso) return '';
  var diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function AdminOrphans() {
  var auth = useAuth();
  var [data, setData] = useState({ orphans: [], counts: { pending: 0, likely_rounded: 0 } });
  var [loading, setLoading] = useState(true);
  var [tab, setTab] = useState('pending');
  var [error, setError] = useState('');
  var [busyId, setBusyId] = useState(null);
  var [expanded, setExpanded] = useState({});
  var [noteDraft, setNoteDraft] = useState({});  // orphan_id → note text

  function load() {
    setLoading(true);
    apiGet('/admin/api/orphans?status=' + tab + '&limit=100')
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function(e) { setError(e.message || 'Failed to load'); setLoading(false); });
  }

  useEffect(function() { load(); }, [tab]);

  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  }

  function resolve(orphan_id, resolution) {
    if (busyId) return;
    setBusyId(orphan_id);
    setError('');
    apiPost('/admin/api/orphans/' + orphan_id + '/resolve', {
      resolution: resolution,
      note: noteDraft[orphan_id] || '',
    }).then(function(r) {
      if (r.success) load();
      else setError(r.error || 'Failed');
      setBusyId(null);
    }).catch(function(e) { setError(e.message); setBusyId(null); });
  }

  function reconcile(orphan_id, order_id) {
    if (busyId) return;
    if (!window.confirm('Reconcile orphan to order ' + order_id + '? This will mark the order confirmed and trigger activation on the next cron tick.')) return;
    setBusyId(orphan_id);
    setError('');
    apiPost('/admin/api/orphans/' + orphan_id + '/reconcile', { order_id: order_id })
      .then(function(r) {
        if (r.success) load();
        else setError(r.error || 'Failed');
        setBusyId(null);
      }).catch(function(e) { setError(e.message); setBusyId(null); });
  }

  if (!auth || !auth.user) {
    return <AppLayout categoryChrome title="Admin · Orphans"><div style={{ padding: 40 }}>Checking access…</div></AppLayout>;
  }
  if (!auth.user.is_admin) {
    return <AppLayout categoryChrome title="Admin · Orphans">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--sap-text-muted)' }}>
        Admin access required.
      </div>
    </AppLayout>;
  }

  return (
    <AppLayout categoryChrome title="Admin · Onchain Orphans" subtitle="Treasury transfers the auto-scanner couldn't match">
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      {/* Header strip */}
      <div style={{ background:'linear-gradient(135deg,#0c1a3a,#1e3a8a)', color:'#fff', borderRadius:16, padding:'24px 28px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:13, opacity:0.7, fontWeight:600, letterSpacing:0.4, textTransform:'uppercase' }}>Orphan Queue</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, marginTop:4 }}>
            {data.counts.pending} pending
          </div>
          {data.counts.likely_rounded > 0 && (
            <div style={{ fontSize:13, opacity:0.85, marginTop:4 }}>
              <AlertCircle size={13} style={{ display:'inline', verticalAlign:'-2px', marginRight:4 }}/>
              {data.counts.likely_rounded} look like rounded amounts (most likely member overpayment)
            </div>
          )}
        </div>
        <button
          onClick={load}
          style={{ padding:'10px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.1)', color:'#fff', fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:18, borderBottom:'1px solid #e2e8f0' }}>
        {['pending', 'resolved', 'all'].map(function(key) {
          var active = tab === key;
          return (
            <button key={key} onClick={function() { setTab(key); }}
              style={{
                padding:'10px 18px', border:'none', background:'transparent', cursor:'pointer',
                fontFamily:'inherit', fontSize:14, fontWeight: active ? 700 : 500,
                color: active ? 'var(--sap-text-primary)' : 'var(--sap-text-muted)',
                borderBottom: active ? '2px solid var(--sap-accent)' : '2px solid transparent',
                marginBottom:-1,
              }}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>
          <X size={14} style={{ display:'inline', marginRight:6, verticalAlign:'-2px' }}/> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ width:32, height:32, margin:'0 auto', border:'3px solid #e5e7eb', borderTopColor:'var(--sap-accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <div style={{ marginTop:12, color:'var(--sap-text-muted)', fontSize:14 }}>Loading orphans…</div>
        </div>
      )}

      {/* Empty */}
      {!loading && data.orphans.length === 0 && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:14, padding:'48px 24px', textAlign:'center', color:'#15803d' }}>
          <Check size={36} style={{ marginBottom:8 }}/>
          <div style={{ fontSize:18, fontWeight:700 }}>No {tab === 'pending' ? 'pending ' : ''}orphans</div>
          <div style={{ fontSize:13, marginTop:6, color:'#16a34a' }}>
            {tab === 'pending' ? 'Every treasury transfer is matched to an order.' : 'Nothing to show in this tab.'}
          </div>
        </div>
      )}

      {/* Orphan rows */}
      {!loading && data.orphans.map(function(o) {
        var isExp = expanded[o.id];
        var hasCands = (o.candidates || []).length > 0;
        return (
          <div key={o.id} style={{
            background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, marginBottom:12,
            overflow:'hidden', boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
          }}>
            {/* Top row */}
            <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, flex:'1 1 auto', minWidth:280 }}>
                {/* Amount badge */}
                <div style={{ flexShrink:0, width:64, textAlign:'center', padding:'8px 0', background: o.likely_rounded_amount ? '#fef3c7' : '#eff6ff', borderRadius:10, border:'1px solid', borderColor: o.likely_rounded_amount ? '#fde68a' : '#dbeafe' }}>
                  <div style={{ fontSize:11, fontWeight:600, color: o.likely_rounded_amount ? '#92400e' : '#1e40af', letterSpacing:0.3 }}>USDT</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color: o.likely_rounded_amount ? '#78350f' : '#1e3a8a' }}>
                    ${o.amount_usdt.toFixed(2)}
                  </div>
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:'var(--sap-text-secondary)', fontFamily:'monospace', display:'flex', alignItems:'center', gap:6 }}>
                    <span title={o.tx_hash}>{shortTx(o.tx_hash)}</span>
                    <button onClick={function() { copy(o.tx_hash); }} title="Copy tx hash" style={{ background:'transparent', border:'none', cursor:'pointer', padding:2, color:'var(--sap-text-muted)' }}>
                      <CopyIcon size={11} />
                    </button>
                    <a href={'https://bscscan.com/tx/' + o.tx_hash} target="_blank" rel="noopener noreferrer" style={{ color:'var(--sap-accent)', display:'inline-flex', alignItems:'center' }}>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div style={{ fontSize:12, color:'var(--sap-text-muted)', marginTop:3 }}>
                    From <span style={{ fontFamily:'monospace' }}>{shortAddr(o.from_address)}</span>
                    {' · '}
                    {timeAgo(o.seen_at)}
                    {o.likely_rounded_amount && <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:'#92400e' }}>⚠ ROUNDED</span>}
                    {o.resolved && <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:'#16a34a' }}>✓ {o.resolution_note ? o.resolution_note.split(':')[0] : 'resolved'}</span>}
                  </div>
                </div>
              </div>

              {/* Action area */}
              {!o.resolved && (
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {hasCands && (
                    <button
                      onClick={function() { setExpanded(Object.assign({}, expanded, { [o.id]: !isExp })); }}
                      style={{ padding:'8px 14px', borderRadius:8, border:'1px solid var(--sap-accent)', background: isExp ? 'var(--sap-accent)' : '#fff', color: isExp ? '#fff' : 'var(--sap-accent)', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
                      <Link2 size={13} /> {(o.candidates || []).length} match{(o.candidates || []).length === 1 ? '' : 'es'} {isExp ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                    </button>
                  )}
                  <button onClick={function() { resolve(o.id, 'spam'); }} disabled={busyId === o.id}
                    style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'var(--sap-text-muted)', fontSize:12, fontWeight:600, cursor: busyId === o.id ? 'wait' : 'pointer', fontFamily:'inherit' }}>
                    Mark spam
                  </button>
                  <button onClick={function() { resolve(o.id, 'manual'); }} disabled={busyId === o.id}
                    style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'var(--sap-text-muted)', fontSize:12, fontWeight:600, cursor: busyId === o.id ? 'wait' : 'pointer', fontFamily:'inherit' }}>
                    Mark manual
                  </button>
                </div>
              )}
            </div>

            {/* Expanded candidates */}
            {isExp && hasCands && !o.resolved && (
              <div style={{ padding:'12px 20px 18px', background:'#f8fafc', borderTop:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:0.4, marginBottom:8 }}>
                  Candidate Orders (within ±$0.01, last 7 days)
                </div>
                {(o.candidates || []).map(function(c) {
                  return (
                    <div key={c.order_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#fff', borderRadius:8, border:'1px solid #e2e8f0', marginBottom:6 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--sap-text-primary)' }}>
                          Order #{c.order_id} · ${c.unique_amount.toFixed(2)} · {c.product_key}
                        </div>
                        <div style={{ fontSize:11, color:'var(--sap-text-muted)', marginTop:2 }}>
                          User #{c.user_id} · status <span style={{ fontWeight:600, color: c.status === 'pending' ? '#1e40af' : '#92400e' }}>{c.status}</span> · created {timeAgo(c.created_at)}
                        </div>
                      </div>
                      <button onClick={function() { reconcile(o.id, c.order_id); }} disabled={busyId === o.id}
                        style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', fontSize:12, fontWeight:700, cursor: busyId === o.id ? 'wait' : 'pointer', fontFamily:'inherit', flexShrink:0 }}>
                        Reconcile →
                      </button>
                    </div>
                  );
                })}
                <div style={{ fontSize:11, color:'var(--sap-text-muted)', marginTop:8, fontStyle:'italic' }}>
                  Reconcile sets the order to 'confirmed' and links this tx_hash. Activation runs on the next cron tick.
                </div>
              </div>
            )}
          </div>
        );
      })}
    </AppLayout>
  );
}
