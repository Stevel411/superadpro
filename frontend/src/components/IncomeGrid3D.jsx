import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

var TOTAL = 64;
var TIERS = [
  { price: 20, color: '#10b981', name: 'Starter' },
  { price: 50, color: '#0ea5e9', name: 'Builder' },
  { price: 100, color: '#6366f1', name: 'Pro' },
  { price: 200, color: '#8b5cf6', name: 'Advanced' },
  { price: 400, color: '#f59e0b', name: 'Elite' },
  { price: 600, color: '#ec4899', name: 'Premium' },
  { price: 800, color: '#ef4444', name: 'Executive' },
  { price: 1000, color: '#fbbf24', name: 'Ultimate' },
];

function generatePositions() {
  var pts = [];
  for (var i = 0; i < TOTAL; i++) {
    var angle = (i / TOTAL) * Math.PI * 6 + Math.floor(Math.sqrt(i)) * 0.5;
    var r = 0.8 + (i / TOTAL) * 2.5;
    pts.push([Math.cos(angle) * r, Math.sin(i * 0.3) * 0.3 - 0.3, Math.sin(angle) * r]);
  }
  return pts;
}

/* Central pulsing node */
function CenterNode() {
  var ref = useRef();
  useFrame(function(s) {
    if (ref.current) {
      ref.current.rotation.y += 0.008;
      ref.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 2) * 0.06);
    }
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

/* All grid nodes as individual meshes (lighter than InstancedMesh for this count) */
function GridNodes({ positions, filled, tierColor }) {
  var col = useMemo(function() { return new THREE.Color(tierColor); }, [tierColor]);
  var dim = useMemo(function() { return new THREE.Color('#1e293b'); }, []);
  var refs = useRef([]);

  useFrame(function(s) {
    var t = s.clock.elapsedTime;
    for (var i = 0; i < positions.length; i++) {
      var m = refs.current[i];
      if (!m) continue;
      var isFilled = i < filled;
      var target = isFilled ? 1 : 0.4;
      var current = m.scale.x;
      m.scale.setScalar(current + (target - current) * 0.08);
      if (isFilled) {
        m.material.color.lerp(col, 0.1);
        m.material.emissive.lerp(col, 0.1);
        m.material.emissiveIntensity = 0.4 + Math.sin(t * 2 + i) * 0.2;
        m.material.opacity = 0.9;
      } else {
        m.material.color.lerp(dim, 0.1);
        m.material.emissive.set(0, 0, 0);
        m.material.opacity = 0.25;
      }
    }
  });

  return (
    <group>
      {positions.map(function(p, i) {
        return (
          <mesh key={i} position={p} ref={function(el) { refs.current[i] = el; }}>
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.25} roughness={0.3} metalness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

/* Connection lines as a single LineSegments object */
function Connections({ positions, filled, tierColor }) {
  var ref = useRef();
  var col = useMemo(function() { return new THREE.Color(tierColor); }, [tierColor]);

  var geometry = useMemo(function() {
    var pts = [];
    for (var i = 0; i < positions.length; i++) {
      pts.push(0, 0, 0);
      pts.push(positions[i][0], positions[i][1], positions[i][2]);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    var colors = new Float32Array(positions.length * 2 * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions]);

  useFrame(function() {
    if (!ref.current) return;
    var colors = ref.current.geometry.attributes.color;
    for (var i = 0; i < positions.length; i++) {
      var isFilled = i < filled;
      var r = isFilled ? col.r : 0.12;
      var g = isFilled ? col.g : 0.16;
      var b = isFilled ? col.b : 0.22;
      var a = isFilled ? 0.5 : 0.08;
      // start vertex
      colors.array[i * 6] = r * a * 2;
      colors.array[i * 6 + 1] = g * a * 2;
      colors.array[i * 6 + 2] = b * a * 2;
      // end vertex
      colors.array[i * 6 + 3] = r;
      colors.array[i * 6 + 4] = g;
      colors.array[i * 6 + 5] = b;
    }
    colors.needsUpdate = true;
  });

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.4} />
    </lineSegments>
  );
}

/* Simple star field */
function StarField() {
  var ref = useRef();
  var positions = useMemo(function() {
    var pts = new Float32Array(600 * 3);
    for (var i = 0; i < 600; i++) {
      pts[i * 3] = (Math.random() - 0.5) * 40;
      pts[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pts[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pts;
  }, []);

  useFrame(function(s) {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={600} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#475569" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

/* Scene */
function Scene({ tierIdx, filled }) {
  var tier = TIERS[tierIdx] || TIERS[0];
  var positions = useMemo(generatePositions, []);

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[4, 4, 4]} intensity={0.8} color="#38bdf8" />
      <pointLight position={[-4, 2, -4]} intensity={0.4} color="#8b5cf6" />
      <StarField />
      <CenterNode />
      <Connections positions={positions} filled={filled} tierColor={tier.color} />
      <GridNodes positions={positions} filled={filled} tierColor={tier.color} />
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.4} minDistance={3} maxDistance={10} maxPolarAngle={Math.PI * 0.75} minPolarAngle={Math.PI * 0.25} />
    </>
  );
}

/* Exported component */
export default function IncomeGrid3D({ showControls = true, height = 500, autoPlay = true }) {
  var [tierIdx, setTierIdx] = useState(0);
  var [filled, setFilled] = useState(0);
  var [playing, setPlaying] = useState(false);
  var intervalRef = useRef(null);

  var start = useCallback(function(ti) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    var idx = ti !== undefined ? ti : tierIdx;
    setFilled(0);
    setPlaying(true);
    var count = 0;
    intervalRef.current = setInterval(function() {
      count++;
      if (count > TOTAL) {
        clearInterval(intervalRef.current);
        setPlaying(false);
        return;
      }
      setFilled(count);
    }, 250);
  }, [tierIdx]);

  useEffect(function() {
    if (autoPlay) {
      var timer = setTimeout(function() { start(0); }, 500);
      return function() { clearTimeout(timer); if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, []);

  useEffect(function() {
    return function() { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

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

      {/* Top overlay */}
      <div style={{ position: 'absolute', top: 16, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        <div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900, color: '#fff' }}>
            Income Grid <span style={{ color: tier.color }}>— ${tier.price} {tier.name}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{filled}/{TOTAL} positions · Drag to rotate</div>
        </div>
        <button onClick={function() { start(tierIdx); }} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#38bdf8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', pointerEvents: 'auto' }}>
          ▶ Replay
        </button>
      </div>

      {/* Earnings overlay */}
      <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', textAlign: 'right', pointerEvents: 'none' }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 32, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>${total.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>Total Commissions</div>
        <div style={{ marginTop: 8, fontSize: 11 }}>
          <div style={{ color: '#0ea5e9' }}>Direct: ${direct.toLocaleString()}</div>
          <div style={{ color: '#8b5cf6' }}>Uni-level: ${uni.toLocaleString()}</div>
          {bonus > 0 && <div style={{ color: '#fbbf24' }}>Bonus: ${bonus.toLocaleString()}</div>}
        </div>
      </div>

      {/* Bottom controls */}
      {showControls && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 16px', background: 'linear-gradient(0deg, rgba(5,13,26,.9) 0%, transparent 100%)' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {TIERS.map(function(t, i) {
              var on = tierIdx === i;
              return (
                <button key={i} onClick={function() { setTierIdx(i); start(i); }}
                  style={{ padding: '6px 14px', borderRadius: 6, border: on ? '2px solid ' + t.color : '1px solid rgba(255,255,255,.08)', background: on ? t.color + '20' : 'rgba(255,255,255,.03)', color: on ? t.color : 'rgba(255,255,255,.35)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ${t.price}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
