import type { ShapeFactory } from './ShapeFactory'

/**
 * ShapeRegistry — a simple id -> factory map. Shape files (sphere.ts, cube.ts,
 * ...) register themselves on import; nothing here needs to change to add a
 * shape.
 */
export class ShapeRegistry {
  private readonly factories = new Map<string, ShapeFactory>()

  register(factory: ShapeFactory): void {
    this.factories.set(factory.id, factory)
  }

  get(id: string): ShapeFactory {
    const factory = this.factories.get(id)
    if (!factory) throw new Error(`Unknown shape id: "${id}"`)
    return factory
  }

  list(): ShapeFactory[] {
    return Array.from(this.factories.values())
  }
}

export const shapeRegistry = new ShapeRegistry()
