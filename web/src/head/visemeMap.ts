import { VISEMES } from 'wawa-lipsync'

/**
 * visemeMap — the explicit seam between wawa-lipsync's output names and the
 * GLB head's morph-target names (ADR-003, corrected).
 *
 * ADR-003 originally hoped the shape-key names would match wawa-lipsync's
 * output *exactly*, so no translation layer would exist. Against the real
 * asset + library that turned out false in two ways:
 *
 *  1. The GLB uses the standard Oculus names with NO prefix
 *     (`aa`, `PP`, `ih`, ...), while wawa-lipsync emits them PREFIXED
 *     (`viseme_aa`, `viseme_PP`, ...).
 *  2. wawa-lipsync renames three vowels: it emits `viseme_I`, `viseme_O`,
 *     `viseme_U` where the standard Oculus set (and our asset) uses
 *     `ih`, `oh`, `ou`.
 *
 * So a tiny, explicit map IS the contract. We keep the asset on the standard
 * Oculus names (a more portable, swappable asset — ADR-003's "replaceable
 * behind the name contract" goal) and translate wawa's names here. This is
 * the ONLY place that knows about the difference.
 */

/** The 15 morph-target names actually present in assets/head.glb, in the GLB's
 * own order. Also the source of truth the VisemePanel lists and the visemeMap
 * test checks against. */
export const HEAD_TARGET_NAMES = [
  'sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR',
  'aa', 'E', 'ih', 'oh', 'ou',
] as const

export type HeadTargetName = (typeof HEAD_TARGET_NAMES)[number]

/** wawa-lipsync viseme (its `VISEMES` enum value, e.g. "viseme_aa") → the GLB
 * target name to drive ("aa"). Every wawa viseme maps to exactly one target. */
export const TARGET_BY_WAWA: Record<VISEMES, HeadTargetName> = {
  [VISEMES.sil]: 'sil',
  [VISEMES.PP]: 'PP',
  [VISEMES.FF]: 'FF',
  [VISEMES.TH]: 'TH',
  [VISEMES.DD]: 'DD',
  [VISEMES.kk]: 'kk',
  [VISEMES.CH]: 'CH',
  [VISEMES.SS]: 'SS',
  [VISEMES.nn]: 'nn',
  [VISEMES.RR]: 'RR',
  [VISEMES.aa]: 'aa',
  [VISEMES.E]: 'E',
  [VISEMES.I]: 'ih', // wawa's I → standard Oculus ih
  [VISEMES.O]: 'oh', // wawa's O → standard Oculus oh
  [VISEMES.U]: 'ou', // wawa's U → standard Oculus ou
}
