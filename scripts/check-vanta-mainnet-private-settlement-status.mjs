import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaMainnetPrivateSettlementStatus } from "../src/readiness/mainnetPrivateSettlementStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packagePath = resolve(repoRoot, "package.json");

const result = createVantaMainnetPrivateSettlementStatus();
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(result.version, "vanta-mainnet-private-settlement-status-0.1");
assert.equal(result.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(
  result.anonymitySetReadiness?.version,
  "vanta-private-pool-v2-anonymity-set-readiness-0.1",
);
assert.equal(result.anonymitySetReadiness?.anonymitySetReadiness, "blocked");
assert.equal(result.anonymitySetReadiness?.minimumDistinctCommitments, 1024);
assert.equal(result.mainnetReady, false);
assert.equal(result.productionReady, false);
assert.equal(result.meaningfulPrivacyReady, false);
assert.equal(result.auditedSharedAnonymitySetAvailable, false);
assert.equal(result.liveMainnetPrivateSettlementAvailable, false);
assert.equal(
  result.boundedRealFundsApprovalWindowActive,
  result.realFundsApprovalWindowStatus === "active",
);
assert.equal(result.privacyClaimAllowed, false);
assert.equal(result.privacyRailCanClaimMeaningfulPrivacy, false);
assert.equal(result.settlementReadiness, "no-real-funds-production-smoke-only");
assert.equal(result.routeHealthPublicPassed, true);
assert.equal(result.routeHealthAuthenticatedPassed, true);
assert.equal(result.productionSmokeHealthPassed, true);
assert.equal(result.productionSmokeTargetsPassed, true);
assert.equal(result.replayProtocolLayerImplemented, true);
assert.deepEqual(result.actualPrivateMainnetEvidence, {
  liveMainnetSettlementProven: false,
  noRealFundsSmokeTargetPassed: true,
  noRealFundsSmokeTranscript: "pool-cohort-root-nullifier-output-context-only",
  requiredLiveEvidence: [
    "bounded real-funds approval for the exact actual-private action",
    "live mainnet deposit transaction into the shared cohort",
    "live mainnet relayer-submitted private spend transaction",
    "operator receipt binding accepted root, nullifier, output commitments, and proof public-input hash",
    "post-settlement nullifier replay rejection against the live production store",
    "reviewer packet proving no source wallet, merchant address, raw amount, input commitment, input leaf index, deposit signature, plaintext memo, or same-fee-payer linkage appears in the public spend transcript",
  ],
  status: "no-real-funds-smoke-only",
});
assert.equal(result.realFundsApprovalRecorded, true);
assert.equal(result.realFundsAllowedNow, result.realFundsApprovalWindowStatus === "active");
assert.equal(result.noRealFundsSmokeOnly, true);
const expectedMeaningfulPrivacyBlockedBy = [
  "no-proven-audited-shared-anonymity-set",
  "no-live-mainnet-private-settlement-path",
  "no-third-party-audit",
  "no-production-anonymity-set-metrics",
  "no-production-relayer-separation-evidence",
  "no-proven-audited-shared-anonymity-set",
  "no-live-mainnet-private-settlement-path",
  "no-live-actual-private-mainnet-settlement-evidence",
  ...(result.boundedRealFundsApprovalWindowActive ? [] : ["no-active-bounded-real-funds-approval-window"]),
];
assert.deepEqual(result.meaningfulPrivacyBlockedBy, [...new Set(expectedMeaningfulPrivacyBlockedBy)]);
assert.ok(
  ["scheduled", "active", "expired"].includes(result.realFundsApprovalWindowStatus),
  "Private settlement status must expose a bounded approval-window status.",
);
assert.deepEqual(result.checkedEvidenceRefs, [
  "ops/mainnet/private-pool-v2-route-health.evidence.json",
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
  "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
  "ops/mainnet/actual-private-production-evidence.packet.json",
  "ops/mainnet/service-deployment.evidence.json",
  "ops/mainnet/mainnet-real-funds-approval.evidence.json",
]);
assert.ok(
  result.deploymentTruth.includes("no-real-funds production smoke coverage"),
  "Private settlement status must preserve the no-real-funds production smoke truth.",
);
assert.ok(
  result.deploymentTruth.includes("must not be presented as live mainnet private settlement"),
  "Private settlement status must preserve the non-ready user-facing truth.",
);
assert.ok(
  result.deploymentTruth.includes("no proven audited shared anonymity set"),
  "Private settlement status must preserve the missing audited-anonymity-set truth.",
);
assert.ok(
  result.deploymentTruth.includes("no live mainnet private settlement path"),
  "Private settlement status must preserve the missing live-mainnet-settlement truth.",
);
assert.ok(
  result.boundedRealFundsApprovalWindowActive
    ? result.deploymentTruth.includes("current bounded real-funds approval window is active")
    : result.deploymentTruth.includes("no active bounded real-funds approval window"),
  "Private settlement status must preserve the current bounded-approval-window truth.",
);

assert.equal(
  packageJson.scripts["mainnet:private-settlement-status"],
  "node scripts/print-vanta-mainnet-private-settlement-status.mjs",
  "package.json must expose mainnet:private-settlement-status.",
);
assert.equal(
  packageJson.scripts["mainnet:private-settlement-status-check"],
  "node scripts/print-vanta-mainnet-private-settlement-status.mjs --check",
  "package.json must expose mainnet:private-settlement-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:private-settlement-check"],
  "node scripts/check-vanta-mainnet-private-settlement-status.mjs",
  "package.json must expose mainnet:private-settlement-check.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-readiness-check"],
  "node scripts/check-vanta-private-pool-v2-anonymity-set-readiness.mjs",
  "package.json must expose private-pool-v2:anonymity-set-readiness-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:private-settlement-check"),
  "mainnet:preflight must include the private settlement status check.",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-production-evidence-check"],
  "node scripts/check-vanta-actual-private-production-evidence.mjs",
  "package.json must expose mainnet:actual-private-production-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-production-evidence-check"),
  "mainnet:preflight must include actual-private production evidence check.",
);

console.log("Vanta mainnet private settlement status check: PASS");
