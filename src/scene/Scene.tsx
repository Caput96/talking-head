import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { DoubleSide } from 'three'
import { shapeRegistry } from '../shapes'
import { HEAD_ID } from '../shapes/head/head'
import { useShapeStore } from '../store/shapeStore'
import { useAppearanceStore } from '../store/appearanceStore'
import { useMorphEngine } from '../core/useMorphEngine'
import { HeadGLB } from '../head/HeadGLB'
import { darken } from '../core/color'

// Wireframe color is derived from the user's chosen point color rather than
// picked separately — see store/appearanceStore.ts.
const WIREFRAME_DARKEN_FACTOR = 0.45

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
 *
 * `showVertices`/`color`/`opacity` (AppearancePanel, outside the canvas) are
 * the other view preferences: hide the point cloud entirely, recolor points
 * + the derived wireframe color, and blend the user's opacity with
 * useMorphEngine's own shape-swap cross-fade (`transitionOpacity` below) so
 * neither one overwrites the other.
 */
export function Scene() {
  const currentShapeId = useShapeStore((state) => state.currentShapeId)
  const showOcclusion = useAppearanceStore((state) => state.showOcclusion)
  const showVertices = useAppearanceStore((state) => state.showVertices)
  const color = useAppearanceStore((state) => state.color)
  const userOpacity = useAppearanceStore((state) => state.opacity)
  const isHead = currentShapeId === HEAD_ID

  // Read the store once, outside React's reactivity, to seed the very first
  // formation — the effect below handles every change *after* that.
  const initialFormation = useMemo(
    () => shapeRegistry.get(useShapeStore.getState().currentShapeId).create(),
    [],
  )
  const { pointsGeometry, wireframeGeometry, occluderGeometry, opacity: transitionOpacity, retarget } =
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
          {showVertices && (
            <points geometry={pointsGeometry}>
              <pointsMaterial
                size={0.04}
                color={color}
                sizeAttenuation
                transparent
                opacity={transitionOpacity * userOpacity}
              />
            </points>
          )}
          <lineSegments geometry={wireframeGeometry}>
            <lineBasicMaterial
              color={darken(color, WIREFRAME_DARKEN_FACTOR)}
              transparent
              opacity={transitionOpacity * userOpacity}
            />
          </lineSegments>
        </>
      )}

      {/* Drei's OrbitControls: drag to rotate, scroll to zoom, right-drag to pan. */}
      <OrbitControls />
    </>
  )
}
