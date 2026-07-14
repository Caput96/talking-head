import type { BufferGeometry } from 'three'
import { deriveEdgeIndices } from './mesh-topology'
import type { Formation } from './grid'

/**
 * sampleMesh — turns any indexed three.js triangle mesh into a Formation.
 *
 * Unlike core/grid.ts's sampleGrid (which only works for shapes on the
 * shared parametric grid), this accepts an arbitrary mesh — procedurally
 * built in code today, or loaded from a file later (e.g. GLTFLoader for a
 * head generated from a photo by an external tool). That source doesn't
 * matter here: this function only cares that `geometry` has a position
 * attribute and a triangle index, which is true either way. This is what
 * lets a real, independently-topologized shape (the head) plug into the
 * same Formation contract everything else already uses.
 */
export function sampleMesh(geometry: BufferGeometry): Formation {
  const positionAttr = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!index) throw new Error('sampleMesh requires an indexed geometry')

  return {
    positions: new Float32Array(positionAttr.array),
    edges: deriveEdgeIndices(index.array),
    // The mesh's own triangle index already *is* a valid face list — unlike
    // edges (deduplicated pairs), it needs no processing.
    faces: new Uint32Array(index.array),
  }
}
