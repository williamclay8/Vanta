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
      "Fresh v2 Send memos put ciphertext, signer, and timing on chain. A local dual-AEAD scaffold can separately seal recipient and change discovery memos with ciphertext hashes, but external Send remains fail-closed until recipient viewing-key exchange and proof-bound ciphertext hashes are wired. Operator/status surfaces still see transition and proof metadata.",
    verificationSurfaces: [
      "npm run send:verify",
      "npm run actions:memo-encryption-check",
      "npm run send:trust-packet-check",
      "npm run send:production-privacy-claim-gate",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
