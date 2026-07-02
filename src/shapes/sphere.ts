import { sampleGrid } from '../core/grid'
import { GRID_COLS, GRID_ROWS } from './gridConfig'
import { shapeRegistry } from './ShapeRegistry'
import { superellipsoid } from './surfaces'

export const SPHERE_ID = 'sphere'

shapeRegistry.register({
  id: SPHERE_ID,
  label: 'Sphere',
  create: () => sampleGrid(GRID_ROWS, GRID_COLS, superellipsoid(2)),
})
