import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const requireAuth = args.has("--require-auth") || args.has("--check");
const checkMode = args.has("--check");
const productionServicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const settlementReviewEvidencePath = new URL(
  "../ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
  import.meta.url,
);
const authShellCommand =
  "doppler run --config prd --project vanta -- npm run mainnet:actual-private-replay-probe-auth";

function hashRef(...parts) {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 20);
}

function sanitizeUrl(value) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("VANTA_PRIVATE_POOL_V2_OPERATOR_URL must be an HTTP(S) URL.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("VANTA_PRIVATE_POOL_V2_OPERATOR_URL must not include credentials, query, or hash.");
  }
  return `${parsed.protocol}//${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`.replace(/\/+$/, "");
}

function productionOperatorUrl() {
  const manifest = JSON.parse(readFileSync(productionServicesManifestPath, "utf8"));
  const operator = manifest.services?.find((service) => service.id === "operator");
  return operator?.deployedService?.url ?? null;
}

function reviewEvidenceNullifier() {
  const evidence = JSON.parse(readFileSync(settlementReviewEvidencePath, "utf8"));
  const nullifierCheck = evidence.passedChecks?.find((check) => check.id === "indexer-nullifier-found");
  const match = String(nullifierCheck?.evidenceRef ?? "").match(/nullifiers\/([^/\s]+)/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

function probeConfig() {
  const operatorUrl = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim() || productionOperatorUrl();
  assert.ok(
    operatorUrl,
    "Missing VANTA_PRIVATE_POOL_V2_OPERATOR_URL and no production operator URL is recorded in the services manifest.",
  );

  const nullifier = process.env.VANTA_ACTUAL_PRIVATE_REPLAY_PROBE_NULLIFIER_REF?.trim() || reviewEvidenceNullifier();
  assert.ok(
    nullifier,
    "Missing VANTA_ACTUAL_PRIVATE_REPLAY_PROBE_NULLIFIER_REF and no reviewed settlement nullifier was found.",
  );

  const url = sanitizeUrl(operatorUrl);
  return {
    authToken: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN?.trim() ?? "",
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    endpoint: "/private-pool-v2/nullifier-replay-checks",
    nullifier,
    nullifierSource: process.env.VANTA_ACTUAL_PRIVATE_REPLAY_PROBE_NULLIFIER_REF?.trim()
      ? "env"
      : "actual-private-settlement-review-evidence",
    operatorUrlHost: new URL(url).host,
    operatorUrlRef: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
    operatorUrlSource: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim() ? "env" : "manifest",
    url,
  };
}

async function requestReplayProbe(config) {
  const requestId = `actual-private-production-replay-probe:${hashRef(config.nullifier)}`;
  const response = await fetch(new URL(config.endpoint, `${config.url}/`), {
    body: JSON.stringify({
      intent: "private-send",
      nullifier: config.nullifier,
      requestId,
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.authToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { ok: response.ok, parsed, status: response.status, statusText: response.statusText, text };
}

function summarizePending(config) {
  return {
    authShellCommand,
    authTokenEnv: config.authTokenEnv,
    authTokenStatus: config.authToken ? "set" : "missing",
    checkedAt: new Date().toISOString(),
    endpoint: config.endpoint,
    mainnetReady: false,
    nextAction: `Load the production operator auth token in a secret-manager shell and rerun: ${authShellCommand}`,
    nullifierRef: `nullifier:${hashRef(config.nullifier)}`,
    nullifierSource: config.nullifierSource,
    operatorNullifierReplayRef: null,
    operatorUrlHost: config.operatorUrlHost,
    operatorUrlRef: config.operatorUrlRef,
    operatorUrlSource: config.operatorUrlSource,
    productionReady: false,
    probePromotionSatisfied: false,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, signed transactions, or raw customer private inputs are printed.",
    status: "pending-authenticated-production-probe",
    version: "vanta-actual-private-production-replay-probe-0.1",
  };
}

function summarizeResponse(config, response) {
  const parsed = response.parsed ?? {};
  const replayGuardMissingReviewedNullifier =
    response.ok &&
    parsed.kind === "Private Pool V2 nullifier replay check" &&
    parsed.accepted === true &&
    parsed.mutated === false &&
    parsed.decision?.replay === false &&
    parsed.decision?.reason === "durable-nullifier-available";
  const duplicateRejected =
    response.ok &&
    parsed.kind === "Private Pool V2 nullifier replay check" &&
    parsed.accepted === false &&
    parsed.mutated === false &&
    parsed.decision?.replay === true &&
    typeof parsed.decision?.reason === "string" &&
    parsed.decision.reason.includes("replay");

  return {
    authShellCommand,
    authTokenEnv: config.authTokenEnv,
    authTokenStatus: config.authToken ? "set" : "missing",
    checkedAt: new Date().toISOString(),
    endpoint: config.endpoint,
    httpStatus: response.status,
    mainnetReady: false,
    nextAction: duplicateRejected
      ? "Record this operator-nullifier-replay ref only after reviewer accepts the production probe transcript."
      : replayGuardMissingReviewedNullifier
        ? "Do not promote replay evidence. Reconcile why the reviewed/indexer nullifier is absent from the production operator replay guard before another live evidence attempt."
      : "Do not promote replay evidence. The production probe did not return a review-only duplicate rejection.",
    nullifierRef: parsed.nullifierRef ?? `nullifier:${hashRef(config.nullifier)}`,
    nullifierSource: config.nullifierSource,
    operatorNullifierReplayRef: duplicateRejected
      ? `operator-nullifier-replay:production-duplicate-rejected-${hashRef(parsed.nullifierRef ?? config.nullifier, parsed.requestId ?? "")}`
      : null,
    operatorUrlHost: config.operatorUrlHost,
    operatorUrlRef: config.operatorUrlRef,
    operatorUrlSource: config.operatorUrlSource,
    productionReady: false,
    probeDecision: parsed.decision
      ? {
          accepted: parsed.accepted === true,
          context: parsed.context ?? null,
          mutated: parsed.mutated === true,
          reason: parsed.decision.reason ?? null,
          replay: parsed.decision.replay === true,
        }
      : null,
    reconciliationBlocker: replayGuardMissingReviewedNullifier
      ? "production-replay-guard-missing-reviewed-nullifier"
      : null,
    reconciliationRequired: replayGuardMissingReviewedNullifier,
    probePromotionSatisfied: duplicateRejected,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, signed transactions, or raw customer private inputs are printed.",
    status: duplicateRejected ? "production-duplicate-replay-rejected-review-required" : "blocked-not-duplicate-rejection",
    version: "vanta-actual-private-production-replay-probe-0.1",
  };
}

const config = probeConfig();
const response = config.authToken
  ? await requestReplayProbe(config)
  : {
      ok: false,
      parsed: null,
      status: 0,
      statusText: "skipped-missing-auth-token",
      text: "",
    };

if (requireAuth) {
  assert.ok(config.authToken, `Missing required environment variable ${config.authTokenEnv}.`);
  assert.ok(response.ok, `Operator replay probe HTTP ${response.status}: ${response.text || response.statusText}`);
  assert.ok(response.parsed, "Operator replay probe must return JSON.");
}

const result = response.parsed ? summarizeResponse(config, response) : summarizePending(config);

if (checkMode) {
  assert.equal(result.version, "vanta-actual-private-production-replay-probe-0.1");
  assert.equal(result.mainnetReady, false);
  assert.equal(result.productionReady, false);
  assert.match(result.nullifierRef, /^nullifier:[a-f0-9]{20}$/);
  assert.equal(result.endpoint, "/private-pool-v2/nullifier-replay-checks");
  assert.ok(!JSON.stringify(result).includes(config.authToken), "Replay probe output must not print auth token material.");
}

console.log(JSON.stringify(result, null, 2));
