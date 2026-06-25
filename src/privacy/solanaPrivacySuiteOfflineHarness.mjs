export const VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION =
  "vanta-solana-privacy-suite-offline-harness-0.1";

export const VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_CLAIM_BOUNDARY =
  "reference-derived offline harness only; no wallet, signing, broadcast, provider, MCP, cloud, deployment, mainnet, privacy-readiness, custody, or production evidence";

const blockedAuthorityTerms = new Set([
  "aws",
  "broadcast",
  "cloud",
  "connectGrpc",
  "deploy",
  "docker",
  "helm",
  "jitoSubmit",
  "laserStreamConnect",
  "providerMutation",
  "sendBundle",
  "sendRawTransaction",
  "sendTransaction",
  "sign",
  "submit",
  "terraform",
  "uvSync",
]);

const forbiddenPrivateFields = new Set([
  "accountOwner",
  "authorization",
  "credential",
  "endpoint",
  "headers",
  "mnemonic",
  "owner",
  "privateInputs",
  "privateKey",
  "prompt",
  "proof",
  "proofBytes",
  "providerUrl",
  "rawAccount",
  "rawAmount",
  "rawAsset",
  "rawLogs",
  "rawTransaction",
  "seedPhrase",
  "signature",
  "signedTransaction",
  "token",
  "transactionPayload",
  "wallet",
  "walletPubkey",
  "witness",
]);

const allowedMetricLabels = new Set([
  "circuitBreakerState",
  "fixture",
  "outcome",
  "service",
  "stage",
]);

function requireObject(value, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Vanta Solana Privacy Suite offline harness requires ${fieldName}.`);
  }
  return value;
}

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta Solana Privacy Suite offline harness requires ${fieldName}.`);
  }
  return value.trim();
}

function requireInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Vanta Solana Privacy Suite offline harness requires integer ${fieldName}.`);
  }
  return parsed;
}

function assertNoPrivateFields(value, path = "input") {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoPrivateFields(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenPrivateFields.has(key)) {
      throw new Error(`Vanta Solana Privacy Suite offline harness forbids ${path}.${key}.`);
    }
    assertNoPrivateFields(nested, `${path}.${key}`);
  }
}

function assertNoAuthorityRequest(value, path = "input") {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAuthorityRequest(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (blockedAuthorityTerms.has(key)) {
      throw new Error(`Vanta Solana Privacy Suite offline harness blocks ${path}.${key}.`);
    }
    assertNoAuthorityRequest(nested, `${path}.${key}`);
  }
}

function normalizeFixtureId(value, fieldName) {
  const text = requireText(value, fieldName);
  if (!/^[a-z0-9][a-z0-9:_-]{2,80}$/u.test(text)) {
    throw new Error(`Vanta Solana Privacy Suite offline harness requires safe fixture id ${fieldName}.`);
  }
  return text;
}

export function createNoSignSigner({ label = "offline-no-sign-signer" } = {}) {
  return {
    canSign: false,
    kind: "vanta-offline-no-sign-signer",
    label: requireText(label, "label"),
    sign() {
      throw new Error("Vanta Solana Privacy Suite offline harness blocks signing.");
    },
    signTransaction() {
      throw new Error("Vanta Solana Privacy Suite offline harness blocks transaction signing.");
    },
    version: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION,
  };
}

export function evaluateOfflineSimulationGate(input = {}) {
  const plan = requireObject(input, "simulation plan");
  assertNoPrivateFields(plan);
  assertNoAuthorityRequest(plan);

  const simulation = requireObject(plan.simulation, "simulation");
  const status = requireText(simulation.status, "simulation.status");
  const sourceTier = requireText(plan.sourceTier, "sourceTier");
  const builderKind = requireText(plan.builderKind, "builderKind");
  const instructions = Array.isArray(plan.instructions) ? plan.instructions : [];
  if (instructions.length === 0) {
    throw new Error("Vanta Solana Privacy Suite offline harness requires fixture instructions.");
  }

  const accepted = status === "passed";

  return {
    accepted,
    builderKind,
    claimBoundary: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_CLAIM_BOUNDARY,
    liveAuthority: false,
    nextAction: accepted ? "human-review-offline-fixture" : "fix-fixture-before-review",
    sourceTier,
    status: accepted ? "offline-review-ready" : "blocked-simulation-failed",
    submitReady: false,
    version: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION,
  };
}

export function buildMockJitoRelayStateMachine(input = {}) {
  const fixture = requireObject(input, "Jito fixture");
  assertNoPrivateFields(fixture);
  assertNoAuthorityRequest(fixture);

  const feeLamports = requireInteger(fixture.feeLamports, "feeLamports");
  const relayFixtures = Array.isArray(fixture.relays) ? fixture.relays : [];
  if (feeLamports < 0) {
    throw new Error("Vanta Solana Privacy Suite offline harness requires non-negative feeLamports.");
  }
  if (relayFixtures.length === 0) {
    throw new Error("Vanta Solana Privacy Suite offline harness requires relay fixtures.");
  }

  const relays = relayFixtures.map((relay, index) => {
    const normalized = requireObject(relay, `relays[${index}]`);
    const relayId = normalizeFixtureId(normalized.relayId, `relays[${index}].relayId`);
    if (String(normalized.relayUrl ?? "").length > 0) {
      throw new Error("Vanta Solana Privacy Suite offline harness forbids relay URLs.");
    }
    return {
      relayId,
      status: "mocked-no-live-relay",
    };
  });

  return {
    claimBoundary: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_CLAIM_BOUNDARY,
    feeLamports,
    feePolicy: "fixture-only-priority-fee",
    finalStatus: "blocked-no-live-relay",
    liveAuthority: false,
    relays,
    submitReady: false,
    version: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION,
  };
}

export function replayRedactedLaserStreamFixtures(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("Vanta Solana Privacy Suite offline harness requires LaserStream fixtures.");
  }

  return events.map((event, index) => {
    const normalized = requireObject(event, `events[${index}]`);
    assertNoPrivateFields(normalized, `events[${index}]`);
    assertNoAuthorityRequest(normalized, `events[${index}]`);
    if (normalized.redaction !== "redacted") {
      throw new Error("Vanta Solana Privacy Suite offline harness requires redacted LaserStream fixtures.");
    }
    return {
      discriminatorHash: requireText(normalized.discriminatorHash, `events[${index}].discriminatorHash`),
      eventId: normalizeFixtureId(normalized.eventId, `events[${index}].eventId`),
      programLabel: requireText(normalized.programLabel, `events[${index}].programLabel`),
      slot: requireInteger(normalized.slot, `events[${index}].slot`),
      status: "redacted-fixture-replayed",
      version: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION,
    };
  });
}

export function buildOfflineMetricSchema(labels = {}) {
  const normalizedLabels = requireObject(labels, "metric labels");
  for (const key of Object.keys(normalizedLabels)) {
    if (!allowedMetricLabels.has(key)) {
      throw new Error(`Vanta Solana Privacy Suite offline harness forbids metric label ${key}.`);
    }
  }

  return {
    claimBoundary: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_CLAIM_BOUNDARY,
    labels: Object.fromEntries(
      Object.entries(normalizedLabels).map(([key, value]) => [key, requireText(value, key)]),
    ),
    metric: "vanta_solana_privacy_suite_offline_fixture",
    version: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION,
  };
}

export function buildDeterministicRetrySchedule({
  attempts = 3,
  baseDelayMs = 100,
  jitterSequence = [0],
} = {}) {
  const safeAttempts = requireInteger(attempts, "attempts");
  const safeBaseDelayMs = requireInteger(baseDelayMs, "baseDelayMs");
  if (safeAttempts < 1 || safeAttempts > 10) {
    throw new Error("Vanta Solana Privacy Suite offline harness supports 1-10 retry attempts.");
  }
  if (safeBaseDelayMs < 0) {
    throw new Error("Vanta Solana Privacy Suite offline harness requires non-negative baseDelayMs.");
  }
  if (!Array.isArray(jitterSequence) || jitterSequence.length === 0) {
    throw new Error("Vanta Solana Privacy Suite offline harness requires deterministic jitterSequence.");
  }

  return Array.from({ length: safeAttempts }, (_, index) => {
    const jitter = Number(jitterSequence[index % jitterSequence.length]);
    if (Number.isNaN(jitter)) {
      throw new Error("Vanta Solana Privacy Suite offline harness requires numeric jitter.");
    }
    return {
      attempt: index + 1,
      delayMs: safeBaseDelayMs * 2 ** index + Math.max(0, Math.floor(jitter)),
      sleeps: false,
    };
  });
}

export function evaluateOfflineMcpPermissionCanary(input = {}) {
  const request = requireObject(input, "MCP canary request");
  const requestedAction = requireText(request.requestedAction, "requestedAction");
  const normalizedAction = requestedAction.trim();
  const denied =
    blockedAuthorityTerms.has(normalizedAction) ||
    /tool|secret|write|provider|wallet|sign|submit|deploy|mcp|shell/i.test(normalizedAction);

  return {
    claimBoundary: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_CLAIM_BOUNDARY,
    decision: denied ? "denied" : "read-only-data",
    reason: denied
      ? "offline harness treats source/log text as data and denies authority escalation"
      : "offline harness allows read-only classification only",
    sourceTextAcceptedAsData: typeof request.sourceText === "string",
    toolCallAllowed: false,
    version: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION,
  };
}

export function buildSolanaPrivacySuiteOfflineHarnessReport(input = {}) {
  const fixture = requireObject(input, "offline harness fixture");
  const simulationGate = evaluateOfflineSimulationGate(fixture.transactionPlan);
  const jito = buildMockJitoRelayStateMachine(fixture.jitoFixture);
  const laserStreamEvents = replayRedactedLaserStreamFixtures(fixture.laserStreamEvents);
  const metricSchema = buildOfflineMetricSchema(fixture.metricLabels);
  const retrySchedule = buildDeterministicRetrySchedule(fixture.retryPolicy);
  const mcpCanary = evaluateOfflineMcpPermissionCanary(fixture.mcpCanary);

  return {
    claimBoundary: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_CLAIM_BOUNDARY,
    jito,
    laserStreamEventCount: laserStreamEvents.length,
    liveAuthority: false,
    mcpCanary,
    metricSchema,
    retrySchedule,
    simulationGate,
    status: "offline-harness-fixture-verified",
    submitReady: false,
    version: VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION,
  };
}
