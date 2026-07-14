import { sampleGrid } from '../core/grid'
import { GRID_COLS, GRID_ROWS } from './gridConfig'
import { shapeRegistry } from './ShapeRegistry'
import { lightbulbSurface } from './surfaces'

shapeRegistry.register({
  id: 'lightbulb',
  label: 'Lightbulb',
  create: () => sampleGrid(GRID_ROWS, GRID_COLS, lightbulbSurface()),
})
