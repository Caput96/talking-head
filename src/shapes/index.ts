// Side-effect imports: each shape file registers itself with shapeRegistry on
// import. Importing this barrel anywhere guarantees all shapes are registered
// before shapeRegistry.get()/list() is called.
import './sphere'
import './cube'
import './torus'

export { shapeRegistry } from './ShapeRegistry'
export type { ShapeFactory } from './ShapeFactory'
