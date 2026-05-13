export const VANTA_SWAP_TRUST_CONTRACT_VERSION =
  "vanta-swap-trust-contract-0.1" as const;

export type SwapTrustContract = {
  version: typeof VANTA_SWAP_TRUST_CONTRACT_VERSION;
  currentTruth: "Target C operator-visible Swap beta";
  claimControls: {
    fullyPrivateSwapClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    programmaticPrivateSwapClaim: false;
    productionPrivacyClaimsLocked: true;
  };
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

export function getSwapTrustContract(): SwapTrustContract {
  return {
    version: VANTA_SWAP_TRUST_CONTRACT_VERSION,
    currentTruth: "Target C operator-visible Swap beta",
    claimControls: {
      fullyPrivateSwapClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      programmaticPrivateSwapClaim: false,
      productionPrivacyClaimsLocked: true,
    },
    visibleStatusCopy:
      "Swap is a Target C beta: constrained routes can record committed receipt checks, but route execution remains operator-visible/custodial and production-private programmatic settlement is not enabled.",
    verificationSurfaces: [
      "npm run swap:capability-check",
      "npm run swap:trust-packet-check",
      "npm run actions:memo-encryption-check",
      "npm run private-core:verify",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
