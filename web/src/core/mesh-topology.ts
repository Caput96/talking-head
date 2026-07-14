/**
 * mesh-topology — derives unique wireframe edges from a triangle index buffer.
 *
 * A triangle mesh's index buffer lists vertex indices 3-at-a-time (one triple
 * per face). Adjacent triangles share edges, so naively drawing every
 * triangle's 3 edges would draw shared edges twice. This walks every triangle,
 * builds the 3 (a, b) edges, and keeps only the unique ones — the result is a
 * flat list of vertex index pairs ready for a THREE.LineSegments index buffer.
 *
 * Reused later for the Phase 3 head mesh, which also needs edge indices for
 * its wireframe (ADR-001 §3).
 */
export function deriveEdgeIndices(triangleIndex: ArrayLike<number>): Uint32Array {
  const seen = new Set<number>()
  const edges: number[] = []

  const addEdge = (a: number, b: number) => {
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    // Pack both indices into one number to dedupe with a Set instead of a
    // string key — cheap as long as indices stay well under 2^16.
    const key = lo * 65536 + hi
    if (seen.has(key)) return
    seen.add(key)
    edges.push(lo, hi)
  }

  for (let i = 0; i < triangleIndex.length; i += 3) {
    const a = triangleIndex[i]
    const b = triangleIndex[i + 1]
    const c = triangleIndex[i + 2]
    addEdge(a, b)
    addEdge(b, c)
    addEdge(c, a)
  }

  return new Uint32Array(edges)
}
