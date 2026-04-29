import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const reviewPath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

const review = JSON.parse(readFileSync(reviewPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

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

for (const id of [
  "operator-receipt-found",
  "operator-receipt-shape",
  "operator-public-transcript-redaction",
  "indexer-nullifier-found",
  "indexer-output-commitments-found",
  "accepted-root-current",
]) {
  assert.equal(review.passedChecks.find((check) => check.id === id)?.result, "pass", `Missing passed check ${id}.`);
}

for (const id of [
  "solscan-relayer-spend-transaction",
  "shared-cohort-deposit-transaction",
  "live-nullifier-replay-rejection",
]) {
  assert.equal(
    review.failedOrBlockedChecks.find((check) => check.id === id)?.result,
    "blocked",
    `Missing blocked check ${id}.`,
  );
}

assert.match(review.finalVerdict, /Do not claim Solscan-untrackable/);
assert.match(review.finalVerdict, /on-chain relayer\/deposit\/replay evidence is still missing/);

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

console.log("Vanta actual-private mainnet settlement review evidence check: PASS");
