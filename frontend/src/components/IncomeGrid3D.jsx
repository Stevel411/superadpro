import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ── Config ── */
var GRID_SIZE = 8;
var TOTAL_SEATS = 64;
var TIERS = [
  { tier: 1, price: 20, color: '#10b981', name: 'Starter' },
  { tier: 2, price: 50, color: '#0ea5e9', name: 'Builder' },
  { tier: 3, price: 100, color: '#6366f1', name: 'Pro' },
  { tier: 4, price: 200, color: '#8b5cf6', name: 'Advanced' },
  { tier: 5, price: 400, color: '#f59e0b', name: 'Elite' },
  { tier: 6, price: 600, color: '#ec4899', name: 'Premium' },
  { tier: 7, price: 800, color: '#ef4444', name: 'Executive' },
  { tier: 8, price: 1000, color: '#fbbf24', name: 'Ultimate' },
];

/* ── Central Node (You) ── */
function CentralNode() {
  var mesh = useRef();
  var glow = useRef();
  useFrame(function(state) {
    if (mesh.current) {
      mesh.current.rotation.y += 0.005;
      mesh.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
    if (glow.current) {
      glow.current.scale.setScalar(1.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.3);
      glow.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });
  return (
    <group position={[0, 0, 0]}>
      {/* Glow sphere */}
      <mesh ref={glow}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.15} />
      </mesh>
      {/* Core */}
      <mesh ref={mesh}>
        <dodecahedronGeometry args={[0.5, 1]} />
        <MeshDistortMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.5} distort={0.2} speed={2} roughness={0.2} metalness={0.8} />
      </mesh>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.3}>
        <Text position={[0, 1.2, 0]} fontSize={0.3} color="#38bdf8" anchorX="center" anchorY="middle">
          YOU
        </Text>
      </Float>
    </group>
  );
}

/* ── Grid Node ── */
function GridNode({ position, filled, delay, color, amount, index }) {
  var mesh = useRef();
  var [visible, setVisible] = useState(false);
  var [scale, setScale] = useState(0);

  useEffect(function() {
    var timer = setTimeout(function() { setVisible(true); }, delay);
    return function() { clearTimeout(timer); };
  }, [delay]);

  useFrame(function(state) {
    if (!mesh.current) return;
    if (visible && scale < 1) {
      setScale(function(s) { return Math.min(s + 0.04, 1); });
    }
    mesh.current.scale.setScalar(scale * (filled ? (1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.08) : 0.6));
    if (filled && mesh.current.material) {
      mesh.current.material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + index * 0.5) * 0.2;
    }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={filled ? color : '#334155'}
          emissive={filled ? color : '#000000'}
          emissiveIntensity={0.3}
          transparent
          opacity={filled ? 0.9 : 0.3}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {filled && amount && (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
          <Text position={[0, 0.4, 0]} fontSize={0.12} color={color} anchorX="center" anchorY="middle">
            +${amount}
          </Text>
        </Float>
      )}
    </group>
  );
}

/* ── Connection Beam ── */
function ConnectionBeam({ from, to, color, delay, filled }) {
  var line = useRef();
  var [visible, setVisible] = useState(false);
  var [progress, setProgress] = useState(0);

  useEffect(function() {
    var timer = setTimeout(function() { setVisible(true); }, delay + 200);
    return function() { clearTimeout(timer); };
  }, [delay]);

  useFrame(function() {
    if (visible && progress < 1) {
      setProgress(function(p) { return Math.min(p + 0.03, 1); });
    }
  });

  if (!visible || progress < 0.01) return null;

  var points = [
    new THREE.Vector3(from[0], from[1], from[2]),
    new THREE.Vector3(
      from[0] + (to[0] - from[0]) * progress,
      from[1] + (to[1] - from[1]) * progress,
      from[2] + (to[2] - from[2]) * progress
    ),
  ];
  var geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line ref={line} geometry={geometry}>
      <lineBasicMaterial color={filled ? color : '#1e293b'} transparent opacity={filled ? 0.6 : 0.15} linewidth={1} />
    </line>
  );
}

/* ── Floating Dollar Signs ── */
function FloatingDollar({ position, delay }) {
  var mesh = useRef();
  var [y, setY] = useState(0);
  var [visible, setVisible] = useState(false);

  useEffect(function() {
    var timer = setTimeout(function() { setVisible(true); }, delay + 1000);
    return function() { clearTimeout(timer); };
  }, [delay]);

  useFrame(function() {
    if (!visible) return;
    setY(function(v) { return v > 3 ? 0 : v + 0.015; });
  });

  if (!visible || y > 2.5) return null;

  return (
    <Text
      position={[position[0], position[1] + y + 0.5, position[2]]}
      fontSize={0.15}
      color="#4ade80"
      anchorX="center"
      anchorY="middle"
      transparent
      fillOpacity={Math.max(0, 1 - y / 2.5)}
    >
      $
    </Text>
  );
}

/* ── Earnings Counter ── */
function EarningsDisplay({ filled, tier }) {
  var directEarning = Math.round(tier.price * 0.4 * filled);
  var uniLevel = Math.round(tier.price * 0.0625 * filled);
  var bonus = filled >= TOTAL_SEATS ? Math.round(tier.price * 0.05 * TOTAL_SEATS) : 0;
  var total = directEarning + uniLevel + bonus;

  return (
    <group position={[0, -3.5, 0]}>
      <Text position={[0, 0.3, 0]} fontSize={0.2} color="#94a3b8" anchorX="center">
        {filled}/{TOTAL_SEATS} seats filled
      </Text>
      <Text position={[0, -0.1, 0]} fontSize={0.4} color="#4ade80" anchorX="center">
        ${total.toLocaleString()}
      </Text>
      <Text position={[0, -0.5, 0]} fontSize={0.15} color="#64748b" anchorX="center">
        Total Grid Commissions
      </Text>
    </group>
  );
}

/* ── Main 3D Scene ── */
function IncomeGridScene({ activeTier, filledCount, autoPlay }) {
  var tier = TIERS[activeTier] || TIERS[0];
  var [filled, setFilled] = useState(0);
  var [autoFilling, setAutoFilling] = useState(autoPlay);

  useEffect(function() {
    setFilled(filledCount || 0);
  }, [filledCount]);

  useEffect(function() {
    if (!autoFilling) return;
    var interval = setInterval(function() {
      setFilled(function(f) {
        if (f >= TOTAL_SEATS) {
          setAutoFilling(false);
          return TOTAL_SEATS;
        }
        return f + 1;
      });
    }, 300);
    return function() { clearInterval(interval); };
  }, [autoFilling]);

  // Generate grid positions in a spiral pattern from centre
  var positions = useMemo(function() {
    var pts = [];
    var radius = 2.5;
    for (var i = 0; i < TOTAL_SEATS; i++) {
      var ring = Math.floor(Math.sqrt(i));
      var angle = (i / TOTAL_SEATS) * Math.PI * 6 + ring * 0.5;
      var r = 0.8 + (i / TOTAL_SEATS) * radius;
      var x = Math.cos(angle) * r;
      var z = Math.sin(angle) * r;
      var y = (Math.sin(i * 0.3) * 0.3) - 0.5;
      pts.push([x, y, z]);
    }
    return pts;
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#38bdf8" />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, -3, 0]} intensity={0.3} color="#10b981" />

      {/* Stars background */}
      <Stars radius={50} depth={50} count={2000} factor={3} saturation={0.5} fade speed={1} />

      {/* Central node */}
      <CentralNode />

      {/* Grid nodes */}
      {positions.map(function(pos, i) {
        var isFilled = i < filled;
        var amount = isFilled ? Math.round(tier.price * 0.0625) : null;
        return (
          <GridNode
            key={i}
            position={pos}
            filled={isFilled}
            delay={i * 80}
            color={tier.color}
            amount={amount}
            index={i}
          />
        );
      })}

      {/* Connection beams */}
      {positions.map(function(pos, i) {
        var isFilled = i < filled;
        return (
          <ConnectionBeam
            key={'beam-' + i}
            from={[0, 0, 0]}
            to={pos}
            color={tier.color}
            delay={i * 80}
            filled={isFilled}
          />
        );
      })}

      {/* Floating dollars on filled nodes */}
      {positions.slice(0, Math.min(filled, 10)).map(function(pos, i) {
        return <FloatingDollar key={'dollar-' + i} position={pos} delay={i * 300} />;
      })}

      {/* Earnings display */}
      <EarningsDisplay filled={filled} tier={tier} />

      {/* Controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        autoRotate={true}
        autoRotateSpeed={0.5}
        minDistance={3}
        maxDistance={12}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.25}
      />
    </>
  );
}

/* ── Exported Component ── */
export default function IncomeGrid3D({ showControls = true, height = 500, autoPlay = true, defaultTier = 0 }) {
  var [activeTier, setActiveTier] = useState(defaultTier);
  var [filled, setFilled] = useState(0);
  var [playing, setPlaying] = useState(autoPlay);

  return (
    <div style={{ position: 'relative', width: '100%', height: height, borderRadius: 16, overflow: 'hidden', background: '#050d1a' }}>
      <Canvas
        camera={{ position: [0, 2, 7], fov: 50 }}
        dpr={[1, 2]}
        style={{ background: '#050d1a' }}
        gl={{ antialias: true, alpha: false }}
      >
        <IncomeGridScene activeTier={activeTier} filledCount={filled} autoPlay={playing} />
      </Canvas>

      {/* Overlay controls */}
      {showControls && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(0deg, rgba(5,13,26,.95) 0%, transparent 100%)' }}>
          {/* Tier selector */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TIERS.map(function(t, i) {
              var on = activeTier === i;
              return (
                <button key={i} onClick={function() { setActiveTier(i); setFilled(0); setPlaying(true); }}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: on ? '2px solid ' + t.color : '1px solid rgba(255,255,255,.1)',
                    background: on ? t.color + '20' : 'rgba(255,255,255,.03)',
                    color: on ? t.color : 'rgba(255,255,255,.4)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  ${t.price}
                </button>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
            Drag to rotate · Scroll to zoom · Click a tier to see commissions build
          </div>
        </div>
      )}

      {/* Title overlay */}
      <div style={{ position: 'absolute', top: 16, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900, color: '#fff' }}>
            Income Grid <span style={{ color: TIERS[activeTier]?.color || '#0ea5e9' }}>— ${TIERS[activeTier]?.price || 20} {TIERS[activeTier]?.name || 'Starter'}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>8×8 Campaign Grid · 64 Positions</div>
        </div>
        <button onClick={function() { setFilled(0); setPlaying(true); }}
          style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#38bdf8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ▶ Replay
        </button>
      </div>
    </div>
  );
}
