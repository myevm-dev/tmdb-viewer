/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMDB_API_KEY?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_CLANKER_API?: string;
  readonly VITE_PLATFORM_FEE_RECIPIENT?: string;
  readonly VITE_PLATFORM_FEE_BPS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
