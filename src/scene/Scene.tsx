import { useMemo } from 'react'
import { OrbitControls } from '@react-three/drei'
import { createIcosphereFormation, cubifyPositions, type Formation } from '../core/formations'
import { useMorphEngine } from '../core/useMorphEngine'

/**
 * Scene — Phase 1 render core: a point cloud and a wireframe, both reading
 * the single positions buffer owned by MorphEngine (see core/useMorphEngine),
 * smoothly and continuously morphing between two formations that share the
 * same vertex/edge topology (see core/formations). This replaces Phase 0's
 * throwaway rotating-cube smoke test.
 *
 * pointsMaterial/lineBasicMaterial are unlit, so unlike Phase 0's scene this
 * one needs no lights.
 */
export function Scene() {
  const [formationA, formationB] = useMemo<[Formation, Formation]>(() => {
    const sphere = createIcosphereFormation(1)
    const cube: Formation = { positions: cubifyPositions(sphere.positions), edges: sphere.edges }
    return [sphere, cube]
  }, [])

  const { pointsGeometry, wireframeGeometry } = useMorphEngine(formationA, formationB)

  return (
    <>
      <points geometry={pointsGeometry}>
        <pointsMaterial size={0.04} color="#7dd3fc" sizeAttenuation />
      </points>
      <lineSegments geometry={wireframeGeometry}>
        <lineBasicMaterial color="#38507a" />
      </lineSegments>

      {/* Drei's OrbitControls: drag to rotate, scroll to zoom, right-drag to pan. */}
      <OrbitControls />
    </>
  )
}
