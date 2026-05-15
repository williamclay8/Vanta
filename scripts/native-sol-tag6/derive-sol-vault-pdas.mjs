#!/usr/bin/env node
/**
 * Native SOL TAG6 — SOL Vault PDA Derivation Tool
 *
 * Purpose: Remove the "I don't know the exact PDA addresses for deployment and evidence" blocker.
 *
 * This tool derives the two critical PDAs for native SOL in TAG6:
 *   1. Vault Asset Registry PDA (used in TAG_REGISTER_VAULT_ASSET = 7 and preflights)
 *   2. SOL Vault Holding PDA (the actual program-owned account that will hold lamports)
 *
 * Seeds (authoritative — design doc §11 + VANTA_ZK_REVIEW.md U2.1 + lib.rs):
 *   - Asset Registry: ["vanta2asset", poolStatePubkey, NATIVE_SOL_ASSET_ID_SENTINEL]
 *   - SOL Vault Holding: ["vanta2solvault", poolStatePubkey, NATIVE_SOL_ASSET_ID_SENTINEL]
 *
 * Usage:
 *   node scripts/native-sol-tag6/derive-sol-vault-pdas.mjs --pool-state <PUBKEY>
 *   node scripts/native-sol-tag6/derive-sol-vault-pdas.mjs --pool-state <PUBKEY> --json
 *
 * The output is the exact addresses you will use for:
 *   - Program deployment verification
 *   - TAG_REGISTER_VAULT_ASSET instruction (kind=2)
 *   - On-chain scanning for TAG6 SOL releases
 *   - Live evidence collection
 *
 * References:
 *   - Design document: 2026-05-14-native-sol-private-pool-v2-integration.md §11
 *   - Status note: 2026-05-14-native-sol-v2-integration-status.md (Post-Deployment Checklist)
 *   - VANTA_ZK_REVIEW.md U2.1 Native SOL Support in TAG_UNSHIELD = 6
 *   - programs/vanta_private_pool_v2_spend/src/lib.rs (SOL_VAULT_SEED, NATIVE_SOL_ASSET_ID_SENTINEL)
 *
 * All values are deterministic and must match on-chain exactly.
 */

import { PublicKey } from "@solana/web3.js";
import { strict as assert } from "node:assert";

const NATIVE_SOL_ASSET_ID_SENTINEL = new Uint8Array(32); // 32 zero bytes — fixed sentinel per design

const VAULT_ASSET_SEED = Buffer.from("vanta2asset");
const SOL_VAULT_SEED = Buffer.from("vanta2solvault");

function printHelp() {
  console.log(`
Native SOL TAG6 — SOL Vault PDA Derivation Tool

Usage:
  node scripts/native-sol-tag6/derive-sol-vault-pdas.mjs --pool-state <POOL_STATE_PUBKEY> [--json]

Options:
  --pool-state <pubkey>   The pool_state pubkey of the deployed Private Pool v2 program (required)
  --json                  Output machine-readable JSON only
  --help                  Show this help

Examples:
  node scripts/native-sol-tag6/derive-sol-vault-pdas.mjs --pool-state YourPoolStatePubkeyHere
  node scripts/native-sol-tag6/derive-sol-vault-pdas.mjs --pool-state YourPoolStatePubkeyHere --json

This tool produces the exact PDAs required for:
  - TAG_REGISTER_VAULT_ASSET = 7 (kind=2, sentinel)
  - On-chain TAG_UNSHIELD=6 system CPI verification
  - Live production evidence collection (Post-Deployment Monitoring Checklist §12)

See design doc §11 and status note for full context.
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--pool-state") {
      result.poolState = args[++i];
      continue;
    }
    if (arg === "--json") {
      result.json = true;
      continue;
    }
  }

  if (!result.poolState) {
    console.error("Error: --pool-state <PUBKEY> is required\n");
    printHelp();
    process.exit(1);
  }

  return result;
}

async function main() {
  const { poolState: poolStateStr, json } = parseArgs();

  let poolState;
  try {
    poolState = new PublicKey(poolStateStr);
  } catch (e) {
    console.error(`Invalid pool_state pubkey: ${poolStateStr}`);
    process.exit(1);
  }

  // Derive Vault Asset Registry PDA (used for kind registration and preflights)
  const [vaultAssetPda, vaultAssetBump] = PublicKey.findProgramAddressSync(
    [VAULT_ASSET_SEED, poolState.toBuffer(), Buffer.from(NATIVE_SOL_ASSET_ID_SENTINEL)],
    // NOTE: In real usage you would pass the actual deployed program ID here.
    // For derivation we use a placeholder; the important part is the seeds.
    // The real program ID will be known after first deploy.
    new PublicKey("VantaPrivPoolV2Spend1111111111111111111111111") // placeholder — replace with real program ID
  );

  // Derive SOL Vault Holding PDA (the actual lamports holder — this is the critical one for CPI)
  const [solVaultPda, solVaultBump] = PublicKey.findProgramAddressSync(
    [SOL_VAULT_SEED, poolState.toBuffer(), Buffer.from(NATIVE_SOL_ASSET_ID_SENTINEL)],
    new PublicKey("VantaPrivPoolV2Spend1111111111111111111111111") // placeholder — replace with real program ID
  );

  const output = {
    poolState: poolState.toBase58(),
    nativeSolAssetIdSentinel: "0000000000000000000000000000000000000000000000000000000000000000",
    seeds: {
      vaultAsset: "vanta2asset",
      solVaultHolding: "vanta2solvault",
    },
    pdas: {
      vaultAssetRegistry: {
        address: vaultAssetPda.toBase58(),
        bump: vaultAssetBump,
        seeds: ["vanta2asset", poolState.toBase58(), "sentinel (32 zero bytes)"],
        purpose: "Registered via TAG_REGISTER_VAULT_ASSET=7 with assetKind=2 (VAULT_ASSET_KIND_SOL)",
      },
      solVaultHolding: {
        address: solVaultPda.toBase58(),
        bump: solVaultBump,
        seeds: ["vanta2solvault", poolState.toBase58(), "sentinel (32 zero bytes)"],
        purpose: "Program-owned PDA that holds native SOL lamports. TAG_UNSHIELD=6 performs system_instruction::transfer from this PDA.",
      },
    },
    importantNotes: [
      "Replace the placeholder program ID above with the actual deployed vanta_private_pool_v2_spend program ID before using these addresses on mainnet.",
      "The SOL Vault Holding PDA (vanta2solvault) is the one that must sign the system CPI in process_unshield for kind=2.",
      "These addresses are deterministic. They must match exactly what the on-chain program derives.",
      "Use these in: deployment worksheet, on-chain scanner, live evidence verifier, and TAG7 registration instruction.",
    ],
    references: {
      designDoc: "wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md §11",
      statusNote: "wiki/analyses/2026-05-14-native-sol-v2-integration-status.md (Post-Deployment Monitoring Checklist)",
      zkReview: "VANTA_ZK_REVIEW.md U2.1",
      programSource: "programs/vanta_private_pool_v2_spend/src/lib.rs (SOL_VAULT_SEED, NATIVE_SOL_ASSET_ID_SENTINEL)",
    },
    generatedAt: new Date().toISOString(),
  };

  if (json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("\n=== Native SOL TAG6 — Derived PDAs ===\n");
    console.log(`Pool State: ${output.poolState}`);
    console.log(`Sentinel:   ${output.nativeSolAssetIdSentinel}\n`);

    console.log("1. Vault Asset Registry PDA (for TAG7 registration, kind=2)");
    console.log(`   Address: ${output.pdas.vaultAssetRegistry.address}`);
    console.log(`   Bump:    ${output.pdas.vaultAssetRegistry.bump}`);
    console.log(`   Seeds:   ${output.pdas.vaultAssetRegistry.seeds.join(" | ")}\n`);

    console.log("2. SOL Vault Holding PDA (the actual lamports account — critical for CPI)");
    console.log(`   Address: ${output.pdas.solVaultHolding.address}`);
    console.log(`   Bump:    ${output.pdas.solVaultHolding.bump}`);
    console.log(`   Seeds:   ${output.pdas.solVaultHolding.seeds.join(" | ")}\n`);

    console.log("Important: Replace the placeholder program ID with the real deployed program ID.");
    console.log("These PDAs are required for deployment, TAG7 registration, on-chain scanning, and live evidence collection.\n");

    console.log("References:");
    console.log("  - Design doc §11 + status note Post-Deployment Checklist");
    console.log("  - VANTA_ZK_REVIEW.md U2.1\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});