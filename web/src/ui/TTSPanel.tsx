import { useState } from 'react'
import { BrowserTTSProvider } from '../tts/BrowserTTSProvider'
import { getWawaLipsync } from '../head/wawaLipsync'
import { KOKORO_VOICES } from '../tts/kokoroVoices'
import './TTSPanel.css'

const LANGUAGE_LABELS = { 'en-us': 'American English', 'en-gb': 'British English' } as const

/**
 * TTSPanel — plain DOM UI (not R3F/three), rendered *outside* <Canvas> in
 * App.tsx, like ShapeSwitcher/FillToggle. A minimal proof that
 * TTSProvider works end-to-end: type text, pick a voice, hear it spoken.
 *
 * Playback is routed through the wawa-lipsync bridge (head/wawaLipsync.ts),
 * not straight to the speakers, so its real-time viseme analysis can drive
 * the GLB head's mouth (see head/HeadGLB.tsx) while audio plays — that
 * bridge owns its own audio graph and destination (see its doc comment),
 * so it's the ONLY thing that plays this AudioBuffer; nothing else may also
 * play it or the utterance would sound doubled. TTSPanel doesn't know or
 * care which shape is currently selected — same shape-agnostic design as
 * the rest of the TTS/lip-sync pipeline (ADR-001).
 *
 * The voice picker only offers English voices/accents, not languages — see
 * tts/kokoroVoices.ts's doc comment for why kokoro-js doesn't support the
 * other languages the Kokoro model card advertises.
 */
export function TTSPanel() {
  // Lazy useState, not a plain `new BrowserTTSProvider()`: keeps one instance
  // (and its memoized model) alive for the component's lifetime rather than
  // recreating it — and matches the lazy-init pattern core/useMorphEngine.ts
  // already uses elsewhere in this codebase.
  const [provider] = useState(() => new BrowserTTSProvider())
  const [text, setText] = useState('Hello, I am a talking head.')
  const [voice, setVoice] = useState(KOKORO_VOICES[0].id)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSpeak() {
    if (isBusy || !text.trim()) return
    setIsBusy(true)
    setError(null)
    try {
      const result = await provider.synthesize(text, { voice })
      getWawaLipsync().play(result.audio)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="tts-panel">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Text to speak..."
      />
      <select value={voice} onChange={(e) => setVoice(e.target.value)}>
        {Object.entries(LANGUAGE_LABELS).map(([language, label]) => (
          <optgroup key={language} label={label}>
            {KOKORO_VOICES.filter((v) => v.language === language).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.gender} — {v.grade}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button type="button" onClick={handleSpeak} disabled={isBusy}>
        {isBusy ? 'Loading voice...' : 'Speak'}
      </button>
      {error && <p className="tts-panel-error">{error}</p>}
    </div>
  )
}
