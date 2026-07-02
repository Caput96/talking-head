import { sampleGrid } from '../core/grid'
import { GRID_COLS, GRID_ROWS } from './gridConfig'
import { shapeRegistry } from './ShapeRegistry'
import { torusSurface } from './surfaces'

shapeRegistry.register({
  id: 'torus',
  label: 'Torus',
  create: () => sampleGrid(GRID_ROWS, GRID_COLS, torusSurface(0.7, 0.3)),
})
