export type VantaWalletLiveSendSignatureKind =
  | "transaction-signature"
  | "message-intent-signature"
  | "wallet-adapter-boundary";

export type VantaWalletLiveSendCallSite = {
  label: string;
  signatureKind: VantaWalletLiveSendSignatureKind;
  snippet: string;
};

export type VantaWalletLiveSendActionSurface = {
  currentCallSites: VantaWalletLiveSendCallSite[];
  file: string;
  page: string;
  replacement: string;
  status: "requires-wallet-backed-simulation-gate";
};

export type VantaWalletLiveSendInventory = {
  actionSurfaces: VantaWalletLiveSendActionSurface[];
  mainnetReady: false;
  messageIntentPolicy: {
    note: string;
    requiredSequence: string[];
  };
  productionReady: false;
  replacementRequired: true;
  requiredReplacementSequence: string[];
  version: "vanta-wallet-live-send-inventory-0.1";
};

export function createWalletLiveSendInventory(): VantaWalletLiveSendInventory;
