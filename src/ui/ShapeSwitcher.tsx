import { shapeRegistry } from '../shapes'
import { useShapeStore } from '../store/shapeStore'
import './ShapeSwitcher.css'

/**
 * ShapeSwitcher — plain DOM UI (not R3F/three), rendered *outside* <Canvas>
 * in App.tsx: regular 2D buttons that pick the current shape, sitting on top
 * of the 3D canvas. One button per registered ShapeFactory — adding a new
 * shape to the registry makes it show up here automatically, no changes needed.
 */
export function ShapeSwitcher() {
  const currentShapeId = useShapeStore((state) => state.currentShapeId)
  const setShape = useShapeStore((state) => state.setShape)

  return (
    <div className="shape-switcher">
      {shapeRegistry.list().map((factory) => (
        <button
          key={factory.id}
          type="button"
          aria-pressed={factory.id === currentShapeId}
          onClick={() => setShape(factory.id)}
        >
          {factory.label}
        </button>
      ))}
    </div>
  )
}
