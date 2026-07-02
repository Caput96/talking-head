import { describe, expect, it } from 'vitest'
import { ShapeMorphSource } from './ShapeMorphSource'

describe('ShapeMorphSource', () => {
  const shapeA = new Float32Array([0, 0, 0])
  const shapeB = new Float32Array([10, 10, 10])
  const shapeC = new Float32Array([-4, -4, -4])

  it('starts at rest at the initial target — no animation on mount', () => {
    const source = new ShapeMorphSource(shapeA, 1)
    const positions = new Float32Array(shapeA)

    source.update(0.016, positions)

    expect(positions[0]).toBeCloseTo(0)
  })

  it('reaches a new target once the duration elapses after setTarget', () => {
    const source = new ShapeMorphSource(shapeA, 1)
    const positions = new Float32Array(shapeA)

    source.setTarget(shapeB)
    source.update(1, positions)

    expect(positions[0]).toBeCloseTo(10)
  })

  it('retargeting mid-transition continues from the current live position, not the old target', () => {
    const source = new ShapeMorphSource(shapeA, 1)
    const positions = new Float32Array(shapeA)

    source.setTarget(shapeB)
    source.update(0.5, positions) // now roughly halfway from shapeA to shapeB
    const midway = positions[0]
    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(10)

    source.setTarget(shapeC)
    source.update(0, positions) // t=0 of the new transition: should still read as "midway", not shapeB or shapeA

    expect(positions[0]).toBeCloseTo(midway)
  })
})
