/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAICORE_API_URL: string;
  readonly VITE_SYSTEM_CONTAINER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
