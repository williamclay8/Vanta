import { readFileSync } from "node:fs";

const evidencePath = new URL("../../ops/mainnet/wallet-signing-safety.evidence.json", import.meta.url);

export function createVantaWalletSigningStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  return {
    browserVerificationCluster: evidence.browserVerificationCluster,
    browserVerificationMode: evidence.browserVerificationMode,
    browserVerifiedProtocolPages: evidence.browserVerifiedProtocolPages,
    checkedEvidenceRef: "ops/mainnet/wallet-signing-safety.evidence.json",
    deploymentTruth: evidence.deploymentTruth,
    localBrowserVerificationOnly: evidence.localBrowserVerificationOnly,
    liveMainnetSubmissionEnabled: evidence.liveMainnetSubmissionEnabled,
    liveSendInventoryRef: evidence.liveSendInventoryRef,
    mainnetReady: false,
    mainnetSubmissionExplicitlyBlocked: evidence.mainnetSubmissionExplicitlyBlocked,
    messageIntentPages: evidence.messageIntentPages,
    nextOperatorAction: evidence.nextOperatorAction,
    productionReady: false,
    productionBrowserVerificationAvailable: evidence.productionBrowserVerificationAvailable,
    productionBrowserVerificationStatus: evidence.productionBrowserVerificationStatus,
    protocolPagesWithSafeSendAdoption: evidence.protocolPagesWithSafeSendAdoption,
    requiresExplicitHumanApproval: evidence.requiresExplicitHumanApproval,
    requiresSimulationBeforeSignature: evidence.requiresSimulationBeforeSignature,
    requiresTransactionSummaryBeforeSignature: evidence.requiresTransactionSummaryBeforeSignature,
    signingSafetyPolicyRef: evidence.signingSafetyPolicyRef,
    statusRef: evidence.lastStatusRef,
    umbraAdapterGateStatus: evidence.umbraAdapterGateStatus,
    umbraAdapterSummaryBindingRequired: evidence.umbraAdapterSummaryBindingRequired,
    version: "vanta-production-wallet-signing-summary-0.1",
  };
}
