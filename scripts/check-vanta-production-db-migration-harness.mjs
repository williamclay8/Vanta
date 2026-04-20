import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const harnessPath = resolve(repoRoot, "scripts/apply-vanta-production-postgres-migration.mjs");
const runbookPath = resolve(repoRoot, "docs/production-db-refs-runbook.md");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(
  existsSync(harnessPath),
  "Missing scripts/apply-vanta-production-postgres-migration.mjs.",
);

const harness = readFileSync(harnessPath, "utf8");
const runbook = readFileSync(runbookPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

for (const phrase of [
  "VANTA_ALLOW_PRODUCTION_DB_MIGRATION",
  "VANTA_PRODUCTION_DB_TARGET",
  "DATABASE_URL",
  "ops/storage/postgres/001_vanta_mainnet_storage.sql",
  "schema_versions",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "createHash",
  "DRY RUN",
  "refuses to print raw database URLs",
]) {
  assert.ok(harness.includes(phrase), `Migration harness missing required phrase: ${phrase}`);
}

for (const forbidden of [
  "console.log(process.env.DATABASE_URL",
  "console.error(process.env.DATABASE_URL",
  "postgres://",
  "postgresql://",
]) {
  assert.ok(!harness.includes(forbidden), `Migration harness must not include ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-db-migration-dry-run"],
  "node scripts/apply-vanta-production-postgres-migration.mjs --dry-run",
  "package.json must expose mainnet:production-db-migration-dry-run.",
);

assert.equal(
  packageJson.scripts["mainnet:production-db-migration-apply"],
  "node scripts/apply-vanta-production-postgres-migration.mjs --apply",
  "package.json must expose mainnet:production-db-migration-apply.",
);

assert.ok(
  !packageJson.scripts["mainnet:preflight"].includes("mainnet:production-db-migration-apply"),
  "mainnet:preflight must not run the production migration apply command.",
);

for (const phrase of [
  "npm run mainnet:production-db-migration-dry-run",
  "npm run mainnet:production-db-migration-apply",
  "doppler run",
  "DATABASE_URL=\"$VANTA_PAY_DATABASE_URL\"",
  "VANTA_PAY_DATABASE_URL_REF",
  "VANTA_ALLOW_PRODUCTION_DB_MIGRATION",
  "VANTA_PRODUCTION_DB_TARGET",
  "Do not paste raw database URLs into chat or git",
]) {
  assert.ok(runbook.includes(phrase), `Production DB refs runbook missing migration harness phrase: ${phrase}`);
}

console.log("Vanta production DB migration harness check: PASS");
