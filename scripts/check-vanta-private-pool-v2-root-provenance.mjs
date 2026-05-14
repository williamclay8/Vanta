import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function requireMarkers(source, markers, label) {
  for (const marker of markers) {
    assert.ok(source.includes(marker), `${label} missing marker: ${marker}`);
  }
}

const program = read("programs/vanta_private_pool_v2_spend/src/lib.rs");
const fuzzHarness = read("fuzz/vanta_private_pool_v2_spend/src/main.rs");
const readme = read("programs/vanta_private_pool_v2_spend/README.md");
const review = read("VANTA_ZK_REVIEW.md");
const limitations = read("SECURITY_LIMITATIONS.md");
const sbfAbiStatus = read("scripts/check-vanta-private-pool-v2-sbf-abi-status.mjs");
const packageJson = JSON.parse(read("package.json"));

requireMarkers(
  program,
  [
    "const TAG_REGISTER_PROVENANCED_ROOT: u8 = 4;",
    "const ROOT_RECORD_MAGIC: &[u8; 8] = b\"VNTA2RRC\";",
    "const ROOT_RECORD_SEED: &[u8] = b\"vanta2root\";",
    "const ROOT_RECORD_ACCOUNT_LEN",
    "const ERR_ROOT_RECORD_MISMATCH: u32 = 18;",
    "TAG_REGISTER_PROVENANCED_ROOT =>",
    "fn process_register_provenanced_root",
    "fn require_root_record_available",
    "fn ensure_root_record",
    "fn require_root_record(",
    "fn write_root_record",
    "fn require_previous_root_matches_history",
    "root_record_validation_rejects_malformed_metadata",
    "provenanced_root_registration_requires_root_history_lineage",
    "record_data.len() != ROOT_RECORD_ACCOUNT_LEN",
    "read_u32(record_data, ROOT_RECORD_LEAF_COUNT_OFFSET)? == 0",
    "registered provenanced accepted root",
    "require_root_record(program_id, pool_state, root_record, accepted_root)?;",
  ],
  "spend program",
);

assert.equal(
  [...program.matchAll(/require_root_record\(program_id, pool_state, root_record, accepted_root\)\?;/g)].length,
  2,
  "reserved spend-with-proof and Unshield preflights must both require root-record provenance",
);

requireMarkers(
  fuzzHarness,
  [
    "const TAG_REGISTER_ROOT: u8 = 2;",
    "const TAG_REGISTER_PROVENANCED_ROOT: u8 = 4;",
    "const ROOT_RECORD_MAGIC: &[u8; 8] = b\"VNTA2RRC\";",
    "const ROOT_RECORD_SEED: &[u8] = b\"vanta2root\";",
    "struct RootRecord",
    "legacy_roots: Vec<[u8; HASH_LEN]>",
    "root_records: Vec<RootRecord>",
    "root_record_for_registration",
    "action_register_legacy_root",
    "action_register_root_wrong_lineage",
    "ensure_root_record_placeholder",
    "legacy_root_registration_accounts",
    "assert_root_record",
    "assert_no_root_record_for_legacy_root",
    "spend_with_proof_accounts_with_wrong_root_record",
    "unshield_accounts_with_wrong_root_record",
    "legacy tag 2 root unexpectedly reached proof-verifier not-wired path",
    "legacy tag 2 root unexpectedly reached unshield-release not-wired path",
    "ERR_ROOT_RECORD_MISMATCH",
    "register_root_data",
    "provenanced_root_data",
  ],
  "Crucible harness",
);

requireMarkers(
  readme,
  [
    "### `4` - register provenanced root",
    "[4, acceptedRoot:32, previousRoot:32, transitionPublicInputHash:32, leafIndexBaseLeU64:8, leafCountLeU32:4, transitionKind:1]",
    "[\"vanta2root\", pool_state, acceptedRoot]",
    "program-owned root provenance record",
    "verifies `previousRoot` is zero for the first provenanced root",
    "Roots already registered through legacy tag `2` cannot be backfilled with tag `4`",
    "not proof that the root transition is correct",
    "`18`: supplied root record PDA or account content does not match the expected pool/root provenance record",
  ],
  "spend program README",
);

requireMarkers(
  review,
  [
    "program-owned root provenance record",
    "TAG_REGISTER_PROVENANCED_ROOT = 4",
    "vanta2root",
    "not proof that the root transition is correct",
  ],
  "VANTA_ZK_REVIEW.md",
);

requireMarkers(
  limitations,
  [
    "TAG_REGISTER_PROVENANCED_ROOT = 4",
    "program-owned root provenance record",
    "not proof that the root transition is correct",
  ],
  "SECURITY_LIMITATIONS.md",
);

requireMarkers(
  sbfAbiStatus,
  [
    "const TAG_REGISTER_PROVENANCED_ROOT: u8 = 4;",
    "const ROOT_RECORD_MAGIC",
    "const ROOT_RECORD_SEED",
    "const ERR_ROOT_RECORD_MISMATCH: u32 = 18;",
    "rootRecordProvenanceReserved: true",
    "rootRecordSeed: \"vanta2root\"",
    "tagRegisterProvenancedRoot: 4",
    "spendWithProofAccountCount: 8",
    "tagRegisterVaultAsset: 7",
    "unshieldAccountCount: 11",
    "unshieldVaultAssetSeed: \"vanta2asset\"",
  ],
  "SBF ABI status check",
);

assert.equal(
  packageJson.scripts?.["private-pool-v2:root-provenance-check"],
  "node scripts/check-vanta-private-pool-v2-root-provenance.mjs",
  "package.json must expose private-pool-v2:root-provenance-check",
);
assert.ok(
  packageJson.scripts?.["private-pool-v2:verify"]?.includes("npm run private-pool-v2:root-provenance-check"),
  "private-pool-v2:verify must include root provenance check",
);
assert.ok(
  packageJson.scripts?.["zk:review-guards-check"]?.includes("npm run private-pool-v2:root-provenance-check"),
  "zk:review-guards-check must include root provenance check",
);
assert.ok(
  packageJson.scripts?.["zk:feedback-loop-check"]?.includes("npm run private-pool-v2:root-provenance-check"),
  "zk:feedback-loop-check must include root provenance check",
);

console.log("Vanta Private Pool v2 root provenance check: PASS");
