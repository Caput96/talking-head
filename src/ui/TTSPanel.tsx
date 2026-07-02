import { useState } from 'react'
import { BrowserTTSProvider } from '../tts/BrowserTTSProvider'
import { getAudioContext } from '../tts/audioContext'
import { KOKORO_VOICES } from '../tts/kokoroVoices'
import './TTSPanel.css'

const LANGUAGE_LABELS = { 'en-us': 'American English', 'en-gb': 'British English' } as const

/**
 * TTSPanel — plain DOM UI (not R3F/three), rendered *outside* <Canvas> in
 * App.tsx, like ShapeSwitcher/OcclusionToggle. A minimal proof that
 * TTSProvider works end-to-end: type text, pick a voice, hear it spoken.
 * Doesn't move the head yet — wiring synthesized audio into
 * MorphSource/LipSyncSource is Phase 5's job (see ADR-001 §5's AudioBus).
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
      const source = getAudioContext().createBufferSource()
      source.buffer = result.audio
      source.connect(getAudioContext().destination)
      source.start()
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
