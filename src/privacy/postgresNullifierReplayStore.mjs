import { createPostgresPoolOptions } from "../storage/vantaPostgresSnapshotStore.mjs";

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta durable nullifier store requires ${fieldName}.`);
  }

  return value.trim();
}

function normalizeSlot(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

async function defaultClientFromDatabaseUrl(databaseUrl) {
  const { Pool } = await import("pg");
  return new Pool(createPostgresPoolOptions(databaseUrl));
}

function normalizeRow(row) {
  if (!row) {
    return null;
  }

  return {
    assetId: row.asset_id,
    claimReceiptId: row.claim_receipt_id ?? null,
    context: row.context,
    nullifier: row.nullifier,
    requestId: row.request_id,
    spentAtSlot: row.spent_at_slot === null || row.spent_at_slot === undefined ? null : String(row.spent_at_slot),
    status: row.status,
  };
}

export async function createPostgresNullifierReplayStoreFromDatabaseUrl({
  databaseUrl,
  tableName = "pool_nullifiers",
} = {}) {
  if (!databaseUrl) {
    throw new Error("Vanta durable nullifier store requires databaseUrl.");
  }

  return createPostgresNullifierReplayStore({
    client: await defaultClientFromDatabaseUrl(databaseUrl),
    tableName,
  });
}

export function createPostgresNullifierReplayStore({ client, tableName = "pool_nullifiers" } = {}) {
  if (!client?.query) {
    throw new Error("Vanta durable nullifier store requires a Postgres client.");
  }

  async function ensureTable(db = client) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        nullifier TEXT NOT NULL PRIMARY KEY,
        context TEXT NOT NULL,
        request_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        spent_at_slot BIGINT,
        claim_receipt_id TEXT,
        status TEXT NOT NULL DEFAULT 'reserved',
        reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_context_nullifier
        ON ${tableName} (context, nullifier)
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_context_request
        ON ${tableName} (context, request_id)
    `);
  }

  async function withTransaction(action) {
    await ensureTable();
    const session = typeof client.connect === "function" ? await client.connect() : client;

    try {
      await session.query("BEGIN");
      const result = await action(session);
      await session.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await session.query("ROLLBACK");
      } catch {
        // Preserve the original failure; rollback errors are secondary cleanup failures.
      }
      throw error;
    } finally {
      session.release?.();
    }
  }

  async function findByGlobalNullifier({ nullifier }, db = client, { ensure = true } = {}) {
    if (ensure) {
      await ensureTable(db);
    }

    const result = await db.query(
      `
        SELECT context, nullifier, request_id, asset_id, spent_at_slot, claim_receipt_id, status
        FROM ${tableName}
        WHERE nullifier = $1
        LIMIT 1
      `,
      [nullifier],
    );

    return normalizeRow(result.rows[0]);
  }

  async function findByRequest({ context, requestId }, db = client, { ensure = true } = {}) {
    if (ensure) {
      await ensureTable(db);
    }

    const result = await db.query(
      `
        SELECT context, nullifier, request_id, asset_id, spent_at_slot, claim_receipt_id, status
        FROM ${tableName}
        WHERE context = $1 AND request_id = $2
        LIMIT 1
      `,
      [context, requestId],
    );

    return normalizeRow(result.rows[0]);
  }

  async function updateAccepted({
    claimReceiptId,
    context,
    nullifier,
    requestId,
  }, db = client) {
    const result = await db.query(
      `
        UPDATE ${tableName}
        SET claim_receipt_id = $4, status = 'accepted'
        WHERE context = $1 AND nullifier = $2 AND request_id = $3
        RETURNING context, nullifier, request_id, asset_id, spent_at_slot, claim_receipt_id, status
      `,
      [context, nullifier, requestId, claimReceiptId],
    );

    return normalizeRow(result.rows[0]);
  }

  return {
    kind: "postgres-nullifier-replay-store",
    productionReady: false,
    reservationMode: "postgres-transactional-insert-on-conflict",
    storageMode: "postgres-unique-index",
    uniquenessScope: "global-nullifier-plus-context-request-id",

    async check({ context: rawContext, nullifier: rawNullifier, requestId: rawRequestId }) {
      const context = requireText(rawContext, "context");
      const nullifier = requireText(rawNullifier, "nullifier");
      const requestId = requireText(rawRequestId, "requestId");
      const existing = await findByGlobalNullifier({ nullifier });

      if (existing?.context === context && existing?.requestId === requestId) {
        return {
          accepted: true,
          idempotent: true,
          mutated: false,
          reason: "idempotent-durable-nullifier-reservation",
          record: existing,
          replay: false,
        };
      }

      if (existing) {
        return {
          accepted: false,
          existing,
          mutated: false,
          reason: "conflicting-durable-nullifier-replay",
          replay: true,
        };
      }

      return {
        accepted: true,
        idempotent: false,
        mutated: false,
        reason: "durable-nullifier-available",
        replay: false,
      };
    },

    async reserve({
      assetId: rawAssetId = "unknown",
      claimReceiptId = null,
      context: rawContext,
      nullifier: rawNullifier,
      requestId: rawRequestId,
      spentAtSlot = null,
    }) {
      const assetId = requireText(rawAssetId, "assetId");
      const context = requireText(rawContext, "context");
      const nullifier = requireText(rawNullifier, "nullifier");
      const requestId = requireText(rawRequestId, "requestId");

      return await withTransaction(async (db) => {
        const insert = await db.query(
          `
            INSERT INTO ${tableName} (
              context,
              nullifier,
              request_id,
              asset_id,
              spent_at_slot,
              claim_receipt_id,
              status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'reserved')
            ON CONFLICT DO NOTHING
            RETURNING context, nullifier, request_id, asset_id, spent_at_slot, claim_receipt_id, status
          `,
          [context, nullifier, requestId, assetId, normalizeSlot(spentAtSlot), claimReceiptId],
        );

        const inserted = normalizeRow(insert.rows[0]);
        if (inserted) {
          return {
            accepted: true,
            idempotent: false,
            reason: "durable-nullifier-reserved",
            record: inserted,
            replay: false,
          };
        }

        const existingNullifier = await findByGlobalNullifier({ nullifier }, db, { ensure: false });
        if (existingNullifier?.context === context && existingNullifier?.requestId === requestId) {
          return {
            accepted: true,
            idempotent: true,
            reason: "idempotent-durable-nullifier-reservation",
            record: existingNullifier,
            replay: false,
          };
        }

        if (existingNullifier) {
          return {
            accepted: false,
            existing: existingNullifier,
            reason: "conflicting-durable-nullifier-replay",
            replay: true,
          };
        }

        const existingRequest = await findByRequest({ context, requestId }, db, { ensure: false });
        return {
          accepted: false,
          existing: existingRequest,
          reason: "conflicting-durable-request-replay",
          replay: true,
        };
      });
    },

    async markAccepted({
      claimReceiptId: rawClaimReceiptId,
      context: rawContext,
      nullifier: rawNullifier,
      requestId: rawRequestId,
    }) {
      const claimReceiptId = requireText(rawClaimReceiptId, "claimReceiptId");
      const context = requireText(rawContext, "context");
      const nullifier = requireText(rawNullifier, "nullifier");
      const requestId = requireText(rawRequestId, "requestId");
      const updated = await withTransaction(async (db) =>
        updateAccepted(
          {
            claimReceiptId,
            context,
            nullifier,
            requestId,
          },
          db,
        ),
      );

      if (!updated) {
        throw new Error(
          `Vanta durable nullifier store cannot accept missing reservation for ${context}:${nullifier}.`,
        );
      }

      return {
        accepted: true,
        reason: "durable-nullifier-acceptance-recorded",
        record: updated,
      };
    },

    async snapshot() {
      await ensureTable();
      const result = await client.query(`
        SELECT context, nullifier, request_id, asset_id, spent_at_slot, claim_receipt_id, status
        FROM ${tableName}
        ORDER BY created_at ASC
      `);

      return result.rows.map((row) => normalizeRow(row));
    },
  };
}
