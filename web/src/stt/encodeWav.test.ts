import { describe, expect, it } from 'vitest'
import { encodeWav } from './encodeWav'

// No jsdom in this project's test setup — build a plain object matching just
// the AudioBuffer shape encodeWav actually reads (numberOfChannels, length,
// sampleRate, getChannelData), rather than a real AudioBuffer.
function fakeAudioBuffer(channels: Float32Array[], sampleRate: number) {
  return {
    numberOfChannels: channels.length,
    length: channels[0].length,
    sampleRate,
    getChannelData: (ch: number) => channels[ch],
  } as unknown as AudioBuffer
}

describe('encodeWav', () => {
  it('writes a valid RIFF/WAVE header sized for the sample count', () => {
    const audio = fakeAudioBuffer([new Float32Array([0, 0.5, -0.5, 1, -1])], 24000)

    const wav = encodeWav(audio)
    const view = new DataView(wav)
    const text = (offset: number, len: number) =>
      String.fromCharCode(...new Uint8Array(wav, offset, len))

    expect(text(0, 4)).toBe('RIFF')
    expect(text(8, 4)).toBe('WAVE')
    expect(text(12, 4)).toBe('fmt ')
    expect(text(36, 4)).toBe('data')
    expect(view.getUint32(24, true)).toBe(24000) // sample rate
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(wav.byteLength).toBe(44 + 5 * 2)
  })

  it('scales float samples to int16 PCM, clipping to [-1, 1]', () => {
    const audio = fakeAudioBuffer([new Float32Array([0, 1, -1, 2, -2])], 16000)

    const view = new DataView(encodeWav(audio))
    const sampleAt = (i: number) => view.getInt16(44 + i * 2, true)

    expect(sampleAt(0)).toBe(0)
    expect(sampleAt(1)).toBe(32767)
    expect(sampleAt(2)).toBe(-32767)
    expect(sampleAt(3)).toBe(32767) // clipped from 2
    expect(sampleAt(4)).toBe(-32767) // clipped from -2
  })

  it('averages multiple channels down to mono', () => {
    const audio = fakeAudioBuffer(
      [new Float32Array([1, 0]), new Float32Array([0, 1])],
      8000,
    )

    const view = new DataView(encodeWav(audio))
    expect(view.getUint16(22, true)).toBe(1) // still declared mono
    expect(view.getInt16(44, true)).toBe(Math.trunc(0.5 * 32767))
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.5 * 32767))
  })
})
