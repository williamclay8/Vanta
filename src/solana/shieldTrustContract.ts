export const VANTA_SHIELD_TRUST_CONTRACT_VERSION =
  "vanta-shield-trust-contract-0.1" as const;

export type ShieldTrustContract = {
  version: typeof VANTA_SHIELD_TRUST_CONTRACT_VERSION;
  currentTruth: "committed Shield beta";
  claimControls: {
    fullyPrivateShieldClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
  };
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

export function getShieldTrustContract(): ShieldTrustContract {
  return {
    version: VANTA_SHIELD_TRUST_CONTRACT_VERSION,
    currentTruth: "committed Shield beta",
    claimControls: {
      fullyPrivateShieldClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      productionPrivacyClaimsLocked: true,
    },
    visibleStatusCopy:
      "Shield records committed shielded-state evidence; production privacy claims stay locked until anonymity, relayer, audit, and mainnet gates pass.",
    verificationSurfaces: [
      "npm run shield:verify",
      "npm run shield:privacy-readiness-check",
      "npm run private-pool-v2:shield-proof-request-check",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
