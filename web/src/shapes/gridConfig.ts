/**
 * Grid resolution shared by every shape factory. This MUST be identical
 * across shapes: ShapeMorphSource morphs between shapes by lerping their
 * position arrays index-for-index, which only makes sense if every shape's
 * Formation has the same vertex count (see core/grid.ts).
 */
export const GRID_ROWS = 10
export const GRID_COLS = 16
