import { randomUUID } from "node:crypto";
import { createPostgresPoolOptions } from "../storage/vantaPostgresSnapshotStore.mjs";
import { sanitizeTelemetryFields } from "./vantaSafeTelemetry.mjs";

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta operator event sink requires ${fieldName}.`);
  }

  return value.trim();
}

async function defaultClientFromDatabaseUrl(databaseUrl) {
  const { Pool } = await import("pg");
  return new Pool(createPostgresPoolOptions(databaseUrl));
}

export function createNoopOperatorEventSink({ service = "unknown" } = {}) {
  return {
    kind: "noop-operator-event-sink",
    productionReady: false,
    service,
    async append() {
      return null;
    },
  };
}

export async function createPostgresOperatorEventSinkFromDatabaseUrl({
  databaseUrl,
  service,
  tableName = "pool_operator_events",
} = {}) {
  if (!databaseUrl) {
    throw new Error("Vanta operator event sink requires databaseUrl.");
  }

  return createPostgresOperatorEventSink({
    client: await defaultClientFromDatabaseUrl(databaseUrl),
    service,
    tableName,
  });
}

export function createPostgresOperatorEventSink({
  client,
  service = "unknown",
  tableName = "pool_operator_events",
} = {}) {
  if (!client?.query) {
    throw new Error("Vanta operator event sink requires a Postgres client.");
  }

  async function ensureTable() {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        event_ref TEXT NOT NULL,
        severity TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  return {
    kind: "postgres-operator-event-sink",
    productionReady: false,
    service,
    tableName,

    async append({
      eventRef,
      eventType,
      payload = {},
      severity = "info",
    } = {}) {
      await ensureTable();

      const record = {
        eventId: randomUUID(),
        eventRef: requireText(eventRef, "eventRef"),
        eventType: requireText(eventType, "eventType"),
        payload: sanitizeTelemetryFields(payload),
        severity: requireText(severity, "severity"),
      };

      await client.query(
        `
          INSERT INTO ${tableName} (
            event_id,
            event_type,
            event_ref,
            severity,
            payload
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          record.eventId,
          record.eventType,
          record.eventRef,
          record.severity,
          JSON.stringify(record.payload),
        ],
      );

      return record;
    },
  };
}
