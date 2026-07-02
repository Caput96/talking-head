import { describe, expect, it } from 'vitest'
import { CompositeMorphSource } from './CompositeMorphSource'
import type { MorphSource } from '../core/MorphSource'

describe('CompositeMorphSource', () => {
  it('runs sources in order, each seeing the previous one\'s writes', () => {
    const writeOnes: MorphSource = {
      update: (_dt, positions) => {
        positions[0] = 1
      },
    }
    const doubleFirst: MorphSource = {
      update: (_dt, positions) => {
        positions[0] *= 2
      },
    }
    const composite = new CompositeMorphSource([writeOnes, doubleFirst])
    const positions = new Float32Array([0])

    composite.update(0.016, positions)

    expect(positions[0]).toBe(2) // 1, then doubled — proves ordering, not just "both ran"
  })

  it('is a no-op with an empty source list', () => {
    const composite = new CompositeMorphSource([])
    const positions = new Float32Array([5])

    composite.update(0.016, positions)

    expect(positions[0]).toBe(5)
  })
})
