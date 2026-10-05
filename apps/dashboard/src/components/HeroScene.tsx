"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Edges } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function AbstractShape() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2.5, 0]} />
        <meshStandardMaterial 
          color="#09090b" 
          roughness={0.2}
          metalness={0.8}
        />
        <Edges scale={1} threshold={15} color="#06b6d4" />
      </mesh>
    </Float>
  );
}

export default function HeroScene() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-90">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={2} />
        <spotLight position={[-10, -10, -5]} intensity={5} color="#06b6d4" />
        
        <AbstractShape />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
