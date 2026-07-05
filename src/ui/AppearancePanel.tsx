import { useAppearanceStore } from '../store/appearanceStore'
import './AppearancePanel.css'

/**
 * AppearancePanel — plain DOM UI (not R3F/three), rendered *outside* <Canvas>
 * in App.tsx, like ShapeSwitcher/OcclusionToggle/VisemePanel. Controls the
 * view preferences in store/appearanceStore.ts that apply to BOTH render
 * paths (Scene.tsx's buffer shapes and HeadGLB.tsx): whether the point cloud
 * renders, the shared base color (the wireframe's color is derived from it,
 * not picked separately), and overall transparency.
 */
export function AppearancePanel() {
  const showVertices = useAppearanceStore((state) => state.showVertices)
  const toggleVertices = useAppearanceStore((state) => state.toggleVertices)
  const color = useAppearanceStore((state) => state.color)
  const setColor = useAppearanceStore((state) => state.setColor)
  const opacity = useAppearanceStore((state) => state.opacity)
  const setOpacity = useAppearanceStore((state) => state.setOpacity)

  return (
    <div className="appearance-panel">
      <button
        type="button"
        className="appearance-panel-vertices-toggle"
        aria-pressed={showVertices}
        onClick={toggleVertices}
      >
        {showVertices ? 'Vertices: On' : 'Vertices: Off'}
      </button>
      <label className="appearance-panel-label">
        Color
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </label>
      <label className="appearance-panel-label">
        Opacity {opacity.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
