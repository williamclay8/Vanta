import type { VantaPayCommittedCheckoutAcceptance, VantaPayReceipt } from "./vantaPayTypes.ts";

export const VANTA_PAY_COMMITTED_CHECKOUT_ACCEPTANCE_SCHEMA_VERSION =
  "vanta-pay-committed-checkout-acceptance-v0.1" as const;

export const VANTA_PAY_COMMITTED_CHECKOUT_ACCEPTANCE_EVENT_TYPES = [
  "committed_checkout_acceptance_created",
] as const satisfies VantaPayCommittedCheckoutAcceptance["measurement"]["eventTypes"];

const ACCEPTANCE_ACTION = {
  ctaLabel: "Accept committed checkout",
  eventType: "committed_checkout_acceptance_created",
  nextAction: "accept_committed_checkout_private_settlement",
  policySafeCopy: "Accept a receipt-bound private settlement with committed checkout terms.",
  route: "/app/pay",
} as const satisfies VantaPayCommittedCheckoutAcceptance["acceptanceAction"];

const ACCEPTED_PRIVATE_SETTLEMENT = {
  acceptanceVerificationCommand: "npm run pay:committed-checkout-acceptance-check",
  acceptedCheckoutSettlementBoundary: "actual-private-spend-protocol-settlement",
  checkoutProofBoundary: "hidden-economics-request",
  checkoutSettlementRoute: "actual-private-spend-protocol-settlement",
  customerPaymentEvidenceRequiredForProduction: true,
  customerPaymentEvidenceWired: false,
  economicsMode: "committed-economics",
  proofBoundaryVerificationCommand: "npm run pay:hidden-economics-request-check",
  rawEconomicTermsInAcceptedCheckoutSettlement: false,
  rawEconomicTermsInLiveCheckoutSettlement: false,
  rawEconomicTermsInProofRequest: false,
} as const satisfies VantaPayCommittedCheckoutAcceptance["acceptedPrivateSettlement"];

const MEASUREMENT = {
  eventIntakeEndpoint: "POST /v1/growth-loop/events",
  eventTypes: VANTA_PAY_COMMITTED_CHECKOUT_ACCEPTANCE_EVENT_TYPES,
  measurementMode: "live-redacted-first-party",
  noCustomerEmailValue: true,
  noIpAddressOrUserAgent: true,
  noRawFutureSettlementTerms: true,
  redactedFirstParty: true,
  statusEndpoint: "GET /v1/growth-loop/status",
} as const satisfies VantaPayCommittedCheckoutAcceptance["measurement"];

const PRIVACY_BOUNDARY = {
  customerEmailStored: false,
  fullAuditDisclosureIdStored: false,
  fullPrivateRailReceiptIdStored: false,
  ipAddressStored: false,
  privateInputsStored: false,
  rawFutureSettlementTermsStored: false,
  rawSettlementTermsStored: false,
  userAgentStored: false,
  witnessStored: false,
} as const satisfies VantaPayCommittedCheckoutAcceptance["privacyBoundary"];

const CLAIM_CONTROLS = {
  adoptionClaimAllowed: false,
  anonymityClaimAllowed: false,
  claimLiftBlockedUntilReviewedLiveEvidence: true,
  complianceSafeClaimAllowed: false,
  productionReady: false,
  regulatorApprovalClaimAllowed: false,
} as const satisfies VantaPayCommittedCheckoutAcceptance["claimControls"];

const VERIFICATION = {
  command: "npm run pay:committed-checkout-acceptance-check",
  commands: [
    "npm run pay:committed-checkout-acceptance-check",
    "npm run pay:hidden-economics-request-check",
    "npm run pay:counterparty-activation-check",
    "npm run pay:merchant-api-check",
    "npm run pay:receipt-public-view-check",
    "npm run public:audit-discovery-check",
    "npm run pay:verify",
  ],
} as const satisfies VantaPayCommittedCheckoutAcceptance["verification"];

const SOURCE_REFS = [
  "operator/pay-server.mjs",
  "src/pay/vantaPayCommittedCheckoutAcceptance.ts",
  "src/pay/vantaPayPrivateSettlementAdapter.ts",
  "src/pay/vantaPayGrowthLoopEvidence.ts",
  "src/pay/vantaPayReceiptPublicView.ts",
  "src/components/PayReceiptPacketCard.tsx",
  "src/pages/ReceiptVerificationPage.tsx",
  "public/.well-known/vanta-audit.json",
  "scripts/check-vanta-pay-committed-checkout-acceptance.mjs",
] as const;

const TRUTH_BOUNDARY =
  "Committed checkout acceptance makes the receipt-bound next action inspectable and measured through redacted metadata. It does not execute a settlement by itself, does not prove live adoption, does not enable production privacy, and does not lift audit, compliance, regulator, anonymity, mainnet, signing, broadcast, or real-funds claims.";

function packetForReceiptRef(
  receiptRef: VantaPayCommittedCheckoutAcceptance["receiptRef"],
): VantaPayCommittedCheckoutAcceptance {
  return {
    schemaVersion: VANTA_PAY_COMMITTED_CHECKOUT_ACCEPTANCE_SCHEMA_VERSION,
    object: "pay_committed_checkout_acceptance",
    status: "acceptance-ready-live-redacted-claim-blocked",
    acceptanceMode: "receipt-bound-committed-economics-acceptance",
    measurementMode: "live-redacted-first-party",
    liveMeasurementEnabled: true,
    receiptRef,
    acceptedFacts: {
      committedEconomicsBoundary: true,
      receiptStatus: true,
      redactedSettlementReferences: true,
    },
    acceptanceAction: ACCEPTANCE_ACTION,
    acceptedPrivateSettlement: ACCEPTED_PRIVATE_SETTLEMENT,
    measurement: MEASUREMENT,
    privacyBoundary: PRIVACY_BOUNDARY,
    claimControls: CLAIM_CONTROLS,
    sourceRefs: SOURCE_REFS,
    verification: VERIFICATION,
    verificationCommand: "npm run pay:committed-checkout-acceptance-check",
    verificationCommands: VERIFICATION.commands,
    truthBoundary: TRUTH_BOUNDARY,
  };
}

export const VANTA_PAY_COMMITTED_CHECKOUT_ACCEPTANCE = packetForReceiptRef({
  amount: "receipt-bound",
  asset: "USDC",
  receiptId: ":receiptId",
  sharePath: "/receipt/:receiptId",
  status: "paid",
}) satisfies VantaPayCommittedCheckoutAcceptance;

export function buildVantaPayCommittedCheckoutAcceptance(
  receipt: VantaPayReceipt,
): VantaPayCommittedCheckoutAcceptance {
  return packetForReceiptRef({
    amount: receipt.amount,
    asset: receipt.asset,
    receiptId: receipt.id,
    sharePath: `/receipt/${receipt.id}`,
    status: receipt.status,
  });
}
