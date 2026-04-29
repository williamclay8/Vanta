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
const actualPrivateSettlement = readJson("ops/mainnet/actual-private-mainnet-settlement.evidence.json");
const actualPrivateSettlementReview = readJson("ops/mainnet/actual-private-mainnet-settlement-review.evidence.json");
const productionCapability = readJson("ops/mainnet/actual-private-production-capability.evidence.json");
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
  "asset id commitment",
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
assert.equal(
  packet.evidenceRefs.liveMainnetSettlementTemplate,
  "ops/mainnet/actual-private-mainnet-settlement.evidence.template.json",
);
assert.equal(
  packet.evidenceRefs.liveMainnetSettlementEvidence,
  "ops/mainnet/actual-private-mainnet-settlement.evidence.json",
);
assert.equal(
  packet.evidenceRefs.liveMainnetSettlementReview,
  "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
);
assert.equal(packet.evidenceRefs.productionCapability, "ops/mainnet/actual-private-production-capability.evidence.json");
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
  "npm run mainnet:actual-private-production-capability-check",
  "npm run mainnet:actual-private-settlement-evidence-check",
  "npm run mainnet:actual-private-settlement-review-check",
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
assert.equal(
  nullifier.actualPrivateSpendRootNullifierEnforcement.acceptedRootFreshnessProductionReady,
  false,
);
assert.equal(roleService.productionReady, false);
assert.equal(productionCapability.productionReady, false);
assert.equal(productionCapability.realFundsAllowed, false);
assert.equal(productionCapability.capabilityDecision?.accepted, true);
assert.equal(productionCapability.capabilityDecision?.reason, "actual-private-operator-capability-ready");
assert.equal(productionCapability.settlementPostAllowed, true);
assert.equal(actualPrivateSettlement.currentStatus, "filled-refs-awaiting-review");
assert.equal(actualPrivateSettlement.liveMainnetSettlementProven, false);
assert.equal(actualPrivateSettlementReview.reviewStatus, "reviewed-blocked");
assert.equal(actualPrivateSettlementReview.liveMainnetSettlementProven, false);
assert.equal(actualPrivateSettlementReview.privacyClaimAllowed, false);
assert.equal(
  actualPrivateSettlement.evidenceRefs?.operatorReceiptRef,
  "operator-receipt:ppv2_5dc58490314d855c5060eace",
);
assert.equal(
  actualPrivateSettlement.evidenceRefs?.protocolSettlementRef,
  "operator-protocol-settlement:proto_1ef774cec8a4964fd8a4650b",
);
assert.equal(
  actualPrivateSettlement.evidenceRefs?.relayerSubmittedSpendTxRef,
  null,
  "Relayer spend tx ref must remain null until a real Solana signature exists.",
);
assert.equal(productionSmoke.productionReady, false);
assert.equal(productionSmoke.realFundsAllowed, false);

assert.equal(packet.evidenceStatus.actualPrivateRailRegression, "local-and-role-service-covered");
assert.equal(packet.evidenceStatus.sharedPoolAnonymity, "blocked");
assert.equal(packet.evidenceStatus.relayerSeparation, "blocked");
assert.equal(
  packet.evidenceStatus.nullifierRootEnforcement,
  "actual-private-nullifier-covered-root-freshness-blocked",
);
assert.equal(packet.evidenceStatus.safeLogging, "local-contract-covered");
assert.equal(packet.evidenceStatus.audit, "packet-template-only");
assert.equal(packet.evidenceStatus.productionCapability, "production-operator-send-proof-mode-aligned");
assert.equal(packet.evidenceStatus.mainnetEvidence, "live-refs-reviewed-blocked");

for (const blocker of [
  "No live mainnet production cohort metrics are recorded.",
  "No asset cohort has at least 1024 distinct live commitments.",
  "No independent reviewer has accepted the anonymity-set measurement.",
  "No live mainnet accepted-root freshness evidence is recorded for actual-private spends.",
  "Production relayer log redaction is locally contract-covered but not independently reviewed.",
  "Production relayer deployment separation is manifest-covered but not independently reviewed.",
  "No third-party audit report and fix-verification packet is recorded.",
  "Live actual-private settlement refs were reviewed and remain blocked by missing Solscan relayer spend, shared-cohort deposit, and live replay rejection evidence.",
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
