import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaUnshieldMainnetProductionStatus } from "../src/readiness/unshieldMainnetProductionStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const packageJson = JSON.parse(read("package.json"));
const programSource = read("programs/vanta_private_pool_v2_spend/src/lib.rs");
const crucibleHarnessSource = read("fuzz/vanta_private_pool_v2_spend/src/main.rs");
const programReadme = read("programs/vanta_private_pool_v2_spend/README.md");
const unshieldOperatorSource = read("operator/unshield-server.mjs");
const userVaultOwnerSource = read("src/solana/userVaultOwner.ts");
const unshieldStatusSource = read("src/readiness/unshieldMainnetProductionStatus.mjs");
const productionCheckSource = read("scripts/check-vanta-unshield-mainnet-production-status.mjs");
const setupDoc = read("docs/mainnet-shield-setup.md");
const limitationsDoc = read("SECURITY_LIMITATIONS.md");
const reviewDoc = read("VANTA_ZK_REVIEW.md");
const status = createVantaUnshieldMainnetProductionStatus();
const custody = status.onchainUnshieldCustody;

assert.ok(custody, "Unshield production status must expose onchainUnshieldCustody.");
assert.equal(custody.version, "vanta-onchain-unshield-custody-status-0.4");
assert.equal(custody.status, "blocked");
assert.equal(custody.productionCustodyReady, false);
assert.equal(custody.programOwnedVaultReady, false);
assert.equal(custody.sourceOnlyVaultAuthorityPreflightReady, true);
assert.equal(custody.sourceOnlyVaultAssetRegistryReady, true);
assert.equal(custody.sourceOnlyVaultTokenAccountPreflightReady, true);
assert.equal(custody.sourceOnlyRootPreflightReady, true);
assert.equal(custody.sourceOnlyNullifierMarkerPreflightReady, true);
assert.equal(custody.sourceOnlyVerifierKeyPreflightReady, true);
assert.equal(custody.onchainUnshieldInstructionReady, false);
assert.equal(
  custody.onchainUnshieldInstructionStatus,
  "reserved-fail-closed-vault-asset-and-verifier-key-preflight-source-only",
);
assert.equal(custody.tagUnshieldVaultAssetRegistryReleaseEnabled, false);
assert.equal(custody.tokenCpiReleaseReady, false);
assert.equal(custody.onchainProofVerifierReady, false);
assert.equal(custody.currentReleaseModel, "operator-keypair-public-exit");

for (const blocker of [
  "program-owned-vault-pda-not-deployed",
  "tag-unshield-reserved-fail-closed",
  "onchain-unshield-proof-verifier-not-wired",
  "tag-unshield-token-cpi-release-not-wired",
  "operator-vault-keypair-env-release-still-active",
]) {
  assert.ok(custody.blockers.includes(blocker), `Custody status missing blocker: ${blocker}`);
  assert.ok(status.blockers.includes(blocker), `Unshield production status missing custody blocker: ${blocker}`);
}

for (const marker of [
  "const TAG_UNSHIELD: u8 = 6;",
  "const TAG_REGISTER_VAULT_ASSET: u8 = 7;",
  "const ROOT_RECORD_SEED: &[u8] = b\"vanta2root\";",
  "const VAULT_AUTHORITY_SEED: &[u8] = b\"vanta2vault\";",
  "const VAULT_ASSET_MAGIC: &[u8; 8] = b\"VNTA2AST\";",
  "const VAULT_ASSET_SEED: &[u8] = b\"vanta2asset\";",
  "const VAULT_ASSET_RELEASE_ENABLED_OFFSET",
  "const SPL_TOKEN_PROGRAM_ID: Pubkey",
  "const UNSHIELD_PAYLOAD_LEN",
  "const UNSHIELD_VERIFIER_KEY_HASH_OFFSET",
  "const ERR_UNSHIELD_RELEASE_NOT_WIRED: u32 = 15;",
  "const ERR_VAULT_AUTHORITY_MISMATCH: u32 = 16;",
  "const ERR_ROOT_RECORD_MISMATCH: u32 = 18;",
  "const ERR_VAULT_ASSET_MISMATCH: u32 = 19;",
  "const ERR_VAULT_TOKEN_ACCOUNT_MISMATCH: u32 = 20;",
  "const ERR_DESTINATION_TOKEN_ACCOUNT_MISMATCH: u32 = 21;",
  "const ERR_TOKEN_PROGRAM_MISMATCH: u32 = 22;",
  "TAG_UNSHIELD => process_unshield",
  "TAG_REGISTER_VAULT_ASSET => process_register_vault_asset",
  "UNSHIELD_ACCEPTED_ROOT_OFFSET",
  "fn process_unshield",
  "fn process_register_vault_asset",
  "require_root_record(",
  "require_verifier_key_hash(",
  "require_vault_authority(",
  "require_vault_asset_record(",
  "require_spl_release_accounts(",
  "asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 0",
  "data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 0;",
  "proof-verified unshield release ABI passed root/root-record/verifier-key/nullifier/vault-asset/token-account preflight; release not wired",
]) {
  assert.ok(programSource.includes(marker), `Reserved TAG_UNSHIELD fail-closed source marker missing: ${marker}`);
}

for (const marker of [
  "const VAULT_ASSET_ACCOUNT_LEN: usize = HEADER_LEN + HASH_LEN * 6 + 2;",
  "const VAULT_ASSET_RELEASE_ENABLED_OFFSET: usize = VAULT_ASSET_KIND_OFFSET + 1;",
  "solana_pubkey::pubkey!(\"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA\");",
  "fuzz_assert_eq!(asset_data.len(), VAULT_ASSET_ACCOUNT_LEN);",
  "fuzz_assert_eq!(asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET], 0);",
  "corrupt_vault_asset_release_enabled",
  "verifier_key_hash: [u8; HASH_LEN]",
  "self.ensure_verifier_key_account(&payload.verifier_key_hash)",
  "self.verifier_key_pubkey(&payload.verifier_key_hash)",
  "token_program: SPL_TOKEN_PROGRAM_ID",
  "Some(ERR_VAULT_ASSET_MISMATCH)",
]) {
  assert.ok(
    crucibleHarnessSource.includes(marker),
    `Crucible Unshield vault-asset release-disabled invariant missing: ${marker}`,
  );
}

for (const marker of [
  "### `6` - proof-verified unshield release preflight (reserved, fail closed)",
  "### `7` - register Unshield vault asset (source-only, release disabled)",
  "Unshield preflight accounts:",
  "`root_record` read-only program-owned PDA derived from `[\"vanta2root\", pool_state, acceptedRoot]`",
  "`vault_authority` read-only, non-signer PDA derived from `[\"vanta2vault\", pool_state, exitAssetId]`",
  "`vault_asset` read-only program-owned PDA derived from `[\"vanta2asset\", pool_state, exitAssetId]`",
  "`vault_token_account` writable SPL token account matching the registered mint and vault authority",
  "`destination_token_account` writable SPL token account matching the registered mint and `exitDestination` owner",
  "Instruction data is exactly 457 bytes",
  "Register-vault-asset instruction data is exactly 130 bytes",
  "acceptedRoot:32",
  "verifierKeyHash:32",
  "preflights the deterministic root-record PDA",
  "preflights the deterministic verifier-key PDA",
  "preflights the deterministic vault-asset registry PDA",
  "preflights SPL mint/token-account ownership and mint shape without invoking the token program",
  "rejects token-program ids that are not the canonical SPL Token program",
  "returns custom error `15` after root/root-record/verifier-key/nullifier/vault-asset/token-account preflight and before mutating accounts",
  "The registry record stores `releaseEnabled = 0`; tag `6` requires that disabled value today",
  "`18`: supplied root record PDA or account content does not match the expected pool/root provenance record",
  "`16`: supplied Unshield vault authority PDA does not match the expected pool/asset vault authority",
  "`19`: supplied Unshield vault-asset PDA or account content does not match the expected pool/asset registry record",
  "`20`: supplied Unshield vault token account does not match the registered mint/vault authority",
  "`21`: supplied Unshield destination token account does not match the registered mint/exit destination",
  "`22`: supplied Unshield token program or mint account does not match the expected token-account ownership boundary",
]) {
  assert.ok(programReadme.includes(marker), `Reserved TAG_UNSHIELD README marker missing: ${marker}`);
}

const forbiddenReleaseMarkers = [
  /\b(?:pub\s+)?const\s+TAG_RELEASE\b/,
  /\b(?:pub\s+)?const\s+TAG_WITHDRAW\b/,
  /\bfn\s+process_release\s*\(/,
  /\bfn\s+process_withdraw\s*\(/,
  /\bspl_token\b/,
  /\bspl_token::instruction::transfer\b/,
  /\bsystem_instruction::transfer\b/,
].filter((pattern) => pattern.test(programSource));

assert.equal(
  forbiddenReleaseMarkers.length,
  0,
  "Potential PDA/token release markers appeared; replace this reserved ABI guard with positive PDA release/proof verifier assertions.",
);

for (const marker of [
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "sendAndConfirmTransaction(",
  "sourceOwner: vaultOwner",
  'releaseModel: "operator-signed-mainnet-sol-transfer"',
]) {
  assert.ok(
    unshieldOperatorSource.includes(marker),
    `Current public-exit operator custody truth must remain detectable: ${marker}`,
  );
}

for (const marker of [
  "productionCustodyReady: false",
  "program-owned-vault-pda-not-deployed",
  "operator-configured-wallet",
]) {
  assert.ok(userVaultOwnerSource.includes(marker), `User vault owner custody status missing: ${marker}`);
}

for (const marker of [
  "createOnchainUnshieldCustodyStatus",
  "operator-keypair-public-exit",
  "program-owned-vault-pda-not-deployed",
  "tag-unshield-reserved-fail-closed",
  "tag-unshield-token-cpi-release-not-wired",
  "reserved-fail-closed-vault-asset-and-verifier-key-preflight-source-only",
  "sourceOnlyVaultAuthorityPreflightReady",
  "sourceOnlyVaultAssetRegistryReady",
  "sourceOnlyVaultTokenAccountPreflightReady",
  "sourceOnlyRootPreflightReady",
  "sourceOnlyNullifierMarkerPreflightReady",
  "sourceOnlyVerifierKeyPreflightReady",
  "tagUnshieldVaultAssetRegistryReleaseEnabled",
  "operator-vault-keypair-env-release-still-active",
]) {
  assert.ok(unshieldStatusSource.includes(marker), `Unshield status source missing custody marker: ${marker}`);
}

assert.equal(
  status.evidenceRefs.onchainUnshieldCustody,
  "npm run private-pool-v2:onchain-unshield-custody-check",
);
assert.ok(
  status.truth.includes("operator-keypair public exit"),
  "Unshield truth must name the operator-keypair public-exit custody boundary.",
);
assert.ok(
  status.truth.includes("vault-asset registry scaffold") && status.truth.includes("releaseEnabled false"),
  "Unshield truth must name the source-only vault-asset registry boundary.",
);

assert.equal(
  packageJson.scripts["private-pool-v2:onchain-unshield-custody-check"],
  "node scripts/check-vanta-private-pool-v2-onchain-unshield-custody.mjs",
);
assert.equal(
  packageJson.scripts["private-pool-v2:unshield-vault-preflight-check"],
  "node scripts/check-vanta-private-pool-v2-onchain-unshield-custody.mjs",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"].includes(
    "npm run private-pool-v2:onchain-unshield-custody-check",
  ),
  "zk:review-guards-check must include the on-chain Unshield custody guard.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"].includes(
    "npm run private-pool-v2:onchain-unshield-custody-check",
  ),
  "zk:feedback-loop-check must include the on-chain Unshield custody guard.",
);

for (const marker of [
  "onchainUnshieldCustody",
  "private-pool-v2:onchain-unshield-custody-check",
  "tag-unshield-reserved-fail-closed",
  "tag-unshield-token-cpi-release-not-wired",
  "operator-vault-keypair-env-release-still-active",
]) {
  assert.ok(productionCheckSource.includes(marker), `Unshield production check missing custody marker: ${marker}`);
}

for (const [label, source] of [
  ["docs/mainnet-shield-setup.md", setupDoc],
  ["SECURITY_LIMITATIONS.md", limitationsDoc],
  ["VANTA_ZK_REVIEW.md", reviewDoc],
]) {
  assert.ok(
    source.includes("program-owned vault") || source.includes("program-owned vault PDA"),
    `${label} must preserve program-owned vault custody truth.`,
  );
  assert.ok(
    source.includes("operator-keypair") || source.includes("operator keypair"),
    `${label} must preserve operator-keypair custody truth.`,
  );
}

console.log("Vanta Private Pool v2 on-chain Unshield custody check: PASS");
