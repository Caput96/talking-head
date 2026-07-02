/**
 * grid — the canonical shape topology for Phase 2's ShapeRegistry.
 *
 * Every registered shape (sphere, cube, torus, ...) is really the same
 * (rows x cols) lattice of points, just deformed by a different parametric
 * surface function `(u, v) -> [x, y, z]` (u, v both range 0..1). Because every
 * shape shares this one grid, they all produce the exact same vertex count
 * and the exact same edges — only positions differ. That is what lets
 * ShapeMorphSource morph between *any* two registered shapes with a plain
 * index-for-index lerp, and it's why the wireframe's edge index never needs
 * to change when switching shapes (see core/useMorphEngine.ts).
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

  return { positions, edges: buildGridEdges(rows, cols) }
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
