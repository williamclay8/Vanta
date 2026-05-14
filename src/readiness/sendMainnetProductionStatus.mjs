import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaWalletSigningStatus } from "./walletSigningStatus.mjs";

export function createVantaSendMainnetProductionStatus() {
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const walletSigning = createVantaWalletSigningStatus();

  const localLaneCovered =
    walletSigning.protocolPagesWithSafeSendAdoption.includes("Send") &&
    privateSettlement.actualPrivateMainnetEvidence.noRealFundsSmokeTargetPassed;
  const actualPrivateSpendCircuitCovered =
    privateSettlement.actualPrivateMainnetEvidence.requiredLiveEvidence.includes(
      "operator receipt binding accepted root, nullifier, output commitments, and proof public-input hash",
    );
  const noFundsOperatorEndpointCovered =
    privateSettlement.routeHealthPublicPassed &&
    privateSettlement.routeHealthAuthenticatedPassed &&
    privateSettlement.productionSmokeHealthPassed &&
    privateSettlement.productionSmokeTargetsPassed &&
    privateSettlement.replayProtocolLayerImplemented;
  const liveSettlementProven =
    privateSettlement.actualPrivateMainnetEvidence.liveMainnetSettlementProven === true &&
    privateSettlement.actualPrivateMainnetEvidence.status === "reviewed-live-evidence-path";
  const exactSendApprovalScoped =
    typeof realFundsApproval.approvalActionRef === "string" &&
    realFundsApproval.approvalActionRef.startsWith("actual-private/send");
  const boundedApprovalActive =
    realFundsApproval.liveMainnetActionsAllowedNow &&
    exactSendApprovalScoped &&
    !realFundsApproval.stopCondition.appliesToCurrentApproval;
  const privateCoreSendNoWitnessBoundaryCovered = true;
  const privateCoreSendProofArtifactCovered = true;
  const localViewTagBodyHashHandoffCovered = true;
  const localVerifierMirroredDiscoveryHandoffCovered = true;
  const deployedMemoIndexerHandoffCovered = false;
  const freshV2OnlyClaimScoped = true;
  const legacyV1SendHistoryMigrated = false;
  const legacyV1SendHistoryMigrationScoped =
    freshV2OnlyClaimScoped || legacyV1SendHistoryMigrated;
  const privateCoreOperatorStateRedacted = true;
  const statefulVerifierIndexerCommitIdempotencyProven = false;
  const productionReady =
    localLaneCovered &&
    actualPrivateSpendCircuitCovered &&
    noFundsOperatorEndpointCovered &&
    liveSettlementProven &&
    boundedApprovalActive &&
    privateCoreOperatorStateRedacted &&
    deployedMemoIndexerHandoffCovered &&
    legacyV1SendHistoryMigrationScoped &&
    statefulVerifierIndexerCommitIdempotencyProven &&
    privateSettlement.auditedSharedAnonymitySetAvailable &&
    privateSettlement.liveMainnetPrivateSettlementAvailable &&
    privateSettlement.privacyClaimAllowed;

  const blockers = [
    ...(localLaneCovered ? [] : ["send-safe-send-or-actual-private-smoke-boundary-missing"]),
    ...(actualPrivateSpendCircuitCovered ? [] : ["send-actual-private-membership-proof-gate-missing"]),
    ...(noFundsOperatorEndpointCovered ? [] : ["send-production-operator-smoke-or-replay-evidence-missing"]),
    ...(liveSettlementProven ? [] : ["no-reviewed-live-mainnet-send-settlement-evidence"]),
    ...(exactSendApprovalScoped ? [] : ["no-exact-send-bounded-approval-window"]),
    ...(boundedApprovalActive ? [] : realFundsApproval.mainnetFundsBlockedBy),
    ...(privateCoreOperatorStateRedacted ? [] : ["private-core-send-operator-state-exposes-raw-economic-terms"]),
    "send-memo-indexer-body-hash-handoff-not-deployed",
    ...(legacyV1SendHistoryMigrationScoped
      ? []
      : ["legacy-v1-send-history-migration-not-scoped"]),
    ...(statefulVerifierIndexerCommitIdempotencyProven
      ? []
      : ["stateful-verifier-indexer-commit-idempotency-not-proven"]),
    ...privateSettlement.meaningfulPrivacyBlockedBy,
    ...(privateSettlement.auditedSharedAnonymitySetAvailable ? [] : ["no-third-party-audit"]),
    ...(privateSettlement.actualPrivateMainnetEvidence.requiredLiveEvidence.includes(
      "reviewer packet proving no source wallet, merchant address, raw amount, input commitment, input leaf index, deposit signature, plaintext memo, or same-fee-payer linkage appears in the public spend transcript",
    )
      ? []
      : ["send-public-transcript-review-packet-missing"]),
  ];

  return {
    version: "vanta-send-mainnet-production-status-0.1",
    activePrivacyRailId: privateSettlement.activePrivacyRailId,
    checkedAt: new Date().toISOString(),
    localLaneCovered,
    actualPrivateSpendCircuitCovered,
    noFundsOperatorEndpointCovered,
    liveSettlementProven,
    exactSendApprovalScoped,
    boundedApprovalActive,
    privateCoreSendNoWitnessBoundaryCovered,
    privateCoreSendProofArtifactCovered,
    localViewTagBodyHashHandoffCovered,
    localVerifierMirroredDiscoveryHandoffCovered,
    deployedMemoIndexerHandoffCovered,
    legacyV1SendHistoryMigrationScoped,
    sendDiscoveryHandoff: {
      blockerIds: [
        "send-memo-indexer-body-hash-handoff-not-deployed",
      ],
      claimBoundary:
        "local encrypted-view-tag index only; not production recipient discovery",
      deployedMemoIndexerHandoffCovered,
      freshV2OnlyClaimScoped,
      legacyHistoryScope: {
        freshV2OnlyClaimScoped,
        legacyV1EligibleForProductionPrivacyClaims: false,
        legacyV1ParseCompatible: true,
        migrated: legacyV1SendHistoryMigrated,
        productionReady: false,
        scopeBoundary:
          "production Send privacy claims are scoped to fresh v2 AEAD sends unless legacy v1 plaintext history is migrated or segregated with reviewed evidence",
        status: "fresh-v2-only-production-claim-scope",
        version: "vanta-send-history-privacy-scope-0.1",
      },
      legacyV1SendHistoryMigrationScoped,
      localIndexerEndpoint: "/v1/send-discovery-packets",
      localStatusEndpoint: "/v1/send-discovery/status",
      localViewTagBodyHashHandoffCovered,
      localVerifierMirroredDiscoveryHandoffCovered,
      productionReady: false,
      version: "vanta-private-pool-v2-send-discovery-packet-0.1",
    },
    privateCoreOperatorStateRedacted,
    statefulVerifierIndexerCommitIdempotencyProven,
    mainnetReady: productionReady,
    productionReady,
    privacyClaimAllowed: productionReady,
    status: productionReady ? "ready" : "blocked",
    blockers: [...new Set(blockers)],
    currentApproval: {
      actionRef: realFundsApproval.approvalActionRef,
      approvalWindowRef: realFundsApproval.approvalWindowRef,
      approvalWindowStatus: realFundsApproval.approvalWindowStatus,
      liveMainnetActionsAllowedNow: realFundsApproval.liveMainnetActionsAllowedNow,
      stopCondition: realFundsApproval.stopCondition,
    },
    evidenceRefs: {
      privateSettlementStatus: "npm run --silent mainnet:private-settlement-status-json",
      realFundsApprovalStatus: "npm run --silent mainnet:real-funds-approval-status-json",
      walletSigningStatus: "npm run mainnet:wallet-signing-status-check",
      sendSafeSend: "npm run send:safe-send-adoption-check",
      sendBalanceLedger: "npm run send:balance-ledger-check",
      sendTrustPacket: "npm run send:trust-packet-check",
      sendNoWitnessOperatorBoundary: "npm run private-core:send-operator-no-witness-check",
      sendProofArtifactConsistency: "npm run private-core:send-proof-artifact-consistency-check",
      sendOperatorRedaction: "npm run private-core:send-operator-redaction-check",
      sendNullifierReplayNoWitness: "npm run private-core:send-nullifier-replay-no-witness-check",
      sendProductionPrivacyClaimGate: "npm run send:production-privacy-claim-gate",
      sendDiscoveryMigrationPolicy: "npm run send:discovery-migration-policy-check",
      sendLegacyHistoryScope: "npm run send:discovery-migration-policy-check",
      sendDiscoveryIndexerHandoff: "npm run send:discovery-indexer-handoff-check",
      sendDiscoveryVerifierHandoff: "npm run private-pool-v2:service-network-check",
      sendLiveEvidenceContract: "npm run mainnet:send-live-evidence-contract-check",
      privatePoolV2SendProofRequest: "npm run private-pool-v2:send-proof-request-check",
      privatePoolV2SendCircuit: "npm run private-pool-v2:send-circuit-check",
      privatePoolV2PublicInputHashAlignment: "npm run private-pool-v2:public-input-hash-alignment-check",
      actualPrivateSpendCircuit: "npm run private-pool-v2:actual-private-spend-circuit-check",
      liveSendSettlementEvidence: "npm run mainnet:actual-private-settlement-review-check",
      publicTranscriptReview: "npm run private-pool-v2:production-privacy-reviewer-packet-check",
      thirdPartyAudit: "npm run mainnet:external-gates-production-claim-check",
      privatePoolV2Verify: "npm run private-pool-v2:verify",
      mainnetPreflight: "npm run mainnet:preflight",
    },
    requiredBeforeProduction: [
      "Keep Send wallet approvals behind safe-send transaction summaries.",
      "Do not treat the current /app/send private-core USDC proof/operator lane as the production actual-private settlement lane.",
      "Keep browser Send fail-closed until a locally generated no-witness Send proof artifact is available; do not fall back to sending witness packages to the operator.",
      "Do not promote the repo-checked no-witness Private Core Send lane as production-private until live/deployed evidence proves the same boundary is running.",
      "Use the actual-private spend membership proof path for production Send promotion, not only the older send transition circuit.",
      "Prove idempotent recovery across verifier receipt storage and indexer nullifier/output transition storage before production promotion.",
      "Record a fresh active bounded approval window for the exact Send/actual-private mainnet action.",
      "Record reviewed live mainnet shared-cohort deposit evidence.",
      "Record reviewed live relayer-submitted private Send settlement evidence for the active approval window.",
      "Record live nullifier replay rejection evidence against the production store after the Send settlement.",
      "Deploy the verifier-mirrored memo/indexer handoff proving opaque memo bodies match proof-bound sha256: body hashes and encrypted view-tag packets match the same proof-bound hashes before claiming production recipient discovery.",
      "Keep production Send privacy claims scoped to fresh v2 AEAD sends unless legacy v1 plaintext Send history is migrated or segregated with reviewed evidence.",
      "Record an independent public-transcript review packet proving source wallet, recipient/merchant address, raw amount, input commitment, input leaf index, deposit signature, plaintext memo, and same-fee-payer linkage are absent.",
      "Record independent reviewer or audit acceptance for the circuit boundary, relayer separation, and anonymity-set measurement.",
    ],
    safety:
      "No auth tokens, database URLs, wallet keys, signed transactions, seed phrases, or raw private inputs are printed.",
    truth:
      "Send has local safe-send, canonical ledger gating, a repo-checked no-witness proof-artifact Private Core Send operator boundary, hidden-economics Private Pool v2 request coverage, local recipient/change memo ciphertext body-hash binding in the Private Pool v2 Send proof-request/circuit public-input hash, local encrypted view-tag/body-hash indexer handoff coverage, local verifier-mirrored discovery handoff coverage in the role-service network, explicit fresh-v2-only production claim scope for Send history, actual-private membership circuit coverage, and no-funds operator smoke coverage. Browser Send execution is fail-closed until a local proof artifact is available, and this Private Core lane is not the production actual-private settlement lane. Send must not be called mainnet-production-private until recipient discovery/view tags are deployed, deployed memo/indexer handoff proving opaque memo bodies match proof-bound sha256: body hashes also proves encrypted view-tag packets match the same proof-bound hashes, legacy v1 plaintext Send history remains excluded from production privacy claims unless migrated or segregated with reviewed evidence, live reviewed settlement evidence, exact active real-funds approval, audited/shared anonymity-set evidence, relayer separation review, production replay evidence, transcript review, idempotent verifier/indexer commit recovery, and deployed raw-term-safe production operator surfaces are all present.",
  };
}
