import { KokoroTTS } from 'kokoro-js'
import type { GenerateOptions } from 'kokoro-js'
import { getAudioContext } from './audioContext'
import { KOKORO_VOICES } from './kokoroVoices'
import type { TTSCapabilities, TTSOptions, TTSProvider, TTSResult } from './TTSProvider'

// See ADR-002: Kokoro chosen for voice quality. "q8" quantization trades a
// little quality for a much smaller download (~86MB) than the fp32 default.
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const DEFAULT_VOICE = 'af_heart'

// Group heading per Kokoro accent. Kokoro has no separate language control — the
// accent rides on the chosen voice — so getCapabilities() reports no languages.
const ACCENT_LABELS: Record<string, string> = {
  'en-us': 'American English',
  'en-gb': 'British English',
}

/**
 * BrowserTTSProvider — the TTSProvider implementation backed by Kokoro,
 * running fully client-side via kokoro-js (Transformers.js/onnxruntime-web).
 */
export class BrowserTTSProvider implements TTSProvider {
  private modelPromise: Promise<KokoroTTS> | null = null

  async synthesize(text: string, opts?: TTSOptions): Promise<TTSResult> {
    // Must run before any `await` below, so it stays inside the caller's
    // user-gesture call stack (see tts/audioContext.ts) — otherwise the
    // AudioContext created here would be born "suspended" and never play.
    const audioContext = getAudioContext()

    const model = await this.loadModel()
    const rawAudio = await model.generate(text, {
      // TTSOptions.voice is a plain string — an engine-agnostic contract
      // shouldn't know about Kokoro's specific voice id union. Casting here,
      // at the concrete-provider boundary, is this adapter's job.
      voice: (opts?.voice ?? DEFAULT_VOICE) as GenerateOptions['voice'],
      speed: opts?.speed,
    })

    const audioBuffer = audioContext.createBuffer(
      1, // Kokoro outputs mono audio.
      rawAudio.audio.length,
      rawAudio.sampling_rate,
    )
    // Re-wrap: rawAudio.audio's backing buffer is typed ArrayBufferLike
    // (could in principle be a SharedArrayBuffer), but copyToChannel requires
    // a plain ArrayBuffer-backed Float32Array — this guarantees that.
    audioBuffer.copyToChannel(new Float32Array(rawAudio.audio), 0)

    // No phoneme timings from kokoro-js — see TTSProvider.ts's PhonemeTiming
    // doc comment for why that's fine for now.
    return { audio: audioBuffer, timings: [] }
  }

  // The static Kokoro voice list (tts/kokoroVoices.ts), normalized for the
  // picker. Synchronous data, wrapped in a resolved Promise to satisfy the
  // provider-agnostic (possibly async) contract. No language control — Kokoro's
  // accent is part of the voice.
  getCapabilities(): Promise<TTSCapabilities> {
    return Promise.resolve({
      voices: KOKORO_VOICES.map((v) => ({
        id: v.id,
        label: `${v.name} — ${v.gender} — ${v.grade}`,
        group: ACCENT_LABELS[v.language] ?? v.language,
      })),
      languages: [],
      supportsInstruct: false, // Kokoro has no tone/style prompt
    })
  }

  // Loads the model at most once, on first use, and memoizes the in-flight
  // promise so concurrent synthesize() calls don't trigger duplicate
  // downloads — the model is tens of MB and only needed once per session.
  private loadModel(): Promise<KokoroTTS> {
    if (!this.modelPromise) {
      this.modelPromise = KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'wasm' })
    }
    return this.modelPromise
  }
}
