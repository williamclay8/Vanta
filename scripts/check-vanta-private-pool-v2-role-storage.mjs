import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

import { createPrivatePoolV2RoleSnapshotStore } from "../src/storage/vantaPrivatePoolV2RoleSnapshotStore.mjs";

function createFakePostgresClient() {
  const rowsByKey = new Map();

  return {
    async query(sql, params = []) {
      if (sql.includes("CREATE TABLE")) {
        return { rows: [] };
      }

      if (sql.includes("SELECT snapshot")) {
        const row = rowsByKey.get(params[0]);
        return { rows: row ? [row] : [] };
      }

      if (sql.includes("INSERT INTO")) {
        rowsByKey.set(params[0], {
          snapshot: JSON.parse(params[1]),
          state_version: params[2],
        });
        return { rows: [] };
      }

      throw new Error(`Unexpected fake Postgres SQL: ${sql}`);
    },
  };
}

const tempRoot = mkdtempSync(resolve(".tmp/vanta-private-pool-v2-role-storage-"));

try {
  const disabledStore = await createPrivatePoolV2RoleSnapshotStore({
    role: "prover",
    runtimeEnvironment: "test",
  });
  assert.equal(disabledStore.kind, "disabled-snapshot-store");
  assert.equal(disabledStore.productionReady, false);
  assert.deepEqual(await disabledStore.load(), { proofs: [] });

  const jsonStore = await createPrivatePoolV2RoleSnapshotStore({
    role: "relayer",
    runtimeEnvironment: "test",
    storePath: join(tempRoot, "relayer.json"),
  });
  assert.equal(jsonStore.kind, "local-json-snapshot-store");
  await jsonStore.save({
    claims: [],
    quotes: [{ estimatedFeeBaseUnits: "1", expiresAtSlot: "2", relayerId: "relayer:test" }],
  });
  assert.deepEqual((await jsonStore.load()).quotes, [
    { estimatedFeeBaseUnits: "1", expiresAtSlot: "2", relayerId: "relayer:test" },
  ]);

  await assert.rejects(
    () =>
      createPrivatePoolV2RoleSnapshotStore({
        role: "indexer",
        runtimeEnvironment: "production",
        storePath: join(tempRoot, "indexer.json"),
      }),
    /Local JSON snapshot stores are not production storage/,
  );

  const postgresStore = await createPrivatePoolV2RoleSnapshotStore({
    client: createFakePostgresClient(),
    databaseUrl: "postgresql://vanta.invalid/private-pool-v2",
    role: "verifier",
    runtimeEnvironment: "production",
  });
  assert.equal(postgresStore.kind, "postgres-jsonb-snapshot-store");
  assert.equal(postgresStore.path, null);
  assert.equal(postgresStore.productionReady, false);

  await postgresStore.save({
    acceptedProofs: [{ publicInputCommitment: "0xabc", replayKey: "shield:0xabc" }],
  });
  assert.deepEqual((await postgresStore.load()).acceptedProofs, [
    { publicInputCommitment: "0xabc", replayKey: "shield:0xabc" },
  ]);

  await assert.rejects(
    () =>
      createPrivatePoolV2RoleSnapshotStore({
        databaseUrl: "postgresql://vanta.invalid/private-pool-v2",
        role: "unknown",
        runtimeEnvironment: "production",
      }),
    /Unknown Private Pool v2 role/,
  );

  console.log("Vanta Private Pool v2 role storage check: PASS");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
