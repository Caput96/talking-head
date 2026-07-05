# ADR-002 — Local TTS engine: Kokoro

- **Status:** Accepted

## Context

ADR-001 §4 defines `TTSProvider` as an engine-agnostic contract:

```ts
interface TTSProvider {
  synthesize(text: string, opts?: TTSOptions): Promise<TTSResult>
}
// TTSResult = { audio: AudioBuffer; timings: PhonemeTiming[] }
```

and deferred the concrete engine behind `BrowserTTSProvider` to this ADR.
Two realistic options run fully client-side, with no server, in a plain Vite
app:

**Kokoro** (via the `kokoro-js` npm package, wrapping
Transformers.js/onnxruntime-web)
- 82M parameters, Apache-2.0 license, StyleTTS2-derived.
- Consistently ranks near the top of open TTS quality leaderboards for its
  size — the most natural-sounding option currently available fully
  client-side.
- Model download: ~86MB at `q8` quantization (used here) up to ~300MB at
  `fp32`; fetched once and cached by the browser after first use.
- English voices only (American and British).
- `kokoro-js` does not expose phoneme-level timestamps.

**Piper** (community WASM ports of the VITS-based engine)
- MIT license, mature (years of production use, e.g. Home Assistant).
- Small per-voice models (~20-60MB), fast even on modest CPUs.
- Many languages, including Italian.
- Noticeably more robotic/synthetic voice quality than Kokoro.
- WASM ports are community-maintained and less mature than the
  Transformers.js wrapper ecosystem around Kokoro.
- Also doesn't cleanly expose phoneme timestamps through common wrappers.

Neither option currently exposes phoneme-level timing, which matters less
than it might: Phase 5's lip-sync starts amplitude-driven (RMS computed from
the synthesized audio itself), so `TTSResult.timings` staying empty for now
blocks nothing.

This ADR scopes itself deliberately narrow: it picks the engine for a
**browser-only** `BrowserTTSProvider`, to get the whole pipeline (text →
audio → eventually lip-sync) working end-to-end as fast as possible with no
server at all. A local-*server*-backed path is a real, intended future
direction (see below), not an alternative being ruled out here — it's
explicitly deferred until the browser pipeline has proven itself.

## Decision

**Kokoro**, via `kokoro-js`.

For this project specifically, voice quality is the deciding factor over
download size or language coverage: the near-term goal is a convincing demo
of a talking head, and how natural the voice sounds matters more to that
than a smaller download or non-English voices — neither of which is a
current requirement. Piper's real advantages (smaller, faster, Italian
voices) don't outweigh quality for a first demo.

This is **not a permanent commitment**. `BrowserTTSProvider` sits behind the
`TTSProvider` interface precisely so the engine can be swapped later —
Piper, or something newer — without touching `MorphSource`,
`LipSyncSource`, or any UI code. If Italian-language support or a smaller
download footprint becomes an actual requirement, that's a new
`PiperTTSProvider` implementing the same contract, not a redesign. Kokoro is
today's answer for the first working demo, not a locked-in-forever choice.

## Consequences

**Positive**
- Best available voice quality among fully client-side, no-server options —
  the demo sounds like a demo worth showing.
- Apache-2.0 licensing imposes no meaningful constraint on use.

**Negative / costs**
- Larger initial download (~86MB) than Piper would need, paid once per
  browser (cached afterward).
- English-only voices for now; non-English text-to-speech is out of scope
  until a provider swap.
- No phoneme timings — acceptable today, but viseme-driven lip-sync (Phase
  5's second step) will need either a different engine, a separate
  forced-aligner, or a heuristic, whichever comes first.

## Future direction: a local server TTS path

Once the minimal browser pipeline (this ADR's `BrowserTTSProvider`) is
stable and proven end-to-end, evaluate adding a **`ServerTTSProvider`**:
another `TTSProvider` implementation, this time an HTTP adapter over a TTS
engine running as a **local server process** on the user's own machine —
not a browser bundle, and not a cloud API. Concretely: **MLX-Audio** on
macOS (an inference framework built on Apple's MLX, tuned for Apple Silicon)
serving either Kokoro or **Qwen3-TTS** over a localhost HTTP endpoint.

Why this is worth evaluating later, not now:
- Server-side inference isn't constrained by what fits in a browser bundle
  or runs acceptably over WASM/WebGPU — it opens the door to larger, higher
  quality models (Qwen3-TTS in particular) that wouldn't be practical to
  ship and run client-side.
- MLX is Apple Silicon-native, likely faster and more efficient than
  onnxruntime-web's WASM/WebGPU backends for the same model on the same
  hardware.
- It removes the ~86MB in-browser model download entirely — the browser
  would only ever talk to `localhost`.

Why not now: it requires a real server process, which this project
deliberately doesn't have yet. CLAUDE.md is explicit that this repo stays a
**single Vite project, not a monorepo**, until/unless a server is actually
introduced — at which point that transition gets its *own* dedicated ADR,
not a retrofit of this one. Standing up a local TTS server before the
browser-only path has even proven the `TTSProvider` contract works would be
solving a problem ("is Kokoro-in-browser good enough?") before it's known to
exist.

`ServerTTSProvider` fills architecturally the same role ADR-001 §4 already
named `RemoteTTSProvider` (an HTTP adapter behind the same `TTSProvider`
contract) — "server" is the more accurate name here since the server in
question runs locally on the user's own machine, not on a remote host, but
it's the same seam. No code changes anywhere else in the app would be
required to add it: that's the entire point of the `TTSProvider` boundary.

## Alternatives considered

- **Piper (WASM):** see trade-offs above — smaller, faster, more languages,
  lower voice quality. Rejected for now on quality grounds; remains the
  most likely future swap if language coverage or footprint becomes a real
  requirement.
- **A local server TTS path (MLX-Audio, Kokoro/Qwen3-TTS) from the start:**
  not rejected — deferred. See "Future direction" above; it's the intended
  next step once the browser-only pipeline is proven, not an alternative
  ruled out here.
- **Remote TTS (a hosted, non-local API):** would sidestep quality/size
  trade-offs entirely, but breaks the "runs 100% locally" goal this project
  is built around. Not under consideration, unlike the local-server path
  above.
