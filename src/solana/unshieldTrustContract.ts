export const VANTA_UNSHIELD_TRUST_CONTRACT_VERSION =
  "vanta-unshield-trust-contract-0.1" as const;

export type UnshieldTrustContract = {
  version: typeof VANTA_UNSHIELD_TRUST_CONTRACT_VERSION;
  currentTruth: "operator-release Unshield beta";
  claimControls: {
    fullyPrivateUnshieldClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
  };
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

export function getUnshieldTrustContract(): UnshieldTrustContract {
  return {
    version: VANTA_UNSHIELD_TRUST_CONTRACT_VERSION,
    currentTruth: "operator-release Unshield beta",
    claimControls: {
      fullyPrivateUnshieldClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      productionPrivacyClaimsLocked: true,
    },
    visibleStatusCopy:
      "Unshield consumes one shielded note and records v2 AEAD exit evidence; production exit claims stay locked until proof-owned on-chain release gates pass.",
    verificationSurfaces: [
      "npm run private-core:check",
      "npm run private-core:verify",
      "npm run actions:memo-encryption-check",
      "npm run unshield:balance-ledger-check",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
