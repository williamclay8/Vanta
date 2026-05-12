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
      "Fresh v2 Send memos put ciphertext, signer, and timing on chain. Legacy v1 plaintext Send memos remain parse-compatible for history but are excluded from production privacy claims unless migrated or segregated with reviewed evidence. A local dual-AEAD scaffold can separately seal recipient and change discovery memos with ciphertext body hashes, the Private Pool v2 Send proof-request/circuit lane locally binds those body-hash limbs into the public input hash, and the separated indexer has a local encrypted view-tag/body-hash handoff packet that rejects raw recipient/amount/plaintext fields. External Send remains fail-closed until recipient viewing-key exchange, deployed view-tag/indexer discovery, live evidence, and audit gates are wired. Operator/status surfaces still see transition and proof metadata.",
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
