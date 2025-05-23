"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Text, Line, useGLTF } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointer } from "lucide-react";
import {
  Mesh,
  Vector3,
  CubicBezierCurve3,
  Group,
} from "@/node_modules/@types/three";
import * as THREE from "@/node_modules/@types/three";

// Preload the brain model
useGLTF.preload("/models/human-brain.glb");

// Common dream themes to display on connections - moved outside component for stable reference
const dreamThemes = [
  "Pursuit",
  "Deterioration",
  "Confinement",
  "Mortality",
  "Failure",
];

// Custom shader for the brain gradient effect
const brainVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const brainFragmentShader = `
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform vec3 colorC;
  uniform float time;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    // Create base gradient based on vertical position
    float yFactor = vPosition.y * 0.5 + 0.5;
    
    // Mix colors based on position to create gradient
    vec3 baseColor = mix(colorA, colorB, yFactor);
    
    // Add subtle pulse effect
    float pulse = sin(time * 0.5) * 0.08 + 0.92;
    
    // Add edge highlighting based on normal direction
    float edgeFactor = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.5);
    baseColor = mix(baseColor, colorC, edgeFactor * 0.5 * pulse);
    
    // Set transparency based on height and normal
    float alpha = 0.9 - edgeFactor * 0.05;
    
    gl_FragColor = vec4(baseColor, alpha);
  }
`;

interface DreamPointProps {
  position: [number, number, number];
  color: string;
  label: string;
  size?: number;
  onClick: () => void;
}

interface DreamItem {
  id: number;
  title: string;
  color: string;
}

interface DreamGlobeProps {
  dreamData: DreamItem[];
  onDreamSelect: (dream: DreamItem) => void;
}

function DreamPoint({
  position,
  color,
  label,
  size = 0.1,
  onClick,
}: DreamPointProps) {
  const [hovered, setHovered] = useState(false);
  const pointRef = useRef<Mesh>(null);
  const textRef = useRef<any>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // More reliable hover state management
  const handlePointerOver = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  }, []);

  const handlePointerOut = useCallback(() => {
    // Short delay to prevent flicker
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(false);
    }, 50);
  }, []);

  useFrame(() => {
    if (pointRef.current && hovered) {
      pointRef.current.scale.x = 1.8;
      pointRef.current.scale.y = 1.8;
      pointRef.current.scale.z = 1.8;
    } else if (pointRef.current) {
      pointRef.current.scale.x = 1;
      pointRef.current.scale.y = 1;
      pointRef.current.scale.z = 1;
    }

    // Animate the text opacity and position manually
    if (textRef.current) {
      if (hovered) {
        textRef.current.position.y = size * 2;
        textRef.current.material.opacity = Math.min(
          textRef.current.material.opacity + 0.1,
          1,
        );
      } else {
        textRef.current.material.opacity = Math.max(
          textRef.current.material.opacity - 0.1,
          0,
        );
      }
    }
  });

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <group position={position}>
      <Sphere
        ref={pointRef}
        args={[size, 16, 16]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent={true}
          opacity={0.9}
        />
      </Sphere>

      <Text
        ref={textRef}
        position={[0, size * 2, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        visible={true}
        material-transparent={true}
        material-opacity={0}
      >
        {label}
      </Text>
    </group>
  );
}

// Special component to help with better touch detection
function TouchDetector({ onInteraction }: { onInteraction: () => void }) {
  const { gl, camera } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleTouch = () => {
      onInteraction();
    };

    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("mousedown", handleTouch, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("mousedown", handleTouch);
    };
  }, [gl, onInteraction]);

  return null;
}

function GlobeObject({
  dreamData,
  onDreamSelect,
}: {
  dreamData: DreamItem[];
  onDreamSelect: (dream: DreamItem) => void;
}) {
  const groupRef = useRef<Group>(null);
  const { scene: brainScene } = useGLTF("/models/human-brain.glb");
  const brainRef = useRef<Group>(null);
  const timeRef = useRef(0);

  // Change to an array of active connections instead of a single one
  const [activeConnections, setActiveConnections] = useState<
    Array<{
      from: Vector3;
      to: Vector3;
      points: Vector3[];
      color: string;
      fromIndex: number;
      toIndex: number;
      progress: number;
      theme: string;
      id: number; // Add an ID to track each connection
      completionTime?: number;
    }>
  >([]);

  // Keep track of the next connection ID
  const nextConnectionIdRef = useRef(0);

  // Create shader materials and uniforms
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const shaderUniforms = useMemo(
    () => ({
      colorA: { value: new THREE.Color("#505050") }, // Lighter base color
      colorB: { value: new THREE.Color("#696969") }, // Lighter gradient color
      colorC: { value: new THREE.Color("#a288f8") }, // Brighter purple accent
      time: { value: 0 },
    }),
    [],
  );

  // Clone and prepare the brain model
  useEffect(() => {
    if (brainScene) {
      // Apply materials and setup
      brainScene.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;

          // Create a stylized shader material
          const brainMaterial = new THREE.ShaderMaterial({
            uniforms: shaderUniforms,
            vertexShader: brainVertexShader,
            fragmentShader: brainFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
          });

          // Store reference to material for animations
          shaderMaterialRef.current = brainMaterial;

          // Apply the material to the brain mesh
          node.material = brainMaterial;
        }
      });
    }
  }, [brainScene, shaderUniforms]);

  // Distribute points on the brain surface (adjusted radius to match brain scale)
  const distributePointsOnBrain = useCallback((count: number) => {
    const points: [number, number, number][] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    // Brain dimensions (ellipsoid) - increased radii to move points outward
    const baseScale = 1.0; // Base scale to match the primitive's scale
    const radiusX = 1.5 * baseScale; // Further increase X radius for more outward position
    const radiusY = 1.35 * baseScale; // Further increase Y radius for more outward position
    const radiusZ = 1.4 * baseScale; // Further increase Z radius for more outward position

    // One point per dream item
    const totalPoints = count;

    for (let i = 0; i < totalPoints; i++) {
      const y = 1 - (i / (totalPoints - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y
      const theta = phi * i; // golden angle increment

      const x = Math.cos(theta) * radiusAtY * radiusX;
      const z = Math.sin(theta) * radiusAtY * radiusZ;
      const scaledY = y * radiusY;

      points.push([x, scaledY, z]);
    }

    return points;
  }, []);

  // Memoize the dream points so they're stable across renders
  const dreamPoints = useMemo(
    () => distributePointsOnBrain(dreamData.length),
    [dreamData.length, distributePointsOnBrain],
  );

  // Find the bottom-most node index to skip in rendering
  const bottomIndex = useMemo(() => {
    // Find the dreamPoints index with the smallest Y
    let minY = Infinity;
    let idx = -1;
    dreamPoints.forEach(([x, y, z], i) => {
      if (y < minY) {
        minY = y;
        idx = i;
      }
    });
    return idx;
  }, [dreamPoints]);

  // Build a list of valid indices (excluding the bottom-most node)
  const validIndices = useMemo(
    () => dreamPoints.map((_, i) => i).filter((i) => i !== bottomIndex),
    [dreamPoints, bottomIndex],
  );

  // Create 3D Vector3 objects from the dream points
  const dreamPointVectors = useMemo(
    () => dreamPoints.map((point) => new Vector3(point[0], point[1], point[2])),
    [dreamPoints],
  );

  // Create a connection between two random nodes (using only valid indices)
  useEffect(() => {
    if (validIndices.length < 2) return;

    const createRandomConnection = () => {
      // Select random indices from valid indices only
      const fromIndex =
        validIndices[Math.floor(Math.random() * validIndices.length)];
      let toIndex = fromIndex;

      // Make sure we don't connect a node to itself
      while (toIndex === fromIndex) {
        toIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      }

      const from = dreamPointVectors[fromIndex];
      const to = dreamPointVectors[toIndex];

      // Create a spherical arc that follows the contour of the brain surface
      // Calculate the midpoint between the starting and ending positions
      const midPoint = from.clone().add(to).multiplyScalar(0.5);

      // Calculate the angle between the two points
      const angle = from.angleTo(to);

      // Create a spherical arc by using a point on the sphere's surface
      // This creates a more natural arc that follows the brain's curvature
      const arcHeight = Math.sin(angle * 0.5) * 1.0; // Increased from 0.8 to 1.0 for higher arcs

      // Create a point that's elevated outward from the midpoint
      // Use a larger multiplier for a more pronounced arc
      const elevatedMidPoint = midPoint
        .clone()
        .normalize()
        .multiplyScalar(2.4 + arcHeight); // Increased from 2.2 to 2.4

      // Create a cubic bezier curve that follows a spherical arc
      const curve = new CubicBezierCurve3(
        from,
        from.clone().lerp(elevatedMidPoint, 0.5), // Increased from 0.4 to 0.5 for smoother curve
        to.clone().lerp(elevatedMidPoint, 0.5), // Increased from 0.4 to 0.5 for smoother curve
        to,
      );

      // Get points along the curve
      const points = curve.getPoints(50);

      // Select a random theme
      const theme = dreamThemes[Math.floor(Math.random() * dreamThemes.length)];

      // Create a new connection with a unique ID
      const newConnection = {
        from,
        to,
        points,
        color: dreamData[fromIndex].color,
        fromIndex,
        toIndex,
        progress: 0,
        theme,
        id: nextConnectionIdRef.current++,
        completionTime: undefined, // Add completionTime to track when the line finishes
      };

      // Add the new connection to the array
      setActiveConnections((prev) => [...prev, newConnection]);
    };

    // Create initial connection
    createRandomConnection();

    // Create new connections more frequently (every 2 seconds)
    const interval = setInterval(() => {
      createRandomConnection();
    }, 2000);

    return () => clearInterval(interval);
  }, [validIndices.length]); // Only depend on the length of validIndices, not the entire array

  // Animate line progress for "shooting" effect and rotate brain
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }

    // Update shader time uniform for animations
    if (shaderMaterialRef.current) {
      timeRef.current += delta;
      shaderMaterialRef.current.uniforms.time.value = timeRef.current;
    }

    // Animate all active connections
    if (activeConnections.length > 0) {
      setActiveConnections((prev) => {
        // Update progress for each connection
        const updatedConnections = prev.map((conn) => {
          // If the connection has reached its destination (progress >= 1)
          if (conn.progress >= 1) {
            // Keep it visible for 3 seconds after completion
            if (conn.completionTime === undefined) {
              return { ...conn, completionTime: timeRef.current };
            }

            // Remove the connection after 3 seconds of being complete
            if (timeRef.current - conn.completionTime > 3) {
              return null;
            }

            return conn;
          }

          // Otherwise, continue animating the line
          const newProgress = Math.min(conn.progress + delta * 0.6, 1);
          return { ...conn, progress: newProgress };
        });

        // Filter out null connections (those that have been visible long enough)
        return updatedConnections.filter((conn) => conn !== null);
      });
    }
  });

  // Create a subset of points based on current animation progress for each connection
  const visiblePointsMap = useMemo(() => {
    const map = new Map<number, Vector3[]>();

    activeConnections.forEach((conn) => {
      const pointCount = conn.points.length;
      const visibleCount = Math.floor(pointCount * conn.progress);
      map.set(conn.id, conn.points.slice(0, visibleCount + 1));
    });

    return map;
  }, [activeConnections]);

  // Get midpoint of visible connection for theme label
  const connectionMidpoints = useMemo(() => {
    const midpoints = new Map<number, Vector3 | null>();

    activeConnections.forEach((conn) => {
      const visiblePoints = visiblePointsMap.get(conn.id);
      if (!visiblePoints || visiblePoints.length < 2) {
        midpoints.set(conn.id, null);
        return;
      }

      const progressAdjustedIndex = Math.min(
        Math.floor(visiblePoints.length * 0.5),
        visiblePoints.length - 1,
      );

      midpoints.set(conn.id, visiblePoints[progressAdjustedIndex]);
    });

    return midpoints;
  }, [activeConnections, visiblePointsMap]);

  return (
    <group ref={groupRef}>
      {/* Brain Model */}
      <primitive
        ref={brainRef}
        object={brainScene.clone()}
        scale={1.6} // Slightly smaller brain
        position={[0, -0.1, 0]}
        rotation={[0, 0, 0]}
      />

      {/* Dream Points (skip the bottom-most one) */}
      {dreamData.map((dream, i) => {
        if (i === bottomIndex) return null;
        return (
          <DreamPoint
            key={i}
            position={
              dreamPoints[i < dreamPoints.length ? i : i % dreamPoints.length]
            }
            color={dream.color || "#8b5cf6"}
            label={dream.title}
            size={0.07} // Slightly larger point size
            onClick={() => onDreamSelect(dream)}
          />
        );
      })}

      {/* Render all active connections */}
      {activeConnections.map((conn) => {
        const visiblePoints = visiblePointsMap.get(conn.id);
        if (!visiblePoints || visiblePoints.length < 2) return null;

        const midpoint = connectionMidpoints.get(conn.id);

        return (
          <group key={conn.id}>
            {/* Connection Line */}
            <Line
              points={visiblePoints}
              color={new THREE.Color(conn.color)
                .convertLinearToSRGB()
                .multiplyScalar(1.3)} // Brighter line color
              lineWidth={2.2}
              transparent
              opacity={0.8} // Make the line slightly translucent
            />

            {/* Theme text floating above the line - display for the entire duration */}
            {midpoint && visiblePoints.length > 1 && (
              <group position={midpoint}>
                {/* Strong glow effect behind text to ensure visibility */}
                <pointLight
                  position={[0, 0.35, 0.0]}
                  intensity={0.5}
                  distance={1.8}
                  color={conn.color}
                />

                {/* Black outline around text to ensure readability against any background */}
                <Text
                  position={[0, 0.35, 0]}
                  fontSize={0.16}
                  color="black"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.04}
                  outlineColor="black"
                  renderOrder={9}
                >
                  {conn.theme}
                </Text>

                {/* Main theme text */}
                <Text
                  position={[0, 0.35, 0.01]}
                  fontSize={0.16}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                  fillOpacity={1.0}
                  outlineWidth={0.01}
                  outlineColor={conn.color}
                  renderOrder={11}
                  material-toneMapped={false}
                  material-emissive={"white"}
                  material-emissiveIntensity={1.0}
                  material-depthTest={false}
                >
                  {conn.theme}
                </Text>
              </group>
            )}

            {/* Highlight connector points */}
            <Sphere args={[0.07, 16, 16]} position={conn.from}>
              <meshStandardMaterial
                color={conn.color}
                emissive={conn.color}
                emissiveIntensity={2.2}
                transparent={true}
                opacity={0.85}
              />
            </Sphere>

            {/* Only show destination point when line reaches it */}
            {conn.progress > 0.92 && (
              <Sphere args={[0.07, 16, 16]} position={conn.to}>
                <meshStandardMaterial
                  color={conn.color}
                  emissive={conn.color}
                  emissiveIntensity={2.2}
                  transparent={true}
                  opacity={0.85}
                />
              </Sphere>
            )}
          </group>
        );
      })}
    </group>
  );
}

function DragHint({ onInteraction }: { onInteraction: () => void }) {
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  if (!showHint) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
    >
      <motion.div
        animate={{
          x: [0, 50, 0, -50, 0],
          rotate: [0, 10, 0, -10, 0],
        }}
        transition={{
          repeat: 2,
          duration: 2,
          ease: "easeInOut",
        }}
        className="text-white/90 px-3 py-1.5 flex items-center gap-2"
      >
        <MousePointer size={16} />
        <span className="text-sm font-medium">Drag to explore</span>
      </motion.div>
    </motion.div>
  );
}

export function DreamGlobe({
  dreamData = [],
  onDreamSelect = () => {},
}: DreamGlobeProps) {
  const [isRotating, setIsRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInteraction = useCallback(() => {
    setHasInteracted(true);
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    handleInteraction();

    // Clear any existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  }, [handleInteraction]);

  const handleDragEnd = useCallback(() => {
    // Use a small timeout to prevent state flicker
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    interactionTimeoutRef.current = setTimeout(() => {
      setIsDragging(false);
    }, 50);
  }, []);

  return (
    <div className="relative w-full h-96 sm:h-[500px] overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        camera={{ position: [0, 0, 5], fov: 50 }}
      >
        <ambientLight intensity={0.7} /> {/* Increased ambient light */}
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.2}
          castShadow
        />{" "}
        {/* Brighter main light */}
        <pointLight
          position={[-5, -5, 5]}
          intensity={0.7}
          color="#9d7aff"
        />{" "}
        {/* Brighter accent light */}
        {/* Add a rim light for dramatic effect */}
        <spotLight position={[0, 0, -8]} intensity={0.4} color="#ffffff" />
        <OrbitControls
          enableZoom={false}
          rotateSpeed={0.6}
          enabled={true} // Always enabled for dragging
          onStart={handleDragStart}
          onEnd={handleDragEnd}
        />
        <TouchDetector onInteraction={handleInteraction} />
        <fog attach="fog" args={["#1a0b2e", 8, 20]} />{" "}
        {/* Changed from black to dark purple */}
        <GlobeObject dreamData={dreamData} onDreamSelect={onDreamSelect} />
      </Canvas>

      {!hasInteracted && <DragHint onInteraction={handleInteraction} />}
    </div>
  );
}
