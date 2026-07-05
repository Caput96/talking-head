import { getAudioContext } from '../tts/audioContext'

/**
 * AmplitudeSource — the narrow interface LipSyncSource actually depends on
 * (sources/LipSyncSource.ts). Kept separate from the concrete AudioBus class
 * so lip-sync can be unit-tested with a plain fake, no Web Audio API/jsdom
 * required (this project has neither in its test environment).
 */
export interface AmplitudeSource {
  getRms(): number
}

/**
 * AudioBus — exposes the current loudness (RMS) of whatever's playing
 * through it, via a Web Audio AnalyserNode. LipSyncSource polls
 * `getRms()` directly inside its per-frame `update()` (see
 * sources/LipSyncSource.ts) rather than through Zustand, even though
 * ADR-001 §5 originally sketched a store-based bus — a value that changes
 * every frame has no reason to go through React state if nothing in React
 * needs to re-render on it; that's the same reason MorphEngine's positions
 * buffer isn't store-backed either. See ADR-001's addendum to §5.
 *
 * A lazy singleton, same shape as tts/audioContext.ts's getAudioContext():
 * one analyser tap point shared by whatever TTS audio is currently playing.
 */
export class AudioBus implements AmplitudeSource {
  private readonly analyser: AnalyserNode
  private readonly timeDomainData: Float32Array<ArrayBuffer>

  constructor(context: AudioContext) {
    this.analyser = context.createAnalyser()
    // Passes audio through unchanged — analysing it shouldn't silence it.
    this.analyser.connect(context.destination)
    this.timeDomainData = new Float32Array(this.analyser.fftSize)
  }

  /** Route a playing source through the analyser instead of straight to
   * the destination — see ui/TTSPanel.tsx. */
  connect(source: AudioNode): void {
    source.connect(this.analyser)
  }

  /** Root-mean-square amplitude of the last analysis window, ~0 when
   * nothing is playing. Not smoothed — callers that need smooth motion
   * (LipSyncSource) apply their own attack/release envelope. */
  getRms(): number {
    this.analyser.getFloatTimeDomainData(this.timeDomainData)
    let sumSquares = 0
    for (const sample of this.timeDomainData) sumSquares += sample * sample
    return Math.sqrt(sumSquares / this.timeDomainData.length)
  }
}

let bus: AudioBus | null = null

export function getAudioBus(): AudioBus {
  if (!bus) bus = new AudioBus(getAudioContext())
  return bus
}
