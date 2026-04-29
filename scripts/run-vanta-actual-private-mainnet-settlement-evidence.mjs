import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const args = new Set(process.argv.slice(2));
const productionServicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const mode = args.has("--live") ? "live-preflight" : "dry-run";
const dryRun = mode === "dry-run";
const expectedAck = "I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS";
const expectedActionRef = "actual-private/mainnet-settlement-evidence-run-2026-04-28";
const expectedMaximumFundsAtRisk = "0.025 SOL";
const expectedMaximumFundsAtRiskLamports = 25_000_000;
const ack = process.env.VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK?.trim() ?? "";
const approvalStatus = createVantaMainnetRealFundsApprovalStatus();

const walletEnv = {
  env: "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF",
  kind: "wallet-public-key",
  valuePolicy: "reference-or-sanitized-public-key-only",
};

const serviceEnv = [
  {
    env: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL_REF",
    manifestServiceId: "operator",
    kind: "operator-url",
    valuePolicy: "url-ref-or-sanitized-url",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_INDEXER_URL_REF",
    manifestServiceId: "indexer",
    kind: "indexer-url",
    valuePolicy: "url-ref-or-sanitized-url",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_URL_REF",
    manifestServiceId: "relayer",
    kind: "relayer-url",
    valuePolicy: "url-ref-or-sanitized-url",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_PROVER_URL_REF",
    manifestServiceId: "prover",
    kind: "prover-url",
    valuePolicy: "url-ref-or-sanitized-url",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_VERIFIER_URL_REF",
    manifestServiceId: "verifier",
    kind: "verifier-url",
    valuePolicy: "url-ref-or-sanitized-url",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF",
    kind: "operator-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN_REF",
    kind: "indexer-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN_REF",
    kind: "relayer-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN_REF",
    kind: "prover-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN_REF",
    kind: "verifier-auth-token",
    valuePolicy: "token-ref-only",
  },
];

const forbiddenSecretPatterns = [
  {
    id: "bearer-token",
    test: (value) => /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/i.test(value),
  },
  {
    id: "database-url",
    test: (value) => /\bpostgres(?:ql)?:\/\//i.test(value) || /\bDATABASE_URL=/i.test(value),
  },
  {
    id: "private-key",
    test: (value) => /privateKey|BEGIN [A-Z ]*PRIVATE KEY|secretKey/i.test(value),
  },
  {
    id: "seed-phrase",
    test: (value) => /seedPhrase|mnemonic/i.test(value),
  },
  {
    id: "raw-secret",
    test: (value) => /rawSecret|sk_live_|whsec_/i.test(value),
  },
  {
    id: "signed-transaction",
    test: (value) => /signedTransaction/i.test(value),
  },
];

function isRefValue(value) {
  return (
    /^[A-Z0-9_]+_REF$/.test(value) ||
    /^ref:[A-Za-z0-9._:/-]+$/.test(value) ||
    /^secret-ref:[A-Za-z0-9._:/-]+$/.test(value) ||
    /^doppler:\/\/[A-Za-z0-9._:/-]+$/.test(value) ||
    /^op:\/\/[A-Za-z0-9._:/-]+$/.test(value) ||
    /^render-secret:[A-Za-z0-9._:/-]+$/.test(value)
  );
}

function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) {
      return null;
    }
    if (url.username || url.password || url.search || url.hash) {
      return null;
    }
    return `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return null;
  }
}

function sanitizePublicKey(value) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    return null;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function forbiddenIds(value) {
  return forbiddenSecretPatterns.filter((pattern) => pattern.test(value)).map((pattern) => pattern.id);
}

function readProductionServiceManifestUrls() {
  const manifest = JSON.parse(readFileSync(productionServicesManifestPath, "utf8"));
  const manifestUrls = new Map();
  for (const service of manifest.services ?? []) {
    const id = typeof service.id === "string" ? service.id.trim() : "";
    const url = typeof service.deployedService?.url === "string" ? service.deployedService.url.trim() : "";
    const sanitizedUrl = sanitizeUrl(url);
    if (id && sanitizedUrl) {
      manifestUrls.set(id, sanitizedUrl);
    }
  }
  return manifestUrls;
}

function evaluateEnv(spec, manifestUrls = new Map()) {
  const rawValue = process.env[spec.env]?.trim() ?? "";
  const manifestUrl = spec.manifestServiceId ? manifestUrls.get(spec.manifestServiceId) : null;
  if (!rawValue) {
    if (spec.valuePolicy === "url-ref-or-sanitized-url" && manifestUrl) {
      return {
        env: spec.env,
        kind: spec.kind,
        status: "ready",
        valuePolicy: spec.valuePolicy,
        sanitizedValue: manifestUrl,
        valueSource: "production-service-manifest",
        manifestRef: "ops/mainnet/private-pool-v2-services.manifest.json",
        manifestServiceId: spec.manifestServiceId,
      };
    }
    return {
      env: spec.env,
      kind: spec.kind,
      status: "blocked",
      valuePolicy: spec.valuePolicy,
      blocker: "missing-required-env-ref",
    };
  }

  const forbidden = forbiddenIds(rawValue);
  if (forbidden.length > 0) {
    return {
      env: spec.env,
      kind: spec.kind,
      status: "blocked",
      valuePolicy: spec.valuePolicy,
      sanitizedValue: "FORBIDDEN_RAW_VALUE_REDACTED",
      blocker: "forbidden-secret-like-value-redacted",
      forbiddenPatternIds: forbidden,
    };
  }

  if (isRefValue(rawValue)) {
    return {
      env: spec.env,
      kind: spec.kind,
      status: "ready",
      valuePolicy: spec.valuePolicy,
      sanitizedValue: rawValue,
      valueSource: "reference",
    };
  }

  if (spec.valuePolicy === "url-ref-or-sanitized-url") {
    const sanitizedUrl = sanitizeUrl(rawValue);
    if (sanitizedUrl) {
      return {
        env: spec.env,
        kind: spec.kind,
        status: "ready",
        valuePolicy: spec.valuePolicy,
        sanitizedValue: sanitizedUrl,
        valueSource: "sanitized-url",
      };
    }
  }

  if (spec.valuePolicy === "reference-or-sanitized-public-key-only") {
    const sanitizedPublicKey = sanitizePublicKey(rawValue);
    if (sanitizedPublicKey) {
      return {
        env: spec.env,
        kind: spec.kind,
        status: "ready",
        valuePolicy: spec.valuePolicy,
        sanitizedValue: sanitizedPublicKey,
        valueSource: "sanitized-public-key",
      };
    }
  }

  return {
    env: spec.env,
    kind: spec.kind,
    status: "blocked",
    valuePolicy: spec.valuePolicy,
    sanitizedValue: "UNACCEPTED_VALUE_REDACTED",
    blocker: "env-value-must-be-ref-or-sanitized-allowed-value",
  };
}

function compactBlockers(values) {
  return [...new Set(values.filter(Boolean))];
}

assert.equal(
  approvalStatus.approvalActionRef,
  expectedActionRef,
  "This preflight runner is only scoped to the approved actual-private evidence action.",
);
assert.equal(
  approvalStatus.maximumFundsAtRiskRef,
  expectedMaximumFundsAtRisk,
  "This preflight runner must remain capped to the approved maximum funds at risk.",
);

const wallet = evaluateEnv(walletEnv);
const manifestUrls = readProductionServiceManifestUrls();
const services = serviceEnv.map((service) => evaluateEnv(service, manifestUrls));
const actionMatchesApproval = approvalStatus.approvalActionRef === expectedActionRef;
const capMatchesApproval = approvalStatus.maximumFundsAtRiskRef === expectedMaximumFundsAtRisk;
const ackAccepted = dryRun ? false : ack === expectedAck;

const blockers = compactBlockers([
  actionMatchesApproval ? null : "approved-action-mismatch",
  capMatchesApproval ? null : "approved-funds-cap-mismatch",
  approvalStatus.liveMainnetActionsAllowedNow ? null : "bounded-approval-window-not-active",
  dryRun ? "dry-run-mode-never-moves-funds" : null,
  !dryRun && !ackAccepted ? "missing-live-mainnet-settlement-ack" : null,
  wallet.status === "ready" ? null : "wallet-public-key-ref-not-ready",
  ...services.map((service) => (service.status === "ready" ? null : `${service.env}:not-ready`)),
  "transaction-submission-not-implemented-by-design",
]);

const report = {
  version: "vanta-actual-private-mainnet-settlement-executor-preflight-0.1",
  checkedAt: new Date().toISOString(),
  mode,
  movesFunds: false,
  transactionSubmissionImplemented: false,
  phases: {
    approval: {
      status:
        actionMatchesApproval && capMatchesApproval && approvalStatus.liveMainnetActionsAllowedNow
          ? "ready"
          : "blocked",
      approvalActionRef: approvalStatus.approvalActionRef,
      expectedActionRef,
      actionMatchesApproval,
      approvalActionSummary: approvalStatus.approvalActionSummary,
      approvalEnvironment: approvalStatus.approvalEnvironment,
      approvalRecordStatus: approvalStatus.approvalRecordStatus,
      approvalWindowRef: approvalStatus.approvalWindowRef,
      approvalWindowStatus: approvalStatus.approvalWindowStatus,
      approvedByRef: approvalStatus.approvedByRef,
      expectedMaximumFundsAtRisk,
      maximumFundsAtRiskRef: approvalStatus.maximumFundsAtRiskRef,
      maximumFundsAtRiskLamports: expectedMaximumFundsAtRiskLamports,
      capMatchesApproval,
      feePayerRef: approvalStatus.feePayerRef,
      liveMainnetActionsAllowedNow: approvalStatus.liveMainnetActionsAllowedNow,
      realFundsApprovalRecorded: approvalStatus.realFundsApprovalRecorded,
      rollbackPlanRef: approvalStatus.rollbackPlanRef,
      stopLossPlanRef: approvalStatus.stopLossPlanRef,
      requiredNextStep: approvalStatus.requiredNextStep,
    },
    wallet: {
      status: wallet.status,
      requiredEnv: wallet.env,
      valuePolicy: wallet.valuePolicy,
      valueSource: wallet.valueSource ?? null,
      sanitizedValue: wallet.sanitizedValue ?? null,
      blocker: wallet.blocker ?? null,
      secretMaterialPrinted: false,
    },
    services: {
      status: services.every((service) => service.status === "ready") ? "ready" : "blocked",
      valuePolicy: "urls-may-be-sanitized-tokens-must-be-refs",
      required: services,
      secretMaterialPrinted: false,
    },
    settlementPlan: {
      status: "blocked",
      activePrivacyRailId: "vanta-private-pool-v2",
      approvedActionRef: expectedActionRef,
      browserHandoffRoute: "/app/actual-private-settlement",
      maximumFundsAtRiskRef: expectedMaximumFundsAtRisk,
      maximumFundsAtRiskLamports: expectedMaximumFundsAtRiskLamports,
      actions: [
        "validate-bounded-approval",
        "validate-wallet-public-key-ref",
        "validate-production-service-refs",
        "build-actual-private-operator-settlement-plan",
        "build-reviewed-actual-private-settlement-plan",
        "stop-before-signing-or-submission",
      ],
      operatorEndpoint: "/private-pool-v2/protocol-settlements",
      transactionConstruction: "not-implemented",
      transactionSigning: "not-implemented",
      transactionSubmission: "not-implemented",
      noFundsMovementReason:
        "This reviewed first slice is a dry-run/preflight executor contract only; it intentionally stops before signing or submission.",
    },
    evidencePolicy: {
      status: "ready",
      secretPolicy: "references-only-no-secret-values",
      forbiddenSecretRedaction: "enforced",
      outputPolicy:
        "Only approval refs, sanitized public key refs, sanitized service URLs, token refs, and blocker IDs may be printed.",
      forbiddenValues: [
        "wallet private keys",
        "seed phrases",
        "keypair files",
        "raw signing credentials",
        "raw database URLs",
        "raw bearer tokens",
        "signed transactions",
        "customer private inputs",
      ],
      evidenceTemplateRef: "ops/mainnet/actual-private-mainnet-settlement.evidence.template.json",
      requiredReviewerRefs: [
        "VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF",
        "VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF",
        "VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF",
        "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF",
        "VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF",
        "VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF",
        "VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF",
      ],
    },
  },
  finalBlocker: {
    status: "blocked",
    blockers,
    liveAck: {
      requiredForLiveMode: true,
      env: "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK",
      accepted: ackAccepted,
      requiredValueRef: expectedAck,
    },
    requiredNextStep:
      "Use the browser handoff route for the source-wallet deposit path, then implement the relayer-submitted private spend evidence writer before any live mainnet submission is possible.",
  },
};

console.log(JSON.stringify(report, null, 2));

if (!dryRun && blockers.length > 0) {
  process.exitCode = 1;
}
