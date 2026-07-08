import { encodeWav } from './encodeWav'
import type { STTCapabilities, STTOptions, STTProvider, Transcript } from './STTProvider'

/** The `/stt/capabilities` response shape. Kept in sync by hand with the
 * server, same as ServerTTSProvider's CapabilitiesResponse. */
interface CapabilitiesResponse {
  languages: string[]
}

interface TranscribeResponse {
  text: string
  language: string | null
}

/**
 * ServerSTTProvider — the STTProvider implementation backed by the local
 * /server process (ADR-004 §4), a thin HTTP adapter over `POST /transcribe`.
 *
 * The wire direction is the reverse of ServerTTSProvider: audio still only
 * ever travels as raw WAV bytes (never JSON/base64 — that would cost ~33%
 * extra for no benefit), but here /web is the one encoding it, via
 * `encodeWav`, before POSTing. The server decodes it with the stdlib `wave`
 * module — no ffmpeg, no extra codec — so WAV is the one format both sides
 * need to agree on.
 */
export class ServerSTTProvider implements STTProvider {
  private readonly baseUrl: string
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async transcribe(audio: AudioBuffer, opts?: STTOptions): Promise<Transcript> {
    const wav = encodeWav(audio)
    const language = opts?.language
    const url = new URL(`${this.baseUrl}/transcribe`)
    if (language) url.searchParams.set('language', language)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'audio/wav' },
      body: wav,
    })
    if (!res.ok) {
      throw new Error(`STT server responded ${res.status} ${res.statusText}`)
    }

    const data = (await res.json()) as TranscribeResponse
    return { text: data.text, language: data.language ?? undefined }
  }

  async getCapabilities(): Promise<STTCapabilities> {
    const res = await fetch(`${this.baseUrl}/stt/capabilities`)
    if (!res.ok) {
      throw new Error(`STT server responded ${res.status} ${res.statusText}`)
    }
    const data = (await res.json()) as CapabilitiesResponse
    return { languages: data.languages }
  }
}
