/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Build version stamped in by vite.config.ts; "dev" for an unstamped build. */
declare const __APP_VERSION__: string;

/** Build commit stamped in by vite.config.ts; empty for an unstamped build. */
declare const __APP_COMMIT__: string;
