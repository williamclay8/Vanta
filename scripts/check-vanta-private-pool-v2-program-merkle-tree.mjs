#!/usr/bin/env node
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const program = read("programs/vanta_private_pool_v2_spend/src/lib.rs");
const cargoToml = read("programs/vanta_private_pool_v2_spend/Cargo.toml");
const harness = read("fuzz/vanta_private_pool_v2_spend/src/main.rs");
const readme = read("programs/vanta_private_pool_v2_spend/README.md");
const contractCheck = read("scripts/check-vanta-private-pool-v2-contract.mjs");
const rootProvenanceCheck = read("scripts/check-vanta-private-pool-v2-root-provenance.mjs");
const sbfAbiCheck = read("scripts/check-vanta-private-pool-v2-sbf-abi-status.mjs");
const packageJson = JSON.parse(read("package.json"));

function requireMarkers(label, body, markers) {
  for (const marker of markers) {
    assert.ok(body.includes(marker), `${label} is missing marker: ${marker}`);
  }
}

requireMarkers("spend program", program, [
  "const TAG_APPEND_TREE_LEAF: u8 = 9;",
  "const TREE_MAGIC: &[u8; 8] = b\"VNTA2TRE\";",
  "const TREE_LEAF_MARKER_SEED: &[u8] = b\"vanta2leaf\";",
  "const MERKLE_TREE_DEPTH: usize = 20;",
  "const TREE_STATE_LEN: usize = 736;",
  "const POOL_TREE_STATE_OFFSET: usize = 184;",
  "const POOL_STATE_LEN: usize = 224;",
  "TAG_APPEND_TREE_LEAF => process_append_tree_leaf",
  "fn process_append_tree_leaf(",
  "fn init_tree_state_account(",
  "fn require_pool_tree_state_binding(",
  "fn require_tree_state_header(",
  "fn poseidon_hash_leaf(",
  "fn poseidon_hash_node(",
  "solana_poseidon::{hashv as poseidon_hashv, Endianness, Parameters}",
  "Parameters::Bn254X5",
  "Endianness::BigEndian",
  "fn compute_program_owned_append_root(",
  "fn ensure_tree_leaf_marker",
  "fn require_tree_leaf_marker_available(",
  "append_tree_leaf_writes_program_owned_poseidon_root",
  "append_tree_leaf_rejects_wrong_expected_root_without_mutation",
  "append_tree_leaf_rejects_wrong_tree_state_without_mutation",
  "append_tree_leaf_rejects_duplicate_leaf_without_mutation",
  "append_tree_leaf_rejects_capacity_without_mutation",
]);

requireMarkers("spend program Cargo.toml", cargoToml, ["solana-poseidon = \"3.1.14\""]);

requireMarkers("Crucible harness", harness, [
  "const TAG_APPEND_TREE_LEAF: u8 = 9;",
  "const TREE_MAGIC: &[u8; 8] = b\"VNTA2TRE\";",
  "const POOL_TREE_STATE_OFFSET: usize = 184;",
  "const POOL_STATE_LEN: usize = 224;",
  "tree_state: Pubkey",
  "action_append_tree_leaf",
  "action_append_tree_leaf_wrong_expected_root",
  "action_append_tree_leaf_duplicate_leaf",
  "action_append_tree_leaf_wrong_tree_state",
  "assert_tree_state",
]);

requireMarkers("program README", readme, [
  "### `9` - append program-owned Merkle tree leaf",
  "program-owned Poseidon Merkle tree",
  "depth 20",
  "vanta2leaf",
  "not a proof verifier",
]);

requireMarkers("contract guard", contractCheck, [
  "TAG_APPEND_TREE_LEAF",
  "program-owned Poseidon Merkle tree",
  "private-pool-v2:program-merkle-tree-check",
]);

requireMarkers("root provenance guard", rootProvenanceCheck, [
  "TAG_APPEND_TREE_LEAF",
  "program-owned Poseidon Merkle tree",
]);

requireMarkers("SBF ABI guard", sbfAbiCheck, [
  "TAG_APPEND_TREE_LEAF",
  "treeStateAccountRequired",
  "appendTreeLeafInstructionLen",
]);

assert.equal(
  packageJson.scripts?.["private-pool-v2:program-merkle-tree-check"],
  "node scripts/check-vanta-private-pool-v2-program-merkle-tree.mjs",
  "package.json must expose private-pool-v2:program-merkle-tree-check",
);
for (const scriptName of [
  "private-pool-v2:verify",
  "zk:review-guards-check",
  "zk:feedback-loop-check",
]) {
  assert.ok(
    packageJson.scripts?.[scriptName]?.includes("npm run private-pool-v2:program-merkle-tree-check"),
    `${scriptName} must include private-pool-v2:program-merkle-tree-check`,
  );
}

console.log("Vanta Private Pool v2 program Merkle tree check: PASS");
