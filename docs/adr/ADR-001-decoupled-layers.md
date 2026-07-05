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

**Addendum (Phase 5):** `MorphEngine` only ever holds one source, but shape
morphing and lip-sync need to run *at the same time* — talking shouldn't
freeze whatever shape animation is in progress, and vice versa. Rather than
grow `MorphEngine` to hold a list, `CompositeMorphSource` implements
`MorphSource` itself and runs an ordered list of sources on the same buffer
each tick (`src/sources/CompositeMorphSource.ts`). Order is the whole
mechanism: `ShapeMorphSource` runs first and writes full-body rest positions;
`LipSyncSource` runs after and nudges only the mouth-group vertices on top of
that frame's rest positions. `MorphEngine` itself needed no change — a
composite is just another `MorphSource` to it, so the strategy boundary above
holds exactly as designed.

**Addendum (Phase 5, viseme step):** `LipSyncSource` was later removed.
ADR-003's viseme-driven path (`head/HeadGLB.tsx` writing
`mesh.morphTargetInfluences`, driven by `head/headMorphController.ts`) fully
took over mouth animation for the GLB head, and it doesn't run through
`MorphEngine`/the positions buffer at all — see ADR-003. That left
`LipSyncSource` with no formation it could still visibly affect, so it was
deleted rather than kept as a dead alternative. `CompositeMorphSource` stays,
now wrapping a single `ShapeMorphSource`, since this ADR already names the
next source expected to join it (a future `AgentStateSource`, see CLAUDE.md's
roadmap).

### 3. Shape registry
Each shape is produced by a factory registered in a central registry. Adding a
shape means registering a new factory **without touching the core**
(open/closed). Shapes may be **time- and parameter-driven** (not only
static), which is what lets the same mechanism later render animated didactic
plots such as a pendulum or a function surface.

**Addendum (Phase 5, viseme step):** the `head` shape's Formation used to
additionally carry a **mouth group** (vertex indices of the mouth) for
`LipSyncSource` to read. Removed alongside `LipSyncSource` itself (see the §2
addendum above) — the GLB head's mouth is now driven entirely by named morph
targets (ADR-003), which don't need a vertex-index group at all.

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

**Addendum (Phase 5):** in practice, `AudioBus` (`src/core/AudioBus.ts`) is a
plain class wrapping a Web Audio `AnalyserNode`, polled directly inside
`LipSyncSource.update()` — not Zustand-backed as originally sketched above.
The reasoning that motivated "reuse the store instead of a new event system"
still holds (no separate pub/sub layer was added), but RMS changes every
animation frame, and nothing in React needs to re-render when it does; piping
a 60fps value through `set()` just to read it back in `useFrame` would be the
same anti-pattern `MorphEngine.positions` already avoids by being a raw
`Float32Array` outside React state, not a store field. `AudioBus` follows
that same precedent instead.

**Addendum (Phase 5, viseme step):** `AudioBus` and `LipSyncSource` were both
removed. Amplitude (RMS) analysis and viseme analysis were never actually two
different *kinds* of signal — wawa-lipsync's viseme detection (ADR-003) is
itself real-time audio-feature analysis (frequency bands, volume, spectral
centroid), just a richer classification of the same live audio than a single
RMS scalar. Once the viseme path existed and fully drove the GLB head's
mouth, keeping the RMS path around as a "fallback" would have meant building
a new, strictly cruder adapter from scratch (the old one targeted vertex
positions on a mesh that no longer renders), for no real comparison value —
so it was deleted instead. `getAudioContext()` (`tts/audioContext.ts`) is
unaffected; only the analyser tap and the source that polled it are gone.

## Runtime flow

```
text → TTSProvider → { audio, timings }
     → render: Points + LineSegments (MorphEngine's shared buffer)
```

Lip-sync no longer appears in this diagram: it moved entirely to ADR-003's
viseme-driven morph-weight path (`mesh.morphTargetInfluences`, not this
buffer), once `AudioBus`/`LipSyncSource` were removed — see ADR-003's own
runtime flow for the current audio → mouth pipeline.

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
