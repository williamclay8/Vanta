import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const runbookPath = resolve(repoRoot, "docs/production-db-refs-runbook.md");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(runbookPath), "Missing docs/production-db-refs-runbook.md.");

const source = readFileSync(runbookPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

for (const phrase of [
  "# Production DB Refs Runbook",
  "Do not paste raw database URLs into chat or git",
  "VANTA_PAY_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL",
  "VANTA_STRATEGY_DATABASE_URL",
  "VANTA_OPERATOR_DATABASE_URL",
  "Render Postgres",
  "Doppler",
  "ops/storage/postgres/001_vanta_mainnet_storage.sql",
  "npm run mainnet:storage-migration-check",
  "npm run mainnet:backup-restore-check",
  "ops/mainnet/production-restore-drill.evidence.json",
  "npm run mainnet:production-restore-drill-evidence-check",
  "npm run mainnet:production-restore-drill-readback",
  "npm run mainnet:secret-handling-check",
  "npm run mainnet:preflight",
  "mainnetReady: false",
  "productionReady: false",
]) {
  assert.ok(source.includes(phrase), `Production DB refs runbook missing required phrase: ${phrase}`);
}

for (const forbidden of [
  "postgres://",
  "postgresql://",
  "password",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "Bearer ",
]) {
  assert.ok(!source.includes(forbidden), `Production DB refs runbook must not include ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-db-refs-check"],
  "node scripts/check-vanta-production-db-refs-runbook.mjs",
  "package.json must expose mainnet:production-db-refs-check.",
);

assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-db-refs-check"),
  "mainnet:preflight must include the production DB refs runbook check.",
);

console.log("Vanta production DB refs runbook check: PASS");
