# ADR-001 — Decoupled layer architecture

- **Status:** Accepted

## Context

We are building a system that renders a retro head (points + wireframe) able to
talk with lip-sync, and that must later support **other 3D shapes**, switchable
**animation sources**, and a different **TTS engine** without rewrites. Planned
future uses include time/parameter-driven formations (e.g. pendulums,
mathematical surfaces) and a behavior layer where the head acts as a 3D
assistant reacting to events.

The main risk is coupling animation logic to the specific "head" shape and to
the TTS engine chosen today, which would make every future change expensive.
The codebase should also stay readable, since it is maintained by someone newer
to frontend work.

## Decision

A **decoupled layer architecture** with explicit boundaries.

### 1. One shared positions buffer
The `MorphEngine` owns and updates a **single array of vertex positions**. Both
the **point** system and the **wireframe** (`LineSegments`) read that same
buffer, so they cannot desync and geometry is not duplicated.

### 2. Interchangeable animation sources
Animation sources implement a common interface and are swappable:
```
interface MorphSource {
  update(dt: number, positions: Float32Array): void;
}
```
Implementations: `IdleBreathingSource`, `ShapeMorphSource` (transition between
formations), `LipSyncSource` (moves only the mouth group). This is a strategy
boundary: behaviors can be added or swapped without modifying the engine. A
future `AgentStateSource` (assistant motion driven by agent events) fits here
too, without engine changes.

### 3. Shape registry
Each shape is produced by a factory registered in a central registry. Adding a
shape means registering a new factory **without touching the core**
(open/closed). The `head` shape additionally carries **edge indices** (for the
wireframe) and a **mouth group** (vertex indices of the mouth). Other shapes do
not define a mouth group, so `LipSyncSource` is a no-op on them. Shapes may be
**time- and parameter-driven** (not only static), which is what lets the same
mechanism later render animated didactic plots such as a pendulum or a function
surface.

### 4. TTS behind a stable contract
```
interface TTSProvider {
  synthesize(text: string, opts?: TTSOptions): Promise<TTSResult>;
}
// TTSResult = { audio: AudioBuffer; timings: PhonemeTiming[] }
```
Now: `BrowserTTSProvider` (in-browser, WASM/ONNX). Later: `RemoteTTSProvider`
(an adapter over an HTTP response from a FastAPI server), **same contract**. A
factory selects the implementation from config. The concrete model choice is
deferred to ADR-002.

### 5. Audio events as an observable
TTS audio is analyzed (RMS and/or visemes) and published to a bus that
`LipSyncSource` subscribes to. The Zustand store already acts as an observable,
so we do not add a separate event system.

## Runtime flow

```
text → TTSProvider → { audio, timings }
     → AudioBus (RMS / visemes)
     → LipSyncSource → MorphEngine (updates buffer)
     → render: Points + LineSegments (same buffer)
```

## Consequences

**Positive**
- Adding shapes, animation sources, or TTS engines requires no core changes.
- Points and wireframe stay in sync (single buffer).
- The future assistant behavior layer and didactic plots slot into existing
  boundaries instead of forcing a redesign.

**Negative / costs**
- More interfaces and indirection than a single-component approach: a small
  upfront conceptual cost, accepted and documented.
- Requires discipline not to bypass the boundaries for short-term speed.

## Alternatives considered

- **Single monolithic R3F component:** faster to start, but makes future
  shapes/TTS very costly to add.
- **Separate meshes for points and wireframe:** risks desync and doubles
  memory/update cost.
