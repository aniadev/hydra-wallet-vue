/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

interface ImportMetaEnv {
  readonly NODE_ENV: string
  readonly VITE_APP_BASE_API: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
