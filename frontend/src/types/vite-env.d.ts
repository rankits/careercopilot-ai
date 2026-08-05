/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  readonly VITE_ASSISTED_APPLY_PHASE1_UI?: string;
  readonly VITE_ASSISTED_APPLY_WORKSPACE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
