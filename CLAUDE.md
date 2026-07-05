# CLAUDE.md — 3d.head

Project memory for Claude Code. Read this before every session.

## What this project is

Software that renders a **simplified / retro human head** as a mix of
**point cloud + wireframe**, which **talks and follows lip movement** (lip-sync)
using a local TTS engine. The interface must be able to create **other 3D
shapes** (sphere, cube, torus, etc.) for future features.

Inspiration: 
- https://particles.casberry.in/ (WebGL particle simulator).
- https://github.com/CasberryIndia/Physics-Notebook

Secondary goal: this repo also serves as a **showcase** of how to run serious
development with Claude Code (design patterns, ADRs, GitHub, and
skills/hooks/subagents used only when genuinely needed). NOTE: keep this
"showcase" framing out of the ADRs and out of public-facing engineering docs —
it belongs in the README / demo narrative, not in decision records.

### Future direction (do NOT build yet — keep the design open to it)

- The head becomes a **3D assistant**: it moves, reacts to events, and shows
  what it is doing (e.g. "using a tool", "thinking" rendered as activity inside
  the point cloud). This will be a behavior/state layer ON TOP of the render
  (a future `AgentStateSource` that maps agent events → poses/motion). Do not
  implement now; just keep the render and source layers decoupled enough to add
  it later without rewrites.
- **Didactic 3D plots**: pendulums, mathematical functions/surfaces, etc.
  These are just shapes whose vertex positions depend on time and parameters —
  i.e. parametric, animated formations. They fit the existing
  ShapeRegistry + MorphSource model. Keep shapes allowed to be time/parameter
  driven, not only static.

## User profile — READ CAREFULLY

The user is a capable AI engineer (agentic systems, design patterns, Python,
MCP) but is **NOT a frontend expert**: React, React Three Fiber (R3F),
WebGL/GLSL and Zustand are new territory. They use Claude Code partly to learn,
not only to ship. The user develops in English but may ask for explanations in
Italian.

Therefore, in EVERY response:
- **Explain frontend choices clearly and didactically**, like to a junior
  colleague: what it does and *why*, not just *how*.
- For every new file or non-obvious R3F/WebGL concept, add 2-3 lines of comments
  in the code explaining purpose and role.
- **Plan mode before code**: propose interface + pattern + verifiable steps,
  then stop and wait for approval. Do not implement a whole feature without an ok.
- **Small steps**: prefer several understandable atomic commits over one large
  block. If a task is big, split it and show the first piece.
- If the user asks "explain file X line by line", do it without changing anything.

## Stack

- React + TypeScript (strict) + Vite
- React Three Fiber (R3F) + Drei for 3D
- Zustand for state
- Package manager: pnpm
- Local in-browser TTS (Kokoro via transformers.js or Piper WASM) — see ADR-002
- **Single Vite project, NOT a monorepo.** Introduce a monorepo only if/when a
  server (FastAPI) is added, and document it with a dedicated ADR.

## Architecture (see docs/adr/ADR-001)

Decoupled layers:
- `MorphEngine` updates ONE positions buffer; both points and wireframe consume
  it (no geometry duplication).
- `MorphSource` (strategy interface): interchangeable animation sources —
  `LipSyncSource`, `IdleBreathingSource`, `ShapeMorphSource`.
- `ShapeRegistry` (factory/registry): adding a shape = registering a factory,
  without touching the core (open/closed). Shapes may be time/parameter driven.
- `TTSProvider` (strategy + adapter): `BrowserTTSProvider` now,
  `RemoteTTSProvider` as a future option, same contract.
- `AudioBus` (observer): audio → RMS/visemes → morph.

## Conventions

- TypeScript strict, no `any` unless justified and commented.
- Names make the pattern explicit (e.g. `ShapeFactory`, `LipSyncSource`).
- Every relevant architectural decision → an ADR in `docs/adr/`.
  ADRs stay sober and engineering-focused; they describe the problem, options,
  decision and trade-offs. They must NOT say things like "done to demonstrate
  pattern X" — the pattern is a consequence, named in passing, never the goal.
- Atomic commits with sensible messages (Conventional Commits: feat/fix/docs/...).
- One branch per phase: `feat/phase-N-name`.

## Commands

```bash
pnpm install
pnpm dev          # start Vite dev server
pnpm build        # production build
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
pnpm test         # tests (vitest)
```

## Phased roadmap

0. Setup: scaffold Vite+R3F, repo, CLAUDE.md, basic CI, ADR-001.
1. Render core: point cloud + wireframe on the same buffer; smooth morph
   between two formations.
2. ShapeRegistry: sphere/cube/torus via factory + UI to switch.
3. Head: low-poly retro mesh, sampled into points+edges, mouth group.
4. Local TTS: lock the `TTSProvider` interface, then integrate the model.
5. Lip-sync: amplitude-driven first, then viseme-driven on the mouth group.
6. Polish: post-processing, performance, documentation.

## When to use Claude Code features (only if NEEDED)

- **Subagents**: isolated, specialized domains → `shader-specialist` (GLSL),
  `tts-integrator` (ONNX/WASM), `architecture-reviewer` (pattern/SOLID adherence
  before merge). They also help *explain* the domain to the user.
- **Skills**: repeatable procedures → `add-new-shape` (factory+registry+test),
  `create-adr` (ADR scaffold), `viseme-map`.
- **Hooks**: deterministic automation → on `.ts/.tsx` edits: prettier +
  eslint --fix + tsc --noEmit; guard: no direct commits to `main`.

Golden rule: introduce a feature only when it solves a concrete problem, and
tell the user why you are introducing it.
