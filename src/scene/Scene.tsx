import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { shapeRegistry } from '../shapes'
import { useShapeStore } from '../store/shapeStore'
import { useMorphEngine } from '../core/useMorphEngine'

/**
 * Scene — renders whichever shape is selected in shapeStore, and retargets
 * the morph engine whenever the selection changes (driven by ShapeSwitcher,
 * outside the canvas). Most shapes share one vertex count and morph smoothly
 * into each other; the head doesn't, so useMorphEngine may swap the geometry
 * objects entirely on that transition — `opacity` cross-fades that swap in
 * rather than letting it pop (see core/useMorphEngine.ts).
 */
export function Scene() {
  const currentShapeId = useShapeStore((state) => state.currentShapeId)

  // Read the store once, outside React's reactivity, to seed the very first
  // formation — the effect below handles every change *after* that.
  const initialFormation = useMemo(
    () => shapeRegistry.get(useShapeStore.getState().currentShapeId).create(),
    [],
  )
  const { pointsGeometry, wireframeGeometry, opacity, retarget } = useMorphEngine(initialFormation)

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
        <pointsMaterial size={0.04} color="#7dd3fc" sizeAttenuation transparent opacity={opacity} />
      </points>
      <lineSegments geometry={wireframeGeometry}>
        <lineBasicMaterial color="#38507a" transparent opacity={opacity} />
      </lineSegments>

      {/* Drei's OrbitControls: drag to rotate, scroll to zoom, right-drag to pan. */}
      <OrbitControls />
    </>
  )
}
