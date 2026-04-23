import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/mainnet-real-funds-approval.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/mainnet-real-funds-approval.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-mainnet-real-funds-approval-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.realFundsAllowed, true);
assert.equal(evidence.status, "approved-bounded-action");
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(evidence.approvalPolicy, "exact-action-required-before-mainnet-funds");
assert.ok(Date.parse(evidence.checkedAt), "Real-funds approval evidence must include parseable checkedAt.");

for (const gateId of ["third-party-security-audit", "legal-compliance-custody"]) {
  const gate = evidence.knownSkippedGates.find((candidate) => candidate.id === gateId);
  assert.ok(gate, `Missing skipped gate record for ${gateId}.`);
  assert.equal(gate.status, "skipped-by-operator");
  assert.equal(gate.skippedBy, "operator");
  assert.ok(gate.note.includes("No "), `${gateId} skipped gate must preserve missing approval note.`);
}

const approval = evidence.approvalRecord;
assert.equal(approval.status, "approved");
assert.equal(approval.approvedActionRef, "launch-runbook/vanta-mainnet-beta-001");
assert.equal(
  approval.approvedActionSummary,
  "Enable beta mainnet private-pool smoke with maximum 0.05 SOL at risk",
);
assert.equal(approval.approvedEnvironment, "mainnet-beta");
assert.equal(approval.approvedFeePayerRef, "wallet/public-fee-payer-vanta-beta");
assert.equal(approval.approvedLaunchWindowRef, "2026-04-22T14:30:00-15:30:00 America/Chicago");
assert.equal(approval.rollbackPlanRef, "runbook/disable-private-pool-v2-services-and-beta-actions");
assert.equal(approval.stopLossPlanRef, "max-0.05-sol-or-first-failed-settlement");
assert.equal(approval.maximumFundsAtRiskRef, "0.05 SOL");
assert.equal(approval.approvedByRef, "Clay / founder approval / 2026-04-22");

for (const refField of [
  "approvalRecordRef",
]) {
  assert.ok(String(approval[refField]).endsWith("_REF"), `${refField} must be a reference name.`);
}

for (const requiredField of [
  "approvedActionRef",
  "approvedActionSummary",
  "approvedFeePayerRef",
  "approvedLaunchWindowRef",
  "rollbackPlanRef",
  "stopLossPlanRef",
  "maximumFundsAtRiskRef",
  "approvedByRef",
]) {
  assert.ok(approval[requiredField] && approval[requiredField] !== "pending", `${requiredField} must be filled.`);
}

for (const requirement of [
  "approvedActionSummary",
  "approvedActionRef",
  "approvedFeePayerRef",
  "approvedLaunchWindowRef",
  "rollbackPlanRef",
  "stopLossPlanRef",
  "maximumFundsAtRiskRef",
  "approvedByRef",
]) {
  assert.ok(
    evidence.requiredBeforeApproval.some((entry) => entry.includes(requirement)),
    `Missing approval requirement for ${requirement}.`,
  );
}

for (const command of [
  "npm run mainnet:real-funds-approval-check",
  "npm run mainnet:approval-gates-evidence-check",
  "npm run wallet:transaction-safety-check",
  "npm run mainnet:preflight",
]) {
  assert.ok(evidence.requiredVerificationCommands.includes(command), `Missing required command ${command}.`);
}

const source = JSON.stringify(evidence);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "sk_live_",
]) {
  assert.ok(!source.includes(forbidden), `Real-funds approval evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:real-funds-approval-check"],
  "node scripts/check-vanta-mainnet-real-funds-approval.mjs",
  "package.json must expose mainnet:real-funds-approval-check.",
);
assert.equal(
  packageJson.scripts["mainnet:real-funds-approval-status"],
  "node scripts/print-vanta-mainnet-real-funds-approval-status.mjs",
  "package.json must expose mainnet:real-funds-approval-status.",
);
assert.equal(
  packageJson.scripts["mainnet:real-funds-approval-status-check"],
  "node scripts/print-vanta-mainnet-real-funds-approval-status.mjs --check",
  "package.json must expose mainnet:real-funds-approval-status-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:real-funds-approval-check"),
  "mainnet:preflight must include real-funds approval check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:real-funds-approval-status-check"),
  "mainnet:preflight must include real-funds approval status check.",
);

console.log("Vanta mainnet real-funds approval check: PASS");
