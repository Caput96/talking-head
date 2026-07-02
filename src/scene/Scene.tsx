import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'

/**
 * Scene — the contents that live *inside* the R3F <Canvas>.
 *
 * In React Three Fiber (R3F) we describe a three.js scene with JSX: a tag like
 * <mesh> creates a THREE.Mesh, <boxGeometry> its geometry, <meshStandardMaterial>
 * its material. R3F reconciles this tree the same way React reconciles the DOM,
 * so we get a declarative, component-based way to build 3D.
 *
 * This is only a Phase 0 "smoke scene": a single rotating cube that proves the
 * whole stack (three + fiber + drei) resolves, renders and animates. The real
 * point-cloud + wireframe head and its MorphEngine arrive in later phases.
 */
export function Scene() {
  // A ref to the underlying THREE.Mesh instance. R3F assigns the created object
  // to `.current`, so we can mutate it imperatively each frame (rotation, etc.).
  const meshRef = useRef<Mesh>(null)

  // useFrame registers a callback that runs on every rendered frame (~60fps).
  // `delta` is the seconds elapsed since the previous frame — multiplying by it
  // makes the motion framerate-independent (same speed on fast/slow machines).
  useFrame((_state, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += delta * 0.4
    meshRef.current.rotation.y += delta * 0.6
  })

  return (
    <>
      {/* Lights: standard materials are lit, so without a light they render black.
          Ambient fills everything evenly; the point light adds directional shading. */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={80} />

      {/* The rotating cube. Geometry + material are children of the mesh. */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>

      {/* Drei's OrbitControls: drag to rotate, scroll to zoom, right-drag to pan.
          A ready-made helper so we don't wire up camera controls by hand. */}
      <OrbitControls />
    </>
  )
}
