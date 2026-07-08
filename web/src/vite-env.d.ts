/// <reference types="vite/client" />

/**
 * Types for this app's custom Vite env vars (the `VITE_`-prefixed ones Vite
 * exposes to client code via `import.meta.env`). Without this augmentation Vite
 * types unknown keys as `any`; declaring them here gives `createTTSProvider.ts`
 * real types. Values are always `string | undefined` — env vars are strings,
 * and may be absent (we default them in code). Set them in web/.env.local.
 */
interface ImportMetaEnv {
  /** 'server' selects ServerTTSProvider; anything else → BrowserTTSProvider. */
  readonly VITE_TTS_PROVIDER?: string
  /** Base URL of the local /server (defaults to http://localhost:8000). */
  readonly VITE_TTS_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
