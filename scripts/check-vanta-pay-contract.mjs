import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createVantaPayMerchantControlPlane,
  createVantaPayMerchantControlPlaneFromRuntime,
  formatVantaPayMerchantControlPlaneExportWindow,
  formatVantaPayMerchantControlPlaneNextWindow,
} from "../src/pay/vantaPayMerchantControlPlane.ts";
import { createVantaPayRuntime } from "../src/pay/vantaPayRuntime.ts";

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
      "formatVantaPayMerchantControlPlaneNextWindow",
      "formatVantaPayMerchantControlPlaneExportWindow",
      "merchantControlPlaneVersion",
      "approvalPhase",
      "reconciliation",
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
];

const failures = [];

function assertFileContains(path, markers) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${path}`);
    return;
  }

  const source = readFileSync(absolutePath, "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${path}`);
    }
  }
}

assertFileContains("src/pay/vantaPayMerchantCommandCenter.ts", [
  "vanta-pay-merchant-command-center-0.1",
  "Privacy readiness",
  "Production privacy is not enabled yet.",
  "No funds move in beta mode.",
  "Operator status",
  "Settlement queue",
  "Reconciliation",
]);

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

  const runtime = createVantaPayRuntime();
  const merchant = runtime.getMerchant();
  const session = runtime.createCheckoutSession({
    amount: "12.34",
    cancelUrl: merchant.callbackUrls.cancelUrl,
    currency: merchant.payoutSettings.defaultAsset,
    lineItems: [{ amount: "12.34", name: "Settlement test", quantity: 1 }],
    merchantId: merchant.id,
    mode: "payment",
    successUrl: merchant.callbackUrls.successUrl,
    uiMode: "hosted",
  });
  const privateRailReceipt = runtime.createPrivateRailReceipt({
    checkoutSessionId: session.id,
    rail: session.privacyRoute.rail,
  });
  const completed = runtime.completeCheckoutSession(session.id, {
    privateRailReceiptId: privateRailReceipt.id,
  });
  runtime.createRefund({
    amount: completed.payment.amount,
    merchantId: merchant.id,
    paymentId: completed.payment.id,
  });

  const zeroBalances = runtime.getBalances();
  if (zeroBalances.available.length !== 0 || zeroBalances.withdrawable.length !== 0) {
    failures.push("Expected fully refunded settled payments to net to zero balances.");
  }

  const runtimeControlPlane = createVantaPayMerchantControlPlaneFromRuntime(runtime);
  if (runtimeControlPlane.balances.available.length !== 0 || runtimeControlPlane.balances.withdrawable.length !== 0) {
    failures.push("Expected control plane balances to reflect zeroed runtime balances.");
  }
  if (runtimeControlPlane.reconciliation.recordsLabel !== "1 receipt records") {
    failures.push("Expected reconciliation.recordsLabel to derive from receipts.length.");
  }

  /** @type {import("../src/pay/vantaPayTypes.ts").VantaPayMerchantControlPlaneRuntimeState} */
  const controlPlaneState = {
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
  const typedControlPlane = createVantaPayMerchantControlPlaneFromRuntime({
    getBalances() {
      return {
        available: [],
        pending: [],
        withdrawable: [],
      };
    },
    getMerchant() {
      return merchant;
    },
    getMerchantControlPlaneState() {
      return controlPlaneState;
    },
    listReceipts() {
      return [];
    },
    listRefunds() {
      return [];
    },
    listWithdrawals() {
      return [];
    },
  });
  if (
    typedControlPlane.payoutQueue.nextWindow !==
    formatVantaPayMerchantControlPlaneNextWindow(controlPlaneState.payoutQueue.nextWindow)
  ) {
    failures.push("Expected shared next-window formatting from the control plane helper.");
  }
  if (
    typedControlPlane.reconciliation.exportWindow !==
    formatVantaPayMerchantControlPlaneExportWindow(controlPlaneState.reconciliation.exportWindow)
  ) {
    failures.push("Expected shared export-window formatting from the control plane helper.");
  }
} catch (error) {
  failures.push(`Vanta Pay merchant control plane behavior check failed: ${error.message}`);
}

if (failures.length > 0) {
  console.error("Vanta Pay contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay contract check: PASS");
