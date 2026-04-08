/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_AI_CHAT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
