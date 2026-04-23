import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createNoopOperatorEventSink,
  createPostgresOperatorEventSink,
} from "../src/ops/vantaOperatorEventSink.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const queries = [];
const client = {
  async query(sql, params = []) {
    queries.push({ params, sql: String(sql) });
    return { rows: [] };
  },
};

const sink = createPostgresOperatorEventSink({
  client,
  service: "vanta-private-pool-v2",
});

assert.equal(sink.kind, "postgres-operator-event-sink");
assert.equal(sink.productionReady, false);
assert.equal(sink.service, "vanta-private-pool-v2");
assert.equal(sink.tableName, "pool_operator_events");

const noopSink = createNoopOperatorEventSink({ service: "vanta-pay" });
assert.equal(noopSink.kind, "noop-operator-event-sink");
assert.equal(noopSink.productionReady, false);
assert.equal(await noopSink.append({ eventRef: "noop", eventType: "ignored" }), null);

const record = await sink.append({
  eventRef: "req_123:/v1/status",
  eventType: "auth_rejected",
  payload: {
    authorization: "Bearer raw-secret-token",
    method: "GET",
    path: "/v1/status",
    secretKey: "sk_live_should_not_survive",
  },
  severity: "warning",
});

assert.ok(record.eventId, "Operator event sink must create an event id.");
assert.equal(record.eventRef, "req_123:/v1/status");
assert.equal(record.eventType, "auth_rejected");
assert.equal(record.severity, "warning");
assert.equal(record.payload.authorization, "[redacted]");
assert.equal(record.payload.secretKey, "[redacted]");
assert.equal(record.payload.path, "/v1/status");

assert.equal(queries.length, 2, "Operator event sink must ensure table then insert.");
assert.ok(queries[0].sql.includes("CREATE TABLE IF NOT EXISTS pool_operator_events"));
assert.ok(queries[1].sql.includes("INSERT INTO pool_operator_events"));
assert.equal(typeof queries[1].params[4], "string");

const insertedPayload = JSON.parse(queries[1].params[4]);
assert.equal(insertedPayload.authorization, "[redacted]");
assert.equal(insertedPayload.secretKey, "[redacted]");
assert.equal(insertedPayload.method, "GET");

const payServerSource = readFileSync(resolve(repoRoot, "operator/pay-server.mjs"), "utf8");
const privatePoolServerSource = readFileSync(resolve(repoRoot, "operator/private-pool-v2-server.mjs"), "utf8");

for (const [label, source] of [
  ["pay", payServerSource],
  ["private-pool-v2", privatePoolServerSource],
]) {
  assert.ok(source.includes("createPostgresOperatorEventSinkFromDatabaseUrl"), `${label} server must wire the Postgres operator event sink.`);
  assert.ok(source.includes('eventType: "operator_started"'), `${label} server must emit operator_started events.`);
  assert.ok(source.includes('eventType: "auth_rejected"'), `${label} server must emit auth_rejected events.`);
  assert.ok(source.includes('eventType: "rate_limit_rejected"'), `${label} server must emit rate_limit_rejected events.`);
  assert.ok(source.includes("auditEventSinkKind"), `${label} server status must expose auditEventSinkKind.`);
}

console.log("Vanta operator event sink check: PASS");
