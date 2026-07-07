import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry } from 'three'
import { sampleMesh } from './mesh-sampling'

// A tetrahedron: 4 vertices, 4 triangular faces, every pair of vertices
// shares an edge — a small, hand-checkable indexed mesh.
function tetrahedron(): BufferGeometry {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1])
  const index = new Uint16Array([0, 1, 2, 0, 1, 3, 0, 2, 3, 1, 2, 3])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setIndex(new BufferAttribute(index, 1))
  return geometry
}

describe('sampleMesh', () => {
  it('copies positions and derives unique edges from the triangle index', () => {
    const { positions, edges } = sampleMesh(tetrahedron())

    expect(Array.from(positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1])
    // Every pair of the 4 vertices is an edge in a tetrahedron: C(4,2) = 6.
    expect(edges.length).toBe(6 * 2)
  })

  it('carries the triangle index through unchanged as faces', () => {
    const { faces } = sampleMesh(tetrahedron())

    expect(Array.from(faces)).toEqual([0, 1, 2, 0, 1, 3, 0, 2, 3, 1, 2, 3])
  })

  it('throws on a non-indexed geometry', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0]), 3))

    expect(() => sampleMesh(geometry)).toThrow(/indexed/)
  })
})
