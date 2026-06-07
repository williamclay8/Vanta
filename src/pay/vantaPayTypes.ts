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

export type VantaPayInstitutionalDisclosureReceiptField =
  | "receipt_id"
  | "payment_id"
  | "payment_status"
  | "asset"
  | "amount"
  | "invoice_reference"
  | "private_settlement_reference_prefix"
  | "audit_disclosure_reference_prefix"
  | "claim_boundary"
  | "verification_commands";

export type VantaPayInstitutionalDisclosureReceipt = {
  schemaVersion: "vanta-pay-institutional-disclosure-receipt-v0.1";
  object: "institutional_disclosure_receipt";
  disclosureMode: "selective_disclosure_receipt";
  purpose: "counterparty-verifiable private settlement";
  receiptRef: {
    amount: string;
    asset: VantaPayAsset;
    auditDisclosure: VantaPayReceiptRedactedReference;
    invoiceReference: string | null;
    paymentId: string;
    privateSettlementReference: VantaPayReceiptRedactedReference;
    receiptId: string;
    status: VantaPayReceiptStatus;
  };
  scope: {
    audience: "buyer-shareable-or-authorized-reviewer";
    basis: "time-and-scope-limited";
    expiresAt: string;
    jurisdiction: "jurisdiction-aware-design-only";
    receiptScope: "receipt_only";
  };
  disclosedFields: readonly [
    "receipt_id",
    "payment_id",
    "payment_status",
    "asset",
    "amount",
    "invoice_reference",
    "private_settlement_reference_prefix",
    "audit_disclosure_reference_prefix",
    "claim_boundary",
    "verification_commands",
  ];
  redactions: {
    customerEmailValueDisclosed: false;
    fullAuditDisclosureIdDisclosed: false;
    fullPrivateRailReceiptIdDisclosed: false;
    fullTransactionHistoryDisclosed: false;
    privateInputsDisclosed: false;
    witnessDisclosed: false;
  };
  claimControls: {
    anonymityClaimAllowed: false;
    complianceSafeClaimAllowed: false;
    productionReady: false;
    regulatorApprovalClaimAllowed: false;
  };
  verification: {
    claimBoundary: "beta-selective-disclosure-not-production-private-or-regulator-approved";
    commands: readonly [
      "npm run pay:institutional-disclosure-receipt-check",
      "npm run institutional-lane-check",
      "npm run pay:receipt-public-view-check",
    ];
  };
};

export type VantaPayReceiptGrowthLoopStep =
  | "private_action"
  | "trust_packet_ready"
  | "counterparty_verification"
  | "invited_use"
  | "repeated_private_action";

export type VantaPayGrowthLoopEventType =
  | "receipt_generated"
  | "share_link_copied"
  | "counterparty_verifier_opened"
  | "next_private_settlement_requested";

export type VantaPayGrowthLoopCounterpartyRole = "merchant" | "buyer" | "counterparty";

export type VantaPayGrowthLoopMeasurementSource =
  | "local-ui-fixture"
  | "pay-operator-live-redacted";

export type VantaPayGrowthLoopMeasurementMode =
  | "local-fixture-only"
  | "live-redacted-first-party";

export type VantaPayGrowthLoopEvent = {
  counterpartyRole: VantaPayGrowthLoopCounterpartyRole;
  eventId: string;
  eventType: VantaPayGrowthLoopEventType;
  measurementSource: VantaPayGrowthLoopMeasurementSource;
  occurredAt: string;
  receiptId: string;
  sharePath: string;
};

export type VantaPayGrowthLoopEventCreateInput = {
  counterpartyRole?: VantaPayGrowthLoopCounterpartyRole;
  eventType: VantaPayGrowthLoopEventType;
  idempotencyKey?: string | null;
  occurredAt?: string;
  receiptId: string;
};

export type VantaPayGrowthLoopDerivedCounters = {
  counterpartyVerifierOpened7d: number;
  counterpartyVerifierOpened30d: number;
  invitedCounterparties7d: number;
  invitedCounterparties30d: number;
  nextPrivateSettlementRequests7d: number;
  nextPrivateSettlementRequests30d: number;
  repeatedPrivateActions7d: number;
  repeatedPrivateActions30d: number;
  transactionCount7d: number;
  transactionCount30d: number;
  volume7dUsd: number;
  volume30dUsd: number;
};

export type VantaPayGrowthLoopEventLedger = {
  object: "growth_loop_event_ledger";
  events: readonly VantaPayGrowthLoopEvent[];
  liveMeasurementEnabled: boolean;
  measurementMode: VantaPayGrowthLoopMeasurementMode;
  productionReady: false;
  retentionBoundary:
    | "local-test-fixture-no-customer-private-inputs"
    | "redacted-live-event-ledger-no-customer-private-inputs";
};

export type VantaPayGrowthLoopEvidence = {
  schemaVersion: "vanta-pay-growth-loop-evidence-v0.1";
  measurementMode: "local-fixture-only";
  eventLedger: VantaPayGrowthLoopEventLedger;
  derivedCounters: VantaPayGrowthLoopDerivedCounters;
  publicSummary: {
    nextAction: "request_next_private_settlement";
    receiptId: string;
    sharePath: string;
  };
  claimControls: {
    adoptionClaimAllowed: false;
    anonymityClaimAllowed: false;
    claimLiftBlockedUntilLiveEvidence: true;
    complianceSafeClaimAllowed: false;
    productionReady: false;
    regulatorApprovalClaimAllowed: false;
  };
  verificationCommand: "npm run pay:growth-loop-check";
};

export type VantaPayLiveGrowthLoopMeasurement = {
  schemaVersion: "vanta-pay-live-growth-loop-measurement-v0.1";
  object: "pay_growth_loop_live_measurement";
  measurementMode: "live-redacted-first-party";
  liveMeasurementEnabled: true;
  eventLedger: VantaPayGrowthLoopEventLedger & {
    liveMeasurementEnabled: true;
    measurementMode: "live-redacted-first-party";
    retentionBoundary: "redacted-live-event-ledger-no-customer-private-inputs";
  };
  derivedCounters: VantaPayGrowthLoopDerivedCounters;
  privacyBoundary: {
    customerEmailStored: false;
    fullAuditDisclosureIdStored: false;
    fullPrivateRailReceiptIdStored: false;
    ipAddressStored: false;
    privateInputsStored: false;
    rawSettlementTermsStored: false;
    userAgentStored: false;
    witnessStored: false;
  };
  claimControls: {
    adoptionClaimAllowed: false;
    anonymityClaimAllowed: false;
    claimLiftBlockedUntilReviewedLiveEvidence: true;
    complianceSafeClaimAllowed: false;
    productionReady: false;
    regulatorApprovalClaimAllowed: false;
  };
  statusEndpoint: "GET /v1/growth-loop/status";
  eventIntakeEndpoint: "POST /v1/growth-loop/events";
  verificationCommand: "npm run pay:growth-loop-check";
};

export type VantaPayReceiptGrowthLoop = {
  schemaVersion: "vanta-pay-receipt-growth-loop-v0.1";
  object: "receipt_growth_loop";
  loopName: "counterparty-verifiable private settlement";
  loopSteps: readonly [
    "private_action",
    "trust_packet_ready",
    "counterparty_verification",
    "invited_use",
    "repeated_private_action",
  ];
  privateAction: {
    amount: string;
    asset: VantaPayAsset;
    primitive: "Pay";
    receiptId: string;
    status: VantaPayReceiptStatus;
  };
  trustPacket: {
    claimBoundary: "receipt-backed-test-settlement-not-production-private";
    disclosedSummary: "receipt-status-amount-asset-payment-reference";
    redactedSummary: "customer-email-full-private-rail-and-audit-ids";
    schemaVersion: "vanta-pay-receipt-public-view-0.1";
    sharePath: string;
  };
  counterpartyVerification: {
    operatorStatusSurface: "npm run pay:production-readiness-json";
    productionReady: false;
    verificationCommand: "npm run pay:growth-loop-check";
    verifierRoute: "/receipt/:receiptId";
    verifierSurface: "ReceiptVerificationPage";
  };
  invitedUse: {
    invitationClaimAllowed: false;
    invitationStatus: "local-preview-only";
    nextAction: "share_receipt_with_counterparty";
  };
  repeatedPrivateAction: {
    liveUsageMeasured: false;
    repeatIntent: "counterparty_can_request_next_private_settlement";
  };
  usageVelocity: {
    claimLiftBlockedUntilMeasured: true;
    evidenceStatus: "red-first-no-live-measurement" | "local-fixture-measured-claim-blocked";
    invitedCounterparties7d: number;
    metricSurface: "npm run usage-velocity-check";
    primitive: "Pay";
    repeatedPrivateActions7d: number;
    transactionCount7d: number;
    transactionCount30d: number;
    volume7dUsd: number;
    volume30dUsd: number;
  };
  evidence: VantaPayGrowthLoopEvidence;
  claimControls: {
    adoptionClaimAllowed: false;
    anonymityClaimAllowed: false;
    complianceSafeClaimAllowed: false;
    productionReady: false;
    regulatorApprovalClaimAllowed: false;
  };
  verification: {
    commands: readonly [
      "npm run pay:growth-loop-check",
      "npm run pay:receipt-public-view-check",
      "npm run usage-velocity-check",
      "npm run pay:verify",
    ];
  };
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
      "npm run pay:institutional-disclosure-receipt-check",
      "npm run pay:growth-loop-check",
      "npm run programmatic-privacy:contract-check",
      "npm run twitter-intelligence:check",
    ];
    operatorStatusSurface: "npm run pay:production-readiness-json";
    productionReady: false;
    redactionPolicy: "customer-email-and-full-private-settlement-refs-redacted";
  };
  localProving: {
    defaultMode: "client_side_only";
    privateInputsLeaveClient: false;
    fallbackAllowed: false;
    evidenceStatus: "declared-red-first";
    verificationCommand: "npm run local-proving-enforced-check";
  };
  usageVelocity: {
    primitive: "Pay";
    evidenceStatus: "red-first-no-live-measurement";
    metricSurface: "npm run usage-velocity-check";
    claimLiftBlockedUntilMeasured: true;
    institutionalVolumeTracked: true;
  };
  institutionalDisclosure: {
    mode: "selective_disclosure_receipt";
    receiptSchemaVersion: "vanta-pay-institutional-disclosure-receipt-v0.1";
    buyerShareable: "selective_disclosure";
    regulatorScope: "time-and-scope-limited";
    expiresAt: string;
    disclosedFields: VantaPayInstitutionalDisclosureReceipt["disclosedFields"];
    privateInputsDisclosed: false;
    witnessDisclosed: false;
    fullTransactionHistoryDisclosed: false;
    productionReady: false;
    verificationCommand: "npm run pay:institutional-disclosure-receipt-check";
  };
  growthLoop: {
    schemaVersion: "vanta-pay-receipt-growth-loop-v0.1";
    sharePath: string;
    counterpartyVerification: VantaPayReceiptGrowthLoop["counterpartyVerification"];
    invitedUse: VantaPayReceiptGrowthLoop["invitedUse"];
    repeatedPrivateAction: VantaPayReceiptGrowthLoop["repeatedPrivateAction"];
    usageVelocity: VantaPayReceiptGrowthLoop["usageVelocity"];
    evidence: VantaPayReceiptGrowthLoop["evidence"];
    productionReady: false;
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
  growthLoopEvents?: readonly VantaPayGrowthLoopEvent[];
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
