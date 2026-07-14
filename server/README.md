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

**STT (slice STT-b):** the mirror seam, chosen by `STT_BACKEND`:

- **`stub`** (default) — `StubSTTBackend` returns a fixed string reporting how
  much audio it received. No model — proves the mic→server plumbing.
- **`mlx`** — `MlxWhisperBackend` runs **real Whisper** on Apple Silicon via
  `mlx-whisper`. macOS-only; opt-in.

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
  The MLX backend resamples the incoming audio to Whisper's required 16 kHz
  if needed, and translates the full-word `language` (e.g. `"italian"`) to
  Whisper's ISO code internally — `/web` never sees a code either direction.
- `GET /stt/capabilities` — `{ "languages": string[] }` the active STT backend
  offers (empty for the stub; the MLX backend returns
  `auto, english, italian, german, spanish, portuguese, french, russian,
  chinese, japanese, korean`).
- `GET /health` — `{ "status": "ok", "tts_backend": "stub" | "mlx", "stt_backend": "stub" | "mlx" }`.

## Layout

- `app/main.py` — FastAPI app, routes, CORS, backend selection (both seams).
- `app/backends/base.py` — `TTSBackend`/`STTBackend` ABCs + `SynthesizedAudio`/
  `Transcript` (the seams every backend implements; backend-agnostic).
- `app/backends/stub.py` / `stub_stt.py` — `StubTTSBackend` (tone bursts) /
  `StubSTTBackend` (fixed transcript string).
- `app/backends/mlx.py` — `MlxTTSBackend` (Qwen3-TTS via mlx-audio; lazy load,
  deferred `mlx_audio` import so this stays importable without the extra).
- `app/backends/mlx_whisper.py` — `MlxWhisperBackend` (Whisper via mlx-whisper;
  deferred `mlx_whisper` import, resamples to 16 kHz, translates language
  word ↔ ISO code internally).
- `app/backends/__init__.py` — `get_backend()`/`get_stt_backend()` factories,
  chosen by `TTS_BACKEND`/`STT_BACKEND` env (`stub` default, `mlx` opt-in).
- `app/audio.py` — `encode_wav()`/`decode_wav()` (transport concern, kept out
  of backends — WAV both ways, so no backend ever touches the wire format).
- `scripts/bench_rtf.py` / `bench_stt_rtf.py` — measure TTS / STT real-time
  factor on this machine.

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
pnpm dev:server               # stub backends (TTS + STT), uvicorn on :8000
pnpm dev:server:mlx           # mlx backends (real Qwen3-TTS + Whisper), uvicorn on :8000
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

## MLX backend (real Whisper, macOS only)

`mlx-whisper` lives in the same `mlx` extra as `mlx-audio` (`uv sync --extra mlx`
installs both):

```bash
uv sync --extra mlx
STT_BACKEND=mlx uv run --extra mlx uvicorn app.main:app --port 8000
# or, from repo root: pnpm dev:server:mlx (also enables TTS_BACKEND=mlx)
```

Config (all env, all optional):

| var | default | meaning |
|-----|---------|---------|
| `STT_BACKEND` | `stub` | `mlx` selects Whisper |
| `MLX_STT_MODEL` | `mlx-community/whisper-small-mlx-8bit` | HF repo id |
| `MLX_STT_LANGUAGE` | `auto` | language hint (full word, e.g. `italian`); `auto` lets Whisper detect |

**Why the small model, not large-v3-turbo:** benchmarked both on this M4 Pro
(24 GB), same 4-clip bench as the TTS RTF numbers below, input speech
synthesized on the fly via the cached TTS backend:

| model | load+warmup | median RTF | vs real-time |
|-------|-------------|-----------|--------------|
| whisper-small-mlx-8bit (default) | ~1.4 s | **0.059** | ~17× faster |
| whisper-large-v3-turbo-q4 | ~29.9 s | **0.317** | ~3.2× faster |

(Numbers are from an idle-machine re-run; a first pass under other load on the
machine measured slower for both and — on that run only — a garbled
transcription from turbo-q4 on one clip that didn't reproduce once re-measured
cleanly. Treating that as noise, not a real accuracy gap.)

The small model is ~5.4× faster here; accuracy was comparable between the two
once measured on a quiet machine. Kept `whisper-small-mlx-8bit` as default on
the RTF numbers; the turbo model's cache was deleted after benching (same
"benchmark then clean" pattern as TTS).

Note on model formats: `whisper-large-v3-turbo-8bit` (the more obvious "big"
pick) failed to load — the installed `mlx-whisper==0.4.3` only reads
`weights.safetensors`/`weights.npz`, not the newer `model.safetensors` that
repo ships. `whisper-large-v3-turbo-q4` is the same model in the
older/loadable format, hence the comparison above uses `-q4`, not `-8bit`.

**Whisper's hard requirements, handled internally so /web never sees them:**
Whisper always wants mono float32 at 16 kHz — `MlxWhisperBackend` resamples
via `scipy.signal.resample_poly` if the incoming WAV's rate differs. Whisper's
`language` option is an ISO-639-1 code (`"it"`), not a full word — the backend
translates the full-word list above ↔ codes internally via `mlx_whisper`'s own
`tokenizer.LANGUAGES` dict, in both directions (request and detected result).

Passing a raw array (not a file path) to `mlx_whisper.transcribe()` is
deliberate: the path form shells out to a system `ffmpeg` binary to
decode/resample, an extra undeclared dependency this backend avoids entirely
by always resampling itself and passing the array form.

**Tests:** same double-gate as the TTS MLX test:
`RUN_MLX_TESTS=1 uv run --extra mlx pytest tests/test_mlx_whisper_backend.py`.

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
