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
})
