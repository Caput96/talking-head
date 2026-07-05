import { beforeEach, describe, expect, it, vi } from 'vitest'

// kokoro-js downloads a real ONNX model over the network — mocked here so
// tests stay fast and offline. Mirrors just the shape BrowserTTSProvider
// actually uses (`from_pretrained`, `generate`).
const fromPretrained = vi.fn()
vi.mock('kokoro-js', () => ({
  KokoroTTS: { from_pretrained: (...args: unknown[]) => fromPretrained(...args) },
}))

// No jsdom in this project's test setup (see other core/* tests, which are
// DOM-free) — the real Web Audio API isn't available, so audioContext.ts's
// singleton is mocked with a fake `createBuffer` that just records its
// arguments, matching what BrowserTTSProvider actually needs from it.
const createBuffer = vi.fn((channels: number, length: number, sampleRate: number) => ({
  channels,
  length,
  sampleRate,
  copyToChannel: vi.fn(),
}))
vi.mock('./audioContext', () => ({
  getAudioContext: () => ({ createBuffer }),
}))

const { BrowserTTSProvider } = await import('./BrowserTTSProvider')

describe('BrowserTTSProvider', () => {
  beforeEach(() => {
    fromPretrained.mockClear()
    createBuffer.mockClear()
    fromPretrained.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({
        audio: new Float32Array([0.1, 0.2, 0.3]),
        sampling_rate: 24000,
      }),
    })
  })

  it('returns a TTSResult built from the model output, with empty timings', async () => {
    const provider = new BrowserTTSProvider()

    const result = await provider.synthesize('hello')

    expect(createBuffer).toHaveBeenCalledWith(1, 3, 24000)
    expect(result.audio).toMatchObject({ length: 3, sampleRate: 24000 })
    expect(result.timings).toEqual([])
  })

  it('loads the model at most once across multiple synthesize() calls', async () => {
    const provider = new BrowserTTSProvider()

    await provider.synthesize('one')
    await provider.synthesize('two')

    expect(fromPretrained).toHaveBeenCalledTimes(1)
  })
})
