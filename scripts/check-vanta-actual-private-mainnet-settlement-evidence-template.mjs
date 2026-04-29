import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const templatePath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement.evidence.template.json");
const productionPacketPath = resolve(repoRoot, "ops/mainnet/actual-private-production-evidence.packet.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(
  existsSync(templatePath),
  "Missing ops/mainnet/actual-private-mainnet-settlement.evidence.template.json.",
);

const template = JSON.parse(readFileSync(templatePath, "utf8"));
const productionPacket = JSON.parse(readFileSync(productionPacketPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(template.version, "vanta-actual-private-mainnet-settlement-evidence-template-0.1");
assert.equal(template.mainnetReady, false);
assert.equal(template.productionReady, false);
assert.equal(template.privacyClaimAllowed, false);
assert.equal(template.liveMainnetSettlementProven, false);
assert.equal(template.secretPolicy, "references-only-no-secret-values");
assert.equal(template.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(template.requiredApprovalRef, "ops/mainnet/mainnet-real-funds-approval.evidence.json");
assert.equal(template.requiredPreflightRef, "npm run mainnet:preflight");
assert.equal(template.currentStatus, "template-only-not-filled");

for (const [key, value] of Object.entries(template.requiredLiveEvidenceRefs)) {
  assert.ok(String(value).endsWith("_REF"), `${key} must be a ref placeholder.`);
}

for (const term of productionPacket.targetPublicTranscript) {
  assert.ok(template.requiredPublicTranscriptTerms.includes(term), `Missing required public term: ${term}.`);
}

for (const term of productionPacket.forbiddenPublicTranscript) {
  assert.ok(template.forbiddenPublicTranscriptTerms.includes(term), `Missing forbidden public term: ${term}.`);
}

for (const check of [
  "deposit transaction appends into the named shared cohort",
  "spend transaction is submitted by the relayer fee payer, not the source funding wallet",
  "operator receipt binds accepted root, nullifier, output commitments, and proof public-input hash",
  "accepted root is current or within the reviewed root window at spend acceptance",
  "duplicate nullifier replay is rejected against the live production store",
  "public transcript review finds no forbidden linkage terms",
  "safe telemetry review finds no forbidden private inputs or signing material",
]) {
  assert.ok(template.requiredChecksAfterLiveRun.includes(check), `Missing post-live-run check: ${check}.`);
}

for (const blocker of [
  "No filled live actual-private settlement evidence packet is recorded.",
  "No active bounded approval window is available for a live actual-private run.",
  "No live shared-cohort deposit transaction reference is recorded.",
  "No live relayer-submitted spend transaction reference is recorded.",
  "No live accepted-root freshness evidence is recorded.",
  "No live nullifier replay rejection evidence is recorded.",
  "No reviewer packet has accepted the public transcript as free of forbidden linkage terms.",
]) {
  assert.ok(template.productionBlockers.includes(blocker), `Missing production blocker: ${blocker}.`);
}

const serialized = JSON.stringify(template);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Actual-private mainnet evidence template must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-evidence-check"],
  "node scripts/check-vanta-actual-private-mainnet-settlement-evidence-template.mjs",
  "package.json must expose mainnet:actual-private-settlement-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-evidence-check"),
  "mainnet:preflight must include actual-private settlement evidence check.",
);

console.log("Vanta actual-private mainnet settlement evidence template check: PASS");
