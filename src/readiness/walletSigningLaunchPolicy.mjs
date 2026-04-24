import { readFileSync } from "node:fs";

const evidencePath = new URL("../../ops/mainnet/wallet-signing-safety.evidence.json", import.meta.url);

export function createVantaWalletSigningLaunchPolicy() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  return {
    browserVerificationCluster: evidence.browserVerificationCluster,
    browserVerificationMode: evidence.browserVerificationMode,
    browserVerifiedProtocolPages: evidence.browserVerifiedProtocolPages,
    checkedEvidenceRef: "ops/mainnet/wallet-signing-safety.evidence.json",
    liveMainnetSubmissionEnabled: evidence.liveMainnetSubmissionEnabled,
    localBrowserVerificationOnly: evidence.localBrowserVerificationOnly,
    mainnetSubmissionExplicitlyBlocked: evidence.mainnetSubmissionExplicitlyBlocked,
    productionBrowserVerificationAvailable: evidence.productionBrowserVerificationAvailable,
    productionBrowserVerificationCoversRequiredPages: evidence.productionBrowserVerificationCoversRequiredPages,
    productionBrowserVerificationRef: evidence.productionBrowserVerificationRef,
    productionBrowserVerificationRequiredPages: evidence.productionBrowserVerificationRequiredPages,
    productionBrowserVerificationStatus: evidence.productionBrowserVerificationStatus,
    productionBrowserVerificationUrl: evidence.productionBrowserVerificationUrl,
    productionBrowserVerifiedPages: evidence.productionBrowserVerifiedPages,
    productionDeploymentModeBannerVisible: evidence.productionDeploymentModeBannerVisible,
    productionSettlementOfflineBannerVisible: evidence.productionSettlementOfflineBannerVisible,
    productionWalletSigningBlockedBy: evidence.productionWalletSigningBlockedBy,
  };
}
