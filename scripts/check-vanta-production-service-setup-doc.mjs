import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const docPath = resolve(repoRoot, "docs/production-private-pool-v2-service-setup.md");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(docPath), "Missing docs/production-private-pool-v2-service-setup.md.");

const source = readFileSync(docPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const requiredPhrases = [
  "# Production Private Pool v2 Service Setup",
  "Current Render inventory",
  "William's workspace",
  "tea-d7j37af7f7vs739ii8rg",
  "Do not continue Render provider work while the selected workspace is empty or different",
  "npm run mainnet:render-workspace-check",
  "vanta-staging-private-pool-v2",
  "https://vanta-staging-private-pool-v2.onrender.com",
  "https://vanta-0wwi.onrender.com",
  "vanta-prod-private-pool-v2-indexer",
  "https://vanta-prod-private-pool-v2-indexer.onrender.com",
  "vanta-prod-private-pool-v2-prover",
  "https://vanta-prod-private-pool-v2-prover.onrender.com",
  "vanta-prod-private-pool-v2-relayer",
  "https://vanta-prod-private-pool-v2-relayer.onrender.com",
  "vanta-prod-private-pool-v2-verifier",
  "https://vanta-prod-private-pool-v2-verifier.onrender.com",
  "vanta-prod-private-pool-v2-operator",
  "https://vanta-prod-private-pool-v2-operator.onrender.com",
  "The production indexer, prover, relayer, verifier, and operator services have live public health evidence, authenticated no-real-funds smoke evidence",
  "The production network still needs backup/restore evidence",
  "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services",
  "npm run private-pool-v2:service-network-check",
  "npm run private-pool-v2:role-storage-check",
  "postgres-jsonb-snapshot-store",
  "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY",
  "output-record PDA eight-account spend ABI",
  "SOLANA_RPC_URL",
  "VANTA_MAINNET_TOKEN_MINT",
  "VANTA_MAINNET_VAULT_OWNER",
  "VANTA_MAINNET_VAULT_SIGNER_SECRET_KEY",
  "/health/sol-unshield",
  "A green `/health` only proves the Private Pool v2 wrapper is alive",
  "operator/private-pool-v2-service-network.mjs",
  "npm run mainnet:role-service-replay-status",
  "npm run mainnet:role-service-replay-evidence-check",
  "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
  "ops/mainnet/private-pool-v2-production-smoke.template.json",
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "ops/mainnet/mainnet-approval-gates.template.json",
  "npm run mainnet:private-pool-v2-production-smoke-check",
  "npm run mainnet:production-smoke-evidence-check",
  "npm run mainnet:approval-gates-check",
  "npm run mainnet:preflight",
  "secret-manager-backed refs only",
  "real funds are not approved",
  "mainnetReady: false",
  "productionReady: false",
];

for (const phrase of requiredPhrases) {
  assert.ok(source.includes(phrase), `Production service setup doc is missing required phrase: ${phrase}`);
}

for (const forbidden of [
  "PRIVATE_KEY=",
  "SEED_PHRASE=",
  "MNEMONIC=",
  "DATABASE_URL=postgres://",
  "Bearer ",
  "sk_live_",
  "raw service token",
]) {
  assert.ok(!source.includes(forbidden), `Production service setup doc must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-service-setup-check"],
  "node scripts/check-vanta-production-service-setup-doc.mjs",
  "package.json must expose mainnet:production-service-setup-check.",
);

assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-service-setup-check"),
  "mainnet:preflight must include the production service setup doc check.",
);

assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run private-pool-v2:role-storage-check"),
  "mainnet:preflight must include the Private Pool v2 role storage check.",
);

console.log("Vanta production service setup doc check: PASS");
