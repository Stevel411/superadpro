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
  var PU = new Set([2, 4, 6, 8]);
  var NAMES = ['Alex','Beth','Carl','Dana','Eric','Faye','Gina','Hugo','Iris','Jake',
               'Kate','Leo','Mia','Nate','Olga','Paul','Quinn','Rosa','Sam','Tina',
               'Uma','Vic','Wendy','Xena','Yara','Zoe'];

  var [tier, setTier] = useState(100);
  var [tick, setTick] = useState(0); // render trigger
  var [playing, setPlaying] = useState(false);
  var [log, setLog] = useState([]);
  var treeRef = useRef(null);
  var stepsRef = useRef([]);
  var siRef = useRef(0);
  var timerRef = useRef(null);
  var statsRef = useRef({ kept: 0, passups: 0, keptAmt: 0, passupAmt: 0, totalSales: 0 });

  var YOU_ID = 1;
  var SPONSOR_ID = 0;

  function buildTree() {
    var all = []; var id = 0; var ni = 0;
    function mk(nm, pid, cls) {
      var n = { id: id++, nm: nm, pid: pid, puId: null, sc: 0, rc: 0, ch: [], visible: false, cls: cls || '', saleType: null };
      all.push(n);
      return n;
    }

    var sp = mk('SPONSOR', null, 'sponsor'); sp.visible = true;
    var you = mk('YOU', sp.id, 'root'); you.visible = true; you.puId = sp.id;
    sp.ch.push(you.id); sp.rc++;

    // Your 9 direct referrals
    for (var i = 0; i < 9; i++) {
      var c = mk(NAMES[ni++ % NAMES.length], YOU_ID);
      you.ch.push(c.id); you.rc++;
      c.puId = PU.has(you.rc) ? you.puId : YOU_ID;
    }

    // First 5 directs each get 4 referrals (L2)
    for (var d = 0; d < 5; d++) {
      var parent = all[you.ch[d]];
      for (var j = 0; j < 4; j++) {
        var child = mk(NAMES[ni++ % NAMES.length], parent.id);
        parent.ch.push(child.id); parent.rc++;
        child.puId = PU.has(parent.rc) ? parent.puId : parent.id;
      }
    }

    // First 8 L2 members each get 2 referrals (L3)
    var l2 = all.filter(function(n) { return n.pid !== null && all[n.pid] && all[n.pid].pid === YOU_ID; });
    for (var k = 0; k < Math.min(8, l2.length); k++) {
      for (var m = 0; m < 2; m++) {
        var l3 = mk(NAMES[ni++ % NAMES.length], l2[k].id);
        l2[k].ch.push(l3.id); l2[k].rc++;
        l3.puId = PU.has(l2[k].rc) ? l2[k].puId : l2[k].id;
      }
    }

    return all;
  }

  function buildSteps(tree) {
    var stps = [];
    var you = tree[YOU_ID];

    // Phase 1: Your 9 directs join
    you.ch.forEach(function(cid) { stps.push({ nodeId: cid, spId: YOU_ID }); });

    // Phase 2: First 5 directs recruit (interleaved)
    for (var round = 0; round < 4; round++) {
      you.ch.slice(0, 5).forEach(function(did) {
        var d = tree[did];
        if (d.ch[round] !== undefined) stps.push({ nodeId: d.ch[round], spId: did });
      });
    }

    // Phase 3: L2 recruit
    var l2 = tree.filter(function(n) { return n.pid !== null && tree[n.pid] && tree[n.pid].pid === YOU_ID; });
    for (var r2 = 0; r2 < 2; r2++) {
      l2.slice(0, 8).forEach(function(n) {
        if (n.ch[r2] !== undefined) stps.push({ nodeId: n.ch[r2], spId: n.id });
      });
    }

    return stps;
  }

  function initSim() {
    if (timerRef.current) clearInterval(timerRef.current);
    var tree = buildTree();
    treeRef.current = tree;
    stepsRef.current = buildSteps(tree);
    siRef.current = 0;
    statsRef.current = { kept: 0, passups: 0, keptAmt: 0, passupAmt: 0, totalSales: 0 };
    setPlaying(false);
    setLog([]);
    setTick(function(t) { return t + 1; });
  }

  useEffect(function() { initSim(); }, [tier]);
  useEffect(function() { return function() { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  function processStep() {
    var tree = treeRef.current;
    var steps = stepsRef.current;
    var si = siRef.current;

    if (si >= steps.length) {
      setPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    var step = steps[si];
    var nn = tree[step.nodeId];
    var sp = tree[step.spId];

    // Reveal node
    nn.visible = true;

    // Sponsor gets a sale
    sp.sc++;
    var saleNum = sp.sc;
    var isPassUp = PU.has(saleNum);

    nn.saleType = isPassUp ? 'passup' : 'kept';

    if (isPassUp) {
      var recipientId = sp.puId;
      var recipient = recipientId != null ? tree[recipientId] : tree[SPONSOR_ID];
      if (recipient.id === YOU_ID) {
        statsRef.current.passups++;
        statsRef.current.passupAmt += tier;
      }
      statsRef.current.totalSales++;
      setLog(function(l) {
        return [{ who: nn.nm, sale: saleNum, action: '↑ PASS UP → ' + recipient.nm, color: '#f59e0b', type: 'passup', amt: tier }].concat(l).slice(0, 20);
      });
    } else {
      if (sp.id === YOU_ID) {
        statsRef.current.kept++;
        statsRef.current.keptAmt += tier;
      }
      statsRef.current.totalSales++;
      setLog(function(l) {
        return [{ who: nn.nm, sale: saleNum, action: 'KEPT ✓ ' + sp.nm, color: '#10b981', type: 'kept', amt: tier }].concat(l).slice(0, 20);
      });
    }

    siRef.current = si + 1;
    setTick(function(t) { return t + 1; });
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (siRef.current >= stepsRef.current.length) {
        initSim();
        setTimeout(function() { startPlay(); }, 100);
        return;
      }
      startPlay();
    }
  }

  function startPlay() {
    setPlaying(true);
    timerRef.current = setInterval(processStep, 900);
  }

  // Build level map for rendering
  var tree = treeRef.current || [];
  function getLevel(n) {
    var lv = 0; var cur = n;
    while (cur.pid !== null && tree[cur.pid]) { lv++; cur = tree[cur.pid]; }
    return lv;
  }
  var levels = {};
  tree.forEach(function(n) {
    if (!n || !n.visible) return;
    var lv = getLevel(n);
    if (!levels[lv]) levels[lv] = [];
    levels[lv].push(n);
  });
  var maxLv = Math.max.apply(null, Object.keys(levels).map(Number).concat([0]));

  var st = statsRef.current;
  var totalAmt = st.keptAmt + st.passupAmt;

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
        {/* LEFT — Tree */}
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

          <div style={{padding:'20px',minHeight:380,overflow:'auto',background:'#fafbfc'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
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

                      var bg = '#f0f9ff';
                      var borderC = 'rgba(14,165,233,.2)';
                      var textColor = '#0f172a';
                      var w = 50; var h = 36;

                      if (isSponsor) { bg = '#6366f1'; borderC = '#818cf8'; textColor = '#fff'; w = 58; h = 44; }
                      else if (isRoot) { bg = '#0ea5e9'; borderC = '#38bdf8'; textColor = '#fff'; w = 58; h = 44; }
                      else if (isKept) { bg = '#d1fae5'; borderC = '#10b981'; textColor = '#065f46'; }
                      else if (isPassup) { bg = '#fef3c7'; borderC = '#f59e0b'; textColor = '#92400e'; }

                      return (
                        <div key={n.id} style={{
                          width:w,height:h,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                          background:bg,border:'2px solid '+borderC,transition:'all .3s ease',
                        }}>
                          <div style={{fontSize:isRoot||isSponsor?10:8,fontWeight:800,color:textColor,lineHeight:1.2}}>{n.nm}</div>
                          {n.sc > 0 && <div style={{fontSize:6,color:isSponsor||isRoot?'rgba(255,255,255,.6)':'#94a3b8'}}>{n.sc} sale{n.sc!==1?'s':''}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{padding:'12px 20px',borderTop:'1px solid #e8ecf2',display:'flex',gap:14,flexWrap:'wrap'}}>
            {[
              {label:'Your Sponsor',bg:'#6366f1',border:'#818cf8'},
              {label:'You',bg:'#0ea5e9',border:'#38bdf8'},
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

        {/* RIGHT — Stats */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#4c1d95,#7c3aed)',borderRadius:14,padding:20,textAlign:'center',color:'#fff'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:4}}>Your Total This Round</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800}}>${totalAmt.toLocaleString()}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>{st.kept} kept · {st.passups} pass-ups received</div>
          </div>

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:10}}>Live Earnings</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f6f8'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:4,background:'#10b981'}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>Direct Sales Kept</div><div style={{fontSize:10,color:'#94a3b8'}}>Your sales 1,3,5,7,9+</div></div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'#10b981'}}>${st.keptAmt.toLocaleString()}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:4,background:'#f59e0b'}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>Pass-Ups Received</div><div style={{fontSize:10,color:'#94a3b8'}}>Team's 2nd, 4th, 6th, 8th</div></div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'#f59e0b'}}>${st.passupAmt.toLocaleString()}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>DIRECT SALES</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#10b981'}}>{st.kept}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>PASS-UPS</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#f59e0b'}}>{st.passups}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>TEAM SALES</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#0ea5e9'}}>{st.totalSales}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1}}>TIER</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#8b5cf6'}}>${tier}</div>
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:10}}>4 Pass-Up Routes</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {[
                {n:'1',title:'Keep',desc:'Sales 1,3,5,7,9+',color:'#10b981'},
                {n:'2',title:'Pass Up',desc:'Sales 2,4,6,8',color:'#f59e0b'},
                {n:'3',title:'Cascade',desc:'Received pass-ups count in your pattern',color:'#8b5cf6'},
                {n:'4',title:'Infinite',desc:'No level cap on cascades',color:'#ec4899'},
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

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16,flex:1,minHeight:180}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:10}}>Activity Log</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:300,overflowY:'auto'}}>
              {log.length === 0 && <div style={{fontSize:11,color:'#94a3b8'}}>Press Play to watch your team build...</div>}
              {log.map(function(l, i) {
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f5f6f8',fontSize:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0,overflow:'hidden'}}>
                      <span style={{fontWeight:700,color:'#0f172a',minWidth:36,flexShrink:0}}>{l.who}</span>
                      <span style={{color:'#94a3b8',fontSize:10,flexShrink:0}}>#{l.sale}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,whiteSpace:'nowrap',flexShrink:0,
                        color:l.type==='kept'?'#10b981':'#f59e0b',
                        background:l.type==='kept'?'rgba(16,185,129,.06)':'rgba(245,158,11,.06)',
                        border:'1px solid '+(l.type==='kept'?'rgba(16,185,129,.2)':'rgba(245,158,11,.2)')}}>{l.action}</span>
                    </div>
                    <span style={{fontWeight:700,color:l.color,fontSize:12,flexShrink:0,marginLeft:6}}>${l.amt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{padding:'10px 12px',background:'#fffbeb',borderRadius:8,border:'1px solid #fef3c7',fontSize:10,color:'#92400e',lineHeight:1.5}}>
            <strong>Disclaimer:</strong> Simulation for educational purposes only. Actual earnings depend on personal activity and network performance. Income is not guaranteed.
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
  var DEPTH_COLORS = ['#0ea5e9','#22c55e','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#f97316','#6366f1'];

  var [selectedTier, setSelectedTier] = useState(3);
  var [running, setRunning] = useState(false);
  var [speed, setSpeed] = useState(3);
  var cellsRef = useRef([]); // mutable: [{filled, depth, isDirect, name}]
  var filledRef = useRef(0);
  var statsRef = useRef({direct:0,network:0,earned:0,bonus:0,directAmt:0});
  var logRef = useRef([]);
  var [tick, setTick] = useState(0);
  var [complete, setComplete] = useState(false);
  var timerRef = useRef(null);

  var tier = TIERS.find(function(t) { return t.n === selectedTier; }) || TIERS[2];
  var PRICE = tier.price;
  var NAMES = ['Alex','Beth','Carl','Dana','Eric','Faye','Gina','Hugo','Iris','Jake','Kate','Leo','Mia','Nate','Olga','Paul','Quinn','Rosa','Sam','Tina','Uma','Vic','Wendy','Xena','Yara','Zoe'];

  function initSim() {
    if (timerRef.current) clearInterval(timerRef.current);
    cellsRef.current = Array.from({length:64}).map(function() { return {filled:false,depth:0,isDirect:false,name:''}; });
    filledRef.current = 0;
    statsRef.current = {direct:0,network:0,earned:0,bonus:0,directAmt:0};
    logRef.current = [];
    setComplete(false);
    setRunning(false);
    setTick(function(t) { return t+1; });
  }

  useEffect(function() { initSim(); }, [selectedTier]);
  useEffect(function() { return function() { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  function processStep() {
    var idx = filledRef.current;
    if (idx >= 64) {
      setComplete(true);
      setRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    var depth = idx < 8 ? 1 : idx < 24 ? 2 : idx < 48 ? 3 : 4;
    var isDirect = depth === 1;
    var name = NAMES[idx % NAMES.length];

    cellsRef.current[idx] = {filled:true, depth:depth, isDirect:isDirect, name:name};
    filledRef.current = idx + 1;

    var uniAmt = PRICE * 0.0625;
    var bonusAmt = PRICE * 0.05;
    var directAmt = isDirect ? PRICE * 0.40 : 0;

    statsRef.current.earned += uniAmt;
    statsRef.current.bonus += bonusAmt;
    if (isDirect) { statsRef.current.direct++; statsRef.current.directAmt += directAmt; }
    else { statsRef.current.network++; }

    logRef.current = [{
      name: name,
      seat: idx + 1,
      depth: depth,
      isDirect: isDirect,
      uniAmt: uniAmt,
      directAmt: directAmt,
    }].concat(logRef.current).slice(0, 20);

    setTick(function(t) { return t+1; });
  }

  function togglePlay() {
    if (running) {
      setRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (filledRef.current >= 64) { initSim(); setTimeout(startPlay, 100); return; }
      startPlay();
    }
  }

  function startPlay() {
    setRunning(true);
    var delay = Math.round(500 - (speed - 1) * 100);
    timerRef.current = setInterval(processStep, delay);
  }

  var cells = cellsRef.current;
  var filled = filledRef.current;
  var st = statsRef.current;
  var logs = logRef.current;
  var totalEarned = st.earned + st.bonus + st.directAmt;
  var pct = Math.round((filled / 64) * 100);

  return (
    <div>
      {/* Explainer banner */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',borderRadius:14,padding:'28px 32px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-30,right:-30,width:160,height:160,borderRadius:'50%',background:'rgba(14,165,233,.05)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <h2 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#fff',margin:'0 0 8px'}}>
            Your grid fills from <span style={{color:'#38bdf8'}}>your entire network</span>
          </h2>
          <p style={{fontSize:13,color:'rgba(255,255,255,.5)',maxWidth:560,lineHeight:1.7,margin:0}}>
            Every person who joins anywhere in your downline fills a seat in your grid. Your direct referrals AND their referrals AND deeper — all the way down. One person, one seat, per advance.
          </p>
        </div>
      </div>

      {/* Tier selector */}
      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {TIERS.map(function(t) {
          var on = selectedTier === t.n;
          return (
            <button key={t.n} onClick={function() { setSelectedTier(t.n); }}
              style={{padding:'8px 16px',borderRadius:8,border:on?'2px solid '+t.color:'2px solid #e8ecf2',
                background:on?t.color+'12':'#fff',cursor:'pointer',fontFamily:'inherit',
                fontSize:13,fontWeight:700,color:on?t.color:'#94a3b8',transition:'all .15s'}}>
              ${t.price} {t.name}
            </button>
          );
        })}
      </div>

      {/* Main 2-col layout */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16}}>
        {/* LEFT — Grid */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'#1c223d',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8'}}>8×8 Profit Engine</div>
              <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>${PRICE} {tier.name} Grid</div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'#64748b',letterSpacing:1}}>
                <span>SPEED</span>
                <input type="range" min={1} max={5} value={speed} onChange={function(e) { setSpeed(parseInt(e.target.value)); }}
                  style={{width:50,accentColor:'#0ea5e9',cursor:'pointer'}}/>
              </div>
              <button onClick={togglePlay}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',
                  background:running?'#334155':'#0ea5e9',color:'#fff',fontSize:12,fontWeight:800,fontFamily:'inherit'}}>
                {running ? <><Pause size={13}/> Pause</> : <><Play size={13}/> {filled>=64?'Replay':'Simulate'}</>}
              </button>
              <button onClick={initSim}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 12px',borderRadius:8,border:'1px solid #e8ecf2',cursor:'pointer',
                  background:'#fff',color:'#64748b',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                <RotateCcw size={13}/>
              </button>
            </div>
          </div>

          <div style={{padding:'20px'}}>
            {/* Progress bar */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:4,background:'linear-gradient(90deg,'+tier.color+',#22c55e)',width:pct+'%',transition:'width .3s'}}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:tier.color,minWidth:50,textAlign:'right'}}>{filled} / 64</div>
            </div>

            {/* 8×8 Grid — large cells */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:5,marginBottom:16}}>
              {cells.map(function(c, i) {
                var isLatest = i === filled - 1 && running;
                var bg = c.filled ? DEPTH_COLORS[c.depth - 1] : '#f1f5f9';
                var borderStyle = c.filled ? '2px solid ' + DEPTH_COLORS[c.depth - 1] : '1px dashed #d1d5db';
                return (
                  <div key={i} style={{
                    height:44,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
                    background:c.filled?bg:'#f8f9fb',border:borderStyle,
                    fontSize:c.filled?10:8,fontWeight:800,color:c.filled?'#fff':'#cbd5e1',
                    transition:'all .3s cubic-bezier(.34,1.56,.64,1)',
                    transform:isLatest?'scale(1.12)':'scale(1)',
                    boxShadow:isLatest?'0 0 16px '+DEPTH_COLORS[c.depth-1]+'66':'none',
                    cursor:'default',position:'relative',
                  }}>
                    {c.filled ? c.name.slice(0,3) : (i+1)}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              {[
                {label:'Direct (L1)',color:DEPTH_COLORS[0]},
                {label:'Level 2',color:DEPTH_COLORS[1]},
                {label:'Level 3',color:DEPTH_COLORS[2]},
                {label:'Level 4',color:DEPTH_COLORS[3]},
                {label:'Level 5+',color:DEPTH_COLORS[4]},
              ].map(function(l, i) {
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#64748b'}}>
                    <div style={{width:10,height:10,borderRadius:3,background:l.color,flexShrink:0}}/>{l.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Stats + Log */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Total hero */}
          <div style={{background:'linear-gradient(135deg,#0b1729,#132240)',borderRadius:14,padding:20,textAlign:'center',color:'#fff'}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(56,189,248,.5)',marginBottom:4}}>Your Total Earnings</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:800}}>${Math.round(totalEarned).toLocaleString()}</div>
            <div style={{fontSize:11,color:'rgba(200,220,255,.35)',marginTop:4}}>Per grid completion · {tier.name} tier</div>
          </div>

          {/* Commission split bar */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#0ea5e9',marginBottom:8}}>Per Seat — ${PRICE}</div>
            <div style={{height:8,borderRadius:4,overflow:'hidden',display:'flex',gap:2,marginBottom:8}}>
              <div style={{flex:40,background:'#0ea5e9',borderRadius:3}}/>
              <div style={{flex:50,background:'#6366f1',borderRadius:3}}/>
              <div style={{flex:5,background:'#f59e0b',borderRadius:3}}/>
              <div style={{flex:5,background:'#10b981',borderRadius:3}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
              <span style={{color:'#0ea5e9',fontWeight:700}}>40% Sponsor</span>
              <span style={{color:'#6366f1',fontWeight:700}}>50% Uni-Level</span>
              <span style={{color:'#f59e0b',fontWeight:600}}>5%</span>
              <span style={{color:'#10b981',fontWeight:600}}>5%</span>
            </div>
          </div>

          {/* 2x2 mini stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0ea5e9'}}>{st.direct}</div>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:.5}}>Direct Fills</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#22c55e'}}>{st.network}</div>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:.5}}>Network Fills</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#6366f1'}}>${Math.round(st.earned)}</div>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:.5}}>Uni-Level</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#10b981'}}>${Math.round(st.bonus)}</div>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:.5}}>Bonus Pool</div>
            </div>
          </div>

          {/* Earnings breakdown */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#0ea5e9',marginBottom:10}}>Earnings Breakdown</div>
            {[
              {label:'Direct Sponsor (40%)',val:'$'+Math.round(st.directAmt),color:'#0ea5e9'},
              {label:'Uni-Level (6.25% × '+filled+')',val:'$'+Math.round(st.earned),color:'#6366f1'},
              {label:'Bonus Pool (5% × '+filled+')',val:'$'+Math.round(st.bonus),color:'#10b981'},
            ].map(function(e, i) {
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<2?'1px solid #f5f6f8':'none'}}>
                  <span style={{fontSize:12,fontWeight:600,color:'#475569'}}>{e.label}</span>
                  <span style={{fontSize:16,fontWeight:800,color:e.color}}>{e.val}</span>
                </div>
              );
            })}
          </div>

          {/* Live commission log */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16,flex:1,minHeight:180}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#0ea5e9',marginBottom:10}}>Live Commission Feed</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:280,overflowY:'auto'}}>
              {logs.length === 0 && <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',padding:12}}>Press Simulate to start...</div>}
              {logs.map(function(l, i) {
                var color = DEPTH_COLORS[l.depth - 1];
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f5f6f8',fontSize:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{display:'inline-block',width:8,height:8,borderRadius:3,background:color,flexShrink:0}}/>
                      <span style={{fontWeight:700,color:'#0f172a'}}>{l.name}</span>
                      <span style={{fontSize:10,color:'#94a3b8'}}>#{l.seat}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,color:color,
                        background:color+'12',border:'1px solid '+color+'25'}}>
                        {l.isDirect?'DIRECT':'L'+l.depth}
                      </span>
                    </div>
                    <span style={{fontWeight:700,color:color,fontSize:12}}>+${(l.uniAmt + l.directAmt).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completion banner */}
          {complete && (
            <div style={{textAlign:'center',padding:16,background:'linear-gradient(135deg,rgba(74,222,128,.08),rgba(14,165,233,.08))',borderRadius:12,border:'1px solid rgba(74,222,128,.15)'}}>
              <div style={{fontSize:16,fontWeight:800,color:'#4ade80',marginBottom:6}}>Grid Complete!</div>
              <div style={{fontSize:12,color:'#64748b'}}>64 seats filled. Total earned: <strong style={{color:'#0ea5e9'}}>${Math.round(totalEarned).toLocaleString()}</strong></div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>Grid advances to the next round. Future earnings require new network activity.</div>
            </div>
          )}

          <div style={{padding:'10px 12px',background:'#fffbeb',borderRadius:8,border:'1px solid #fef3c7',fontSize:10,color:'#92400e',lineHeight:1.5}}>
            <strong>Note:</strong> Direct fills assume first 8 seats are your personal referrals. Actual amounts depend on your referral activity. Income is not guaranteed.
          </div>
        </div>
      </div>
    </div>
  );
}
