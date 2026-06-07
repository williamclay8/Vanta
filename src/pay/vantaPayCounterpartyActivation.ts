import type { VantaPayCounterpartyActivation, VantaPayReceipt } from "./vantaPayTypes.ts";

export const VANTA_PAY_COUNTERPARTY_ACTIVATION_SCHEMA_VERSION =
  "vanta-pay-counterparty-activation-v0.1" as const;

export const VANTA_PAY_COUNTERPARTY_ACTIVATION_EVENT_TYPES = [
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
] as const satisfies VantaPayCounterpartyActivation["activationEventTypes"];

const COUNTERPARTY_ACTIVATION_ACTION = {
  ctaLabel: "Request private settlement",
  eventType: "next_settlement_intent_created",
  nextAction: "request_next_private_settlement",
  policySafeCopy: "Request the next private settlement using this receipt as context.",
  route: "/app/pay",
} as const satisfies VantaPayCounterpartyActivation["primaryAction"];

const ACTIONABLE_SURFACES = {
  committedCheckoutAcceptancePacket: true,
  counterpartyActivationPacket: true,
  counterpartyIntentEvents: true,
  operatorStatusDiscovery: true,
  publicAuditDiscovery: true,
  receiptVerifierNextAction: true,
} as const satisfies VantaPayCounterpartyActivation["actionableSurfaces"];

const PRIVACY_BOUNDARY = {
  customerEmailStored: false,
  fullAuditDisclosureIdStored: false,
  fullPrivateRailReceiptIdStored: false,
  ipAddressStored: false,
  privateInputsStored: false,
  rawSettlementTermsStored: false,
  userAgentStored: false,
  witnessStored: false,
} as const satisfies VantaPayCounterpartyActivation["privacyBoundary"];

const CLAIM_CONTROLS = {
  adoptionClaimAllowed: false,
  anonymityClaimAllowed: false,
  claimLiftBlockedUntilReviewedLiveEvidence: true,
  complianceSafeClaimAllowed: false,
  productionReady: false,
  regulatorApprovalClaimAllowed: false,
} as const satisfies VantaPayCounterpartyActivation["claimControls"];

const MEASUREMENT = {
  eventIntakeEndpoint: "POST /v1/growth-loop/events",
  eventTypes: VANTA_PAY_COUNTERPARTY_ACTIVATION_EVENT_TYPES,
  measurementMode: "live-redacted-first-party",
  noCustomerEmailValue: true,
  noIpAddressOrUserAgent: true,
  redactedFirstParty: true,
  statusEndpoint: "GET /v1/growth-loop/status",
} as const satisfies VantaPayCounterpartyActivation["measurement"];

const VERIFICATION = {
  command: "npm run pay:counterparty-activation-check",
  commands: [
    "npm run pay:counterparty-activation-check",
    "npm run pay:measured-loop-implementation-check",
    "npm run pay:growth-loop-check",
    "npm run pay:receipt-public-view-check",
    "npm run pay:merchant-api-check",
    "npm run public:audit-discovery-check",
    "npm run pay:verify",
  ],
} as const satisfies VantaPayCounterpartyActivation["verification"];

const SOURCE_REFS = [
  "operator/pay-server.mjs",
  "src/pay/vantaPayCommittedCheckoutAcceptance.ts",
  "src/pay/vantaPayCounterpartyActivation.ts",
  "src/pay/vantaPayGrowthLoopEvidence.ts",
  "src/pay/vantaPayMeasuredLoopImplementation.ts",
  "src/pay/vantaPayReceiptPublicView.ts",
  "src/components/PayReceiptPacketCard.tsx",
  "src/pages/ReceiptVerificationPage.tsx",
  "public/.well-known/vanta-audit.json",
  "scripts/check-vanta-pay-counterparty-activation.mjs",
] as const;

const TRUTH_BOUNDARY =
  "Counterparty activation turns a receipt into a next-action request surface and redacted intent measurement. It is not an adoption claim, not production privacy, not anonymity, not compliance approval, not audit acceptance, and not mainnet readiness.";

function packetForReceiptRef(
  receiptRef: VantaPayCounterpartyActivation["receiptRef"],
): VantaPayCounterpartyActivation {
  return {
    schemaVersion: VANTA_PAY_COUNTERPARTY_ACTIVATION_SCHEMA_VERSION,
    object: "pay_counterparty_activation",
    status: "actionable-live-redacted-claim-blocked",
    activationMode: "receipt-bound-counterparty-next-action",
    measurementMode: "live-redacted-first-party",
    liveMeasurementEnabled: true,
    receiptRef,
    verifiedFacts: {
      amountAndAsset: true,
      receiptStatus: true,
      redactedSettlementReferences: true,
    },
    actionableSurfaces: ACTIONABLE_SURFACES,
    activationEventTypes: VANTA_PAY_COUNTERPARTY_ACTIVATION_EVENT_TYPES,
    counterpartyNextAction: COUNTERPARTY_ACTIVATION_ACTION,
    primaryAction: COUNTERPARTY_ACTIVATION_ACTION,
    measurement: MEASUREMENT,
    privacyBoundary: PRIVACY_BOUNDARY,
    claimControls: CLAIM_CONTROLS,
    sourceRefs: SOURCE_REFS,
    verification: VERIFICATION,
    verificationCommand: "npm run pay:counterparty-activation-check",
    verificationCommands: VERIFICATION.commands,
    truthBoundary: TRUTH_BOUNDARY,
  };
}

export const VANTA_PAY_COUNTERPARTY_ACTIVATION = packetForReceiptRef({
  amount: "receipt-bound",
  asset: "USDC",
  receiptId: ":receiptId",
  sharePath: "/receipt/:receiptId",
  status: "paid",
}) satisfies VantaPayCounterpartyActivation;

export function buildVantaPayCounterpartyActivation(
  receipt: VantaPayReceipt,
): VantaPayCounterpartyActivation {
  return packetForReceiptRef({
    amount: receipt.amount,
    asset: receipt.asset,
    receiptId: receipt.id,
    sharePath: `/receipt/${receipt.id}`,
    status: receipt.status,
  });
}
