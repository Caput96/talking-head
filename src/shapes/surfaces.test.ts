import { describe, expect, it } from 'vitest'
import { pyramid } from './surfaces'

describe('pyramid surface', () => {
  const surface = pyramid(1, 2)

  it('collapses to a single point at the apex (v=0), regardless of u', () => {
    const [x1, y1, z1] = surface(0, 0)
    const [x2, y2, z2] = surface(0.5, 0)

    expect(x1).toBeCloseTo(0)
    expect(y1).toBeCloseTo(0)
    expect(x2).toBeCloseTo(0)
    expect(y2).toBeCloseTo(0)
    expect(z1).toBeCloseTo(z2)
  })

  it('stays within a square footprint at v=1, with no NaNs across a sweep', () => {
    // A square's corners sit farther from center than its edges (up to
    // halfBase * sqrt(2) at the corners), so the bound isn't halfBase itself.
    for (let i = 0; i <= 16; i++) {
      const u = i / 16
      const [x, y, z] = surface(u, 1)

      expect(Number.isNaN(x)).toBe(false)
      expect(Number.isNaN(y)).toBe(false)
      expect(Number.isNaN(z)).toBe(false)
      expect(Math.hypot(x, y)).toBeGreaterThan(0)
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(Math.SQRT2 + 1e-6) // halfBase = 1
    }
  })

  it('places the apex above the base along z', () => {
    const [, , apexZ] = surface(0, 0)
    const [, , baseZ] = surface(0, 1)

    expect(apexZ).toBeGreaterThan(baseZ)
  })
})
