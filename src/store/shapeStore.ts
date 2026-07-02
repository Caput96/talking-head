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
 */
interface ShapeState {
  currentShapeId: string
  setShape: (id: string) => void
}

export const useShapeStore = create<ShapeState>((set) => ({
  currentShapeId: SPHERE_ID,
  setShape: (id) => set({ currentShapeId: id }),
}))
