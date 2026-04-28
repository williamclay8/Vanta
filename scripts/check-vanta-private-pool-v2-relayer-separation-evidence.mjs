import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-relayer-separation.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/private-pool-v2-relayer-separation.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-private-pool-v2-relayer-separation-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.privacyClaimAllowed, false);
assert.equal(evidence.relayerSeparationReady, false);
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(evidence.currentArchitecture.relayerRole, "claim quote and submit service");

for (const visible of [
  "claim quote request metadata required for relayer fee calculation",
  "serialized transaction material required for public chain submission",
]) {
  assert.ok(evidence.relayerMaySee.includes(visible), `Missing relayer may-see item: ${visible}`);
}

for (const hidden of [
  "user private witness",
  "viewing keys",
  "raw hidden-economics amount on committed settlement paths",
  "raw hidden-economics asset on committed settlement paths",
  "raw hidden-economics owner on committed settlement paths",
  "raw private route or quote details on committed route paths",
  "customer private inputs",
]) {
  assert.ok(evidence.relayerMustNotSee.includes(hidden), `Missing relayer must-not-see item: ${hidden}`);
}

for (const ref of [
  "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_LOG_REDACTION_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_DEPLOYMENT_SEPARATION_REF",
  "VANTA_PRIVATE_POOL_V2_AUDIT_REF",
]) {
  assert.ok(evidence.requiredRefs.includes(ref), `Missing relayer separation ref: ${ref}`);
}

const checksById = new Map(evidence.separationChecks.map((check) => [check.id, check]));
assert.equal(checksById.get("role-service-replay-barrier")?.status, "local-harness-covered");
assert.equal(checksById.get("production-relayer-log-redaction")?.status, "not-recorded");
assert.equal(checksById.get("production-deployment-separation")?.status, "not-recorded");
assert.equal(checksById.get("independent-review")?.status, "not-recorded");
assert.ok(
  checksById.get("role-service-replay-barrier")?.privacyMeaning.includes("not sufficient relayer privacy separation"),
  "Role-service replay must not masquerade as relayer privacy separation.",
);

for (const blocker of [
  "Relayer separation is not proven by role-service replay evidence alone.",
  "No production relayer log-redaction evidence is recorded.",
  "No production deployment separation evidence is recorded.",
  "No independent reviewer has accepted the relayer separation boundary.",
]) {
  assert.ok(evidence.productionBlockers.includes(blocker), `Missing relayer blocker: ${blocker}`);
}

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
]) {
  assert.ok(!serialized.includes(forbidden), `Relayer separation evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["private-pool-v2:relayer-separation-evidence-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-separation-evidence.mjs",
  "package.json must expose private-pool-v2:relayer-separation-evidence-check.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes("npm run private-pool-v2:relayer-separation-evidence-check"),
  "private-pool-v2:verify must include relayer-separation evidence check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run private-pool-v2:relayer-separation-evidence-check"),
  "mainnet:preflight must include relayer-separation evidence check.",
);

console.log("Vanta Private Pool v2 relayer-separation evidence check: PASS");
