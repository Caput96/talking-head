import { getAudioContext } from './audioContext'
import type { TTSCapabilities, TTSOptions, TTSProvider, TTSResult } from './TTSProvider'

/** The `/capabilities` response shape (plain speaker/language name lists). Kept
 * in sync by hand with the server (see server/README.md's contract note). */
interface CapabilitiesResponse {
  voices: string[]
  languages: string[]
  instruct: boolean
}

// "serena" → "Serena" for the dropdown label.
function titleCase(name: string): string {
  return name.replace(/(^|[_\s])([a-z])/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase())
}

/**
 * ServerTTSProvider — the TTSProvider implementation backed by the local
 * /server process (ADR-004 §4), a thin HTTP adapter over `POST /synthesize`.
 *
 * It is the exact counterpart of BrowserTTSProvider behind the same contract:
 * callers of `synthesize()` can't tell which one is in use. The only difference
 * is where the audio comes from — an HTTP fetch to localhost instead of an
 * in-browser model. Whatever engine the server runs stays invisible here; this
 * adapter only knows "POST text, get WAV back".
 */
export class ServerTTSProvider implements TTSProvider {
  // Plain field + assignment rather than a `private baseUrl` constructor
  // parameter property: this tsconfig sets `erasableSyntaxOnly`, which forbids
  // parameter properties because they emit real code instead of being erased.
  private readonly baseUrl: string
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async synthesize(text: string, opts?: TTSOptions): Promise<TTSResult> {
    // Grab the AudioContext synchronously, before any `await`, so it stays
    // inside the caller's user-gesture call stack — same reason as
    // BrowserTTSProvider (see tts/audioContext.ts). We use it below to decode
    // the server's WAV into the AudioBuffer the rest of the pipeline expects.
    const audioContext = getAudioContext()

    const res = await fetch(`${this.baseUrl}/synthesize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: opts?.voice,
        speed: opts?.speed,
        language: opts?.language,
        instruct: opts?.instruct,
      }),
    })
    if (!res.ok) {
      throw new Error(`TTS server responded ${res.status} ${res.statusText}`)
    }

    // The server returns raw WAV bytes; decodeAudioData turns them into the same
    // kind of AudioBuffer BrowserTTSProvider builds — so downstream (wawa-lipsync
    // playback → visemes → mouth, ADR-003) is byte-for-byte identical.
    const audio = await audioContext.decodeAudioData(await res.arrayBuffer())

    // No phoneme timings — visemes come from the audio at playback, so the
    // server carries no timing burden (see TTSProvider.ts's PhonemeTiming doc).
    return { audio, timings: [] }
  }

  // The active backend's speakers/languages, fetched from the server. Whatever
  // model it runs decides these (introspected server-side), so the picker is
  // always correct for the configured model without hardcoding anything here.
  async getCapabilities(): Promise<TTSCapabilities> {
    const res = await fetch(`${this.baseUrl}/capabilities`)
    if (!res.ok) {
      throw new Error(`TTS server responded ${res.status} ${res.statusText}`)
    }
    const data = (await res.json()) as CapabilitiesResponse
    return {
      voices: data.voices.map((name) => ({ id: name, label: titleCase(name) })),
      languages: data.languages,
      supportsInstruct: data.instruct,
    }
  }
}
