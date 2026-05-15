#!/usr/bin/env node
/**
 * Native SOL TAG6 — Build TAG_REGISTER_VAULT_ASSET=7 Instruction (kind=2, sentinel)
 *
 * This tool removes the "I don't know how to register the SOL vault asset on-chain" blocker.
 *
 * It constructs the exact instruction data for TAG_REGISTER_VAULT_ASSET = 7
 * with assetKind = VAULT_ASSET_KIND_SOL (=2) and exitAssetId = NATIVE_SOL_ASSET_ID_SENTINEL.
 *
 * The resulting instruction (when combined with the correct accounts) is what the operator
 * or deployer will submit to register native SOL as a first-class vault asset.
 *
 * See design doc §11 and VANTA_ZK_REVIEW.md U2.1 for the full registration + CPI flow.
 */

import { PublicKey } from "@solana/web3.js";
import { Buffer } from "node:buffer";

const TAG_REGISTER_VAULT_ASSET = 7;
const VAULT_ASSET_KIND_SOL = 2;
const SENTINEL = Buffer.alloc(32, 0); // NATIVE_SOL_ASSET_ID_SENTINEL

function printHelp() {
  console.log(`
Native SOL TAG6 — TAG_REGISTER_VAULT_ASSET Instruction Builder (kind=2)

Usage:
  node scripts/native-sol-tag6/build-register-sol-vault-asset-instruction.mjs \\
    --program-id <PROGRAM_ID> \\
    --pool-state <POOL_STATE_PUBKEY> \\
    --mint <MINT_OR_PLACEHOLDER> \\
    --vault-token-account <PLACEHOLDER_FOR_SOL> \\
    --token-program <TOKEN_PROGRAM_OR_SYSTEM> \\
    [--json]

This produces the 130-byte instruction data for TAG 7 with kind=2 + sentinel.

For native SOL the "mint" / "vault token account" / "token program" fields are
largely ignored by the SOL branch (they are still part of the unified ABI).
Use placeholders that satisfy the on-chain preflight or the actual values
if you are also registering a parallel WSOL path.
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help") { printHelp(); process.exit(0); }
    if (args[i] === "--program-id") out.programId = args[++i];
    if (args[i] === "--pool-state") out.poolState = args[++i];
    if (args[i] === "--mint") out.mint = args[++i];
    if (args[i] === "--vault-token-account") out.vaultTokenAccount = args[++i];
    if (args[i] === "--token-program") out.tokenProgram = args[++i];
    if (args[i] === "--json") out.json = true;
  }
  if (!out.programId || !out.poolState) {
    console.error("Error: --program-id and --pool-state are required");
    printHelp();
    process.exit(1);
  }
  return out;
}

function main() {
  const { programId, poolState, mint, vaultTokenAccount, tokenProgram, json } = parseArgs();

  const program = new PublicKey(programId);
  const pool = new PublicKey(poolState);

  // For SOL we can use the sentinel as "mint" equivalent in the registry record
  const mintPk = mint ? new PublicKey(mint) : new PublicKey("So11111111111111111111111111111111111111112"); // WSOL as placeholder
  const vaultTa = vaultTokenAccount ? new PublicKey(vaultTokenAccount) : PublicKey.default;
  const tokenProg = tokenProgram ? new PublicKey(tokenProgram) : new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

  // Instruction data layout (from lib.rs REGISTER_VAULT_ASSET_PAYLOAD_LEN):
  // [tag:1, exitAssetId:32, mint:32, vaultTokenAccount:32, tokenProgram:32, assetKind:1]
  const data = Buffer.alloc(1 + 32 + 32 + 32 + 32 + 1);
  data.writeUInt8(TAG_REGISTER_VAULT_ASSET, 0);
  SENTINEL.copy(data, 1);                    // exitAssetId = sentinel
  mintPk.toBuffer().copy(data, 33);
  vaultTa.toBuffer().copy(data, 65);
  tokenProg.toBuffer().copy(data, 97);
  data.writeUInt8(VAULT_ASSET_KIND_SOL, 129); // assetKind = 2

  const instruction = {
    programId: program.toBase58(),
    keys: [
      { pubkey: pool.toBase58(), isSigner: false, isWritable: false }, // pool_state (ro)
      // vault_asset PDA will be derived on-chain from ["vanta2asset", pool, sentinel]
      // vault_authority PDA from ["vanta2vault", pool, sentinel]
      // system_program
    ],
    data: data.toString("hex"),
    description: "TAG_REGISTER_VAULT_ASSET = 7 for native SOL (kind=2, sentinel asset id)",
  };

  const result = {
    instruction,
    humanReadable: {
      tag: TAG_REGISTER_VAULT_ASSET,
      assetKind: VAULT_ASSET_KIND_SOL,
      assetKindName: "VAULT_ASSET_KIND_SOL",
      exitAssetId: "0000...0000 (32 zero bytes sentinel)",
      notes: [
        "Submit this instruction after program deployment to register native SOL.",
        "The on-chain handler will create the vault_asset record with releaseEnabled=0 initially.",
        "TAG_UNSHIELD=6 will later require releaseEnabled=1 for production use (or the test helper bypass).",
      ],
    },
    references: {
      designDoc: "2026-05-14-native-sol-private-pool-v2-integration.md §11",
      statusNote: "2026-05-14-native-sol-v2-integration-status.md",
      program: "programs/vanta_private_pool_v2_spend/src/lib.rs (TAG_REGISTER_VAULT_ASSET, VAULT_ASSET_KIND_SOL)",
    },
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\n=== TAG_REGISTER_VAULT_ASSET=7 Instruction for Native SOL (kind=2) ===\n");
    console.log("Program ID:     ", instruction.programId);
    console.log("Data (hex):     ", instruction.data);
    console.log("Data length:    ", data.length, "bytes");
    console.log("\nHuman description:", result.humanReadable.description);
    console.log("\nNext step: Use this instruction data + the correct accounts when submitting the registration transaction on mainnet.");
    console.log("See the deployment worksheet for the full account list and transaction construction.");
  }
}

main();