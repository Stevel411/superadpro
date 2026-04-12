import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Zap, GraduationCap, Play, Pause, RotateCcw, ArrowRight } from 'lucide-react';
import { formatMoney } from '../utils/money';

// ══════════════════════════════════════════════════════════════
// COMBINED VISUALISER PAGE — Grid + Pass-Up
// ══════════════════════════════════════════════════════════════

var TABS = [
  { key: 'passup', label: 'Pass-Up Visualiser', icon: GraduationCap, color: 'var(--sap-purple)' },
  { key: 'grid', label: 'Grid Visualiser', icon: Zap, color: 'var(--sap-accent)' },
];

export default function PassupVisualiser() {
  var { t } = useTranslation();
  var [tab, setTab] = useState('passup');

  return (
    <AppLayout title={t("visualiser.title")} subtitle={t("visualiser.subtitle")}>
      <Link to="/compensation-plan" style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'var(--sap-text-muted)',textDecoration:'none',marginBottom:14}} onMouseEnter={function(e){e.currentTarget.style.color='var(--sap-accent)';}} onMouseLeave={function(e){e.currentTarget.style.color='var(--sap-text-muted)';}}>{t('visualiser.backToCompPlan')}</Link>
      <div style={{display:'flex',gap:6,marginBottom:24,borderBottom:'2px solid #e8ecf2',paddingBottom:0}}>
        {TABS.map(function(t) {
          var Icon = t.icon;
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              style={{display:'flex',alignItems:'center',gap:6,padding:'12px 20px',fontSize:13,fontWeight:active?800:600,
                border:'none',borderBottom:active?'3px solid '+t.color:'3px solid transparent',
                cursor:'pointer',fontFamily:'inherit',background:active?t.color+'08':'transparent',
                color:active?t.color:'var(--sap-text-muted)',marginBottom:-2,borderRadius:'8px 8px 0 0',transition:'all .2s'}}>
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
  var { t } = useTranslation();
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

  var canvasRef = useRef(null);
  var svgRef = useRef(null);
  var treeRef = useRef(null);
  var [flowDots, setFlowDots] = useState([]);
  var [floats, setFloats] = useState([]);
  var [glowId, setGlowId] = useState(null);
  var flowKeyRef = useRef(0);

  var YOU_ID = 1;
  var SPONSOR_ID = 0;

  // Draw connector lines after each render
  useEffect(function() {
    if (!canvasRef.current || !svgRef.current) return;
    var canvas = canvasRef.current;
    var svg = svgRef.current;
    var cr = canvas.getBoundingClientRect();
    svg.setAttribute('width', canvas.scrollWidth);
    svg.setAttribute('height', canvas.scrollHeight);
    svg.innerHTML = '';
    var tree = treeRef.current ? null : null; // just trigger
    (treeRef2.current || []).forEach(function(n) {
      if (!n || !n.visible || n.pid === null) return;
      var parent = treeRef2.current[n.pid];
      if (!parent || !parent.visible) return;
      var nel = canvasRef.current.querySelector('[data-nid="'+n.id+'"]');
      var pel = canvasRef.current.querySelector('[data-nid="'+n.pid+'"]');
      if (!nel || !pel) return;
      var nr = nel.getBoundingClientRect();
      var pr = pel.getBoundingClientRect();
      var x1 = pr.left + pr.width/2 - cr.left;
      var y1 = pr.top + pr.height - cr.top;
      var x2 = nr.left + nr.width/2 - cr.left;
      var y2 = nr.top - cr.top;
      var my = (y1 + y2) / 2;
      var path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M'+x1+','+y1+' C'+x1+','+my+' '+x2+','+my+' '+x2+','+y2);
      path.setAttribute('fill','none');
      path.setAttribute('stroke','var(--sap-border)');
      path.setAttribute('stroke-width','1.5');
      svg.appendChild(path);
    });
  });

  // Alias treeRef for line drawing (treeRef used for DOM, treeRef2 for data)
  var treeRef2 = useRef(null);

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

    // Your 10 direct referrals (triggers pass-ups at positions 2,4,6,8)
    for (var i = 0; i < 10; i++) {
      var c = mk(NAMES[ni++ % NAMES.length], YOU_ID);
      you.ch.push(c.id); you.rc++;
      c.puId = PU.has(you.rc) ? you.puId : YOU_ID;
    }

    // All 10 directs each get 4 referrals (L2 = 40 members)
    var yourDirects = all.filter(function(n) { return n.pid === YOU_ID; });
    for (var d = 0; d < yourDirects.length; d++) {
      var parent = yourDirects[d];
      for (var j = 0; j < 4; j++) {
        var child = mk(NAMES[ni++ % NAMES.length], parent.id);
        parent.ch.push(child.id); parent.rc++;
        child.puId = PU.has(parent.rc) ? parent.puId : parent.id;
      }
    }

    // First 16 L2 members each get 3 referrals (L3 = 48 members)
    var l2 = all.filter(function(n) { return n.pid !== null && all[n.pid] && all[n.pid].pid === YOU_ID; });
    for (var k = 0; k < Math.min(16, l2.length); k++) {
      for (var m = 0; m < 3; m++) {
        var l3 = mk(NAMES[ni++ % NAMES.length], l2[k].id);
        l2[k].ch.push(l3.id); l2[k].rc++;
        l3.puId = PU.has(l2[k].rc) ? l2[k].puId : l2[k].id;
      }
    }

    // First 12 L3 members each get 2 referrals (L4 = 24 members — shows deep cascade)
    var l3all = all.filter(function(n) {
      if (n.pid === null) return false;
      var p = all[n.pid]; if (!p || p.pid === null) return false;
      var gp = all[p.pid]; if (!gp) return false;
      return gp.pid === YOU_ID;
    });
    for (var q = 0; q < Math.min(12, l3all.length); q++) {
      for (var r = 0; r < 2; r++) {
        var l4 = mk(NAMES[ni++ % NAMES.length], l3all[q].id);
        l3all[q].ch.push(l4.id); l3all[q].rc++;
        l4.puId = PU.has(l3all[q].rc) ? l3all[q].puId : l3all[q].id;
      }
    }

    return all;
  }

  function buildSteps(tree) {
    var stps = [];
    var you = tree[YOU_ID];

    // Phase 1: Your 10 directs join
    you.ch.forEach(function(cid) { stps.push({ nodeId: cid, spId: YOU_ID }); });

    // Phase 2: All directs recruit (interleaved rounds)
    for (var round = 0; round < 4; round++) {
      you.ch.forEach(function(did) {
        var d = tree[did];
        if (d.ch[round] !== undefined) stps.push({ nodeId: d.ch[round], spId: did });
      });
    }

    // Phase 3: L2 recruit (interleaved)
    var l2 = tree.filter(function(n) { return n.pid !== null && tree[n.pid] && tree[n.pid].pid === YOU_ID; });
    for (var r2 = 0; r2 < 3; r2++) {
      l2.slice(0, 16).forEach(function(n) {
        if (n.ch[r2] !== undefined) stps.push({ nodeId: n.ch[r2], spId: n.id });
      });
    }

    // Phase 4: L3 recruit — deep cascade visible
    var l3 = tree.filter(function(n) {
      if (n.pid === null) return false;
      var p = tree[n.pid]; if (!p || p.pid === null) return false;
      var gp = tree[p.pid]; if (!gp) return false;
      return gp.pid === YOU_ID;
    });
    for (var r3 = 0; r3 < 2; r3++) {
      l3.slice(0, 12).forEach(function(n) {
        if (n.ch[r3] !== undefined) stps.push({ nodeId: n.ch[r3], spId: n.id });
      });
    }

    return stps;
  }

  function initSim() {
    if (timerRef.current) clearInterval(timerRef.current);
    var tree = buildTree();
    treeRef2.current = tree;
    treeRef.current = tree;
    stepsRef.current = buildSteps(tree);
    siRef.current = 0;
    statsRef.current = { kept: 0, passups: 0, keptAmt: 0, passupAmt: 0, totalSales: 0 };
    setPlaying(false);
    setLog([]);
    setFlowDots([]);
    setFloats([]);
    setGlowId(null);
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
        return [{ who: nn.nm, sale: saleNum, action: '↑ PASS UP → ' + recipient.nm, color: 'var(--sap-amber)', type: 'passup', amt: tier }].concat(l).slice(0, 20);
      });
      // Animate flow from sponsor to recipient
      animateFlow(sp.id, recipient.id, 'var(--sap-amber)', tier);
    } else {
      if (sp.id === YOU_ID) {
        statsRef.current.kept++;
        statsRef.current.keptAmt += tier;
      }
      statsRef.current.totalSales++;
      setLog(function(l) {
        return [{ who: nn.nm, sale: saleNum, action: 'KEPT ✓ ' + sp.nm, color: 'var(--sap-green-mid)', type: 'kept', amt: tier }].concat(l).slice(0, 20);
      });
      // Animate kept indicator on sponsor
      animateFlow(nn.id, sp.id, 'var(--sap-green-mid)', tier);
    }

    siRef.current = si + 1;
    setTick(function(t) { return t + 1; });
  }

  function animateFlow(fromId, toId, color, amt) {
    if (!canvasRef.current) return;
    var cr = canvasRef.current.getBoundingClientRect();
    var fromEl = canvasRef.current.querySelector('[data-nid="'+fromId+'"]');
    var toEl = canvasRef.current.querySelector('[data-nid="'+toId+'"]');
    if (!fromEl || !toEl) return;

    var fr = fromEl.getBoundingClientRect();
    var tr = toEl.getBoundingClientRect();
    var sx = fr.left + fr.width/2 - cr.left;
    var sy = fr.top + fr.height/2 - cr.top;
    var ex = tr.left + tr.width/2 - cr.left;
    var ey = tr.top + tr.height/2 - cr.top;

    // Animated dot
    var key = ++flowKeyRef.current;
    var steps = 8;
    var step = 0;
    function moveDot() {
      if (step > steps) {
        setFlowDots(function(d) { return d.filter(function(dd) { return dd.key !== key; }); });
        // Show float-up amount on recipient
        setFloats(function(f) { return f.concat([{key:key, x:ex, y:ey-20, color:color, amt:amt}]); });
        setTimeout(function() { setFloats(function(f) { return f.filter(function(ff) { return ff.key !== key; }); }); }, 1200);
        // Glow recipient
        setGlowId(toId);
        setTimeout(function() { setGlowId(null); }, 600);
        return;
      }
      var t = step / steps;
      var cx = sx + (ex - sx) * t;
      var cy = sy + (ey - sy) * t;
      setFlowDots(function(d) {
        var filtered = d.filter(function(dd) { return dd.key !== key; });
        return filtered.concat([{key:key, x:cx, y:cy, color:color}]);
      });
      step++;
      setTimeout(moveDot, 50);
    }
    moveDot();
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
                fontSize:14,fontWeight:700,color:on?'var(--sap-purple)':'var(--sap-text-muted)',transition:'all .15s'}}>
              ${t.p} {t.name}
            </button>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
        {/* LEFT — Tree */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-purple-light)'}}>{t('visualiser.infinitePassUp')}</div>
              <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>${tier} {tier===100?'Starter':tier===300?'Advanced':'Elite'} Tier</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={togglePlay}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',
                  background:playing?'#334155':'var(--sap-purple)',color:'#fff',fontSize:12,fontWeight:800,fontFamily:'inherit'}}>
                {playing ? <><Pause size={13}/> {t('common.pause')}</> : <><Play size={13}/> {t('common.play')}</>}
              </button>
              <button onClick={initSim}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 12px',borderRadius:8,border:'1px solid #e8ecf2',cursor:'pointer',
                  background:'#fff',color:'var(--sap-text-muted)',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                <RotateCcw size={13}/> Reset
              </button>
            </div>
          </div>

          <div style={{padding:'16px',minHeight:500,overflow:'auto',background:'#fafbfc',position:'relative'}} ref={canvasRef}>
            {/* SVG overlay for lines and flow dots */}
            <svg ref={svgRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0}}/>

            {/* Flow animations */}
            {flowDots.map(function(fd, i) {
              return (
                <div key={fd.key} style={{
                  position:'absolute',width:12,height:12,borderRadius:'50%',
                  background:fd.color,boxShadow:'0 0 12px '+fd.color+'99, 0 0 24px '+fd.color+'44',
                  zIndex:20,pointerEvents:'none',
                  left:fd.x-6,top:fd.y-6,
                  animation:'flowPulse .3s ease infinite alternate',
                }}/>
              );
            })}

            {/* Float-up amounts */}
            {floats.map(function(f) {
              return (
                <div key={f.key} style={{
                  position:'absolute',left:f.x,top:f.y,
                  fontSize:12,fontWeight:800,color:f.color,whiteSpace:'nowrap',
                  pointerEvents:'none',zIndex:25,
                  animation:'floatUp 1.2s ease forwards',transform:'translateX(-50%)',
                }}>${f.amt}</div>
              );
            })}

            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative',zIndex:1}} ref={treeRef}>
              {Array.from({length: maxLv + 1}).map(function(_, lv) {
                var lvNodes = levels[lv] || [];
                if (!lvNodes.length) return null;
                return (
                  <div key={lv} style={{display:'flex',gap:4,justifyContent:'center',flexWrap:'wrap'}}>
                    {lvNodes.map(function(n) {
                      var isRoot = n.cls === 'root';
                      var isSponsor = n.cls === 'sponsor';
                      var isKept = n.saleType === 'kept';
                      var isPassup = n.saleType === 'passup';
                      var isGlowing = glowId === n.id;

                      var bg = '#f0f9ff';
                      var borderC = 'rgba(14,165,233,.2)';
                      var textColor = 'var(--sap-text-primary)';
                      var w = 42; var h = 28;

                      if (isSponsor) { bg = 'var(--sap-indigo)'; borderC = '#818cf8'; textColor = '#fff'; w = 52; h = 36; }
                      else if (isRoot) { bg = 'var(--sap-accent)'; borderC = 'var(--sap-accent-light)'; textColor = '#fff'; w = 52; h = 36; }
                      else if (isKept) { bg = '#d1fae5'; borderC = 'var(--sap-green-mid)'; textColor = '#065f46'; }
                      else if (isPassup) { bg = 'var(--sap-amber-bg)'; borderC = 'var(--sap-amber)'; textColor = '#92400e'; }

                      return (
                        <div key={n.id} data-nid={n.id} style={{
                          width:w,height:h,borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                          background:bg,border:'1.5px solid '+borderC,transition:'all .3s ease',
                          boxShadow:isGlowing?'0 0 20px '+(isPassup?'rgba(245,158,11,.5)':'rgba(16,185,129,.5)'):'none',
                          transform:isGlowing?'scale(1.15)':'scale(1)',
                        }}>
                          <div style={{fontSize:isRoot||isSponsor?9:7,fontWeight:800,color:textColor,lineHeight:1.1}}>{n.nm}</div>
                          {n.sc > 0 && <div style={{fontSize:5,color:isSponsor||isRoot?'rgba(255,255,255,.6)':'var(--sap-text-muted)'}}>{n.sc}</div>}
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
              {label:'Your Sponsor',bg:'var(--sap-indigo)',border:'#818cf8'},
              {label:'You',bg:'var(--sap-accent)',border:'var(--sap-accent-light)'},
              {label:'Keeps Commission',bg:'#d1fae5',border:'var(--sap-green-mid)'},
              {label:'Pass-Up',bg:'var(--sap-amber-bg)',border:'var(--sap-amber)'},
            ].map(function(l, i) {
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--sap-text-muted)'}}>
                  <div style={{width:12,height:12,borderRadius:3,background:l.bg,border:'1.5px solid '+l.border,flexShrink:0}}/>
                  {l.label}
                </div>
              );
            })}
          </div>
          <style>{'\
            @keyframes floatUp { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-24px)} }\
            @keyframes flowPulse { 0%{transform:scale(1)} 100%{transform:scale(1.3)} }\
          '}</style>
        </div>

        {/* RIGHT — Stats */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#4c1d95,#7c3aed)',borderRadius:14,padding:20,textAlign:'center',color:'#fff'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:4}}>{t('visualiser.yourTotalThisRound')}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800}}>${totalAmt.toLocaleString()}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>{st.kept} kept · {st.passups} pass-ups received</div>
          </div>

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-purple)',marginBottom:10}}>{t('visualiser.liveEarnings')}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f6f8'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:4,background:'var(--sap-green-mid)'}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)'}}>{t('visualiser.directSalesKept')}</div><div style={{fontSize:10,color:'var(--sap-text-muted)'}}>{t('visualiser.yourSales')}</div></div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'var(--sap-green-mid)'}}>${st.keptAmt.toLocaleString()}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:4,background:'var(--sap-amber)'}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)'}}>{t('visualiser.passUpsReceived')}</div><div style={{fontSize:10,color:'var(--sap-text-muted)'}}>{t('visualiser.teamSalesFull')}</div></div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'var(--sap-amber)'}}>${st.passupAmt.toLocaleString()}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:1}}>{t('visualiser.directSales')}</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'var(--sap-green-mid)'}}>{st.kept}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:1}}>{t('visualiser.passUps')}</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'var(--sap-amber)'}}>{st.passups}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:1}}>{t('visualiser.teamSales')}</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'var(--sap-accent)'}}>{st.totalSales}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:1}}>{t('visualiser.tier')}</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-purple)'}}>${tier}</div>
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-purple)',marginBottom:10}}>{t('visualiser.fourPassUpRoutes')}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {[
                {n:'1',title:'Keep',desc:'Sales 1,3,5,7,9+',color:'var(--sap-green-mid)'},
                {n:'2',title:'Pass Up',desc:'Sales 2,4,6,8',color:'var(--sap-amber)'},
                {n:'3',title:'Cascade',desc:'Received pass-ups count in your pattern',color:'var(--sap-purple)'},
                {n:'4',title:'Infinite',desc:'No level cap on cascades',color:'var(--sap-pink)'},
              ].map(function(s, i) {
                return (
                  <div key={i} style={{padding:10,background:'var(--sap-bg-input)',borderRadius:8,border:'1px solid #e8ecf2',textAlign:'center'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:s.color+'15',color:s.color,fontSize:11,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:4}}>{s.n}</div>
                    <div style={{fontSize:11,fontWeight:800,color:'var(--sap-text-primary)'}}>{s.title}</div>
                    <div style={{fontSize:9,color:'var(--sap-text-muted)',lineHeight:1.4}}>{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16,flex:1,minHeight:180}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-purple)',marginBottom:10}}>{t('visualiser.activityLog')}</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:300,overflowY:'auto'}}>
              {log.length === 0 && <div style={{fontSize:11,color:'var(--sap-text-muted)'}}>{t('visualiser.pressPlayToWatch')}</div>}
              {log.map(function(l, i) {
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f5f6f8',fontSize:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0,overflow:'hidden'}}>
                      <span style={{fontWeight:700,color:'var(--sap-text-primary)',minWidth:36,flexShrink:0}}>{l.who}</span>
                      <span style={{color:'var(--sap-text-muted)',fontSize:10,flexShrink:0}}>#{l.sale}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,whiteSpace:'nowrap',flexShrink:0,
                        color:l.type==='kept'?'var(--sap-green-mid)':'var(--sap-amber)',
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
            <strong>{t('visualiser.disclaimer')}</strong> Simulation for educational purposes only. Actual earnings depend on personal activity and network performance. Income is not guaranteed.
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
  var { t } = useTranslation();
  var TIERS = [
    {n:1,name:'Starter',price:20,color:'#4ade80'},
    {n:2,name:'Builder',price:50,color:'var(--sap-accent-light)'},
    {n:3,name:'Pro',price:100,color:'var(--sap-accent)'},
    {n:4,name:'Advanced',price:200,color:'var(--sap-indigo)'},
    {n:5,name:'Elite',price:400,color:'var(--sap-purple)'},
    {n:6,name:'Premium',price:600,color:'var(--sap-amber)'},
    {n:7,name:'Executive',price:800,color:'#f97316'},
    {n:8,name:'Ultimate',price:1000,color:'var(--sap-pink)'},
  ];
  var DEPTH_COLORS = ['var(--sap-accent)','var(--sap-green-bright)','var(--sap-purple)','var(--sap-amber)','var(--sap-pink)','#06b6d4','#f97316','var(--sap-indigo)'];

  var [selectedTier, setSelectedTier] = useState(3);
  var [running, setRunning] = useState(false);
  var [speed, setSpeed] = useState(3);
  var [numDirects, setNumDirects] = useState(8);
  var cellsRef = useRef([]);
  var filledRef = useRef(0);
  var directSeatsRef = useRef(new Set());
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
    // Randomise which seats are direct referrals
    var positions = [];
    for (var i = 0; i < 64; i++) positions.push(i);
    for (var j = positions.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = positions[j]; positions[j] = positions[k]; positions[k] = tmp;
    }
    var ds = new Set();
    for (var d = 0; d < Math.min(numDirects, 64); d++) ds.add(positions[d]);
    directSeatsRef.current = ds;
    statsRef.current = {direct:0,network:0,earned:0,bonus:0,directAmt:0};
    logRef.current = [];
    setComplete(false);
    setRunning(false);
    setTick(function(t) { return t+1; });
  }

  useEffect(function() { initSim(); }, [selectedTier, numDirects]);
  useEffect(function() { return function() { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  function processStep() {
    var idx = filledRef.current;
    if (idx >= 64) {
      setComplete(true);
      setRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    var isDirect = directSeatsRef.current.has(idx);
    var depth = isDirect ? 1 : (idx < numDirects * 3 ? 2 : (idx < numDirects * 6 ? 3 : (idx < 50 ? 4 : 5)));
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
            Your grid fills from <span style={{color:'var(--sap-accent-light)'}}>{t('visualiser.entireNetworkFull')}</span>
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
                fontSize:13,fontWeight:700,color:on?t.color:'var(--sap-text-muted)',transition:'all .15s'}}>
              ${t.price} {t.name}
            </button>
          );
        })}
      </div>

      {/* Main 2-col layout */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16}}>
        {/* LEFT — Grid */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-accent-light)'}}>{t('visualiser.profitEngine')}</div>
              <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>${PRICE} {tier.name} Grid</div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'var(--sap-text-muted)',letterSpacing:1,background:'rgba(255,255,255,.08)',padding:'5px 10px',borderRadius:6}}>
                <span style={{color:'#fff',fontWeight:700}}>{t('visualiser.directs')}</span>
                <input type="number" min={1} max={30} value={numDirects}
                  onChange={function(e) { var v = parseInt(e.target.value); if (v >= 1 && v <= 30) setNumDirects(v); }}
                  style={{width:38,padding:'3px 4px',borderRadius:4,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:12,fontWeight:800,fontFamily:'inherit',textAlign:'center'}}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'var(--sap-text-muted)',letterSpacing:1}}>
                <span>{t('visualiser.speed')}</span>
                <input type="range" min={1} max={5} value={speed} onChange={function(e) { setSpeed(parseInt(e.target.value)); }}
                  style={{width:50,accentColor:'var(--sap-accent)',cursor:'pointer'}}/>
              </div>
              <button onClick={togglePlay}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',
                  background:running?'#334155':'var(--sap-accent)',color:'#fff',fontSize:12,fontWeight:800,fontFamily:'inherit'}}>
                {running ? <><Pause size={13}/> {t('common.pause')}</> : <><Play size={13}/> {filled>=64?'Replay':'Simulate'}</>}
              </button>
              <button onClick={initSim}
                style={{display:'flex',alignItems:'center',gap:4,padding:'7px 12px',borderRadius:8,border:'1px solid #e8ecf2',cursor:'pointer',
                  background:'#fff',color:'var(--sap-text-muted)',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                <RotateCcw size={13}/>
              </button>
            </div>
          </div>

          <div style={{padding:'20px'}}>
            {/* Progress bar */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{flex:1,height:8,background:'var(--sap-bg-page)',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:4,background:'linear-gradient(90deg,'+tier.color+',#22c55e)',width:pct+'%',transition:'width .3s'}}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:tier.color,minWidth:50,textAlign:'right'}}>{filled} / 64</div>
            </div>

            {/* 8×8 Grid — large cells with person icons */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6,marginBottom:16}}>
              {cells.map(function(c, i) {
                var isLatest = i === filled - 1 && running;
                var depthColor = c.filled ? DEPTH_COLORS[Math.min(c.depth - 1, 4)] : 'var(--sap-text-ghost)';
                return (
                  <div key={i} style={{
                    height:64,borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
                    background:c.filled?depthColor+'18':'var(--sap-bg-input)',
                    border:c.filled?'2px solid '+depthColor:'1.5px dashed #d1d5db',
                    transition:'all .4s cubic-bezier(.34,1.56,.64,1)',
                    transform:isLatest?'scale(1.08)':'scale(1)',
                    boxShadow:isLatest?'0 0 20px '+depthColor+'55, 0 4px 12px '+depthColor+'33':'none',
                    cursor:'default',position:'relative',overflow:'hidden',
                  }}>
                    {c.filled ? (
                      <>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{
                          animation: isLatest ? 'personPop .5s cubic-bezier(.34,1.56,.64,1)' : 'none',
                        }}>
                          <circle cx="12" cy="8" r="4" fill={depthColor}/>
                          <path d="M4 21v-1a6 6 0 0112 0v1" fill={depthColor} opacity=".7"/>
                          {c.isDirect && <circle cx="19" cy="5" r="4" fill="var(--sap-amber)"/>}
                          {c.isDirect && <text x="19" y="7" textAnchor="middle" fontSize="5" fontWeight="800" fill="#fff">$</text>}
                        </svg>
                        <div style={{fontSize:8,fontWeight:800,color:depthColor,lineHeight:1}}>{c.name.slice(0,4)}</div>
                      </>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" opacity=".25">
                          <circle cx="12" cy="8" r="4" stroke="var(--sap-text-muted)" strokeWidth="2" strokeDasharray="3 3"/>
                          <path d="M4 21v-1a6 6 0 0112 0v1" stroke="var(--sap-text-muted)" strokeWidth="2" strokeDasharray="3 3"/>
                        </svg>
                        <div style={{fontSize:7,color:'var(--sap-text-ghost)',fontWeight:600}}>{i+1}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <style>{'\
              @keyframes personPop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 50%{transform:scale(1.3) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }\
            '}</style>

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
                  <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'var(--sap-text-muted)'}}>
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
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(56,189,248,.5)',marginBottom:4}}>{t('visualiser.yourTotalEarnings')}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:800}}>${Math.round(totalEarned).toLocaleString()}</div>
            <div style={{fontSize:11,color:'rgba(200,220,255,.35)',marginTop:4}}>Per grid completion · {tier.name} tier</div>
          </div>

          {/* Commission split bar */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-accent)',marginBottom:8}}>Per Seat — ${PRICE}</div>
            <div style={{height:8,borderRadius:4,overflow:'hidden',display:'flex',gap:2,marginBottom:8}}>
              <div style={{flex:40,background:'var(--sap-accent)',borderRadius:3}}/>
              <div style={{flex:50,background:'var(--sap-indigo)',borderRadius:3}}/>
              <div style={{flex:5,background:'var(--sap-amber)',borderRadius:3}}/>
              <div style={{flex:5,background:'var(--sap-green-mid)',borderRadius:3}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
              <span style={{color:'var(--sap-accent)',fontWeight:700}}>{t('visualiser.sponsorSplit')}</span>
              <span style={{color:'var(--sap-indigo)',fontWeight:700}}>{t('visualiser.uniLevelSplit')}</span>
              <span style={{color:'var(--sap-amber)',fontWeight:600}}>5%</span>
              <span style={{color:'var(--sap-green-mid)',fontWeight:600}}>5%</span>
            </div>
          </div>

          {/* 2x2 mini stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-accent)'}}>{st.direct}</div>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:.5}}>{t('visualiser.directFills')}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-green-bright)'}}>{st.network}</div>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:.5}}>{t('visualiser.networkFills')}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-indigo)'}}>${Math.round(st.earned)}</div>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:.5}}>{t('visualiser.uniLevel')}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:12,textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-green-mid)'}}>${Math.round(st.bonus)}</div>
              <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',letterSpacing:.5}}>{t('visualiser.bonus')}</div>
            </div>
          </div>

          {/* Earnings breakdown */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-accent)',marginBottom:10}}>{t('visualiser.earningsBreakdown')}</div>
            {[
              {label:'Direct Sponsor (40%)',val:'$'+Math.round(st.directAmt),color:'var(--sap-accent)'},
              {label:'Uni-Level (6.25% × '+filled+')',val:'$'+Math.round(st.earned),color:'var(--sap-indigo)'},
              {label:'Bonus Pool (5% × '+filled+')',val:'$'+Math.round(st.bonus),color:'var(--sap-green-mid)'},
            ].map(function(e, i) {
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<2?'1px solid #f5f6f8':'none'}}>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--sap-text-secondary)'}}>{e.label}</span>
                  <span style={{fontSize:16,fontWeight:800,color:e.color}}>{e.val}</span>
                </div>
              );
            })}
          </div>

          {/* Live commission log */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:16,flex:1,minHeight:180}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-accent)',marginBottom:10}}>{t('visualiser.liveCommissionFeed')}</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:280,overflowY:'auto'}}>
              {logs.length === 0 && <div style={{fontSize:11,color:'var(--sap-text-muted)',textAlign:'center',padding:12}}>{t('visualiser.pressSimulateToStart')}</div>}
              {logs.map(function(l, i) {
                var color = DEPTH_COLORS[l.depth - 1];
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f5f6f8',fontSize:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{display:'inline-block',width:8,height:8,borderRadius:3,background:color,flexShrink:0}}/>
                      <span style={{fontWeight:700,color:'var(--sap-text-primary)'}}>{l.name}</span>
                      <span style={{fontSize:10,color:'var(--sap-text-muted)'}}>#{l.seat}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,color:color,
                        background:color+'12',border:'1px solid '+color+'25'}}>
                        {l.isDirect?'DIRECT':'L'+l.depth}
                      </span>
                    </div>
                    <span style={{fontWeight:700,color:color,fontSize:12}}>+${formatMoney(l.uniAmt + l.directAmt)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completion banner */}
          {complete && (
            <div style={{textAlign:'center',padding:16,background:'linear-gradient(135deg,rgba(74,222,128,.08),rgba(14,165,233,.08))',borderRadius:12,border:'1px solid rgba(74,222,128,.15)'}}>
              <div style={{fontSize:16,fontWeight:800,color:'#4ade80',marginBottom:6}}>{t('visualiser.gridComplete')}</div>
              <div style={{fontSize:12,color:'var(--sap-text-muted)'}}>64 seats filled. Total earned: <strong style={{color:'var(--sap-accent)'}}>${Math.round(totalEarned).toLocaleString()}</strong></div>
              <div style={{fontSize:11,color:'var(--sap-text-muted)',marginTop:4}}>{t('visualiser.gridAdvancesBody')}</div>
            </div>
          )}

          <div style={{padding:'10px 12px',background:'#fffbeb',borderRadius:8,border:'1px solid #fef3c7',fontSize:10,color:'#92400e',lineHeight:1.5}}>
            <strong>{t('visualiser.note')}</strong> Adjust the DIRECTS control to set how many of the 64 seats are your personal referrals. Direct referrals earn you 40% sponsor commission on top of the 6.25% uni-level. Income is not guaranteed.
          </div>
        </div>
      </div>
    </div>
  );
}
