import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/actual-private-production-capability.evidence.json");
const productionPacketPath = resolve(repoRoot, "ops/mainnet/actual-private-production-evidence.packet.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing actual-private production capability evidence.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const productionPacket = JSON.parse(readFileSync(productionPacketPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-actual-private-production-capability-evidence-0.1");
assert.equal(evidence.productionReady, false);
assert.equal(evidence.privacyClaimAllowed, false);
assert.equal(evidence.realFundsAllowed, false);
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(
  evidence.requiredProtocolActionProofModes?.send,
  "actual_private_spend_circuit_request",
);
assert.equal(evidence.observedProtocolActionProofModes?.send, "actual_private_spend_circuit_request");
assert.equal(evidence.capabilityDecision?.accepted, true);
assert.equal(evidence.capabilityDecision?.reason, "actual-private-operator-capability-ready");
assert.equal(evidence.settlementPostAllowed, true);
assert.equal(evidence.fundsMoved, false);
assert.equal(
  evidence.evidenceRefs?.relayerCallerGate,
  "src/mainnet/actualPrivateSettlementRelayerCaller.mjs#validateVantaActualPrivateOperatorCapability",
);
assert.equal(
  evidence.evidenceRefs?.relayerCallerCheck,
  "npm run mainnet:actual-private-settlement-relayer-caller-check",
);
assert.equal(
  evidence.evidenceRefs?.productionEvidencePacket,
  "ops/mainnet/actual-private-production-evidence.packet.json",
);

for (const blocker of [
  "A fresh bounded real-funds approval window is required before another actual-private live settlement execute request.",
  "The previous approval window stopped after the first failed request and must not be reused.",
  "Do not reintroduce source-state fields into the actual-private request.",
]) {
  assert.ok(evidence.productionBlockers.includes(blocker), `Missing production blocker: ${blocker}`);
}

for (const forbidden of [
  "input commitment",
  "input root",
  "input leaf index",
  "send context tag",
  "source wallet",
  "raw asset",
  "raw amount",
  "destination",
  "owner",
]) {
  assert.ok(evidence.forbiddenWorkarounds.includes(forbidden), `Missing forbidden workaround: ${forbidden}`);
}

assert.equal(
  productionPacket.evidenceRefs.productionCapability,
  "ops/mainnet/actual-private-production-capability.evidence.json",
);
assert.ok(
  productionPacket.requiredCommands.includes("npm run mainnet:actual-private-production-capability-check"),
  "Actual-private production evidence must require the production capability check.",
);
assert.equal(
  productionPacket.evidenceStatus.productionCapability,
  "production-operator-send-proof-mode-aligned",
);
assert.ok(
  !productionPacket.productionBlockers.includes(
    "Production Private Pool v2 status still advertises legacy Send proof mode instead of actual-private Send proof mode.",
  ),
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-production-capability-check"],
  "node scripts/check-vanta-actual-private-production-capability-evidence.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-production-capability-check"),
  "mainnet:preflight must include the actual-private production capability check.",
);

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Capability evidence must not contain ${forbidden}.`);
}

console.log("Vanta actual-private production capability evidence check: PASS");
