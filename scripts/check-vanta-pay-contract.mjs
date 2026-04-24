import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createVantaPayMerchantControlPlane,
  createVantaPayMerchantControlPlaneFromRuntime,
} from "../src/pay/vantaPayMerchantControlPlane.ts";

const repoRoot = resolve(import.meta.dirname, "..");

const requiredFiles = [
  {
    path: "src/pay/vantaPayTypes.ts",
    markers: [
      "VantaPayMerchantControlPlane",
      "VantaPayMerchantTrustStatus",
      "vanta-pay-merchant-trust-status-0.1",
    ],
  },
  {
    path: "src/pay/vantaPayMerchantControlPlane.ts",
    markers: [
      "createVantaPayMerchantControlPlane",
      "merchantControlPlaneVersion",
      "approvalPhase",
      "reconciliation",
    ],
  },
  {
    path: "src/pay/vantaPayMerchantTrustStatus.ts",
    markers: [
      "getVantaPayMerchantTrustStatus",
      "vanta-pay-merchant-trust-status-0.1",
      "controlled-privacy",
      "legible-trust",
    ],
  },
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
    path: "scripts/print-vanta-pay-merchant-trust-status.mjs",
    markers: [
      "Vanta Pay Merchant Trust Status",
      "vanta-pay-merchant-trust-status-0.1",
      "controlled-privacy",
      "legible-trust",
    ],
  },
  {
    path: "scripts/check-vanta-pay-merchant-trust-status.mjs",
    markers: [
      "vanta-pay merchant trust status check: PASS",
      "pay:merchant-trust-status",
      "vanta-pay-merchant-trust-status-0.1",
    ],
  },
  {
    path: "src/pay/vantaPayApprovalPacket.ts",
    markers: [
      "buildVantaPayApprovalPacket",
      "vanta-pay-approval-packet-0.1",
      "preview",
      "approve",
      "execute",
      "settle",
      "legible-trust",
    ],
  },
  {
    path: "scripts/check-vanta-pay-approval-packet.mjs",
    markers: [
      "Vanta Pay approval packet check: PASS",
      "vanta-pay-approval-packet-0.1",
      "walletApprovalRequired",
      "simulationRequired",
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

const payTypesSource = readFileSync(resolve(repoRoot, "src/pay/vantaPayTypes.ts"), "utf8");
if (!payTypesSource.includes("export type VantaPayMerchantControlPlane =")) {
  failures.push("Missing VantaPayMerchantControlPlane type declaration in src/pay/vantaPayTypes.ts");
}

try {
  if (createVantaPayMerchantControlPlane.length !== 0) {
    failures.push("createVantaPayMerchantControlPlane must be zero-arg");
    throw new Error("zero-arg contract mismatch");
  }

  const controlPlane = createVantaPayMerchantControlPlane();
  if (controlPlane.approvalPhase !== "preview") {
    failures.push("Expected preview approval phase from the zero-arg control plane builder.");
  }
  if (controlPlane.payoutQueue.nextWindow !== "Today · 16:00 UTC") {
    failures.push("Expected public payoutQueue.nextWindow string on the control plane builder.");
  }
  if (controlPlane.reconciliation.exportWindow !== "2026-04-23 · 00:00-12:00 UTC") {
    failures.push("Expected public reconciliation.exportWindow string on the control plane builder.");
  }
  if (typeof controlPlane.payoutQueue.nextWindow !== "string") {
    failures.push("Expected payoutQueue.nextWindow to be a string.");
  }
  if (typeof controlPlane.reconciliation.exportWindow !== "string") {
    failures.push("Expected reconciliation.exportWindow to be a string.");
  }
  if (controlPlane.reconciliation.recordsLabel !== "0 receipt records") {
    failures.push("Expected reconciliation.recordsLabel to derive from the default runtime receipts.");
  }

  const runtimeControlPlane = createVantaPayMerchantControlPlaneFromRuntime({
    getBalances() {
      return {
        available: [{ amount: "5.00", asset: "USDC" }],
        pending: [],
        withdrawable: [{ amount: "5.00", asset: "USDC" }],
      };
    },
    getMerchant() {
      return {
        acceptedAssets: ["USDC", "SOL", "USDT"],
        branding: {
          logoUrl: "https://merchant.com/logo.png",
          name: "Vanta Studio",
        },
        callbackUrls: {
          cancelUrl: "https://merchant.com/cancel",
          successUrl: "https://merchant.com/success",
          webhookUrl: "https://merchant.com/webhooks/vanta",
        },
        environmentMode: "test",
        id: "mrc_123",
        object: "merchant",
        payoutSettings: {
          defaultAsset: "USDC",
          destination: "Treasury",
          destinationType: "treasury_address",
        },
      };
    },
    getMerchantControlPlaneState() {
      return {
        approvalPhase: "settle",
        payoutQueue: {
          nextWindow: {
            cadence: "daily",
            label: "Tomorrow",
            targetTimeUtc: "18:30",
            timezone: "UTC",
          },
        },
        reconciliation: {
          exportWindow: {
            date: "2026-04-24",
            endUtc: "05:00",
            startUtc: "01:00",
            timezone: "UTC",
          },
        },
      };
    },
    listReceipts() {
      return [
        {
          amount: "12.34",
          asset: "USDC",
          auditDisclosureId: "aud_test",
          checkoutSessionId: "cs_test",
          createdAt: "2026-04-23T00:00:00.000Z",
          customerEmail: null,
          id: "rcpt_test",
          invoiceReference: null,
          merchantId: "mrc_123",
          object: "receipt",
          orderId: null,
          paymentId: "pay_test",
          privateRailReceiptId: "prail_test",
          status: "paid",
        },
      ];
    },
    listRefunds() {
      return [
        {
          amount: "2.00",
          asset: "USDC",
          createdAt: "2026-04-23T00:00:00.000Z",
          id: "rfnd_test",
          idempotencyKey: "refund_test",
          merchantId: "mrc_123",
          object: "refund",
          paymentId: "pay_test",
          reason: "test",
          status: "refunded",
        },
      ];
    },
    listWithdrawals() {
      return [
        {
          amount: "1.00",
          asset: "USDC",
          createdAt: "2026-04-23T00:00:00.000Z",
          destination: "Treasury",
          destinationType: "treasury_address",
          id: "wdr_test",
          idempotencyKey: "withdrawal_test",
          merchantId: "mrc_123",
          object: "withdrawal",
          privateExitReceiptId: "pexit_test",
          referenceNote: "test",
          status: "completed",
        },
      ];
    },
  });

  if (runtimeControlPlane.approvalPhase !== "settle") {
    failures.push("Expected runtime-derived approvalPhase from the control plane helper.");
  }
  if (runtimeControlPlane.payoutQueue.nextWindow !== "Tomorrow · 18:30 UTC") {
    failures.push("Expected runtime-derived payoutQueue.nextWindow string from the control plane helper.");
  }
  if (runtimeControlPlane.reconciliation.exportWindow !== "2026-04-24 · 01:00-05:00 UTC") {
    failures.push("Expected runtime-derived reconciliation.exportWindow string from the control plane helper.");
  }
  if (runtimeControlPlane.reconciliation.recordsLabel !== "1 receipt records") {
    failures.push("Expected reconciliation.recordsLabel to derive from receipts.length.");
  }
} catch (error) {
  failures.push(`Vanta Pay merchant control plane behavior check failed: ${error.message}`);
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

if (packageJson.scripts?.["pay:merchant-trust-status"] !== "node scripts/print-vanta-pay-merchant-trust-status.mjs") {
  failures.push("Missing package script pay:merchant-trust-status");
}

if (
  packageJson.scripts?.["pay:merchant-trust-status-check"] !==
  "node scripts/print-vanta-pay-merchant-trust-status.mjs --check"
) {
  failures.push("Missing package script pay:merchant-trust-status-check");
}

if (packageJson.scripts?.["pay:approval-packet-check"] !== "node scripts/check-vanta-pay-approval-packet.mjs") {
  failures.push("Missing package script pay:approval-packet-check");
}

if (packageJson.scripts?.["pay:operator"] !== "node operator/pay-server.mjs") {
  failures.push("Missing package script pay:operator");
}

try {
  execFileSync("node", ["scripts/check-vanta-pay-merchant-trust-status.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  failures.push("scripts/check-vanta-pay-merchant-trust-status.mjs must execute successfully");
}

try {
  execFileSync("node", ["scripts/check-vanta-pay-approval-packet.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  failures.push("scripts/check-vanta-pay-approval-packet.mjs must execute successfully");
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

if (!String(packageJson.scripts?.["pay:verify"] ?? "").includes("pay:merchant-trust-status-check")) {
  failures.push("pay:verify must include pay:merchant-trust-status-check");
}

if (!String(packageJson.scripts?.["pay:verify"] ?? "").includes("pay:approval-packet-check")) {
  failures.push("pay:verify must include pay:approval-packet-check");
}

if (failures.length > 0) {
  console.error("Vanta Pay contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay contract check: PASS");
