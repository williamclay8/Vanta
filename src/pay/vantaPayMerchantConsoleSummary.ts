import type { VantaPayAsset } from "./vantaPayTypes";

export type VantaPayMerchantConsoleReceiptState = "settled" | "review";

export type VantaPayMerchantConsoleSummary = {
  balances: readonly {
    asset: VantaPayAsset;
    available: string;
    pending: string;
    reserved: string;
  }[];
  payoutQueue: {
    nextWindow: string;
    destination: string;
    state: string;
  };
  receipts: readonly {
    id: string;
    merchant: string;
    amount: string;
    state: VantaPayMerchantConsoleReceiptState;
  }[];
  reconciliation: {
    exportWindow: string;
    records: string;
    delta: string;
  };
};

export const VANTA_PAY_MERCHANT_CONSOLE_SUMMARY = {
  balances: [
    { asset: "USDC", available: "248,420.18", pending: "18,200.00", reserved: "4,000.00" },
    { asset: "SOL", available: "92.48", pending: "0.00", reserved: "1.25" },
  ],
  payoutQueue: {
    nextWindow: "Next approved payout window · 16:00 UTC",
    destination: "Treasury settlement wallet",
    state: "Awaiting operator approval packet",
  },
  receipts: [
    { id: "rcpt_1842", merchant: "Northstar Labs", amount: "4,820.00 USDC", state: "settled" },
    { id: "rcpt_1841", merchant: "Northstar Labs", amount: "1,250.00 USDC", state: "review" },
  ],
  reconciliation: {
    exportWindow: "Demo export window · 00:00-12:00 UTC",
    records: "128 matched receipts",
    delta: "0 unresolved deltas",
  },
} as const satisfies VantaPayMerchantConsoleSummary;
