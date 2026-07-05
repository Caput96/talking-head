import { create } from 'zustand'

/**
 * appearanceStore — view preferences that apply across BOTH render paths
 * (the grid-shape buffer path in scene/Scene.tsx and the GLB head in
 * head/HeadGLB.tsx): whether the point cloud renders at all, the shared base
 * color (the wireframe derives its color from this one via core/color.ts's
 * darken(), rather than a second picker), and a user-controlled transparency.
 *
 * This used to be a couple of fields tacked onto store/shapeStore.ts
 * (showOcclusion), which called out its own growth point in a comment —
 * this store is that split, so shapeStore.ts stays pure shape-selection.
 */
interface AppearanceState {
  showVertices: boolean
  toggleVertices: () => void
  showOcclusion: boolean
  toggleOcclusion: () => void
  color: string
  setColor: (color: string) => void
  opacity: number
  setOpacity: (opacity: number) => void
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  showVertices: true,
  toggleVertices: () => set((state) => ({ showVertices: !state.showVertices })),
  showOcclusion: true,
  toggleOcclusion: () => set((state) => ({ showOcclusion: !state.showOcclusion })),
  color: '#7dd3fc',
  setColor: (color) => set({ color }),
  opacity: 1,
  setOpacity: (opacity) => set({ opacity }),
}))
