import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/actual-private-production-evidence.packet.json");
const packagePath = resolve(repoRoot, "package.json");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

assert.ok(existsSync(packetPath), "Missing ops/mainnet/actual-private-production-evidence.packet.json.");

const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const anonymity = readJson("ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
const relayer = readJson("ops/mainnet/private-pool-v2-relayer-separation.evidence.json");
const nullifier = readJson("ops/mainnet/private-pool-v2-nullifier-replay.evidence.json");
const productionSmoke = readJson("ops/mainnet/private-pool-v2-production-smoke.evidence.json");
const roleService = readJson("ops/mainnet/private-pool-v2-role-service-replay.evidence.json");

assert.equal(packet.version, "vanta-actual-private-production-evidence-0.1");
assert.equal(packet.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(packet.mainnetReady, false);
assert.equal(packet.productionReady, false);
assert.equal(packet.privacyClaimAllowed, false);
assert.equal(packet.meaningfulPrivacyReady, false);
assert.equal(packet.secretPolicy, "references-only-no-secret-values");

for (const allowed of [
  "pool id",
  "asset cohort",
  "accepted root",
  "nullifier",
  "output commitments",
  "proof public-input hash",
  "receipt commitment",
  "relayer identity or epoch",
]) {
  assert.ok(packet.targetPublicTranscript.includes(allowed), `Missing target transcript term: ${allowed}`);
}

for (const forbidden of [
  "source wallet",
  "merchant settlement address",
  "raw amount",
  "raw asset",
  "note secret",
  "input commitment",
  "input leaf index",
  "deposit signature",
  "plaintext memo",
  "same fee payer linkage",
]) {
  assert.ok(packet.forbiddenPublicTranscript.includes(forbidden), `Missing forbidden transcript term: ${forbidden}`);
}

assert.equal(packet.evidenceRefs.sharedPoolAnonymity, "ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
assert.equal(packet.evidenceRefs.relayerSeparation, "ops/mainnet/private-pool-v2-relayer-separation.evidence.json");
assert.equal(packet.evidenceRefs.nullifierRootEnforcement, "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json");
assert.equal(packet.evidenceRefs.roleServiceReplay, "ops/mainnet/private-pool-v2-role-service-replay.evidence.json");
assert.equal(packet.evidenceRefs.safeLogging, "npm run ops:safe-telemetry-check");
assert.equal(packet.evidenceRefs.auditPackage, "docs/audit-package.md");
assert.equal(packet.evidenceRefs.mainnetPrivateSettlement, "npm run mainnet:private-settlement-check");
assert.equal(packet.evidenceRefs.productionSmoke, "ops/mainnet/private-pool-v2-production-smoke.evidence.json");
assert.equal(packet.evidenceRefs.actualPrivateRailRegression, "npm run private-transaction:mvp-check");

for (const command of [
  "npm run private-transaction:mvp-check",
  "npm run private-pool-v2:anonymity-set-evidence-check",
  "npm run private-pool-v2:relayer-separation-evidence-check",
  "npm run mainnet:nullifier-replay-evidence-check",
  "npm run mainnet:role-service-replay-evidence-check",
  "npm run ops:safe-telemetry-check",
  "npm run audit:package-check",
  "npm run mainnet:private-settlement-check",
  "npm run mainnet:production-smoke-evidence-check",
]) {
  assert.ok(packet.requiredCommands.includes(command), `Missing required command: ${command}`);
}

assert.equal(anonymity.productionReady, false);
assert.equal(anonymity.privacyClaimAllowed, false);
assert.equal(anonymity.meaningfulPrivacyReady, false);
assert.equal(relayer.productionReady, false);
assert.equal(relayer.relayerSeparationReady, false);
assert.equal(nullifier.protocolEnforcementFinalLayerImplemented, true);
assert.equal(nullifier.protocolEnforcementFinalLayerProductionReady, false);
assert.equal(roleService.productionReady, false);
assert.equal(productionSmoke.productionReady, false);
assert.equal(productionSmoke.realFundsAllowed, false);

assert.equal(packet.evidenceStatus.actualPrivateRailRegression, "local-and-role-service-covered");
assert.equal(packet.evidenceStatus.sharedPoolAnonymity, "blocked");
assert.equal(packet.evidenceStatus.relayerSeparation, "blocked");
assert.equal(
  packet.evidenceStatus.nullifierRootEnforcement,
  "operator-and-role-service-covered-not-production-ready",
);
assert.equal(packet.evidenceStatus.safeLogging, "local-contract-covered");
assert.equal(packet.evidenceStatus.audit, "packet-template-only");
assert.equal(packet.evidenceStatus.mainnetEvidence, "no-real-funds-smoke-only");

for (const blocker of [
  "No live mainnet production cohort metrics are recorded.",
  "No asset cohort has at least 1024 distinct live commitments.",
  "No independent reviewer has accepted the anonymity-set measurement.",
  "No production relayer log-redaction evidence is recorded.",
  "No production deployment separation evidence is recorded.",
  "No third-party audit report and fix-verification packet is recorded.",
  "No live mainnet private settlement path is proven.",
  "No active bounded real-funds approval window is available.",
]) {
  assert.ok(packet.productionBlockers.includes(blocker), `Missing production blocker: ${blocker}`);
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
  "rawSecret",
  "signedTransaction",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Actual-private production evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-production-evidence-check"],
  "node scripts/check-vanta-actual-private-production-evidence.mjs",
  "package.json must expose mainnet:actual-private-production-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-production-evidence-check"),
  "mainnet:preflight must include actual-private production evidence check.",
);

console.log("Vanta actual-private production evidence check: PASS");
