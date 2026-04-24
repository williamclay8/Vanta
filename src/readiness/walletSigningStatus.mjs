import { readFileSync } from "node:fs";
import { createVantaWalletSigningLaunchPolicy } from "./walletSigningLaunchPolicy.mjs";

const evidencePath = new URL("../../ops/mainnet/wallet-signing-safety.evidence.json", import.meta.url);

export function createVantaWalletSigningStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const launchPolicy = createVantaWalletSigningLaunchPolicy();

  return {
    browserVerificationCluster: launchPolicy.browserVerificationCluster,
    browserVerificationMode: launchPolicy.browserVerificationMode,
    browserVerifiedProtocolPages: launchPolicy.browserVerifiedProtocolPages,
    checkedEvidenceRef: launchPolicy.checkedEvidenceRef,
    deploymentTruth: evidence.deploymentTruth,
    localBrowserVerificationOnly: launchPolicy.localBrowserVerificationOnly,
    liveMainnetSubmissionEnabled: launchPolicy.liveMainnetSubmissionEnabled,
    liveSendInventoryRef: evidence.liveSendInventoryRef,
    mainnetReady: false,
    mainnetSubmissionExplicitlyBlocked: launchPolicy.mainnetSubmissionExplicitlyBlocked,
    messageIntentPages: evidence.messageIntentPages,
    nextOperatorAction: evidence.nextOperatorAction,
    productionReady: false,
    productionBrowserVerificationAvailable: launchPolicy.productionBrowserVerificationAvailable,
    productionBrowserVerificationCoversRequiredPages: launchPolicy.productionBrowserVerificationCoversRequiredPages,
    productionBrowserVerificationRef: launchPolicy.productionBrowserVerificationRef,
    productionBrowserVerificationRequiredPages: launchPolicy.productionBrowserVerificationRequiredPages,
    productionBrowserVerificationStatus: launchPolicy.productionBrowserVerificationStatus,
    productionBrowserVerificationUrl: launchPolicy.productionBrowserVerificationUrl,
    productionBrowserVerifiedPages: launchPolicy.productionBrowserVerifiedPages,
    productionWalletSigningBlockedBy: launchPolicy.productionWalletSigningBlockedBy,
    productionDeploymentModeBannerVisible: launchPolicy.productionDeploymentModeBannerVisible,
    productionSettlementOfflineBannerVisible: launchPolicy.productionSettlementOfflineBannerVisible,
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
