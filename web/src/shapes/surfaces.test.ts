import { describe, expect, it } from 'vitest'
import { lightbulbSurface, pyramid, superellipsoid, torusSurface } from './surfaces'

describe('pyramid surface', () => {
  const surface = pyramid(1, 2)

  it('collapses to a single point at the apex (v=0), regardless of u', () => {
    const [x1, y1, z1] = surface(0, 0)
    const [x2, y2, z2] = surface(0.5, 0)

    expect(x1).toBeCloseTo(0)
    expect(z1).toBeCloseTo(0)
    expect(x2).toBeCloseTo(0)
    expect(z2).toBeCloseTo(0)
    expect(y1).toBeCloseTo(y2)
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
      expect(Math.hypot(x, z)).toBeGreaterThan(0)
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(Math.SQRT2 + 1e-6) // halfBase = 1
    }
  })

  it('places the apex above the base along y', () => {
    const [, apexY] = surface(0, 0)
    const [, baseY] = surface(0, 1)

    expect(apexY).toBeGreaterThan(baseY)
  })
})

describe('superellipsoid surface', () => {
  const surface = superellipsoid(2) // sphere

  it('collapses to a pole on the y axis at both v-ends, regardless of u', () => {
    for (const v of [0, 1]) {
      for (const u of [0, 0.25, 0.5, 0.75]) {
        const [x, , z] = surface(u, v)
        expect(x).toBeCloseTo(0)
        expect(z).toBeCloseTo(0)
      }
    }
  })

  it('puts the poles on opposite sides along y', () => {
    const [, topY] = surface(0, 0)
    const [, bottomY] = surface(0, 1)
    expect(topY).toBeGreaterThan(bottomY)
  })
})

describe('torus surface', () => {
  const surface = torusSurface(0.7, 0.3)

  it("sweeps the tube's cross-section along y, leaving the main ring in x/z", () => {
    const [xTop, yTop, zTop] = surface(0, 0.25) // phi = pi/2: tube's "top"
    const [xBottom, yBottom, zBottom] = surface(0, 0.75) // phi = 3pi/2: tube's "bottom"

    expect(yTop).toBeGreaterThan(0)
    expect(yBottom).toBeLessThan(0)
    // Same theta (u=0), same ring radius at these two phi values (cos(pi/2) == cos(3pi/2) == 0)
    // so x/z should match while only y (the hole's axis) flips sign.
    expect(xTop).toBeCloseTo(xBottom)
    expect(zTop).toBeCloseTo(zBottom)
  })
})

describe('lightbulb surface', () => {
  const surface = lightbulbSurface()

  it('closes to a point on the axis at both v-ends, regardless of u', () => {
    for (const v of [0, 1]) {
      for (const u of [0, 0.25, 0.5, 0.75]) {
        const [x, , z] = surface(u, v)
        expect(Math.hypot(x, z)).toBeCloseTo(0)
      }
    }
  })

  it('puts the glass dome above the screw base along y', () => {
    const [, topY] = surface(0, 0)
    const [, bottomY] = surface(0, 1)
    expect(topY).toBeGreaterThan(bottomY)
  })

  it('bulges wider in the glass than in the base, with no NaNs across a sweep', () => {
    let bulbMaxRadius = 0
    let baseMaxRadius = 0
    for (let row = 0; row <= 10; row++) {
      const v = row / 10
      for (let col = 0; col < 16; col++) {
        const [x, y, z] = surface(col / 16, v)
        expect(Number.isNaN(x)).toBe(false)
        expect(Number.isNaN(y)).toBe(false)
        expect(Number.isNaN(z)).toBe(false)
        const radius = Math.hypot(x, z)
        if (v < 0.5) bulbMaxRadius = Math.max(bulbMaxRadius, radius)
        if (v > 0.7) baseMaxRadius = Math.max(baseMaxRadius, radius)
      }
    }
    expect(bulbMaxRadius).toBeGreaterThan(baseMaxRadius)
  })
})
