/**
 * grid — the canonical shape topology for Phase 2's ShapeRegistry.
 *
 * Every registered shape (sphere, cube, torus, ...) is really the same
 * (rows x cols) lattice of points, just deformed by a different parametric
 * surface function `(u, v) -> [x, y, z]` (u, v both range 0..1). Because every
 * shape shares this one grid, they all produce the exact same vertex count,
 * edges, and faces — only positions differ. That is what lets ShapeMorphSource
 * morph between *any* two registered shapes with a plain index-for-index
 * lerp, and it's why the wireframe's edge index and the occluder's face index
 * never need to change when switching shapes (see core/useMorphEngine.ts).
 *
 * `u` wraps around (like longitude): column `cols` is the same ring position
 * as column 0, so the grid closes seamlessly around that axis. `v` does not
 * wrap (like latitude, pole to pole) — most surfaces (sphere, cube) want a
 * distinct start/end row. A torus still closes cleanly on this axis because
 * its surface function maps v=0 and v=1 to the same 3D point (see
 * shapes/torus.ts) — no special-casing needed here.
 */
export interface Formation {
  positions: Float32Array
  edges: Uint32Array
  /** Triangle indices (3 per face) — the invisible occlusion surface that
   * stops the far side of a shape from showing through the near side (see
   * core/useMorphEngine.ts). Every shape needs one for occlusion to work
   * uniformly, with no shape-specific case. */
  faces: Uint32Array
}

export type SurfaceFn = (u: number, v: number) => readonly [number, number, number]

export function sampleGrid(rows: number, cols: number, surface: SurfaceFn): Formation {
  const positions = new Float32Array((rows + 1) * cols * 3)

  for (let row = 0; row <= rows; row++) {
    const v = row / rows
    for (let col = 0; col < cols; col++) {
      const u = col / cols
      const [x, y, z] = surface(u, v)
      const i = (row * cols + col) * 3
      positions[i] = x
      positions[i + 1] = y
      positions[i + 2] = z
    }
  }

  return { positions, edges: buildGridEdges(rows, cols), faces: buildGridFaces(rows, cols) }
}

function buildGridEdges(rows: number, cols: number): Uint32Array {
  const vertexIndex = (row: number, col: number) => row * cols + (col % cols)
  const edges: number[] = []

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Ring neighbor — wraps, since `u` is periodic.
      edges.push(vertexIndex(row, col), vertexIndex(row, col + 1))
      // Neighbor in the next row — no wrap; there is no row after the last one.
      if (row < rows) edges.push(vertexIndex(row, col), vertexIndex(row + 1, col))
    }
  }

  return new Uint32Array(edges)
}

/**
 * Two triangles per grid cell (the quad between a row and the next one) —
 * the surface used for occlusion (see core/useMorphEngine.ts), not for the
 * wireframe. Same (row, col) indexing as buildGridEdges, so the torus's
 * seamless close carries over here with no extra work.
 *
 * Both ends (row 0 and row `rows`) also get a fan-triangulated cap, built
 * only from vertices that already exist on that ring (no new vertices —
 * that would change the vertex count and break morph compatibility with
 * every other shape). For a pole — where every column has collapsed to the
 * same 3D point, like the top/bottom of a sphere — this is a no-op: the fan
 * triangles all have zero area, so they're simply invisible. For a shape
 * whose end is a genuine open ring instead — the pyramid's flat base — this
 * is what actually closes it, so the occluder doesn't leave a hole to see
 * through. One rule, no per-shape special case.
 */
function buildGridFaces(rows: number, cols: number): Uint32Array {
  const vertexIndex = (row: number, col: number) => row * cols + (col % cols)
  const faces: number[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = vertexIndex(row, col)
      const b = vertexIndex(row, col + 1)
      const c = vertexIndex(row + 1, col)
      const d = vertexIndex(row + 1, col + 1)
      faces.push(a, b, d, a, d, c)
    }
  }

  for (const row of [0, rows]) {
    for (let col = 1; col < cols - 1; col++) {
      faces.push(vertexIndex(row, 0), vertexIndex(row, col), vertexIndex(row, col + 1))
    }
  }

  return new Uint32Array(faces)
}
