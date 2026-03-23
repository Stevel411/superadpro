import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function Box() {
  var ref = useRef();
  useFrame(function() { if (ref.current) ref.current.rotation.y += 0.01; });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function IncomeGrid3DPage() {
  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: '#fff', fontFamily: 'Sora,sans-serif', marginBottom: 20 }}>3D Test</h1>
      <div style={{ width: 600, height: 400, borderRadius: 16, overflow: 'hidden' }}>
        <Canvas camera={{ position: [0, 0, 3] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} />
          <Box />
        </Canvas>
      </div>
      <p style={{ color: '#64748b', marginTop: 16 }}>If you see a spinning orange box, R3F works.</p>
    </div>
  );
}
