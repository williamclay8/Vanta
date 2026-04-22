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
assert.equal(evidence.realFundsAllowed, false);
assert.equal(evidence.status, "pending-explicit-approval");
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(evidence.approvalPolicy, "exact-action-required-before-mainnet-funds");
assert.ok(Date.parse(evidence.checkedAt), "Real-funds approval evidence must include parseable checkedAt.");

for (const gateId of ["third-party-security-audit", "legal-compliance-custody"]) {
  const gate = evidence.knownSkippedGates.find((candidate) => candidate.id === gateId);
  assert.ok(gate, `Missing skipped gate record for ${gateId}.`);
  assert.equal(gate.status, "skipped-by-operator-not-cleared");
  assert.equal(gate.riskAcceptedBy, "operator");
  assert.ok(gate.note.includes("No "), `${gateId} skipped gate must preserve missing approval note.`);
}

const approval = evidence.approvalRecord;
assert.equal(approval.status, "not-approved");
assert.equal(approval.approvedActionRef, "pending");
assert.equal(approval.approvedActionSummary, "pending");

for (const refField of [
  "approvalRecordRef",
  "approvedFeePayerRef",
  "approvedLaunchWindowRef",
  "rollbackPlanRef",
  "stopLossPlanRef",
  "maximumFundsAtRiskRef",
  "approvedByRef",
]) {
  assert.ok(String(approval[refField]).endsWith("_REF"), `${refField} must be a reference name.`);
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
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:real-funds-approval-check"),
  "mainnet:preflight must include real-funds approval check.",
);

console.log("Vanta mainnet real-funds approval check: PASS");
