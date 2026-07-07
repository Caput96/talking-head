/**
 * STTProvider — the speech-to-text seam (ADR-004 §2), the deliberate mirror
 * image of TTSProvider: one takes text and returns audio, the other takes audio
 * and returns text.
 *
 * Backend-agnostic like its twin: no MLX/Whisper/model-path types leak across
 * it. The first backend will be MLX-Whisper behind a `ServerSTTProvider`, with
 * portable (whisper.cpp) backends added purely additively later — neither is
 * implemented in this slice; only the contract exists.
 *
 * The inbound path this seam opens (mic → STT → text → future conversation
 * loop) is scaffolding only here; the dialogue behavior on top of `Transcript`
 * is out of scope for ADR-004 (a future ADR).
 */
export interface STTProvider {
  transcribe(audio: AudioBuffer, opts?: STTOptions): Promise<Transcript>
}

export interface STTOptions {
  /** BCP-47 language hint (e.g. "en", "it"); backends may auto-detect if absent. */
  language?: string
}

export interface Transcript {
  text: string
}
