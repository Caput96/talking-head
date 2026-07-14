import type { MorphSource } from '../core/MorphSource'

/**
 * CompositeMorphSource — runs several MorphSources, in order, on the same
 * positions buffer. MorphEngine only ever holds one source (see
 * core/MorphEngine.ts), so running several buffer-writing behaviors
 * *simultaneously* means wrapping them behind one source that delegates to
 * each, in sequence, per frame. Order matters — a later source can react to /
 * build on an earlier one's writes to the same buffer. (Originally added so
 * amplitude-driven lip-sync could run after shape morphing each tick; that
 * source was later removed in favor of the viseme-driven morph-weight path,
 * see ADR-001's updated addendum, but the composite stays for the next
 * source expected to join — a future AgentStateSource.)
 */
export class CompositeMorphSource implements MorphSource {
  private readonly sources: readonly MorphSource[]

  constructor(sources: readonly MorphSource[]) {
    this.sources = sources
  }

  update(dt: number, positions: Float32Array): void {
    for (const source of this.sources) source.update(dt, positions)
  }
}
