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

## Alternatives considered

- **Piper (WASM):** see trade-offs above — smaller, faster, more languages,
  lower voice quality. Rejected for now on quality grounds; remains the
  most likely future swap if language coverage or footprint becomes a real
  requirement.
- **Remote TTS (e.g. a hosted API):** would sidestep quality/size
  trade-offs entirely, but breaks the "runs 100% locally" goal and
  reintroduces the server this project deliberately doesn't have yet (see
  CLAUDE.md: a server is out of scope until there's a concrete reason for
  one). `RemoteTTSProvider` (ADR-001 §4) stays a documented future option
  behind the same contract, not something built now.
