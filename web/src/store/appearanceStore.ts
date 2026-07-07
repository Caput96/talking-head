import { create } from 'zustand'

/**
 * appearanceStore — view preferences that apply across BOTH render paths
 * (the grid-shape buffer path in scene/Scene.tsx and the GLB head in
 * head/HeadGLB.tsx): whether the point cloud renders at all, whether the
 * shape's triangles render as a real filled surface, the shared base color
 * (the wireframe/fill derive their color from this one via core/color.ts's
 * darken(), rather than separate pickers), and a user-controlled transparency.
 *
 * This used to be a couple of fields tacked onto store/shapeStore.ts
 * (showOcclusion), which called out its own growth point in a comment —
 * this store is that split, so shapeStore.ts stays pure shape-selection.
 * showOcclusion was renamed to showFill when the toggle stopped being an
 * invisible depth-only trick and started rendering a real visible surface
 * (see Scene.tsx/HeadGLB.tsx) — occlusion is now just a side effect of that
 * surface being real, not the point of the field.
 */
interface AppearanceState {
  showVertices: boolean
  toggleVertices: () => void
  showFill: boolean
  toggleFill: () => void
  color: string
  setColor: (color: string) => void
  opacity: number
  setOpacity: (opacity: number) => void
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  showVertices: true,
  toggleVertices: () => set((state) => ({ showVertices: !state.showVertices })),
  showFill: true,
  toggleFill: () => set((state) => ({ showFill: !state.showFill })),
  color: '#7dd3fc',
  setColor: (color) => set({ color }),
  opacity: 1,
  setOpacity: (opacity) => set({ opacity }),
}))
