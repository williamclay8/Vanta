import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInMemoryRateLimiter } from "../src/ops/vantaRateLimit.mjs";
import {
  createOperatorStartupTelemetryEvent,
  createSafeTelemetryRequestContext,
  observeSafeTelemetryResponse,
  writeSafeTelemetryEvent,
} from "../src/ops/vantaSafeTelemetry.mjs";
import {
  createNoopOperatorEventSink,
  createPostgresOperatorEventSinkFromDatabaseUrl,
} from "../src/ops/vantaOperatorEventSink.mjs";
import { createJsonSnapshotStore } from "../src/storage/vantaJsonSnapshotStore.mjs";
import { createPostgresSnapshotStore } from "../src/storage/vantaPostgresSnapshotStore.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const host = process.env.VANTA_PAY_OPERATOR_HOST ?? process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? process.env.VANTA_PAY_OPERATOR_PORT ?? "8798");
const rawSecretKey = process.env.VANTA_PAY_SECRET_KEY;
const rawWebhookSecret = process.env.VANTA_PAY_WEBHOOK_SECRET;
const databaseUrl = process.env.VANTA_PAY_DATABASE_URL;
const secretKey = rawSecretKey ?? "sk_test_vanta";
const webhookSecret = rawWebhookSecret ?? "whsec_test_vanta";
const privatePoolOperatorUrl = process.env.VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL;
const privatePoolOperatorAuthToken = process.env.VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN;
const rateLimitPerMinute = Number(process.env.VANTA_PAY_RATE_LIMIT_PER_MINUTE ?? "600");
const storePath = process.env.VANTA_PAY_STORE_PATH
  ? resolve(process.env.VANTA_PAY_STORE_PATH)
  : null;
const tempParent = resolve(repoRoot, ".tmp");
mkdirSync(tempParent, { recursive: true });
const tempRoot = mkdtempSync(resolve(tempParent, "vanta-pay-operator-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = [
  "pay/vantaPayTypes.ts",
  "pay/vantaPayRuntime.ts",
  "pay/vantaPayPrivateSettlementAdapter.ts",
  "privacy/protocolAdapter.ts",
  "privacy/umbraCapabilityProfile.ts",
  "privacy/privatePoolV2CapabilityProfile.ts",
  "privacy/privatePoolV2Types.ts",
  "privacy/privatePoolV2LocalIndexer.ts",
  "privacy/privatePoolV2LocalProver.ts",
  "privacy/privatePoolV2LocalRelayer.ts",
  "privacy/privatePoolV2LocalVerifierRegistry.ts",
  "privacy/privatePoolV2MockRuntime.ts",
  "privacy/privatePoolV2ProofRequests.ts",
  "privacy/privatePoolV2SettlementPolicy.ts",
];
const supportedAssets = new Set(["SOL", "USDC", "USDT"]);
const supportedDestinationTypes = new Set([
  "settlement_account",
  "treasury_address",
  "wallet_address",
]);
const supportedUiModes = new Set(["embedded", "hosted", "modal"]);

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (!rawSecretKey || rawSecretKey === "sk_test_vanta") {
    throw new Error("Vanta Pay production mode requires VANTA_PAY_SECRET_KEY.");
  }

  if (!rawWebhookSecret || rawWebhookSecret === "whsec_test_vanta") {
    throw new Error("Vanta Pay production mode requires VANTA_PAY_WEBHOOK_SECRET.");
  }

  if (!storePath && !databaseUrl) {
    throw new Error("Vanta Pay production mode requires VANTA_PAY_STORE_PATH or VANTA_PAY_DATABASE_URL.");
  }

  if (!privatePoolOperatorUrl) {
    throw new Error("Vanta Pay production mode requires VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL.");
  }

  if (!privatePoolOperatorAuthToken) {
    throw new Error("Vanta Pay production mode requires VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.");
  }
}

assertProductionSecrets();

function copySource(relativePath) {
  mkdirSync(join(tempTsDir, relativePath, ".."), { recursive: true });
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "((?:\.\.?\/)[^"]+)(?<!\.js)"/g,
    'from "$1.js"',
  );
  writeFileSync(filePath, source);
}

function compileRuntime() {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }
}

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

const rateLimiter = createInMemoryRateLimiter({ limit: rateLimitPerMinute });
const operatorEventSink = databaseUrl
  ? await createPostgresOperatorEventSinkFromDatabaseUrl({
      databaseUrl,
      service: "vanta-pay",
    })
  : createNoopOperatorEventSink({ service: "vanta-pay" });

async function appendOperatorEvent(input) {
  try {
    await operatorEventSink.append(input);
  } catch {
    // Observability must never widen request failure scope.
  }
}

function rateLimitKey(request, url) {
  return `${request.socket.remoteAddress ?? "unknown"}:${request.method}:${url.pathname}`;
}

async function enforceRateLimit(request, response, url, telemetryContext) {
  if (url.pathname === "/health") {
    return true;
  }

  const decision = rateLimiter.check(rateLimitKey(request, url));
  if (decision.allowed) {
    return true;
  }

  response.writeHead(429, {
    "Content-Type": "application/json",
    "Retry-After": String(Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000))),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
  });
  response.end(
    `${JSON.stringify(
      {
        error: "Vanta Pay API rate limit exceeded.",
        ok: false,
        resetAt: new Date(decision.resetAt).toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  await appendOperatorEvent({
    eventRef: `${telemetryContext.requestId}:${url.pathname}`,
    eventType: "rate_limit_rejected",
    payload: {
      limit: decision.limit,
      method: request.method,
      path: url.pathname,
      remaining: decision.remaining,
      requestId: telemetryContext.requestId,
      service: "vanta-pay",
    },
    severity: "warning",
  });
  return false;
}

function unauthorized(response) {
  sendJson(response, 401, {
    error: "Missing or invalid Vanta Pay API key.",
    ok: false,
  });
}

async function requireAuth(request, response, telemetryContext) {
  if (request.url === "/health") {
    return true;
  }

  const authorization = request.headers.authorization ?? "";
  if (authorization !== `Bearer ${secretKey}`) {
    await appendOperatorEvent({
      eventRef: `${telemetryContext.requestId}:${telemetryContext.path}`,
      eventType: "auth_rejected",
      payload: {
        method: request.method,
        path: telemetryContext.path,
        requestId: telemetryContext.requestId,
        service: "vanta-pay",
      },
      severity: "warning",
    });
    unauthorized(response);
    return false;
  }

  return true;
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta Pay API requires ${fieldName}.`);
  }

  return value.trim();
}

function requireSupportedValue(value, fieldName, supportedValues) {
  const parsed = requireNonEmptyString(value, fieldName);
  if (!supportedValues.has(parsed)) {
    throw new Error(`Vanta Pay API received unsupported ${fieldName}.`);
  }

  return parsed;
}

function requireLineItems(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Vanta Pay API requires at least one line item.");
  }

  return value.map((item) => ({
    name: requireNonEmptyString(item?.name, "line_items[].name"),
    quantity: Number(item?.quantity),
    unitAmount: requireNonEmptyString(
      item?.unit_amount ?? item?.unitAmount ?? item?.amount,
      "line_items[].unit_amount",
    ),
  }));
}

function toSessionInput(body) {
  const uiMode = body.ui_mode ?? body.uiMode ?? "hosted";
  return {
    amount: requireNonEmptyString(body.amount, "amount"),
    cancelUrl: requireNonEmptyString(body.cancel_url ?? body.cancelUrl, "cancel_url"),
    collectEmail: Boolean(body.collect_email ?? body.collectEmail),
    collectName: Boolean(body.collect_name ?? body.collectName),
    currency: requireSupportedValue(body.currency, "currency", supportedAssets),
    customerEmail: body.customer_email ?? body.customerEmail,
    idempotencyKey: body.idempotency_key ?? body.idempotencyKey ?? null,
    lineItems: requireLineItems(body.line_items ?? body.lineItems),
    merchantId: requireNonEmptyString(body.merchant_id ?? body.merchantId, "merchant_id"),
    metadata: body.metadata ?? {},
    mode: "payment",
    orderId: body.order_id ?? body.orderId,
    successUrl: requireNonEmptyString(body.success_url ?? body.successUrl, "success_url"),
    uiMode: requireSupportedValue(uiMode, "ui_mode", supportedUiModes),
  };
}

function toWithdrawalInput(body) {
  return {
    amount: requireNonEmptyString(body.amount, "amount"),
    asset: requireSupportedValue(body.asset, "asset", supportedAssets),
    destination: requireNonEmptyString(body.destination, "destination"),
    destinationType: requireSupportedValue(
      body.destination_type ?? body.destinationType,
      "destination_type",
      supportedDestinationTypes,
    ),
    idempotencyKey: body.idempotency_key ?? body.idempotencyKey ?? null,
    merchantId: requireNonEmptyString(body.merchant_id ?? body.merchantId, "merchant_id"),
    referenceNote: body.reference_note ?? body.referenceNote,
  };
}

function toInvoiceInput(body) {
  return {
    asset: requireSupportedValue(body.asset, "asset", supportedAssets),
    customerContact: requireNonEmptyString(
      body.customer_contact ?? body.customerContact,
      "customer_contact",
    ),
    customerName: requireNonEmptyString(body.customer_name ?? body.customerName, "customer_name"),
    dueDate: requireNonEmptyString(body.due_date ?? body.dueDate, "due_date"),
    invoiceNumber: requireNonEmptyString(
      body.invoice_number ?? body.invoiceNumber,
      "invoice_number",
    ),
    lineItems: requireLineItems(body.line_items ?? body.lineItems).map((item) => ({
      amount: item.unitAmount,
      name: item.name,
      quantity: item.quantity,
    })),
    merchantId: requireNonEmptyString(body.merchant_id ?? body.merchantId, "merchant_id"),
    notes: body.notes,
  };
}

function toPaymentLinkInput(body) {
  return {
    allowVariableAmount: Boolean(body.allow_variable_amount ?? body.allowVariableAmount),
    amount: requireNonEmptyString(body.amount, "amount"),
    asset: requireSupportedValue(body.asset, "asset", supportedAssets),
    collectEmail: Boolean(body.collect_email ?? body.collectEmail),
    collectName: Boolean(body.collect_name ?? body.collectName),
    description: requireNonEmptyString(body.description, "description"),
    linkName: requireNonEmptyString(body.link_name ?? body.linkName, "link_name"),
    merchantId: requireNonEmptyString(body.merchant_id ?? body.merchantId, "merchant_id"),
    redirectUrl: body.redirect_url ?? body.redirectUrl,
  };
}

function toRefundInput(body) {
  return {
    amount: requireNonEmptyString(body.amount, "amount"),
    idempotencyKey: body.idempotency_key ?? body.idempotencyKey ?? null,
    merchantId: requireNonEmptyString(body.merchant_id ?? body.merchantId, "merchant_id"),
    paymentId: requireNonEmptyString(body.payment_id ?? body.paymentId, "payment_id"),
    reason: body.reason,
  };
}

function toWebhookDeliveryInput(body) {
  const endpoint = requireNonEmptyString(body.endpoint, "endpoint");
  if (process.env.NODE_ENV === "production") {
    const parsedEndpoint = new URL(endpoint);
    if (parsedEndpoint.protocol !== "https:") {
      throw new Error("Vanta Pay production webhook delivery requires an https endpoint.");
    }
  }

  return {
    endpoint,
    maxAttempts: Number(body.max_attempts ?? body.maxAttempts ?? 3),
  };
}

compileRuntime();

const {
  VANTA_PAY_CONTRACT_VERSION,
  VANTA_PAY_STORE_SCHEMA_VERSION,
  createVantaPayRuntime,
} = await import(pathToFileURL(join(tempJsDir, "pay/vantaPayRuntime.js")).href);
const { createVantaPayPrivateSettlementAdapter } = await import(
  pathToFileURL(join(tempJsDir, "pay/vantaPayPrivateSettlementAdapter.js")).href
);
const defaultSnapshot = { stateVersion: VANTA_PAY_STORE_SCHEMA_VERSION };
const snapshotStore = databaseUrl
  ? await createPostgresSnapshotStore({
      databaseUrl,
      defaultSnapshot,
      stateVersion: VANTA_PAY_STORE_SCHEMA_VERSION,
      storeKey: "vanta-pay",
    })
  : createJsonSnapshotStore({
      allowInProduction: process.env.NODE_ENV === "production",
      defaultSnapshot,
      path: storePath,
      stateVersion: VANTA_PAY_STORE_SCHEMA_VERSION,
    });
const runtime = createVantaPayRuntime({ snapshot: await snapshotStore.load() });
const settlementAdapter = createVantaPayPrivateSettlementAdapter({
  privatePoolOperatorAuthToken,
  privatePoolOperatorUrl,
});

async function saveRuntimeSnapshot() {
  await snapshotStore.save(runtime.snapshot());
}

const server = createServer(async (request, response) => {
  const telemetryContext = createSafeTelemetryRequestContext({
    request,
    service: "vanta-pay",
  });
  observeSafeTelemetryResponse({
    context: telemetryContext,
    response,
  });

  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (!(await enforceRateLimit(request, response, url, telemetryContext))) {
      return;
    }

    if (!(await requireAuth(request, response, telemetryContext))) {
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true, service: "vanta-pay" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/status") {
      sendJson(response, 200, {
        capabilities: {
          browserCheckoutVerification: true,
          databaseAdapterSeam: true,
          hostedCheckoutSessions: true,
          durableStoreConfigured: Boolean(storePath || databaseUrl),
          idempotency: {
            checkoutCompletion: true,
            checkoutSessions: true,
            refunds: true,
            withdrawals: true,
          },
          paymentLinkCreation: true,
          privateExitWithdrawalRequired: true,
          privatePoolOperatorConfigured: Boolean(privatePoolOperatorUrl),
          privateRailCompletionRequired: true,
          productionDurableStoreRequired: true,
          productionHttpsWebhooks: true,
          rateLimits: "in-memory-per-process",
          requestValidation: "fail-closed",
          webhookDeliveryRetries: true,
          webhookSignatures: "t-v1-hmac-sha256",
        },
        contractVersion: VANTA_PAY_CONTRACT_VERSION,
        endpoints: [
          "GET /v1/status",
          "POST /v1/checkout/sessions",
          "GET /v1/checkout/sessions/{id}",
          "POST /v1/checkout/sessions/{id}/complete",
          "GET /v1/payments",
          "GET /v1/payments/{id}",
          "GET /v1/receipts",
          "GET /v1/receipts/{id}",
          "POST /v1/refunds",
          "GET /v1/refunds",
          "GET /v1/balances",
          "POST /v1/withdrawals",
          "GET /v1/withdrawals",
          "POST /v1/invoices",
          "GET /v1/invoices",
          "POST /v1/payment-links",
          "GET /v1/payment-links",
          "GET /v1/webhook-events",
          "POST /v1/webhook-events/deliver",
          "GET /v1/webhook-deliveries",
        ],
        object: "vanta_pay_operator_status",
        service: "vanta-pay",
        storage: {
          auditEventSinkKind: operatorEventSink.kind,
          durableStoreConfigured: Boolean(storePath || databaseUrl),
          kind: snapshotStore.kind,
          path: snapshotStore.path,
          productionReady: snapshotStore.productionReady,
        },
        storeSchemaVersion: VANTA_PAY_STORE_SCHEMA_VERSION,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const body = await readRequestBody(request);
      const session = runtime.createCheckoutSession(toSessionInput(body));
      await saveRuntimeSnapshot();
      sendJson(response, 200, session);
      return;
    }

    const sessionCompleteMatch = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)\/complete$/);
    if (request.method === "POST" && sessionCompleteMatch) {
      const session = runtime.getCheckoutSession(sessionCompleteMatch[1]);
      if (!session) {
        sendJson(response, 404, { error: "Checkout session not found." });
        return;
      }

      const privateRailReceipt = await settlementAdapter.settleCheckoutSession({ session });
      runtime.registerPrivateRailReceipt(privateRailReceipt);
      const completion = runtime.completeCheckoutSession(session.id, {
        privateRailReceiptId: privateRailReceipt.id,
      });
      await saveRuntimeSnapshot();
      sendJson(response, 200, completion);
      return;
    }

    const sessionMatch = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)$/);
    if (request.method === "GET" && sessionMatch) {
      const session = runtime.getCheckoutSession(sessionMatch[1]);
      sendJson(response, session ? 200 : 404, session ?? { error: "Checkout session not found." });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/payments") {
      sendJson(response, 200, { data: runtime.listPayments() });
      return;
    }

    const paymentMatch = url.pathname.match(/^\/v1\/payments\/([^/]+)$/);
    if (request.method === "GET" && paymentMatch) {
      const payment = runtime.getPayment(paymentMatch[1]);
      sendJson(response, payment ? 200 : 404, payment ?? { error: "Payment not found." });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/receipts") {
      sendJson(response, 200, { data: runtime.listReceipts() });
      return;
    }

    const receiptMatch = url.pathname.match(/^\/v1\/receipts\/([^/]+)$/);
    if (request.method === "GET" && receiptMatch) {
      const receipt = runtime.getReceipt(receiptMatch[1]);
      sendJson(response, receipt ? 200 : 404, receipt ?? { error: "Receipt not found." });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/refunds") {
      sendJson(response, 200, { data: runtime.listRefunds() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/refunds") {
      const body = await readRequestBody(request);
      const refund = runtime.createRefund(toRefundInput(body));
      await saveRuntimeSnapshot();
      sendJson(response, 200, refund);
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/withdrawals") {
      sendJson(response, 200, { data: runtime.listWithdrawals() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/withdrawals") {
      const body = await readRequestBody(request);
      const input = toWithdrawalInput(body);
      if (input.idempotencyKey) {
        const existingWithdrawal = runtime.listWithdrawals().find(
          (withdrawal) =>
            withdrawal.merchantId === input.merchantId &&
            withdrawal.idempotencyKey === input.idempotencyKey,
        );
        if (existingWithdrawal) {
          if (
            existingWithdrawal.amount !== Number(input.amount).toFixed(2) ||
            existingWithdrawal.asset !== input.asset ||
            existingWithdrawal.destination !== input.destination ||
            existingWithdrawal.destinationType !== input.destinationType ||
            existingWithdrawal.referenceNote !== (input.referenceNote ?? null)
          ) {
            throw new Error(
              "Withdrawal idempotency key conflicts with existing withdrawal inputs.",
            );
          }

          sendJson(response, 200, existingWithdrawal);
          return;
        }
      }
      const privateExitReceipt = await settlementAdapter.settleWithdrawal({
        amount: input.amount,
        asset: input.asset,
        destination: input.destination,
        merchantId: input.merchantId,
      });
      runtime.registerPrivateExitReceipt(privateExitReceipt);
      const withdrawal = runtime.createWithdrawal({
        ...input,
        privateExitReceiptId: privateExitReceipt.id,
      });
      await saveRuntimeSnapshot();
      sendJson(response, 200, withdrawal);
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/balances") {
      sendJson(response, 200, runtime.getBalances());
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/invoices") {
      sendJson(response, 200, { data: runtime.listInvoices() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/invoices") {
      const body = await readRequestBody(request);
      const invoice = runtime.createInvoice(toInvoiceInput(body));
      await saveRuntimeSnapshot();
      sendJson(response, 200, invoice);
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/payment-links") {
      sendJson(response, 200, { data: runtime.listPaymentLinks() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/payment-links") {
      const body = await readRequestBody(request);
      const paymentLink = runtime.createPaymentLink(toPaymentLinkInput(body));
      await saveRuntimeSnapshot();
      sendJson(response, 200, paymentLink);
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/webhook-events") {
      sendJson(response, 200, {
        data: runtime.listWebhookEvents().map((event) => {
          const signed = runtime.signWebhookEvent(event, webhookSecret);
          return {
            event,
            payload: signed.payload,
            signature: signed.signatureHeader,
          };
        }),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/webhook-events/deliver") {
      const body = await readRequestBody(request);
      const input = toWebhookDeliveryInput(body);
      const deliveries = await runtime.deliverWebhookEvents({
        endpoint: input.endpoint,
        maxAttempts: input.maxAttempts,
        secret: webhookSecret,
        send: async ({ payload, signatureHeader }) => {
          const deliveryResponse = await fetch(input.endpoint, {
            body: payload,
            headers: {
              "Content-Type": "application/json",
              "Vanta-Signature": signatureHeader,
            },
            method: "POST",
          });

          return {
            ok: deliveryResponse.ok,
            status: deliveryResponse.status,
          };
        },
      });
      await saveRuntimeSnapshot();
      sendJson(response, 200, { data: deliveries });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/webhook-deliveries") {
      sendJson(response, 200, { data: runtime.listWebhookDeliveries() });
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    });
  }
});

server.listen(port, host, () => {
  writeSafeTelemetryEvent(
    createOperatorStartupTelemetryEvent({
      service: "vanta-pay",
      storageKind: snapshotStore.kind,
    }),
  );
  void appendOperatorEvent({
    eventRef: `startup:${port}`,
    eventType: "operator_started",
    payload: {
      rateLimiterKind: rateLimiter.kind,
      service: "vanta-pay",
      storageKind: snapshotStore.kind,
    },
    severity: "info",
  });
});

function shutdown() {
  server.close(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
