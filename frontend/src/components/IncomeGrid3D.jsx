import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

extend({ OrbitControls: OrbitControls });

var TOTAL = 64;
var TIERS = [
  {price:20,color:'#10b981',name:'Starter'},
  {price:50,color:'#0ea5e9',name:'Builder'},
  {price:100,color:'#6366f1',name:'Pro'},
  {price:200,color:'#8b5cf6',name:'Advanced'},
  {price:400,color:'#f59e0b',name:'Elite'},
  {price:600,color:'#ec4899',name:'Premium'},
  {price:800,color:'#ef4444',name:'Executive'},
  {price:1000,color:'#fbbf24',name:'Ultimate'},
];

function genPositions() {
  var pts = [];
  for (var i = 0; i < TOTAL; i++) {
    var a = (i / TOTAL) * Math.PI * 6 + Math.floor(Math.sqrt(i)) * 0.5;
    var r = 0.8 + (i / TOTAL) * 2.5;
    pts.push([Math.cos(a) * r, Math.sin(i * 0.3) * 0.3 - 0.3, Math.sin(a) * r]);
  }
  return pts;
}

function Controls() {
  var { camera, gl } = useThree();
  var ref = useRef();
  useFrame(function() { if (ref.current) ref.current.update(); });
  return <orbitControls ref={ref} args={[camera, gl.domElement]} enablePan={false} autoRotate autoRotateSpeed={0.5} minDistance={3} maxDistance={12} maxPolarAngle={Math.PI*0.75} minPolarAngle={Math.PI*0.25} />;
}

function CenterNode() {
  var ref = useRef();
  useFrame(function(s) {
    if (!ref.current) return;
    ref.current.rotation.y += 0.008;
    ref.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 2) * 0.06);
  });
  return (
    <group>
      <mesh ref={ref}>
        <dodecahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.6} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function Nodes({ positions, filled, tierColor }) {
  var col = useMemo(function() { return new THREE.Color(tierColor); }, [tierColor]);
  var dim = useMemo(function() { return new THREE.Color('#1e293b'); }, []);
  var refs = useRef([]);

  useFrame(function(s) {
    for (var i = 0; i < positions.length; i++) {
      var m = refs.current[i];
      if (!m) continue;
      var on = i < filled;
      var t = on ? 1 : 0.4;
      m.scale.setScalar(m.scale.x + (t - m.scale.x) * 0.06);
      m.material.color.lerp(on ? col : dim, 0.08);
      m.material.emissive.lerp(on ? col : dim, 0.08);
      m.material.emissiveIntensity = on ? 0.4 + Math.sin(s.clock.elapsedTime * 2 + i) * 0.15 : 0;
      m.material.opacity = on ? 0.9 : 0.2;
    }
  });

  return (
    <group>
      {positions.map(function(p, i) {
        return (
          <mesh key={i} position={p} ref={function(el) { refs.current[i] = el; }}>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.2} roughness={0.3} metalness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

function Lines({ positions, filled, tierColor }) {
  var ref = useRef();
  var col = useMemo(function() { return new THREE.Color(tierColor); }, [tierColor]);

  var geo = useMemo(function() {
    var pts = new Float32Array(TOTAL * 6);
    var cols = new Float32Array(TOTAL * 6);
    for (var i = 0; i < TOTAL; i++) {
      pts[i*6]=0; pts[i*6+1]=0; pts[i*6+2]=0;
      pts[i*6+3]=positions[i][0]; pts[i*6+4]=positions[i][1]; pts[i*6+5]=positions[i][2];
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [positions]);

  useFrame(function() {
    if (!ref.current) return;
    var c = ref.current.geometry.attributes.color;
    for (var i = 0; i < TOTAL; i++) {
      var on = i < filled;
      c.array[i*6]   = on ? col.r*0.3 : 0.06;
      c.array[i*6+1] = on ? col.g*0.3 : 0.07;
      c.array[i*6+2] = on ? col.b*0.3 : 0.1;
      c.array[i*6+3] = on ? col.r : 0.12;
      c.array[i*6+4] = on ? col.g : 0.14;
      c.array[i*6+5] = on ? col.b : 0.18;
    }
    c.needsUpdate = true;
  });

  return <lineSegments ref={ref} geometry={geo}><lineBasicMaterial vertexColors transparent opacity={0.5} /></lineSegments>;
}

function Stars() {
  var pts = useMemo(function() {
    var a = new Float32Array(400 * 3);
    for (var i = 0; i < 400; i++) { a[i*3]=(Math.random()-0.5)*40; a[i*3+1]=(Math.random()-0.5)*40; a[i*3+2]=(Math.random()-0.5)*40; }
    return a;
  }, []);
  var ref = useRef();
  useFrame(function(s) { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.015; });
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={400} array={pts} itemSize={3} /></bufferGeometry>
      <pointsMaterial size={0.06} color="#475569" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function Scene({ tierIdx, filled }) {
  var positions = useMemo(genPositions, []);
  var tier = TIERS[tierIdx] || TIERS[0];
  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[4,4,4]} intensity={0.8} color="#38bdf8" />
      <pointLight position={[-4,2,-4]} intensity={0.4} color="#8b5cf6" />
      <Stars />
      <CenterNode />
      <Lines positions={positions} filled={filled} tierColor={tier.color} />
      <Nodes positions={positions} filled={filled} tierColor={tier.color} />
      <Controls />
    </>
  );
}

export default function IncomeGrid3D({ showControls = true, height = 500, autoPlay = true }) {
  var [tierIdx, setTierIdx] = useState(0);
  var [filled, setFilled] = useState(0);
  var intervalRef = useRef(null);

  var start = useCallback(function(ti) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFilled(0);
    var count = 0;
    intervalRef.current = setInterval(function() {
      count++;
      if (count > TOTAL) { clearInterval(intervalRef.current); return; }
      setFilled(count);
    }, 250);
  }, []);

  useEffect(function() {
    if (autoPlay) { var t = setTimeout(function() { start(0); }, 500); return function() { clearTimeout(t); }; }
  }, []);

  useEffect(function() { return function() { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  var tier = TIERS[tierIdx] || TIERS[0];
  var direct = Math.round(tier.price * 0.4 * Math.min(filled, 10));
  var uni = Math.round(tier.price * 0.0625 * filled);
  var bonus = filled >= TOTAL ? Math.round(tier.price * 0.05 * TOTAL) : 0;
  var total = direct + uni + bonus;

  return (
    <div style={{ position: 'relative', width: '100%', height: height, borderRadius: 16, overflow: 'hidden', background: '#050d1a' }}>
      <Canvas camera={{ position: [0, 1.5, 6], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'default' }}>
        <Scene tierIdx={tierIdx} filled={filled} />
      </Canvas>

      <div style={{ position:'absolute',top:16,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'flex-start',pointerEvents:'none' }}>
        <div>
          <div style={{ fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:900,color:'#fff' }}>Income Grid <span style={{color:tier.color}}>— ${tier.price} {tier.name}</span></div>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.35)' }}>{filled}/{TOTAL} positions · Drag to rotate</div>
        </div>
        <button onClick={function(){start(tierIdx);}} style={{ padding:'6px 14px',borderRadius:6,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'#38bdf8',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',pointerEvents:'auto' }}>▶ Replay</button>
      </div>

      <div style={{ position:'absolute',top:'50%',right:20,transform:'translateY(-50%)',textAlign:'right',pointerEvents:'none' }}>
        <div style={{ fontFamily:"'Sora',sans-serif",fontSize:32,fontWeight:900,color:'#4ade80',lineHeight:1 }}>${total.toLocaleString()}</div>
        <div style={{ fontSize:10,color:'rgba(255,255,255,.3)',marginTop:4 }}>Total Commissions</div>
        <div style={{ marginTop:8,fontSize:11 }}>
          <div style={{ color:'#0ea5e9' }}>Direct: ${direct.toLocaleString()}</div>
          <div style={{ color:'#8b5cf6' }}>Uni-level: ${uni.toLocaleString()}</div>
          {bonus > 0 && <div style={{ color:'#fbbf24' }}>Bonus: ${bonus.toLocaleString()}</div>}
        </div>
      </div>

      {showControls && (
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'20px 20px 16px',background:'linear-gradient(0deg,rgba(5,13,26,.9) 0%,transparent 100%)' }}>
          <div style={{ display:'flex',gap:4,justifyContent:'center',flexWrap:'wrap' }}>
            {TIERS.map(function(t,i) {
              var on = tierIdx === i;
              return <button key={i} onClick={function(){setTierIdx(i);start(i);}} style={{ padding:'6px 14px',borderRadius:6,border:on?'2px solid '+t.color:'1px solid rgba(255,255,255,.08)',background:on?t.color+'20':'rgba(255,255,255,.03)',color:on?t.color:'rgba(255,255,255,.35)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>${t.price}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
