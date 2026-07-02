import { describe, expect, it } from 'vitest'
import { ShapeRegistry } from './ShapeRegistry'
import type { Formation } from '../core/grid'

const emptyFormation: Formation = { positions: new Float32Array(), edges: new Uint32Array() }

describe('ShapeRegistry', () => {
  it('lists registered factories', () => {
    const registry = new ShapeRegistry()
    registry.register({ id: 'a', label: 'A', create: () => emptyFormation })
    registry.register({ id: 'b', label: 'B', create: () => emptyFormation })

    expect(registry.list().map((f) => f.id).sort()).toEqual(['a', 'b'])
  })

  it('gets a registered factory by id', () => {
    const registry = new ShapeRegistry()
    registry.register({ id: 'a', label: 'A', create: () => emptyFormation })

    expect(registry.get('a').label).toBe('A')
  })

  it('throws when getting an unknown id', () => {
    const registry = new ShapeRegistry()

    expect(() => registry.get('missing')).toThrow(/missing/)
  })
})
