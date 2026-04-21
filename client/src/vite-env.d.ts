/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_AI_CHAT?: string;
  readonly VITE_ENABLE_WORK_LOG_MIC_TEST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
