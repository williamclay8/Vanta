import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const settlementEvidencePath = new URL("../ops/mainnet/actual-private-mainnet-settlement.evidence.json", import.meta.url);
const settlementReviewEvidencePath = new URL(
  "../ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
  import.meta.url,
);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isSolanaTxRef(value) {
  return typeof value === "string" && /^solana-tx:[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(value);
}

function classifySharedCohortRef(value) {
  if (isSolanaTxRef(value)) {
    return "solana-tx-ref-recorded-review-required";
  }
  if (typeof value === "string" && value.startsWith("review:")) {
    return "placeholder-review-ref";
  }
  if (value == null || value === "") {
    return "missing";
  }
  return "invalid-ref-shape";
}

function findBlocker(evidence, id) {
  return evidence.hardPromotionBlockers?.find((blocker) => blocker.id === id) ?? null;
}

const settlementEvidence = readJson(settlementEvidencePath);
const settlementReviewEvidence = readJson(settlementReviewEvidencePath);
const sharedCohortDepositTxRef = settlementEvidence.evidenceRefs?.sharedCohortDepositTxRef ?? null;
const sharedCohortBlocker = findBlocker(settlementEvidence, "shared-cohort-deposit-transaction");
const currentState = classifySharedCohortRef(sharedCohortDepositTxRef);
const promotionSatisfied = isSolanaTxRef(sharedCohortDepositTxRef);
const publicRefs = settlementEvidence.mainnetSpendProgramEvidence ?? {};

assert.equal(settlementEvidence.activePrivacyRailId, "vanta-private-pool-v2");
assert.ok(sharedCohortBlocker, "Missing shared-cohort-deposit-transaction promotion blocker.");

const report = {
  version: "vanta-actual-private-shared-cohort-deposit-review-0.1",
  checkedAt: new Date().toISOString(),
  activePrivacyRailId: settlementEvidence.activePrivacyRailId,
  mainnetReady: false,
  productionReady: false,
  privacyClaimAllowed: false,
  movesFunds: false,
  submitsTransaction: false,
  mutatesProduction: false,
  sharedCohortDepositTxRef,
  requiredRefShape: "solana-tx:<shared-cohort-deposit-mainnet-signature>",
  currentState,
  promotionSatisfied,
  blockedBy: promotionSatisfied ? ["shared-cohort-deposit-review-required"] : ["shared-cohort-deposit-transaction"],
  settlementCurrentStatus: settlementEvidence.currentStatus,
  settlementReviewStatus: settlementReviewEvidence.reviewStatus,
  publicMainnetRefs: {
    network: "mainnet-beta",
    programId: publicRefs.programId ?? null,
    poolState: publicRefs.poolState ?? null,
    nullifierSet: publicRefs.nullifierSet ?? null,
    outputQueue: publicRefs.outputQueue ?? null,
    spendEvidenceTxRef: publicRefs.spendEvidenceTxRef ?? null,
  },
  requiredChecksAfterRealDeposit: [
    "shared-cohort deposit evidence ref has solana-tx:<signature> shape",
    "deposit transaction appends into the named shared cohort/output queue",
    "deposit review does not expose source wallet, merchant settlement address, raw amount, raw asset, note secret, input commitment, input leaf index, plaintext memo, or same fee-payer linkage",
    "review packet records an independent reviewer or audit ref before any privacy-claim promotion",
    "fresh bounded approval exists before any live transaction that moves real funds",
  ],
  nextAction: promotionSatisfied
    ? "Review the Solana shared-cohort deposit transaction against the public transcript boundary before promoting live settlement evidence."
    : "Record a fresh bounded approval window before any live transaction, then write a real solana-tx shared-cohort deposit ref through the evidence writer/review packet before promotion.",
  safety:
    "No auth token values, database URLs, bearer values, wallet keys, signed transactions, raw customer private inputs, or live transaction payloads are printed.",
};

console.log(JSON.stringify(report, null, 2));
