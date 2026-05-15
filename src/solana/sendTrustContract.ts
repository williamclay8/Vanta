export const VANTA_SEND_TRUST_CONTRACT_VERSION =
  "vanta-send-trust-contract-0.1" as const;

export type SendTrustContract = {
  version: typeof VANTA_SEND_TRUST_CONTRACT_VERSION;
  currentTruth: "guarded Send beta";
  claimControls: {
    fullyPrivateSendClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
  };
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

export function getSendTrustContract(): SendTrustContract {
  return {
    version: VANTA_SEND_TRUST_CONTRACT_VERSION,
    currentTruth: "guarded Send beta",
    claimControls: {
      fullyPrivateSendClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      productionPrivacyClaimsLocked: true,
    },
    visibleStatusCopy:
      "Send is in guarded beta. You can send shielded assets privately to other Vanta users via direct key exchange. Full private recipient discovery is not yet live. All sends are proof-verified by the operator.",
    verificationSurfaces: [
      "npm run send:verify",
      "npm run actions:memo-encryption-check",
      "npm run private-pool-v2:send-proof-request-check",
      "npm run private-pool-v2:send-circuit-check",
      "npm run private-pool-v2:public-input-hash-alignment-check",
      "npm run send:trust-packet-check",
      "npm run send:discovery-indexer-handoff-check",
      "npm run send:production-privacy-claim-gate",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
