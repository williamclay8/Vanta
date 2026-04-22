import { strict as assert } from "node:assert";
import pg from "pg";

const targetRef = process.env.VANTA_RESTORE_DRILL_TARGET_REF ?? "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF";
const databaseUrl = process.env.DATABASE_URL ?? process.env.VANTA_RESTORE_DRILL_DATABASE_URL;
const expectedChecksum = "98dd86ab93574d38770535efdd90e6ab1eb6e0359071191e26693f0ba6a5a3d3";

const privatePoolTables = [
  "schema_versions",
  "pool_commitments",
  "pool_roots",
  "pool_nullifiers",
  "pool_proof_requests",
  "pool_proof_receipts",
  "pool_settlement_submissions",
  "pool_operator_events",
  "vanta_private_pool_v2_role_snapshots",
];

const requiredIndexes = [
  "idx_pool_nullifiers_nullifier",
  "idx_pool_nullifiers_context_nullifier",
  "idx_pool_nullifiers_context_request",
  "idx_pool_settlement_submissions_submission_id",
  "idx_private_pool_v2_role_snapshots_store_key",
];

function requireSafeInput() {
  if (!databaseUrl) {
    throw new Error(
      "Restore drill readback requires DATABASE_URL or VANTA_RESTORE_DRILL_DATABASE_URL in the local shell. Do not paste it into chat or commit it.",
    );
  }

  if (!targetRef.endsWith("_REF")) {
    throw new Error("VANTA_RESTORE_DRILL_TARGET_REF must be a reference name ending in _REF.");
  }
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1`,
    [tableName],
  );

  return result.rowCount === 1;
}

async function indexExists(client, indexName) {
  const result = await client.query(
    `SELECT 1
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = $1`,
    [indexName],
  );

  return result.rowCount === 1;
}

async function schemaVersionSnapshot(client) {
  const result = await client.query(
    `SELECT store_id, version, migration_name, checksum
       FROM schema_versions
      ORDER BY store_id, version`,
  );

  return result.rows;
}

async function runReadback() {
  requireSafeInput();

  const client = new pg.Client({
    connectionString: databaseUrl,
    application_name: "vanta-production-restore-drill-readback",
    ssl:
      process.env.VANTA_POSTGRES_SSL === "disable"
        ? false
        : {
            rejectUnauthorized: false,
          },
  });

  await client.connect();

  try {
    for (const tableName of privatePoolTables) {
      assert.equal(await tableExists(client, tableName), true, `Missing restored table: ${tableName}.`);
    }

    const schemaVersion = await client.query(
      `SELECT migration_name, checksum
         FROM schema_versions
        WHERE store_id = $1
          AND version = $2`,
      [targetRef, "001"],
    );

    if (schemaVersion.rowCount !== 1) {
      const availableSchemaVersions = await schemaVersionSnapshot(client);
      console.error("Restore drill readback schema_versions mismatch.");
      console.error(`Expected target ref: ${targetRef}`);
      console.error(
        `Available schema version refs: ${
          availableSchemaVersions.length > 0
            ? availableSchemaVersions
                .map((row) => `${row.store_id}:${row.version}:${row.migration_name}`)
                .join(", ")
            : "none"
        }`,
      );
      console.error("Safety: no raw database URLs, credentials, or bearer values were printed.");
    }

    assert.equal(schemaVersion.rowCount, 1, `Missing restored schema_versions row for ${targetRef}.`);
    assert.equal(schemaVersion.rows[0].migration_name, "001_vanta_mainnet_storage.sql");
    assert.equal(schemaVersion.rows[0].checksum, expectedChecksum);

    for (const indexName of requiredIndexes) {
      assert.equal(await indexExists(client, indexName), true, `Missing restored index: ${indexName}.`);
    }

    console.log("Vanta production restore drill readback: PASS");
    console.log(`Target ref: ${targetRef}`);
    console.log("Safety: no raw database URLs, credentials, or bearer values were printed.");
  } finally {
    await client.end();
  }
}

await runReadback();
