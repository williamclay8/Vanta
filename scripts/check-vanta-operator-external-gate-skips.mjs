import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createOperatorExternalGateSkips,
  filterActiveBlockers,
  getRemovedActiveBlockerIds,
} from "../src/readiness/operatorExternalGateSkips.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const skipsPath = "ops/mainnet/operator-external-gate-skips.evidence.json";
const approvalGatesPath = "ops/mainnet/mainnet-approval-gates.evidence.json";
const hardBlockersPath = "ops/mainnet/actual-private-hard-blockers.packet.json";

function fail(message) {
  console.error(`operator external gate skips: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
}

const skips = readJson(skipsPath);
const approvalGates = readJson(approvalGatesPath);
const hardBlockers = readJson(hardBlockersPath);
const packageJson = readJson("package.json");

assert(skips.version === "vanta-operator-external-gate-skips-0.1", "version mismatch");
assert(skips.status === "active", "status mismatch");
assert(skips.productionReady === false, "productionReady must remain false");
assert(skips.auditClaimAllowed === false, "auditClaimAllowed must remain false");
assert(getRemovedActiveBlockerIds().has("no-third-party-audit"), "must remove no-third-party-audit");

const auditGate = (approvalGates.gates ?? []).find((gate) => gate.id === "third-party-security-audit");
assert(auditGate?.status === "operator-skipped-control", "approval gates must keep audit gate operator-skipped");

const auditHardBlocker = (hardBlockers.hardBlockers ?? []).find(
  (blocker) => blocker.id === "third-party-audit-report-and-fix-verification",
);
assert(auditHardBlocker?.status === "operator-skipped-control", "hard blockers must mark audit gate operator-skipped");

for (const path of [
  "ops/mainnet/private-pool-v2-c01-sunspot-gnark-artifact-acquisition.packet.json",
  "ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json",
  "ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json",
]) {
  assert(existsSync(resolve(repoRoot, path)), `missing ${path}`);
  const packet = readJson(path);
  assert(
    packet.status === "operator-skipped-external-artifact-producer",
    `${path} must use operator-skipped-external-artifact-producer`,
  );
}

const auditReviewerGate = readJson("ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json");
assert(
  auditReviewerGate.status === "operator-skipped-control",
  "C01 audit reviewer gate must be operator-skipped-control",
);

assert(
  filterActiveBlockers([
    "no-third-party-audit",
    "no-proven-live-mainnet-private-settlement-evidence",
  ]).join(",") === "no-proven-live-mainnet-private-settlement-evidence",
  "filterActiveBlockers must remove skipped audit blocker ids",
);

assert(
  typeof packageJson.scripts["mainnet:operator-external-gate-skips-check"] === "string",
  "package.json must expose mainnet:operator-external-gate-skips-check",
);

const expectedRemoved = createOperatorExternalGateSkips().removedActiveBlockerIds;
assert(
  JSON.stringify(expectedRemoved) === JSON.stringify(skips.removedActiveBlockerIds),
  "removedActiveBlockerIds must match createOperatorExternalGateSkips()",
);

console.log("operator external gate skips: PASS");
console.log(`removed active blockers: ${skips.removedActiveBlockerIds.length}`);
console.log("audit claim: blocked");
console.log("C01 external producer wait: removed from active blockers");
