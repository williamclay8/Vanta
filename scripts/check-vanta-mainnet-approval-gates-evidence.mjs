import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/mainnet-approval-gates.evidence.json");
const templatePath = resolve(repoRoot, "ops/mainnet/mainnet-approval-gates.template.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/mainnet-approval-gates.evidence.json.");
assert.ok(existsSync(templatePath), "Missing ops/mainnet/mainnet-approval-gates.template.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const template = JSON.parse(readFileSync(templatePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-mainnet-approval-gates-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.realFundsAllowed, true);
assert.equal(evidence.status, "bounded-real-funds-approval-recorded-with-operator-skipped-controls");
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(evidence.realFundsPolicy, "explicit-human-approval-required");
assert.equal(evidence.templateRef, "ops/mainnet/mainnet-approval-gates.template.json");
assert.ok(Date.parse(evidence.checkedAt), "Approval gates evidence must include a parseable checkedAt timestamp.");

const expectedGateIds = [
  "secret-manager-backed-credentials",
  "private-pool-v2-production-smoke",
  "third-party-security-audit",
  "legal-compliance-custody",
  "explicit-mainnet-funds-approval",
];

assert.equal(evidence.gates.length, expectedGateIds.length, "Approval gates evidence must cover every gate.");

const expectedGateStatuses = new Map([
  ["secret-manager-backed-credentials", "operator-skipped-control"],
  ["private-pool-v2-production-smoke", "evidence-recorded"],
  ["third-party-security-audit", "operator-skipped-control"],
  ["legal-compliance-custody", "operator-skipped-control"],
  ["explicit-mainnet-funds-approval", "approved-bounded-action"],
]);

for (const gateId of expectedGateIds) {
  const gate = evidence.gates.find((candidate) => candidate.id === gateId);
  const templateGate = template.gates.find((candidate) => candidate.id === gateId);
  assert.ok(gate, `Missing approval gate evidence for ${gateId}.`);
  assert.ok(templateGate, `Missing template gate for ${gateId}.`);
  assert.equal(gate.status, expectedGateStatuses.get(gateId), `${gateId} status drifted.`);
  assert.equal(gate.requiresExternalApproval, true, `${gateId} must require external approval.`);
  assert.ok(gate.currentEvidenceStatus, `${gateId} must record current evidence status.`);
  assert.ok(gate.nextAction, `${gateId} must record next action.`);
  assert.ok(Array.isArray(gate.requiredRefs) && gate.requiredRefs.length > 0, `${gateId} must list refs.`);
  assert.deepEqual(gate.requiredRefs, templateGate.evidenceRefs, `${gateId} required refs must match template refs.`);
  assert.ok(
    gate.requiredRefs.every((ref) => String(ref).endsWith("_REF")),
    `${gateId} refs must be reference names only.`,
  );
}

const fundsGate = evidence.gates.find((candidate) => candidate.id === "explicit-mainnet-funds-approval");
assert.equal(fundsGate.requiresHumanApproval, true);
assert.equal(fundsGate.mainnetTransactionsAllowedBeforeApproval, false);
assert.equal(fundsGate.realFundsAllowedBeforeApproval, false);
assert.equal(fundsGate.currentEvidenceStatus, "approved-beta-mainnet-private-pool-smoke");
assert.equal(
  fundsGate.approvedActionSummary,
  "Enable beta mainnet private-pool smoke with maximum 0.05 SOL at risk",
);
assert.equal(fundsGate.approvedActionRef, "launch-runbook/vanta-mainnet-beta-001");
assert.equal(fundsGate.maximumFundsAtRiskRef, "0.05 SOL");

for (const externalGateId of [
  "secret-manager-backed-credentials",
  "third-party-security-audit",
  "legal-compliance-custody",
]) {
  const gate = evidence.gates.find((candidate) => candidate.id === externalGateId);
  assert.ok(
    [
      "audit-rotation-evidence-skipped-by-operator",
      "not-started",
      "blocked-external-review-required",
      "skipped-by-operator",
    ].includes(gate.currentEvidenceStatus),
    `${externalGateId} must not imply approval.`,
  );
  assert.ok(gate.operatorDecision, `${externalGateId} skipped-control status must record operator decision.`);
}

const technicalRefs = new Set(evidence.currentTechnicalEvidence.map((entry) => entry.ref));
for (const requiredRef of [
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "ops/mainnet/production-migration-evidence.manifest.json",
  "ops/mainnet/production-backup-restore.evidence.json",
  "ops/mainnet/production-restore-drill.evidence.json",
  "ops/mainnet/secret-references.manifest.json",
  "SECURITY_LIMITATIONS.md",
]) {
  assert.ok(technicalRefs.has(requiredRef), `Missing current technical evidence ref: ${requiredRef}.`);
  assert.ok(existsSync(resolve(repoRoot, requiredRef)), `Missing referenced evidence file: ${requiredRef}.`);
}

for (const command of [
  "npm run mainnet:approval-gates-check",
  "npm run mainnet:approval-gates-evidence-check",
  "npm run mainnet:external-gates-check",
  "npm run mainnet:production-smoke-evidence-check",
  "npm run mainnet:production-migration-evidence-check",
  "npm run mainnet:backup-restore-evidence-check",
  "npm run mainnet:preflight",
]) {
  assert.ok(
    evidence.requiredVerificationCommands.includes(command),
    `Approval gates evidence must require ${command}.`,
  );
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
  "legal advice text",
  "signed transaction",
]) {
  assert.ok(!source.includes(forbidden), `Approval gates evidence must not contain forbidden value: ${forbidden}.`);
}

assert.ok(
  evidence.limitations.some((limitation) => limitation.includes("no audit approval has been recorded")),
  "Approval gates evidence must preserve audit skipped-control truth.",
);
assert.ok(
  evidence.limitations.some((limitation) => limitation.includes("no approval has been recorded")),
  "Approval gates evidence must preserve legal/compliance/custody skipped-control truth.",
);
assert.ok(
  evidence.limitations.some((limitation) => limitation.includes("Secret-manager audit and rotation evidence")),
  "Approval gates evidence must preserve secret-manager skipped-control truth.",
);
assert.ok(
  evidence.limitations.some((limitation) => limitation.includes("maximum 0.05 SOL at risk")),
  "Approval gates evidence must preserve bounded funds approval limit.",
);

const operatorSkippedControlIds = new Set((evidence.operatorSkippedControls ?? []).map((risk) => risk.id));
for (const riskId of [
  "pay-restore-readback-skipped",
  "provider-backup-pitr-encryption-access-audit-least-privilege-skipped",
  "secret-manager-audit-rotation-evidence-skipped",
  "third-party-security-audit-skipped",
  "legal-compliance-custody-skipped",
]) {
  assert.ok(operatorSkippedControlIds.has(riskId), `Approval gates evidence missing operator-skipped control: ${riskId}.`);
}

assert.equal(
  packageJson.scripts["mainnet:approval-gates-evidence-check"],
  "node scripts/check-vanta-mainnet-approval-gates-evidence.mjs",
  "package.json must expose mainnet:approval-gates-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:approval-gates-evidence-check"),
  "mainnet:preflight must include approval gates evidence check.",
);

console.log("Vanta mainnet approval gates evidence check: PASS");
