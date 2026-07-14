import type { MorphSource } from './MorphSource'

/**
 * MorphEngine — owns the single positions buffer (ADR-001 §1).
 *
 * This is plain TypeScript with no React or three.js dependency: it just owns
 * a Float32Array and delegates each tick to whichever MorphSource is current.
 * Both the point cloud and the wireframe read this same array (via
 * useMorphEngine), so they can never desync — there is only one buffer to
 * update, not two copies to keep in sync.
 */
export class MorphEngine {
  readonly positions: Float32Array
  readonly vertexCount: number
  private source: MorphSource

  constructor(vertexCount: number, initialSource: MorphSource) {
    this.vertexCount = vertexCount
    this.positions = new Float32Array(vertexCount * 3)
    this.source = initialSource
  }

  setSource(source: MorphSource): void {
    this.source = source
  }

  tick(dt: number): void {
    this.source.update(dt, this.positions)
  }
}
