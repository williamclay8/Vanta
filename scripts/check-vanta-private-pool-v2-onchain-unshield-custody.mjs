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
assert.equal(custody.version, "vanta-onchain-unshield-custody-status-0.1");
assert.equal(custody.status, "blocked");
assert.equal(custody.productionCustodyReady, false);
assert.equal(custody.programOwnedVaultReady, false);
assert.equal(custody.onchainUnshieldInstructionReady, false);
assert.equal(custody.onchainProofVerifierReady, false);
assert.equal(custody.currentReleaseModel, "operator-keypair-public-exit");

for (const blocker of [
  "program-owned-vault-pda-not-deployed",
  "tag-unshield-not-implemented",
  "onchain-unshield-proof-verifier-not-wired",
  "operator-vault-keypair-env-release-still-active",
]) {
  assert.ok(custody.blockers.includes(blocker), `Custody status missing blocker: ${blocker}`);
  assert.ok(status.blockers.includes(blocker), `Unshield production status missing custody blocker: ${blocker}`);
}

const futureOnchainUnshieldMarkers = [
  /\b(?:pub\s+)?const\s+TAG_UNSHIELD\b/,
  /\b(?:pub\s+)?const\s+TAG_RELEASE\b/,
  /\b(?:pub\s+)?const\s+TAG_WITHDRAW\b/,
  /\bfn\s+process_unshield\s*\(/,
  /\bfn\s+process_release\s*\(/,
  /\bfn\s+process_withdraw\s*\(/,
  /\bvault_token_account\b/,
  /\bdestination_token_account\b/,
  /\bvault_pda\b/,
  /\bproof_bytes\b/,
].filter((pattern) => pattern.test(programSource));

assert.equal(
  futureOnchainUnshieldMarkers.length,
  0,
  "Potential on-chain Unshield/release markers appeared; replace this negative custody guard with positive PDA release/proof verifier assertions.",
);
assert.equal(
  /\bTAG_UNSHIELD\b/.test(programSource),
  false,
  "TAG_UNSHIELD appeared; replace this negative custody guard with positive PDA release/proof verifier assertions.",
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
assert.ok(
  packageJson.scripts["zk:review-guards-check"].includes(
    "npm run private-pool-v2:onchain-unshield-custody-check",
  ),
  "zk:review-guards-check must include the on-chain Unshield custody guard.",
);

for (const marker of [
  "onchainUnshieldCustody",
  "private-pool-v2:onchain-unshield-custody-check",
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
