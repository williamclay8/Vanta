import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Keypair } from "@solana/web3.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = resolve(repoRoot, "scripts/print-vanta-private-pool-v2-solana-spend-transaction.mjs");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

const relayerFeePayer = Keypair.generate().publicKey.toBase58();
const programId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const nullifierSet = Keypair.generate().publicKey.toBase58();
const outputQueue = Keypair.generate().publicKey.toBase58();
const operatorAuthority = relayerFeePayer;

const result = spawnSync(process.execPath, [scriptPath], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF: "0x" + "22".repeat(32),
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REF: "0x" + "11".repeat(32),
    VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF: "0x" + "33".repeat(32),
    VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF: "0x" + "44".repeat(32),
    VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET: relayerFeePayer,
    VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL: "https://example.invalid",
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_RECENT_BLOCKHASH: "11111111111111111111111111111111",
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET: nullifierSet,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE: outputQueue,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY: operatorAuthority,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE: poolState,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID: programId,
  },
});

assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(
  result.stdout.trim(),
  /^export VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION='base64:[A-Za-z0-9+/]+=*'$/,
);
assert.equal(result.stdout.includes("11111111111111111111111111111111"), false);
assert.equal(result.stdout.includes("22222222222222222222222222222222"), false);
assert.equal(result.stdout.includes("33333333333333333333333333333333"), false);
assert.equal(result.stdout.includes("44444444444444444444444444444444"), false);

const jsonResult = spawnSync(process.execPath, [scriptPath, "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF: "0x" + "22".repeat(32),
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REF: "0x" + "11".repeat(32),
    VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF: "0x" + "33".repeat(32),
    VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF: "0x" + "44".repeat(32),
    VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET: relayerFeePayer,
    VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL: "https://example.invalid",
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY: operatorAuthority,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_RECENT_BLOCKHASH: "11111111111111111111111111111111",
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET: nullifierSet,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE: outputQueue,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE: poolState,
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID: programId,
  },
});
assert.equal(jsonResult.status, 0, jsonResult.stderr || jsonResult.stdout);
const json = JSON.parse(jsonResult.stdout);
assert.equal(json.accountCount, 4);
assert.equal(json.operatorAuthority, operatorAuthority);

assert.equal(
  packageJson.scripts["private-pool-v2:solana-spend-transaction"],
  "node scripts/print-vanta-private-pool-v2-solana-spend-transaction.mjs",
);
assert.equal(
  packageJson.scripts["private-pool-v2:solana-spend-transaction-check"],
  "node scripts/check-vanta-private-pool-v2-solana-spend-transaction-printer.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run private-pool-v2:solana-spend-transaction-check"),
  "mainnet:preflight must include the spend transaction printer check.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes("npm run private-pool-v2:solana-spend-transaction-check"),
  "private-pool-v2:verify must include the spend transaction printer check.",
);

console.log("Vanta Private Pool v2 Solana spend transaction printer check: PASS");
