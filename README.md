# 3d.head

A **simplified / retro human head** rendered as a mix of **point cloud +
wireframe** that **talks and follows lip movement** (lip-sync) using a local,
in-browser TTS engine. The interface can also generate other 3D shapes
(sphere, cube, torus, …) and, later, time/parameter-driven formations.

This repo doubles as a **showcase of serious development with Claude Code** —
design patterns, ADRs, and Claude Code skills/hooks/subagents used only where
they earn their place.

## Stack

- **React + TypeScript (strict)** on **Vite**
- **React Three Fiber (R3F)** + **Drei** for declarative three.js
- **Zustand** for state
- **pnpm** as package manager
- Local in-browser TTS (planned — see `docs/adr/ADR-002`)

## Architecture

Decoupled layers (a single shared positions buffer feeding both points and
wireframe; swappable animation sources; a shape registry; TTS behind a stable
contract). See [`docs/adr/ADR-001`](docs/adr/ADR-001-decoupled-layers.md).

## Commands

```bash
pnpm install      # install dependencies
pnpm dev          # start the Vite dev server (http://localhost:5173)
pnpm build        # production build (tsc -b + vite build)
pnpm preview      # preview the production build
pnpm lint         # oxlint
pnpm typecheck    # tsc -b --noEmit (strict)
```

## Status

**Phase 0 — setup:** Vite + React + TS (strict) + R3F/Drei scaffold, a minimal
smoke scene (a rotating cube with orbit controls), and CI (lint + typecheck).
See the phased roadmap in `CLAUDE.md`.
