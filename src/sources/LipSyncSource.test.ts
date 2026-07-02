import { describe, expect, it } from 'vitest'
import { LipSyncSource } from './LipSyncSource'
import type { AmplitudeSource } from '../core/AudioBus'

// A mutable fake: `.rms` can be changed mid-test to simulate loudness
// changing over time, without reaching into LipSyncSource's private fields.
function fakeAudioBus(rms: number): AmplitudeSource & { rms: number } {
  const bus = {
    rms,
    getRms: () => bus.rms,
  }
  return bus
}

const MOUTH_GROUP = new Uint32Array([0, 1, 2])

// A small triangular mouth, matching the head's actual shape (see
// buildHeadGeometry.ts): two corners level, one vertex below them.
function restPositions(): Float32Array {
  return new Float32Array([
    -0.25, -0.19, 0.9, // corner
    0, -0.34, 0.87, // bottom-center
    0.25, -0.19, 0.9, // corner
  ])
}

describe('LipSyncSource', () => {
  it('is a no-op with an empty mouth group', () => {
    const source = new LipSyncSource(new Uint32Array([]), restPositions(), fakeAudioBus(1))
    const positions = restPositions()
    const before = positions.slice()

    source.update(0.016, positions)

    expect(positions).toEqual(before)
  })

  it('moves mouth vertices away from their rest centroid when loud, and settles (no runaway)', () => {
    const source = new LipSyncSource(MOUTH_GROUP, restPositions(), fakeAudioBus(1))
    const positions = restPositions()
    const restSpread = Math.abs(restPositions()[4] - restPositions()[1]) // bottom vertex vs. corner, y

    for (let i = 0; i < 30; i++) source.update(0.05, positions)
    const spreadAfter30 = Math.abs(positions[4] - positions[1])
    expect(spreadAfter30).toBeGreaterThan(restSpread)

    // Amplitude has long since saturated at 1 by tick 30 — further ticks at
    // the same loudness should hold steady, not keep growing (the bug this
    // guards: an earlier version derived the outward direction from the
    // live buffer instead of a fixed rest snapshot, compounding every tick).
    for (let i = 0; i < 30; i++) source.update(0.05, positions)
    const spreadAfter60 = Math.abs(positions[4] - positions[1])
    expect(spreadAfter60).toBeCloseTo(spreadAfter30, 5)
  })

  it('does not jump straight to the target amplitude in one small tick', () => {
    const single = new LipSyncSource(MOUTH_GROUP, restPositions(), fakeAudioBus(1))
    const repeated = new LipSyncSource(MOUTH_GROUP, restPositions(), fakeAudioBus(1))

    const oneTick = restPositions()
    single.update(0.016, oneTick)

    const manyTicks = restPositions()
    for (let i = 0; i < 30; i++) repeated.update(0.016, manyTicks)

    const displacement = (positions: Float32Array) => Math.abs(positions[4] - restPositions()[4])
    expect(displacement(oneTick)).toBeLessThan(displacement(manyTicks))
  })

  it('relaxes back toward rest once the audio goes quiet', () => {
    const bus = fakeAudioBus(1)
    const source = new LipSyncSource(MOUTH_GROUP, restPositions(), bus)
    const positions = restPositions()
    for (let i = 0; i < 30; i++) source.update(0.05, positions)
    const loudY = positions[4]

    bus.rms = 0
    for (let i = 0; i < 30; i++) source.update(0.05, positions)

    const restY = restPositions()[4]
    expect(Math.abs(positions[4] - restY)).toBeLessThan(Math.abs(loudY - restY))
  })
})
