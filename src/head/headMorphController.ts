import type { VISEMES } from 'wawa-lipsync'
import { HEAD_TARGET_NAMES, TARGET_BY_WAWA, type HeadTargetName } from './visemeMap'

// Mirrors sources/LipSyncSource.ts's attack/release pattern: attack faster
// than release, so the mouth snaps into a new shape promptly on a syllable
// but eases out rather than cutting instantly when wawa's dominant viseme
// changes every frame.
const ATTACK_SEC = 0.05
const RELEASE_SEC = 0.12

/**
 * HeadMorphController — turns wawa-lipsync's single dominant viseme per frame
 * into smooth weights across all 15 GLB morph targets (ADR-003's viseme step).
 *
 * wawa-lipsync doesn't output a 15-value blend — just one "this is the current
 * mouth shape" name (see head/wawaLipsync.ts). Snapping straight to 0/1 on
 * that name would make the mouth flicker discretely between shapes every time
 * the dominant viseme changes. This eases every target toward 1 (if it's the
 * current dominant one) or 0 (otherwise) each frame, so transitions blend.
 */
export class HeadMorphController {
  private readonly weights = new Map<HeadTargetName, number>(
    HEAD_TARGET_NAMES.map((name) => [name, 0]),
  )

  /** Advance all 15 weights by `dt` seconds toward `wawaViseme`'s mapped
   * target, and return the current weight map (same Map instance each call —
   * callers should read it immediately, not retain it). */
  update(dt: number, wawaViseme: VISEMES): ReadonlyMap<HeadTargetName, number> {
    const activeTarget = TARGET_BY_WAWA[wawaViseme]
    for (const name of HEAD_TARGET_NAMES) {
      const current = this.weights.get(name) ?? 0
      const target = name === activeTarget ? 1 : 0
      const rate = target > current ? ATTACK_SEC : RELEASE_SEC
      this.weights.set(name, current + (target - current) * Math.min(dt / rate, 1))
    }
    return this.weights
  }
}
