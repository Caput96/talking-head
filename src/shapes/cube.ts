import { sampleGrid } from '../core/grid'
import { GRID_COLS, GRID_ROWS } from './gridConfig'
import { shapeRegistry } from './ShapeRegistry'
import { superellipsoid } from './surfaces'

shapeRegistry.register({
  id: 'cube',
  label: 'Cube',
  create: () => sampleGrid(GRID_ROWS, GRID_COLS, superellipsoid(12)),
})
