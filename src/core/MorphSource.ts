/**
 * MorphSource — the strategy interface from ADR-001 §2.
 *
 * Any animation behaviour (idle breathing, lip-sync, morphing between two
 * shapes, ...) implements this and can be swapped into MorphEngine without
 * touching the engine or the renderer. `positions` is mutated in place each
 * frame — no allocation, so this stays cheap even at 60fps.
 */
export interface MorphSource {
  update(dt: number, positions: Float32Array): void
}
