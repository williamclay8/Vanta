import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const sourceFiles = [
  "programs/vanta_private_pool_v2_spend/Cargo.toml",
  "programs/vanta_private_pool_v2_spend/Cargo.lock",
  "programs/vanta_private_pool_v2_spend/src/lib.rs",
];
const sbfPath = "programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so";
const expectedSourceMarkers = [
  "const TAG_REGISTER_ROOT: u8 = 2;",
  "const TAG_SPEND_WITH_PROOF: u8 = 3;",
  "const TAG_REGISTER_PROVENANCED_ROOT: u8 = 4;",
  "const TAG_REGISTER_VERIFIER_KEY: u8 = 5;",
  "const TAG_UNSHIELD: u8 = 6;",
  "const ROOT_MAGIC",
  "const ROOT_RECORD_MAGIC",
  "const NULLIFIER_MARKER_MAGIC",
  "const NULLIFIER_MARKER_SEED",
  "const OUTPUT_RECORD_MAGIC",
  "const OUTPUT_RECORD_SEED",
  "const ROOT_RECORD_SEED",
  "const VAULT_AUTHORITY_SEED",
  "const VERIFIER_KEY_MAGIC",
  "const VERIFIER_KEY_SEED",
  "const ROOT_RECORD_ACCOUNT_LEN",
  "const POOL_STATE_LEN: usize = 184;",
  "const SPEND_PAYLOAD_LEN: usize = 1 + HASH_LEN * 5;",
  "const PROVENANCED_ROOT_PAYLOAD_LEN",
  "const REGISTER_VERIFIER_KEY_PAYLOAD_LEN",
  "const SPEND_WITH_PROOF_PAYLOAD_LEN",
  "const UNSHIELD_ACCEPTED_ROOT_OFFSET",
  "const UNSHIELD_PAYLOAD_LEN",
  "const ERR_UNKNOWN_ACCEPTED_ROOT: u32 = 11;",
  "const ERR_NULLIFIER_MARKER_MISMATCH: u32 = 12;",
  "const ERR_OUTPUT_RECORD_MISMATCH: u32 = 13;",
  "const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;",
  "const ERR_UNSHIELD_RELEASE_NOT_WIRED: u32 = 15;",
  "const ERR_VAULT_AUTHORITY_MISMATCH: u32 = 16;",
  "const ERR_VERIFIER_KEY_MISMATCH: u32 = 17;",
  "const ERR_ROOT_RECORD_MISMATCH: u32 = 18;",
  "fn process_register_root",
  "fn process_register_provenanced_root",
  "fn process_register_verifier_key",
  "fn process_spend_with_proof",
  "fn process_unshield",
  "fn require_root_record",
  "fn ensure_root_record",
  "fn require_vault_authority",
  "fn require_verifier_key_hash",
  "fn ensure_verifier_key",
  "fn write_verifier_key_account",
  "require_readonly_program_account(program_id, root_history)?;",
  "require_root_record(program_id, pool_state, root_record, accepted_root)?;",
  "require_output_record_available(",
  "ensure_nullifier_marker(",
  "ensure_output_record(",
  "system_instruction::create_account",
  "fixed_slot_contains(&root_data, HASH_LEN, accepted_root)?",
];

function commandStatus(command, args = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    const activeReleaseCommand = resolve(
      homedir(),
      ".local/share/solana/install/active_release/bin",
      command,
    );
    if (existsSync(activeReleaseCommand)) {
      const activeReleaseResult = spawnSync(activeReleaseCommand, args, { encoding: "utf8", stdio: "pipe" });
      return {
        available: activeReleaseResult.status === 0,
        command,
        resolvedCommand: activeReleaseCommand,
        status: activeReleaseResult.status,
        stderr: activeReleaseResult.stderr?.trim() || "",
        stdout: activeReleaseResult.stdout?.trim() || "",
      };
    }
  }

  return {
    available: result.status === 0,
    command,
    resolvedCommand: result.status === 0 ? command : null,
    status: result.status,
    stderr: result.stderr?.trim() || "",
    stdout: result.stdout?.trim() || "",
  };
}

function fileStatus(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return { exists: false, mtimeMs: null, path: relativePath };
  }

  const stat = statSync(absolutePath);
  return {
    exists: true,
    mtimeIso: new Date(stat.mtimeMs).toISOString(),
    mtimeMs: stat.mtimeMs,
    path: relativePath,
    size: stat.size,
  };
}

function newestExistingFile(files) {
  return files
    .filter((file) => file.exists)
    .reduce((newest, file) => (newest === null || file.mtimeMs > newest.mtimeMs ? file : newest), null);
}

const libSource = readFileSync(
  resolve(repoRoot, "programs/vanta_private_pool_v2_spend/src/lib.rs"),
  "utf8",
);
const missingSourceMarkers = expectedSourceMarkers.filter((marker) => !libSource.includes(marker));
const sourceStatuses = sourceFiles.map(fileStatus);
const newestSource = newestExistingFile(sourceStatuses);
const sbfStatus = fileStatus(sbfPath);
const cargoBuildSbf = commandStatus("cargo-build-sbf");
const solanaCli = commandStatus("solana");
const abiFresh =
  Boolean(newestSource) &&
  sbfStatus.exists &&
  sbfStatus.mtimeMs >= newestSource.mtimeMs &&
  missingSourceMarkers.length === 0;
const buildToolchainAvailable = cargoBuildSbf.available;
const deployToolchainAvailable = solanaCli.available;

const blockers = [];
if (missingSourceMarkers.length > 0) {
  blockers.push("source-abi-marker-drift");
}
if (!sbfStatus.exists) {
  blockers.push("missing-sbf-binary");
} else if (newestSource && sbfStatus.mtimeMs < newestSource.mtimeMs) {
  blockers.push("stale-sbf-binary");
}
if (!buildToolchainAvailable) {
  blockers.push("missing-cargo-build-sbf");
}
if (!deployToolchainAvailable) {
  blockers.push("missing-solana-cli");
}

const result = {
  abi: {
    poolStateLen: 184,
    nullifierMarkerPdaRequired: true,
    outputRecordPdaRequired: true,
    proofCarryingSpendReserved: true,
    proofCarryingSpendStatus: "fail-closed-verifier-key-preflight-source-only",
    proofCarryingSpendVerifierKeySeed: "vanta2vkey",
    verifierKeyRegistrySourceOnly: true,
    verifierKeyAccountLen: 80,
    registerVerifierKeyInstructionLen: 33,
    rootRecordProvenanceReserved: true,
    rootRecordSeed: "vanta2root",
    spendWithProofAccountCount: 8,
    proofVerifiedUnshieldReserved: true,
    proofVerifiedUnshieldStatus: "fail-closed-vault-preflight-source-only",
    rootHistoryAccountRequired: true,
    rootRecordAccountLen: 165,
    spendAccountCount: 8,
    spendInstructionLen: 161,
    spendWithProofInstructionLen: 449,
    tagRegisterProvenancedRoot: 4,
    tagRegisterVerifierKey: 5,
    tagUnshield: 6,
    tagRegisterRoot: 2,
    tagSpendWithProof: 3,
    unshieldAccountCount: 5,
    unshieldInstructionLen: 425,
    unshieldVaultAuthoritySeed: "vanta2vault",
  },
  abiFresh,
  buildToolchainAvailable,
  deployToolchainAvailable,
  blockers,
  cargoBuildSbf,
  checkCommand: "npm run private-pool-v2:sbf-abi-check",
  kind: "Vanta Private Pool v2 SBF ABI status",
  missingSourceMarkers,
  newestSource,
  sbf: sbfStatus,
  solanaCli,
  sourceFiles: sourceStatuses,
  status:
    blockers.length === 0
      ? "fresh"
      : abiFresh
        ? "fresh-but-toolchain-blocked"
        : "blocked",
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta Private Pool v2 SBF ABI status");
  console.log(`- status: ${result.status}`);
  console.log(`- abiFresh: ${String(result.abiFresh)}`);
  console.log(`- sourceNewest: ${newestSource ? `${newestSource.path} @ ${newestSource.mtimeIso}` : "missing"}`);
  console.log(`- sbf: ${sbfStatus.exists ? `${sbfStatus.path} @ ${sbfStatus.mtimeIso}` : "missing"}`);
  console.log(
    `- cargo-build-sbf: ${cargoBuildSbf.available ? `${cargoBuildSbf.stdout} (${cargoBuildSbf.resolvedCommand})` : "missing"}`,
  );
  console.log(`- solana: ${solanaCli.available ? `${solanaCli.stdout} (${solanaCli.resolvedCommand})` : "missing"}`);
  console.log(`- blockers: ${blockers.length === 0 ? "none" : blockers.join(", ")}`);
  console.log("- rebuild command: cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml");
  console.log("- check command: npm run private-pool-v2:sbf-abi-check");
}

if (checkMode && blockers.length > 0) {
  process.exit(1);
}
