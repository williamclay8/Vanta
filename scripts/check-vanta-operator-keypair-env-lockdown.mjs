import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function listFiles(dir) {
  const root = resolve(repoRoot, dir);
  const files = [];

  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listFiles(relative(repoRoot, fullPath)));
    } else if (entry.endsWith(".mjs") || entry.endsWith(".js")) {
      files.push(relative(repoRoot, fullPath));
    }
  }

  return files.sort();
}

const operatorFiles = listFiles("operator");
const keypairLoaderPattern = /\b(?:Keypair\.fromSecretKey|loadKeypairFromEnv)\b/;
const rawKeypairEnvPattern =
  /process\.env\.([A-Z0-9_]*(?:KEYPAIR|PRIVATE_KEY|SIGNER_SECRET_KEY)[A-Z0-9_]*)/g;
const allowedKeypairLoaderFiles = new Set([
  "operator/jupiter-sol-to-shielded-route-adapter.mjs",
]);

function assertNoSolanaKeypairLoader(label, source) {
  assert.doesNotMatch(
    source,
    keypairLoaderPattern,
    `${label} must not load Solana keypair material.`,
  );
  assert.doesNotMatch(
    source,
    rawKeypairEnvPattern,
    `${label} must not read raw keypair/private-key env names.`,
  );
}

const payServerSource = readRepoFile("operator/pay-server.mjs");
assert.match(
  payServerSource,
  /VANTA_PAY_SECRET_KEY/,
  "Pay may keep its service-auth secret contract, but it must not become a wallet/keypair loader.",
);
assertNoSolanaKeypairLoader("Pay server", payServerSource);

const swapAuthSource = readRepoFile("operator/swap-auth.mjs");
assertNoSolanaKeypairLoader("Swap auth", swapAuthSource);
assert.doesNotMatch(
  swapAuthSource,
  /process\.env/,
  "Swap auth must remain wallet-signature based and not grow env secret handling.",
);

const jupiterAdapterSource = readRepoFile("operator/jupiter-sol-to-shielded-route-adapter.mjs");
for (const phrase of [
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_PATH",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
  "assertLiquiditySignerPolicy",
  "raw-keypair-local-only",
  "wrapped-external-signer",
  "NODE_ENV === \"production\"",
  "raw liquidity keypairs are local-only",
  "liquiditySignerPolicyReady",
  "liquiditySignerWrapped",
]) {
  assert.ok(
    jupiterAdapterSource.includes(phrase),
    `Jupiter SOL-to-shielded adapter missing raw-keypair lockdown marker: ${phrase}`,
  );
}
assert.ok(
  jupiterAdapterSource.indexOf("assertLiquiditySignerPolicy();") <
    jupiterAdapterSource.indexOf("return parseJsonKeypair(liquidityKeypairJson);"),
  "Jupiter adapter must enforce the production raw-keypair policy before parsing env keypair JSON.",
);

const unshieldServerSource = readRepoFile("operator/unshield-server.mjs");
assertNoSolanaKeypairLoader("Unshield operator", unshieldServerSource);
for (const phrase of [
  "buildTagUnshieldProgramReleaseReceipt",
  "program-tag-unshield-pda-cpi-fail-closed",
  "TAG_UNSHIELD",
]) {
  assert.ok(
    unshieldServerSource.includes(phrase),
    `Unshield operator must preserve fail-closed TAG_UNSHIELD relay marker: ${phrase}`,
  );
}
const trackerState = readRepoFile(
  "docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml",
);
for (const phrase of [
  "A2-OPERATOR-KEYPAIR-CUSTODY",
  "operator-keypair",
]) {
  assert.ok(
    trackerState.includes(phrase),
    `Unshield keypair custody history must remain tracked for A2 audit continuity: ${phrase}`,
  );
}

const unexpectedKeypairLoaderFiles = [];
for (const file of operatorFiles) {
  const source = readRepoFile(file);
  const hasKeypairLoader = keypairLoaderPattern.test(source);
  const rawEnvMatches = [...source.matchAll(rawKeypairEnvPattern)].map((match) => match[1]);
  const hasRawKeypairEnv = rawEnvMatches.length > 0;

  if ((hasKeypairLoader || hasRawKeypairEnv) && !allowedKeypairLoaderFiles.has(file)) {
    unexpectedKeypairLoaderFiles.push({
      file,
      rawEnvNames: rawEnvMatches,
      usesKeypairLoader: hasKeypairLoader,
    });
  }
}

assert.deepEqual(
  unexpectedKeypairLoaderFiles,
  [],
  "Only the Jupiter local-only signer exception may load operator keypair material.",
);

const rebalanceOperatorFiles = operatorFiles.filter((file) => {
  const source = readRepoFile(file);
  return /rebalance/i.test(file) || /rebalance/i.test(source);
});

for (const file of rebalanceOperatorFiles) {
  const source = readRepoFile(file);
  assertNoSolanaKeypairLoader(`Rebalance-related operator file ${file}`, source);
}

console.log("Vanta operator keypair env lockdown check: PASS");
