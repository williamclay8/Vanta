import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts["mainnet:production-evidence-next"],
  "node scripts/print-vanta-production-evidence-next-blockers.mjs",
  "package.json must expose mainnet:production-evidence-next.",
);
assert.equal(
  packageJson.scripts["mainnet:production-evidence-next-json"],
  "node scripts/print-vanta-production-evidence-next-blockers.mjs --json",
  "package.json must expose mainnet:production-evidence-next-json.",
);
assert.equal(
  packageJson.scripts["mainnet:production-evidence-next-check"],
  "node scripts/check-vanta-production-evidence-next-blockers.mjs",
  "package.json must expose mainnet:production-evidence-next-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-evidence-next-check"),
  "mainnet:preflight must include production-evidence next-blockers check.",
);

const report = JSON.parse(
  execFileSync("npm", ["run", "--silent", "mainnet:production-evidence-next-json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

assert.equal(report.version, "vanta-production-evidence-next-blockers-0.1");
assert.equal(report.mainnetReady, false);
assert.equal(report.meaningfulPrivacyReady, false);
assert.equal(report.productionReady, false);
assert.equal(report.privacyClaimAllowed, false);
assert.equal(report.realFundsAllowedNow, false);
assert.match(report.canonicalRepo.branch, /^[A-Za-z0-9._/-]+$/);
assert.match(report.canonicalRepo.headCommit, /^[0-9a-f]{7,40}$/);
assert.equal(report.canonicalRepo.liveDeploymentVerifiedForCurrentLocalCommit, false);

const blockerIds = report.nextBlockers.map((blocker) => blocker.id);
assert.deepEqual(blockerIds, [
  "current-abi-compatible-mainnet-spend-program-evidence",
  "audited-shared-anonymity-evidence",
  "independent-relayer-separation-review",
  "fresh-bounded-approval-window",
]);

for (const blocker of report.nextBlockers) {
  assert.equal(blocker.mayBeDoneByCodexAlone, false, `${blocker.id} must not be Codex-only doable.`);
  assert.ok(blocker.requiredArtifactShape, `${blocker.id} must name a required artifact shape.`);
  assert.ok(blocker.truthBoundary, `${blocker.id} must preserve a truth boundary.`);
  assert.ok(Array.isArray(blocker.canonicalCommands), `${blocker.id} must list canonical commands.`);
}

const blockers = new Map(report.nextBlockers.map((blocker) => [blocker.id, blocker]));
const spend = blockers.get("current-abi-compatible-mainnet-spend-program-evidence");
assert.equal(spend.status, "blocked-current-mainnet-evidence-abi-incompatible");
assert.equal(spend.currentLocalAbi, "output-record-pda-eight-account-spend-v1");
assert.equal(spend.reviewedMainnetEvidenceAbi, "pre-authority-gate-spend-v1");
assert.ok(spend.requiredAction.includes("Rebuild, redeploy, and reinitialize"));
assert.ok(spend.canonicalCommands.includes("npm run private-pool-v2:sbf-abi-status-json"));
assert.equal(
  spend.currentEvidenceRefs.approvalDeployEvidencePacket,
  "ops/mainnet/current-abi-mainnet-spend-program-approval-deploy-evidence.packet.json",
);
assert.equal(
  spend.currentEvidenceRefs.currentAbiSbfArtifactSha256,
  "ff128d4a8169c95a67cf25cd895d8b328cff4607704ee0dc3d57276f10bca91d",
);
assert.equal(
  spend.currentEvidenceRefs.proposedApprovalActionRef,
  "actual-private/current-abi-mainnet-spend-program-deploy-reinit-evidence-run-2026-06-18-2000-2130-central",
);
assert.equal(spend.currentEvidenceRefs.proposedMaximumFundsAtRiskRef, "2.0 SOL");
assert.equal(spend.currentEvidenceRefs.proposedLaunchWindowRef, "2026-06-18T20:00:00-21:30:00 America/Chicago");
assert.ok(spend.canonicalCommands.includes("npm run mainnet:current-abi-approval-deploy-evidence-print"));
assert.ok(spend.canonicalCommands.includes("npm run mainnet:current-abi-approval-deploy-evidence-check"));

const anonymity = blockers.get("audited-shared-anonymity-evidence");
assert.equal(anonymity.status, "blocked-measured-below-threshold-and-no-independent-review");
assert.equal(anonymity.currentMeasurement.distinctCommitmentCount, 2);
assert.equal(anonymity.currentMeasurement.minimumDistinctCommitments, 1024);
assert.equal(anonymity.currentMeasurement.reviewerAccepted, false);
assert.ok(anonymity.canonicalCommands.includes("npm run private-pool-v2:anonymity-set-metrics-json"));

const relayer = blockers.get("independent-relayer-separation-review");
assert.equal(relayer.status, "blocked-no-independent-review");
assert.equal(relayer.relayerSeparationReady, false);
assert.ok(relayer.requiredRefs.includes("VANTA_PRIVATE_POOL_V2_PRODUCTION_RELAYER_REVIEW_REF"));
assert.ok(relayer.canonicalCommands.includes("npm run private-pool-v2:production-relayer-review-check"));

const approval = blockers.get("fresh-bounded-approval-window");
assert.equal(approval.status, "blocked-expired-bounded-approval");
assert.equal(approval.approvalWindowStatus, "expired");
assert.ok(approval.requiredAction.includes("Record a new bounded approval window"));
assert.ok(approval.canonicalCommands.includes("npm run mainnet:real-funds-approval-status-json"));

for (const phrase of [
  "Build and review the current ABI spend-program artifact locally without live funds.",
  "record a fresh bounded approval window",
  "Measure a live shared anonymity cohort",
]) {
  assert.ok(report.recommendedOrder.some((action) => action.includes(phrase)), `Missing recommended action: ${phrase}`);
}

for (const nonClaim of [
  "production private",
  "live-mainnet private settlement",
  "anonymous or untraceable",
  "audited shared anonymity",
]) {
  assert.ok(report.forbiddenUntilComplete.includes(nonClaim), `Missing forbidden claim ${nonClaim}.`);
}

assert.ok(report.safety.includes("No wallet keys"));
const serialized = JSON.stringify(report);
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
  assert.ok(!serialized.includes(forbidden), `Production evidence next-blockers report must not leak ${forbidden}.`);
}

console.log("Vanta production evidence next-blockers check: PASS");
