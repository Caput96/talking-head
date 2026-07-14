import { BufferGeometry, IcosahedronGeometry } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// A moderate subdivision: enough vertices to read as a head, low-poly enough
// to match the project's retro aesthetic (~162 vertices).
const DETAIL = 3

export interface HeadBuild {
  geometry: BufferGeometry
}

/**
 * buildHeadGeometry — the Phase 3 placeholder head: a base indexed sphere
 * (same IcosahedronGeometry + mergeVertices technique Phase 1 used, needed
 * again here for a real independently-topologized mesh) with per-vertex
 * displacement for a jaw taper, eye socket dents, a nose bump, and a
 * flattened skull back.
 */
export function buildHeadGeometry(): HeadBuild {
  const base = new IcosahedronGeometry(1, DETAIL)
  base.deleteAttribute('normal')
  base.deleteAttribute('uv')
  const geometry = mergeVertices(base)

  const position = geometry.getAttribute('position')

  for (let i = 0; i < position.count; i++) {
    const [x, y, z] = deform(position.getX(i), position.getY(i), position.getZ(i))
    position.setXYZ(i, x, y, z)
  }
  position.needsUpdate = true

  return { geometry }
}

function deform(x: number, y: number, z: number): [number, number, number] {
  // Slightly taller than wide.
  const ny = y * 1.15

  // Jaw taper: narrow the lower half toward a chin (kept mild — the base
  // icosphere's own pole already comes to a point at the very bottom).
  const jawFactor = ny < 0 ? 1 + ny * 0.25 : 1
  let nx = x * jawFactor
  let nz = z * jawFactor

  // Nose bump: push the front-center outward. Exaggerated on purpose — subtle
  // detail doesn't read at this low a poly count.
  const noseDist = Math.hypot(nx, ny - -0.05)
  if (nz > 0.4 && noseDist < 0.22) {
    nz += ((0.22 - noseDist) / 0.22) * 0.35
  }

  // Eye socket dents: two symmetric regions, upper-front. Also exaggerated.
  for (const side of [-1, 1]) {
    const eyeDist = Math.hypot(nx - side * 0.42, ny - 0.2)
    if (nz > 0.3 && eyeDist < 0.28) {
      nz -= ((0.28 - eyeDist) / 0.28) * 0.3
    }
  }

  // Flatten the back of the skull slightly.
  if (nz < -0.5) nz *= 0.8

  return [nx, ny, nz]
}
