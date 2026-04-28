import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";

const port = 18996;
const baseUrl = `http://127.0.0.1:${port}`;
const authToken = "strategy-operator-runtime-check-token";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnOperator(extraEnv = {}) {
  return spawn(process.execPath, ["operator/strategy-runtime-server.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      VANTA_STRATEGY_OPERATOR_AUTH_TOKEN: authToken,
      VANTA_STRATEGY_OPERATOR_HOST: "127.0.0.1",
      VANTA_STRATEGY_OPERATOR_LIVE_SUBMISSION: "false",
      VANTA_STRATEGY_OPERATOR_PORT: String(port),
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function requestJson(path, { body, expectedStatus = 200, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    method,
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}

async function waitForHealth(child) {
  let lastError;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Strategy operator exited before health check with code ${child.exitCode}.`);
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }

    await delay(50);
  }

  throw lastError ?? new Error("Strategy operator did not become healthy.");
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const strategyInput = {
  clientRequestId: "strategy-operator-runtime-check-1",
  destination: "Vanta private balance",
  fundingSource: "Vanta private balance",
  landingMode: "Protected landing",
  maxSlippageBps: 50,
  mode: "Stealth DCA",
  pair: "USDC -> SOL",
  seed: "strategy-operator-runtime-check",
  side: "Buy",
  slicePolicy: "Randomized sizing",
  timingPolicy: "Randomized cadence",
  timeWindow: "6 hours",
  totalNotional: 60000,
  urgency: "Low footprint",
};

const operatorHandoff = {
  liveSubmission: false,
  operatorPackets: [{ privateCoreBoundary: "local-private-core-send-swap-composition-v0" }],
  operatorPlaintextStrategyShared: false,
  privateRailBoundary: "local-private-core-send-swap-composition-v0",
  trustContract: {
    claimControls: {
      fullyPrivateStrategyClaim: false,
      productionPrivacyClaimsLocked: true,
    },
    currentTruth: "hash-bound proof-public Strategy rail preview",
    operatorPacketFields: [],
    redactedFields: [],
    verificationSurfaces: [],
    version: "vanta-strategy-private-rail-trust-contract-0.1",
  },
  version: "vanta-strategy-private-rail-operator-handoff-0.1",
};

const committedSettlementRequests = {
  liveSubmission: false,
  requests: [
    {
      action: "send",
      economicsMode: "committed-economics",
      quoteHandleCommitment: "0x3333333333333333333333333333333333333333333333333333333333333333",
      routeHandleCommitment: "0x1111111111111111111111111111111111111111111111111111111111111111",
      settlementId: "strategy-operator-runtime-check-send",
    },
    {
      action: "swap",
      economicsMode: "committed-economics",
      quoteHandleCommitment: "0x2222222222222222222222222222222222222222222222222222222222222222",
      routeHandleCommitment: "0x4444444444444444444444444444444444444444444444444444444444444444",
      settlementId: "strategy-operator-runtime-check-swap",
    },
  ],
  version: "vanta-strategy-private-rail-committed-settlement-0.1",
};

const child = spawnOperator();
const stdoutPromise = readStream(child.stdout);
const stderrPromise = readStream(child.stderr);

try {
  const health = await waitForHealth(child);
  assert.equal(health.ok, true);
  assert.equal(health.liveSubmission, false);

  const initialStatus = await requestJson("/state/strategy-runtime-status");
  assert.equal(initialStatus.kind, "vanta-strategy-operator-runtime-status");
  assert.equal(initialStatus.auditEventSink.kind, "noop-operator-event-sink");
  assert.equal(initialStatus.auditEventSink.productionReady, false);
  assert.equal(initialStatus.auditEventSink.service, "vanta-strategy");
  assert.equal(initialStatus.liveSubmission, false);
  assert.equal(initialStatus.readyForLivePrivateStrategyExecution, false);
  assert.equal(initialStatus.readiness.fullyPrivateStrategyClaimAllowed, false);
  assert.equal(initialStatus.readiness.localCapabilities.routeQuotePrivacyEvidenceReady, true);
  assert.equal(initialStatus.productionServiceReadiness.productionReady, false);
  assert.equal(initialStatus.productionServiceReadiness.liveSubmissionAllowed, false);
  assert.ok(
    initialStatus.productionServiceReadiness.blockers.includes(
      "missing-env-ref:VANTA_STRATEGY_DATABASE_URL_REF",
    ),
  );
  assert.ok(initialStatus.readiness.blockers.includes("live-strategy-scheduler"));

  const strategy = await requestJson("/strategy/runtime/strategies", {
    body: strategyInput,
    expectedStatus: 201,
    method: "POST",
  });
  assert.equal(strategy.object, "strategy");
  assert.equal(strategy.status, "ready");

  const operatorRunInput = {
    committedSettlementRequests,
    operatorHandoff,
    strategyId: strategy.id,
  };
  const operatorRun = await requestJson("/strategy/runtime/private-rail/operator-runs", {
    body: operatorRunInput,
    expectedStatus: 202,
    method: "POST",
  });
  assert.equal(operatorRun.object, "strategy_private_rail_operator_run");
  assert.equal(operatorRun.status, "queued");
  assert.equal(operatorRun.liveSubmission, false);
  assert.equal(operatorRun.operatorPlaintextStrategyShared, false);
  assert.equal(operatorRun.committedSettlementRequestCount, 2);
  assert.equal(operatorRun.schedulerQueueStatus, "queued-local-preview");

  const replayedOperatorRun = await requestJson("/strategy/runtime/private-rail/operator-runs", {
    body: operatorRunInput,
    expectedStatus: 202,
    method: "POST",
  });
  assert.equal(replayedOperatorRun.id, operatorRun.id);

  const operatorRuns = await requestJson("/strategy/runtime/private-rail/operator-runs");
  assert.equal(operatorRuns.operatorRuns.length, 1);

  const schedulerDrainPreview = await requestJson("/strategy/runtime/private-rail/scheduler/drain-preview", {
    method: "POST",
  });
  assert.equal(schedulerDrainPreview.object, "strategy_private_rail_scheduler_drain_preview");
  assert.equal(schedulerDrainPreview.liveSubmission, false);
  assert.equal(schedulerDrainPreview.status, "blocked_before_live_submission");
  assert.equal(schedulerDrainPreview.queueDepth, 1);
  assert.deepEqual(schedulerDrainPreview.operatorRunIds, [operatorRun.id]);
  assert.equal(schedulerDrainPreview.durableStorage.status, "local-in-memory-only");
  assert.equal(schedulerDrainPreview.durableStorage.productionReady, false);
  assert.equal(schedulerDrainPreview.drainPreview[0].wouldSubmitLive, false);

  const rejected = await requestJson("/strategy/runtime/private-rail/operator-runs", {
    body: {
      ...operatorRunInput,
      committedSettlementRequests: {
        ...committedSettlementRequests,
        requests: [
          {
            action: "send",
            amount: "1.00",
            economicsMode: "committed-economics",
            settlementId: "raw-amount-leak",
          },
        ],
      },
    },
    expectedStatus: 400,
    method: "POST",
  });
  assert.match(rejected.error, /rejects raw amount/u);

  const rejectedRawRoute = await requestJson("/strategy/runtime/private-rail/operator-runs", {
    body: {
      ...operatorRunInput,
      committedSettlementRequests: {
        ...committedSettlementRequests,
        requests: [
          {
            action: "swap",
            economicsMode: "committed-economics",
            quoteHandleCommitment:
              "0x5555555555555555555555555555555555555555555555555555555555555555",
            route: "Jupiter",
            routeHandleCommitment:
              "0x6666666666666666666666666666666666666666666666666666666666666666",
            settlementId: "raw-route-leak",
          },
        ],
      },
    },
    expectedStatus: 400,
    method: "POST",
  });
  assert.match(rejectedRawRoute.error, /rejects raw route/u);

  const rejectedMalformedCommitment = await requestJson(
    "/strategy/runtime/private-rail/operator-runs",
    {
      body: {
        ...operatorRunInput,
        committedSettlementRequests: {
          ...committedSettlementRequests,
          requests: [
            {
              action: "send",
              economicsMode: "committed-economics",
              quoteHandleCommitment:
                "0x7777777777777777777777777777777777777777777777777777777777777777",
              routeHandleCommitment: "not-a-commitment",
              settlementId: "bad-route-commitment",
            },
          ],
        },
      },
      expectedStatus: 400,
      method: "POST",
    },
  );
  assert.match(rejectedMalformedCommitment.error, /requires routeHandleCommitment/u);

  const finalStatus = await requestJson("/state/strategy-runtime-status");
  assert.equal(finalStatus.strategyCount, 1);
  assert.equal(finalStatus.auditEventSink.kind, "noop-operator-event-sink");
  assert.equal(finalStatus.privateRailOperatorRunCount, 1);
  assert.equal(finalStatus.scheduler.queueDepth, 1);
  assert.equal(finalStatus.scheduler.liveSubmission, false);
  assert.equal(finalStatus.durableStorage.status, "local-in-memory-only");
  assert.equal(finalStatus.durableStorage.productionReady, false);
  assert.equal(finalStatus.productionServiceReadiness.durableProductionServiceReady, false);
  assert.equal(finalStatus.readyForLivePrivateStrategyExecution, false);
} finally {
  child.kill("SIGTERM");
  await Promise.allSettled([stdoutPromise, stderrPromise]);
}

console.log("Vanta Strategy operator runtime check: PASS");
