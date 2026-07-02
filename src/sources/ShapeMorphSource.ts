import type { MorphSource } from '../core/MorphSource'

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * ShapeMorphSource — a MorphSource that eases between two formations and,
 * on reaching either end, reverses direction: a continuous, automatic
 * ping-pong. This is Phase 1's proof that MorphEngine + the shared buffer
 * work end to end. `from` and `to` must have the same length (same topology,
 * see Formation in core/formations.ts) — the values are lerped index-for-index.
 */
export class ShapeMorphSource implements MorphSource {
  private readonly from: Float32Array
  private readonly to: Float32Array
  private readonly durationSec: number
  private elapsed = 0
  private reverse = false

  constructor(from: Float32Array, to: Float32Array, durationSec: number) {
    this.from = from
    this.to = to
    this.durationSec = durationSec
  }

  update(dt: number, positions: Float32Array): void {
    this.elapsed += dt
    const rawT = Math.min(this.elapsed / this.durationSec, 1)
    const t = easeInOutCubic(rawT)

    const start = this.reverse ? this.to : this.from
    const end = this.reverse ? this.from : this.to
    for (let i = 0; i < positions.length; i++) {
      positions[i] = lerp(start[i], end[i], t)
    }

    if (this.elapsed >= this.durationSec) {
      this.elapsed = 0
      this.reverse = !this.reverse
    }
  }
}
