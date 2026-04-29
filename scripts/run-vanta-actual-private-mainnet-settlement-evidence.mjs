import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

import { createVantaActualPrivateSettlementPlan } from "../src/mainnet/actualPrivateSettlementPlan.mjs";
import { requestVantaActualPrivateSettlementViaRelayer } from "../src/mainnet/actualPrivateSettlementRelayerCaller.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const args = new Set(process.argv.slice(2));
const productionServicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const stopConditionEvidencePath = new URL(
  "../ops/mainnet/actual-private-mainnet-settlement-stop-condition.evidence.json",
  import.meta.url,
);
const mode = args.has("--live") ? "live-preflight" : "dry-run";
const dryRun = mode === "dry-run";
const expectedAck = "I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS";
const expectedExecuteAck = "I_UNDERSTAND_THIS_WILL_REQUEST_A_MAINNET_PRIVATE_SETTLEMENT";
const expectedMaximumFundsAtRisk = "0.025 SOL";
const expectedMaximumFundsAtRiskLamports = 25_000_000;
const ack = process.env.VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK?.trim() ?? "";
const executeAck = process.env.VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK?.trim() ?? "";
const executeRequested = args.has("--execute") || executeAck === expectedExecuteAck;
const approvalStatus = createVantaMainnetRealFundsApprovalStatus();
const expectedActionRef = approvalStatus.approvalActionRef;

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
    manifestServiceId: "operator",
    kind: "operator-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN_REF",
    manifestServiceId: "indexer",
    kind: "indexer-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN_REF",
    manifestServiceId: "relayer",
    kind: "relayer-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN_REF",
    manifestServiceId: "prover",
    kind: "prover-auth-token",
    valuePolicy: "token-ref-only",
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN_REF",
    manifestServiceId: "verifier",
    kind: "verifier-auth-token",
    valuePolicy: "token-ref-only",
  },
];

const planEnv = [
  { env: "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_REF", field: "acceptedRoot" },
  { env: "VANTA_ACTUAL_PRIVATE_ASSET_COHORT_REF", field: "assetCohort" },
  { env: "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REF", field: "assetIdCommitment" },
  { env: "VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX_REF", field: "changeLeafIndex" },
  { env: "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF", field: "changeOutputCommitment" },
  { env: "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT_REF", field: "changeOutputRoot" },
  { env: "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT_REF", field: "economicsCommitment" },
  { env: "VANTA_ACTUAL_PRIVATE_NULLIFIER_REF", field: "nullifier" },
  { env: "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF", field: "outputCommitment" },
  { env: "VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX_REF", field: "outputLeafIndex" },
  { env: "VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT_REF", field: "outputRoot" },
  { env: "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT_REF", field: "ownerCommitment" },
  { env: "VANTA_ACTUAL_PRIVATE_POOL_ID_REF", field: "poolId" },
  { env: "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH_REF", field: "privateSpendContextHash" },
  { env: "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF", field: "privateSpendPublicInputHash" },
  { env: "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT_REF", field: "routeCommitment" },
  { env: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT_REF", field: "settlementCommitment" },
  { env: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID_REF", field: "settlementId" },
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

function readProductionServiceManifestRefs() {
  const manifest = JSON.parse(readFileSync(productionServicesManifestPath, "utf8"));
  const manifestRefs = new Map();
  for (const service of manifest.services ?? []) {
    const id = typeof service.id === "string" ? service.id.trim() : "";
    const url = typeof service.deployedService?.url === "string" ? service.deployedService.url.trim() : "";
    const sanitizedUrl = sanitizeUrl(url);
    const authSecretRef =
      typeof service.deployedService?.auth?.secretRef === "string"
        ? service.deployedService.auth.secretRef.trim()
        : "";
    if (id && sanitizedUrl) {
      manifestRefs.set(`${id}:url`, sanitizedUrl);
    }
    if (id && isRefValue(authSecretRef)) {
      manifestRefs.set(`${id}:authSecretRef`, authSecretRef);
    }
  }
  return manifestRefs;
}

function evaluateEnv(spec, manifestRefs = new Map()) {
  const rawValue = process.env[spec.env]?.trim() ?? "";
  const manifestUrl = spec.manifestServiceId ? manifestRefs.get(`${spec.manifestServiceId}:url`) : null;
  const manifestAuthSecretRef = spec.manifestServiceId
    ? manifestRefs.get(`${spec.manifestServiceId}:authSecretRef`)
    : null;
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
    if (spec.valuePolicy === "token-ref-only" && manifestAuthSecretRef) {
      return {
        env: spec.env,
        kind: spec.kind,
        status: "ready",
        valuePolicy: spec.valuePolicy,
        sanitizedValue: manifestAuthSecretRef,
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

function evaluatePlanInput(spec) {
  return evaluateEnv({
    env: spec.env,
    kind: `settlement-plan-${spec.field}`,
    valuePolicy: "reference-or-sanitized-plan-term-only",
  });
}

function evaluateSecretPresence(env) {
  const rawValue = process.env[env]?.trim() ?? "";
  if (!rawValue) {
    return {
      env,
      status: "blocked",
      valuePolicy: "raw-secret-env-presence-only",
      blocker: "missing-required-secret-env",
      secretMaterialPrinted: false,
    };
  }
  return {
    env,
    status: "ready",
    valuePolicy: "raw-secret-env-presence-only",
    valueSource: "secret-env",
    sanitizedValue: "PRESENT_REDACTED",
    secretMaterialPrinted: false,
  };
}

function evaluateRawSettlementPlanInput() {
  const rawValue = process.env.VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON?.trim() ?? "";
  if (!rawValue) {
    return {
      env: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON",
      status: "blocked",
      valuePolicy: "raw-plan-json-presence-only-never-printed",
      blocker: "missing-required-plan-json-env",
      secretMaterialPrinted: false,
    };
  }

  const forbidden = forbiddenIds(rawValue);
  if (forbidden.length > 0) {
    return {
      env: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON",
      status: "blocked",
      valuePolicy: "raw-plan-json-presence-only-never-printed",
      sanitizedValue: "FORBIDDEN_RAW_VALUE_REDACTED",
      blocker: "forbidden-secret-like-value-redacted",
      forbiddenPatternIds: forbidden,
      secretMaterialPrinted: false,
    };
  }

  try {
    const parsed = JSON.parse(rawValue);
    const planInput = Object.fromEntries(planEnv.map((spec) => [spec.field, parsed[spec.field]]));
    createVantaActualPrivateSettlementPlan(planInput);
    return {
      env: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON",
      status: "ready",
      valuePolicy: "raw-plan-json-presence-only-never-printed",
      sanitizedValue: "PRESENT_VALIDATED_REDACTED",
      planInput,
      secretMaterialPrinted: false,
    };
  } catch (error) {
    return {
      env: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON",
      status: "blocked",
      valuePolicy: "raw-plan-json-presence-only-never-printed",
      sanitizedValue: "INVALID_PLAN_JSON_REDACTED",
      blocker: "invalid-required-plan-json-env",
      reason: error instanceof Error ? error.message : String(error),
      secretMaterialPrinted: false,
    };
  }
}

function compactBlockers(values) {
  return [...new Set(values.filter(Boolean))];
}

function readStopConditionEvidence() {
  try {
    const evidence = JSON.parse(readFileSync(stopConditionEvidencePath, "utf8"));
    const appliesToCurrentApproval =
      evidence?.status === "stop-condition-fired" &&
      evidence?.approvalActionRef === approvalStatus.approvalActionRef &&
      evidence?.approvalWindowRef === approvalStatus.approvalWindowRef &&
      evidence?.maximumFundsAtRiskRef === approvalStatus.maximumFundsAtRiskRef;
    return {
      appliesToCurrentApproval,
      evidenceRef: "ops/mainnet/actual-private-mainnet-settlement-stop-condition.evidence.json",
      fundsMoved: evidence?.fundsMoved === true,
      reasonRef: typeof evidence?.reasonRef === "string" ? evidence.reasonRef : null,
      requiredNextStep:
        typeof evidence?.requiredNextStep === "string"
          ? evidence.requiredNextStep
          : "Record a fresh bounded approval window before any new live settlement request.",
      status: evidence?.status === "stop-condition-fired" ? "fired" : "not-fired",
    };
  } catch {
    return {
      appliesToCurrentApproval: false,
      evidenceRef: "ops/mainnet/actual-private-mainnet-settlement-stop-condition.evidence.json",
      fundsMoved: false,
      reasonRef: null,
      requiredNextStep: "No stop-condition evidence applies to the current approval window.",
      status: "not-recorded",
    };
  }
}

assert.match(
  approvalStatus.approvalActionRef,
  /^actual-private\/mainnet-settlement-evidence-run-\d{4}-\d{2}-\d{2}(?:-[A-Za-z0-9._-]+)?$/,
  "This preflight runner is only scoped to actual-private evidence actions.",
);
assert.equal(
  approvalStatus.maximumFundsAtRiskRef,
  expectedMaximumFundsAtRisk,
  "This preflight runner must remain capped to the approved maximum funds at risk.",
);

const wallet = evaluateEnv(walletEnv);
const manifestRefs = readProductionServiceManifestRefs();
const services = serviceEnv.map((service) => evaluateEnv(service, manifestRefs));
const planInputs = planEnv.map(evaluatePlanInput);
const rawSettlementPlanInput = evaluateRawSettlementPlanInput();
const operatorUrl = services.find((service) => service.kind === "operator-url");
const operatorSecret = evaluateSecretPresence("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN");
const stopCondition = readStopConditionEvidence();
const actionMatchesApproval = approvalStatus.approvalActionRef === expectedActionRef;
const capMatchesApproval = approvalStatus.maximumFundsAtRiskRef === expectedMaximumFundsAtRisk;
const ackAccepted = dryRun ? false : ack === expectedAck;
const executeAckAccepted = !executeRequested ? false : executeAck === expectedExecuteAck;
const planReady = planInputs.every((input) => input.status === "ready");
const servicesReady = services.every((service) => service.status === "ready");
const readyToRequestSettlement =
  !dryRun &&
  executeRequested &&
  ackAccepted &&
  executeAckAccepted &&
  actionMatchesApproval &&
  capMatchesApproval &&
  approvalStatus.liveMainnetActionsAllowedNow &&
  !stopCondition.appliesToCurrentApproval &&
  wallet.status === "ready" &&
  servicesReady &&
  planReady &&
  rawSettlementPlanInput.status === "ready" &&
  operatorUrl?.status === "ready" &&
  operatorSecret.status === "ready";

let settlementExecution = null;
if (readyToRequestSettlement) {
  const plan = createVantaActualPrivateSettlementPlan(rawSettlementPlanInput.planInput);
  const result = await requestVantaActualPrivateSettlementViaRelayer({
    authToken: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN,
    operatorBaseUrl: operatorUrl.sanitizedValue,
    plan,
  });
  settlementExecution = {
    status: "submitted",
    evidenceRefs: result.evidenceRefs,
    responseDecision: result.responseDecision,
    secretMaterialPrinted: false,
  };
}

const blockers = compactBlockers([
  actionMatchesApproval ? null : "approved-action-mismatch",
  capMatchesApproval ? null : "approved-funds-cap-mismatch",
  approvalStatus.liveMainnetActionsAllowedNow ? null : "bounded-approval-window-not-active",
  stopCondition.appliesToCurrentApproval ? "stop-condition-already-fired-for-approval-window" : null,
  dryRun ? "dry-run-mode-never-moves-funds" : null,
  !dryRun && !ackAccepted ? "missing-live-mainnet-settlement-ack" : null,
  wallet.status === "ready" ? null : "wallet-public-key-ref-not-ready",
  ...services.map((service) => (service.status === "ready" ? null : `${service.env}:not-ready`)),
  ...planInputs.map((input) => (input.status === "ready" ? null : `${input.env}:not-ready`)),
  executeRequested && rawSettlementPlanInput.status !== "ready"
    ? "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON:not-ready"
    : null,
  executeRequested && !executeAckAccepted ? "missing-live-mainnet-settlement-execute-ack" : null,
  executeRequested && operatorSecret.status !== "ready" ? "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN:not-ready" : null,
  !executeRequested && !dryRun ? "live-settlement-execute-ack-not-set" : null,
]);

const report = {
  version: "vanta-actual-private-mainnet-settlement-executor-preflight-0.1",
  checkedAt: new Date().toISOString(),
  mode,
  executeRequested,
  movesFunds: false,
  transactionSubmissionImplemented: true,
  phases: {
    approval: {
      status:
        actionMatchesApproval &&
        capMatchesApproval &&
        approvalStatus.liveMainnetActionsAllowedNow &&
        !stopCondition.appliesToCurrentApproval
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
      stopCondition,
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
      status: servicesReady ? "ready" : "blocked",
      valuePolicy: "urls-may-be-sanitized-tokens-must-be-refs",
      required: services,
      secretMaterialPrinted: false,
    },
    settlementPlan: {
      status: planReady ? "ready" : "blocked",
      activePrivacyRailId: "vanta-private-pool-v2",
      approvedActionRef: expectedActionRef,
      browserHandoffRoute: "/app/actual-private-settlement",
      maximumFundsAtRiskRef: expectedMaximumFundsAtRisk,
      maximumFundsAtRiskLamports: expectedMaximumFundsAtRiskLamports,
      requiredInputs: planInputs,
      executionPlanJson: executeRequested
        ? {
            env: rawSettlementPlanInput.env,
            status: rawSettlementPlanInput.status,
            valuePolicy: rawSettlementPlanInput.valuePolicy,
            sanitizedValue: rawSettlementPlanInput.sanitizedValue,
            blocker: rawSettlementPlanInput.blocker,
            secretMaterialPrinted: false,
          }
        : undefined,
      actions: [
        "validate-bounded-approval",
        "validate-wallet-public-key-ref",
        "validate-production-service-refs",
        "build-actual-private-operator-settlement-plan",
        "build-reviewed-actual-private-settlement-plan",
        "request-operator-protocol-settlement-via-relayer-caller-when-execute-ack-is-present",
      ],
      operatorEndpoint: "/private-pool-v2/protocol-settlements",
      transactionConstruction: "implemented-reviewed-plan-boundary",
      transactionSigning: "not-local-wallet-signing-operator-relayer-submits",
      transactionSubmission: executeRequested ? "enabled-when-all-gates-ready" : "implemented-but-disabled-without-execute-ack",
      noFundsMovementReason:
        executeRequested
          ? "Execution was requested but remains fail-closed unless every live gate is ready."
          : "Live preflight stops before the relayer request unless the separate execute ACK is set.",
      execution: settlementExecution,
    },
    operatorSecret: executeRequested ? operatorSecret : undefined,
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
        "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF",
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
    executeAck: {
      requiredForSettlementRequest: true,
      env: "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK",
      accepted: executeAckAccepted,
      requiredValueRef: expectedExecuteAck,
    },
    requiredNextStep:
      stopCondition.appliesToCurrentApproval
        ? stopCondition.requiredNextStep
        : "Record a fresh bounded approval window, supply the refs-only wallet and settlement-plan inputs, provide the raw operator token via secret env, and set both ACKs before requesting a live operator settlement.",
  },
};

console.log(JSON.stringify(report, null, 2));

if (!dryRun && blockers.length > 0) {
  process.exitCode = 1;
}
