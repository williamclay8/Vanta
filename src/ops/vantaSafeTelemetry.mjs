import { createHash, randomUUID } from "node:crypto";

const VERSION = "vanta-safe-telemetry-0.1";
const REDACTED = "[redacted]";
const secretKeyPattern =
  /(authorization|cookie|set-cookie|api[-_]?key|token|secret|password|private[-_]?key|seed[-_]?phrase|mnemonic|database[-_]?url|DATABASE_URL)/i;
const privateLinkageKeyPattern =
  /(source[-_]?wallet|source[-_]?funding[-_]?address|payer[-_]?source[-_]?wallet|merchant[-_]?settlement[-_]?address|destination[-_]?address|raw[-_]?amount|raw[-_]?asset|input[-_]?commitment|input[-_]?leaf[-_]?index|deposit[-_]?signature|plain[-_]?text[-_]?memo|signed[-_]?transaction|signing[-_]?material|viewing[-_]?key)/i;

function sha256Short(value) {
  return `sha256:${createHash("sha256").update(String(value)).digest("hex").slice(0, 24)}`;
}

function normalizePath(request) {
  try {
    return new URL(request.url ?? "/", "http://vanta.local").pathname;
  } catch {
    return "/";
  }
}

function hasQuery(request) {
  try {
    return new URL(request.url ?? "/", "http://vanta.local").search.length > 0;
  } catch {
    return false;
  }
}

function statusOutcome(statusCode) {
  if (statusCode >= 500) {
    return "error";
  }

  if (statusCode >= 400) {
    return "rejected";
  }

  return "ok";
}

export function sanitizeTelemetryFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeTelemetryFields(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      secretKeyPattern.test(key) || privateLinkageKeyPattern.test(key)
        ? REDACTED
        : sanitizeTelemetryFields(nestedValue),
    ]),
  );
}

export function createSafeTelemetryRequestContext({
  now = () => Date.now(),
  request,
  service,
} = {}) {
  const requestId =
    request?.headers?.["x-request-id"] ??
    request?.headers?.["x-correlation-id"] ??
    randomUUID();
  const remoteAddress = request?.socket?.remoteAddress ?? "unknown";

  return {
    method: request?.method ?? "UNKNOWN",
    path: normalizePath(request ?? {}),
    queryPresent: hasQuery(request ?? {}),
    remoteAddressHash: sha256Short(remoteAddress),
    requestId: String(Array.isArray(requestId) ? requestId[0] : requestId),
    service,
    startedAtMs: now(),
    version: VERSION,
  };
}

export function createOperatorStartupTelemetryEvent({ service, storageKind } = {}) {
  return sanitizeTelemetryFields({
    event: "operator_started",
    service,
    storageKind,
    version: VERSION,
  });
}

export function createOperatorHttpRequestTelemetryEvent({
  context,
  now = () => Date.now(),
  statusCode,
} = {}) {
  const safeStatusCode = Number(statusCode ?? 0);

  return sanitizeTelemetryFields({
    durationMs: Math.max(0, now() - Number(context?.startedAtMs ?? now())),
    event: "operator_http_request",
    method: context?.method ?? "UNKNOWN",
    outcome: statusOutcome(safeStatusCode),
    path: context?.path ?? "/",
    queryPresent: Boolean(context?.queryPresent),
    remoteAddressHash: context?.remoteAddressHash ?? sha256Short("unknown"),
    requestId: context?.requestId ?? randomUUID(),
    service: context?.service,
    statusCode: safeStatusCode,
    version: VERSION,
  });
}

export function writeSafeTelemetryEvent(event, logger = console.log) {
  logger(JSON.stringify(sanitizeTelemetryFields(event)));
}

export function observeSafeTelemetryResponse({
  context,
  logger = console.log,
  now = () => Date.now(),
  response,
} = {}) {
  if (!response || response.__vantaSafeTelemetryObserved) {
    return response;
  }

  response.__vantaSafeTelemetryObserved = true;
  const originalEnd = response.end;
  let logged = false;

  response.end = function endWithSafeTelemetry(...args) {
    try {
      if (!logged) {
        logged = true;
        writeSafeTelemetryEvent(
          createOperatorHttpRequestTelemetryEvent({
            context,
            now,
            statusCode: response.statusCode,
          }),
          logger,
        );
      }
    } finally {
      return originalEnd.apply(this, args);
    }
  };

  return response;
}
