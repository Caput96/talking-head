import type { SurfaceFn } from '../core/grid'

function signedPow(value: number, power: number): number {
  return Math.sign(value) * Math.abs(value) ** power
}

/**
 * A superellipsoid: the sphere formula (spherical coordinates), with each
 * component raised to 2/exponent. At exponent 2 this is exactly a sphere;
 * as the exponent grows, corners sharpen and the surface rounds into a cube.
 * One formula, one grid — sphere and cube are just different exponents.
 */
export function superellipsoid(exponent: number): SurfaceFn {
  const power = 2 / exponent

  return (u, v) => {
    const theta = u * Math.PI * 2 // longitude, wraps with the grid's u
    const phi = v * Math.PI // colatitude, pole to pole
    const x = signedPow(Math.sin(phi), power) * signedPow(Math.cos(theta), power)
    const y = signedPow(Math.sin(phi), power) * signedPow(Math.sin(theta), power)
    const z = signedPow(Math.cos(phi), power)
    return [x, y, z]
  }
}

/**
 * A torus: `u` sweeps the main ring (wraps naturally, like every shape here).
 * `v` sweeps the tube's cross-section across a full turn, so v=0 and v=1 map
 * to the same 3D point — the tube closes with no seam even though the shared
 * grid itself doesn't wrap `v` (see core/grid.ts).
 */
export function torusSurface(majorRadius: number, minorRadius: number): SurfaceFn {
  return (u, v) => {
    const theta = u * Math.PI * 2
    const phi = v * Math.PI * 2
    const ringRadius = majorRadius + minorRadius * Math.cos(phi)
    const x = ringRadius * Math.cos(theta)
    const y = ringRadius * Math.sin(theta)
    const z = minorRadius * Math.sin(phi)
    return [x, y, z]
  }
}
