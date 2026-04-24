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
  suiteModes: readonly VantaPayCommandCenterItem[];
  suiteWorkflows: readonly VantaPayCommandCenterItem[];
  developerControls: readonly VantaPayCommandCenterItem[];
  trustRail: readonly VantaPayCommandCenterItem[];
  operations: readonly VantaPayCommandCenterItem[];
};

export const VANTA_PAY_MERCHANT_COMMAND_CENTER = {
  version: "vanta-pay-merchant-command-center-0.1",
  betaNotice: "No funds move in beta mode.",
  suiteModes: [
    {
      label: "Hosted checkout",
      value: "Shareable hosted path",
      detail: "Merchant can route buyers to a hosted Vanta checkout preview.",
      tone: "preview",
    },
    {
      label: "Embedded checkout",
      value: "Drop-in website surface",
      detail: "The payment form can be embedded in another website without changing settlement truth.",
      tone: "preview",
    },
    {
      label: "Modal checkout",
      value: "Inline overlay path",
      detail: "A modal mode keeps checkout inside the merchant site experience.",
      tone: "preview",
    },
  ],
  suiteWorkflows: [
    {
      label: "Payment links",
      value: "Create and share",
      detail: "Reusable payment URLs for invoices, messages, QR codes, and support flows.",
      tone: "preview",
    },
    {
      label: "Invoices",
      value: "Send and track",
      detail: "Invoice records keep customer, due date, line item, and receipt context together.",
      tone: "preview",
    },
    {
      label: "Subscriptions",
      value: "Recurring plans preview",
      detail: "Recurring payment state stays marked as a second-wave beta workflow.",
      tone: "blocked",
    },
    {
      label: "Refunds",
      value: "Partial or full",
      detail: "Refund actions preserve idempotency and receipt-adjusted balances.",
      tone: "preview",
    },
    {
      label: "Withdrawals",
      value: "Merchant exits",
      detail: "Withdrawals require a private-exit receipt before completed status.",
      tone: "preview",
    },
    {
      label: "Reconciliation",
      value: "Export-ready records",
      detail: "Payments, receipts, refunds, withdrawals, and private receipts share stable IDs.",
      tone: "preview",
    },
  ],
  developerControls: [
    {
      label: "Embeddable suite preview",
      value: "<VantaPay checkout=\"embedded\" />",
      detail: "Hosted, embedded, and modal modes share one checkout contract.",
      tone: "preview",
    },
    {
      label: "API keys",
      value: "Scoped local keys",
      detail: "Keys stay redacted and preview-scoped until production controls are configured.",
      tone: "blocked",
    },
    {
      label: "Signed webhooks",
      value: "Event delivery contract",
      detail: "Webhook signatures, replay tolerance, retries, and delivery records stay testable.",
      tone: "preview",
    },
  ],
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
