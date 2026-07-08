import { useEffect, useRef, useState } from 'react'
import { getAudioContext } from '../tts/audioContext'
import { ServerSTTProvider } from '../stt/ServerSTTProvider'
import type { STTCapabilities } from '../stt/STTProvider'
import './STTPanel.css'

// The local /server's base URL — shared with TTS (see createTTSProvider.ts):
// one process, two capabilities, same host:port.
const SERVER_URL = import.meta.env.VITE_TTS_SERVER_URL ?? 'http://localhost:8000'

// A short list of container formats to try, in preference order — the
// browser only supports a subset, and which one varies by browser (Chrome
// favors webm/opus, Safari favors mp4). `decodeAudioData` downstream can
// handle whatever we pick, so we just need *a* supported one.
const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

function pickMimeType(): string | undefined {
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
}

/**
 * STTPanel — plain DOM UI (not R3F/three), the mirror of TTSPanel: instead of
 * typing text and hearing audio, you record your voice and read back the
 * transcribed text.
 *
 * This is the FIRST place audio flows browser -> server (every TTS flow goes
 * the other way). The new browser APIs involved:
 *   - `getUserMedia({ audio: true })` — asks the user for mic permission and
 *     returns a live `MediaStream`.
 *   - `MediaRecorder` — captures that stream into compressed chunks (webm/
 *     opus or mp4, whatever the browser supports) while recording.
 *   - `AudioContext.decodeAudioData` — the same API ServerTTSProvider already
 *     uses for playback, here decoding the *recorded* Blob into an
 *     AudioBuffer, which is exactly what STTProvider.transcribe() expects.
 *
 * No STTProvider selection here (unlike createTTSProvider) — there is only
 * one implementation so far, ServerSTTProvider (see STTProvider.ts's doc
 * comment for why).
 */
export function STTPanel() {
  const [provider] = useState(() => new ServerSTTProvider(SERVER_URL))
  const [caps, setCaps] = useState<STTCapabilities | null>(null)
  const [language, setLanguage] = useState('auto')
  const [isRecording, setIsRecording] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // MediaRecorder + the chunks it's collecting live across renders but never
  // need to trigger one themselves — refs, not state.
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    let cancelled = false
    provider.getCapabilities().then(
      (c) => {
        if (cancelled) return
        setCaps(c)
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

  async function handleToggleRecording() {
    if (isRecording) {
      recorderRef.current?.stop() // onstop (below) does the rest
      return
    }

    setError(null)
    setTranscript(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        // Done with the mic — release it (stops the browser's recording
        // indicator) regardless of how transcription turns out below.
        for (const track of stream.getTracks()) track.stop()
        void handleStopped(new Blob(chunksRef.current, { type: recorder.mimeType }))
      }

      recorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleStopped(blob: Blob) {
    setIsRecording(false)
    setIsBusy(true)
    try {
      const audioContext = getAudioContext()
      const audio = await audioContext.decodeAudioData(await blob.arrayBuffer())
      const result = await provider.transcribe(audio, {
        language: caps?.languages.length ? language : undefined,
      })
      setTranscript(result.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsBusy(false)
    }
  }

  const languages = caps?.languages ?? []

  return (
    <div className="stt-panel">
      {languages.length > 0 && (
        <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isRecording || isBusy}>
          {languages.map((code) => (
            <option key={code} value={code}>
              {code.charAt(0).toUpperCase() + code.slice(1)}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className={isRecording ? 'recording' : undefined}
        onClick={handleToggleRecording}
        disabled={isBusy}
      >
        {isRecording ? 'Stop' : isBusy ? 'Transcribing…' : 'Record'}
      </button>
      {transcript && <p className="stt-panel-transcript">{transcript}</p>}
      {error && <p className="stt-panel-error">{error}</p>}
    </div>
  )
}
