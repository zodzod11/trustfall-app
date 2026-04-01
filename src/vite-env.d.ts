/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: string
  /** Optional absolute URL for POST match run (defaults to `/api/match-run`). */
  readonly VITE_MATCH_ENGINE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
