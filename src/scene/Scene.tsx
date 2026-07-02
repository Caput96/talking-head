import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { shapeRegistry } from '../shapes'
import { useShapeStore } from '../store/shapeStore'
import { useMorphEngine } from '../core/useMorphEngine'

/**
 * Scene — Phase 2: renders whichever shape is selected in shapeStore, and
 * smoothly retargets the morph engine whenever the selection changes (driven
 * by ShapeSwitcher, outside the canvas). Points + wireframe still read the
 * single positions buffer owned by MorphEngine (see core/useMorphEngine);
 * only the target formation changes, never the geometry/topology.
 */
export function Scene() {
  const currentShapeId = useShapeStore((state) => state.currentShapeId)

  // Read the store once, outside React's reactivity, to seed the very first
  // formation — the effect below handles every change *after* that.
  const initialFormation = useMemo(
    () => shapeRegistry.get(useShapeStore.getState().currentShapeId).create(),
    [],
  )
  const { pointsGeometry, wireframeGeometry, retarget } = useMorphEngine(initialFormation)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return // already showing this shape — useMorphEngine seeded it above
    }
    retarget(shapeRegistry.get(currentShapeId).create())
  }, [currentShapeId, retarget])

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
