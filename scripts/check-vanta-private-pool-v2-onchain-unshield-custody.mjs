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
assert.equal(custody.version, "vanta-onchain-unshield-custody-status-0.2");
assert.equal(custody.status, "blocked");
assert.equal(custody.productionCustodyReady, false);
assert.equal(custody.programOwnedVaultReady, false);
assert.equal(custody.sourceOnlyVaultAuthorityPreflightReady, true);
assert.equal(custody.sourceOnlyRootPreflightReady, true);
assert.equal(custody.sourceOnlyNullifierMarkerPreflightReady, true);
assert.equal(custody.onchainUnshieldInstructionReady, false);
assert.equal(custody.onchainUnshieldInstructionStatus, "reserved-fail-closed-vault-preflight-source-only");
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
  "const VAULT_AUTHORITY_SEED: &[u8] = b\"vanta2vault\";",
  "const UNSHIELD_PAYLOAD_LEN",
  "const ERR_UNSHIELD_RELEASE_NOT_WIRED: u32 = 15;",
  "const ERR_VAULT_AUTHORITY_MISMATCH: u32 = 16;",
  "TAG_UNSHIELD => process_unshield",
  "UNSHIELD_ACCEPTED_ROOT_OFFSET",
  "fn process_unshield",
  "require_vault_authority(",
  "proof-verified unshield release ABI passed root/nullifier/vault-authority preflight; release not wired",
]) {
  assert.ok(programSource.includes(marker), `Reserved TAG_UNSHIELD fail-closed source marker missing: ${marker}`);
}

for (const marker of [
  "### `6` - proof-verified unshield release preflight (reserved, fail closed)",
  "Unshield preflight accounts:",
  "`vault_authority` read-only, non-signer PDA derived from `[\"vanta2vault\", pool_state, exitAssetId]`",
  "Instruction data is exactly 425 bytes",
  "acceptedRoot:32",
  "preflights the deterministic vault-authority PDA without token accounts or SPL Token CPI",
  "returns custom error `15` after preflight and before mutating accounts",
  "`16`: supplied Unshield vault authority PDA does not match the expected pool/asset vault authority",
]) {
  assert.ok(programReadme.includes(marker), `Reserved TAG_UNSHIELD README marker missing: ${marker}`);
}

const forbiddenReleaseMarkers = [
  /\b(?:pub\s+)?const\s+TAG_RELEASE\b/,
  /\b(?:pub\s+)?const\s+TAG_WITHDRAW\b/,
  /\bfn\s+process_release\s*\(/,
  /\bfn\s+process_withdraw\s*\(/,
  /\bvault_token_account\b/,
  /\bdestination_token_account\b/,
  /\bspl_token\b/,
  /\btoken_program\b/,
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
  "reserved-fail-closed-vault-preflight-source-only",
  "sourceOnlyVaultAuthorityPreflightReady",
  "sourceOnlyRootPreflightReady",
  "sourceOnlyNullifierMarkerPreflightReady",
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
