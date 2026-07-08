# server — local TTS/STT inference process (ADR-004)

A localhost HTTP service the `ServerTTSProvider`/`ServerSTTProvider` in `/web`
talk to ([ADR-004](../docs/adr/ADR-004-server-and-stt.md) §§1, 3–4). Runs
entirely on the user's machine — the browser only ever reaches `localhost`.

## Status

**TTS (slice 2b):** two interchangeable backends behind one seam, chosen by
the `TTS_BACKEND` env:

- **`stub`** (default) — `StubTTSBackend` returns a short deterministic tone (a
  few "syllable" bursts). No model, no MLX, zero setup — the CI-safe path and the
  fallback used to prove the seam.
- **`mlx`** — `MlxTTSBackend` runs **real Qwen3-TTS** on Apple Silicon via
  `mlx-audio`. macOS-only; opt-in.

**STT (slice STT-a):** the mirror seam, chosen by `STT_BACKEND`:

- **`stub`** (default) — `StubSTTBackend` returns a fixed string reporting how
  much audio it received. No model — proves the mic→server plumbing.
- **`mlx`** — not implemented yet (`MlxWhisperBackend`, slice STT-b).

```
/web ServerTTSProvider  → POST /synthesize  → {Stub|Mlx}TTSBackend    → WAV
      → /web decodeAudioData → AudioBuffer → wawa-lipsync → mouth

/web ServerSTTProvider  → POST /transcribe  → {Stub|Mlx}STTBackend    → JSON
      (mic → MediaRecorder → decodeAudioData → encodeWav, client-side)
```

Swapping backends is config only — the HTTP contract, the provider, and `/web`
are identical for both, on either seam.

## Endpoints

- `POST /synthesize` — body
  `{ "text": string, "voice"?: string, "speed"?: number, "language"?: string, "instruct"?: string }`;
  returns `200 audio/wav` (16-bit PCM mono; 24 kHz). No JSON envelope, no phoneme
  timing (ADR-003 derives visemes from the audio at playback). The MLX backend
  validates `voice`/`language` against the model's sets and falls back to its
  configured default rather than erroring on an unknown value. `instruct` (a
  free-text tone/style prompt) is passed through only when the model supports it
  (see `/capabilities`), otherwise ignored.
- `GET /capabilities` — `{ "voices": string[], "languages": string[], "instruct": boolean }`
  the active TTS backend offers, so `/web` builds a provider-correct picker (and
  conditionally a tone box) without hardcoding. For MLX these are introspected
  from the model (`supported_speakers` / `supported_languages`, and the
  instruct gate below), so this triggers a lazy model load on first call (and
  warms it). The stub returns empty lists / `false`.

  **`instruct` support** mirrors mlx-audio's own gate: `true` for VoiceDesign
  models (which *require* a description) and for CustomVoice models **except the
  0.6B build** (`tts_model_size == "0b6"` ignores it); `false` for Base. So the
  default `0.6B-CustomVoice-8bit` reports `false` — switch `MLX_TTS_MODEL` to a
  1.7B CustomVoice or a VoiceDesign model to get tone control.
- `POST /transcribe?language=auto` — body: raw `audio/wav` bytes (16-bit PCM;
  any sample rate — decoded server-side). Returns `200 application/json`
  `{ "text": string, "language": string | null }`. `language` is a query param,
  not a JSON field, since the body isn't JSON (audio never travels as
  base64-in-JSON here, on either endpoint — that's a ~33% size penalty for no
  benefit). Absent/`"auto"` lets the backend detect the language; the stub
  ignores it and echoes back whatever hint it got, defaulting to `"auto"`.
- `GET /stt/capabilities` — `{ "languages": string[] }` the active STT backend
  offers (empty for the stub — no language control until a real model is
  wired in).
- `GET /health` — `{ "status": "ok", "tts_backend": "stub" | "mlx", "stt_backend": "stub" | "mlx" }`.

## Layout

- `app/main.py` — FastAPI app, routes, CORS, backend selection (both seams).
- `app/backends/base.py` — `TTSBackend`/`STTBackend` ABCs + `SynthesizedAudio`/
  `Transcript` (the seams every backend implements; backend-agnostic).
- `app/backends/stub.py` / `stub_stt.py` — `StubTTSBackend` (tone bursts) /
  `StubSTTBackend` (fixed transcript string).
- `app/backends/mlx.py` — `MlxTTSBackend` (Qwen3-TTS via mlx-audio; lazy load,
  deferred `mlx_audio` import so this stays importable without the extra).
- `app/backends/mlx_whisper.py` — not yet implemented (slice STT-b).
- `app/backends/__init__.py` — `get_backend()`/`get_stt_backend()` factories,
  chosen by `TTS_BACKEND`/`STT_BACKEND` env (`stub` default, `mlx` opt-in).
- `app/audio.py` — `encode_wav()`/`decode_wav()` (transport concern, kept out
  of backends — WAV both ways, so no backend ever touches the wire format).
- `scripts/bench_rtf.py` — measures TTS real-time factor on this machine.

## Environment (uv)

Managed by [uv](https://docs.astral.sh/uv/); Python is pinned to **3.12**
(`.python-version`) and stays **arm64-native** on Apple Silicon.

```bash
uv sync                       # create .venv from uv.lock (fetches 3.12 if needed)
uv run pytest                 # run the tests
uv run uvicorn app.main:app --reload --port 8000   # run the server directly
```

From the repo root, the pnpm workspace scripts wrap these:

```bash
pnpm dev:server               # stub backend, uvicorn on :8000
pnpm dev:server:mlx           # mlx backend (real Qwen3-TTS), uvicorn on :8000
pnpm dev:all                  # web (Vite) + stub server together, via concurrently
```

## MLX backend (real Qwen3-TTS, macOS only)

`mlx-audio` is a **macOS-only optional extra** (`sys_platform == 'darwin'`), so
the MLX stack is installed only on demand:

```bash
uv sync --extra mlx                                   # install mlx-audio + mlx
TTS_BACKEND=mlx uv run --extra mlx uvicorn app.main:app --port 8000
# or, from repo root: pnpm dev:server:mlx
```

Config (all env, all optional):

| var | default | meaning |
|-----|---------|---------|
| `TTS_BACKEND` | `stub` | `mlx` selects Qwen3-TTS |
| `MLX_TTS_MODEL` | `mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit` | HF repo id; e.g. swap in `…1.7B-CustomVoice-8bit` for higher quality |
| `MLX_TTS_VOICE` | `serena` | a CustomVoice built-in speaker (see below) |
| `MLX_TTS_LANGUAGE` | `auto` | `lang_code` (auto-detects; multilingual) |

**Why CustomVoice, not Base:** the **CustomVoice** model conditions on a fixed
named speaker, so a voice sounds the *same* on every request. The **Base** model
has no trained speakers — it treats `voice` as a free label and samples a new
random speaker each generation, so the voice would change every time. Valid
speakers for the 0.6B CustomVoice model: `serena`, `vivian`, `uncle_fu`, `ryan`,
`aiden`, `ono_anna`, `sohee`, `eric`, `dylan` (it rejects unknown names).

**Model download / caching:** the model (~1.3 GB for 0.6B-8bit + a speech-token
codec) downloads on the **first** `/synthesize` into the standard HF cache
(`~/.cache/huggingface/hub`) — the server stays up on `/health` meanwhile, and
the first request is slow. Cached afterwards; works offline. Pre-warm with one
request or `uv run --extra mlx python scripts/bench_rtf.py`.

**Tests:** the MLX test is double-gated (needs the extra installed *and*
`RUN_MLX_TESTS=1`) so `uv run pytest` and CI never download a model:
`RUN_MLX_TESTS=1 uv run --extra mlx pytest`.

The extra is macOS-only by design; CI (ubuntu) and the default `uv sync` stay
MLX-free and exercise the stub, keeping the future portable-vs-MLX backend story
honest.

## Contract agreement with /web

Kept **by hand**, not code-generated. `SynthesizeRequest` (`app/main.py`)
mirrors `TTSOptions` in
[`packages/contracts/src/tts.ts`](../packages/contracts/src/tts.ts); the
`/transcribe` response (`{text, language}`) mirrors `Transcript` in
[`packages/contracts/src/stt.ts`](../packages/contracts/src/stt.ts). `/synthesize`
returns opaque WAV bytes, so there's no schema to generate there. `/transcribe`
*does* now return structured JSON — the trigger this note previously flagged for
revisiting OpenAPI → TypeScript codegen — but it's still just two fields kept in
sync by hand; not worth the build-time dependency on a running server yet.
