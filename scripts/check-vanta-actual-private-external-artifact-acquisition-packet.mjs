import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/actual-private-external-artifact-acquisition.packet.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(packetPath), "Missing external artifact acquisition packet.");

const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(packet.version, "vanta-actual-private-external-artifact-acquisition-0.1");
assert.equal(packet.mainnetReady, false);
assert.equal(packet.productionReady, false);
assert.equal(packet.privacyClaimAllowed, false);
assert.equal(packet.secretPolicy, "references-only-no-secret-values");

for (const id of ["sec3", "ottersec", "veridise", "blocksec"]) {
  assert.ok(packet.auditIntakeCandidates.some((candidate) => candidate.id === id), `Missing audit candidate ${id}.`);
}

for (const id of ["dlx-law", "dilendorf", "dla-piper"]) {
  assert.ok(
    packet.legalComplianceCustodyCandidates.some((candidate) => candidate.id === id),
    `Missing legal/compliance/custody candidate ${id}.`,
  );
}

for (const material of [
  "docs/audit-package.md",
  "ops/mainnet/audit-review.packet.template.json",
  "ops/mainnet/legal-compliance-custody.packet.template.json",
  "ops/mainnet/production-key-custody.template.json",
  "ops/mainnet/private-pool-v2-production-privacy-reviewer.packet.json",
  "ops/mainnet/actual-private-hard-blockers.packet.json",
]) {
  assert.ok(packet.outreachPacket.materialsToAttachOrLink.includes(material), `Missing outreach material ${material}.`);
}

const returnedArtifacts = new Map(packet.requiredReturnedArtifacts.map((artifact) => [artifact.id, artifact]));
for (const [id, shape] of [
  ["third-party-audit-report-and-fix-verification", "audit:<third-party-report-and-fix-verification-ref>"],
  ["independent-anonymity-measurement-review", "reviewer:<independent-anonymity-set-measurement-ref>"],
  ["independent-production-relayer-separation-review", "reviewer:<production-relayer-separation-review-ref>"],
  ["legal-compliance-custody-review", "legal-compliance-custody:<review-and-approval-ref>"],
]) {
  assert.ok(returnedArtifacts.has(id), `Missing required returned artifact ${id}.`);
  assert.equal(returnedArtifacts.get(id).requiredRefShape, shape);
  assert.equal(returnedArtifacts.get(id).currentRef, null);
}

const liveArtifacts = new Map(packet.liveArtifactAcquisition.map((artifact) => [artifact.id, artifact]));
assert.equal(liveArtifacts.get("shared-cohort-deposit-transaction").requiresHumanWalletSignature, true);
assert.equal(liveArtifacts.get("authenticated-production-duplicate-replay-rejection").requiresSecretManagerShell, true);
assert.equal(liveArtifacts.get("minimum-live-commitments").currentMeasuredDistinctCommitments, 2);
assert.equal(liveArtifacts.get("minimum-live-commitments").minimumDistinctCommitments, 1024);

for (const command of [
  "npm run mainnet:actual-private-external-artifact-acquisition-check",
  "npm run mainnet:actual-private-hard-blockers-check",
  "npm run mainnet:external-gates-check",
  "npm run mainnet:external-gates-production-claim-check",
  "npm run mainnet:preflight",
]) {
  assert.ok(packet.canonicalVerificationCommands.includes(command), `Missing canonical command ${command}.`);
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
  "signedTransaction:",
  "rawSecret",
]) {
  assert.ok(!serialized.includes(forbidden), `External artifact acquisition packet must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-external-artifact-acquisition-check"],
  "node scripts/check-vanta-actual-private-external-artifact-acquisition-packet.mjs",
);

console.log("Vanta actual-private external artifact acquisition packet check: PASS");
