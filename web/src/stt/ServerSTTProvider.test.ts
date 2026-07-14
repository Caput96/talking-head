import { describe, expect, it, vi } from 'vitest'

const { ServerSTTProvider } = await import('./ServerSTTProvider')

// A minimal AudioBuffer stand-in — same duck-typing approach as
// encodeWav.test.ts, since there's no jsdom/real Web Audio in this project's
// test setup.
function fakeAudioBuffer() {
  return {
    numberOfChannels: 1,
    length: 4,
    sampleRate: 24000,
    getChannelData: () => new Float32Array([0, 0.5, -0.5, 1]),
  } as unknown as AudioBuffer
}

describe('ServerSTTProvider', () => {
  it('POSTs the encoded WAV to /transcribe with the language as a query param', async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL, _init: RequestInit) =>
        new Response(JSON.stringify({ text: 'hello there', language: 'english' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ServerSTTProvider('http://localhost:8000')
    const result = await provider.transcribe(fakeAudioBuffer(), { language: 'english' })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://localhost:8000/transcribe?language=english')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'content-type': 'audio/wav' })
    // Body is the WAV bytes (a real RIFF header), not JSON.
    const body = init.body as ArrayBuffer
    expect(new Uint8Array(body).slice(0, 4)).toEqual(new Uint8Array([0x52, 0x49, 0x46, 0x46])) // "RIFF"

    expect(result).toEqual({ text: 'hello there', language: 'english' })

    vi.unstubAllGlobals()
  })

  it('omits the language query param when no language hint is given', async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL) => new Response(JSON.stringify({ text: 'hi', language: null }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ServerSTTProvider('http://localhost:8000')
    const result = await provider.transcribe(fakeAudioBuffer())

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://localhost:8000/transcribe')
    expect(result).toEqual({ text: 'hi', language: undefined })

    vi.unstubAllGlobals()
  })

  it('throws on a non-OK response', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500, statusText: 'Server Error' }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ServerSTTProvider('http://localhost:8000')
    await expect(provider.transcribe(fakeAudioBuffer())).rejects.toThrow('500')

    vi.unstubAllGlobals()
  })

  it('fetches /stt/capabilities and returns the language list', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ languages: ['auto', 'italian'] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ServerSTTProvider('http://localhost:8000')
    const caps = await provider.getCapabilities()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/stt/capabilities')
    expect(caps.languages).toEqual(['auto', 'italian'])

    vi.unstubAllGlobals()
  })
})
