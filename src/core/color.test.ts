import { describe, expect, it } from 'vitest'
import { darken } from './color'

describe('darken', () => {
  it('scales each channel down by factor', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080')
  })

  it('leaves the color unchanged at factor 1', () => {
    expect(darken('#7dd3fc', 1)).toBe('#7dd3fc')
  })

  it('clamps at black for factor 0', () => {
    expect(darken('#7dd3fc', 0)).toBe('#000000')
  })
})
