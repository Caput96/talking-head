import { useAppearanceStore } from '../store/appearanceStore'
import './FillToggle.css'

/**
 * FillToggle — plain DOM UI (not R3F/three), rendered *outside* <Canvas>
 * in App.tsx, like ShapeSwitcher. Switches whether the shape's triangles
 * render as a real filled surface (see scene/Scene.tsx, head/HeadGLB.tsx):
 * on shows a flat-colored solid, off shows just points/wireframe ("x-ray"
 * style, today's original look). Occlusion of far-side points/edges is a
 * side effect of the fill being a real, opaque-ish surface now — not a
 * separate invisible depth-only trick like the old OcclusionToggle used.
 */
export function FillToggle() {
  const showFill = useAppearanceStore((state) => state.showFill)
  const toggleFill = useAppearanceStore((state) => state.toggleFill)

  return (
    <button
      type="button"
      className="fill-toggle"
      aria-pressed={showFill}
      onClick={toggleFill}
    >
      {showFill ? 'Solid' : 'Wireframe'}
    </button>
  )
}
