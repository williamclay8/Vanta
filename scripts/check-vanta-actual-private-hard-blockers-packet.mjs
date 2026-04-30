import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaMainnetPrivateSettlementStatus } from "../src/readiness/mainnetPrivateSettlementStatus.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/actual-private-hard-blockers.packet.json");
const packagePath = resolve(repoRoot, "package.json");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

assert.ok(existsSync(packetPath), "Missing actual-private hard blockers packet.");

const packet = readJson("ops/mainnet/actual-private-hard-blockers.packet.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const production = readJson("ops/mainnet/actual-private-production-evidence.packet.json");
const reviewerPacket = readJson("ops/mainnet/private-pool-v2-production-privacy-reviewer.packet.json");
const anonymity = readJson("ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
const settlement = createVantaMainnetPrivateSettlementStatus();
const approval = createVantaMainnetRealFundsApprovalStatus();

assert.equal(packet.version, "vanta-actual-private-hard-blockers-packet-0.1");
assert.equal(packet.mainnetReady, false);
assert.equal(packet.productionReady, false);
assert.equal(packet.privacyClaimAllowed, false);
assert.equal(packet.secretPolicy, "references-only-no-secret-values");
assert.equal(packet.stopBoundary.liveMainnetActionsAllowedNow, approval.liveMainnetActionsAllowedNow);
assert.equal(
  packet.stopBoundary.stopConditionStatus,
  approval.stopCondition.appliesToCurrentApproval ? "fired" : "not-applicable-to-current-approval",
);
assert.equal(packet.stopBoundary.fundsMoved, false);
assert.equal(packet.stopBoundary.currentApprovalActionRef, approval.approvalActionRef);
assert.equal(packet.stopBoundary.currentApprovalWindowRef, approval.approvalWindowRef);
assert.equal(approval.stopCondition.appliesToCurrentApproval, false);
assert.equal(settlement.privacyClaimAllowed, false);
assert.equal(settlement.productionReady, false);
assert.equal(settlement.mainnetReady, false);
assert.equal(production.privacyClaimAllowed, false);
assert.equal(reviewerPacket.privacyClaimAllowed, false);
assert.equal(anonymity.currentMeasurement.distinctCommitmentCount, 2);
assert.equal(anonymity.currentMeasurement.minimumDistinctCommitments, 1024);
assert.equal(anonymity.currentMeasurement.reviewerAccepted, false);

const blockers = new Map(packet.hardBlockers.map((blocker) => [blocker.id, blocker]));
for (const id of [
  "fresh-bounded-approval",
  "shared-cohort-deposit-transaction",
  "authenticated-production-duplicate-replay-rejection",
  "minimum-live-commitments",
  "independent-anonymity-measurement-review",
  "independent-production-relayer-separation-review",
  "third-party-audit-report-and-fix-verification",
  "legal-compliance-custody-review",
]) {
  assert.ok(blockers.has(id), `Missing hard blocker ${id}.`);
  assert.equal(blockers.get(id).mayBeDoneByCodexAlone, false, `${id} must not be marked Codex-only doable.`);
  assert.ok(blockers.get(id).truthBoundary, `${id} must include a truth boundary.`);
}

assert.equal(blockers.get("fresh-bounded-approval").status, "blocked-expired-bounded-approval");
assert.equal(
  blockers.get("fresh-bounded-approval").currentArtifactRef,
  `approval-window:${approval.approvalWindowRef.replace(" America/Los_Angeles", "-America-Los_Angeles")}`,
);
assert.equal(blockers.get("shared-cohort-deposit-transaction").currentArtifactRef, "review:shared-cohort-deposit-ref-not-yet-solscan-final-reviewed-2055-2220");
assert.equal(blockers.get("shared-cohort-deposit-transaction").requiredArtifactShape, "solana-tx:<shared-cohort-deposit-mainnet-signature>");
assert.equal(blockers.get("authenticated-production-duplicate-replay-rejection").requiredArtifactShape, "operator-nullifier-replay:<production-duplicate-rejection-ref>");
assert.equal(blockers.get("authenticated-production-duplicate-replay-rejection").currentArtifactRef, null);
assert.equal(blockers.get("minimum-live-commitments").currentArtifactRef, "metrics:stablecoin-usdc-v1-distinct-commitments-2-of-1024-2026-04-29");
assert.equal(blockers.get("third-party-audit-report-and-fix-verification").currentArtifactRef, null);
assert.equal(blockers.get("legal-compliance-custody-review").currentArtifactRef, null);

for (const command of [
  "npm run mainnet:actual-private-hard-blockers-check",
  "npm run mainnet:real-funds-approval-status-check",
  "npm run mainnet:actual-private-shared-cohort-deposit-review-check",
  "npm run mainnet:actual-private-replay-reconcile-check",
  "npm run private-pool-v2:anonymity-set-metrics-check",
  "npm run private-pool-v2:production-privacy-reviewer-packet-check",
  "npm run mainnet:private-settlement-check",
  "npm run mainnet:external-gates-production-claim-check",
  "npm run truth:privacy-claim-gate",
]) {
  assert.ok(packet.canonicalVerificationCommands.includes(command), `Missing canonical command ${command}.`);
}

for (const nonClaim of [
  "not production private",
  "not mainnet-ready",
  "not audited",
  "not anonymous",
  "not untraceable",
  "not legal/compliance/custody approved",
]) {
  assert.ok(packet.nonClaims.includes(nonClaim), `Missing non-claim ${nonClaim}.`);
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
  "signedTransaction",
  "rawSecret",
]) {
  assert.ok(!serialized.includes(forbidden), `Hard blockers packet must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-hard-blockers-check"],
  "node scripts/check-vanta-actual-private-hard-blockers-packet.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-hard-blockers-check"),
  "mainnet:preflight must include actual-private hard blockers check.",
);

console.log("Vanta actual-private hard blockers packet check: PASS");
