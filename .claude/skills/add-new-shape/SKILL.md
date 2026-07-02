---
name: add-new-shape
description: Scaffolds a new shape for the 3d-head ShapeRegistry (src/shapes/) - checks whether it fits the existing shared-grid topology or needs a core extension, reuses existing surface math where possible, registers a ShapeFactory, writes a test, and verifies end-to-end in a real browser. Use when adding a new shape to the registry, e.g. "add a torus shape", "create a pyramid shape", "add a horseshoe shape".
---

Adds a shape factory to `src/shapes/`. Every shape MUST share the exact same
grid topology (`src/core/grid.ts`, `src/shapes/gridConfig.ts`) so
`ShapeMorphSource` can keep morphing between any two shapes with a plain
index-for-index lerp — this skill's main job is protecting that invariant
while adding shapes quickly, not just generating files.

## Input

The shape's id/label and a short description of its geometry — from the
invocation arguments, or ask the user if not given.

## Step 1 — Classify the topology (the safety check)

Read `src/core/grid.ts` and `src/shapes/surfaces.ts` to refresh the model:
every shape samples one (`GRID_ROWS` x `GRID_COLS`, from `gridConfig.ts`)
grid where `u` wraps (0..2π, closes into a loop with no seam) and `v` does
not (pole to pole, two distinct ends).

A shape fits **for free** if it's a complete, closed parametric surface with
no deliberate opening — sphere, cube (superellipsoid), torus, and most
classic primitives qualify.

A shape does **NOT** fit for free if it has an intentional opening or a
non-periodic "around" axis — e.g. a horseshoe/open torus, a spiral, a flat
disc with a boundary edge. If the requested shape is one of these:

- **Stop.** Do not modify `src/core/grid.ts` or `src/core/useMorphEngine.ts`.
- Report to the user what a `wrapU: boolean` option on
  `sampleGrid`/`buildGridEdges` would look like (skip the ring-closing edge
  when `false`), and that `useMorphEngine.ts`'s `retarget()` would also need
  to swap the wireframe's edge index for such shapes — today it's set once
  at mount and assumed eternal, which only holds because every shape so far
  wraps `u` the same way.
- Ask whether to proceed with that core extension before writing any
  shape-specific code. It's an architectural decision, not a routine
  scaffold — don't make it silently.

If the shape fits for free, continue to Step 2.

## Step 2 — Reuse before writing new math

Check `src/shapes/surfaces.ts` for an existing `SurfaceFn` factory that
already covers this shape's geometry (sphere and cube are both
`superellipsoid` at different exponents — a new rounded/faceted shape should
probably reuse it, not duplicate the formula). Only add a new exported
function to `surfaces.ts` if the geometry is genuinely novel.

## Step 3 — Scaffold the factory

Create `src/shapes/<id>.ts`, following `src/shapes/torus.ts` as the template:

```ts
import { sampleGrid } from '../core/grid'
import { GRID_COLS, GRID_ROWS } from './gridConfig'
import { shapeRegistry } from './ShapeRegistry'
import { /* surface fn */ } from './surfaces'

shapeRegistry.register({
  id: '<id>',
  label: '<Label>',
  create: () => sampleGrid(GRID_ROWS, GRID_COLS, /* surface fn call */),
})
```

Always import `GRID_ROWS`/`GRID_COLS` from `./gridConfig` — never hardcode a
different resolution for one shape. A mismatched resolution silently breaks
morphing: `ShapeMorphSource` lerps position arrays index-for-index, which
only makes sense if every shape has the same vertex count.

## Step 4 — Register in the barrel

Add `import './<id>'` to `src/shapes/index.ts`, alongside the existing
sphere/cube/torus imports.

## Step 5 — Test

If Step 2 added new math to `surfaces.ts`, add a focused test (style of
`src/core/grid.test.ts`): sample the new surface function directly and
assert no NaNs and sane coordinate ranges — the same sanity check used
manually for sphere/cube/torus in Phase 2. If Step 2 only reused an existing
surface function with new parameters, a test usually isn't needed.

## Step 6 — Verify end-to-end

1. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all must pass.
2. Start `pnpm dev` in the background; poll with `curl` until it responds
   (don't `sleep` blindly).
3. Drive a real headless browser using the project's own `playwright`
   devDependency — it's already installed with Chromium (the user set this
   up specifically so this doesn't need a scratch install each time, and
   `chromium-cli` is not available in this environment):

   ```js
   const { chromium } = require('/Users/caput/Projects/3d-head/node_modules/playwright')
   ;(async () => {
     const browser = await chromium.launch()
     const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
     const errors = []
     page.on('pageerror', (e) => errors.push(String(e)))

     await page.goto('http://localhost:5173', { waitUntil: 'load' })
     await page.waitForSelector('canvas')
     await page.waitForTimeout(500)
     await page.screenshot({ path: '/path/to/scratchpad/before.png' })

     await page.getByRole('button', { name: '<Label>' }).click()
     await page.waitForTimeout(1500) // MORPH_DURATION_SEC in useMorphEngine.ts, plus margin
     await page.screenshot({ path: '/path/to/scratchpad/after.png' })

     console.log('ERRORS:', JSON.stringify(errors))
     await browser.close()
   })()
   ```
4. Read both screenshots. Confirm the shape reads correctly, the transition
   completed, and there's no degenerate/NaN geometry (a single dot instead
   of a full point cloud is the classic symptom — see the Phase 1 postmortem
   on `Float32BufferAttribute` copying its input array if positions ever
   look frozen/collapsed).
5. Stop the dev server.

## Step 7 — Report

Summarize: which path was taken (free vs. flagged-for-extension), which
files changed, and the verification result (screenshots + green
typecheck/lint/test/build).
