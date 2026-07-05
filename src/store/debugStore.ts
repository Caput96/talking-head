import { create } from 'zustand'
import type { HeadTargetName } from '../head/visemeMap'

/**
 * debugStore — a tiny dev-only store for manually driving the GLB head's
 * morph targets (Phase 5 / ADR-003, Step 1).
 *
 * This exists to *verify* that the exported morph targets actually deform the
 * mesh in three.js, before any audio/lip-sync code exists: VisemePanel writes
 * a chosen viseme + weight here, and HeadGLB reads it each frame.
 *
 * Routing a value through Zustand is normally the wrong choice for something a
 * render loop reads every frame (see ADR-001's §5 addendum — AudioBus/
 * MorphEngine deliberately stay out of the store). It's fine *here* because
 * this value is user-driven: it changes only when someone drags the slider, so
 * the occasional React re-render on the panel side costs nothing, and HeadGLB
 * reads it imperatively via getState() (no per-frame subscription).
 */
interface DebugState {
  /** Which morph target the slider drives. */
  debugViseme: HeadTargetName
  /** 0..1 influence applied to that target. */
  debugWeight: number
  setDebugViseme: (v: HeadTargetName) => void
  setDebugWeight: (w: number) => void
}

export const useDebugStore = create<DebugState>((set) => ({
  debugViseme: 'aa',
  debugWeight: 0,
  setDebugViseme: (debugViseme) => set({ debugViseme }),
  setDebugWeight: (debugWeight) => set({ debugWeight }),
}))
