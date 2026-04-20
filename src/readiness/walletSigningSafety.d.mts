export type VantaWalletSigningSafetyPolicy = {
  blockedActions: string[];
  defaultCluster: "devnet-or-localnet";
  liveMainnetSubmissionEnabled: false;
  mainnetReady: false;
  neverStorePrivateKeys: boolean;
  releaseGateCommands: string[];
  requiredSummaryFields: string[];
  requiresExplicitHumanApproval: boolean;
  requiresSimulationBeforeSignature: boolean;
  requiresTransactionSummaryBeforeSignature: boolean;
  version: "vanta-wallet-signing-safety-0.1";
};

export function createVantaWalletSigningSafetyPolicy(): VantaWalletSigningSafetyPolicy;
