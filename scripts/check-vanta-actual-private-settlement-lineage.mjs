import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaMainnetPrivateSettlementStatus } from "../src/readiness/mainnetPrivateSettlementStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const settlement = readJson("ops/mainnet/actual-private-mainnet-settlement.evidence.json");
const review = readJson("ops/mainnet/actual-private-mainnet-settlement-review.evidence.json");
const replay = readJson("ops/mainnet/private-pool-v2-nullifier-replay.evidence.json");
const status = createVantaMainnetPrivateSettlementStatus();

const refs = settlement.evidenceRefs;
const reviewedRefs = review.reviewedSettlementRefs;
const replayActualPrivate = replay.actualPrivateSpendRootNullifierEnforcement;
const statusRefs = status.actualPrivateMainnetEvidence.evidenceRefs;

assert.equal(settlement.version, "vanta-actual-private-mainnet-settlement-evidence-0.1");
assert.equal(review.version, "vanta-actual-private-mainnet-settlement-review-evidence-0.1");
assert.equal(replay.version, "vanta-production-nullifier-replay-evidence-0.1");

assert.equal(refs.operatorReceiptRef, reviewedRefs.operatorReceiptRef);
assert.equal(refs.protocolSettlementRef, reviewedRefs.protocolSettlementRef);
assert.equal(refs.relayerSubmittedSpendTxRef, reviewedRefs.relayerSubmittedSpendTxRef);
assert.equal(
  refs.boundedApprovalWindowRef,
  `approval-window:${reviewedRefs.approvalWindowRef.replace(" ", "-").replace("/", "-")}`,
);
assert.equal(refs.nullifierReplayRejectionRef, replayActualPrivate.reviewedProductionReplayRejectionRef);
assert.equal(refs.acceptedRootFreshnessRef, replayActualPrivate.acceptedRootFreshnessRef);

for (const [key, value] of Object.entries(refs)) {
  assert.equal(statusRefs[key], value, `Mainnet private settlement status must mirror settlement evidence ref ${key}.`);
}

assert.match(refs.relayerSubmittedSpendTxRef, /^solana-tx:[1-9A-HJ-NP-Za-km-z]{32,100}$/);
assert.match(refs.nullifierReplayRejectionRef, /^operator-nullifier-replay:production-duplicate-rejected-/);
assert.match(refs.operatorReceiptRef, /^operator-receipt:ppv2_/);
assert.match(refs.protocolSettlementRef, /^operator-protocol-settlement:proto_/);

assert.equal(
  refs.sharedCohortDepositTxRef.startsWith("solana-tx:"),
  false,
  "Current shared cohort deposit ref is intentionally not a promotion-ready Solana tx ref.",
);
assert.equal(
  review.reviewedLiveChecklist.find((item) => item.id === "shared-cohort-deposit-transaction")?.result,
  "blocked",
  "Shared cohort deposit checklist item must stay blocked until the ref is a reviewed solana-tx ref.",
);
assert.equal(
  review.promotionDecision.reviewedLiveAllowed,
  false,
  "Reviewed-live promotion must remain blocked while settlement lineage is incomplete.",
);
assert.equal(status.actualPrivateMainnetEvidence.lineage.settlementEvidenceMatchesCurrentApproval, false);
assert.equal(status.liveMainnetPrivateSettlementAvailable, false);
assert.equal(status.privacyClaimAllowed, false);
assert.equal(status.productionReady, false);

console.log("Vanta actual-private settlement lineage check: PASS");

function readJson(path) {
  return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
}
