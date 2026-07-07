/**
 * TTSProvider — the text-to-speech seam (ADR-001 §4, ADR-004 §2), promoted here
 * to a shared workspace contract so both /web (browser + future server adapters)
 * and tooling reference one definition.
 *
 * Backend-agnostic by design: no engine-, model-, or platform-specific types
 * cross this boundary. `BrowserTTSProvider` (Kokoro) and a future
 * `ServerTTSProvider` (HTTP over the local MLX/portable server) both implement
 * it, so callers of `synthesize()` never learn which backend produced the audio.
 *
 * NOTE: /web is not yet wired to import this package — its local
 * src/tts/TTSProvider.ts remains the live definition. Unifying the two is a
 * later ADR-004 slice; this shape intentionally mirrors that file so the merge
 * is a re-export, not a reshape.
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
 * viseme work; carried on the contract because ADR-001 committed to it. Server
 * backends need not fill it — ADR-003's viseme extraction runs on the audio at
 * playback, so the server contract carries no timing burden (ADR-004 §Context).
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
