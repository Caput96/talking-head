import type { MorphSource } from '../core/MorphSource'

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * ShapeMorphSource — a MorphSource that eases toward a target formation and
 * can be retargeted at any time (e.g. from a UI shape switcher). Calling
 * setTarget() doesn't jump the target immediately: it just marks the current
 * transition as "start over", and the next update() snapshots wherever
 * `positions` actually is *right then* as the new starting point. That makes
 * retargeting mid-transition smooth — it continues from the live position,
 * not from the old target.
 *
 * `target` (and any formation passed to setTarget) must have the same length
 * as `positions` — guaranteed here by every shape sharing one grid topology
 * (see core/grid.ts), so this isn't validated at runtime.
 */
export class ShapeMorphSource implements MorphSource {
  private readonly durationSec: number
  private target: Float32Array
  private start: Float32Array | null
  private elapsed: number

  constructor(initialTarget: Float32Array, durationSec: number) {
    this.durationSec = durationSec
    this.target = initialTarget
    this.start = initialTarget
    this.elapsed = durationSec // already "arrived" — update() renders the target as-is
  }

  setTarget(target: Float32Array): void {
    this.target = target
    this.start = null // sentinel: snapshot the live position on the next update()
    this.elapsed = 0
  }

  update(dt: number, positions: Float32Array): void {
    if (this.start === null) {
      this.start = positions.slice()
    }

    this.elapsed += dt
    const t = easeInOutCubic(Math.min(this.elapsed / this.durationSec, 1))

    for (let i = 0; i < positions.length; i++) {
      positions[i] = lerp(this.start[i], this.target[i], t)
    }
  }
}
