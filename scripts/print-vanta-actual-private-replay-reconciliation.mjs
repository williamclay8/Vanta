import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const requireAuth = args.has("--require-auth") || args.has("--check");
const checkMode = args.has("--check");
const productionServicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const settlementReviewEvidencePath = new URL("../ops/mainnet/actual-private-mainnet-settlement-review.evidence.json", import.meta.url);
const authShellCommand =
  "doppler run --config prd --project vanta -- npm run mainnet:actual-private-replay-reconcile-auth";

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

function readReviewEvidence() {
  const evidence = JSON.parse(readFileSync(settlementReviewEvidencePath, "utf8"));
  const protocolSettlementRef = evidence.reviewedSettlementRefs?.protocolSettlementRef ?? "";
  const operatorReceiptRef = evidence.reviewedSettlementRefs?.operatorReceiptRef ?? "";
  const nullifierCheck = evidence.passedChecks?.find((check) => check.id === "indexer-nullifier-found");
  const nullifierMatch = String(nullifierCheck?.evidenceRef ?? "").match(/nullifiers\/([^/\s]+)/);
  return {
    operatorReceiptId: String(operatorReceiptRef).replace(/^operator-receipt:/, ""),
    protocolSettlementId: String(protocolSettlementRef).replace(/^operator-protocol-settlement:/, ""),
    reviewedIndexerNullifier: nullifierMatch ? decodeURIComponent(nullifierMatch[1]) : null,
  };
}

function config() {
  const operatorUrl = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim() || productionOperatorUrl();
  assert.ok(
    operatorUrl,
    "Missing VANTA_PRIVATE_POOL_V2_OPERATOR_URL and no production operator URL is recorded in the services manifest.",
  );
  const review = readReviewEvidence();
  assert.ok(review.protocolSettlementId, "Missing reviewed protocol settlement id.");
  assert.ok(review.operatorReceiptId, "Missing reviewed operator receipt id.");
  assert.ok(review.reviewedIndexerNullifier, "Missing reviewed indexer nullifier.");
  const url = sanitizeUrl(operatorUrl);
  return {
    ...review,
    authToken: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN?.trim() ?? "",
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    operatorUrlHost: new URL(url).host,
    operatorUrlRef: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
    operatorUrlSource: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim() ? "env" : "manifest",
    url,
  };
}

async function requestJson(cfg, path, options = {}) {
  const response = await fetch(new URL(path, `${cfg.url}/`), {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${cfg.authToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
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

function findProtocolSettlement(receiptsPayload, cfg) {
  const settlements = Array.isArray(receiptsPayload?.protocolSettlements)
    ? receiptsPayload.protocolSettlements
    : [];
  return (
    settlements.find(
      (settlement) => settlement?.protocolSettlementReceipt?.id === cfg.protocolSettlementId,
    ) ?? null
  );
}

function findProofReceipt(receiptsPayload, proofReceiptId) {
  const receipts = Array.isArray(receiptsPayload?.receipts) ? receiptsPayload.receipts : [];
  return (
    receipts.find(
      (receipt) =>
        receipt?.receiptId === proofReceiptId ||
        `ppv2_${String(receipt?.receiptId ?? "").replace(/^0x/, "").slice(0, 24)}` === proofReceiptId,
    ) ?? null
  );
}

async function reconcile(cfg) {
  const receiptsResponse = await requestJson(cfg, "/state/private-pool-v2-receipts");
  assert.ok(
    receiptsResponse.ok,
    `Operator receipts request HTTP ${receiptsResponse.status}: ${receiptsResponse.text || receiptsResponse.statusText}`,
  );
  const protocolSettlement = findProtocolSettlement(receiptsResponse.parsed, cfg);
  const proofReceiptId = protocolSettlement?.protocolSettlementReceipt?.proofReceiptId ?? cfg.operatorReceiptId;
  const proofReceipt = findProofReceipt(receiptsResponse.parsed, proofReceiptId) ?? protocolSettlement?.proofReceipt ?? null;
  const operatorReplayKey = proofReceipt?.replayKey ?? null;
  const operatorNullifier = String(operatorReplayKey ?? "").startsWith("private-send:")
    ? String(operatorReplayKey).slice("private-send:".length)
    : null;
  const comparedNullifier = operatorNullifier ?? cfg.reviewedIndexerNullifier;

  const replayResponse = await requestJson(cfg, "/private-pool-v2/nullifier-replay-checks", {
    body: JSON.stringify({
      intent: "private-send",
      nullifier: comparedNullifier,
      requestId: `actual-private-replay-reconciliation:${hashRef(comparedNullifier)}`,
    }),
    method: "POST",
  });
  assert.ok(
    replayResponse.ok,
    `Operator replay reconcile HTTP ${replayResponse.status}: ${replayResponse.text || replayResponse.statusText}`,
  );

  const replayDecision = replayResponse.parsed?.decision ?? null;
  const receiptFound = Boolean(protocolSettlement);
  const proofReceiptFound = Boolean(proofReceipt);
  const receiptNullifierMatchesReview = operatorNullifier === cfg.reviewedIndexerNullifier;
  const replayGuardReportsAvailable =
    replayResponse.parsed?.accepted === true &&
    replayResponse.parsed?.mutated === false &&
    replayDecision?.replay === false &&
    replayDecision?.reason === "durable-nullifier-available";
  const replayGuardReportsDuplicate =
    replayResponse.parsed?.accepted === false &&
    replayResponse.parsed?.mutated === false &&
    replayDecision?.replay === true;

  const reconciliationBlockers = [
    receiptFound ? null : "reviewed-protocol-settlement-missing-from-operator-receipts",
    proofReceiptFound ? null : "reviewed-proof-receipt-missing-from-operator-receipts",
    receiptNullifierMatchesReview ? null : "operator-receipt-nullifier-mismatch",
    replayGuardReportsAvailable ? "production-replay-guard-missing-reviewed-nullifier" : null,
  ].filter(Boolean);

  return {
    checkedAt: new Date().toISOString(),
    httpStatus: {
      receipts: receiptsResponse.status,
      replayProbe: replayResponse.status,
    },
    operatorProofReceiptFound: proofReceiptFound,
    operatorProtocolSettlementFound: receiptFound,
    operatorReceiptRef: `operator-receipt:${cfg.operatorReceiptId}`,
    operatorReplayKeyRef: operatorReplayKey ? `replay-key:${hashRef(operatorReplayKey)}` : null,
    operatorUrlHost: cfg.operatorUrlHost,
    operatorUrlRef: cfg.operatorUrlRef,
    operatorUrlSource: cfg.operatorUrlSource,
    privacyClaimAllowed: false,
    productionReady: false,
    protocolSettlementRef: `operator-protocol-settlement:${cfg.protocolSettlementId}`,
    receiptNullifierMatchesReview,
    reconciliationBlockers,
    reconciliationStatus:
      reconciliationBlockers.length === 0 && replayGuardReportsDuplicate
        ? "duplicate-replay-reconciled-review-required"
        : "blocked-reconciliation-required",
    replayDecision: replayDecision
      ? {
          accepted: replayResponse.parsed.accepted === true,
          context: replayResponse.parsed.context ?? null,
          mutated: replayResponse.parsed.mutated === true,
          reason: replayDecision.reason ?? null,
          replay: replayDecision.replay === true,
        }
      : null,
    replayGuardReportsAvailable,
    replayGuardReportsDuplicate,
    reviewedIndexerNullifierRef: `nullifier:${hashRef(cfg.reviewedIndexerNullifier)}`,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, signed transactions, raw nullifiers, or customer private inputs are printed.",
    version: "vanta-actual-private-replay-reconciliation-0.1",
  };
}

function pending(cfg) {
  return {
    authShellCommand,
    authTokenEnv: cfg.authTokenEnv,
    authTokenStatus: cfg.authToken ? "set" : "missing",
    checkedAt: new Date().toISOString(),
    nextAction: `Load the production operator auth token in a secret-manager shell and rerun: ${authShellCommand}`,
    operatorReceiptRef: `operator-receipt:${cfg.operatorReceiptId}`,
    operatorUrlHost: cfg.operatorUrlHost,
    operatorUrlRef: cfg.operatorUrlRef,
    operatorUrlSource: cfg.operatorUrlSource,
    privacyClaimAllowed: false,
    productionReady: false,
    protocolSettlementRef: `operator-protocol-settlement:${cfg.protocolSettlementId}`,
    reconciliationBlockers: ["pending-authenticated-reconciliation"],
    reconciliationStatus: "pending-authenticated-reconciliation",
    reviewedIndexerNullifierRef: `nullifier:${hashRef(cfg.reviewedIndexerNullifier)}`,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, signed transactions, raw nullifiers, or customer private inputs are printed.",
    version: "vanta-actual-private-replay-reconciliation-0.1",
  };
}

const cfg = config();
if (requireAuth) {
  assert.ok(cfg.authToken, `Missing required environment variable ${cfg.authTokenEnv}.`);
}

const result = cfg.authToken ? await reconcile(cfg) : pending(cfg);

if (checkMode) {
  assert.equal(result.version, "vanta-actual-private-replay-reconciliation-0.1");
  assert.equal(result.productionReady, false);
  assert.equal(result.privacyClaimAllowed, false);
  assert.match(result.reviewedIndexerNullifierRef, /^nullifier:[a-f0-9]{20}$/);
  assert.ok(!JSON.stringify(result).includes(cfg.authToken), "Reconciliation output must not print auth token material.");
}

console.log(JSON.stringify(result, null, 2));
