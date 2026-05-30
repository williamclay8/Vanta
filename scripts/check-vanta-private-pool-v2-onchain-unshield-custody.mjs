import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaUnshieldMainnetProductionStatus } from "../src/readiness/unshieldMainnetProductionStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function assertIncludes(source, marker, label) {
  assert.ok(source.includes(marker), `${label} missing marker: ${marker}`);
}

const packageJson = JSON.parse(read("package.json"));
const programSource = read("programs/vanta_private_pool_v2_spend/src/lib.rs");
const operatorSource = read("operator/unshield-server.mjs");
const unshieldStatusSource = read("src/readiness/unshieldMainnetProductionStatus.mjs");
const unshieldTrustSource = read("src/solana/unshieldTrustContract.ts");
const productionCheckSource = read("scripts/check-vanta-unshield-mainnet-production-status.mjs");
const limitationsDoc = read("SECURITY_LIMITATIONS.md");
const status = createVantaUnshieldMainnetProductionStatus();
const custody = status.onchainUnshieldCustody;

assert.ok(custody, "Unshield production status must expose onchainUnshieldCustody.");
assert.equal(custody.version, "vanta-onchain-unshield-custody-status-0.6");
assert.equal(custody.status, "blocked");
assert.equal(custody.currentReleaseModel, "program-tag-unshield-pda-cpi-fail-closed");
assert.equal(custody.productionCustodyReady, false);
assert.equal(custody.programOwnedVaultReady, false);
assert.equal(custody.tagUnshieldVaultAssetRegistryReleaseEnabled, false);
assert.equal(custody.tokenCpiReleaseReady, false);
assert.equal(custody.onchainProofVerifierReady, false);
assert.equal(custody.operatorKeypairReleaseRemoved, true);

for (const blocker of [
  "program-owned-vault-pda-not-deployed",
  "tag-unshield-reserved-fail-closed",
  "onchain-unshield-proof-verifier-not-wired",
  "tag-unshield-token-cpi-release-not-wired",
  "native-sol-program-owned-vault-pda-not-deployed",
  "native-sol-vault-asset-registry-not-registered",
]) {
  assert.ok(custody.blockers.includes(blocker), `Custody status missing blocker: ${blocker}`);
  assert.ok(status.blockers.includes(blocker), `Unshield production status missing blocker: ${blocker}`);
}

for (const marker of [
  "const TAG_UNSHIELD: u8 = 6;",
  "const TAG_REGISTER_VAULT_ASSET: u8 = 7;",
  "const TAG_SHIELD: u8 = 8;",
  'const VAULT_AUTHORITY_SEED: &[u8] = b"vanta2vault";',
  'const VAULT_ASSET_SEED: &[u8] = b"vanta2asset";',
  'const SOL_VAULT_SEED: &[u8] = b"vanta2solvault";',
  "const NATIVE_SOL_ASSET_ID_SENTINEL: [u8; 32] = [0u8; 32];",
  "TAG_UNSHIELD => process_unshield",
  "TAG_REGISTER_VAULT_ASSET => process_register_vault_asset",
  "TAG_SHIELD => process_shield",
  "fn process_unshield",
  "fn preflight_unshield_release",
  "fn verify_unshield_with_proof_adapter",
  "fn require_sol_release_accounts",
  "fn commit_verified_unshield_release",
  "fn process_shield",
  "fn process_register_vault_asset",
  "fn require_registered_sol_vault_asset(",
  "fn require_registered_spl_vault_asset(",
  "fn require_vault_asset_record(",
  "data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 0;",
  "production should eventually require releaseEnabled == 1",
  "system_instruction::transfer(sol_vault_holding.key, destination.key, exit_amount)",
  "system_instruction::transfer(depositor.key, sol_vault_holding.key, shield_amount)",
  "spl_token::instruction::transfer_checked(",
  "Err(ProgramError::Custom(ERR_UNSHIELD_NOT_WIRED))",
]) {
  assertIncludes(programSource, marker, "program PDA custody source");
}

for (const marker of [
  "buildTagUnshieldProgramReleaseReceipt",
  "buildTagUnshieldProgramRelayTransaction",
  "resolveTagUnshieldRelayBindings",
  "programRelayBindingSource",
  "programRelayBindingsUsePlaceholderHashes",
  'releaseModel: "program-tag-unshield-pda-cpi-fail-closed"',
  "programRelayAccountCount",
  "programRelaySerializedTransaction",
  "programTxSignature",
  "TAG_UNSHIELD",
]) {
  assertIncludes(operatorSource, marker, "operator fail-closed TAG_UNSHIELD relay source");
}

for (const forbidden of [
  "SystemProgram.transfer({",
  ".sendTransfer({",
  "loadWeb3KeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  'releaseModel: "operator-signed-mainnet-sol-transfer"',
]) {
  assert.ok(!operatorSource.includes(forbidden), `operator direct release marker must be removed: ${forbidden}`);
}

for (const marker of [
  "program-tag-unshield-pda-cpi-fail-closed",
  "operator-vault-keypair-env-release-removed",
  "pdaVaultCustodyGuard",
  "productionCustodyReady: false",
  "tokenCpiReleaseReady: false",
  "onchainProofVerifierReady: false",
]) {
  assertIncludes(unshieldStatusSource, marker, "unshield production status source");
}

for (const marker of [
  "program-tag-unshield-pda-cpi-fail-closed",
  "programPdaCustodyRequired: true",
  "operatorKeypairReleaseRemoved: true",
]) {
  assertIncludes(unshieldTrustSource, marker, "unshield trust contract source");
}

assert.equal(
  status.evidenceRefs.onchainUnshieldCustody,
  "npm run private-pool-v2:onchain-unshield-custody-check",
);
assert.equal(
  status.evidenceRefs.pdaVaultCustodyGuard,
  "npm run private-pool-v2:pda-vault-custody-check",
);
assert.ok(
  status.truth.includes("program-tag-unshield-pda-cpi-fail-closed"),
  "Unshield truth must name the fail-closed PDA relay custody boundary.",
);

assert.equal(
  packageJson.scripts["private-pool-v2:onchain-unshield-custody-check"],
  "node scripts/check-vanta-private-pool-v2-onchain-unshield-custody.mjs",
);
assert.equal(
  packageJson.scripts["private-pool-v2:pda-vault-custody-check"],
  "node scripts/check-vanta-private-pool-v2-pda-vault-custody.mjs",
);
for (const composite of ["truth:privacy-claim-gate", "zk:review-guards-check", "zk:feedback-loop-check"]) {
  assert.ok(
    packageJson.scripts[composite].includes("npm run private-pool-v2:onchain-unshield-custody-check"),
    `${composite} must include on-chain custody guard.`,
  );
  assert.ok(
    packageJson.scripts[composite].includes("npm run private-pool-v2:pda-vault-custody-check"),
    `${composite} must include PDA custody guard.`,
  );
}

for (const marker of [
  "onchainUnshieldCustody",
  "private-pool-v2:onchain-unshield-custody-check",
  "tag-unshield-reserved-fail-closed",
  "tag-unshield-token-cpi-release-not-wired",
]) {
  assertIncludes(productionCheckSource, marker, "Unshield production check");
}

assert.ok(
  limitationsDoc.includes("TAG_UNSHIELD=6") && limitationsDoc.includes("releaseEnabled=0"),
  "SECURITY_LIMITATIONS.md must preserve TAG_UNSHIELD fail-closed and releaseEnabled=0 truth.",
);

console.log("Vanta Private Pool v2 Onchain Unshield Custody Check: PASS");
console.log(
  "Evidence: source now models PDA custody and fail-closed TAG_UNSHIELD relay behavior. Production remains blocked until the on-chain proof/root/nullifier path is real; operator direct keypair transfer markers are absent.",
);
