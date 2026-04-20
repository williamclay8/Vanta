import { strict as assert } from "node:assert";
import { PassThrough } from "node:stream";
import {
  createOperatorStartupTelemetryEvent,
  createSafeTelemetryRequestContext,
  observeSafeTelemetryResponse,
  sanitizeTelemetryFields,
  writeSafeTelemetryEvent,
} from "../src/ops/vantaSafeTelemetry.mjs";

let now = 1_771_234_567_000;
const logs = [];
const request = new PassThrough();
request.method = "POST";
request.url =
  "/v1/checkout/sessions?authorization=Bearer%20secret&customer_email=buyer@example.com";
request.headers = {
  authorization: "Bearer sk_live_should_not_log",
  cookie: "session=secret",
  host: "api.vanta.test",
  "x-api-key": "secret_api_key",
  "x-request-id": "req-safe-telemetry",
};
request.socket = {
  remoteAddress: "203.0.113.42",
};

const response = new PassThrough();
response.statusCode = 200;
response.writeHead = (statusCode) => {
  response.statusCode = statusCode;
};
response.end = () => {};

const context = createSafeTelemetryRequestContext({
  now: () => now,
  request,
  service: "vanta-pay",
});

assert.equal(context.version, "vanta-safe-telemetry-0.1");
assert.equal(context.service, "vanta-pay");
assert.equal(context.method, "POST");
assert.equal(context.path, "/v1/checkout/sessions");
assert.equal(context.queryPresent, true);
assert.equal(context.requestId, "req-safe-telemetry");
assert.match(context.remoteAddressHash, /^sha256:[a-f0-9]{24}$/);
assert.ok(!JSON.stringify(context).includes("203.0.113.42"), "raw IP must not be logged.");
assert.ok(!JSON.stringify(context).includes("buyer@example.com"), "query values must not be logged.");
assert.ok(!JSON.stringify(context).includes("sk_live_should_not_log"), "auth must not be logged.");

observeSafeTelemetryResponse({
  context,
  logger: (event) => logs.push(event),
  now: () => now,
  response,
});

now += 37;
response.writeHead(202);
response.end("private body must not be logged");

assert.equal(logs.length, 1);
const loggedRequestEvent = JSON.parse(logs[0]);
assert.equal(loggedRequestEvent.event, "operator_http_request");
assert.equal(loggedRequestEvent.statusCode, 202);
assert.equal(loggedRequestEvent.durationMs, 37);
assert.equal(loggedRequestEvent.outcome, "ok");
assert.equal(loggedRequestEvent.path, "/v1/checkout/sessions");
assert.ok(!logs[0].includes("private body"), "response body must not be logged.");

const redacted = sanitizeTelemetryFields({
  authorization: "Bearer secret",
  databaseUrl: "postgres://secret",
  nested: {
    privateKey: "secret",
    safeValue: "visible",
  },
  token: "secret",
});
assert.equal(redacted.authorization, "[redacted]");
assert.equal(redacted.databaseUrl, "[redacted]");
assert.equal(redacted.nested.privateKey, "[redacted]");
assert.equal(redacted.nested.safeValue, "visible");
assert.equal(redacted.token, "[redacted]");

const startup = createOperatorStartupTelemetryEvent({
  service: "vanta-private-pool-v2",
  storageKind: "postgres-jsonb-snapshot-store",
});
assert.deepEqual(startup, {
  event: "operator_started",
  service: "vanta-private-pool-v2",
  storageKind: "postgres-jsonb-snapshot-store",
  version: "vanta-safe-telemetry-0.1",
});

const serializedEvents = [];
writeSafeTelemetryEvent({ ...startup, secret: "must-not-log" }, (line) => {
  serializedEvents.push(line);
});
assert.equal(serializedEvents.length, 1);
assert.ok(serializedEvents[0].startsWith("{"));
assert.ok(serializedEvents[0].includes("[redacted]"));
assert.ok(!serializedEvents[0].includes("must-not-log"));

console.log("Vanta safe telemetry check: PASS");
