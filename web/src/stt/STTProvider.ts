/**
 * STTProvider — the mirror image of TTSProvider (ADR-001 §4 / ADR-004 §2):
 * where TTSProvider turns text into audio, STTProvider turns audio into text.
 *
 * Unlike TTS there is only one implementation so far — `ServerSTTProvider`.
 * The mature speech-recognition options (Whisper family) run server-side, so
 * ADR-004 doesn't plan a zero-setup in-browser STT fallback the way Kokoro is
 * one for TTS. The interface still exists on its own (rather than being
 * folded into ServerSTTProvider directly) so a second implementation — a
 * future in-browser option, if one ever becomes practical — stays additive
 * instead of a rewrite.
 */
export interface STTProvider {
  transcribe(audio: AudioBuffer, opts?: STTOptions): Promise<Transcript>
  /** What this provider offers, so the UI can build a correct language picker
   * without knowing the backend model (mirrors TTSProvider.getCapabilities). */
  getCapabilities(): Promise<STTCapabilities>
}

export interface STTOptions {
  /** Language hint; `undefined`/'auto' lets the backend detect it. */
  language?: string
}

export interface STTCapabilities {
  /** Selectable language hints; empty means "no language control". */
  languages: string[]
}

/** The recognized text, plus whichever language the backend actually used or
 * detected (not necessarily the one requested — e.g. when the hint was 'auto'). */
export interface Transcript {
  text: string
  language?: string
}
