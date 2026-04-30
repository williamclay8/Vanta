import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const reviewPath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json");
const settlementPath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

const review = JSON.parse(readFileSync(reviewPath, "utf8"));
const settlement = JSON.parse(readFileSync(settlementPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const requiredHardBlockers = [
  "shared-cohort-deposit-transaction",
  "independent-reviewer-or-audit",
];

const requiredChecklist = [
  {
    id: "solscan-relayer-spend-transaction",
    evidenceRefKey: "relayerSubmittedSpendTxRef",
    requiredRefShape: "solana-tx:<relayer-submitted-mainnet-signature>",
    accepts: (ref) => isSolanaTxRef(ref),
  },
  {
    id: "shared-cohort-deposit-transaction",
    evidenceRefKey: "sharedCohortDepositTxRef",
    requiredRefShape: "solana-tx:<shared-cohort-deposit-mainnet-signature>",
    accepts: (ref) => isSolanaTxRef(ref),
  },
  {
    id: "live-nullifier-replay-rejection",
    evidenceRefKey: "nullifierReplayRejectionRef",
    requiredRefShape: "operator-nullifier-replay:<production-duplicate-rejection-ref>",
    accepts: (ref) => isProductionReplayRejectionRef(ref),
  },
  {
    id: "independent-reviewer-or-audit",
    evidenceRefKey: "auditOrReviewerRef",
    requiredRefShape: "reviewer:<independent-reviewer-or-audit-ref>",
    accepts: (ref) => isIndependentReviewerOrAuditRef(ref),
  },
];
const observedSpendProgramEvidence = {
  relayerSubmittedSpendTxRef:
    "solana-tx:56QhWoCQ6KjD9SVBJ9KdZphVMp49qYSiwEDTprZsoyo5WFTXoLRMrxNTabB9dELhL5WrFWbSZDDzNd4URr3u5fZL",
  replaySimulationRef: "simulation-only:Custom:1",
};

assert.equal(review.version, "vanta-actual-private-mainnet-settlement-review-evidence-0.1");
assert.equal(review.reviewStatus, "reviewed-blocked");
assert.equal(review.mainnetReady, false);
assert.equal(review.productionReady, false);
assert.equal(review.privacyClaimAllowed, false);
assert.equal(review.liveMainnetSettlementProven, false);
assert.equal(review.secretPolicy, "references-only-no-secret-values");
assert.equal(review.reviewedSettlementRefs.operatorReceiptRef, "operator-receipt:ppv2_5dc58490314d855c5060eace");
assert.equal(
  review.reviewedSettlementRefs.protocolSettlementRef,
  "operator-protocol-settlement:proto_1ef774cec8a4964fd8a4650b",
);
assert.equal(
  review.reviewedSettlementRefs.relayerSubmittedSpendTxRef,
  observedSpendProgramEvidence.relayerSubmittedSpendTxRef,
);

for (const id of [
  "operator-receipt-found",
  "operator-receipt-shape",
  "operator-public-transcript-redaction",
  "indexer-nullifier-found",
  "indexer-output-commitments-found",
  "accepted-root-current",
  "mainnet-spend-program-config-observed",
  "mainnet-spend-program-lifecycle-observed",
  "solscan-relayer-spend-transaction-observed",
  "production-duplicate-replay-rejection-observed",
]) {
  assert.equal(review.passedChecks.find((check) => check.id === id)?.result, "pass", `Missing passed check ${id}.`);
}

for (const id of [
  "shared-cohort-deposit-transaction",
  "independent-reviewer-or-audit",
]) {
  assert.equal(
    review.failedOrBlockedChecks.find((check) => check.id === id)?.result,
    "blocked",
    `Missing blocked check ${id}.`,
  );
}

assert.deepEqual(validatePromotionDecision({ review, settlement }), {
  promotionAllowed: false,
  blockedBy: requiredHardBlockers,
});
assert.equal(review.promotionDecision?.reviewedLiveAllowed, false);
assert.equal(review.promotionDecision?.operatorAcceptanceCanPromote, false);
assert.equal(review.promotionDecision?.requiredApprovedReviewStatus, "reviewed-live");
assert.deepEqual(review.promotionDecision?.blockedBy, requiredHardBlockers);
assert.deepEqual(review.promotionDecision?.reviewedLiveRequires, requiredHardBlockers);

for (const { id, evidenceRefKey, requiredRefShape, accepts } of requiredChecklist) {
  const checklistItem = review.reviewedLiveChecklist?.find((item) => item.id === id);
  assert.equal(checklistItem?.evidenceRefKey, evidenceRefKey, `Missing checklist evidence key for ${id}.`);
  assert.equal(checklistItem?.requiredRefShape, requiredRefShape, `Missing checklist ref shape for ${id}.`);
  assert.equal(
    checklistItem?.currentEvidenceRef,
    settlement.evidenceRefs?.[evidenceRefKey],
    `Checklist item ${id} must mirror the settlement evidence ref.`,
  );
  assert.equal(
    checklistItem?.result,
    accepts(settlement.evidenceRefs?.[evidenceRefKey]) ? "pass" : "blocked",
    `Current review checklist item ${id} must mirror whether its settlement ref is currently acceptable.`,
  );
  assert.equal(checklistItem?.promotionRequired, true, `Checklist item ${id} must be required for promotion.`);
}

assert.deepEqual(
  validatePromotionDecision({
    review: {
      ...review,
      reviewStatus: "reviewed-live",
      failedOrBlockedChecks: [],
      promotionDecision: {
        ...review.promotionDecision,
        reviewedLiveAllowed: true,
        blockedBy: [],
      },
      reviewedLiveChecklist: requiredChecklist.map(({ id, evidenceRefKey, requiredRefShape }) => ({
        id,
        evidenceRefKey,
        requiredRefShape,
        currentEvidenceRef:
          evidenceRefKey === "nullifierReplayRejectionRef"
            ? "operator-nullifier-replay:production-duplicate-rejected-2026-04-29"
            : evidenceRefKey === "auditOrReviewerRef"
              ? "reviewer:independent-audit-accepted-2026-04-29"
            : `solana-tx:${"4".repeat(88)}`,
        result: "pass",
        promotionRequired: true,
      })),
    },
    settlement: {
      ...settlement,
      liveMainnetSettlementProven: true,
      evidenceRefs: {
        ...settlement.evidenceRefs,
        relayerSubmittedSpendTxRef: `solana-tx:${"4".repeat(88)}`,
        sharedCohortDepositTxRef: `solana-tx:${"5".repeat(88)}`,
        nullifierReplayRejectionRef: "operator-nullifier-replay:production-duplicate-rejected-2026-04-29",
        auditOrReviewerRef: "reviewer:independent-audit-accepted-2026-04-29",
      },
    },
  }),
  { promotionAllowed: true, blockedBy: [] },
);

assert.deepEqual(
  validatePromotionDecision({
    review: {
      ...review,
      reviewStatus: "reviewed-live",
      failedOrBlockedChecks: [],
      promotionDecision: {
        ...review.promotionDecision,
        reviewedLiveAllowed: true,
        blockedBy: [],
      },
    },
    settlement: {
      ...settlement,
      liveMainnetSettlementProven: true,
      evidenceRefs: {
        ...settlement.evidenceRefs,
        relayerSubmittedSpendTxRef: "operator-protocol-settlement:proto_partial_operator_acceptance",
      },
    },
  }).promotionAllowed,
  false,
  "Operator acceptance or protocol settlement ids must not promote to reviewed-live.",
);

assert.match(review.finalVerdict, /Do not claim Solscan-untrackable/);
assert.match(review.finalVerdict, /Mainnet spend-program evidence is observed/);
assert.match(review.finalVerdict, /shared-cohort, independent reviewer, audited-anonymity/);

const serialized = JSON.stringify(review);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Settlement review evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-review-check"],
  "node scripts/check-vanta-actual-private-mainnet-settlement-review-evidence.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-review-check"),
  "mainnet:preflight must include actual-private settlement review check.",
);

console.log("Vanta actual-private mainnet settlement review evidence check: PASS");

function validatePromotionDecision({ review: reviewPacket, settlement: settlementPacket }) {
  const checklist = reviewPacket.reviewedLiveChecklist ?? [];
  const blockedBy = [];

  assert.equal(reviewPacket.promotionDecision?.operatorAcceptanceCanPromote, false);
  assert.equal(reviewPacket.promotionDecision?.requiredApprovedReviewStatus, "reviewed-live");
  assert.deepEqual(reviewPacket.promotionDecision?.reviewedLiveRequires, requiredHardBlockers);

  for (const required of requiredChecklist) {
    const item = checklist.find((candidate) => candidate.id === required.id);
    assert.ok(item, `Missing reviewed-live checklist item ${required.id}.`);
    assert.equal(item.evidenceRefKey, required.evidenceRefKey, `Wrong evidence key for ${required.id}.`);
    assert.equal(item.requiredRefShape, required.requiredRefShape, `Wrong required ref shape for ${required.id}.`);
    assert.equal(item.promotionRequired, true, `Checklist item ${required.id} must be promotion-required.`);

    const settlementRef = settlementPacket.evidenceRefs?.[required.evidenceRefKey];
    if (!required.accepts(settlementRef) || item.result !== "pass") {
      blockedBy.push(required.id);
    }
  }

  const promotionAllowed =
    reviewPacket.reviewStatus === "reviewed-live" &&
    reviewPacket.promotionDecision?.reviewedLiveAllowed === true &&
    settlementPacket.liveMainnetSettlementProven === true &&
    (reviewPacket.failedOrBlockedChecks ?? []).length === 0 &&
    blockedBy.length === 0;

  if (promotionAllowed) {
    assert.deepEqual(reviewPacket.promotionDecision?.blockedBy, []);
  }

  return { promotionAllowed, blockedBy };
}

function isSolanaTxRef(ref) {
  return /^solana-tx:[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(String(ref ?? ""));
}

function isProductionReplayRejectionRef(ref) {
  return /^operator-nullifier-replay:/.test(String(ref ?? "")) && /production|live/.test(String(ref ?? ""));
}

function isIndependentReviewerOrAuditRef(ref) {
  const value = String(ref ?? "");
  return /^(reviewer|audit):/.test(value) && !/^reviewer:clay/.test(value);
}
