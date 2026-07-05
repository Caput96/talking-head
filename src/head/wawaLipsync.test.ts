import { describe, it, expect } from 'vitest'
import { encodeWav, type DecodedAudio } from './wawaLipsync'

function makeFakeAudio(samples: number[][], sampleRate = 24000): DecodedAudio {
  return {
    numberOfChannels: samples.length,
    sampleRate,
    length: samples[0].length,
    getChannelData: (channel) => new Float32Array(samples[channel]),
  }
}

describe('encodeWav', () => {
  it('produces a correctly sized RIFF/WAVE header for mono PCM16', async () => {
    const audio = makeFakeAudio([[0, 0.5, -0.5, 1, -1]])
    const blob = encodeWav(audio)

    const dataSize = audio.length * 2 // 1 channel * 2 bytes/sample
    expect(blob.size).toBe(44 + dataSize)

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const view = new DataView(bytes.buffer)
    const ascii = (offset: number, len: number) =>
      String.fromCharCode(...bytes.slice(offset, offset + len))

    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(ascii(12, 4)).toBe('fmt ')
    expect(ascii(36, 4)).toBe('data')
    expect(view.getUint16(22, true)).toBe(1) // numChannels
    expect(view.getUint32(24, true)).toBe(24000) // sampleRate
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
    expect(view.getUint32(40, true)).toBe(dataSize) // data chunk size
  })

  it('clamps out-of-range samples instead of wrapping', async () => {
    // Values beyond [-1, 1] shouldn't be possible from a real AudioBuffer, but
    // the encoder must not silently wrap them into noise if it ever happens.
    const audio = makeFakeAudio([[2, -2]])
    const blob = encodeWav(audio)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const view = new DataView(bytes.buffer)

    expect(view.getInt16(44, true)).toBe(0x7fff)
    expect(view.getInt16(46, true)).toBe(-0x8000)
  })

  it('interleaves multi-channel samples', async () => {
    const audio = makeFakeAudio([
      [1, 1],
      [-1, -1],
    ])
    const blob = encodeWav(audio)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const view = new DataView(bytes.buffer)

    expect(view.getInt16(44, true)).toBe(0x7fff) // left, frame 0
    expect(view.getInt16(46, true)).toBe(-0x8000) // right, frame 0
    expect(view.getInt16(48, true)).toBe(0x7fff) // left, frame 1
    expect(view.getInt16(50, true)).toBe(-0x8000) // right, frame 1
  })
})
