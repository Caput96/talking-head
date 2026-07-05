import { Lipsync, VISEMES } from 'wawa-lipsync'

/**
 * wawaLipsync — the audio bridge between TTS playback and wawa-lipsync's
 * real-time viseme analysis (ADR-003's second/viseme step).
 *
 * wawa-lipsync's API is built around an HTMLMediaElement (`connectAudio`),
 * not the Web Audio `AudioBuffer` our `TTSProvider` produces (see
 * tts/TTSProvider.ts). Bridging the two means encoding the AudioBuffer to a
 * WAV Blob and playing it through a real `<audio>` element instead.
 *
 * IMPORTANT — this is a second, independent playback path, not a tap:
 * `Lipsync` opens its OWN `AudioContext` and `connectAudio()` connects
 * straight to ITS OWN destination. So whenever this bridge plays an
 * utterance, IT is what the user actually hears. `ui/TTSPanel.tsx` must not
 * also play the same AudioBuffer through the old AudioBufferSourceNode path
 * (see AudioBus.ts) at the same time, or the utterance would sound doubled.
 */
class WawaLipsyncBridge {
  private readonly lipsync = new Lipsync()
  private readonly audioEl = new Audio()
  private hasPlayed = false
  private currentUrl: string | null = null

  /** Encode `buffer` to WAV and play it through this bridge's `<audio>`
   * element, (re)connecting wawa-lipsync to it so viseme analysis can run. */
  play(buffer: AudioBuffer): void {
    const url = URL.createObjectURL(encodeWav(buffer))
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl)
    this.currentUrl = url

    this.audioEl.src = url
    // connectAudio() no-ops on repeat calls with the same element (wawa
    // guards internally on `audioSource === element`), so calling it every
    // play() — instead of tracking "is this the first call" ourselves — is
    // both simpler and correct.
    this.lipsync.connectAudio(this.audioEl)
    this.hasPlayed = true
    void this.audioEl.play()
  }

  /** Pull model (same precedent as AudioBus.getRms()): call once per frame to
   * advance wawa's analysis and read back the current dominant viseme.
   * Returns null until the first play() call, so callers can distinguish
   * "nothing has spoken yet" from an actual silence viseme. */
  getViseme(): VISEMES | null {
    if (!this.hasPlayed) return null
    this.lipsync.processAudio()
    return this.lipsync.viseme
  }
}

let bridge: WawaLipsyncBridge | null = null

/** Lazy singleton — same shape as tts/audioContext.ts / core/AudioBus.ts.
 * Lazy specifically because `Lipsync`'s constructor and `new Audio()` both
 * require a browser (`window`/DOM), so this must never run at module-import
 * time (e.g. in Node-based unit tests). */
export function getWawaLipsync(): WawaLipsyncBridge {
  if (!bridge) bridge = new WawaLipsyncBridge()
  return bridge
}

/** The narrow slice of AudioBuffer that encodeWav actually needs — kept
 * separate from the DOM type so the encoder is unit-testable with a plain
 * fake, no AudioContext/jsdom required (same pattern as AudioBus.ts's
 * AmplitudeSource). */
export interface DecodedAudio {
  numberOfChannels: number
  sampleRate: number
  length: number
  getChannelData(channel: number): Float32Array
}

/** Encodes decoded PCM audio as a 16-bit WAV Blob — the format needed to hand
 * TTS output to wawa-lipsync via an `<audio>` element, since it only accepts
 * an HTMLMediaElement, not a raw AudioBuffer. */
export function encodeWav(audio: DecodedAudio): Blob {
  const { numberOfChannels, sampleRate, length } = audio
  const bytesPerSample = 2
  const blockAlign = numberOfChannels * bytesPerSample
  const dataSize = length * blockAlign

  const view = new DataView(new ArrayBuffer(44 + dataSize))
  let offset = 0
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
    offset += s.length
  }
  const writeUint32 = (v: number) => {
    view.setUint32(offset, v, true)
    offset += 4
  }
  const writeUint16 = (v: number) => {
    view.setUint16(offset, v, true)
    offset += 2
  }

  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')
  writeString('fmt ')
  writeUint32(16) // fmt chunk size (16 = PCM)
  writeUint16(1) // format 1 = PCM
  writeUint16(numberOfChannels)
  writeUint32(sampleRate)
  writeUint32(sampleRate * blockAlign) // byte rate
  writeUint16(blockAlign)
  writeUint16(bytesPerSample * 8) // bits per sample
  writeString('data')
  writeUint32(dataSize)

  const channels: Float32Array[] = []
  for (let c = 0; c < numberOfChannels; c++) channels.push(audio.getChannelData(c))

  for (let frame = 0; frame < length; frame++) {
    for (let c = 0; c < numberOfChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][frame]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([view.buffer], { type: 'audio/wav' })
}
