/**
 * STTProvider — the speech-to-text seam (ADR-004 §2), the deliberate mirror
 * image of TTSProvider: one takes text and returns audio, the other takes audio
 * and returns text.
 *
 * Backend-agnostic like its twin: no MLX/Whisper/model-path types leak across
 * it. `ServerSTTProvider` (slice STT-a: StubSTTBackend; slice STT-b:
 * MlxWhisperBackend) is the only implementation — unlike TTS there is no
 * zero-setup in-browser STT fallback planned (mature options run server-side).
 *
 * NOTE: /web is not yet wired to import this package — its local
 * src/stt/STTProvider.ts remains the live definition, same acknowledged gap as
 * tts.ts. This shape intentionally mirrors that file so a future merge is a
 * re-export, not a reshape.
 *
 * The inbound path this seam opens (mic → STT → text → future conversation
 * loop) stops at `Transcript` here; the dialogue behavior on top of it is out
 * of scope for ADR-004 (a future ADR).
 */
export interface STTProvider {
  transcribe(audio: AudioBuffer, opts?: STTOptions): Promise<Transcript>
  getCapabilities(): Promise<STTCapabilities>
}

export interface STTOptions {
  /** Language hint; absent/'auto' lets the backend detect it. */
  language?: string
}

export interface STTCapabilities {
  /** Selectable language hints; empty means "no language control". */
  languages: string[]
}

export interface Transcript {
  text: string
  /** Whichever language the backend actually used or detected — not
   * necessarily the one requested (e.g. when the hint was 'auto'). */
  language?: string
}
