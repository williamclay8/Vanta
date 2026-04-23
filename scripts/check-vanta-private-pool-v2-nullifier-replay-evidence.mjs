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
assert.equal(
  evidence.protocolEnforcementLayer,
  "operator-claim-preflight-and-accepted-reservation-only",
  "Evidence must keep the current protocol enforcement layer explicit.",
);
assert.equal(
  evidence.protocolEnforcementFinalLayerImplemented,
  false,
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
