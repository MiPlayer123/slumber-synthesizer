"use client";

import React, {
  useRef,
  useEffect,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Cloud, Float, Text, Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

function FloatingSymbol({ position, rotation, scale, color, speed = 1 }) {
  const mesh = useRef(null);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x =
        Math.sin(state.clock.getElapsedTime() * 0.2 * speed) * 0.2;
      mesh.current.rotation.y =
        Math.sin(state.clock.getElapsedTime() * 0.1 * speed) * 0.2 +
        rotation[1];
      mesh.current.position.y =
        position[1] +
        Math.sin(state.clock.getElapsedTime() * 0.3 * speed) * 0.2;
    }
  });

  return (
    <mesh ref={mesh} position={position} rotation={rotation} scale={scale}>
      <torusKnotGeometry args={[0.4, 0.15, 128, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        roughness={0.5}
        metalness={0.8}
      />
    </mesh>
  );
}

function MovingStars({ count = 1000, scrollY }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    if (scrollY > 0) {
      camera.position.y = scrollY * 0.005;
      camera.lookAt(0, 0, 0);
    }
  }, [scrollY, camera]);

  return (
    <group ref={group}>
      <Stars
        radius={50}
        depth={50}
        count={count}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
    </group>
  );
}

function CloudGroup({ scrollY }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      group.current.position.y = -5 - scrollY * 0.01;
    }
  });

  return (
    <group ref={group}>
      <Cloud position={[-4, -2, -10]} speed={0.2} opacity={0.4} />
      <Cloud position={[4, 2, -15]} speed={0.2} opacity={0.25} />
      <Cloud position={[0, 5, -10]} speed={0.2} opacity={0.3} />
    </group>
  );
}

function FloatingText({ scrollY }) {
  const textRef = useRef<THREE.Mesh>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.position.y = 2 - scrollY * 0.01;
      if ((textRef.current as any).material) {
        (textRef.current as any).material.opacity = Math.max(
          0,
          1 - scrollY * 0.003,
        );
      }
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <Text
        ref={textRef}
        position={[0, 2, -1]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.ttf"
        maxWidth={4}
        textAlign="center"
        outlineWidth={0.01}
        outlineColor="#8b5cf6"
        visible={true}
      >
        Explore Your Dreams
      </Text>
    </Float>
  );
}

// Local error boundary to prevent WebGL issues from crashing the entire page
class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("DreamScene rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // hide error fallback
    }
    return this.props.children;
  }
}

export default function DreamScene({ scrollY = 0 }) {
  return (
    <SceneErrorBoundary>
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <color attach="background" args={["#160a26"]} />
        <fog attach="fog" args={["#160a26", 5, 30]} />

        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <pointLight
          position={[-10, -10, -10]}
          color="#8b5cf6"
          intensity={0.2}
        />

        <MovingStars scrollY={scrollY} />
        <CloudGroup scrollY={scrollY} />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <FloatingSymbol
            position={[-2, 0, -2]}
            rotation={[0, 0, 0]}
            scale={0.6}
            color="#8b5cf6"
            speed={1.2}
          />
        </Float>

        <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
          <FloatingSymbol
            position={[2, -1, -3]}
            rotation={[0, Math.PI / 4, 0]}
            scale={0.8}
            color="#3b82f6"
            speed={0.8}
          />
        </Float>

        <Float speed={1} rotationIntensity={0.4} floatIntensity={0.3}>
          <FloatingSymbol
            position={[0, 1, -4]}
            rotation={[0, Math.PI / 2, 0]}
            scale={1}
            color="#06b6d4"
            speed={1}
          />
        </Float>

        <FloatingText scrollY={scrollY} />

        <Environment preset="night" />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            height={300}
          />
        </EffectComposer>
      </Canvas>
    </SceneErrorBoundary>
  );
}
