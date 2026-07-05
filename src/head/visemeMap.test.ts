import { describe, it, expect } from 'vitest'
import { VISEMES } from 'wawa-lipsync'
import { HEAD_TARGET_NAMES, TARGET_BY_WAWA } from './visemeMap'

describe('visemeMap', () => {
  it('maps every wawa viseme to a name that actually exists in the GLB', () => {
    // If wawa emits a viseme with no corresponding morph target, that frame
    // would silently drive nothing — this is the contract guard against it.
    for (const wawa of Object.values(VISEMES)) {
      const target = TARGET_BY_WAWA[wawa]
      expect(HEAD_TARGET_NAMES).toContain(target)
    }
  })

  it('covers all 15 wawa visemes exactly once', () => {
    const targets = Object.values(TARGET_BY_WAWA)
    expect(targets).toHaveLength(15)
    // No two wawa visemes collapse onto the same target — the map is a bijection
    // onto 15 of the target names.
    expect(new Set(targets).size).toBe(15)
  })
})
