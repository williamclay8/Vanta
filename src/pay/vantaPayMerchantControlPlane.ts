import { createVantaPayRuntime } from "./vantaPayRuntime";
import type { VantaPayMerchantControlPlane } from "./vantaPayTypes";

export function createVantaPayMerchantControlPlane(): VantaPayMerchantControlPlane {
  const runtime = createVantaPayRuntime();
  const merchant = runtime.getMerchant();
  const balances = runtime.getBalances();
  const receipts = runtime.listReceipts();
  const refunds = runtime.listRefunds();
  const withdrawals = runtime.listWithdrawals();

  return {
    merchantControlPlaneVersion: "vanta-pay-merchant-control-plane-0.1",
    approvalPhase: "preview",
    balances,
    receipts,
    refunds,
    withdrawals,
    payoutQueue: {
      destination: merchant.payoutSettings.destination,
      nextWindow: "Today · 16:00 UTC",
      state: "merchant-visible",
    },
    reconciliation: {
      exportWindow: "2026-04-23 · 00:00-12:00 UTC",
      recordsLabel: `${receipts.length} receipt records`,
      state: "merchant-visible",
    },
    sections: {
      balances: balances.available.length > 0 ? "visible" : "empty",
      receipts: receipts.length > 0 ? "visible" : "empty",
      refunds: refunds.length > 0 ? "visible" : "empty",
      withdrawals: withdrawals.length > 0 ? "visible" : "empty",
      reconciliation: "visible",
    },
  };
}
