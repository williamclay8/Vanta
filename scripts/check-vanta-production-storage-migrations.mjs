import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaProductionStorageContract } from "../src/readiness/productionStorageContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const migrationPath = resolve(repoRoot, "ops/storage/postgres/001_vanta_mainnet_storage.sql");

assert.ok(existsSync(migrationPath), "Missing production storage migration: ops/storage/postgres/001_vanta_mainnet_storage.sql");

const source = readFileSync(migrationPath, "utf8");
const contract = createVantaProductionStorageContract();

const requiredPhrases = [
  "CREATE TABLE IF NOT EXISTS schema_versions",
  "CREATE TABLE IF NOT EXISTS pay_merchants",
  "CREATE TABLE IF NOT EXISTS pay_checkout_sessions",
  "CREATE TABLE IF NOT EXISTS pay_payments",
  "CREATE TABLE IF NOT EXISTS pay_receipts",
  "CREATE TABLE IF NOT EXISTS pay_withdrawals",
  "CREATE TABLE IF NOT EXISTS pay_webhook_endpoints",
  "CREATE TABLE IF NOT EXISTS pay_webhook_deliveries",
  "CREATE TABLE IF NOT EXISTS pay_idempotency_keys",
  "CREATE TABLE IF NOT EXISTS pool_commitments",
  "CREATE TABLE IF NOT EXISTS pool_roots",
  "CREATE TABLE IF NOT EXISTS pool_nullifiers",
  "CREATE TABLE IF NOT EXISTS pool_proof_requests",
  "CREATE TABLE IF NOT EXISTS pool_proof_receipts",
  "CREATE TABLE IF NOT EXISTS pool_settlement_submissions",
  "CREATE TABLE IF NOT EXISTS pool_operator_events",
  "CREATE TABLE IF NOT EXISTS strategies",
  "CREATE TABLE IF NOT EXISTS strategy_child_orders",
  "CREATE TABLE IF NOT EXISTS strategy_fills",
  "CREATE TABLE IF NOT EXISTS operator_service_instances",
  "CREATE TABLE IF NOT EXISTS operator_deployment_locks",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_commitments_commitment",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_nullifiers_nullifier",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_nullifiers_context_nullifier",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_nullifiers_context_request",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_idempotency_keys_scope_key",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_receipts_payment_id",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_strategy_child_orders_strategy_sequence",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_deployment_locks_lock_name",
  "DO NOT STORE SECRET VALUES",
  "FORWARD ONLY MIGRATION",
];

for (const phrase of requiredPhrases) {
  assert.ok(source.includes(phrase), `Production storage migration is missing required phrase: ${phrase}`);
}

for (const store of contract.stores) {
  for (const migration of store.requiredMigrations) {
    assert.ok(
      source.includes(migration),
      `Production storage migration is missing contract migration marker: ${migration}`,
    );
  }
}

assert.ok(
  /CREATE TABLE IF NOT EXISTS pool_nullifiers[\s\S]+nullifier TEXT NOT NULL/.test(source),
  "pool_nullifiers must store nullifier as non-null text.",
);
assert.ok(
  /CREATE TABLE IF NOT EXISTS pool_nullifiers[\s\S]+context TEXT NOT NULL/.test(source),
  "pool_nullifiers must store replay context as non-null text.",
);
assert.ok(
  /CREATE TABLE IF NOT EXISTS pool_nullifiers[\s\S]+request_id TEXT NOT NULL/.test(source),
  "pool_nullifiers must store idempotent request id as non-null text.",
);
assert.ok(
  /CREATE TABLE IF NOT EXISTS pay_webhook_deliveries[\s\S]+next_attempt_at TIMESTAMPTZ/.test(source),
  "pay_webhook_deliveries must support retry scheduling.",
);

console.log("Vanta production storage migration check: PASS");
