/**
 * TTSProvider — the strategy interface from ADR-001 §4, now locked in code.
 *
 * `BrowserTTSProvider` (Kokoro, see ADR-002) implements this now; a future
 * `RemoteTTSProvider` (an HTTP adapter over a server) would implement the
 * exact same contract, so nothing that calls `synthesize()` needs to know or
 * care which one is in use.
 */
export interface TTSProvider {
  synthesize(text: string, opts?: TTSOptions): Promise<TTSResult>
  /**
   * What this provider offers, so the UI can build a correct voice/language
   * picker without knowing which provider is live (ADR-001 seam). Kokoro
   * (browser) returns its static voice list; the server returns whatever its
   * backend model advertises.
   */
  getCapabilities(): Promise<TTSCapabilities>
}

export interface TTSOptions {
  voice?: string
  speed?: number
  /** Language / lang_code hint; `undefined` lets the provider decide (e.g.
   * 'auto'). Only the server provider uses it — Kokoro's language rides on the
   * chosen voice. */
  language?: string
  /** Free-text tone/style prompt (e.g. "cheerful and energetic"). Only honored
   * when the provider reports `supportsInstruct` — ignored otherwise. */
  instruct?: string
}

/** One selectable voice, normalized across providers for the picker. */
export interface TTSVoice {
  /** Value sent back as TTSOptions.voice. */
  id: string
  /** Human-readable label shown in the dropdown. */
  label: string
  /** Optional group heading (Kokoro uses it for accent groups). */
  group?: string
}

export interface TTSCapabilities {
  voices: TTSVoice[]
  /** Selectable language codes; empty means "no language control" (Kokoro). */
  languages: string[]
  /** Whether this provider honors a free-text tone/style `instruct` prompt, so
   * the UI can conditionally show a "voice tone" box. */
  supportsInstruct: boolean
}

/**
 * A single phoneme's time span within the synthesized audio. Reserved for
 * viseme-driven lip-sync (Phase 5, second step) — no current TTSProvider
 * implementation fills this in yet, since Phase 5 starts amplitude-driven
 * (RMS from `TTSResult.audio` itself), which doesn't need it. Kept as a real,
 * typed field rather than added later, since ADR-001 already committed to it
 * as part of the contract.
 */
export interface PhonemeTiming {
  phoneme: string
  startSec: number
  endSec: number
}

export interface TTSResult {
  audio: AudioBuffer
  timings: PhonemeTiming[]
}
