import type { Formation } from '../core/grid'

/**
 * ShapeFactory — ADR-001 §3: each shape is produced by a factory registered
 * in a central registry, so adding a shape never touches the registry or the
 * render core (open/closed). `create()` takes no parameters for now; a future
 * "didactic 3D plot" shape (CLAUDE.md's future direction) could extend this
 * with time/parameter inputs without breaking existing factories.
 */
export interface ShapeFactory {
  id: string
  label: string
  create(): Formation
}
