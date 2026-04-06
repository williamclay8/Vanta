/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_SOLANA_WS_URL?: string;
  readonly VITE_VANTA_DEVNET_TOKEN_MINT?: string;
  readonly VITE_VANTA_DEVNET_VAULT_OWNER?: string;
  readonly VITE_VANTA_DEVNET_TOKEN_NAME?: string;
  readonly VITE_VANTA_UNSHIELD_OPERATOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
