/**
 * kokoroVoices — a static copy of kokoro-js's built-in voice list.
 *
 * The real list only exists at runtime via an *instance* getter
 * (`KokoroTTS.prototype.voices`), reachable only after the ~86MB model has
 * loaded — kokoro-js doesn't export it as static data or a subpath. Copying
 * it here lets ui/TTSPanel.tsx populate a voice picker instantly, with no
 * network activity, before the model is ever downloaded (see
 * BrowserTTSProvider.ts's lazy `loadModel()`).
 *
 * Source: `node_modules/kokoro-js` v1.2.1 (`types/voices.d.ts` /
 * `dist/kokoro.web.js`). All 28 voices are English (`en-us` or `en-gb`) —
 * despite the Kokoro-82M model card advertising other languages, kokoro-js's
 * phonemization pipeline only implements these two (see ADR-002's "Future
 * direction" section). Re-copy this list by hand if kokoro-js is ever
 * upgraded and changes its voice set.
 */
export interface KokoroVoice {
  /** Passed straight through as TTSOptions.voice / GenerateOptions.voice. */
  id: string
  name: string
  language: 'en-us' | 'en-gb'
  gender: 'Female' | 'Male'
  /** kokoro-js's own quality rating: "A" (best) down to "F+". */
  grade: string
}

export const KOKORO_VOICES: readonly KokoroVoice[] = [
  { id: 'af_heart', name: 'Heart', language: 'en-us', gender: 'Female', grade: 'A' },
  { id: 'af_bella', name: 'Bella', language: 'en-us', gender: 'Female', grade: 'A-' },
  { id: 'af_nicole', name: 'Nicole', language: 'en-us', gender: 'Female', grade: 'B-' },
  { id: 'af_aoede', name: 'Aoede', language: 'en-us', gender: 'Female', grade: 'C+' },
  { id: 'af_kore', name: 'Kore', language: 'en-us', gender: 'Female', grade: 'C+' },
  { id: 'af_sarah', name: 'Sarah', language: 'en-us', gender: 'Female', grade: 'C+' },
  { id: 'af_nova', name: 'Nova', language: 'en-us', gender: 'Female', grade: 'C' },
  { id: 'af_sky', name: 'Sky', language: 'en-us', gender: 'Female', grade: 'C-' },
  { id: 'af_alloy', name: 'Alloy', language: 'en-us', gender: 'Female', grade: 'C' },
  { id: 'af_jessica', name: 'Jessica', language: 'en-us', gender: 'Female', grade: 'D' },
  { id: 'af_river', name: 'River', language: 'en-us', gender: 'Female', grade: 'D' },
  { id: 'am_fenrir', name: 'Fenrir', language: 'en-us', gender: 'Male', grade: 'C+' },
  { id: 'am_michael', name: 'Michael', language: 'en-us', gender: 'Male', grade: 'C+' },
  { id: 'am_puck', name: 'Puck', language: 'en-us', gender: 'Male', grade: 'C+' },
  { id: 'am_echo', name: 'Echo', language: 'en-us', gender: 'Male', grade: 'D' },
  { id: 'am_eric', name: 'Eric', language: 'en-us', gender: 'Male', grade: 'D' },
  { id: 'am_liam', name: 'Liam', language: 'en-us', gender: 'Male', grade: 'D' },
  { id: 'am_onyx', name: 'Onyx', language: 'en-us', gender: 'Male', grade: 'D' },
  { id: 'am_santa', name: 'Santa', language: 'en-us', gender: 'Male', grade: 'D-' },
  { id: 'am_adam', name: 'Adam', language: 'en-us', gender: 'Male', grade: 'F+' },
  { id: 'bf_emma', name: 'Emma', language: 'en-gb', gender: 'Female', grade: 'B-' },
  { id: 'bf_isabella', name: 'Isabella', language: 'en-gb', gender: 'Female', grade: 'C' },
  { id: 'bf_alice', name: 'Alice', language: 'en-gb', gender: 'Female', grade: 'D' },
  { id: 'bf_lily', name: 'Lily', language: 'en-gb', gender: 'Female', grade: 'D' },
  { id: 'bm_fable', name: 'Fable', language: 'en-gb', gender: 'Male', grade: 'C' },
  { id: 'bm_george', name: 'George', language: 'en-gb', gender: 'Male', grade: 'C' },
  { id: 'bm_lewis', name: 'Lewis', language: 'en-gb', gender: 'Male', grade: 'D+' },
  { id: 'bm_daniel', name: 'Daniel', language: 'en-gb', gender: 'Male', grade: 'D' },
]
