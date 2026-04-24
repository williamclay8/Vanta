export type VantaPayCommandCenterTone = "ready" | "preview" | "blocked";

export type VantaPayCommandCenterItem = {
  label: string;
  value: string;
  detail: string;
  tone: VantaPayCommandCenterTone;
};

export type VantaPayMerchantCommandCenter = {
  version: "vanta-pay-merchant-command-center-0.1";
  betaNotice: string;
  trustRail: readonly VantaPayCommandCenterItem[];
  operations: readonly VantaPayCommandCenterItem[];
};

export const VANTA_PAY_MERCHANT_COMMAND_CENTER = {
  version: "vanta-pay-merchant-command-center-0.1",
  betaNotice: "No funds move in beta mode.",
  trustRail: [
    {
      label: "Route preview",
      value: "Payment path preview",
      detail: "The merchant sees the payment route before execution.",
      tone: "preview",
    },
    {
      label: "Receipt preview",
      value: "Receipt path preview",
      detail: "Receipt state stays visible before any live settlement claim.",
      tone: "preview",
    },
    {
      label: "Privacy readiness",
      value: "Claims blocked",
      detail: "Production privacy claims are not enabled yet.",
      tone: "blocked",
    },
  ],
  operations: [
    {
      label: "Operator status",
      value: "Local operator preview",
      detail: "Pay status and merchant API checks remain the source of truth.",
      tone: "preview",
    },
    {
      label: "Settlement queue",
      value: "Awaiting approval packet",
      detail: "Preview, approve, execute, and settle stay separate.",
      tone: "preview",
    },
    {
      label: "Reconciliation",
      value: "Receipt records preview",
      detail: "Exports remain a checked backend surface in this beta.",
      tone: "preview",
    },
  ],
} as const satisfies VantaPayMerchantCommandCenter;
