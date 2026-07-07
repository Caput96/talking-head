import { describe, expect, it } from 'vitest'
import { deriveEdgeIndices } from './mesh-topology'

describe('deriveEdgeIndices', () => {
  it('dedupes an edge shared by two adjacent triangles', () => {
    // Triangle A: 0-1-2, Triangle B: 1-2-3 — they share edge (1, 2).
    const triangles = [0, 1, 2, 1, 2, 3]

    const edges = deriveEdgeIndices(triangles)

    // 6 edge-mentions across both triangles, minus 1 duplicate = 5 unique edges.
    expect(edges.length).toBe(5 * 2)
    expect(Array.from(edges)).toEqual([0, 1, 1, 2, 0, 2, 2, 3, 1, 3])
  })
})
