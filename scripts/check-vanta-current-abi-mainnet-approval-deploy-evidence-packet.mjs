import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/current-abi-mainnet-spend-program-approval-deploy-evidence.packet.json");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const packet = JSON.parse(readFileSync(packetPath, "utf8"));

assert.equal(packet.version, "vanta-current-abi-mainnet-spend-program-approval-deploy-evidence-packet-0.1");
assert.equal(packet.mainnetReady, false);
assert.equal(packet.productionReady, false);
assert.equal(packet.privacyClaimAllowed, false);
assert.equal(packet.realFundsAllowedNow, false);
assert.equal(packet.approvalStatus, "draft-not-approved");
assert.equal(packet.requiresClayApproval, true);
assert.equal(packet.secretPolicy, "references-only-no-secret-values");
assert.ok(packet.purpose.includes("does not approve funds"));

assert.equal(packet.canonicalSource.repository, "Vanta-stable");
assert.equal(packet.canonicalSource.branch, "codex/five-products-audit-integration");
assert.equal(packet.canonicalSource.artifactBuildCommit, "0e2e6933");

assert.equal(
  packet.currentAbiSbfArtifact.path,
  "programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so",
);
assert.match(packet.currentAbiSbfArtifact.sha256, /^[0-9a-f]{64}$/);
assert.equal(packet.currentAbiSbfArtifact.sha256, "ff128d4a8169c95a67cf25cd895d8b328cff4607704ee0dc3d57276f10bca91d");
assert.equal(packet.currentAbiSbfArtifact.sizeBytes, 188952);
assert.equal(packet.currentAbiSbfArtifact.abi, "output-record-pda-eight-account-spend-v1");
assert.equal(packet.currentAbiSbfArtifact.artifactStatus, "fresh-local-build-reviewed-no-live-funds");
for (const command of [
  "npm run private-pool-v2:sbf-abi-check",
  "npm run zk:c01-sbf-live-lineage-candidate-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
]) {
  assert.ok(packet.currentAbiSbfArtifact.requiredFreshnessCommands.includes(command), `Missing freshness command ${command}.`);
}

const artifactPath = resolve(repoRoot, packet.currentAbiSbfArtifact.path);
if (existsSync(artifactPath)) {
  const artifact = readFileSync(artifactPath);
  const digest = createHash("sha256").update(artifact).digest("hex");
  assert.equal(digest, packet.currentAbiSbfArtifact.sha256, "Local SBF artifact hash must match packet hash.");
  assert.equal(statSync(artifactPath).size, packet.currentAbiSbfArtifact.sizeBytes, "Local SBF artifact size must match packet size.");
}

assert.equal(packet.proposedApprovalRecord.approvalRecordRef, "VANTA_MAINNET_REAL_FUNDS_APPROVAL_REF");
assert.equal(
  packet.proposedApprovalRecord.proposedActionRef,
  "actual-private/current-abi-mainnet-spend-program-deploy-reinit-evidence-run-2026-06-18-2000-2130-central",
);
assert.ok(packet.proposedApprovalRecord.proposedActionSummary.includes("maximum 2.0 SOL at risk"));
assert.equal(packet.proposedApprovalRecord.proposedEnvironment, "mainnet-beta");
assert.equal(
  packet.proposedApprovalRecord.proposedFeePayerRef,
  "wallet/public-fee-payer-vanta-mainnet-5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi",
);
assert.equal(packet.proposedApprovalRecord.proposedLaunchWindowRef, "2026-06-18T20:00:00-21:30:00 America/Chicago");
assert.equal(packet.proposedApprovalRecord.rollbackPlanRef, "runbook/disable-private-pool-v2-services-and-live-actions");
assert.equal(packet.proposedApprovalRecord.maximumFundsAtRiskRef, "2.0 SOL");
assert.equal(packet.proposedApprovalRecord.approvedByRef, "PENDING_CLAY_APPROVAL");
assert.equal(packet.proposedApprovalRecord.approvalWriteAllowedNow, false);
assert.ok(packet.proposedApprovalRecord.maximumFundsAtRiskRationale.includes("0.015 SOL approval cap is not sufficient"));

assert.equal(packet.rollbackPlan.rollbackPlanRef, "runbook/disable-private-pool-v2-services-and-live-actions");
assert.ok(packet.rollbackPlan.actions.some((action) => action.includes("Stop all live Private Pool v2")));

for (const stopText of [
  "git status is dirty",
  "SBF artifact sha256 differs",
  "fresh Clay approval exists",
  "estimated deploy, upgrade, smoke, and settlement cost exceeds 2.0 SOL",
  "Stop after one failed live transaction",
  "no retries or extra live funds without a new bounded approval window",
]) {
  assert.ok(packet.stopConditions.some((condition) => condition.includes(stopText)), `Missing stop condition: ${stopText}`);
}

const commands = packet.exactCommands;
for (const section of [
  "safePreWindowNoLiveFunds",
  "approvalEvidencePreviewOnly",
  "approvalEvidenceWriteAfterExplicitClayApprovalOnly",
  "liveWindowHumanOnly",
  "postWindowEvidenceWriteAfterActualRefsOnly",
  "postWindowReviewNoLiveFunds",
]) {
  assert.ok(Array.isArray(commands[section]), `exactCommands.${section} must be an array.`);
  assert.ok(commands[section].length > 0, `exactCommands.${section} must not be empty.`);
}

for (const command of [
  "git status --short --branch",
  "npm run mainnet:current-abi-approval-deploy-evidence-print",
  "shasum -a 256 programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so",
  "npm run private-pool-v2:sbf-abi-check",
  "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
  "npm run mainnet:production-evidence-next-check",
  "npm run mainnet:current-abi-approval-deploy-evidence-check",
]) {
  assert.ok(commands.safePreWindowNoLiveFunds.includes(command), `Missing safe pre-window command ${command}.`);
}

assert.ok(
  commands.approvalEvidencePreviewOnly.some((command) => command.includes("npm run mainnet:real-funds-approval-preview")),
  "Approval preview command must be present.",
);
assert.ok(
  commands.approvalEvidenceWriteAfterExplicitClayApprovalOnly.some((command) =>
    command.includes("npm run mainnet:real-funds-approval-write"),
  ),
  "Approval write command must be present behind explicit approval.",
);
for (const liveNeedle of [
  "solana program deploy",
  "VANTA_PRIVATE_POOL_V2_MAINNET_SMOKE_APPROVAL=I_APPROVE_VANTA_MAINNET_SPEND_PROGRAM_SMOKE",
  "npm run private-pool-v2:spend-program-smoke",
  "npm run mainnet:actual-private-settlement-plan-env-packet",
  "npm run private-pool-v2:solana-spend-transaction",
  "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK=I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS",
  "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK=I_UNDERSTAND_THIS_WILL_REQUEST_A_MAINNET_PRIVATE_SETTLEMENT",
  "npm run mainnet:actual-private-settlement-live -- --execute",
]) {
  assert.ok(commands.liveWindowHumanOnly.some((command) => command.includes(liveNeedle)), `Missing live command needle ${liveNeedle}.`);
}
for (const evidenceNeedle of [
  "solana-tx:<DEPLOY_TX>",
  "solana-tx:<INIT_TX>",
  "solana-tx:<SPEND_TX>",
  "npm run mainnet:actual-private-settlement-evidence-preview",
  "npm run mainnet:actual-private-settlement-evidence-write",
]) {
  assert.ok(
    commands.postWindowEvidenceWriteAfterActualRefsOnly.some((command) => command.includes(evidenceNeedle)),
    `Missing post-window evidence command needle ${evidenceNeedle}.`,
  );
}

for (const approvalGate of [
  "mainnet:real-funds-approval-write",
  "solana program deploy",
  "private-pool-v2:spend-program-smoke",
  "mainnet:actual-private-settlement-live -- --execute",
  "mainnet:actual-private-settlement-evidence-write",
]) {
  assert.ok(packet.requiredHumanApprovalBefore.includes(approvalGate), `Missing human approval gate ${approvalGate}.`);
}

for (const nonClaim of [
  "This is not live-funds approval.",
  "This is not a deployment record.",
  "This is not production privacy evidence.",
  "This is not audited anonymity evidence.",
  "This is not independent relayer separation review.",
]) {
  assert.ok(packet.nonClaims.includes(nonClaim), `Missing non-claim ${nonClaim}`);
}

assert.equal(
  packageJson.scripts["mainnet:current-abi-approval-deploy-evidence-print"],
  "node scripts/print-vanta-current-abi-mainnet-approval-deploy-evidence-packet.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:current-abi-approval-deploy-evidence-check"],
  "node scripts/check-vanta-current-abi-mainnet-approval-deploy-evidence-packet.mjs",
);

const printedChecklist = execFileSync("npm", ["run", "--silent", "mainnet:current-abi-approval-deploy-evidence-print"], {
  cwd: repoRoot,
  encoding: "utf8",
});
for (const requiredOutput of [
  "Vanta current ABI approval/deploy/evidence checklist",
  "Approval status: draft-not-approved",
  "Real funds allowed now: false",
  "Privacy claim allowed: false",
  "No live funds, signing, deployment, approval write, or evidence write may run from this checklist alone.",
  "SHA256: ff128d4a8169c95a67cf25cd895d8b328cff4607704ee0dc3d57276f10bca91d",
  "Window: 2026-06-18T20:00:00-21:30:00 America/Chicago",
  "Max funds at risk: 2.0 SOL",
  "Live Window Human-Only Commands",
  "Post-Window Evidence Write After Actual Refs Only",
]) {
  assert.ok(printedChecklist.includes(requiredOutput), `Printed checklist must include ${requiredOutput}.`);
}
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:current-abi-approval-deploy-evidence-check"),
  "mainnet:preflight must include current ABI approval/deploy/evidence packet check.",
);

const productionEvidenceNextSource = readFileSync(resolve(repoRoot, "src/readiness/productionEvidenceNextBlockers.mjs"), "utf8");
assert.ok(
  productionEvidenceNextSource.includes("current-abi-mainnet-spend-program-approval-deploy-evidence.packet.json"),
  "Production evidence next-blockers must point at this approval/deploy/evidence packet.",
);
assert.ok(
  productionEvidenceNextSource.includes("npm run mainnet:current-abi-approval-deploy-evidence-check"),
  "Production evidence next-blockers must name this packet checker.",
);
assert.ok(
  productionEvidenceNextSource.includes("npm run mainnet:current-abi-approval-deploy-evidence-print"),
  "Production evidence next-blockers must name this packet printer.",
);

const readinessSource = readFileSync(resolve(repoRoot, "src/readiness/mainnetReadiness.mjs"), "utf8");
assert.ok(
  readinessSource.includes("npm run mainnet:current-abi-approval-deploy-evidence-check"),
  "Mainnet readiness command catalog must include this packet checker.",
);

const serialized = JSON.stringify(packet);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "secretKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
  "rawSecret",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Packet must not leak ${forbidden}.`);
}

console.log("Vanta current ABI approval/deploy/evidence packet check: PASS");
