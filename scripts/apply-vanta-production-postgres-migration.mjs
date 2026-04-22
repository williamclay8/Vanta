import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import pg from "pg";

const repoRoot = resolve(import.meta.dirname, "..");
const migrationRelativePath = "ops/storage/postgres/001_vanta_mainnet_storage.sql";
const migrationPath = resolve(repoRoot, migrationRelativePath);
const migrationSql = readFileSync(migrationPath, "utf8");
const migrationName = basename(migrationPath);
const migrationChecksum = createHash("sha256").update(migrationSql).digest("hex");

const args = new Set(process.argv.slice(2));
const applyRequested = args.has("--apply");
const dryRunRequested = args.has("--dry-run") || !applyRequested;

const target = process.env.VANTA_PRODUCTION_DB_TARGET ?? "vanta-mainnet-storage";
const databaseUrl = process.env.DATABASE_URL;

function logPlan() {
  console.log("Vanta production Postgres migration harness");
  console.log(`Mode: ${dryRunRequested ? "DRY RUN" : "APPLY"}`);
  console.log(`Target ref: ${target}`);
  console.log(`Migration: ${migrationRelativePath}`);
  console.log(`Migration name: ${migrationName}`);
  console.log(`Checksum: ${migrationChecksum}`);
  console.log("Safety: refuses to print raw database URLs.");
}

function requireApplySafety() {
  if (process.env.VANTA_ALLOW_PRODUCTION_DB_MIGRATION !== "true") {
    throw new Error(
      "Refusing production DB migration apply without VANTA_ALLOW_PRODUCTION_DB_MIGRATION=true.",
    );
  }

  if (!databaseUrl) {
    throw new Error("Refusing production DB migration apply without DATABASE_URL in the environment.");
  }
}

async function applyMigration() {
  requireApplySafety();

  const client = new pg.Client({
    connectionString: databaseUrl,
    application_name: "vanta-production-migration-harness",
    ssl:
      process.env.VANTA_POSTGRES_SSL === "disable"
        ? false
        : {
            rejectUnauthorized: false,
          },
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(migrationSql);

    const existing = await client.query(
      "SELECT checksum FROM schema_versions WHERE store_id = $1 AND version = $2",
      [target, "001"],
    );

    if (existing.rowCount > 0) {
      const [row] = existing.rows;
      if (row.checksum !== migrationChecksum) {
        throw new Error(
          "Existing schema_versions checksum does not match this migration. Refusing to overwrite forward-only migration evidence.",
        );
      }
    } else {
      await client.query(
        `INSERT INTO schema_versions (store_id, version, migration_name, checksum)
         VALUES ($1, $2, $3, $4)`,
        [target, "001", migrationName, migrationChecksum],
      );
    }

    await client.query("COMMIT");
    console.log("Vanta production Postgres migration apply: PASS");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

logPlan();

if (dryRunRequested) {
  console.log("Vanta production Postgres migration dry run: PASS");
} else {
  await applyMigration();
}
