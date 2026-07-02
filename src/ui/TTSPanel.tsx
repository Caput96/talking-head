import { useState } from 'react'
import { BrowserTTSProvider } from '../tts/BrowserTTSProvider'
import { getAudioContext } from '../tts/audioContext'
import './TTSPanel.css'

/**
 * TTSPanel — plain DOM UI (not R3F/three), rendered *outside* <Canvas> in
 * App.tsx, like ShapeSwitcher/OcclusionToggle. A minimal proof that
 * TTSProvider works end-to-end: type text, hear it spoken. Doesn't move the
 * head yet — wiring synthesized audio into MorphSource/LipSyncSource is
 * Phase 5's job (see ADR-001 §5's AudioBus).
 */
export function TTSPanel() {
  // Lazy useState, not a plain `new BrowserTTSProvider()`: keeps one instance
  // (and its memoized model) alive for the component's lifetime rather than
  // recreating it — and matches the lazy-init pattern core/useMorphEngine.ts
  // already uses elsewhere in this codebase.
  const [provider] = useState(() => new BrowserTTSProvider())
  const [text, setText] = useState('Hello, I am a talking head.')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSpeak() {
    if (isBusy || !text.trim()) return
    setIsBusy(true)
    setError(null)
    try {
      const result = await provider.synthesize(text)
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
      <button type="button" onClick={handleSpeak} disabled={isBusy}>
        {isBusy ? 'Loading voice...' : 'Speak'}
      </button>
      {error && <p className="tts-panel-error">{error}</p>}
    </div>
  )
}
