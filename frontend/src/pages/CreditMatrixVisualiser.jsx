import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';

var TIER_COLORS = {
  starter:   {grad:'linear-gradient(135deg,#064e3b,#047857,#10b981)', color:'#10b981', dark:'#059669'},
  builder:   {grad:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)', color:'#3b82f6', dark:'#2563eb'},
  pro:       {grad:'linear-gradient(135deg,#172554,#4c1d95,#8b5cf6)', color:'#8b5cf6', dark:'#7c3aed'},
  advanced:  {grad:'linear-gradient(135deg,#831843,#be185d,#ec4899)', color:'#ec4899', dark:'#db2777'},
  elite:     {grad:'linear-gradient(135deg,#134e4a,#0d9488,#2dd4bf)', color:'#14b8a6', dark:'#0d9488'},
  premium:   {grad:'linear-gradient(135deg,#6b7280,#9ca3af,#d1d5db)', color:'#9ca3af', dark:'#6b7280'},
  executive: {grad:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)', color:'#f59e0b', dark:'#b45309'},
  ultimate:  {grad:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)', color:'#ef4444', dark:'#dc2626'},
};

var NODE_COLORS = {
  you:    {grad:'linear-gradient(135deg,#172554,#1e3a8a)', border:'#1e3a8a'},
  direct: {grad:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)', border:'#f59e0b'},
  spill:  {grad:'linear-gradient(135deg,#064e3b,#047857,#10b981)', border:'#10b981'},
};

var css = `
  .mx-tab{padding:10px 16px;border-radius:10px;border:1px solid #e2e8f0;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .2s;color:#64748b;background:#fff}
  .mx-tab:hover:not(.active):not(:disabled){background:#f8fafc}
  .mx-tab.active{color:#fff;border-color:transparent}
  .mx-tab:disabled{opacity:.45;cursor:not-allowed}
  .mx-node{width:100px;border-radius:12px;padding:12px 8px;text-align:center;position:relative;transition:all .2s}
  .mx-node.empty{background:#f8fafc;border:2px dashed #e2e8f0}
  .mx-node.filled{border:2px solid;color:#fff}
  .mx-node .nbadge{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;border:2px solid #fff;z-index:2}
  .mx-node .nbadge.direct{background:#fbbf24;color:#78350f}
  .mx-node .nbadge.spill{background:#10b981;color:#fff}
`;

export default function CreditMatrixVisualiser() {
  var { user } = useAuth();
  var [overview, setOverview] = useState(null);
  var [activePack, setActivePack] = useState(null);
  var [treeData, setTreeData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [treeLoading, setTreeLoading] = useState(false);

  // Load overview of all 8 matrices
  useEffect(function() {
    apiGet('/api/credit-matrix/all-matrices')
      .then(function(d) {
        setOverview(d);
        // Default to first purchased pack
        if (d.purchased && d.purchased.length > 0) {
          setActivePack(d.purchased[0].pack_key);
        }
        setLoading(false);
      })
      .catch(function() { setLoading(false); });
  }, []);

  // Load tree for active pack
  useEffect(function() {
    if (!activePack) return;
    setTreeLoading(true);
    apiGet('/api/credit-matrix/my-matrix?pack_key=' + activePack)
      .then(function(d) { setTreeData(d); setTreeLoading(false); })
      .catch(function() { setTreeLoading(false); });
  }, [activePack]);

  if (loading) {
    return (
      <AppLayout title="Credit Matrix" subtitle="Your 3×3 matrices">
        <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>Loading matrices...</div>
      </AppLayout>
    );
  }

  var purchased = overview?.purchased || [];
  var locked = overview?.locked || [];
  var allPacks = purchased.concat(locked);
  var totalEarned = overview?.total_earned || 0;

  var tc = TIER_COLORS[activePack] || TIER_COLORS.starter;

  // Tree rendering
  var tree = treeData?.tree || [];
  var stats = treeData?.stats || {};
  var matrix = treeData?.matrix || {};
  var filled = matrix.positions_filled || 0;
  var pct = Math.round(filled / 39 * 100);

  function renderNode(node) {
    if (!node) {
      return (
        <div className="mx-node empty">
          <div style={{ width:36, height:36, borderRadius:'50%', background:'#f1f5f9', margin:'0 auto 6px', display:'flex', alignItems:'center', justifyContent:'center', color:'#cbd5e1', fontSize:16 }}>?</div>
          <div style={{ fontSize:10, color:'#cbd5e1', fontWeight:600 }}>Empty</div>
        </div>
      );
    }

    var isOwner = node.level === 0;
    var isDirect = node.is_direct;
    var nc = isOwner ? NODE_COLORS.you : (isDirect ? NODE_COLORS.direct : NODE_COLORS.spill);

    return (
      <div className="mx-node filled" style={{ background:nc.grad, borderColor:nc.border, display: isOwner ? 'inline-block' : undefined }}>
        {!isOwner && <div className={'nbadge ' + (isDirect ? 'direct' : 'spill')}>{isDirect ? '★' : '↓'}</div>}
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.3)', margin:'0 auto 6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800 }}>
          {isOwner ? 'Y' : node.username.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize:10, fontWeight:700 }}>{isOwner ? 'You' : node.username}</div>
        <div style={{ fontSize:8, opacity:.7, marginTop:2 }}>{node.member_id}</div>
      </div>
    );
  }

  // Build level arrays from tree data
  var ownerNode = tree.find(function(n){ return n.level === 0; });
  var l1Nodes = tree.filter(function(n){ return n.level === 1; });
  var l2Nodes = tree.filter(function(n){ return n.level === 2; });
  var l3Nodes = tree.filter(function(n){ return n.level === 3; });

  // Pad to full width
  function padLevel(nodes, max) {
    var result = [];
    for (var i = 0; i < max; i++) {
      result.push(nodes[i] || null);
    }
    return result;
  }

  var packPrice = matrix.pack_price || 0;
  var e1 = stats.earnings_l1 || 0;
  var e2 = stats.earnings_l2 || 0;
  var e3 = stats.earnings_l3 || 0;
  var eTotal = e1 + e2 + e3;
  var eMax = 3 * packPrice * 0.15 + 9 * packPrice * 0.10 + 27 * packPrice * 0.10;

  return (
    <AppLayout title="Credit Matrix" subtitle="Your 3×3 matrices fill as members buy credit packs">
      <style>{css}</style>
      <div style={{ maxWidth:1000, margin:'0 auto' }}>

        {/* Hero */}
        <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:18, padding:'32px 36px', marginBottom:24, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:900, color:'#fff', marginBottom:6 }}>Credit Matrix</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.65)' }}>Each credit pack has its own 3×3 matrix. Earn 15% / 10% / 10% across 3 levels.</div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:16, marginBottom:24 }}>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#dc2626' }}>{purchased.length}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Active Matrices</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#16a34a' }}>${totalEarned.toFixed(2)}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Total Earned</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#f59e0b' }}>{pct}%</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Current Fill Rate</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#8b5cf6' }}>
              {purchased.reduce(function(sum, p){ return sum + p.completed_advances; }, 0)}
            </div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Advances Complete</div>
          </div>
        </div>

        {/* Pack tabs — all 8, locked ones disabled */}
        <div style={{ display:'flex', gap:6, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
          {allPacks.map(function(p) {
            var isPurchased = purchased.some(function(pp){ return pp.pack_key === p.pack_key; });
            var isActive = activePack === p.pack_key;
            var tierC = TIER_COLORS[p.pack_key] || TIER_COLORS.starter;

            return (
              <button key={p.pack_key} disabled={!isPurchased}
                className={'mx-tab' + (isActive ? ' active' : '')}
                style={isActive ? { background:tierC.grad, color:'#fff', borderColor:'transparent' } : (!isPurchased ? { opacity:.45, cursor:'not-allowed' } : {})}
                onClick={function(){ if(isPurchased) setActivePack(p.pack_key); }}>
                {isPurchased ? '' : '🔒 '}{p.label} ${p.price}
              </button>
            );
          })}
        </div>

        {/* Matrix tree */}
        {activePack && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #e2e8f0', overflow:'hidden', marginBottom:24 }}>
            {/* Cobalt gradient header */}
            <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', padding:'24px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#fff' }}>
                {matrix.pack_label || activePack} Matrix — ${matrix.pack_price || 0} Pack
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', fontWeight:600 }}>
                {filled} of 39 filled ({pct}%)
              </div>
            </div>

            <div style={{ padding:28 }}>
            {/* Progress bar */}
            <div style={{ height:8, background:'#f1f5f9', borderRadius:4, marginBottom:16, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, width:pct+'%', background:'linear-gradient(90deg,'+tc.dark+','+tc.color+')', transition:'width .5s' }}/>
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:20, justifyContent:'center', marginBottom:16, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b', fontWeight:600 }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:'linear-gradient(135deg,#b45309,#fbbf24)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#78350f' }}>★</div> Direct Referral
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b', fontWeight:600 }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:'linear-gradient(135deg,#047857,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff' }}>↓</div> Spillover
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b', fontWeight:600 }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:'#f1f5f9', border:'1px dashed #cbd5e1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#cbd5e1' }}>?</div> Empty
              </div>
            </div>

            {/* Tree — always rendered, opacity dims during load */}
            <div style={{ opacity: treeLoading ? 0.4 : 1, transition:'opacity .3s' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'20px 0' }}>
                {/* You */}
                <div style={{ textAlign:'center' }}>{renderNode(ownerNode)}</div>

                {/* Level 1 */}
                <div style={{ textAlign:'center', marginTop:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                    Level 1 — 15% commission ({stats.l1_filled || 0}/3 filled)
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                  {padLevel(l1Nodes, 3).map(function(n, i){ return <div key={'l1-'+i}>{renderNode(n)}</div>; })}
                </div>

                {/* Level 2 */}
                <div style={{ textAlign:'center', marginTop:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                    Level 2 — 10% commission ({stats.l2_filled || 0}/9 filled)
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                  {padLevel(l2Nodes, 9).map(function(n, i){ return <div key={'l2-'+i}>{renderNode(n)}</div>; })}
                </div>

                {/* Level 3 */}
                <div style={{ textAlign:'center', marginTop:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                    Level 3 — 10% commission ({stats.l3_filled || 0}/27 filled)
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                  {padLevel(l3Nodes, 27).map(function(n, i){ return <div key={'l3-'+i}>{renderNode(n)}</div>; })}
                </div>
              </div>
            </div>

            {/* Level earnings */}
            <div style={{ display:'flex', gap:12, marginTop:20 }}>
              <div style={{ flex:1, background:'#f8fafc', borderRadius:10, padding:14, textAlign:'center', border:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Level 1</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:tc.dark, marginTop:4 }}>${e1.toFixed(2)}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{stats.l1_filled || 0} × ${packPrice} × 15%</div>
              </div>
              <div style={{ flex:1, background:'#f8fafc', borderRadius:10, padding:14, textAlign:'center', border:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Level 2</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:tc.dark, marginTop:4 }}>${e2.toFixed(2)}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{stats.l2_filled || 0} × ${packPrice} × 10%</div>
              </div>
              <div style={{ flex:1, background:'#f8fafc', borderRadius:10, padding:14, textAlign:'center', border:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Level 3</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:tc.dark, marginTop:4 }}>${e3.toFixed(2)}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{stats.l3_filled || 0} × ${packPrice} × 10%</div>
              </div>
              <div style={{ flex:1, background:tc.grad, borderRadius:10, padding:14, textAlign:'center', border:'none' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase' }}>Total</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#fff', marginTop:4 }}>${eTotal.toFixed(2)}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginTop:2 }}>of ${eMax.toFixed(2)} max</div>
              </div>
            </div>
            </div>
          </div>
        )}

        {!activePack && purchased.length === 0 && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #e2e8f0', padding:'40px 28px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🧮</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:8 }}>No Credit Packs Yet</div>
            <div style={{ fontSize:14, color:'#64748b', lineHeight:1.6 }}>Purchase a credit pack to activate your first matrix and start earning commissions from your team's purchases.</div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
