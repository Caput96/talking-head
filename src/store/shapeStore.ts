import { create } from 'zustand'
import { SPHERE_ID } from '../shapes/sphere'
import '../shapes' // side-effect: register every shape before anyone reads the registry

/**
 * shapeStore — the project's first Zustand store (ADR-001 §5 treats a
 * Zustand store as an observable). Holds which shape is currently selected;
 * Scene.tsx subscribes to it and retargets the morph engine when it changes.
 * The store only holds the *id* — turning that into a Formation is the
 * registry's job (see shapes/ShapeRegistry.ts), keeping this store free of
 * three.js/geometry concerns.
 *
 * Also holds showOcclusion, a view preference (not shape selection) —
 * technically a slightly different concern living in the same small store.
 * Fine at this size; split it out if it keeps growing.
 */
interface ShapeState {
  currentShapeId: string
  setShape: (id: string) => void
  showOcclusion: boolean
  toggleOcclusion: () => void
}

export const useShapeStore = create<ShapeState>((set) => ({
  currentShapeId: SPHERE_ID,
  setShape: (id) => set({ currentShapeId: id }),
  showOcclusion: true,
  toggleOcclusion: () => set((state) => ({ showOcclusion: !state.showOcclusion })),
}))
