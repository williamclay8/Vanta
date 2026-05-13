import type { VantaPayAsset } from "./vantaPayAssets.ts";

export type { VantaPayAsset };

export type VantaPayEnvironmentMode = "test" | "live";

export type VantaPayCheckoutUiMode = "hosted" | "embedded" | "modal";

export type VantaPayCheckoutSessionStatus = "open" | "completed" | "expired" | "canceled";

export type VantaPayCheckoutCompletionBasis =
  | "local-test-harness"
  | "customer-payment-evidence";

export type VantaPayPrivacyRail = "umbra" | "private_pool_v2";

export type VantaPayMerchantTrustStatus = {
  version: "vanta-pay-merchant-trust-status-0.1";
  checkoutSurface: "hosted-or-embedded";
  settlementModel: "private-settlement-adapter";
  refundSupport: "supported";
  withdrawalSupport: "supported";
  privacyMode: "controlled-privacy";
  policyMode: "legible-trust";
  productionReady: false;
};

export type VantaPayMerchantControlPlaneSectionState = "visible" | "empty" | "beta_blocked";

export type VantaPayApprovalPhase = "preview" | "approve" | "execute" | "settle";

export type VantaPayMerchantControlPlaneRuntimeState = {
  approvalPhase: VantaPayApprovalPhase;
  payoutQueue: {
    nextWindow: {
      cadence: "daily";
      label: string;
      targetTimeUtc: string;
      timezone: "UTC";
    };
  };
  reconciliation: {
    exportWindow: {
      date: string;
      endUtc: string;
      startUtc: string;
      timezone: "UTC";
    };
  };
};

export type VantaPayMerchantControlPlane = {
  merchantControlPlaneVersion: "vanta-pay-merchant-control-plane-0.1";
  approvalPhase: VantaPayApprovalPhase;
  balances: VantaPayBalances;
  receipts: readonly VantaPayReceipt[];
  refunds: readonly VantaPayRefund[];
  withdrawals: readonly VantaPayWithdrawal[];
  payoutQueue: {
    destination: string;
    nextWindow: string;
    state: "merchant-visible";
  };
  reconciliation: {
    exportWindow: string;
    recordsLabel: string;
    state: "merchant-visible";
  };
  sections: {
    balances: VantaPayMerchantControlPlaneSectionState;
    receipts: VantaPayMerchantControlPlaneSectionState;
    refunds: VantaPayMerchantControlPlaneSectionState;
    withdrawals: VantaPayMerchantControlPlaneSectionState;
    reconciliation: VantaPayMerchantControlPlaneSectionState;
  };
};

export type VantaPayApprovalPacket = {
  version: "vanta-pay-approval-packet-0.1";
  phaseOrder: ["preview", "approve", "execute", "settle"];
  policyMode: "legible-trust";
  simulationRequired: true;
  walletApprovalRequired: true;
};

export type VantaPayRailStatus = "not_started" | "pending" | "settled" | "failed";

export type VantaPayPrivacyRoute = {
  auditMode: "merchant_receipt" | "merchant_and_buyer_receipt";
  rail: VantaPayPrivacyRail;
  routeId: string;
  settlementAsset: VantaPayAsset;
};

export type VantaPayPaymentStatus =
  | "open"
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "canceled";

export type VantaPayInvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "refunded";

export type VantaPayWithdrawalStatus = "pending" | "processing" | "completed" | "failed";

export type VantaPayReceiptStatus = "paid" | "pending" | "refunded";

export type VantaPayRefundStatus = "refunded" | "failed";

export type VantaPayReceiptPacketAudience =
  | "merchant_internal"
  | "buyer_shareable"
  | "operator_verification";

export type VantaPayReceiptPacketFieldVisibility =
  | "visible"
  | "redacted"
  | "selective_disclosure";

export type VantaPayReceiptPrivacyContractField = {
  field: string;
  merchantInternal: VantaPayReceiptPacketFieldVisibility;
  buyerShareable: VantaPayReceiptPacketFieldVisibility;
  operatorVerification: VantaPayReceiptPacketFieldVisibility;
  note: string;
};

export type VantaPayReceiptPrivacyContract = {
  version: "vanta-pay-receipt-privacy-contract-0.1";
  audiences: readonly VantaPayReceiptPacketAudience[];
  claimControls: {
    fully_private_pay_claim: false;
    production_privacy_claims_locked: true;
  };
  claimSummary: "production privacy not enabled";
  currentTruth: "receipt-backed test settlement";
  fields: readonly VantaPayReceiptPrivacyContractField[];
  packetStates: readonly ["draft_request", "checkout_issued", "receipt_pending", "receipt_packet_ready"];
  verificationSurfaces: readonly string[];
};

export type VantaPayDestinationType =
  | "wallet_address"
  | "treasury_address"
  | "settlement_account";

export type VantaPayMerchant = {
  acceptedAssets: readonly VantaPayAsset[];
  branding: {
    logoUrl: string;
    name: string;
  };
  callbackUrls: {
    cancelUrl: string;
    successUrl: string;
    webhookUrl: string;
  };
  environmentMode: VantaPayEnvironmentMode;
  id: string;
  object: "merchant";
  payoutSettings: {
    defaultAsset: VantaPayAsset;
    destination: string;
    destinationType: VantaPayDestinationType;
  };
};

export type VantaPayLineItem = {
  amount?: string;
  name: string;
  quantity: number;
  unitAmount?: string;
};

export type VantaPayCheckoutSessionCreateInput = {
  amount: string;
  cancelUrl: string;
  collectEmail?: boolean;
  collectName?: boolean;
  currency: VantaPayAsset;
  customerEmail?: string;
  idempotencyKey?: string | null;
  lineItems: readonly VantaPayLineItem[];
  merchantId: string;
  metadata?: Record<string, string>;
  mode: "payment";
  orderId?: string;
  successUrl: string;
  uiMode: VantaPayCheckoutUiMode;
};

export type VantaPayCheckoutSession = {
  amount: string;
  cancelUrl: string;
  checkoutUrl: string;
  clientToken: string;
  collectEmail: boolean;
  collectName: boolean;
  createdAt: string;
  currency: VantaPayAsset;
  customerEmail: string | null;
  expiresAt: string;
  id: string;
  idempotencyKey: string | null;
  lineItems: readonly VantaPayLineItem[];
  merchantId: string;
  metadata: Record<string, string>;
  mode: "payment";
  object: "checkout_session";
  orderId: string | null;
  privacyRoute: VantaPayPrivacyRoute;
  status: VantaPayCheckoutSessionStatus;
  successUrl: string;
  uiMode: VantaPayCheckoutUiMode;
};

export type VantaPayPayment = {
  amount: string;
  checkoutSessionId: string;
  completionBasis: VantaPayCheckoutCompletionBasis;
  createdAt: string;
  currency: VantaPayAsset;
  customerPaymentEvidenceRef: string | null;
  id: string;
  merchantId: string;
  object: "payment";
  orderId: string | null;
  privacyRail: VantaPayPrivacyRail;
  privateRailReceiptId: string | null;
  railStatus: VantaPayRailStatus;
  receiptId: string | null;
  refundedAmount: string;
  settlementAvailability: "pending_private_settlement" | "available" | "failed";
  status: VantaPayPaymentStatus;
};

export type VantaPayPrivateRailReceipt = {
  amount: string;
  asset: VantaPayAsset;
  auditDisclosureId: string;
  checkoutSessionId: string;
  createdAt: string;
  id: string;
  object: "private_rail_receipt";
  proofReceiptId: string;
  rail: VantaPayPrivacyRail;
  status: "confirmed";
};

export type VantaPayReceipt = {
  amount: string;
  asset: VantaPayAsset;
  checkoutSessionId: string;
  completionBasis: VantaPayCheckoutCompletionBasis;
  createdAt: string;
  customerEmail: string | null;
  customerPaymentEvidenceRef: string | null;
  id: string;
  invoiceReference: string | null;
  merchantId: string;
  object: "receipt";
  orderId: string | null;
  paymentId: string;
  auditDisclosureId: string | null;
  privateRailReceiptId: string;
  status: VantaPayReceiptStatus;
};

export type VantaPayReceiptRedactedReference = {
  idPrefix: string | null;
  redacted: true;
};

export type VantaPayReceiptPublicView = {
  amount: string;
  asset: VantaPayAsset;
  checkoutSessionId: string;
  createdAt: string;
  customer: {
    emailCollected: boolean;
    emailRedacted: true;
  };
  invoiceReference: string | null;
  merchantId: string;
  object: "receipt_public_view";
  orderId: string | null;
  paymentId: string;
  checkoutCompletion: {
    basis: VantaPayCheckoutCompletionBasis;
    customerPaymentEvidenceRefPresent: boolean;
    localHarness: boolean;
  };
  privateSettlement: {
    auditDisclosure: VantaPayReceiptRedactedReference;
    policyMode: "legible-trust";
    productionReady: false;
    railReceipt: VantaPayReceiptRedactedReference;
  };
  receiptId: string;
  status: VantaPayReceiptStatus;
  verification: {
    claimBoundary: "receipt-backed-test-settlement-not-production-private";
    commands: readonly [
      "npm run pay:receipt-public-view-check",
      "npm run pay:receipt-privacy-contract-check",
      "npm run programmatic-privacy:contract-check",
    ];
    operatorStatusSurface: "npm run pay:production-readiness-json";
    productionReady: false;
    redactionPolicy: "customer-email-and-full-private-settlement-refs-redacted";
  };
  version: "vanta-pay-receipt-public-view-0.1";
};

export type VantaPayRefundCreateInput = {
  amount: string;
  idempotencyKey?: string | null;
  merchantId: string;
  paymentId: string;
  reason?: string;
};

export type VantaPayRefund = {
  amount: string;
  asset: VantaPayAsset;
  createdAt: string;
  id: string;
  idempotencyKey: string | null;
  merchantId: string;
  object: "refund";
  paymentId: string;
  reason: string | null;
  status: VantaPayRefundStatus;
};

export type VantaPayWithdrawalCreateInput = {
  amount: string;
  asset: VantaPayAsset;
  destination: string;
  destinationType: VantaPayDestinationType;
  idempotencyKey?: string | null;
  merchantId: string;
  privateExitReceiptId?: string;
  referenceNote?: string;
};

export type VantaPayWithdrawal = {
  amount: string;
  asset: VantaPayAsset;
  createdAt: string;
  destination: string;
  destinationType: VantaPayDestinationType;
  id: string;
  idempotencyKey: string | null;
  merchantId: string;
  object: "withdrawal";
  privateExitReceiptId: string;
  referenceNote: string | null;
  status: VantaPayWithdrawalStatus;
};

export type VantaPayPrivateExitReceipt = {
  amount: string;
  asset: VantaPayAsset;
  createdAt: string;
  destination: string;
  id: string;
  object: "private_exit_receipt";
  rail: VantaPayPrivacyRail;
  status: "confirmed";
};

export type VantaPayPaymentLinkCreateInput = {
  allowVariableAmount?: boolean;
  amount: string;
  asset: VantaPayAsset;
  collectEmail?: boolean;
  collectName?: boolean;
  description: string;
  linkName: string;
  merchantId: string;
  redirectUrl?: string;
};

export type VantaPayPaymentLink = {
  allowVariableAmount: boolean;
  amount: string;
  asset: VantaPayAsset;
  collectEmail: boolean;
  collectName: boolean;
  createdAt: string;
  description: string;
  id: string;
  linkName: string;
  merchantId: string;
  object: "payment_link";
  redirectUrl: string | null;
  status: "live" | "paused";
  url: string;
};

export type VantaPayInvoiceCreateInput = {
  asset: VantaPayAsset;
  customerContact: string;
  customerName: string;
  dueDate: string;
  invoiceNumber: string;
  lineItems: readonly VantaPayLineItem[];
  merchantId: string;
  notes?: string;
};

export type VantaPayInvoice = {
  asset: VantaPayAsset;
  customerContact: string;
  customerName: string;
  dueDate: string;
  id: string;
  invoiceNumber: string;
  lineItems: readonly VantaPayLineItem[];
  merchantId: string;
  notes: string | null;
  object: "invoice";
  status: VantaPayInvoiceStatus;
  total: string;
};

export type VantaPayBalances = {
  available: readonly { amount: string; asset: VantaPayAsset }[];
  pending: readonly { amount: string; asset: VantaPayAsset }[];
  withdrawable: readonly { amount: string; asset: VantaPayAsset }[];
};

export type VantaPayWebhookEventType =
  | "checkout.session.created"
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "payment.created"
  | "payment.processing"
  | "payment.completed"
  | "payment.failed"
  | "payment.refunded"
  | "receipt.created"
  | "withdrawal.created"
  | "withdrawal.completed"
  | "withdrawal.failed";

export type VantaPayWebhookEvent = {
  created: string;
  data: {
    object:
      | VantaPayCheckoutSession
      | VantaPayPayment
      | VantaPayRefund
      | VantaPayReceipt
      | VantaPayWithdrawal;
  };
  id: string;
  object: "event";
  type: VantaPayWebhookEventType;
};

export type VantaPayWebhookDeliveryStatus = "delivered" | "failed";

export type VantaPayWebhookDelivery = {
  attempts: number;
  deliveredAt: string | null;
  endpoint: string;
  eventId: string;
  id: string;
  lastStatusCode: number | null;
  object: "webhook_delivery";
  status: VantaPayWebhookDeliveryStatus;
};

export type VantaPayRuntimeSnapshot = {
  events: readonly VantaPayWebhookEvent[];
  invoices: readonly VantaPayInvoice[];
  paymentLinks: readonly VantaPayPaymentLink[];
  payments: readonly VantaPayPayment[];
  privateExitReceipts: readonly VantaPayPrivateExitReceipt[];
  privateRailReceipts: readonly VantaPayPrivateRailReceipt[];
  receipts: readonly VantaPayReceipt[];
  refunds: readonly VantaPayRefund[];
  sessions: readonly VantaPayCheckoutSession[];
  stateVersion?: 1;
  webhookDeliveries: readonly VantaPayWebhookDelivery[];
  withdrawals: readonly VantaPayWithdrawal[];
};
