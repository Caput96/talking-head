/**
 * encodeWav — AudioBuffer -> 16-bit PCM WAV bytes.
 *
 * The client-side mirror of server/app/audio.py's `encode_wav`, but running in
 * the opposite direction of everything TTS does: this is the first place /web
 * sends audio TO the server rather than decoding audio FROM it. The server
 * only understands plain WAV (see ServerSTTProvider's doc comment for why), so
 * whatever codec the mic recorded in gets decoded to an AudioBuffer first
 * (Web Audio's `decodeAudioData`, the same API ServerTTSProvider already uses)
 * and re-encoded here before the POST.
 */
export function encodeWav(audio: AudioBuffer): ArrayBuffer {
  // Mono: average all channels down to one, since the server (and Whisper,
  // eventually) only ever wants a single channel.
  const length = audio.length
  const mono = new Float32Array(length)
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    const data = audio.getChannelData(ch)
    for (let i = 0; i < length; i++) mono[i] += data[i] / audio.numberOfChannels
  }

  const sampleRate = audio.sampleRate
  const bytesPerSample = 2 // 16-bit PCM
  const dataSize = length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true) // byte rate
  view.setUint16(32, bytesPerSample, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Same clip-then-scale as the server's encode_wav: *32767 (not 32768) keeps
  // +1.0 in range and symmetric with -1.0 -> -32767.
  let offset = 44
  for (let i = 0; i < length; i++) {
    const clipped = Math.max(-1, Math.min(1, mono[i]))
    view.setInt16(offset, clipped * 32767, true)
    offset += 2
  }

  return buffer
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}
