#!/usr/bin/env node
/**
 * derive-sol-vault-pda.mjs
 * Production-grade small utility for Native SOL TAG6 Deployment Command Center.
 * Given pool_state pubkey (and optional sentinel hex, program ID), outputs the exact
 * SOL vault PDA + bump using authoritative seeds from design doc §11.
 *
 * SOL_VAULT_SEED = b"vanta2solvault"
 * NATIVE_SOL_ASSET_ID_SENTINEL = [0u8; 32]
 * PDA: find_program_address( &[SOL_VAULT_SEED, pool_state, sentinel], program_id )
 *
 * Used by deploy script, operator runbook, post-deploy verification, and mainnet checks.
 * References: design doc §11 (PDA seeds, VAULT_ASSET_KIND_SOL=2, sentinel), status note
 * "Native SOL TAG6 Post-Deployment Monitoring Checklist", lib.rs (sol_vault_pda, require_sol_vault_pda).
 *
 * Usage (run from workspace root after npm install):
 *   node programs/vanta_private_pool_v2_spend/scripts/derive-sol-vault-pda.mjs <pool_state_pubkey> [sentinel_hex] [program_id]
 *
 * Example (hypothetical mainnet values; replace with real pool_state after init):
 *   node ... 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZj9U7bK1 0000000000000000000000000000000000000000000000000000000000000000 Vant aPrivPoolV2SpendProgramId11111111111111111111
 *
 * Output includes exact command for Rust verification and expected PDA for registration tx.
 * Lumi hygiene: local builds only, no secrets.
 */

import { PublicKey } from "@solana/web3.js";

const SOL_VAULT_SEED = Buffer.from("vanta2solvault");
const NATIVE_SOL_ASSET_ID_SENTINEL = Buffer.alloc(32, 0); // authoritative per design §11

function deriveSolVaultPda(poolStateStr, sentinelStr = null, programIdStr = null) {
  if (!poolStateStr) {
    throw new Error("pool_state pubkey is required");
  }
  const poolState = new PublicKey(poolStateStr);

  let sentinel = NATIVE_SOL_ASSET_ID_SENTINEL;
  if (sentinelStr) {
    const hex = sentinelStr.replace(/^0x/, "");
    if (hex.length !== 64) {
      throw new Error("sentinel_hex must be exactly 64 hex chars (32 bytes)");
    }
    sentinel = Buffer.from(hex, "hex");
  }

  // Program ID: user must supply real deployed program ID after `solana program deploy`
  // Placeholder for dry-run / docs; real deploys use env VANTA_PRIVATE_POOL_V2_SPEND_PROGRAM_ID or arg
  const DEFAULT_PROGRAM_ID = "VantaPrivatePoolV2SpendProgramId11111111111111111111"; // 44-char example placeholder
  const programId = programIdStr ? new PublicKey(programIdStr) : new PublicKey(DEFAULT_PROGRAM_ID);

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [SOL_VAULT_SEED, poolState.toBuffer(), sentinel],
    programId
  );

  console.log("=== Native SOL TAG6 SOL Vault PDA Derivation (Deployment Command Center) ===");
  console.log("Design doc §11 authoritative seeds + VANTA_ZK_REVIEW U2.1 + status note checklist");
  console.log("SOL_VAULT_SEED: \"vanta2solvault\" (b\"vanta2solvault\")");
  console.log("NATIVE_SOL_ASSET_ID_SENTINEL: 32 zero bytes (or poseidon(b\"vanta-native-sol-asset-v1\"))");
  console.log("");
  console.log("Inputs:");
  console.log("  pool_state:", poolState.toBase58());
  console.log("  sentinel (hex):", sentinel.toString("hex"));
  console.log("  program_id:", programId.toBase58());
  console.log("");
  console.log("Derived SOL Vault PDA (program-owned lamports custody for kind=2):");
  console.log("  PDA:", pda.toBase58());
  console.log("  bump:", bump);
  console.log("");
  console.log("Rust verification (exact match in lib.rs sol_vault_pda + process_unshield SOL branch):");
  console.log(`  let (expected, bump) = Pubkey::find_program_address(`);
  console.log(`      &[b"vanta2solvault", pool_state.as_ref(), &NATIVE_SOL_ASSET_ID_SENTINEL],`);
  console.log(`      program_id,`);
  console.log(`  );`);
  console.log("  assert_eq!(sol_vault_holding.key, expected);");
  console.log("");
  console.log("Usage in TAG_REGISTER_VAULT_ASSET=7 (kind=2) and TAG_UNSHIELD=6:");
  console.log("  - vault_asset_record PDA uses ASSET_RECORD_SEED + pool + sentinel");
  console.log("  - sol_vault_holding uses above PDA (writable, system-owned initially, program CPI authority)");
  console.log("  - After registration: kind=2, releaseEnabled=true in vault_asset_record data[9..]");
  console.log("");
  console.log("For real mainnet deployment: run with actual pool_state (from init tx), deployed program_id,");
  console.log("  record PDA in operator runbook + post-deploy verification (native-sol-tag6 checks on mainnet RPC).");
  console.log("Lumi: local only; no secrets; cross-ref design §11 + status note Post-Deployment Checklist.");
  console.log("================================================================================");

  return { pda: pda.toBase58(), bump, seeds: ["vanta2solvault", poolState.toBase58(), sentinel.toString("hex")] };
}

if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  const [poolState, sentinel, programId] = process.argv.slice(2);
  if (!poolState) {
    console.error("Usage: node derive-sol-vault-pda.mjs <pool_state_pubkey> [sentinel_hex] [program_id]");
    console.error("  sentinel_hex defaults to 64 zeros for NATIVE_SOL_ASSET_ID_SENTINEL");
    console.error("  program_id defaults to placeholder (supply real after deploy)");
    process.exit(1);
  }
  try {
    deriveSolVaultPda(poolState, sentinel, programId);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

export { deriveSolVaultPda, SOL_VAULT_SEED, NATIVE_SOL_ASSET_ID_SENTINEL };