import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { DoubleSide } from 'three'
import { shapeRegistry } from '../shapes'
import { HEAD_ID } from '../shapes/head/head'
import { useShapeStore } from '../store/shapeStore'
import { useMorphEngine } from '../core/useMorphEngine'
import { HeadGLB } from '../head/HeadGLB'

/**
 * Scene — renders whichever shape is selected in shapeStore, and retargets
 * the morph engine whenever the selection changes (driven by ShapeSwitcher,
 * outside the canvas). Most shapes share one vertex count and morph smoothly
 * into each other; the head doesn't, so useMorphEngine may swap the geometry
 * objects entirely on that transition — `opacity` cross-fades that swap in
 * rather than letting it pop (see core/useMorphEngine.ts).
 *
 * TWO render paths meet here, kept explicitly separate (ADR-003):
 *  - The grid shapes (sphere/cube/torus/pyramid) render from MorphEngine's
 *    shared positions buffer below.
 *  - The head is now the GLB asset with viseme morph targets, animated by
 *    setting morphTargetInfluences — a different path that does NOT go through
 *    MorphEngine. So when the head is selected we render <HeadGLB/> instead of
 *    the buffer visuals. (The old sampled-point head still registers in the
 *    ShapeRegistry but is no longer what gets drawn — cleanup is a later step.)
 *
 * `showOcclusion` (toggled by OcclusionToggle, outside the canvas) renders an
 * invisible surface (`colorWrite: false`, still writes depth) so the far
 * side of a shape stops showing through the near side — nothing new becomes
 * *visible*, points/edges just get correctly occluded like any opaque object.
 * It only applies to the buffer path.
 */
export function Scene() {
  const currentShapeId = useShapeStore((state) => state.currentShapeId)
  const showOcclusion = useShapeStore((state) => state.showOcclusion)
  const isHead = currentShapeId === HEAD_ID

  // Read the store once, outside React's reactivity, to seed the very first
  // formation — the effect below handles every change *after* that.
  const initialFormation = useMemo(
    () => shapeRegistry.get(useShapeStore.getState().currentShapeId).create(),
    [],
  )
  const { pointsGeometry, wireframeGeometry, occluderGeometry, opacity, retarget } =
    useMorphEngine(initialFormation)

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
      {isHead ? (
        <HeadGLB showOcclusion={showOcclusion} />
      ) : (
        <>
          {showOcclusion && (
            <mesh geometry={occluderGeometry}>
              {/* colorWrite: false — writes depth so far-side geometry fails the
                  depth test, but is never itself visible. side=DoubleSide avoids
                  needing consistent triangle winding across every shape source
                  (procedural grid vs. sampled mesh). */}
              <meshBasicMaterial colorWrite={false} side={DoubleSide} />
            </mesh>
          )}
          <points geometry={pointsGeometry}>
            <pointsMaterial size={0.04} color="#7dd3fc" sizeAttenuation transparent opacity={opacity} />
          </points>
          <lineSegments geometry={wireframeGeometry}>
            <lineBasicMaterial color="#38507a" transparent opacity={opacity} />
          </lineSegments>
        </>
      )}

      {/* Drei's OrbitControls: drag to rotate, scroll to zoom, right-drag to pan. */}
      <OrbitControls />
    </>
  )
}
