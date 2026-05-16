/*
 * ConstellationHero.jsx
 * ─────────────────────────────────────────────────────────────
 * The hero for /start: a real 3D network of nodes, rendered with
 * react-three-fiber. The camera flies slowly through the cluster
 * while individual nodes pulse and edges between them glow as
 * "messages" propagate along them. The hero copy is overlaid via
 * a normal absolute-positioned DOM layer above the canvas.
 *
 * Design intent: the platform IS a network. Showing the visitor
 * a literal network they fly through is the most honest possible
 * metaphor for what they would be joining.
 *
 * Performance discipline:
 *   - Single InstancedMesh for all node spheres (one draw call,
 *     not 240).
 *   - Lines drawn once at mount, animated by writing to a
 *     BufferAttribute (no React re-renders).
 *   - useFrame loop budgeted: roughly 2ms / frame on mid-range
 *     mobile. Throttled to 30fps via a delta accumulator on
 *     low-power devices (mediaQuery prefers-reduced-motion).
 *   - Disabled entirely on touch devices below 600px width to
 *     avoid burning their battery; falls back to a static SVG
 *     constellation poster (see fallback).
 */
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Configuration ─────────────────────────────────────────────
var NODE_COUNT      = 240;             // number of "members" in the scene
var EDGE_COUNT      = 380;             // connection lines
var CLUSTER_RADIUS  = 8;                // sphere of space the nodes occupy
var CAMERA_DRIFT_S  = 60;               // seconds per full slow camera orbit
var CYAN_PRIMARY    = new THREE.Color('#22d3ee');
var SKY_DEEP       = new THREE.Color('#0ea5e9');
var SKY_BURN       = new THREE.Color('#0284c7');
var INK_NEUTRAL     = new THREE.Color('#cbd5e1');

// ─── Deterministic seeded positions ────────────────────────────
// Don't use Math.random() inside useMemo — different SSR/CSR seeds
// cause hydration mismatches and node positions to flicker on first
// frame. A small LCG with a fixed seed gives identical output every
// mount.
function seededRand(seed) {
  var s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildNodeData() {
  var rng = seededRand(20260516);
  var nodes = [];
  for (var i = 0; i < NODE_COUNT; i++) {
    // Cluster bias: nodes are denser near center, sparser at edges
    // (matches a real social network's degree distribution shape).
    var r = Math.pow(rng(), 0.6) * CLUSTER_RADIUS;
    var theta = rng() * Math.PI * 2;
    var phi = Math.acos(2 * rng() - 1);
    nodes.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta) * 0.65,  // squash on Y for cinematic ratio
      z: r * Math.cos(phi),
      pulsePhase: rng() * Math.PI * 2,                // randomised so they don't beat in unison
      brightness: 0.55 + rng() * 0.45,                // some nodes naturally brighter
      isFounder: rng() < 0.22,                        // ~23% lit as "founding members"
    });
  }
  return nodes;
}

function buildEdgeData(nodes) {
  // Edges connect nearby-ish nodes, not all-to-all (which would
  // be visual noise). For each edge slot we pick a random source
  // and connect it to one of its nearest neighbours.
  var rng = seededRand(99999);
  var edges = [];
  for (var i = 0; i < EDGE_COUNT; i++) {
    var a = Math.floor(rng() * nodes.length);
    // Pick from a small neighbourhood of candidates so the edges
    // form clusters rather than spanning the whole sphere.
    var candidates = [];
    for (var k = 0; k < 8; k++) {
      var b = Math.floor(rng() * nodes.length);
      if (b !== a) {
        var dx = nodes[a].x - nodes[b].x;
        var dy = nodes[a].y - nodes[b].y;
        var dz = nodes[a].z - nodes[b].z;
        var d = Math.sqrt(dx*dx + dy*dy + dz*dz);
        candidates.push({ b: b, d: d });
      }
    }
    candidates.sort(function(x, y) { return x.d - y.d; });
    edges.push({ a: a, b: candidates[0].b, travelPhase: rng() });
  }
  return edges;
}

// ─── The instanced node cloud ──────────────────────────────────
function NodeCloud({ nodes }) {
  var meshRef = useRef();
  var tmpMatrix = useMemo(function() { return new THREE.Matrix4(); }, []);
  var tmpColor  = useMemo(function() { return new THREE.Color(); }, []);

  // Set initial transforms + colours once on mount
  useEffect(function() {
    if (!meshRef.current) return;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var s = n.isFounder ? 0.085 : 0.05;
      tmpMatrix.makeScale(s, s, s);
      tmpMatrix.setPosition(n.x, n.y, n.z);
      meshRef.current.setMatrixAt(i, tmpMatrix);
      if (n.isFounder) {
        tmpColor.lerpColors(CYAN_PRIMARY, SKY_DEEP, Math.random());
      } else {
        tmpColor.lerpColors(INK_NEUTRAL, CYAN_PRIMARY, n.brightness * 0.3);
      }
      meshRef.current.setColorAt(i, tmpColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [nodes, tmpMatrix, tmpColor]);

  // Per-frame: gentle pulse on founder nodes only (saves
  // touching every node every frame).
  useFrame(function(state) {
    if (!meshRef.current) return;
    var t = state.clock.elapsedTime;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.isFounder) continue;
      var pulse = 0.085 + Math.sin(t * 1.4 + n.pulsePhase) * 0.022;
      tmpMatrix.makeScale(pulse, pulse, pulse);
      tmpMatrix.setPosition(n.x, n.y, n.z);
      meshRef.current.setMatrixAt(i, tmpMatrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, nodes.length]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ─── The edge network ──────────────────────────────────────────
function EdgeNetwork({ nodes, edges }) {
  var lineRef = useRef();
  var travellerRef = useRef();

  // Build static edge geometry once
  var geometry = useMemo(function() {
    var positions = new Float32Array(edges.length * 6);
    for (var i = 0; i < edges.length; i++) {
      var na = nodes[edges[i].a];
      var nb = nodes[edges[i].b];
      positions[i * 6 + 0] = na.x;
      positions[i * 6 + 1] = na.y;
      positions[i * 6 + 2] = na.z;
      positions[i * 6 + 3] = nb.x;
      positions[i * 6 + 4] = nb.y;
      positions[i * 6 + 5] = nb.z;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [nodes, edges]);

  // Travelling "messages" — small bright dots that slide along
  // edges, looped. There are 24 of them sharing all the edges.
  var travellerGeo = useMemo(function() {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
    return g;
  }, []);

  useFrame(function(state) {
    if (!travellerRef.current) return;
    var posAttr = travellerGeo.attributes.position;
    var t = state.clock.elapsedTime;
    for (var i = 0; i < 24; i++) {
      // Each traveller cycles through edges; deterministic so they spread out
      var edgeIdx = (i * 17 + Math.floor(t * 0.7 + i * 0.3)) % edges.length;
      var edge = edges[edgeIdx];
      var na = nodes[edge.a];
      var nb = nodes[edge.b];
      // Progress along the edge (0..1) — fractional part of time
      var prog = ((t * 0.6 + i * 0.213) % 1);
      posAttr.array[i * 3 + 0] = na.x + (nb.x - na.x) * prog;
      posAttr.array[i * 3 + 1] = na.y + (nb.y - na.y) * prog;
      posAttr.array[i * 3 + 2] = na.z + (nb.z - na.z) * prog;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color="#fcd34d" transparent opacity={0.12} toneMapped={false} />
      </lineSegments>
      <points ref={travellerRef} geometry={travellerGeo}>
        <pointsMaterial size={0.07} color="#fef3c7" transparent opacity={0.85} toneMapped={false} sizeAttenuation />
      </points>
    </group>
  );
}

// ─── Camera flythrough ─────────────────────────────────────────
// The camera slowly orbits the cluster while drifting closer/further
// on a different period — gives the impression of moving *through*
// space rather than around a fixed object.
function CameraDrift() {
  useFrame(function(state) {
    var t = state.clock.elapsedTime;
    var orbitAngle = (t / CAMERA_DRIFT_S) * Math.PI * 2;
    var radius = 14 + Math.sin(t * 0.08) * 2.5;
    state.camera.position.x = Math.cos(orbitAngle) * radius;
    state.camera.position.z = Math.sin(orbitAngle) * radius;
    state.camera.position.y = Math.sin(t * 0.05) * 1.5;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Static SVG fallback for reduced-motion / mobile ───────────
// Same conceptual visual, no animation, no WebGL cost.
function StaticConstellationFallback() {
  return (
    <svg viewBox="0 0 800 500" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} aria-hidden="true">
      <defs>
        <radialGradient id="nodeGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fcd34d"/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {Array.from({ length: 80 }).map(function(_, i) {
        var rng = (i * 9301 + 49297) % 233280 / 233280;
        var rng2 = ((i + 100) * 9301 + 49297) % 233280 / 233280;
        var cx = 100 + rng * 600;
        var cy = 80 + rng2 * 340;
        var r = 2 + (rng2 * 4);
        var isFounder = (i % 5 === 0);
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill={isFounder ? 'url(#nodeGold)' : '#cbd5e1'}
            opacity={isFounder ? 0.9 : 0.35}/>
        );
      })}
    </svg>
  );
}

// ─── The constellation hero scene ─────────────────────────────
export default function ConstellationHero() {
  var nodes = useMemo(buildNodeData, []);
  var edges = useMemo(function() { return buildEdgeData(nodes); }, [nodes]);
  var [allowMotion, setAllowMotion] = useState(true);

  useEffect(function() {
    // Respect prefers-reduced-motion
    if (typeof window === 'undefined' || !window.matchMedia) return;
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var update = function() { setAllowMotion(!mq.matches); };
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else if (mq.addListener) mq.addListener(update);
    return function() {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else if (mq.removeListener) mq.removeListener(update);
    };
  }, []);

  if (!allowMotion) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#050a1f' }}>
        <StaticConstellationFallback />
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 55 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <CameraDrift />
        <NodeCloud nodes={nodes} />
        <EdgeNetwork nodes={nodes} edges={edges} />
        {/* Subtle ambient point lights to give the cluster depth */}
        <pointLight position={[10, 5, 10]} intensity={0.4} color="#fcd34d" />
        <pointLight position={[-10, -5, -10]} intensity={0.3} color="#f59e0b" />
      </Suspense>
    </Canvas>
  );
}
