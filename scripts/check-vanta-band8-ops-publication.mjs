import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRequired(relativePath) {
  const absolute = resolve(repoRoot, relativePath);
  assert.ok(existsSync(absolute), `Missing ${relativePath}.`);
  return readFileSync(absolute, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readRequired(relativePath));
}

function requirePhrase(source, phrase, relativePath) {
  assert.ok(source.includes(phrase), `${relativePath} is missing required phrase: ${phrase}`);
}

function rejectPhrase(source, phrase, relativePath) {
  assert.ok(!source.toLowerCase().includes(phrase.toLowerCase()), `${relativePath} contains blocked phrase: ${phrase}`);
}

function assertNoSecretLikeMaterial(source, relativePath) {
  const forbiddenPatterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /\bBearer\s+[A-Za-z0-9._~-]{10,}/u,
    /\bpostgres(?:ql)?:\/\/\S+/u,
    /\bsk_(?:live|test)_[A-Za-z0-9]+/u,
    /\bwhsec_[A-Za-z0-9]+/u,
    /\bprivateKey\s*[:=]\s*["'][^"']+["']/u,
    /\bsignedTransaction\s*[:=]\s*["'][^"']+["']/u,
    /\bownerSecret\s*[:=]/u,
    /\bviewingKeyPlaintext\s*[:=]/u,
    /\bnoteBlinding\s*[:=]/u,
    /\b(?:seed phrase|mnemonic)\s*:\s*[a-z]+(?:\s+[a-z]+){3,}/iu,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.ok(!pattern.test(source), `${relativePath} contains secret-like material matching ${pattern}.`);
  }
}

function requireRunbookRef(source, ref, relativePath) {
  requirePhrase(source, ref, relativePath);
}

const threatModel = readRequired("docs/threat-model.md");
const incidentRunbook = readRequired("docs/incident-response-runbook.md");
const keyCustodyRunbook = readRequired("docs/key-custody-runbook.md");
const deploymentRunbook = readRequired("docs/mainnet-deployment-runbook.md");
const operatorRunbook = readRequired("docs/operator-runbook.md");
const externalGates = readRequired("docs/mainnet-external-gates.md");
const limitations = readRequired("SECURITY_LIMITATIONS.md");
const incidentEvidence = readJson("ops/mainnet/production-incident-workflow.evidence.json");
const keyCustodyTemplate = readJson("ops/mainnet/production-key-custody.template.json");
const packageJson = readJson("package.json");

for (const [source, relativePath] of [
  [incidentRunbook, "docs/incident-response-runbook.md"],
  [keyCustodyRunbook, "docs/key-custody-runbook.md"],
]) {
  for (const phrase of [
    "Status: operator-trusted beta runbook.",
    "Launch status unchanged.",
    "Claim Gates Stay Locked",
    "External Refs Required Before Claim Movement",
    "npm run compliance:ops-publication-check",
  ]) {
    requirePhrase(source, phrase, relativePath);
  }

  for (const blockedPhrase of ["production-ready", "mainnet-ready", "audited", "fully private", "untraceable"]) {
    rejectPhrase(source, blockedPhrase, relativePath);
  }

  assertNoSecretLikeMaterial(source, relativePath);
}

for (const phrase of [
  "No Secret Material In Incident Records",
  "Stop Or Suspend",
  "Preserve Evidence",
  "Secret-Safe Debugging",
  "External Notification And Disclosure",
  "Recovery And Post-Incident Review",
  "docs/incident-response-runbook.md",
  "ops/mainnet/production-incident-workflow.evidence.json",
]) {
  requirePhrase(incidentRunbook, phrase, "docs/incident-response-runbook.md");
}

for (const phrase of [
  "No Secret Material In This Runbook",
  "Roles And Custody Surfaces",
  "Access And Approval",
  "multisig/HSM/Turnkey custody refs",
  "Rotation And Revocation",
  "Emergency Freeze",
  "Break-Glass Controls",
  "Access Audit",
  "ops/mainnet/production-key-custody.template.json",
]) {
  requirePhrase(keyCustodyRunbook, phrase, "docs/key-custody-runbook.md");
}

for (const [source, relativePath] of [
  [threatModel, "docs/threat-model.md"],
  [deploymentRunbook, "docs/mainnet-deployment-runbook.md"],
  [operatorRunbook, "docs/operator-runbook.md"],
  [externalGates, "docs/mainnet-external-gates.md"],
  [limitations, "SECURITY_LIMITATIONS.md"],
]) {
  requireRunbookRef(source, "docs/incident-response-runbook.md", relativePath);
  requireRunbookRef(source, "docs/key-custody-runbook.md", relativePath);
  requireRunbookRef(source, "npm run compliance:ops-publication-check", relativePath);
}

assert.equal(incidentEvidence.mainnetReady, false);
assert.equal(incidentEvidence.productionReady, false);
for (const ref of [
  "docs/incident-response-runbook.md#stop-or-suspend",
  "docs/incident-response-runbook.md#secret-safe-debugging",
  "docs/key-custody-runbook.md#emergency-freeze",
]) {
  assert.ok(incidentEvidence.checkedRunbookRefs.includes(ref), `Missing incident evidence runbook ref: ${ref}.`);
}
assert.ok(
  incidentEvidence.runbookPublicationRefs?.includes("docs/incident-response-runbook.md"),
  "Incident evidence must include the incident-response publication ref.",
);
assert.ok(
  incidentEvidence.runbookPublicationRefs?.includes("docs/key-custody-runbook.md"),
  "Incident evidence must include the key-custody publication ref.",
);
assertNoSecretLikeMaterial(JSON.stringify(incidentEvidence), "ops/mainnet/production-incident-workflow.evidence.json");

assert.equal(keyCustodyTemplate.mainnetReady, false);
assert.equal(keyCustodyTemplate.productionReady, false);
assert.equal(keyCustodyTemplate.productionKeyCustodyReady, false);
for (const ref of [
  "VANTA_KEY_CUSTODY_RUNBOOK_REF",
  "VANTA_INCIDENT_RESPONSE_RUNBOOK_REF",
]) {
  assert.ok(keyCustodyTemplate.requiredRefs.includes(ref), `Missing key-custody required ref: ${ref}.`);
}
for (const ref of [
  "docs/key-custody-runbook.md",
  "docs/incident-response-runbook.md",
  "docs/threat-model.md",
]) {
  assert.ok(keyCustodyTemplate.runbookPublicationRefs?.includes(ref), `Missing key-custody publication ref: ${ref}.`);
}
assertNoSecretLikeMaterial(JSON.stringify(keyCustodyTemplate), "ops/mainnet/production-key-custody.template.json");

assert.equal(
  packageJson.scripts["compliance:ops-publication-check"],
  "node scripts/check-vanta-band8-ops-publication.mjs",
);

console.log("Vanta Band 8 ops publication check: PASS");
