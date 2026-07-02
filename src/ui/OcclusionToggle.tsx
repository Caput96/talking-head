import { useShapeStore } from '../store/shapeStore'
import './OcclusionToggle.css'

/**
 * OcclusionToggle — plain DOM UI (not R3F/three), rendered *outside* <Canvas>
 * in App.tsx, like ShapeSwitcher. Switches whether the invisible occluder
 * mesh renders (see core/useMorphEngine.ts, scene/Scene.tsx): on hides
 * far-side points/edges behind the near side of the shape, off shows
 * everything ("x-ray" style, today's original look).
 */
export function OcclusionToggle() {
  const showOcclusion = useShapeStore((state) => state.showOcclusion)
  const toggleOcclusion = useShapeStore((state) => state.toggleOcclusion)

  return (
    <button
      type="button"
      className="occlusion-toggle"
      aria-pressed={showOcclusion}
      onClick={toggleOcclusion}
    >
      {showOcclusion ? 'Solid' : 'Wireframe'}
    </button>
  )
}
