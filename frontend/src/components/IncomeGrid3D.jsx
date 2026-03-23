import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

var GRID = 8;
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
  var spacing = 0.6;
  var offset = (GRID - 1) * spacing * 0.5;
  for (var row = 0; row < GRID; row++) {
    for (var col = 0; col < GRID; col++) {
      pts.push([col * spacing - offset, 0, row * spacing - offset]);
    }
  }
  return pts;
}

function Controls() {
  var { camera, gl } = useThree();
  var c = useRef();
  useEffect(function() {
    var ctrl = new OrbitControls(camera, gl.domElement);
    ctrl.enablePan = false; ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.4;
    ctrl.minDistance = 3; ctrl.maxDistance = 12;
    ctrl.maxPolarAngle = Math.PI * 0.6; ctrl.minPolarAngle = Math.PI * 0.15;
    c.current = ctrl;
    return function() { ctrl.dispose(); };
  }, [camera, gl]);
  useFrame(function() { if (c.current) c.current.update(); });
  return null;
}

/* YOU node — larger person at centre, floating above */
function CenterPerson() {
  var ref = useRef();
  useFrame(function(s) {
    if (!ref.current) return;
    ref.current.position.y = 0.6 + Math.sin(s.clock.elapsedTime * 1.5) * 0.08;
  });
  return (
    <group ref={ref} position={[0, 0.6, 0]}>
      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.45, 12]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.6} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.35, 24]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* Grid person figures */
function PersonNode({ position, filled, tierColor, index }) {
  var groupRef = useRef();
  var bodyRef = useRef();
  var headRef = useRef();
  var col = useMemo(function() { return new THREE.Color(tierColor); }, [tierColor]);
  var dim = useMemo(function() { return new THREE.Color('#1e293b'); }, []);
  var [scale, setScale] = useState(0);

  useFrame(function(s) {
    if (!groupRef.current) return;
    var target = filled ? 1 : 0;
    var newScale = scale + (target - scale) * 0.08;
    setScale(newScale);
    groupRef.current.scale.setScalar(newScale);
    groupRef.current.position.y = filled ? Math.sin(s.clock.elapsedTime * 1.5 + index * 0.4) * 0.02 : -0.2;

    if (bodyRef.current) {
      bodyRef.current.material.color.lerp(filled ? col : dim, 0.1);
      bodyRef.current.material.emissive.lerp(filled ? col : dim, 0.1);
      bodyRef.current.material.emissiveIntensity = filled ? 0.4 + Math.sin(s.clock.elapsedTime * 2 + index * 0.3) * 0.15 : 0;
      bodyRef.current.material.opacity = filled ? 0.95 : 0.15;
    }
    if (headRef.current) {
      headRef.current.material.color.lerp(filled ? new THREE.Color('#ffffff') : dim, 0.1);
      headRef.current.material.emissive.lerp(filled ? col : dim, 0.1);
      headRef.current.material.emissiveIntensity = filled ? 0.3 : 0;
      headRef.current.material.opacity = filled ? 0.95 : 0.15;
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      <group ref={groupRef} scale={[0, 0, 0]}>
        {/* Body */}
        <mesh ref={bodyRef} position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.06, 0.1, 0.3, 8]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.15} roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Head */}
        <mesh ref={headRef} position={[0, 0.38, 0]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.15} roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
      {/* Base platform */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 8]} />
        <meshStandardMaterial color={filled ? tierColor : '#0f172a'} transparent opacity={filled ? 0.6 : 0.15} roughness={0.5} />
      </mesh>
    </group>
  );
}

/* Beams from YOU to filled positions */
function Beams({ positions, filled, tierColor }) {
  var ref = useRef();
  var col = useMemo(function() { return new THREE.Color(tierColor); }, [tierColor]);
  var geo = useMemo(function() {
    var pts = new Float32Array(TOTAL * 6);
    var cols = new Float32Array(TOTAL * 6);
    for (var i = 0; i < TOTAL; i++) {
      pts[i*6]=0; pts[i*6+1]=0.6; pts[i*6+2]=0;
      pts[i*6+3]=positions[i][0]; pts[i*6+4]=0.15; pts[i*6+5]=positions[i][2];
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
      c.array[i*6]=on?col.r*0.3:0; c.array[i*6+1]=on?col.g*0.3:0; c.array[i*6+2]=on?col.b*0.3:0;
      c.array[i*6+3]=on?col.r:0; c.array[i*6+4]=on?col.g:0; c.array[i*6+5]=on?col.b:0;
    }
    c.needsUpdate = true;
  });

  return <lineSegments ref={ref} geometry={geo}><lineBasicMaterial vertexColors transparent opacity={0.25} /></lineSegments>;
}

function GridLines() {
  var geo = useMemo(function() {
    var pts = [];
    var spacing = 0.6;
    var offset = (GRID - 1) * spacing * 0.5;
    var half = GRID * spacing * 0.5;
    for (var i = 0; i <= GRID; i++) {
      var z = i * spacing - offset - spacing * 0.5;
      pts.push(-half, 0.001, z, half, 0.001, z);
    }
    for (var i = 0; i <= GRID; i++) {
      var x = i * spacing - offset - spacing * 0.5;
      pts.push(x, 0.001, -half, x, 0.001, half);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return <lineSegments geometry={geo}><lineBasicMaterial color="#1e293b" transparent opacity={0.25} /></lineSegments>;
}

function GridBase() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
      <planeGeometry args={[5.5, 5.5]} />
      <meshBasicMaterial color="#080e1a" transparent opacity={0.6} />
    </mesh>
  );
}

function StarField() {
  var pts = useMemo(function() {
    var a = new Float32Array(300 * 3);
    for (var i = 0; i < 300; i++) { a[i*3]=(Math.random()-0.5)*30; a[i*3+1]=(Math.random()-0.5)*30; a[i*3+2]=(Math.random()-0.5)*30; }
    return a;
  }, []);
  var ref = useRef();
  useFrame(function(s) { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.01; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attachObject={['attributes', 'position']} count={300} array={pts} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#334155" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function Scene({ tierIdx, filled }) {
  var positions = useMemo(genPositions, []);
  var tier = TIERS[tierIdx] || TIERS[0];
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 5, 3]} intensity={0.8} color="#38bdf8" />
      <pointLight position={[-3, 4, -3]} intensity={0.4} color="#8b5cf6" />
      <pointLight position={[0, -2, 0]} intensity={0.2} color="#10b981" />
      <StarField />
      <GridBase />
      <GridLines />
      <CenterPerson />
      <Beams positions={positions} filled={filled} tierColor={tier.color} />
      {positions.map(function(p, i) {
        return <PersonNode key={i} position={p} filled={i < filled} tierColor={tier.color} index={i} />;
      })}
      <Controls />
    </>
  );
}

export default function IncomeGrid3D({ showControls, height, autoPlay }) {
  var [tierIdx, setTierIdx] = useState(0);
  var [filled, setFilled] = useState(0);
  var intervalRef = useRef(null);

  var start = useCallback(function() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFilled(0);
    var count = 0;
    intervalRef.current = setInterval(function() {
      count++;
      if (count > TOTAL) { clearInterval(intervalRef.current); return; }
      setFilled(count);
    }, 200);
  }, []);

  useEffect(function() {
    if (autoPlay) { var t = setTimeout(function() { start(); }, 600); return function() { clearTimeout(t); }; }
  }, []);
  useEffect(function() { return function() { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  var tier = TIERS[tierIdx] || TIERS[0];
  var direct = Math.round(tier.price * 0.4 * Math.min(filled, 10));
  var uni = Math.round(tier.price * 0.0625 * filled);
  var bonus = filled >= TOTAL ? Math.round(tier.price * 0.05 * TOTAL) : 0;
  var total = direct + uni + bonus;

  return (
    <div style={{ position: 'relative', width: '100%', height: height || 500, borderRadius: 16, overflow: 'hidden', background: '#050d1a' }}>
      <Canvas camera={{ position: [3, 4, 5.5], fov: 42 }} dpr={[1, 1.5]}>
        <Scene tierIdx={tierIdx} filled={filled} />
      </Canvas>

      <div style={{ position: 'absolute', top: 16, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        <div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900, color: '#fff' }}>
            8×8 Income Grid <span style={{ color: tier.color }}>— ${tier.price} {tier.name}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{filled}/{TOTAL} members joined · Drag to rotate</div>
        </div>
        <button onClick={function() { start(); }} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#38bdf8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', pointerEvents: 'auto' }}>▶ Replay</button>
      </div>

      <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', textAlign: 'right', pointerEvents: 'none' }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 36, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>${total.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>Total Commissions</div>
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <div style={{ color: '#0ea5e9', marginBottom: 2 }}>Direct: ${direct.toLocaleString()}</div>
          <div style={{ color: '#8b5cf6', marginBottom: 2 }}>Uni-level: ${uni.toLocaleString()}</div>
          {bonus > 0 && <div style={{ color: '#fbbf24' }}>Bonus: ${bonus.toLocaleString()}</div>}
        </div>
      </div>

      {showControls && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 16px', background: 'linear-gradient(0deg,rgba(5,13,26,.9) 0%,transparent 100%)' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {TIERS.map(function(t, i) {
              var on = tierIdx === i;
              return <button key={i} onClick={function() { setTierIdx(i); start(); }} style={{ padding: '6px 14px', borderRadius: 6, border: on ? '2px solid ' + t.color : '1px solid rgba(255,255,255,.08)', background: on ? t.color + '20' : 'rgba(255,255,255,.03)', color: on ? t.color : 'rgba(255,255,255,.35)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>${t.price}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
