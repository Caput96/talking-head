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
 * A square pyramid: the same signedPow "squaring" trick as superellipsoid
 * gives a square cross-section, but the radius tapers *linearly* from 0 at
 * the apex (v=0) to halfBase at the base (v=1) instead of following sin(phi)
 * (which bulges symmetrically and points at both ends, like superellipsoid).
 * Left open at the base — no bottom cap — the same simplification the torus
 * relies on for its tube, and consistent with this project's retro wireframe
 * look. `u` still wraps a full, unbroken turn, so this fits the shared grid
 * without any topology changes.
 */
export function pyramid(halfBase: number, height: number): SurfaceFn {
  const cornerPower = 2 / 12 // same "squareness" as the cube — see superellipsoid

  return (u, v) => {
    const theta = u * Math.PI * 2
    const radius = v * halfBase // 0 at the apex, halfBase at the base
    const x = radius * signedPow(Math.cos(theta), cornerPower)
    const y = radius * signedPow(Math.sin(theta), cornerPower)
    const z = height * (0.5 - v) // apex at +height/2, base at -height/2
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
