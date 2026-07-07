# server — local inference process (stub)

Placeholder for the local TTS/STT inference process introduced by
[ADR-004](../docs/adr/ADR-004-server-and-stt.md) (§§1, 3–4): a localhost HTTP
service that the `ServerTTSProvider` / `ServerSTTProvider` in `/web` will talk
to, with MLX (Qwen3-TTS, MLX-Whisper) as the first backend and portable
backends (Piper, whisper.cpp) deferred as purely additive.

**Not implemented in this slice.** The current ADR-004 slice only performs the
behavior-preserving monorepo migration (app moved under `/web`, shared contracts
scaffolded in `/packages/contracts`). No server code, no Python, no HTTP
endpoints exist yet — this directory holds only this README so the monorepo
structure (`/web` + `/server` + `/packages`) is in place for later slices.
