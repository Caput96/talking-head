/**
 * audioContext — one shared, lazily-created Web Audio `AudioContext`.
 *
 * Browsers refuse to actually run an `AudioContext` until it's created (or
 * resumed) from inside a user-gesture call stack, like a click handler —
 * creating one eagerly at module load would just leave it stuck "suspended".
 * So this exports a getter, not an instance: callers must invoke it from
 * inside the gesture that's supposed to trigger sound (see ui/TTSPanel.tsx).
 * It's a singleton because a page should only ever need one output device.
 */
let context: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!context) context = new AudioContext()
  return context
}
