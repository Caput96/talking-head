import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// No jsdom / real Web Audio here (same as BrowserTTSProvider.test.ts): mock the
// AudioContext singleton with just the one method ServerTTSProvider uses,
// decodeAudioData, returning a fake AudioBuffer.
const decodeAudioData = vi.fn(async (bytes: ArrayBuffer) => ({
  fakeDecodedFrom: bytes.byteLength,
}))
vi.mock('./audioContext', () => ({
  getAudioContext: () => ({ decodeAudioData }),
}))

const { ServerTTSProvider } = await import('./ServerTTSProvider')

describe('ServerTTSProvider', () => {
  beforeEach(() => {
    decodeAudioData.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs text+options to /synthesize and decodes the WAV response', async () => {
    const wav = new ArrayBuffer(2048)
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(wav, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ServerTTSProvider('http://localhost:8000')
    const result = await provider.synthesize('hello', {
      voice: 'x',
      speed: 1.5,
      language: 'italian',
      instruct: 'cheerful',
    })

    // Correct URL, method, and JSON body carrying text + options.
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8000/synthesize')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      text: 'hello',
      voice: 'x',
      speed: 1.5,
      language: 'italian',
      instruct: 'cheerful',
    })

    // Response bytes are decoded into the AudioBuffer; timings stay empty.
    expect(decodeAudioData).toHaveBeenCalledOnce()
    expect(result.audio).toMatchObject({ fakeDecodedFrom: 2048 })
    expect(result.timings).toEqual([])
  })

  it('throws on a non-OK response instead of decoding', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500, statusText: 'Server Error' }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ServerTTSProvider('http://localhost:8000')

    await expect(provider.synthesize('hello')).rejects.toThrow('500')
    expect(decodeAudioData).not.toHaveBeenCalled()
  })

  it('fetches /capabilities and normalizes names into voices + languages', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ voices: ['serena', 'uncle_fu'], languages: ['auto', 'italian'], instruct: true }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ServerTTSProvider('http://localhost:8000')
    const caps = await provider.getCapabilities()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/capabilities')
    expect(caps.voices).toEqual([
      { id: 'serena', label: 'Serena' },
      { id: 'uncle_fu', label: 'Uncle Fu' },
    ])
    expect(caps.languages).toEqual(['auto', 'italian'])
    expect(caps.supportsInstruct).toBe(true)
  })
})
