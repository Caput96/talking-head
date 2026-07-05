import { useDebugStore } from '../store/debugStore'
import { HEAD_TARGET_NAMES, type HeadTargetName } from '../head/visemeMap'
import './VisemePanel.css'

/**
 * VisemePanel — plain DOM UI (not R3F/three), rendered *outside* <Canvas> in
 * App.tsx like the other panels.
 *
 * This is a DEV HARNESS for Phase 5 / ADR-003 Step 1: it drives one of the GLB
 * head's viseme morph targets by hand, so we can confirm the exported morph
 * targets actually deform the mesh in three.js *before* wiring up any audio
 * lip-sync. Pick a viseme and drag the slider 0 → 1; HeadGLB reads these values
 * each frame and sets morphTargetInfluences.
 *
 * It only does anything visible when the head shape is selected (that's the
 * only thing HeadGLB renders).
 */
export function VisemePanel() {
  const debugViseme = useDebugStore((state) => state.debugViseme)
  const debugWeight = useDebugStore((state) => state.debugWeight)
  const setDebugViseme = useDebugStore((state) => state.setDebugViseme)
  const setDebugWeight = useDebugStore((state) => state.setDebugWeight)

  return (
    <div className="viseme-panel">
      <label className="viseme-panel-label">
        Viseme
        <select
          value={debugViseme}
          onChange={(e) => setDebugViseme(e.target.value as HeadTargetName)}
        >
          {HEAD_TARGET_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="viseme-panel-label">
        Weight {debugWeight.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={debugWeight}
          onChange={(e) => setDebugWeight(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
