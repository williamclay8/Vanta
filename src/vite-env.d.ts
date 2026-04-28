/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_SOLANA_READ_RPC_FALLBACK_URLS?: string;
  readonly VITE_SOLANA_WS_URL?: string;
  readonly VITE_VANTA_DEVNET_TOKEN_MINT?: string;
  readonly VITE_VANTA_DEVNET_VAULT_OWNER?: string;
  readonly VITE_VANTA_DEVNET_TOKEN_NAME?: string;
  readonly VITE_VANTA_UNSHIELD_OPERATOR_URL?: string;
  readonly VITE_VANTA_SWAP_OPERATOR_URL?: string;
  readonly VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL?: string;
  readonly VITE_VANTA_METEORA_DLMM_POOL_ADDRESS?: string;
  readonly VITE_VANTA_ENABLE_PEER_ONRAMP?: string;
  readonly VITE_VANTA_ENABLE_LIVE_PEER_FUNDING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
