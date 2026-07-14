import type { SurfaceFn } from '../core/grid'

function signedPow(value: number, power: number): number {
  return Math.sign(value) * Math.abs(value) ** power
}

/** Smooth 0→1 ramp between two edges (the classic Hermite smoothstep).
 * Used to blend silhouette segments without a visible kink. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * A superellipsoid: the sphere formula (spherical coordinates), with each
 * component raised to 2/exponent. At exponent 2 this is exactly a sphere;
 * as the exponent grows, corners sharpen and the surface rounds into a cube.
 * One formula, one grid — sphere and cube are just different exponents.
 *
 * The pole axis (`cos(phi)`) is Y, matching the scene's Y-up camera — see
 * `torusSurface`'s and `pyramid`'s doc comments for the shared convention.
 */
export function superellipsoid(exponent: number): SurfaceFn {
  const power = 2 / exponent

  return (u, v) => {
    const theta = u * Math.PI * 2 // longitude, wraps with the grid's u
    const phi = v * Math.PI // colatitude, pole to pole
    const x = signedPow(Math.sin(phi), power) * signedPow(Math.cos(theta), power)
    const z = signedPow(Math.sin(phi), power) * signedPow(Math.sin(theta), power)
    const y = signedPow(Math.cos(phi), power)
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
 *
 * The apex-to-base axis is Y (matching the scene's Y-up camera), so the apex
 * points up and the base sits down — see `torusSurface`'s doc comment for the
 * shared convention every surface here follows.
 */
export function pyramid(halfBase: number, height: number): SurfaceFn {
  const cornerPower = 2 / 12 // same "squareness" as the cube — see superellipsoid

  return (u, v) => {
    const theta = u * Math.PI * 2
    const radius = v * halfBase // 0 at the apex, halfBase at the base
    const x = radius * signedPow(Math.cos(theta), cornerPower)
    const z = radius * signedPow(Math.sin(theta), cornerPower)
    const y = height * (0.5 - v) // apex at +height/2, base at -height/2
    return [x, y, z]
  }
}

/**
 * A lightbulb: a solid of revolution sampled top (v=0) to bottom (v=1). `u`
 * sweeps the circular cross-section (wraps naturally, like every shape here);
 * the profile is a round glass envelope up top that necks in and continues as
 * a narrower cylindrical screw base, closing to a point at the very bottom so
 * the shared grid's end-cap (see core/grid.ts) stays a clean zero-area fan.
 *
 * The axis of revolution is Y, so the dome points up and the base points down
 * to match the scene's Y-up camera — the same convention every surface here
 * follows (see `torusSurface`'s doc comment). Both v-ends collapse to the
 * axis (radius 0), so like the sphere it reads as a fully closed surface with
 * no open ring — it fits the shared grid for free.
 */
export function lightbulbSurface(): SurfaceFn {
  const V_JOIN = 0.58 // v where the glass bulb hands off to the screw base
  const BULB_RADIUS = 0.6
  const BASE_RADIUS = 0.24
  const PHI_MAX = 2.5 // glass sweeps past its equator (π/2 rad) so it necks in
  const BULB_CENTER_Y = 0.4 // lifts the sphere arc so its top pole sits at y≈1

  // Where the glass arc ends — the neck the base has to start from, kept here
  // so the two segments meet with no gap or radius jump.
  const NECK_RADIUS = BULB_RADIUS * Math.sin(PHI_MAX)
  const NECK_HEIGHT = BULB_CENTER_Y + BULB_RADIUS * Math.cos(PHI_MAX)
  const BASE_BOTTOM_Y = -1

  return (u, v) => {
    const theta = u * Math.PI * 2 // longitude, wraps with the grid's u
    let radius: number
    let height: number

    if (v < V_JOIN) {
      // Glass envelope: an arc of a sphere from the top pole, curving back in.
      const phi = (v / V_JOIN) * PHI_MAX
      radius = BULB_RADIUS * Math.sin(phi)
      height = BULB_CENTER_Y + BULB_RADIUS * Math.cos(phi)
    } else {
      // Screw base: ease the neck down to a straight cylinder, then taper to a
      // point near the bottom so the end-cap closes without a visible disc.
      const t = (v - V_JOIN) / (1 - V_JOIN) // 0..1 down the base
      const cylinder = NECK_RADIUS + (BASE_RADIUS - NECK_RADIUS) * smoothstep(0, 0.3, t)
      const tipTaper = 1 - smoothstep(0.88, 1, t) // 1 down the base, →0 at the tip
      radius = cylinder * tipTaper
      height = NECK_HEIGHT + t * (BASE_BOTTOM_Y - NECK_HEIGHT)
    }

    return [radius * Math.cos(theta), height, radius * Math.sin(theta)]
  }
}

/**
 * A torus: `u` sweeps the main ring (wraps naturally, like every shape here).
 * `v` sweeps the tube's cross-section across a full turn, so v=0 and v=1 map
 * to the same 3D point — the tube closes with no seam even though the shared
 * grid itself doesn't wrap `v` (see core/grid.ts).
 *
 * The main ring lies in the XZ plane, so the hole's axis is Y, matching the
 * scene's Y-up camera — the convention every surface in this file follows
 * (the alternative would face the hole at the camera instead of standing it
 * up like a wheel).
 */
export function torusSurface(majorRadius: number, minorRadius: number): SurfaceFn {
  return (u, v) => {
    const theta = u * Math.PI * 2
    const phi = v * Math.PI * 2
    const ringRadius = majorRadius + minorRadius * Math.cos(phi)
    const x = ringRadius * Math.cos(theta)
    const z = ringRadius * Math.sin(theta)
    const y = minorRadius * Math.sin(phi)
    return [x, y, z]
  }
}
