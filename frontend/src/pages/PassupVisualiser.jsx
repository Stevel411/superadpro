import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Zap, GraduationCap, Play, Pause, RotateCcw, ArrowRight } from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// COMBINED VISUALISER PAGE — Grid + Pass-Up
// ══════════════════════════════════════════════════════════════

var TABS = [
  { key: 'passup', label: 'Pass-Up Visualiser', icon: GraduationCap, color: '#8b5cf6' },
  { key: 'grid', label: 'Grid Visualiser', icon: Zap, color: '#0ea5e9' },
];

export default function PassupVisualiser() {
  var [tab, setTab] = useState('passup');

  return (
    <AppLayout title="Visualiser" subtitle="Watch your income streams come to life">
      <div style={{display:'flex',gap:6,marginBottom:24,borderBottom:'2px solid #e8ecf2',paddingBottom:0}}>
        {TABS.map(function(t) {
          var Icon = t.icon;
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              style={{display:'flex',alignItems:'center',gap:6,padding:'12px 20px',fontSize:13,fontWeight:active?800:600,
                border:'none',borderBottom:active?'3px solid '+t.color:'3px solid transparent',
                cursor:'pointer',fontFamily:'inherit',background:active?t.color+'08':'transparent',
                color:active?t.color:'#64748b',marginBottom:-2,borderRadius:'8px 8px 0 0',transition:'all .2s'}}>
              <Icon size={15}/>{t.label}
            </button>
          );
        })}
      </div>
      {tab === 'passup' && <PassUpSection />}
      {tab === 'grid' && <GridVisSection />}
    </AppLayout>
  );
}


// ══════════════════════════════════════════════════════════════
// PASS-UP VISUALISER — 4 pass-up routes, infinite cascade
// ══════════════════════════════════════════════════════════════

var PASSUP_SET = new Set([2, 4, 6, 8]); // 4 pass-up positions
var NAMES = ['Alex','Beth','Carl','Dana','Eric','Faye','Gina','Hugo','Iris','Jake',
             'Kate','Leo','Mia','Nate','Olga','Paul','Quinn','Rosa','Sam','Tina',
             'Uma','Vic','Wendy','Xena','Yara','Zoe'];

function PassUpSection() {
  var [tier, setTier] = useState(100);
  var [playing, setPlaying] = useState(false);
  var [nodes, setNodes] = useState([]);
  var [steps, setSteps] = useState([]);
  var [stepIdx, setStepIdx] = useState(0);
  var [stats, setStats] = useState({ kept: 0, passups: 0, keptAmt: 0, passupAmt: 0, totalSales: 0 });
  var [log, setLog] = useState([]);
  var [activeFlow, setActiveFlow] = useState(null); // {from, to, type}
  var timerRef = useRef(null);
  var nameIdx = useRef(0);

  var YOU_ID = 1;
  var SPONSOR_ID = 0;

  function nextName() {
    var n = NAMES[nameIdx.current % NAMES.length];
    nameIdx.current++;
    return n;
  }

  function buildTree() {
    nameIdx.current = 0;
    var all = [];
    var id = 0;

    function mk(nm, pid, cls) {
      var n = { id: id++, nm: nm, pid: pid, puId: null, saleCount: 0, refCount: 0, children: [], visible: false, cls: cls || '', saleType: null };
      all.push(n);
      return n;
    }

    // Sponsor → You
    var sponsor = mk('SPONSOR', null, 'sponsor'); sponsor.visible = true;
    var you = mk('YOU', 0, 'root'); you.visible = true; you.puId = 0;
    sponsor.children.push(1); sponsor.refCount = 1;

    // Your 9 direct referrals (enough to trigger all 4 pass-up positions: 2,4,6,8)
    for (var i = 0; i < 9; i++) {
      var c = mk(nextName(), YOU_ID);
      you.children.push(c.id);
      you.refCount++;
      // Pass-up sponsor assignment based on referral position
      c.puId = PASSUP_SET.has(you.refCount) ? you.puId : YOU_ID;
    }

    // First 5 directs each get 4 referrals (L2) — shows cascade depth
    var yourDirects = all.filter(function(n) { return n.pid === YOU_ID; });
    for (var d = 0; d < Math.min(5, yourDirects.length); d++) {
      var parent = yourDirects[d];
      for (var j = 0; j < 4; j++) {
        var child = mk(nextName(), parent.id);
        parent.children.push(child.id);
        parent.refCount++;
        child.puId = PASSUP_SET.has(parent.refCount) ? parent.puId : parent.id;
      }
    }

    // First 8 L2 members each get 2 referrals (L3) — shows deep cascade
    var l2Members = all.filter(function(n) { return n.pid !== null && all[n.pid] && all[n.pid].pid === YOU_ID; });
    for (var k = 0; k < Math.min(8, l2Members.length); k++) {
      var l2 = l2Members[k];
      for (var m = 0; m < 2; m++) {
        var l3 = mk(nextName(), l2.id);
        l2.children.push(l3.id);
        l2.refCount++;
        l3.puId = PASSUP_SET.has(l2.refCount) ? l2.puId : l2.id;
      }
    }

    return all;
  }

  function buildSteps(tree) {
    var stps = [];
    var you = tree[YOU_ID];

    // Phase 1: Your directs join
    you.children.forEach(function(cid) { stps.push({ nodeId: cid, sponsorId: YOU_ID }); });

    // Phase 2: L1 directs recruit (interleaved)
    var yourDirects = tree.filter(function(n) { return n.pid === YOU_ID; });
    for (var round = 0; round < 4; round++) {
      yourDirects.slice(0, 5).forEach(function(d) {
        if (d.children[round] !== undefined) stps.push({ nodeId: d.children[round], sponsorId: d.id });
      });
    }

    // Phase 3: L2 recruit
    var l2 = tree.filter(function(n) { return n.pid !== null && tree[n.pid] && tree[n.pid].pid === YOU_ID; });
    for (var r2 = 0; r2 < 2; r2++) {
      l2.slice(0, 8).forEach(function(n) {
        if (n.children[r2] !== undefined) stps.push({ nodeId: n.children[r2], sponsorId: n.id });
      });
    }

    return stps;
  }

  function initSim() {
    var tree = buildTree();
    var stps = buildSteps(tree);
    setNodes(tree);
    setSteps(stps);
    setStepIdx(0);
    setStats({ kept: 0, passups: 0, keptAmt: 0, passupAmt: 0, totalSales: 0 });
    setLog([]);
    setActiveFlow(null);
    setPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  useEffect(function() { initSim(); }, [tier]);
  useEffect(function() { return function() { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  function processStep() {
    setStepIdx(function(si) {
      if (si >= steps.length) {
        setPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        return si;
      }

      var step = steps[si];
      var newNodes = nodes.slice();
      var nn = Object.assign({}, newNodes[step.nodeId]);
      var sp = Object.assign({}, newNodes[step.sponsorId]);

      // Reveal node
      nn.visible = true;

      // Sponsor gets a sale
      sp.saleCount++;
      var saleNum = sp.saleCount;
      var isPassUp = PASSUP_SET.has(saleNum);

      nn.saleType = isPassUp ? 'passup' : 'kept';

      newNodes[step.nodeId] = nn;
      newNodes[step.sponsorId] = sp;

      if (isPassUp) {
        // Find pass-up recipient
        var recipientId = sp.puId;
        var recipient = recipientId != null ? newNodes[recipientId] : newNodes[SPONSOR_ID];
        setActiveFlow({ from: sp.id, to: recipient.id, type: 'passup' });
        setStats(function(s) {
          var isYou = recipient.id === YOU_ID;
          return {
            kept: s.kept, passups: s.passups + (isYou ? 1 : 0),
            keptAmt: s.keptAmt, passupAmt: s.passupAmt + (isYou ? tier : 0),
            totalSales: s.totalSales + 1
          };
        });
        setLog(function(l) {
          return [{ who: nn.nm, sale: saleNum, action: '↑ PASS UP to ' + recipient.nm, color: '#f59e0b', type: 'passup', amt: tier }].concat(l).slice(0, 15);
        });
      } else {
        setActiveFlow({ from: nn.id, to: sp.id, type: 'kept' });
        setStats(function(s) {
          var isYou = sp.id === YOU_ID;
          return {
            kept: s.kept + (isYou ? 1 : 0), passups: s.passups,
            keptAmt: s.keptAmt + (isYou ? tier : 0), passupAmt: s.passupAmt,
            totalSales: s.totalSales + 1
          };
        });
        setLog(function(l) {
          return [{ who: nn.nm, sale: saleNum, action: 'KEPT ✓ by ' + sp.nm, color: '#10b981', type: 'kept', amt: tier }].concat(l).slice(0, 15);
        });
      }

      setNodes(newNodes);
      setTimeout(function() { setActiveFlow(null); }, 500);

      return si + 1;
    });
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (stepIdx >= steps.length) {
        initSim();
        setTimeout(function() { startPlaying(); }, 100);
        return;
      }
      startPlaying();
    }
  }

  function startPlaying() {
    setPlaying(true);
    timerRef.current = setInterval(function() {
      processStep();
    }, 900);
  }

  // Get visible nodes grouped by level
  function getLevel(n) {
    var lv = 0; var cur = n;
    while (cur.pid !== null && nodes[cur.pid]) { lv++; cur = nodes[cur.pid]; }
    return lv;
  }

  var levels = {};
  nodes.forEach(function(n) {
    if (!n.visible) return;
    var lv = getLevel(n);
    if (!levels[lv]) levels[lv] = [];
    levels[lv].push(n);
  });
  var maxLv = Math.max.apply(null, Object.keys(levels).map(Number).concat([0]));

  var totalAmt = stats.keptAmt + stats.passupAmt;

  return (
    <div>
      {/* Tier selector */}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[{p:100,name:'Starter'},{p:300,name:'Advanced'},{p:500,name:'Elite'}].map(function(t) {
          var on = tier === t.p;
          return (
            <button key={t.p} onClick={function() { setTier(t.p); }}
              style={{padding:'10px 20px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e8ecf2',
                background:on?'rgba(139,92,246,.08)':'#fff',cursor:'pointer',fontFamily:'inherit',
                fontSize:14,fontWeight:700,color:on?'#8b5cf6':'#94a3b8',transition:'all .15s'}}>
              ${t.p} {t.name}
            </button>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
        {/* LEFT — Tree visualisation */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'#1c223d',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#a78bfa'}}>Infinite Pass-Up</div>
              <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>${tier} {tier===100?'Starter':tier===300?'Advanced':'Elite'} Tier</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={togglePlay}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',
                  background:playing?'#334155':'#8b5cf6',color:'#fff',fontSize:12,fontWeight:800,fontFamily:'inherit'}}>
                {playing ? <><Pause size={13}/> Pause</> : <><Play size={13}/> Play</>}
              </button>
              <button onClick={initSim}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 12px',borderRadius:8,border:'1px solid #e8ecf2',cursor:'pointer',
                  background:'#fff',color:'#64748b',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                <RotateCcw size={13}/> Reset
              </button>
            </div>
          </div>

          {/* Tree */}
          <div style={{padding:'20px',minHeight:340,overflow:'auto'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
              {Array.from({length: maxLv + 1}).map(function(_, lv) {
                var lvNodes = levels[lv] || [];
                if (!lvNodes.length) return null;
                return (
                  <div key={lv} style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
                    {lvNodes.map(function(n) {
                      var isRoot = n.cls === 'root';
                      var isSponsor = n.cls === 'sponsor';
                      var isKept = n.saleType === 'kept';
                      var isPassup = n.saleType === 'passup';
                      var isFlowTarget = activeFlow && activeFlow.to === n.id;

                      var bg = '#f0f9ff';
                      var border = '1.5px solid rgba(14,165,233,.2)';
                      var textColor = '#0f172a';

                      if (isSponsor) { bg = 'linear-gradient(135deg,#6366f1,#4f46e5)'; border = '2px solid #818cf8'; textColor = '#fff'; }
                      else if (isRoot) { bg = 'linear-gradient(135deg,#0ea5e9,#0284c7)'; border = '2px solid #38bdf8'; textColor = '#fff'; }
                      else if (isKept) { bg = '#d1fae5'; border = '2px solid #10b981'; textColor = '#065f46'; }
                      else if (isPassup) { bg = '#fef3c7'; border = '2px solid #f59e0b'; textColor = '#92400e'; }

                      return (
                        <div key={n.id} style={{
                          width: isRoot ? 56 : isSponsor ? 52 : 48,
                          height: isRoot ? 42 : isSponsor ? 40 : 34,
                          borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                          background: bg, border: border,
                          boxShadow: isFlowTarget ? '0 0 16px rgba(139,92,246,.4)' : 'none',
                          transform: isFlowTarget ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all .3s ease',
                        }}>
                          <div style={{fontSize: isRoot||isSponsor ? 10 : 8, fontWeight:800, color: textColor, lineHeight:1.2}}>{n.nm}</div>
                          <div style={{fontSize:6,color: isSponsor||isRoot ? 'rgba(255,255,255,.6)' : '#94a3b8'}}>
                            {n.saleCount > 0 ? n.saleCount + ' sale' + (n.saleCount !== 1 ? 's' : '') : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{padding:'12px 20px',borderTop:'1px solid #e8ecf2',display:'flex',gap:14,flexWrap:'wrap'}}>
            {[
              {label:'Your Sponsor',bg:'linear-gradient(135deg,#6366f1,#4f46e5)',border:'#818cf8'},
              {label:'You',bg:'linear-gradient(135deg,#0ea5e9,#0284c7)',border:'#38bdf8'},
              {label:'Keeps Commission',bg:'#d1fae5',border:'#10b981'},
              {label:'Pass-Up',bg:'#fef3c7',border:'#f59e0b'},
            ].map(function(l, i) {
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#64748b'}}>
                  <div style={{width:12,height:12,borderRadius:3,background:l.bg,border:'1.5px solid '+l.border,flexShrink:0}}/>
                  {l.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Stats panel */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Total */}
          <div style={{background:'linear-gradient(135deg,#4c1d95,#7c3aed)',borderRadius:14,padding:20,textAlign:'center',color:'#fff'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:4}}>Your Total This Round</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800}}>${totalAmt.toLocaleString()}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>{stats.kept} kept · {stats.passups} pass-ups received</div>
          </div>

          {/* Earnings breakdown */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:10}}>Live Earnings</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f6f8'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:4,background:'#10b981'}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>Direct Sales Kept</div><div style={{fontSize:10,color:'#94a3b8'}}>Your sales 1,3,5,7,9+</div></div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'#10b981'}}>${stats.keptAmt.toLocaleString()}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:4,background:'#f59e0b'}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>Pass-Ups Received</div><div style={{fontSize:10,color:'#94a3b8'}}>Team's 2nd, 4th, 6th, 8th</div></div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'#f59e0b'}}>${stats.passupAmt.toLocaleString()}</div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>DIRECT SALES</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#10b981'}}>{stats.kept}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>PASS-UPS</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#f59e0b'}}>{stats.passups}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>TEAM SALES</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#0ea5e9'}}>{stats.totalSales}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>TIER</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#8b5cf6'}}>${tier}</div>
            </div>
          </div>

          {/* How it works */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:10}}>4 Pass-Up Routes</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {[
                {n:'1',title:'Keep',desc:'Sales 1,3,5,7,9+',color:'#10b981'},
                {n:'2',title:'Pass Up',desc:'Sales 2,4,6,8',color:'#f59e0b'},
                {n:'3',title:'Cascade',desc:'Received pass-ups count in your pattern',color:'#8b5cf6'},
                {n:'4',title:'Infinite',desc:'No level cap — cascades forever',color:'#ec4899'},
              ].map(function(s, i) {
                return (
                  <div key={i} style={{padding:10,background:'#f8f9fb',borderRadius:8,border:'1px solid #e8ecf2',textAlign:'center'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:s.color+'15',color:s.color,fontSize:11,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:4}}>{s.n}</div>
                    <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{s.title}</div>
                    <div style={{fontSize:9,color:'#64748b',lineHeight:1.4}}>{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity log */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16,flex:1,minHeight:200}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:10}}>Activity Log</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:300,overflowY:'auto'}}>
              {log.length === 0 && <div style={{fontSize:11,color:'#94a3b8'}}>Press Play to watch your team build...</div>}
              {log.map(function(l, i) {
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f5f6f8',fontSize:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontWeight:700,color:'#0f172a',minWidth:40}}>{l.who}</span>
                      <span style={{color:'#94a3b8',fontSize:10}}>#{l.sale}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,
                        color:l.type==='kept'?'#10b981':'#f59e0b',
                        background:l.type==='kept'?'rgba(16,185,129,.06)':'rgba(245,158,11,.06)',
                        border:'1px solid '+(l.type==='kept'?'rgba(16,185,129,.2)':'rgba(245,158,11,.2)')}}>{l.action}</span>
                    </div>
                    <span style={{fontWeight:700,color:l.color,fontSize:12}}>${l.amt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{padding:'10px 12px',background:'#fffbeb',borderRadius:8,border:'1px solid #fef3c7',fontSize:10,color:'#92400e',lineHeight:1.5}}>
            <strong>Disclaimer:</strong> This is a simulation for educational purposes. Actual earnings depend entirely on personal activity and network performance. Income is not guaranteed.
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// GRID VISUALISER — 8×8 seat fill with live stats
// ══════════════════════════════════════════════════════════════

function GridVisSection() {
  var TIERS = [
    {n:1,name:'Starter',price:20,color:'#4ade80'},
    {n:2,name:'Builder',price:50,color:'#38bdf8'},
    {n:3,name:'Pro',price:100,color:'#0ea5e9'},
    {n:4,name:'Advanced',price:200,color:'#6366f1'},
    {n:5,name:'Elite',price:400,color:'#8b5cf6'},
    {n:6,name:'Premium',price:600,color:'#f59e0b'},
    {n:7,name:'Executive',price:800,color:'#f97316'},
    {n:8,name:'Ultimate',price:1000,color:'#ec4899'},
  ];

  var [selectedTier, setSelectedTier] = useState(3);
  var [running, setRunning] = useState(false);
  var [filled, setFilled] = useState(0);
  var [earned, setEarned] = useState(0);
  var [bonus, setBonus] = useState(0);
  var [directEarned, setDirectEarned] = useState(0);
  var [complete, setComplete] = useState(false);
  var timerRef = useRef(null);

  var tier = TIERS.find(function(t) { return t.n === selectedTier; }) || TIERS[2];
  var PRICE = tier.price;
  var PER_SEAT_UNI = PRICE * 0.0625;
  var PER_SEAT_BONUS = PRICE * 0.05;
  var DIRECT_PER = PRICE * 0.40;

  function startSim() {
    setRunning(true); setFilled(0); setEarned(0); setBonus(0); setDirectEarned(0); setComplete(false);
    var seat = 0;
    timerRef.current = setInterval(function() {
      seat++;
      if (seat <= 64) {
        setFilled(seat);
        setEarned(function(p) { return p + PER_SEAT_UNI; });
        setBonus(function(p) { return p + PER_SEAT_BONUS; });
        // Simulate ~25% are your direct referrals
        if (seat % 4 === 0) setDirectEarned(function(p) { return p + DIRECT_PER; });
      }
      if (seat === 64) { setComplete(true); }
      if (seat >= 66) { clearInterval(timerRef.current); setRunning(false); }
    }, 80);
  }

  function resetSim() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false); setFilled(0); setEarned(0); setBonus(0); setDirectEarned(0); setComplete(false);
  }

  function changeTier(n) {
    resetSim();
    setSelectedTier(n);
  }

  useEffect(function() { return function() { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  var totalGrid = earned + bonus + directEarned;

  return (
    <div>
      {/* Tier selector */}
      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {TIERS.map(function(t) {
          var on = selectedTier === t.n;
          return (
            <button key={t.n} onClick={function() { changeTier(t.n); }}
              style={{padding:'8px 14px',borderRadius:8,border:on?'2px solid '+t.color:'2px solid #e8ecf2',
                background:on?t.color+'12':'#fff',cursor:'pointer',fontFamily:'inherit',
                fontSize:12,fontWeight:700,color:on?t.color:'#94a3b8',transition:'all .15s'}}>
              ${t.price}
            </button>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
        {/* LEFT — Grid + explainer */}
        <div style={{display:'grid',gridTemplateColumns:'55fr 45fr',gap:0,background:'#0f172a',borderRadius:14,overflow:'hidden'}}>
          {/* Explainer */}
          <div style={{padding:'28px 24px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:8}}>8×8 Profit Engine</div>
            <h3 style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#fff',margin:'0 0 14px',lineHeight:1.3}}>
              ${tier.name} Grid — ${PRICE}
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {text:'Each seat pays you 6.25% uni-level ($' + PER_SEAT_UNI.toFixed(2) + ')',color:'#6366f1'},
                {text:'Direct referrals also pay 40% ($' + DIRECT_PER.toFixed(0) + ')',color:'#0ea5e9'},
                {text:'5% per seat ($' + PER_SEAT_BONUS.toFixed(2) + ') accrues in the bonus pool',color:'#10b981'},
                {text:'Grid completes at 64 seats. Bonus pool paid on completion',color:'#f59e0b'},
              ].map(function(s, i) {
                return (
                  <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                    <div style={{width:5,height:5,borderRadius:3,background:s.color,flexShrink:0,marginTop:6}}/>
                    <div style={{fontSize:12,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>{s.text}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid animation */}
          <div style={{padding:'20px',background:'#0a0f1e',borderLeft:'1px solid #1e293b',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:800,color:'#fff'}}>${PRICE} Grid</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={startSim} disabled={running}
                  style={{padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:800,border:'none',cursor:running?'default':'pointer',
                    background:running?'#334155':'#0ea5e9',color:'#fff',fontFamily:'inherit',opacity:running?0.5:1}}>
                  {filled===0?'▶ Start':running?'Running...':'▶ Replay'}
                </button>
                {filled>0&&!running&&<button onClick={resetSim} style={{padding:'5px 8px',borderRadius:6,fontSize:10,fontWeight:700,border:'1px solid #334155',cursor:'pointer',background:'transparent',color:'#64748b',fontFamily:'inherit'}}>Reset</button>}
              </div>
            </div>
            <div style={{maxWidth:300,margin:'0 auto 10px',width:'100%'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:3}}>
                {Array.from({length:64}).map(function(_, i) {
                  var isFilled = i < filled;
                  var isLatest = i === filled - 1 && running;
                  return (
                    <div key={i} style={{
                      aspectRatio:'1',borderRadius:4,
                      background:isFilled?(isLatest?'#22d3ee':tier.color):'#1e293b',
                      border:'1px solid '+(isFilled?tier.color+'99':'#293548'),
                      transition:'all .12s ease',
                      transform:isLatest?'scale(1.15)':'scale(1)',
                      boxShadow:isLatest?'0 0 10px '+tier.color+'77':'none',
                    }}/>
                  );
                })}
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              {[
                {label:'SEATS',val:filled+'/64',color:'#fff'},
                {label:'UNI-LEVEL',val:'$'+Math.round(earned),color:'#6366f1'},
                {label:'BONUS',val:'$'+Math.round(bonus),color:'#10b981'},
              ].map(function(s, i) {
                return (
                  <div key={i} style={{flex:1,textAlign:'center',padding:'5px 3px',background:'#1e293b',borderRadius:6}}>
                    <div style={{fontSize:7,fontWeight:700,color:'#475569'}}>{s.label}</div>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:s.color}}>{s.val}</div>
                  </div>
                );
              })}
            </div>
            {complete && (
              <div style={{textAlign:'center',padding:'8px',background:'rgba(74,222,128,.08)',borderRadius:8,border:'1px solid rgba(74,222,128,.15)',marginTop:8}}>
                <div style={{fontSize:11,fontWeight:800,color:'#4ade80'}}>Grid Complete!</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Stats */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#0c4a6e,#0284c7)',borderRadius:14,padding:20,textAlign:'center',color:'#fff'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:4}}>Grid Total</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800}}>${Math.round(totalGrid).toLocaleString()}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:4}}>{filled}/64 seats · ${tier.name} tier</div>
          </div>

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#0ea5e9',marginBottom:10}}>Earnings Breakdown</div>
            {[
              {label:'Direct Sponsor (40%)',val:'$'+Math.round(directEarned),sub:'~16 personal referrals',color:'#0ea5e9'},
              {label:'Uni-Level (6.25% × 64)',val:'$'+Math.round(earned),sub:'All 64 seats',color:'#6366f1'},
              {label:'Completion Bonus (5%)',val:'$'+Math.round(bonus),sub:complete?'Paid on completion':'Accruing...',color:'#10b981'},
            ].map(function(e, i) {
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<2?'1px solid #f5f6f8':'none'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{e.label}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{e.sub}</div>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,color:e.color}}>{e.val}</div>
                </div>
              );
            })}
          </div>

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#0ea5e9',marginBottom:10}}>Commission Split</div>
            <div style={{height:24,borderRadius:6,overflow:'hidden',display:'flex',gap:2}}>
              <div style={{width:'40%',background:'#0ea5e9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff'}}>40%</div>
              <div style={{width:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff'}}>50%</div>
              <div style={{width:'5%',background:'#f59e0b'}}/>
              <div style={{width:'5%',background:'#10b981'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:'#64748b'}}>
              <span>Sponsor</span><span>Uni-Level</span><span>Platform</span><span>Bonus</span>
            </div>
          </div>

          <div style={{padding:'10px 12px',background:'#fffbeb',borderRadius:8,border:'1px solid #fef3c7',fontSize:10,color:'#92400e',lineHeight:1.5}}>
            <strong>Note:</strong> Direct sponsor earnings assume ~25% of seats are your personal referrals. Actual amounts depend on your referral activity.
          </div>
        </div>
      </div>
    </div>
  );
}
