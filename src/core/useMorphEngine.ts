import { useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry } from 'three'
import { MorphEngine } from './MorphEngine'
import { ShapeMorphSource } from '../sources/ShapeMorphSource'
import type { Formation } from './grid'

const MORPH_DURATION_SEC = 1.2

/**
 * useMorphEngine — the R3F glue between MorphEngine (plain TS) and the scene.
 *
 * Builds the engine and two BufferGeometry objects once (via useMemo): a
 * points geometry and a wireframe geometry, each with its own
 * THREE.BufferAttribute wrapping the SAME engine.positions Float32Array (see
 * the Phase 1 plan's design note on why they need separate geometries but a
 * single underlying array). Every frame, useFrame advances the engine and
 * flags both attributes for GPU re-upload.
 *
 * Note: we use the plain `THREE.BufferAttribute` constructor here, not the
 * convenience `Float32BufferAttribute` — that subclass copies its input into
 * a new array, which would silently detach the attribute from
 * `engine.positions` and freeze it at whatever values existed when the
 * geometry was built (all zeros, since MorphEngine hasn't ticked yet).
 *
 * The wireframe's edge index is set once, from the initial formation, and
 * never touches again: every shape in the registry shares the same grid
 * topology (core/grid.ts), so edges never change — only positions do.
 * `retarget()` lets a caller (Scene.tsx, reacting to the shape store) morph
 * toward a different formation without rebuilding any geometry.
 */
export function useMorphEngine(initialFormation: Formation) {
  const { engine, source, pointsGeometry, wireframeGeometry } = useMemo(() => {
    const vertexCount = initialFormation.positions.length / 3
    const source = new ShapeMorphSource(initialFormation.positions, MORPH_DURATION_SEC)
    const engine = new MorphEngine(vertexCount, source)

    const pointsGeometry = new BufferGeometry()
    pointsGeometry.setAttribute('position', new BufferAttribute(engine.positions, 3))

    const wireframeGeometry = new BufferGeometry()
    wireframeGeometry.setAttribute('position', new BufferAttribute(engine.positions, 3))
    wireframeGeometry.setIndex(new BufferAttribute(initialFormation.edges, 1))

    return { engine, source, pointsGeometry, wireframeGeometry }
    // Deliberately built once, ignoring changes to initialFormation: switching
    // shapes later goes through retarget(), not a re-run of this setup.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_state, dt) => {
    engine.tick(dt)
    pointsGeometry.attributes.position.needsUpdate = true
    wireframeGeometry.attributes.position.needsUpdate = true
  })

  const retarget = useCallback((formation: Formation) => source.setTarget(formation.positions), [source])

  return { pointsGeometry, wireframeGeometry, retarget }
}
