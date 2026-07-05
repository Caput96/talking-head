import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { ShapeSwitcher } from './ui/ShapeSwitcher'
import { OcclusionToggle } from './ui/OcclusionToggle'
import { TTSPanel } from './ui/TTSPanel'
import { VisemePanel } from './ui/VisemePanel'
import { AppearancePanel } from './ui/AppearancePanel'
import './App.css'

/**
 * App — the root React component.
 *
 * <Canvas> (from R3F) is the bridge between React and three.js: it creates the
 * WebGL renderer, a default camera and a render loop, then mounts everything we
 * put inside it into a three.js scene graph. Anything 3D goes *inside* <Canvas>;
 * regular DOM/UI (buttons, panels) goes outside it — <ShapeSwitcher>,
 * <OcclusionToggle> and <TTSPanel> are plain HTML, rendered as siblings of
 * <Canvas>, not children.
 */
function App() {
  return (
    <>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Scene />
      </Canvas>
      <ShapeSwitcher />
      <OcclusionToggle />
      <TTSPanel />
      <VisemePanel />
      <AppearancePanel />
    </>
  )
}

export default App
