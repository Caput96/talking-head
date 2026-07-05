import { describe, expect, it } from 'vitest'
import { buildHeadGeometry } from './buildHeadGeometry'

describe('buildHeadGeometry', () => {
  it('produces a sane, NaN-free vertex set', () => {
    const { geometry } = buildHeadGeometry()
    const position = geometry.getAttribute('position')

    expect(position.count).toBeGreaterThan(0)
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      expect(Number.isNaN(x)).toBe(false)
      expect(Number.isNaN(y)).toBe(false)
      expect(Number.isNaN(z)).toBe(false)
      // The base sphere has radius 1; deformation should stay in a similar
      // ballpark, not blow up.
      expect(Math.hypot(x, y, z)).toBeLessThan(3)
    }
  })

  it('produces an indexed geometry (required by sampleMesh)', () => {
    const { geometry } = buildHeadGeometry()

    expect(geometry.getIndex()).not.toBeNull()
  })
})
