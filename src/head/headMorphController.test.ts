import { describe, it, expect } from 'vitest'
import { VISEMES } from 'wawa-lipsync'
import { HeadMorphController } from './headMorphController'

describe('HeadMorphController', () => {
  it('eases the active viseme toward 1 and every other toward 0', () => {
    const controller = new HeadMorphController()

    let weights = new Map<string, number>()
    for (let i = 0; i < 60; i++) {
      weights = new Map(controller.update(1 / 60, VISEMES.aa))
    }

    expect(weights.get('aa')!).toBeGreaterThan(0.95)
    expect(weights.get('sil')!).toBeLessThan(0.05)
    expect(weights.get('PP')!).toBeLessThan(0.05)
  })

  it('attacks faster than it releases when the dominant viseme switches', () => {
    const controller = new HeadMorphController()
    for (let i = 0; i < 60; i++) controller.update(1 / 60, VISEMES.aa)

    // One identical dt step after switching to a new dominant viseme: the new
    // target should have risen further than the old one has fallen, because
    // ATTACK_SEC < RELEASE_SEC.
    const before = new Map(controller.update(0, VISEMES.PP)) // dt=0 snapshot, no movement yet
    const after = new Map(controller.update(1 / 60, VISEMES.PP))

    const ppRise = after.get('PP')! - before.get('PP')!
    const aaFall = before.get('aa')! - after.get('aa')!
    expect(ppRise).toBeGreaterThan(aaFall)
  })

  it('leaves weights for targets that never became dominant at 0', () => {
    const controller = new HeadMorphController()
    const weights = controller.update(1 / 60, VISEMES.sil)
    expect(weights.get('CH')).toBe(0)
    expect(weights.get('RR')).toBe(0)
  })
})
