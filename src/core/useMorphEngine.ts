import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry } from 'three'
import { MorphEngine } from './MorphEngine'
import { ShapeMorphSource } from '../sources/ShapeMorphSource'
import type { Formation } from './formations'

const MORPH_DURATION_SEC = 3

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
 */
export function useMorphEngine(formationA: Formation, formationB: Formation) {
  const { engine, pointsGeometry, wireframeGeometry } = useMemo(() => {
    const vertexCount = formationA.positions.length / 3
    const source = new ShapeMorphSource(formationA.positions, formationB.positions, MORPH_DURATION_SEC)
    const engine = new MorphEngine(vertexCount, source)

    const pointsGeometry = new BufferGeometry()
    pointsGeometry.setAttribute('position', new BufferAttribute(engine.positions, 3))

    const wireframeGeometry = new BufferGeometry()
    wireframeGeometry.setAttribute('position', new BufferAttribute(engine.positions, 3))
    wireframeGeometry.setIndex(new BufferAttribute(formationA.edges, 1))

    return { engine, pointsGeometry, wireframeGeometry }
  }, [formationA, formationB])

  useFrame((_state, dt) => {
    engine.tick(dt)
    pointsGeometry.attributes.position.needsUpdate = true
    wireframeGeometry.attributes.position.needsUpdate = true
  })

  return { pointsGeometry, wireframeGeometry }
}
