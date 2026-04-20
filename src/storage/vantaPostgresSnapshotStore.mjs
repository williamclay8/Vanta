function normalizeJsonValue(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeJsonValue(nestedValue)]),
    );
  }

  return value;
}

function normalizeSnapshot(snapshot, stateVersion) {
  return normalizeJsonValue({
    ...snapshot,
    stateVersion: snapshot?.stateVersion ?? stateVersion,
    updatedAt: new Date().toISOString(),
  });
}

async function defaultClientFromDatabaseUrl(databaseUrl) {
  const { Pool } = await import("pg");
  const pool = new Pool(createPostgresPoolOptions(databaseUrl));

  return pool;
}

export function createPostgresPoolOptions(databaseUrl) {
  return {
    connectionString: databaseUrl,
    connectionTimeoutMillis: Number(process.env.VANTA_POSTGRES_CONNECTION_TIMEOUT_MS ?? "5000"),
    idleTimeoutMillis: Number(process.env.VANTA_POSTGRES_IDLE_TIMEOUT_MS ?? "10000"),
    max: Number(process.env.VANTA_POSTGRES_POOL_MAX ?? "1"),
    ssl:
      process.env.VANTA_POSTGRES_SSL === "disable"
        ? false
        : {
            rejectUnauthorized: false,
          },
  };
}

export async function createPostgresSnapshotStore({
  client,
  databaseUrl,
  defaultSnapshot,
  stateVersion,
  storeKey,
  tableName = "vanta_operator_snapshots",
}) {
  const resolvedClient = client ?? (await defaultClientFromDatabaseUrl(databaseUrl));

  async function ensureTable() {
    await resolvedClient.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        store_key text PRIMARY KEY,
        snapshot jsonb NOT NULL,
        state_version integer NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  return {
    kind: "postgres-jsonb-snapshot-store",
    path: null,
    productionReady: false,

    async load() {
      await ensureTable();
      const result = await resolvedClient.query(
        `SELECT snapshot, state_version FROM ${tableName} WHERE store_key = $1`,
        [storeKey],
      );

      if (!result.rows[0]) {
        return defaultSnapshot;
      }

      return result.rows[0].snapshot;
    },

    async save(snapshot) {
      await ensureTable();
      const payload = normalizeSnapshot(snapshot, stateVersion);
      await resolvedClient.query(
        `
          INSERT INTO ${tableName} (store_key, snapshot, state_version, updated_at)
          VALUES ($1, $2::jsonb, $3, now())
          ON CONFLICT (store_key)
          DO UPDATE SET
            snapshot = EXCLUDED.snapshot,
            state_version = EXCLUDED.state_version,
            updated_at = now()
        `,
        [storeKey, JSON.stringify(payload), payload.stateVersion ?? stateVersion],
      );
    },

    async close() {
      if (typeof resolvedClient.end === "function") {
        await resolvedClient.end();
      }
    },
  };
}
