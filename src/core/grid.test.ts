import { describe, expect, it } from 'vitest'
import { sampleGrid } from './grid'

describe('sampleGrid', () => {
  const rows = 2
  const cols = 3
  const identitySurface = (u: number, v: number) => [u, v, 0] as const

  it('produces one vertex per grid cell, (rows + 1) rows tall', () => {
    const { positions } = sampleGrid(rows, cols, identitySurface)

    expect(positions.length).toBe((rows + 1) * cols * 3)
  })

  it('builds ring edges (wrapping in u) plus row-to-row edges (not wrapping in v)', () => {
    const { edges } = sampleGrid(rows, cols, identitySurface)
    const vertexCount = (rows + 1) * cols

    // 3 ring edges per row * 3 rows, + 3 row-to-row edges per row-gap * 2 gaps
    expect(edges.length).toBe((3 * 3 + 3 * 2) * 2)

    for (const index of edges) {
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(vertexCount)
    }
  })

  it('wraps the last column back to the first within a row', () => {
    const { edges } = sampleGrid(rows, cols, identitySurface)
    const pairs: Array<[number, number]> = []
    for (let i = 0; i < edges.length; i += 2) pairs.push([edges[i], edges[i + 1]])

    // Row 0: vertices 0, 1, 2 — the ring edge from col 2 should wrap back to col 0.
    expect(pairs).toContainEqual([2, 0])
  })

  it('builds two triangles per grid cell plus a fan cap at each end, all indices in bounds', () => {
    const { faces } = sampleGrid(rows, cols, identitySurface)
    const vertexCount = (rows + 1) * cols

    // 2 triangles per cell * rows * cols cells, + (cols - 2) cap triangles
    // at each of the 2 ends (row 0 and row `rows`) * 3 indices per triangle.
    expect(faces.length).toBe((2 * rows * cols + 2 * (cols - 2)) * 3)

    for (const index of faces) {
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(vertexCount)
    }
  })

  it('caps row 0 with a fan from its first vertex, using only existing ring vertices', () => {
    const { faces } = sampleGrid(rows, cols, identitySurface)
    const triangles: Array<[number, number, number]> = []
    for (let i = 0; i < faces.length; i += 3) triangles.push([faces[i], faces[i + 1], faces[i + 2]])

    // Row 0 has vertices 0, 1, 2 — the only possible fan triangle is (0, 1, 2).
    expect(triangles).toContainEqual([0, 1, 2])
  })
})
