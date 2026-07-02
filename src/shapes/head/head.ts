import { sampleMesh } from '../../core/mesh-sampling'
import { shapeRegistry } from '../ShapeRegistry'
import { buildHeadGeometry } from './buildHeadGeometry'

shapeRegistry.register({
  id: 'head',
  label: 'Head',
  create: () => {
    const { geometry, mouthGroup } = buildHeadGeometry()
    return sampleMesh(geometry, mouthGroup)
  },
})
