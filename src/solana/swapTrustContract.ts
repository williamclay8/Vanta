export const VANTA_SWAP_TRUST_CONTRACT_VERSION =
  "vanta-swap-trust-contract-0.1" as const;

export type SwapTrustContract = {
  version: typeof VANTA_SWAP_TRUST_CONTRACT_VERSION;
  currentTruth: "committed Swap beta";
  claimControls: {
    fullyPrivateSwapClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
  };
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

export function getSwapTrustContract(): SwapTrustContract {
  return {
    version: VANTA_SWAP_TRUST_CONTRACT_VERSION,
    currentTruth: "committed Swap beta",
    claimControls: {
      fullyPrivateSwapClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      productionPrivacyClaimsLocked: true,
    },
    visibleStatusCopy:
      "Swap records committed route evidence with v2 AEAD action memos; route execution and production-private settlement evidence remain beta-gated.",
    verificationSurfaces: [
      "npm run swap:capability-check",
      "npm run swap:trust-packet-check",
      "npm run actions:memo-encryption-check",
      "npm run private-core:verify",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
