import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const requiredFiles = [
  {
    path: "src/pay/vantaPayRuntime.ts",
    markers: [
      "VANTA_PAY_CONTRACT_VERSION",
      "VANTA_PAY_STORE_SCHEMA_VERSION",
      "idempotencyKey",
      "refundedAmount",
      "Refund idempotency key conflicts",
      "Withdrawal idempotency key conflicts",
      "verifyVantaPayWebhookSignature",
      "toleranceSeconds",
      "createRefund",
      "createVantaPayRuntime",
    ],
  },
  {
    path: "src/pay/vantaPayPrivateSettlementAdapter.ts",
    markers: [
      "createVantaPayPrivateSettlementAdapter",
      "privatePoolOperatorAuthToken",
      "VantaPayPrivateSettlementAdapterArgs",
    ],
  },
  {
    path: "operator/pay-server.mjs",
    markers: [
      "VANTA_PAY_SECRET_KEY",
      "VANTA_PAY_WEBHOOK_SECRET",
      "VANTA_PAY_STORE_PATH",
      "VANTA_PAY_DATABASE_URL",
      "VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
      "GET /v1/status",
      "POST /v1/payment-links",
      "POST /v1/refunds",
      "/v1/webhook-events/deliver",
      "production webhook delivery requires an https endpoint",
      "productionDurableStoreRequired",
      "productionDatabaseRequired",
      "durableStoreConfigured",
      "createPostgresSnapshotStore",
      "productionHttpsWebhooks",
      "assertProductionSecrets",
    ],
  },
  {
    path: "src/storage/vantaPostgresSnapshotStore.mjs",
    markers: [
      "createPostgresSnapshotStore",
      "vanta_operator_snapshots",
      "postgres-jsonb-snapshot-store",
      "ON CONFLICT",
    ],
  },
  {
    path: "scripts/check-vanta-pay-merchant-api.mjs",
    markers: [
      "vanta-pay api production secret guard: PASS",
      "Expected checkout-session idempotency capability.",
      "Expected durable store configured capability.",
      "Expected missing production database URL error.",
      "vanta-pay api checkout idempotency: PASS",
      "vanta-pay api status: PASS",
      "Expected repeated checkout completion to return the existing payment.",
      "vanta-pay api payment links: PASS",
      "vanta-pay api refunds: PASS",
      "Expected payment detail to expose refunded amount.",
      "Expected repeated refund idempotency key to return the original refund.",
      "Expected repeated withdrawal idempotency key to return the original withdrawal.",
      "Expected refund idempotency key to persist after API restart.",
      "Expected withdrawal retry after API restart to return the persisted withdrawal.",
      "vanta-pay api persistence: PASS",
    ],
  },
  {
    path: "scripts/print-vanta-pay-status.mjs",
    markers: [
      "Vanta Pay status",
      "hostedCheckoutSessions",
      "productionReady",
      "webhookSignatures",
      "pay:verify",
    ],
  },
  {
    path: ".env.example",
    markers: [
      "VANTA_PAY_OPERATOR_PORT",
      "VANTA_PAY_SECRET_KEY",
      "VANTA_PAY_WEBHOOK_SECRET",
      "VANTA_PAY_STORE_PATH",
      "VANTA_PAY_DATABASE_URL",
      "VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL",
      "VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    ],
  },
];

const failures = [];

for (const file of requiredFiles) {
  const absolutePath = resolve(repoRoot, file.path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${file.path}`);
    continue;
  }

  const source = readFileSync(absolutePath, "utf8");
  for (const marker of file.markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${file.path}`);
    }
  }
}

const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
if (packageJson.scripts?.["pay:contract-check"] !== "node scripts/check-vanta-pay-contract.mjs") {
  failures.push("Missing package script pay:contract-check");
}

if (packageJson.scripts?.["pay:status"] !== "node scripts/print-vanta-pay-status.mjs") {
  failures.push("Missing package script pay:status");
}

if (packageJson.scripts?.["pay:status-json"] !== "node scripts/print-vanta-pay-status.mjs --json") {
  failures.push("Missing package script pay:status-json");
}

if (packageJson.scripts?.["pay:operator"] !== "node operator/pay-server.mjs") {
  failures.push("Missing package script pay:operator");
}

if (!String(packageJson.scripts?.["pay:verify"] ?? "").includes("pay:contract-check")) {
  failures.push("pay:verify must include pay:contract-check");
}

if (!String(packageJson.scripts?.["pay:verify"] ?? "").includes("pay:status")) {
  failures.push("pay:verify must include pay:status");
}

if (!String(packageJson.scripts?.["pay:verify"] ?? "").includes("pay:status-json")) {
  failures.push("pay:verify must include pay:status-json");
}

if (failures.length > 0) {
  console.error("Vanta Pay contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay contract check: PASS");
