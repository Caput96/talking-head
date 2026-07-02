import type { MorphSource } from '../core/MorphSource'

/**
 * CompositeMorphSource — runs several MorphSources, in order, on the same
 * positions buffer. This is how lip-sync coexists with shape morphing:
 * MorphEngine only ever holds one source (see core/MorphEngine.ts), so
 * running "morph the shape" and "animate the mouth" *simultaneously* means
 * wrapping both behind one source that delegates to both, in sequence, each
 * frame. Order matters — a later source can react to / build on an earlier
 * one's writes to the same buffer (see sources/LipSyncSource.ts, which
 * expects to run after whatever wrote the mouth vertices' rest positions).
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
