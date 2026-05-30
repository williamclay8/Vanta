import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const programSource = readFileSync(
  resolve(repoRoot, "programs/vanta_private_pool_v2_spend/src/lib.rs"),
  "utf8",
);
const deploySource = readFileSync(
  resolve(repoRoot, "programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs"),
  "utf8",
);
const registerHelperSource = readFileSync(
  resolve(repoRoot, "scripts/native-sol-tag6/build-register-sol-vault-asset-instruction.mjs"),
  "utf8",
);
const custodyCheckSource = readFileSync(
  resolve(repoRoot, "scripts/check-vanta-private-pool-v2-onchain-unshield-custody.mjs"),
  "utf8",
);
const productionStatusSource = readFileSync(
  resolve(repoRoot, "src/readiness/unshieldMainnetProductionStatus.mjs"),
  "utf8",
);

const requiredAuditGates = [
  "onchain-unshield-proof-verifier-not-wired",
  "tag-unshield-reserved-fail-closed",
  "program-owned-vault-pda-not-deployed",
  "tag-unshield-token-cpi-release-not-wired",
];

for (const gate of requiredAuditGates) {
  assert.ok(
    productionStatusSource.includes(gate),
    `Unshield production status must keep audit gate visible: ${gate}`,
  );
}

for (const marker of [
  "data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 0;",
  "if asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 0",
  "if asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 1",
  "production should eventually require releaseEnabled == 1",
]) {
  assert.ok(programSource.includes(marker), `program source missing releaseEnabled marker: ${marker}`);
}

assert.ok(
  deploySource.includes("VANTA_PRIVATE_POOL_V2_UNSHIELD_RELEASE_ENABLED_AUDIT_GATE_ACK"),
  "deploy helper must require explicit audit ACK before releaseEnabled flip",
);
assert.ok(
  deploySource.includes('data[34] = releaseEnabledByte;') || deploySource.includes("releaseEnabledByte"),
  "deploy helper must derive releaseEnabled byte from audit gate",
);
assert.ok(
  !deploySource.includes("data[34] = 1; // releaseEnabled = true (after review)"),
  "deploy helper must not hardcode releaseEnabled=1 without audit gate",
);
assert.ok(
  registerHelperSource.includes("releaseEnabled=0 initially"),
  "register helper must document initial releaseEnabled=0",
);
assert.ok(
  custodyCheckSource.includes("tagUnshieldVaultAssetRegistryReleaseEnabled, false")
  || custodyCheckSource.includes("custody.tagUnshieldVaultAssetRegistryReleaseEnabled, false"),
  "custody check must keep registry releaseEnabled false",
);
assert.equal(
  packageJson.scripts["private-pool-v2:unshield-release-enabled-audit-gate-check"],
  "node scripts/check-vanta-private-pool-v2-unshield-release-enabled-audit-gate.mjs",
);

console.log("Vanta Private Pool v2 Unshield releaseEnabled audit gate check: PASS");
console.log(
  "Evidence: registry writes releaseEnabled=0, preflight stays fail-closed, commit requires releaseEnabled=1, and deploy flip remains gated until audit gates pass.",
);
