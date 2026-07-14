import { describe, expect, it } from 'vitest'
import { sampleGrid } from './grid'
import { pyramid, torusSurface } from '../shapes/surfaces'

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

  it('skips both end caps when both ends are poles (a closed surface with no open ring)', () => {
    const doublePole = () => [0, 0, 0] as const
    const { faces } = sampleGrid(rows, cols, doublePole)

    // Only the 2 * rows * cols band triangles — no fan triangles at either end.
    expect(faces.length).toBe(2 * rows * cols * 3)
  })

  it("skips both end caps on a real torus (v=0/v=1 match — the fix for the donut-hole-filling bug)", () => {
    const { faces } = sampleGrid(rows, cols, torusSurface(0.7, 0.3))

    expect(faces.length).toBe(2 * rows * cols * 3)
  })

  it('caps only the open base on a real pyramid, not the apex pole', () => {
    const { faces } = sampleGrid(rows, cols, pyramid(1, 2))
    const vertexIndex = (row: number, col: number) => row * cols + (col % cols)

    const triangles: Array<[number, number, number]> = []
    for (let i = 0; i < faces.length; i += 3) triangles.push([faces[i], faces[i + 1], faces[i + 2]])

    // Base cap (row = rows) present: the fan from its first vertex.
    expect(triangles).toContainEqual([vertexIndex(rows, 0), vertexIndex(rows, 1), vertexIndex(rows, 2)])
    // Apex cap (row = 0) absent: no fan triangle starting from its first vertex.
    expect(triangles).not.toContainEqual([vertexIndex(0, 0), vertexIndex(0, 1), vertexIndex(0, 2)])
    expect(faces.length).toBe((2 * rows * cols + (cols - 2)) * 3)
  })
})
