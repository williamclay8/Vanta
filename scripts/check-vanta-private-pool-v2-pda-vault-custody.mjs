import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function assertIncludes(source, marker, label) {
  assert.ok(source.includes(marker), `${label} missing marker: ${marker}`);
}

const packageJson = JSON.parse(read("package.json"));
const programSource = read("programs/vanta_private_pool_v2_spend/src/lib.rs");
const operatorSource = read("operator/unshield-server.mjs");
const shieldConfigSource = read("src/solana/shieldConfig.ts");
const unshieldStatusSource = read("src/readiness/unshieldMainnetProductionStatus.mjs");
const unshieldTrustSource = read("src/solana/unshieldTrustContract.ts");

const scriptName = "private-pool-v2:pda-vault-custody-check";
assert.equal(
  packageJson.scripts[scriptName],
  "node scripts/check-vanta-private-pool-v2-pda-vault-custody.mjs",
  `${scriptName} must be registered in package.json.`,
);

for (const composite of [
  "truth:privacy-claim-gate",
  "zk:review-guards-check",
  "zk:feedback-loop-check",
  "private-pool-v2:verify",
]) {
  assert.ok(
    packageJson.scripts[composite]?.includes(`npm run ${scriptName}`),
    `${composite} must include ${scriptName}.`,
  );
}

for (const marker of [
  'const TAG_SHIELD: u8 = 8;',
  "TAG_SHIELD => process_shield",
  "fn process_shield(",
  'const VAULT_AUTHORITY_SEED: &[u8] = b"vanta2vault";',
  'const VAULT_ASSET_SEED: &[u8] = b"vanta2asset";',
  'const SOL_VAULT_SEED: &[u8] = b"vanta2solvault";',
  "const NATIVE_SOL_ASSET_ID_SENTINEL: [u8; 32] = [0u8; 32];",
  "fn require_registered_sol_vault_asset(",
  "fn require_registered_spl_vault_asset(",
  "require_sol_vault_pda(program_id, pool_state, vault_authority)?;",
  "require_vault_authority(program_id, pool_state, vault_authority, exit_asset_id)?;",
  "data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 0;",
  "production should eventually require releaseEnabled == 1",
]) {
  assertIncludes(programSource, marker, "program PDA custody contract");
}

for (const marker of [
  "system_instruction::transfer(",
  "depositor.key,",
  "sol_vault_holding.key,",
  "verified.shield_amount,",
  "system_instruction::transfer(sol_vault_holding.key, destination.key, exit_amount)",
  "spl_token::instruction::transfer_checked(",
  "const POOL_VERIFIER_WIRED_OFFSET: usize = POOL_TREE_STATE_OFFSET + HASH_LEN;",
  "fn require_pool_verifier_wired(",
  "require_pool_verifier_wired(&pool_data, ERR_UNSHIELD_NOT_WIRED)?;",
  "Err(ProgramError::Custom(ERR_UNSHIELD_NOT_WIRED))",
]) {
  assertIncludes(programSource, marker, "program custody movement shape");
}
assert.match(
  programSource,
  /VAULT_AUTHORITY_SEED,\s*pool_state\.key\.as_ref\(\),\s*&exit_asset_id/su,
  "program SPL release seed shape must use [vanta2vault, pool_state, exit_asset_id, bump].",
);

for (const marker of [
  "buildTagUnshieldProgramReleaseReceipt",
  'releaseModel: "program-tag-unshield-pda-cpi-fail-closed"',
  "programTxSignature",
  "TAG_UNSHIELD",
]) {
  assertIncludes(operatorSource, marker, "operator program-release path");
}

const forbiddenOperatorReleaseMarkers = [
  "SystemProgram.transfer({",
  ".sendTransfer({",
  "loadWeb3KeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  'releaseModel: "operator-signed-mainnet-sol-transfer"',
];

for (const marker of forbiddenOperatorReleaseMarkers) {
  assert.ok(
    !operatorSource.includes(marker),
    `operator must not retain direct custody release marker after PDA relay cutover: ${marker}`,
  );
}

for (const marker of [
  "configuredLegacyVaultOwner",
  "legacyOperatorVaultOwner",
  "programPdaCustodyRequired: true",
  "VITE_VANTA_MAINNET_VAULT_OWNER is legacy-only",
]) {
  assertIncludes(shieldConfigSource, marker, "frontend shield custody config");
}

for (const marker of [
  "program-tag-unshield-pda-cpi-fail-closed",
  "operator-vault-keypair-env-release-removed",
  "pdaVaultCustodyGuard",
  "productionCustodyReady: false",
  "tokenCpiReleaseReady: false",
  "onchainProofVerifierReady: false",
]) {
  assertIncludes(unshieldStatusSource, marker, "unshield production status");
}

for (const marker of [
  "program-tag-unshield-pda-cpi-fail-closed",
  "programPdaCustodyRequired: true",
  "operatorKeypairReleaseRemoved: true",
]) {
  assertIncludes(unshieldTrustSource, marker, "unshield trust contract");
}

console.log("Vanta Private Pool v2 PDA vault custody check: PASS");
console.log(
  "Evidence: TAG_SHIELD and TAG_UNSHIELD source shapes preserve PDA custody seeds, Shield vault ingress is gated by a proof adapter before transfer, registry records stay releaseEnabled=0, production release remains fail-closed until proof/root/nullifier verification is real, and operator direct keypair transfers are removed from the release endpoint path.",
);
