import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/private-pool-v2-nullifier-replay.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-nullifier-replay-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.operatorUrlRef, "VANTA_PRIVATE_POOL_V2_OPERATOR_URL");
assert.equal(evidence.storageRef, "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF");
assert.ok(evidence.lastStatusRef, "Evidence must track the last authenticated status command.");
assert.ok(
  evidence.safety.includes("No auth token values"),
  "Evidence must state the no-secret safety policy.",
);
assert.ok(
  ["pending", "remote-services"].includes(evidence.runtimeMode),
  "Runtime mode must stay sanitized.",
);
assert.ok(
  ["pending", "operator-enforced-plus-role-network-verified-plus-production-smoke-simulated"].includes(
    evidence.layeredReplayStatus,
  ),
  "Layered replay status must stay sanitized.",
);
assert.ok(
  ["pending", "postgres-jsonb-snapshot-store"].includes(evidence.storageKind),
  "Storage kind must stay sanitized.",
);
assert.ok(
  ["pending", "postgres-durable-claim-preflight-and-accepted-reservation"].includes(
    evidence.nullifierReplayGuardMode,
  ),
  "Replay guard mode must stay sanitized.",
);
assert.ok(
  ["pending", "postgres-unique-index"].includes(evidence.nullifierReplayGuardStorageMode),
  "Replay guard storage mode must stay sanitized.",
);
assert.equal(
  typeof evidence.storageDurableStoreConfigured,
  "boolean",
  "Evidence must use a boolean for durable-store status.",
);
assert.equal(
  typeof evidence.nullifierReplayGuardProductionReady,
  "boolean",
  "Evidence must keep replay guard productionReady explicit.",
);
assert.ok(
  evidence.nullifierReplayAcceptedCount === undefined ||
    evidence.nullifierReplayAcceptedCount === "pending" ||
    (Number.isInteger(evidence.nullifierReplayAcceptedCount) && evidence.nullifierReplayAcceptedCount >= 0),
  "Evidence accepted replay count must stay sanitized when present.",
);
assert.ok(
  evidence.nullifierReplayReservedCount === undefined ||
    evidence.nullifierReplayReservedCount === "pending" ||
    (Number.isInteger(evidence.nullifierReplayReservedCount) && evidence.nullifierReplayReservedCount >= 0),
  "Evidence reserved replay count must stay sanitized when present.",
);
assert.equal(
  evidence.protocolEnforcementLayer,
  "operator-claim-preflight-plus-verifier-receipt-idempotency-plus-indexer-nullifier-registration",
  "Evidence must keep the current protocol enforcement layer explicit.",
);
assert.equal(
  evidence.roleServiceNetworkReplayBarrier,
  "verifier-receipt-idempotency-and-indexer-nullifier-registration",
  "Evidence must keep the role-service replay barrier explicit.",
);
assert.equal(
  evidence.roleServiceReplayEvidenceRef,
  "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
);
assert.equal(evidence.roleServiceNetworkReplayRef, "npm run private-pool-v2:service-network-check");
assert.equal(evidence.roleServiceNetworkReplayVerified, true);
assert.equal(
  evidence.productionSmokeReplaySimulationRef,
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json#nullifier-replay-simulation",
  "Evidence must keep the production smoke replay reference explicit.",
);
assert.equal(evidence.productionSmokeReplaySimulationStatus, "pass");
assert.equal(evidence.productionSmokeReplaySimulationHttpStatus, 400);
assert.deepEqual(evidence.actualPrivateSpendRootNullifierEnforcement, {
  requestShapeRef: "npm run private-transaction:mvp-check",
  localNullifierAndOutputAppendRef: "npm run private-pool-v2:local-runtime-check",
  roleServiceMirrorRef: "npm run private-pool-v2:service-network-check",
  productionSmokeRef: "ops/mainnet/private-pool-v2-production-smoke.evidence.json#actual-private-spend-simulation",
  nullifierReplayKeyMode: "private-send:nullifier",
  acceptedRootPublicInputMode: "accepted-root-bound-in-proof-public-inputs",
  acceptedRootFreshnessStatus: "blocked-no-live-mainnet-root-freshness-evidence",
  actualPrivateNullifierReplayProductionReady: false,
  acceptedRootFreshnessProductionReady: false,
});
assert.equal(evidence.noRealFundsSmokeOnly, true);
assert.equal(evidence.auditedSharedAnonymitySetAvailable, false);
assert.equal(evidence.liveMainnetPrivateSettlementAvailable, false);
assert.deepEqual(evidence.productionReplayBlockedBy, [
  "no-real-funds-smoke-only",
  "no-live-actual-private-accepted-root-freshness-evidence",
  "no-proven-audited-shared-anonymity-set",
  "no-proven-live-mainnet-private-settlement-evidence",
]);
assert.equal(
  evidence.protocolEnforcementFinalLayerImplemented,
  true,
  "Evidence must keep final protocol enforcement implementation explicit.",
);
assert.equal(
  evidence.protocolEnforcementFinalLayerProductionReady,
  false,
  "Evidence must keep final protocol enforcement productionReady explicit.",
);
assert.equal(
  typeof evidence.operatorStatusProductionReady,
  "boolean",
  "Evidence must keep operator status productionReady explicit.",
);
assert.ok(
  evidence.deploymentTruth.includes("no proven audited shared anonymity set"),
  "Evidence must preserve the missing audited-anonymity-set truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("no live mainnet accepted-root freshness evidence"),
  "Evidence must preserve the missing actual-private root freshness truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("proven live mainnet private settlement evidence is still unavailable"),
  "Evidence must preserve the missing live private-settlement truth.",
);

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "postgres://",
  "postgresql://",
  "Bearer ",
  "DATABASE_URL=",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Nullifier replay evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:nullifier-replay-status"],
  "node scripts/print-vanta-production-nullifier-replay-status.mjs",
  "package.json must expose mainnet:nullifier-replay-status.",
);
assert.equal(
  packageJson.scripts["mainnet:nullifier-replay-status-check"],
  "node scripts/print-vanta-production-nullifier-replay-status.mjs --check",
  "package.json must expose mainnet:nullifier-replay-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:nullifier-replay-evidence-check"],
  "node scripts/check-vanta-private-pool-v2-nullifier-replay-evidence.mjs",
  "package.json must expose mainnet:nullifier-replay-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:nullifier-replay-evidence-check"),
  "mainnet:preflight must include nullifier replay evidence check.",
);

console.log("Vanta Private Pool v2 nullifier replay evidence check: PASS");
