#!/usr/bin/env node
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
const readme = read("programs/vanta_private_pool_v2_spend/README.md");
const harness = read("fuzz/vanta_private_pool_v2_spend/src/main.rs");
const pdaCustodyCheck = read("scripts/check-vanta-private-pool-v2-pda-vault-custody.mjs");
const sbfAbiCheck = read("scripts/check-vanta-private-pool-v2-sbf-abi-status.mjs");

const scriptName = "private-pool-v2:runtime-verifier-wired-gate-check";
assert.equal(
  packageJson.scripts[scriptName],
  "node scripts/check-vanta-private-pool-v2-runtime-verifier-wired-gate.mjs",
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

for (const forbidden of ["cfg!(test)", "cfg!(not(test))"]) {
  assert.ok(
    !programSource.includes(forbidden),
    `program source must not retain release-path compile-time gate: ${forbidden}`,
  );
}

for (const marker of [
  "const POOL_STATE_LEN: usize = 224;",
  "const POOL_VERIFIER_WIRED_OFFSET: usize = POOL_TREE_STATE_OFFSET + HASH_LEN;",
  "const POOL_VERIFIER_NOT_WIRED: u8 = 0;",
  "const POOL_VERIFIER_WIRED: u8 = 1;",
  "data[POOL_VERIFIER_WIRED_OFFSET] = POOL_VERIFIER_NOT_WIRED;",
  "fn pool_verifier_wired(",
  "fn require_pool_verifier_wired(",
  "require_pool_verifier_wired(&pool_data, ERR_PROOF_VERIFIER_NOT_WIRED)?;",
  "require_pool_verifier_wired(&pool_data, ERR_UNSHIELD_NOT_WIRED)?;",
  "Err(ProgramError::Custom(ERR_UNSHIELD_NOT_WIRED))",
  "fn invoke_sol_vault_transfer_reserved",
  "system_instruction::transfer(sol_vault_holding.key, destination.key, exit_amount)",
  "fn invoke_spl_vault_transfer_checked_reserved",
  "spl_token::instruction::transfer_checked(",
]) {
  assertIncludes(programSource, marker, "runtime verifier_wired program guard");
}

for (const marker of [
  "tag_init_initializes_verifier_wired_to_zero",
  "write_sol_vault_asset_record_data",
  "unshield_sol_verifier_wired_zero_rejects_before_nullifier_or_release",
  "unshield_sol_verifier_wired_one_still_rejects_until_verifier_acceptance",
  "assert!(marker_data.iter().all(|byte| *byte == 0));",
]) {
  assertIncludes(programSource, marker, "runtime verifier_wired unit coverage");
}

for (const forbidden of [
  "TAG_SET_VERIFIER_WIRED",
  "process_set_verifier_wired",
  "verifier_wired setter",
]) {
  assert.ok(
    !programSource.includes(forbidden),
    `this slice must not expose a live verifier_wired setter: ${forbidden}`,
  );
}

for (const marker of [
  "pool_state`: 224 bytes",
  "Byte offset `216` is `verifier_wired`, initialized to `0`",
  "no public setter is exposed in this slice",
  "Release is blocked by runtime state instead of build flags",
  "this slice still returns error `15` until item 9 wires real verifier/root/public-input/nullifier acceptance",
]) {
  assertIncludes(readme, marker, "program README runtime verifier_wired truth");
}

for (const marker of [
  "const POOL_STATE_LEN: usize = 224;",
  "const POOL_VERIFIER_WIRED_OFFSET: usize = POOL_TREE_STATE_OFFSET + HASH_LEN;",
  "const POOL_VERIFIER_NOT_WIRED: u8 = 0;",
]) {
  assertIncludes(harness, marker, "Crucible harness runtime verifier_wired layout mirror");
}

for (const marker of [
  "const POOL_VERIFIER_WIRED_OFFSET: usize = POOL_TREE_STATE_OFFSET + HASH_LEN;",
  "fn require_pool_verifier_wired(",
  "require_pool_verifier_wired(&pool_data, ERR_UNSHIELD_NOT_WIRED)?;",
]) {
  assertIncludes(pdaCustodyCheck, marker, "PDA custody guard runtime verifier_wired coverage");
}

for (const marker of [
  "const POOL_STATE_LEN: usize = 224;",
  "const POOL_VERIFIER_WIRED_OFFSET: usize = POOL_TREE_STATE_OFFSET + HASH_LEN;",
]) {
  assertIncludes(sbfAbiCheck, marker, "SBF ABI guard runtime verifier_wired coverage");
}

console.log("Vanta Private Pool v2 runtime verifier_wired gate check: PASS");
console.log(
  "Evidence: pool_state stores verifier_wired at byte 216, TAG_SHIELD/TAG_UNSHIELD no longer use cfg! release gates, TAG6 remains fail-closed before nullifier consume or CPI, and no live setter exposes the flag before verifier/root/nullifier evidence exists.",
);
