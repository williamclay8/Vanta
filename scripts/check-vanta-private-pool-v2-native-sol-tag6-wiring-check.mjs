import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readRepoFile(relativePath) {
  try {
    return readFileSync(resolve(relativePath), "utf8");
  } catch {
    return "";
  }
}

const repoRoot = resolve(import.meta.dirname, "..");
const packageJsonSource = readRepoFile("package.json");
const zkReviewSource = readRepoFile("VANTA_ZK_REVIEW.md");
const programSource = readRepoFile("programs/vanta_private_pool_v2_spend/src/lib.rs");
const programReadme = readRepoFile("programs/vanta_private_pool_v2_spend/README.md");
const onchainStateSource = readRepoFile("operator/vanta-onchain-state.mjs");
const unshieldStatusSource = readRepoFile("src/readiness/unshieldMainnetProductionStatus.mjs");
const unshieldTrustSource = readRepoFile("src/solana/unshieldTrustContract.ts");

// Robust design doc + status note paths (Lumi runs across workspaces; authoritative references per task)
const designDocPathCandidates = [
  "/Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md",
  resolve(repoRoot, "../Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md"),
  resolve(repoRoot, "../../Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md"),
  "Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md",
];
let designDocSource = "";
for (const p of designDocPathCandidates) {
  designDocSource = readRepoFile(p);
  if (designDocSource) break;
}
const statusNotePathCandidates = [
  "/Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-v2-integration-status.md",
  resolve(repoRoot, "../Vanta Vault/wiki/analyses/2026-05-14-native-sol-v2-integration-status.md"),
  resolve(repoRoot, "../../Vanta Vault/wiki/analyses/2026-05-14-native-sol-v2-integration-status.md"),
];
let statusNoteSource = "";
for (const p of statusNotePathCandidates) {
  statusNoteSource = readRepoFile(p);
  if (statusNoteSource) break;
}

// === Design Doc + Status Note References (TAG6 prep authoritative) ===
assert.ok(
  designDocSource.includes("2026-05-14-native-sol-private-pool-v2-integration.md") ||
    designDocSource.includes("TAG6 Future-Proofing") ||
    designDocSource.includes("sentinel from the very first commit"),
  "Design document must be readable and contain TAG6 / native SOL integration plan (Phase B prep)."
);
assert.ok(
  designDocSource.includes("NATIVE_SOL_ASSET_ID_SENTINEL") &&
    designDocSource.includes("VAULT_ASSET_KIND_SOL") &&
    designDocSource.includes("vanta2solvault") &&
    designDocSource.includes("system_instruction::transfer") &&
    designDocSource.includes("program-owned-sol-vault-pda-system-cpi"),
  "Design document must document native SOL TAG6 data model: sentinel, VAULT_ASSET_KIND_SOL=2, SOL vault PDA seeds, system CPI (per §11)."
);
assert.ok(
  statusNoteSource.includes("TAG6 prep subagent") &&
    statusNoteSource.includes("proposed verification commands") &&
    statusNoteSource.includes("native-sol-tag6-wiring-check"),
  "Status note must reference TAG6 prep work and proposed verification commands (native-sol-tag6-wiring-check etc)."
);

// === VANTA_ZK_REVIEW.md U2.1 TAG6 Native SOL Wiring (from design) ===
assert.ok(
  zkReviewSource.includes("native SOL") && zkReviewSource.includes("TAG_UNSHIELD") && zkReviewSource.includes("sentinel"),
  "VANTA_ZK_REVIEW.md must contain native SOL TAG6 wiring plan (U2.1 subsection per design)."
);
assert.ok(
  zkReviewSource.includes("NATIVE_SOL_ASSET_ID_SENTINEL") &&
    zkReviewSource.includes("VAULT_ASSET_KIND_SOL") &&
    zkReviewSource.includes("vanta2solvault") &&
    zkReviewSource.includes("system_instruction::transfer") &&
    zkReviewSource.includes("exit_asset_id"),
  "VANTA_ZK_REVIEW.md must specify sentinel usage, VAULT_ASSET_KIND_SOL, PDA seeds vanta2solvault + sentinel, exit_asset_id, system CPI for TAG6."
);
assert.ok(
  zkReviewSource.includes("program-owned") && zkReviewSource.includes("TAG6"),
  "VANTA_ZK_REVIEW.md must preserve program-owned + TAG6 native SOL boundary (fail-closed per design/status)."
);

// === Core sentinel + isNativeSol + VAULT_ASSET_KIND in operator (from Phase 1, TAG6 ready) ===
assert.ok(
  onchainStateSource.includes("NATIVE_SOL_ASSET_ID_SENTINEL") &&
    onchainStateSource.includes("isNativeSolAssetId") &&
    onchainStateSource.includes("VAULT_ASSET_KIND_SOL"),
  "operator/vanta-onchain-state.mjs must export NATIVE_SOL_ASSET_ID_SENTINEL, isNativeSolAssetId, VAULT_ASSET_KIND_SOL for TAG6 alignment."
);
assert.ok(
  onchainStateSource.includes("2026-05-14-native-sol-private-pool-v2-integration.md"),
  "operator/vanta-onchain-state.mjs must reference design document for TAG6 forward-compat."
);

// === Program / README: Test helper now demonstrates wired native SOL TAG6 CPI path (per completed Rust Deepening lane) + generalized preflights; production SBF release remains fail-closed ===
assert.ok(
  programSource.includes("TAG_UNSHIELD") && programSource.includes("process_unshield"),
  "Program must contain TAG_UNSHIELD=6 scaffold (preflights generalized per TAG6 prep)."
);
assert.ok(
  programReadme.includes("TAG_UNSHIELD") && programReadme.includes("vault-asset registry"),
  "Program README must document TAG_UNSHIELD preflight and vault-asset (TAG6 prep)."
);
// Positive assertions for runtime-gated TAG6 wiring (dedicated SOL_VAULT_SEED + sentinel derivation,
// reserved UnshieldEvent/System CPI shape, and no public release before verifier evidence).
assert.ok(
  programSource.includes("const VAULT_ASSET_KIND_SOL: u8 = 2;"),
  "programs/vanta_private_pool_v2_spend/src/lib.rs must define VAULT_ASSET_KIND_SOL=2 for TAG6 SOL branch (runtime-gated design contract)."
);
assert.ok(
  programSource.includes('const SOL_VAULT_SEED: &[u8] = b"vanta2solvault";'),
  "program must define SOL_VAULT_SEED exactly as b\"vanta2solvault\" (PDA seeds per design doc §11: [\"vanta2solvault\", pool_state, sentinel])."
);
assert.ok(
  programSource.includes("if asset_kind == VAULT_ASSET_KIND_SOL {"),
  "process_unshield must contain SOL kind==2 branch (runtime-gated fail-closed wiring per Rust Deepening lane)."
);
assert.ok(
  programSource.includes("system_instruction::transfer(sol_vault_holding.key, destination.key, exit_amount)"),
  "SOL branch must contain system_instruction::transfer CPI from the dedicated SOL vault PDA to the destination system account."
);
assert.ok(
  programSource.includes("invoke_signed("),
  "SOL branch must use invoke_signed for PDA-signed system transfer (no operator keypair signer on funds movement)."
);
assert.ok(
  /SOL_VAULT_SEED,\s*pool_state\.key\.as_ref\(\),\s*&NATIVE_SOL_ASSET_ID_SENTINEL/su.test(programSource) &&
    programSource.includes("sol_vault_holding.clone()"),
  "PDA derivation and CPI accounts in SOL branch must use SOL_VAULT_SEED + sentinel with the dedicated sol_vault_holding account."
);
assert.ok(
  programSource.includes("nullifier_marker"),
  "SOL branch must reference nullifier_marker PDA (reused from spend logic for consume)."
);
assert.ok(
  !programSource.match(/if asset_kind == VAULT_ASSET_KIND_SOL \{[\s\S]{0,800}?(vaultOwner|operator.*keypair|signer.*operator)/i),
  "SOL branch must NOT contain operator keypair on transfer (program-owned PDA only; 'as private as possible' per design doc §11)."
);
assert.ok(
  programSource.includes("design doc §11") || programSource.includes("2026-05-14-native-sol-private-pool-v2-integration.md") || programSource.includes("VANTA_ZK_REVIEW.md U2.1"),
  "program lib.rs must heavily reference the authoritative design document §11, status note, and VANTA_ZK_REVIEW U2.1 in Native SOL + TAG6 comments."
);
assert.ok(
  programSource.includes("UnshieldEvent") || programSource.includes("Minimal UnshieldEvent"),
  "program must have UnshieldEvent scaffolding / emit for indexer (reserved per Rust Deepening + design §11)."
);
assert.ok(
  programSource.includes("require_pool_verifier_wired(&pool_data, ERR_UNSHIELD_NOT_WIRED)?;") &&
    programSource.includes("unshield_sol_verifier_wired_zero_rejects_before_nullifier_or_release") &&
    programSource.includes("unshield_sol_verifier_wired_one_still_rejects_until_verifier_acceptance"),
  "SOL TAG6 must be runtime-gated and fail closed before nullifier consume or CPI until verifier/root/nullifier acceptance exists."
);

// === Status / Trust surfaces for native SOL TAG6 ===
assert.ok(
  unshieldStatusSource.includes("nativeSolProgramOwnedVaultPdaReady: false") &&
    unshieldStatusSource.includes("nativeSolTagUnshieldSystemCpiReady: false") &&
    unshieldStatusSource.includes("productionCustodyReadyForSol: false"),
  "unshieldMainnetProductionStatus.mjs must expose native SOL TAG6 fields all false (fail-closed red-first)."
);
assert.ok(
  unshieldStatusSource.includes("native-sol-program-owned-vault-pda-not-deployed") &&
    unshieldStatusSource.includes("tag-unshield-sol-kind-not-wired"),
  "Unshield status must list native SOL TAG6 blockers (per design doc + status note)."
);
assert.ok(
  unshieldTrustSource.includes("nativeSolLongTermBoundary") &&
    unshieldTrustSource.includes("program-owned-sol-vault-pda-system-cpi") &&
    unshieldTrustSource.includes("productionCustodyReadyForSol: false"),
  "unshieldTrustContract.ts must preserve native SOL long-term TAG6 boundary (program-owned PDA + system CPI, fail-closed)."
);

// === Package wiring + composite chains (self + task requirement) ===
assert.ok(
  packageJsonSource.includes("private-pool-v2:native-sol-tag6-wiring-check"),
  "package.json must register private-pool-v2:native-sol-tag6-wiring-check."
);
assert.ok(
  packageJsonSource.includes("check-vanta-private-pool-v2-native-sol-tag6-wiring-check.mjs"),
  "package.json script must point to this check file."
);
assert.ok(
  packageJsonSource.includes("private-pool-v2:native-sol-tag6-wiring-check") &&
    (packageJsonSource.includes("zk:review-guards-check") || packageJsonSource.includes("private-pool-v2:verify")),
  "package.json verify chains must include the new native-sol-tag6-wiring-check (fail-closed TAG6 assertion)."
);

// === Strict fail-closed (no production claim elevation) ===
assert.ok(
  !unshieldStatusSource.includes("productionCustodyReadyForSol: true") &&
    !zkReviewSource.includes("nativeSolTagUnshieldSystemCpiReady: true"),
  "No surfaces may flip native SOL TAG6 production flags without live on-chain evidence (design doc + status note)."
);

console.log("Vanta Private Pool v2 Native SOL TAG6 Wiring Check: PASS");
console.log(
  "Evidence: VANTA_ZK_REVIEW.md U2.1 + design doc 2026-05-14-native-sol-private-pool-v2-integration.md + status note 2026-05-14-native-sol-v2-integration-status.md all reference sentinel, VAULT_ASSET_KIND_SOL=2, vanta2solvault PDA, system_instruction::transfer CPI, and exit_asset_id sentinel for TAG_UNSHIELD=6. operator exports isNativeSolAssetId + sentinel (Day 1). programs/vanta_private_pool_v2_spend/src/lib.rs preserves SOL_VAULT_SEED + sentinel derivation and reserved PDA-signed SOL CPI shape, but TAG6 is now runtime-gated by pool_state.verifier_wired and remains fail-closed before nullifier consume or CPI. Production surfaces remain strictly fail-closed (productionCustodyReadyForSol:false, blockers active, live evidence required per §12). New check is wired in package.json + zk:review-guards-check / private-pool-v2:verify / truth:privacy-claim-gate / zk:feedback-loop-check. References: design doc §11 + status note Post-Deployment Monitoring Checklist + §12."
);
