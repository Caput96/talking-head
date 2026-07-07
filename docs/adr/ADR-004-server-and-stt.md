# ADR-004 — Local server: TTS + STT behind provider seams, MLX-first

- **Status:** Accepted

## Context

Three prior decisions set the stage this ADR changes:

- **ADR-001 §4** defined `TTSProvider` as an engine-agnostic contract and
  named a future `RemoteTTSProvider` (later `ServerTTSProvider`, ADR-002) as
  an HTTP adapter behind the same seam. No STT seam exists yet — the app can
  speak, it cannot listen.
- **ADR-002** picked Kokoro-in-browser for the first talking-head demo and
  explicitly deferred a **local-server** path (`ServerTTSProvider` over
  MLX-Audio serving Kokoro or Qwen3-TTS). It also stated, as a standing
  constraint, that the repo stays a **single Vite project, not a monorepo**,
  until a server is actually introduced — at which point that transition
  "gets its *own* dedicated ADR." This is that ADR.
- **ADR-003** moved mouth animation to audio-derived visemes (wawa-lipsync),
  making the TTS engine's lack of phoneme timing moot. That property is worth
  preserving: whatever engine a server backend runs, viseme extraction stays
  on the audio at playback, so the server contract does **not** need to carry
  timing data.

Two things now push past the browser-only boundary at once:

1. **Multilingual TTS.** Kokoro is English-only. Italian (and beyond) needs a
   different engine, and the higher-quality multilingual options (Qwen3-TTS)
   are impractical to ship and run as a browser bundle — they want a server.
2. **Speech-to-text, for conversation.** The intended direction is a
   two-way spoken exchange (speak *and* listen), not just playback. STT is a
   new capability with no existing seam, and the mature local options
   (Whisper family) run server-side.

Both pressures point at the same move — a **local server process** on the
user's own machine — so they are decided together here rather than in two
half-decisions that would each trip the same monorepo trigger.

### Why a seam per capability, not per engine

The temptation is to reach straight for MLX (Apple Silicon-native, coherent
with ADR-002's stated future). MLX is indeed the first backend this ADR
implements. But **portability is a property of the seam, not a fork of the
app**: "MLX version" and "portable version" should be two implementations
behind one stable contract, selected by config — exactly as
`BrowserTTSProvider` and `ServerTTSProvider` already are for TTS. Building two
apps, or letting MLX-specific types leak into the contract, would recreate
precisely the coupling ADR-001 exists to prevent.

The honest cost to name: **MLX and portable backends do not produce identical
output** — different models (Qwen3-TTS vs Piper), different voices, different
behavior. The provider contract guarantees they *substitute without a rewrite*,
not that they *sound the same*. That is an accepted consequence, not a hidden
one.

## Decision

**Introduce a local server process, restructure the repo as a monorepo, and
add two symmetric provider seams — `ServerTTSProvider` and a new
`STTProvider` — with MLX as the first backend for both and portable backends
deferred as purely additive.**

### 1. Repository becomes a monorepo

ADR-002's single-Vite-project constraint is **explicitly retired** here (not
contradicted silently): its own text made server introduction the trigger for
this transition, and this ADR introduces the server. Structure:

```
/web      existing Vite app (unchanged responsibilities)
/server   local inference process (HTTP over localhost)
/packages shared contracts/types consumed by both (e.g. provider interfaces)
```

The `/web` app keeps every existing boundary; the monorepo is additive
scaffolding around it, not a rewrite of it.

### 2. Two symmetric seams, backend-agnostic

```ts
interface TTSProvider {
  synthesize(text: string, opts?: TTSOptions): Promise<TTSResult>;
}
interface STTProvider {
  transcribe(audio: AudioBuffer, opts?: STTOptions): Promise<Transcript>;
}
```

`STTProvider` is deliberately the mirror image of `TTSProvider`: one takes
text and returns audio, the other takes audio and returns text. Both are
**backend-agnostic** — no MLX-specific types, model paths, or Apple-only
assumptions cross either interface. This is the single most important
constraint in the ADR: if the first server backend is clean against the
contract, adding a portable backend later is purely additive; if MLX details
leak into the seam, the "future portable version" becomes a refactor instead
of an addition — the exact trap ADR-001 guards against.

### 3. Provider / backend: two levels of choice

```
TTSProvider ─┬─ BrowserTTSProvider  (Kokoro, existing, ADR-002)
             └─ ServerTTSProvider ──┬─ MlxTTSBackend    (Qwen3-TTS, macOS)  ← first
                                    └─ PiperTTSBackend  (portable)          ← deferred

STTProvider ─── ServerSTTProvider ──┬─ MlxWhisperBackend (macOS)            ← first
                                    └─ WhisperCppBackend  (portable)        ← deferred
```

- **Provider** selects transport (browser vs server), chosen from config —
  the seam ADR-001/002 already established.
- **Backend** selects the concrete engine *inside* the server. **MLX is the
  first backend for both capabilities** (Qwen3-TTS for speech, MLX-Whisper
  for transcription), giving a single coherent inference stack on Apple
  Silicon.
- **Portable backends** (Piper for TTS, whisper.cpp for STT) are **deferred,
  not rejected** — they implement the same backend interface and slot in
  without touching provider, contract, or `/web`.

### 4. Server transport

`/server` exposes localhost HTTP endpoints; the `ServerTTSProvider` /
`ServerSTTProvider` in `/web` are thin HTTP adapters over them. The browser
only ever talks to `localhost` — no cloud, consistent with the project's
"runs 100% locally" goal. This removes the ~86MB in-browser Kokoro download
for users on the server path (browser Kokoro stays as the zero-setup
fallback provider).

### Consequence for the runtime flow

The audio → mouth pipeline from ADR-003 is **unchanged**: viseme extraction
still runs on the produced audio at playback, so a server-produced
`TTSResult` feeds wawa-lipsync exactly as a browser-produced one does. STT is
a *new* inbound path, not a modification of the existing outbound one:

```
outbound:  text → TTSProvider → audio → wawa-lipsync → morphTargetInfluences   (ADR-003, unchanged)
inbound:   mic → STTProvider → text → (future conversation loop)               (new)
```

The conversation loop that consumes `Transcript` is **out of scope here** —
this ADR establishes the seam and the transcription capability, not the
dialogue behavior that will sit on top of it (a future ADR, alongside the
`AgentStateSource` roadmap in ADR-001 §2).

## Consequences

**Positive**
- Multilingual TTS becomes reachable (Qwen3-TTS on the server) without
  compromising the zero-setup browser demo, which stays as-is.
- STT capability exists behind a clean seam, symmetric to TTS — the
  foundation for two-way conversation.
- MLX gives one coherent local inference stack (TTS + STT) on Apple Silicon.
- Portability is preserved as a future addition, not a fork: portable
  backends are additive behind the same contracts.
- ADR-003's audio-derived viseme property carries over untouched — the server
  contract carries no timing burden.

**Negative / costs**
- **Monorepo migration** is real structural work and the largest cost here;
  it touches build, tooling, and CI, even though `/web`'s internals don't
  change.
- The server path requires a running local process — no longer "opens with
  any link." The browser provider remains precisely to preserve that
  zero-setup story for anyone without the server.
- **Two backends per capability won't match** in voice or model behavior;
  the contract isolates them but does not homogenize them (named above).
- More surface to maintain: a server, two new provider implementations, and
  eventually four backends.

## Alternatives considered

- **Keep browser-only, drop multilingual/STT ambitions:** rejected — both are
  intended directions ADR-002 already anticipated; deferring forever isn't
  the goal.
- **Two separate ADRs (server-TTS now, STT later):** rejected — both cross
  the same browser→server / single-project→monorepo boundary, so splitting
  them would trip the same structural trigger twice and fragment one
  decision.
- **MLX-only, no portable seam:** rejected — collapses the backend boundary
  and turns the future portable version into a refactor; contradicts
  ADR-001's whole premise. Portability is kept as an additive backend, not
  designed out.
- **Portable-first (Piper + whisper.cpp), MLX later:** viable, rejected on
  quality/coherence grounds for *this* machine — MLX gives the better
  multilingual voice (Qwen3-TTS) and a unified stack on the target hardware
  now. Piper/whisper.cpp remain the most likely portable additions, not
  ruled out.
- **Remote (hosted) TTS/STT API:** rejected — breaks the "runs 100% locally"
  goal, same as in ADR-002. The server here is local to the user's machine.
- **Separate ADR for MLX-vs-portable backend choice:** not written — the
  backend split is a *consequence* of these seams named in passing, not a
  standalone decision, consistent with the ADR-tone rule in CLAUDE.md.
