import { IcosahedronGeometry } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { deriveEdgeIndices } from './mesh-topology'

/**
 * A Formation is just vertex positions plus the edge topology that connects
 * them. Two formations that share the same vertex count and edge list can be
 * morphed into one another with a simple per-vertex lerp (see
 * ShapeMorphSource) — no retopology needed.
 *
 * These are plain generator functions, not ShapeRegistry factories: Phase 2
 * introduces the registry/factory pattern once there's more than one caller
 * that needs it (open/closed only pays off past that point).
 */
export interface Formation {
  positions: Float32Array
  edges: Uint32Array
}

/**
 * Builds a sphere-like formation from a subdivided icosahedron. `detail`
 * controls subdivision level: detail 1 gives 42 vertices / 120 edges, dense
 * enough to read as a wireframe while staying a light smoke test.
 */
export function createIcosphereFormation(detail: number): Formation {
  const geometry = new IcosahedronGeometry(1, detail)

  // IcosahedronGeometry (like all three.js polyhedra) builds a non-indexed
  // "triangle soup": every face gets its own 3 vertex entries, even where
  // adjacent faces meet, because UV coordinates differ across seams. We only
  // care about position topology, so drop uv/normal and merge coincident
  // positions back into a proper indexed mesh (one entry per unique vertex).
  geometry.deleteAttribute('normal')
  geometry.deleteAttribute('uv')
  const merged = mergeVertices(geometry)

  const positionAttr = merged.getAttribute('position')
  const index = merged.getIndex()
  if (!index) throw new Error('mergeVertices did not produce an index buffer')

  return {
    positions: new Float32Array(positionAttr.array),
    edges: deriveEdgeIndices(index.array),
  }
}

/**
 * Projects each vertex onto the surface of a cube (divide by the largest
 * absolute component). Keeps the exact same vertex count/order as the input,
 * so it can share the source formation's edge list — the result reads as a
 * "rounded cube" built from the same topology as the sphere.
 */
export function cubifyPositions(positions: Float32Array): Float32Array {
  const result = new Float32Array(positions.length)
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]
    const scale = 1 / Math.max(Math.abs(x), Math.abs(y), Math.abs(z))
    result[i] = x * scale
    result[i + 1] = y * scale
    result[i + 2] = z * scale
  }
  return result
}
