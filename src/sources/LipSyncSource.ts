import type { MorphSource } from '../core/MorphSource'
import type { AmplitudeSource } from '../core/AudioBus'

// Raw speech RMS from AudioBus is typically small (~0.02-0.15), so GAIN
// amplifies it into a usable 0-1 "mouth openness" range; NOISE_FLOOR keeps
// near-silence from twitching the mouth. ATTACK is faster than RELEASE — a
// standard amplitude-follower trick: the mouth should open promptly on a
// loud syllable but ease closed rather than snap shut between them. All
// five are first guesses, meant to be tuned by watching it, not derived.
const NOISE_FLOOR = 0.02
const GAIN = 8
const ATTACK_SEC = 0.05
const RELEASE_SEC = 0.15
const OPEN_STRENGTH = 1.5

/**
 * LipSyncSource — amplitude-driven mouth animation (ADR-001 §5, first step
 * of Phase 5; viseme-driven is a later step, blocked on phoneme timing data
 * no TTS engine currently provides — see ADR-002).
 *
 * Runs *after* whatever wrote this frame's rest positions (ShapeMorphSource,
 * via CompositeMorphSource) and overwrites only `mouthGroup` vertices with a
 * displaced-from-rest pose, scaled by smoothed audio loudness. Crucially,
 * "rest" here means `restPositions` — a fixed snapshot taken once at
 * construction (the formation's own positions, the same array
 * ShapeMorphSource treats as its target) — not the live, mutable `positions`
 * buffer. Deriving the outward direction from the live buffer instead would
 * compound: each tick would push further from an already-pushed-out
 * centroid, diverging exponentially within a few frames (caught by this
 * class's own test). Anchoring to a fixed rest snapshot makes this an
 * absolute pose blend instead — stable regardless of how many frames have
 * run, and independent of what any other source in the composite does.
 */
export class LipSyncSource implements MorphSource {
  private readonly mouthGroup: Uint32Array
  private readonly restPositions: Float32Array
  private readonly audioBus: AmplitudeSource
  private readonly restCentroid: readonly [number, number, number]
  private smoothedAmplitude = 0

  constructor(mouthGroup: Uint32Array, restPositions: Float32Array, audioBus: AmplitudeSource) {
    this.mouthGroup = mouthGroup
    this.restPositions = restPositions
    this.audioBus = audioBus
    this.restCentroid = computeCentroid(mouthGroup, restPositions)
  }

  update(dt: number, positions: Float32Array): void {
    if (this.mouthGroup.length === 0) return // shapes with no mouth: no-op

    const target = Math.min(Math.max(this.audioBus.getRms() - NOISE_FLOOR, 0) * GAIN, 1)
    const rate = target > this.smoothedAmplitude ? ATTACK_SEC : RELEASE_SEC
    this.smoothedAmplitude += (target - this.smoothedAmplitude) * Math.min(dt / rate, 1)

    const [cx, cy, cz] = this.restCentroid
    for (const i of this.mouthGroup) {
      const idx = i * 3
      const rx = this.restPositions[idx]
      const ry = this.restPositions[idx + 1]
      const rz = this.restPositions[idx + 2]
      positions[idx] = rx + (rx - cx) * this.smoothedAmplitude * OPEN_STRENGTH
      positions[idx + 1] = ry + (ry - cy) * this.smoothedAmplitude * OPEN_STRENGTH
      positions[idx + 2] = rz + (rz - cz) * this.smoothedAmplitude * OPEN_STRENGTH
    }
  }
}

function computeCentroid(
  indices: Uint32Array,
  positions: Float32Array,
): readonly [number, number, number] {
  let cx = 0
  let cy = 0
  let cz = 0
  for (const i of indices) {
    cx += positions[i * 3]
    cy += positions[i * 3 + 1]
    cz += positions[i * 3 + 2]
  }
  const n = indices.length || 1
  return [cx / n, cy / n, cz / n]
}
