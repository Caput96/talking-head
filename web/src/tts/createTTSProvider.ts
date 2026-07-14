import { BrowserTTSProvider } from './BrowserTTSProvider'
import { ServerTTSProvider } from './ServerTTSProvider'
import type { TTSProvider } from './TTSProvider'

/**
 * createTTSProvider — picks which TTSProvider the app uses, from build/dev-time
 * config (ADR-004 §3: transport "chosen from config").
 *
 * - VITE_TTS_PROVIDER=server → ServerTTSProvider, talking to the local /server
 *   (needs `pnpm dev:server` running).
 * - anything else / unset → BrowserTTSProvider (Kokoro in-browser), the
 *   zero-setup default that works with no server at all.
 *
 * Selection happens here, once, so nothing else in the app knows or cares which
 * provider is live — the whole point of the TTSProvider seam (ADR-001).
 */
export function createTTSProvider(): TTSProvider {
  const mode = import.meta.env.VITE_TTS_PROVIDER ?? 'browser'
  if (mode === 'server') {
    const baseUrl = import.meta.env.VITE_TTS_SERVER_URL ?? 'http://localhost:8000'
    return new ServerTTSProvider(baseUrl)
  }
  return new BrowserTTSProvider()
}
