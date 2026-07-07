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
}

export interface TTSOptions {
  voice?: string
  speed?: number
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
