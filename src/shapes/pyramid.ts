import { sampleGrid } from '../core/grid'
import { GRID_COLS, GRID_ROWS } from './gridConfig'
import { shapeRegistry } from './ShapeRegistry'
import { pyramid as pyramidSurface } from './surfaces'

shapeRegistry.register({
  id: 'pyramid',
  label: 'Pyramid',
  create: () => sampleGrid(GRID_ROWS, GRID_COLS, pyramidSurface(1, 2)),
})
