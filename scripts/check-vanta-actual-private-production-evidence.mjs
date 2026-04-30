import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/actual-private-production-evidence.packet.json");
const packagePath = resolve(repoRoot, "package.json");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

assert.ok(existsSync(packetPath), "Missing ops/mainnet/actual-private-production-evidence.packet.json.");

const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const anonymity = readJson("ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
const relayer = readJson("ops/mainnet/private-pool-v2-relayer-separation.evidence.json");
const productionRelayerReview = readJson("ops/mainnet/private-pool-v2-production-relayer-review.evidence.json");
const productionPrivacyReviewerPacket = readJson(
  "ops/mainnet/private-pool-v2-production-privacy-reviewer.packet.json",
);
const nullifier = readJson("ops/mainnet/private-pool-v2-nullifier-replay.evidence.json");
const actualPrivateSettlement = readJson("ops/mainnet/actual-private-mainnet-settlement.evidence.json");
const actualPrivateSettlementReview = readJson("ops/mainnet/actual-private-mainnet-settlement-review.evidence.json");
const productionCapability = readJson("ops/mainnet/actual-private-production-capability.evidence.json");
const productionSmoke = readJson("ops/mainnet/private-pool-v2-production-smoke.evidence.json");
const roleService = readJson("ops/mainnet/private-pool-v2-role-service-replay.evidence.json");

const actualPrivateHardBlockers = [
  "shared-cohort-deposit-transaction",
  "live-nullifier-replay-rejection",
];
const actualPrivatePromotionBlockers = [
  "shared-cohort-deposit-transaction",
  "independent-reviewer-or-audit",
];
const spendProgramEvidence = {
  createTxRef:
    "solana-tx:368JyAHH4aAuvFiSuhGhoejuwPvyTDwMtHdrzLgRhqVnbQNrbaCjCHxjsR8Ty7PcoR4kb9xjR7Q674NKZ9BABdGo",
  deployTxRef:
    "solana-tx:34syPdrcrwjUvFLiDRzPA597MxNqB8CassbJYu77DN4ECm1u5gLjL2uwhz5bcnHKbeZH4A819kjofCGBvpkP764p",
  initTxRef:
    "solana-tx:3zfqv9jKCwWJ2vtwFaViBq2GuaTP6HqjbUqfW8PGYjraumdSvvtVFHiYG1uyLTDDvpLgtwwN4d4XmTjd7D2RQEGU",
  nullifierSet: "x5xWJZNN8rjZPdAYgG8EJuTZYYvYDQyhVXEgKB6i23k",
  outputQueue: "CsnYLMnnMso1KT6PE7csi51ZtFHSPQr1xTePA8rKUzrZ",
  poolState: "5qjyK5B5ZMAgLmXxrpAGqFHvEHTCP4MUwRmzvA4MPEuQ",
  programId: "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm",
  replaySimulation: {
    observedError: "Custom:1",
    productionReplayProbeCheckedAt: "2026-04-30T08:19:41.721Z",
    productionReplayProbeRef: "operator-nullifier-replay:production-duplicate-rejected-0979e25cb4f98ecba9bb",
    productionReplayRejectionProven: true,
    reviewerAcceptanceRef: "review:actual-private-production-replay-transcript-accepted-2026-04-30",
    status: "reviewed-production-duplicate-replay-rejection",
  },
  spendEvidenceTxRef:
    "solana-tx:56QhWoCQ6KjD9SVBJ9KdZphVMp49qYSiwEDTprZsoyo5WFTXoLRMrxNTabB9dELhL5WrFWbSZDDzNd4URr3u5fZL",
};

assert.equal(packet.version, "vanta-actual-private-production-evidence-0.1");
assert.equal(packet.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(packet.mainnetReady, false);
assert.equal(packet.productionReady, false);
assert.equal(packet.privacyClaimAllowed, false);
assert.equal(packet.meaningfulPrivacyReady, false);
assert.equal(packet.secretPolicy, "references-only-no-secret-values");

for (const allowed of [
  "pool id",
  "asset cohort",
  "asset id commitment",
  "accepted root",
  "nullifier",
  "output commitments",
  "proof public-input hash",
  "receipt commitment",
  "relayer identity or epoch",
]) {
  assert.ok(packet.targetPublicTranscript.includes(allowed), `Missing target transcript term: ${allowed}`);
}

for (const forbidden of [
  "source wallet",
  "merchant settlement address",
  "raw amount",
  "raw asset",
  "note secret",
  "input commitment",
  "input leaf index",
  "deposit signature",
  "plaintext memo",
  "same fee payer linkage",
]) {
  assert.ok(packet.forbiddenPublicTranscript.includes(forbidden), `Missing forbidden transcript term: ${forbidden}`);
}

assert.equal(packet.evidenceRefs.sharedPoolAnonymity, "ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
assert.equal(packet.evidenceRefs.relayerSeparation, "ops/mainnet/private-pool-v2-relayer-separation.evidence.json");
assert.equal(
  packet.evidenceRefs.productionRelayerReview,
  "ops/mainnet/private-pool-v2-production-relayer-review.evidence.json",
);
assert.equal(packet.evidenceRefs.nullifierRootEnforcement, "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json");
assert.equal(packet.evidenceRefs.roleServiceReplay, "ops/mainnet/private-pool-v2-role-service-replay.evidence.json");
assert.equal(packet.evidenceRefs.safeLogging, "npm run ops:safe-telemetry-check");
assert.equal(packet.evidenceRefs.auditPackage, "docs/audit-package.md");
assert.equal(packet.evidenceRefs.mainnetPrivateSettlement, "npm run mainnet:private-settlement-check");
assert.equal(
  packet.evidenceRefs.liveMainnetSettlementTemplate,
  "ops/mainnet/actual-private-mainnet-settlement.evidence.template.json",
);
assert.equal(
  packet.evidenceRefs.liveMainnetSettlementEvidence,
  "ops/mainnet/actual-private-mainnet-settlement.evidence.json",
);
assert.equal(
  packet.evidenceRefs.liveMainnetSettlementReview,
  "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
);
assert.equal(
  packet.evidenceRefs.productionPrivacyReviewerPacket,
  "ops/mainnet/private-pool-v2-production-privacy-reviewer.packet.json",
);
assert.equal(packet.evidenceRefs.productionCapability, "ops/mainnet/actual-private-production-capability.evidence.json");
assert.equal(packet.evidenceRefs.productionSmoke, "ops/mainnet/private-pool-v2-production-smoke.evidence.json");
assert.equal(packet.evidenceRefs.actualPrivateRailRegression, "npm run private-transaction:mvp-check");

for (const command of [
  "npm run private-transaction:mvp-check",
  "npm run private-pool-v2:anonymity-set-evidence-check",
  "npm run private-pool-v2:relayer-separation-evidence-check",
  "npm run private-pool-v2:production-relayer-review-check",
  "npm run private-pool-v2:production-privacy-reviewer-packet-check",
  "npm run private-pool-v2:protocol-client-check",
  "npm run mainnet:nullifier-replay-evidence-check",
  "npm run mainnet:actual-private-replay-probe-check",
  "npm run mainnet:actual-private-replay-reconcile-check",
  "npm run mainnet:actual-private-shared-cohort-deposit-review-check",
  "npm run mainnet:role-service-replay-evidence-check",
  "npm run ops:safe-telemetry-check",
  "npm run audit:package-check",
  "npm run mainnet:private-settlement-check",
  "npm run mainnet:actual-private-production-capability-check",
  "npm run mainnet:actual-private-settlement-evidence-check",
  "npm run mainnet:actual-private-settlement-review-check",
  "npm run mainnet:production-smoke-evidence-check",
]) {
  assert.ok(packet.requiredCommands.includes(command), `Missing required command: ${command}`);
}

assert.equal(anonymity.productionReady, false);
assert.equal(anonymity.privacyClaimAllowed, false);
assert.equal(anonymity.meaningfulPrivacyReady, false);
assert.equal(relayer.productionReady, false);
assert.equal(relayer.relayerSeparationReady, false);
assert.equal(productionRelayerReview.productionRelayerReviewReady, false);
assert.equal(productionRelayerReview.reviewStatus, "blocked-awaiting-external-review");
assert.equal(productionPrivacyReviewerPacket.reviewPacketReady, true);
assert.equal(productionPrivacyReviewerPacket.productionReady, false);
assert.equal(productionPrivacyReviewerPacket.privacyClaimAllowed, false);
assert.equal(
  productionPrivacyReviewerPacket.publicMainnetRefs.spendEvidenceTxRef,
  spendProgramEvidence.spendEvidenceTxRef,
);
assert.equal(nullifier.protocolEnforcementFinalLayerImplemented, true);
assert.equal(nullifier.protocolEnforcementFinalLayerProductionReady, false);
assert.equal(
  nullifier.actualPrivateSpendRootNullifierEnforcement.acceptedRootFreshnessProductionReady,
  true,
);
assert.equal(
  nullifier.actualPrivateSpendRootNullifierEnforcement.acceptedRootFreshnessStatus,
  "reviewed-live-accepted-root-freshness-evidence-present",
);
assert.equal(roleService.productionReady, false);
assert.equal(productionCapability.productionReady, false);
assert.equal(productionCapability.realFundsAllowed, false);
assert.equal(productionCapability.capabilityDecision?.accepted, true);
assert.equal(productionCapability.capabilityDecision?.reason, "actual-private-operator-capability-ready");
assert.equal(productionCapability.settlementPostAllowed, true);
assert.equal(actualPrivateSettlement.currentStatus, "mainnet-spend-program-evidence-observed-reviewed-blocked");
assert.equal(actualPrivateSettlement.liveMainnetSettlementProven, false);
assert.equal(actualPrivateSettlementReview.reviewStatus, "reviewed-blocked");
assert.equal(actualPrivateSettlementReview.liveMainnetSettlementProven, false);
assert.equal(actualPrivateSettlementReview.privacyClaimAllowed, false);
assert.equal(actualPrivateSettlement.promotionStateMachine?.operatorAcceptanceCanPromote, false);
assert.equal(
  actualPrivateSettlement.promotionStateMachine?.candidateEvidenceStatus,
  "mainnet-spend-program-evidence-observed-reviewed-blocked",
);
assert.equal(actualPrivateSettlement.promotionStateMachine?.blockedReviewStatus, "reviewed-blocked");
assert.equal(actualPrivateSettlement.promotionStateMachine?.approvedReviewStatus, "reviewed-live");
assert.equal(actualPrivateSettlement.promotionStateMachine?.approvedEvidenceStatus, "reviewed-live-evidence-path");
assert.deepEqual(
  actualPrivateSettlement.hardPromotionBlockers?.map((blocker) => blocker.id),
  actualPrivateHardBlockers,
);
assert.deepEqual(actualPrivateSettlement.mainnetSpendProgramEvidence, spendProgramEvidence);
assert.equal(actualPrivateSettlementReview.promotionDecision?.operatorAcceptanceCanPromote, false);
assert.equal(actualPrivateSettlementReview.promotionDecision?.reviewedLiveAllowed, false);
assert.deepEqual(actualPrivateSettlementReview.promotionDecision?.blockedBy, actualPrivatePromotionBlockers);
assert.equal(
  actualPrivateSettlement.evidenceRefs?.operatorReceiptRef,
  "operator-receipt:ppv2_5dc58490314d855c5060eace",
);
assert.equal(
  actualPrivateSettlement.evidenceRefs?.protocolSettlementRef,
  "operator-protocol-settlement:proto_1ef774cec8a4964fd8a4650b",
);
assert.equal(
  actualPrivateSettlement.evidenceRefs?.relayerSubmittedSpendTxRef,
  "solana-tx:56QhWoCQ6KjD9SVBJ9KdZphVMp49qYSiwEDTprZsoyo5WFTXoLRMrxNTabB9dELhL5WrFWbSZDDzNd4URr3u5fZL",
  "Relayer spend tx ref must use the observed Solana signature, not an operator receipt.",
);
assert.equal(productionSmoke.productionReady, false);
assert.equal(productionSmoke.realFundsAllowed, false);

assert.equal(packet.evidenceStatus.actualPrivateRailRegression, "local-and-role-service-covered");
assert.equal(packet.evidenceStatus.sharedPoolAnonymity, "blocked");
assert.equal(
  packet.evidenceStatus.nullifierRootEnforcement,
  "actual-private-nullifier-root-and-production-duplicate-replay-covered",
);
assert.equal(packet.evidenceStatus.safeLogging, "local-contract-covered");
assert.equal(packet.evidenceStatus.audit, "packet-template-only");
assert.equal(packet.evidenceStatus.productionCapability, "production-operator-send-proof-mode-aligned");
assert.equal(packet.evidenceStatus.relayerSeparation, "mainnet-spend-transaction-observed-reviewer-blocked");
assert.equal(packet.evidenceStatus.mainnetEvidence, "mainnet-spend-program-evidence-observed-reviewed-blocked");
assert.equal(
  packet.liveMainnetSettlementPromotion?.currentStatus,
  "mainnet-spend-program-evidence-observed-reviewed-blocked",
);
assert.equal(packet.liveMainnetSettlementPromotion?.reviewedLiveStatus, "reviewed-live");
assert.equal(packet.liveMainnetSettlementPromotion?.operatorAcceptanceCanPromote, false);
assert.deepEqual(packet.liveMainnetSettlementPromotion?.requiredHardEvidence, actualPrivatePromotionBlockers);
assert.deepEqual(packet.liveMainnetSettlementPromotion?.currentBlockedBy, [
  ...actualPrivatePromotionBlockers,
  "audited-shared-anonymity-set",
]);

for (const blocker of [
  "Live mainnet production cohort metrics are recorded but measured below the 1024 distinct commitment threshold.",
  "No asset cohort has at least 1024 distinct live commitments.",
  "No independent reviewer has accepted the anonymity-set measurement.",
  "Live accepted-root freshness has operator-review evidence, and the production duplicate-nullifier replay rejection is accepted.",
  "Production relayer log redaction is locally contract-covered but not independently reviewed.",
  "Production relayer deployment separation is manifest-covered but not independently reviewed.",
  "Production relayer spend-program evidence is observed on mainnet, but independent reviewer acceptance is still missing.",
  "No third-party audit report and fix-verification packet is recorded.",
  "Live actual-private settlement refs were reviewed and remain blocked by missing shared-cohort deposit, independent reviewer, and audited-anonymity evidence.",
  "No broad reusable real-funds approval exists outside the exact bounded reviewer-packet evidence window.",
]) {
  assert.ok(packet.productionBlockers.includes(blocker), `Missing production blocker: ${blocker}`);
}

const serialized = JSON.stringify(packet);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "signedTransaction",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Actual-private production evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-production-evidence-check"],
  "node scripts/check-vanta-actual-private-production-evidence.mjs",
  "package.json must expose mainnet:actual-private-production-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-production-evidence-check"),
  "mainnet:preflight must include actual-private production evidence check.",
);

console.log("Vanta actual-private production evidence check: PASS");
