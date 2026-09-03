/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NVIDIA_API_KEY?: string;
  readonly VITE_NVIDIA_BASE_URL?: string;
  readonly VITE_NVIDIA_CHAT_MODEL?: string;
  readonly VITE_NVIDIA_EMBED_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
