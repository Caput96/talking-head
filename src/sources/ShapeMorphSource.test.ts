import { describe, expect, it } from 'vitest'
import { ShapeMorphSource } from './ShapeMorphSource'

describe('ShapeMorphSource', () => {
  const from = new Float32Array([0, 0, 0])
  const to = new Float32Array([10, 10, 10])

  it('stays at the "from" formation right after start', () => {
    const source = new ShapeMorphSource(from, to, 1)
    const positions = new Float32Array(3)

    source.update(0, positions)

    expect(positions[0]).toBeCloseTo(0)
  })

  it('reaches the "to" formation once the duration elapses', () => {
    const source = new ShapeMorphSource(from, to, 1)
    const positions = new Float32Array(3)

    source.update(1, positions)

    expect(positions[0]).toBeCloseTo(10)
  })

  it('reverses direction after reaching the end, moving back toward "from"', () => {
    const source = new ShapeMorphSource(from, to, 1)
    const positions = new Float32Array(3)

    source.update(1, positions) // reaches "to", flips to reverse
    source.update(0.1, positions) // ticks a bit further while reversed

    expect(positions[0]).toBeLessThan(10)
    expect(positions[0]).toBeGreaterThan(0)
  })
})
