import { useEffect, useState } from 'react'
import { createTTSProvider } from '../tts/createTTSProvider'
import { getWawaLipsync } from '../head/wawaLipsync'
import type { TTSCapabilities, TTSVoice } from '../tts/TTSProvider'
import './TTSPanel.css'

/**
 * TTSPanel — plain DOM UI (not R3F/three), rendered *outside* <Canvas> in
 * App.tsx, like ShapeSwitcher/FillToggle. Type text, pick a voice (and, when the
 * provider supports it, a language), hear it spoken.
 *
 * The voice + language options come from `provider.getCapabilities()`, so the
 * panel is provider-agnostic (ADR-001): browser mode lists Kokoro's voices
 * (grouped by accent, no language control); server mode lists whatever speakers
 * and languages the server's model advertises. Nothing here is hardcoded to a
 * specific engine.
 *
 * Playback is routed through the wawa-lipsync bridge (head/wawaLipsync.ts), the
 * ONLY thing that plays this AudioBuffer, so its viseme analysis can drive the
 * GLB head's mouth (head/HeadGLB.tsx) — see that bridge's doc comment.
 */
export function TTSPanel() {
  // Lazy useState keeps one provider instance (and, for browser, its memoized
  // model) alive for the component's lifetime. Which concrete provider this is
  // (browser vs server) is decided by config in createTTSProvider; the panel
  // only talks to the seam.
  const [provider] = useState(() => createTTSProvider())
  const [text, setText] = useState('Hello, I am a talking head.')
  const [caps, setCaps] = useState<TTSCapabilities | null>(null)
  const [voice, setVoice] = useState('')
  const [language, setLanguage] = useState('auto')
  const [instruct, setInstruct] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load the provider's voices/languages once. In server mode this hits the
  // server (which lazy-loads its model), so the picker shows a loading state
  // until it resolves. Seed the selected voice/language from the results.
  useEffect(() => {
    let cancelled = false
    provider.getCapabilities().then(
      (c) => {
        if (cancelled) return
        setCaps(c)
        if (c.voices.length) setVoice(c.voices[0].id)
        if (c.languages.length) setLanguage(c.languages.includes('auto') ? 'auto' : c.languages[0])
      },
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider])

  async function handleSpeak() {
    if (isBusy || !text.trim()) return
    setIsBusy(true)
    setError(null)
    try {
      const result = await provider.synthesize(text, {
        voice: voice || undefined,
        // Only send a language when the provider actually offers the control.
        language: caps?.languages.length ? language : undefined,
        // Only send a tone prompt when this provider/model honors it.
        instruct: caps?.supportsInstruct ? instruct || undefined : undefined,
      })
      getWawaLipsync().play(result.audio)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsBusy(false)
    }
  }

  const voices = caps?.voices ?? []
  const languages = caps?.languages ?? []
  const loadingCaps = caps === null && error === null

  return (
    <div className="tts-panel">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Text to speak..."
      />
      <select
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        disabled={loadingCaps || voices.length === 0}
      >
        {loadingCaps ? (
          <option>Loading voices…</option>
        ) : (
          renderVoiceOptions(voices)
        )}
      </select>
      {languages.length > 0 && (
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          {languages.map((code) => (
            <option key={code} value={code}>
              {titleCase(code)}
            </option>
          ))}
        </select>
      )}
      {caps?.supportsInstruct && (
        <input
          type="text"
          value={instruct}
          onChange={(e) => setInstruct(e.target.value)}
          placeholder="Voice tone (e.g. cheerful and energetic)"
          aria-label="Voice tone"
        />
      )}
      <button type="button" onClick={handleSpeak} disabled={isBusy || loadingCaps}>
        {isBusy ? 'Speaking…' : 'Speak'}
      </button>
      {error && <p className="tts-panel-error">{error}</p>}
    </div>
  )
}

/** Render voices as flat <option>s, or as <optgroup>s when they carry `group`
 * (Kokoro's accent headings) — preserving first-seen group order. */
function renderVoiceOptions(voices: TTSVoice[]) {
  if (!voices.some((v) => v.group)) {
    return voices.map((v) => (
      <option key={v.id} value={v.id}>
        {v.label}
      </option>
    ))
  }
  const groups: string[] = []
  for (const v of voices) {
    const g = v.group ?? ''
    if (!groups.includes(g)) groups.push(g)
  }
  return groups.map((g) => (
    <optgroup key={g} label={g}>
      {voices
        .filter((v) => (v.group ?? '') === g)
        .map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
    </optgroup>
  ))
}

function titleCase(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1)
}
