import { createServer } from "node:http";
import { createVantaStrategyRuntime } from "../src/strategy/strategyRuntime.mjs";
import { createStrategyPrivateRailPrivacyReadiness } from "../src/strategy/strategyPrivateRailReadiness.mjs";
import { createStrategyProductionServiceReadiness } from "../src/strategy/strategyProductionServiceReadiness.mjs";
import { createNoopOperatorEventSink } from "../src/ops/vantaOperatorEventSink.mjs";
import {
  createSafeTelemetryRequestContext,
  observeSafeTelemetryResponse,
} from "../src/ops/vantaSafeTelemetry.mjs";

const host = process.env.VANTA_STRATEGY_OPERATOR_HOST ?? process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? process.env.VANTA_STRATEGY_OPERATOR_PORT ?? "8796");
const operatorAuthToken = process.env.VANTA_STRATEGY_OPERATOR_AUTH_TOKEN;
const privatePoolV2OperatorUrl = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL;
const privatePoolV2OperatorAuthToken = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN;
const liveSubmission = process.env.VANTA_STRATEGY_OPERATOR_LIVE_SUBMISSION === "true";

if (liveSubmission) {
  throw new Error("Strategy operator runtime keeps live submission disabled until privacy readiness gates pass.");
}

if (process.env.NODE_ENV === "production") {
  if (!operatorAuthToken) {
    throw new Error("Strategy operator production mode requires VANTA_STRATEGY_OPERATOR_AUTH_TOKEN.");
  }

  if (!privatePoolV2OperatorUrl || !privatePoolV2OperatorAuthToken) {
    throw new Error(
      "Strategy operator production mode requires Private Pool v2 operator URL and auth token.",
    );
  }
}

const runtime = createVantaStrategyRuntime();
const auditEventSink = createNoopOperatorEventSink({ service: "vanta-strategy" });

function normalizeForJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForJson(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeForJson(nestedValue)]),
    );
  }

  return value;
}

function readRequestBody(request) {
  return new Promise((resolvePromise, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });
    request.on("end", () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(`${JSON.stringify(normalizeForJson(payload), null, 2)}\n`);
}

function requireAuth(request, response, url) {
  if (url.pathname === "/health" || !operatorAuthToken) {
    return true;
  }

  if (request.headers.authorization !== `Bearer ${operatorAuthToken}`) {
    sendJson(response, 401, { error: "Strategy operator authentication required.", ok: false });
    return false;
  }

  return true;
}

function createStatusPayload() {
  const productionServiceReadiness = createStrategyProductionServiceReadiness({
    localOperatorQueueReady: true,
    schedulerDrainPreviewReady: true,
  });
  const readiness = createStrategyPrivateRailPrivacyReadiness({
    committedSettlementRequestReady: true,
    durableProductionServicesReady: false,
    independentAuditReady: false,
    liveMainnetSettlementReady: false,
    liveStrategySchedulerReady: false,
    productionAnonymitySetReady: false,
    redactedHandoffReady: true,
    relayerSeparationReady: Boolean(privatePoolV2OperatorUrl && privatePoolV2OperatorAuthToken),
    routeQuotePrivacyEvidenceReady: true,
  });
  const schedulerDrainPreview = runtime.createPrivateRailSchedulerDrainPreview();

  return {
    durableStorage: schedulerDrainPreview.durableStorage,
    auditEventSink: {
      kind: auditEventSink.kind,
      productionReady: auditEventSink.productionReady,
      service: auditEventSink.service,
    },
    kind: "vanta-strategy-operator-runtime-status",
    liveSubmission: false,
    privatePoolV2OperatorConfigured: Boolean(privatePoolV2OperatorUrl),
    readyForLivePrivateStrategyExecution: false,
    readiness,
    productionServiceReadiness,
    scheduler: {
      drainPreviewStatus: schedulerDrainPreview.status,
      liveSubmission: false,
      queueDepth: schedulerDrainPreview.queueDepth,
    },
    strategyCount: runtime.listStrategies().length,
    privateRailOperatorRunCount: runtime.listPrivateRailOperatorRuns().length,
    version: runtime.version,
  };
}

async function handleRequest(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (!requireAuth(request, response, url)) {
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "vanta-strategy-operator",
        liveSubmission: false,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/state/strategy-runtime-status") {
      sendJson(response, 200, createStatusPayload());
      return;
    }

    if (request.method === "GET" && url.pathname === "/strategy/runtime/strategies") {
      sendJson(response, 200, { strategies: runtime.listStrategies() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/strategy/runtime/strategies") {
      const strategy = runtime.createStrategy(await readRequestBody(request));
      await auditEventSink.append({
        eventRef: strategy.id,
        eventType: "strategy_created",
        payload: {
          liveSubmission: false,
          status: strategy.status,
          strategyId: strategy.id,
        },
        severity: "info",
      });
      sendJson(response, 201, strategy);
      return;
    }

    const strategyMatch = url.pathname.match(/^\/strategy\/runtime\/strategies\/([^/]+)(?:\/([^/]+))?$/u);
    if (strategyMatch) {
      const [, strategyId, action] = strategyMatch;

      if (request.method === "GET" && !action) {
        sendJson(response, 200, runtime.getStrategy(strategyId));
        return;
      }

      if (request.method === "POST" && action === "start") {
        sendJson(response, 200, runtime.startStrategy(strategyId));
        return;
      }

      if (request.method === "POST" && action === "pause") {
        sendJson(response, 200, runtime.pauseStrategy(strategyId));
        return;
      }

      if (request.method === "POST" && action === "cancel") {
        sendJson(response, 200, runtime.cancelStrategy(strategyId));
        return;
      }
    }

    if (request.method === "GET" && url.pathname === "/strategy/runtime/private-rail/operator-runs") {
      sendJson(response, 200, { operatorRuns: runtime.listPrivateRailOperatorRuns() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/strategy/runtime/private-rail/operator-runs") {
      const operatorRun = runtime.createPrivateRailOperatorRun(await readRequestBody(request));
      await auditEventSink.append({
        eventRef: operatorRun.id,
        eventType: "strategy_private_rail_operator_run_queued",
        payload: {
          committedSettlementRequestCount: operatorRun.committedSettlementRequestCount,
          liveSubmission: operatorRun.liveSubmission,
          operatorPlaintextStrategyShared: operatorRun.operatorPlaintextStrategyShared,
          operatorRunId: operatorRun.id,
          status: operatorRun.status,
        },
        severity: "info",
      });
      sendJson(response, 202, operatorRun);
      return;
    }

    if (request.method === "POST" && url.pathname === "/strategy/runtime/private-rail/scheduler/drain-preview") {
      sendJson(response, 200, runtime.createPrivateRailSchedulerDrainPreview());
      return;
    }

    sendJson(response, 404, { error: "Strategy operator route not found.", ok: false });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Strategy operator request failed.",
      ok: false,
    });
  }
}

const server = createServer((request, response) => {
  const context = createSafeTelemetryRequestContext({
    request,
    service: "vanta-strategy",
  });
  observeSafeTelemetryResponse({
    context,
    response,
  });
  void handleRequest(request, response);
});

server.listen(port, host, () => {
  console.log(`Vanta Strategy operator listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
