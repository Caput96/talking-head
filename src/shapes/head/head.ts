import { sampleMesh } from '../../core/mesh-sampling'
import { shapeRegistry } from '../ShapeRegistry'
import { buildHeadGeometry } from './buildHeadGeometry'

export const HEAD_ID = 'head'

shapeRegistry.register({
  id: HEAD_ID,
  label: 'Head',
  create: () => {
    const { geometry, mouthGroup } = buildHeadGeometry()
    return sampleMesh(geometry, mouthGroup)
  },
})
