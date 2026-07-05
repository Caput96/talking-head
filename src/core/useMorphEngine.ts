import { useCallback, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry } from 'three'
import { MorphEngine } from './MorphEngine'
import { ShapeMorphSource } from '../sources/ShapeMorphSource'
import { CompositeMorphSource } from '../sources/CompositeMorphSource'
import type { Formation } from './grid'

const MORPH_DURATION_SEC = 1.2
const FADE_DURATION_SEC = 0.25

interface EngineState {
  engine: MorphEngine
  shapeMorphSource: ShapeMorphSource
  pointsGeometry: BufferGeometry
  wireframeGeometry: BufferGeometry
  /** Triangle-indexed surface a caller can render as a real filled surface
   * (the "Solid" toggle) — see Scene.tsx. Once opaque-ish, it occludes the
   * far side of a shape as a side effect of being real geometry with real
   * depth, not via an invisible colorWrite:false trick. */
  occluderGeometry: BufferGeometry
}

function buildEngineState(formation: Formation): EngineState {
  const vertexCount = formation.positions.length / 3
  const shapeMorphSource = new ShapeMorphSource(formation.positions, MORPH_DURATION_SEC)
  // Wrapped in CompositeMorphSource even though it's the only source now:
  // amplitude-driven lip-sync (the old LipSyncSource) used to run alongside it
  // here, and was removed once ADR-003's viseme-driven morph-weight path
  // (head/HeadGLB.tsx) took over mouth animation entirely — see ADR-001's
  // updated addendum. Left wrapped rather than passing shapeMorphSource to
  // MorphEngine directly, since CLAUDE.md's roadmap already names the next
  // source expected to join this list (a future AgentStateSource driving
  // assistant motion) — this is the one line that'll change when it lands.
  const engine = new MorphEngine(vertexCount, new CompositeMorphSource([shapeMorphSource]))

  const pointsGeometry = new BufferGeometry()
  pointsGeometry.setAttribute('position', new BufferAttribute(engine.positions, 3))

  const wireframeGeometry = new BufferGeometry()
  wireframeGeometry.setAttribute('position', new BufferAttribute(engine.positions, 3))
  wireframeGeometry.setIndex(new BufferAttribute(formation.edges, 1))

  const occluderGeometry = new BufferGeometry()
  occluderGeometry.setAttribute('position', new BufferAttribute(engine.positions, 3))
  occluderGeometry.setIndex(new BufferAttribute(formation.faces, 1))

  return { engine, shapeMorphSource, pointsGeometry, wireframeGeometry, occluderGeometry }
}

/**
 * useMorphEngine — the R3F glue between MorphEngine (plain TS) and the scene.
 *
 * Every grid shape (sphere/cube/torus/pyramid) shares one vertex count, so
 * retargeting between them is just ShapeMorphSource.setTarget() — a smooth
 * lerp, no geometry change. The head doesn't share that vertex count (it's
 * sampled from its own mesh, see core/mesh-sampling.ts), so retarget() must
 * handle both cases:
 *  - same vertex count: unchanged fast path, just setTarget() on the live source.
 *  - different vertex count: no per-vertex correspondence is possible, so
 *    rebuild a fresh engine + geometries sized for the new formation (and
 *    dispose the old ones — three.js doesn't garbage-collect GPU buffers on
 *    its own), snap directly to it, and cross-fade opacity in so the swap
 *    isn't a jarring pop.
 *
 * MorphEngine's actual source is a CompositeMorphSource wrapping
 * shapeMorphSource (ADR-001 §2 addendum) — a single-source list today, kept
 * wrapped rather than passed to MorphEngine directly because the addendum
 * anticipates a second source (mouth animation used to be one; see
 * buildEngineState's comment) joining it again later.
 *
 * `state` (engine/sources/geometries together) is a single React state value —
 * `pointsGeometry`/`wireframeGeometry`/`occluderGeometry` must be state so
 * Scene.tsx's JSX (`<points geometry={...}>`) re-renders when a rebuild swaps
 * them for new objects. `retarget()` (called from an effect, not during
 * render) needs to read the *current* state imperatively, so it's mirrored
 * into `stateRef` — but that mirroring happens as a plain assignment in the
 * render body below, not inside the `useState` lazy initializer. Doing it in
 * the initializer looks tempting but is a real bug: React (Strict Mode, in
 * dev) may invoke a lazy initializer twice and keep only one result, so a
 * side effect inside it can point the ref at a *different* engine than the
 * one actually rendered — useFrame then ticks one engine's positions while
 * the JSX shows another's (frozen, all-zero) geometry. A plain assignment
 * every render can't desync like that: it always reflects whatever state
 * React just committed.
 */
export function useMorphEngine(initialFormation: Formation) {
  const [state, setState] = useState(() => buildEngineState(initialFormation))
  const stateRef = useRef(state)
  stateRef.current = state

  const [opacity, setOpacity] = useState(1)
  const fadeElapsedRef = useRef(-1) // -1 = not fading

  useFrame((_r3fState, dt) => {
    const current = stateRef.current
    current.engine.tick(dt)
    current.pointsGeometry.attributes.position.needsUpdate = true
    current.wireframeGeometry.attributes.position.needsUpdate = true
    current.occluderGeometry.attributes.position.needsUpdate = true

    if (fadeElapsedRef.current >= 0) {
      fadeElapsedRef.current += dt
      const t = Math.min(fadeElapsedRef.current / FADE_DURATION_SEC, 1)
      setOpacity(t)
      if (t >= 1) fadeElapsedRef.current = -1
    }
  })

  const retarget = useCallback((formation: Formation) => {
    const current = stateRef.current

    const nextVertexCount = formation.positions.length / 3
    if (nextVertexCount === current.engine.vertexCount) {
      current.shapeMorphSource.setTarget(formation.positions)
      return
    }

    current.pointsGeometry.dispose()
    current.wireframeGeometry.dispose()
    current.occluderGeometry.dispose()

    fadeElapsedRef.current = 0
    setOpacity(0)
    setState(buildEngineState(formation))
  }, [])

  return {
    pointsGeometry: state.pointsGeometry,
    wireframeGeometry: state.wireframeGeometry,
    occluderGeometry: state.occluderGeometry,
    opacity,
    retarget,
  }
}
