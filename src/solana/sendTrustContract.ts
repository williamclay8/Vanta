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
      "Send is in guarded beta. Fresh v2 Send memos put ciphertext, signer, and timing on chain. The local dual-AEAD scaffold can separately seal recipient and change discovery memos with ciphertext body hashes. Private Pool v2 Send proof-request/circuit lane locally binds those body-hash fields. Local legacy v1 Send memo migration tooling can produce v2 discovery metadata or segregation records, but reviewed migration or segregation evidence is still missing. Full private recipient discovery is not yet live; direct key exchange remains the current beta path. External Send remains fail-closed until recipient viewing-key exchange. Operator/status surfaces still see transition and proof metadata. Send production privacy is not enabled.",
    verificationSurfaces: [
      "npm run send:verify",
      "npm run actions:memo-encryption-check",
      "npm run private-pool-v2:send-proof-request-check",
      "npm run private-pool-v2:send-circuit-check",
      "npm run private-pool-v2:public-input-hash-alignment-check",
      "npm run send:trust-packet-check",
      "npm run actions:legacy-v1-send-memo-migration-check",
      "npm run send:discovery-indexer-handoff-check",
      "npm run send:production-privacy-claim-gate",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
