import type {
  VantaPayInstitutionalDisclosureReceipt,
  VantaPayReceipt,
  VantaPayReceiptPublicView,
  VantaPayReceiptRedactedReference,
} from "./vantaPayTypes";
// @ts-expect-error Node-based Pay checks import this TS source directly and need the explicit suffix.
import { buildVantaPayAmountWindowDisclosure } from "./vantaPayAmountWindowDisclosure.ts";
// @ts-expect-error Node-based Pay checks import this TS source directly and need the explicit suffix.
import { buildVantaPayCommittedCheckoutAcceptance } from "./vantaPayCommittedCheckoutAcceptance.ts";
// @ts-expect-error Node-based Pay checks import this TS source directly and need the explicit suffix.
import { buildVantaPayCounterpartyActivation } from "./vantaPayCounterpartyActivation.ts";
// @ts-expect-error Node-based Pay checks import this TS source directly and need the explicit suffix.
import { buildVantaPayGrowthLoopEvidence } from "./vantaPayGrowthLoopEvidence.ts";

export const VANTA_PAY_RECEIPT_PUBLIC_VIEW_VERSION =
  "vanta-pay-receipt-public-view-0.1" as const;
const VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_SCHEMA_VERSION =
  "vanta-pay-institutional-disclosure-receipt-v0.1" as const;
const VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_DISCLOSED_FIELDS = [
  "receipt_id",
  "payment_id",
  "payment_status",
  "asset",
  "amount",
  "invoice_reference",
  "compliance_gateway_summary",
  "amount_window_disclosure_summary",
  "private_settlement_reference_prefix",
  "audit_disclosure_reference_prefix",
  "claim_boundary",
  "verification_commands",
] as const satisfies VantaPayInstitutionalDisclosureReceipt["disclosedFields"];
const VANTA_PAY_COMPLIANCE_GATEWAY_SUMMARY = {
  schemaVersion: "vanta-compliance-gateway-summary-v0.1",
  supportedAttributes: ["amountAboveThreshold", "jurisdictionMatch"],
  proofMaterialPubliclyDisclosed: false,
  privateInputsDisclosed: false,
  witnessDisclosed: false,
  proofMode: "opening-stub-redacted-real-noir-adapter-pending",
  realNoirAdapter: {
    adapterId: "vanta-selective-disclosure-noir-v0.1",
    circuitPath: "zk/noir/vanta_selective_disclosure",
    status: "candidate-package-check-wired",
  },
  verificationCommand: "npm run compliance:gateway-check",
  claimBoundary: "beta-selective-disclosure-not-production-private-or-regulator-approved",
} as const satisfies VantaPayInstitutionalDisclosureReceipt["receiptRef"]["complianceGateway"];
const VANTA_PAY_RECEIPT_GROWTH_LOOP_SCHEMA_VERSION =
  "vanta-pay-receipt-growth-loop-v0.1" as const;

function redactReference(id: string | null): VantaPayReceiptRedactedReference {
  if (!id) {
    return {
      idPrefix: null,
      redacted: true,
    };
  }

  return {
    idPrefix: id.slice(0, Math.min(10, id.length)),
    redacted: true,
  };
}

function createInstitutionalDisclosureExpiry(createdAt: string): string {
  const createdAtDate = new Date(createdAt);
  createdAtDate.setUTCDate(createdAtDate.getUTCDate() + 7);
  return createdAtDate.toISOString();
}

export function buildVantaPayReceiptPublicView(
  receipt: VantaPayReceipt,
): VantaPayReceiptPublicView {
  const growthLoopEvidence = buildVantaPayGrowthLoopEvidence(receipt);
  const counterpartyActivation = buildVantaPayCounterpartyActivation(receipt);
  const committedCheckoutAcceptance = buildVantaPayCommittedCheckoutAcceptance(receipt);

  return {
    amount: receipt.amount,
    asset: receipt.asset,
    checkoutSessionId: receipt.checkoutSessionId,
    createdAt: receipt.createdAt,
    customer: {
      emailCollected: Boolean(receipt.customerEmail),
      emailRedacted: true,
    },
    invoiceReference: receipt.invoiceReference,
    merchantId: receipt.merchantId,
    object: "receipt_public_view",
    orderId: receipt.orderId,
    paymentId: receipt.paymentId,
    checkoutCompletion: {
      basis: receipt.completionBasis,
      customerPaymentEvidenceRefPresent: Boolean(receipt.customerPaymentEvidenceRef),
      localHarness: receipt.completionBasis === "local-test-harness",
    },
    privateSettlement: {
      auditDisclosure: redactReference(receipt.auditDisclosureId),
      policyMode: "legible-trust",
      productionReady: false,
      railReceipt: redactReference(receipt.privateRailReceiptId),
    },
    receiptId: receipt.id,
    status: receipt.status,
    verification: {
      claimBoundary: "receipt-backed-test-settlement-not-production-private",
      commands: [
        "npm run pay:receipt-public-view-check",
        "npm run pay:receipt-privacy-contract-check",
        "npm run pay:institutional-disclosure-receipt-check",
        "npm run compliance:gateway-check",
        "npm run pay:growth-loop-check",
        "npm run pay:measured-loop-implementation-check",
        "npm run pay:counterparty-activation-check",
        "npm run pay:committed-checkout-acceptance-check",
        "npm run programmatic-privacy:contract-check",
        "npm run twitter-intelligence:check",
      ],
      operatorStatusSurface: "npm run pay:production-readiness-json",
      productionReady: false,
      redactionPolicy: "customer-email-and-full-private-settlement-refs-redacted",
    },
    localProving: {
      defaultMode: "client_side_only",
      privateInputsLeaveClient: false,
      fallbackAllowed: false,
      evidenceStatus: "declared-red-first",
      verificationCommand: "npm run local-proving-enforced-check",
    },
    usageVelocity: {
      primitive: "Pay",
      evidenceStatus: "red-first-no-live-measurement",
      metricSurface: "npm run usage-velocity-check",
      claimLiftBlockedUntilMeasured: true,
      institutionalVolumeTracked: true,
    },
    institutionalDisclosure: {
      mode: "selective_disclosure_receipt",
      receiptSchemaVersion: VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_SCHEMA_VERSION,
      buyerShareable: "selective_disclosure",
      regulatorScope: "time-and-scope-limited",
      expiresAt: createInstitutionalDisclosureExpiry(receipt.createdAt),
      disclosedFields: VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_DISCLOSED_FIELDS,
      amountWindowDisclosure: buildVantaPayAmountWindowDisclosure(receipt),
      complianceGateway: VANTA_PAY_COMPLIANCE_GATEWAY_SUMMARY,
      privateInputsDisclosed: false,
      witnessDisclosed: false,
      fullTransactionHistoryDisclosed: false,
      productionReady: false,
      verificationCommand: "npm run pay:institutional-disclosure-receipt-check",
    },
    growthLoop: {
      schemaVersion: VANTA_PAY_RECEIPT_GROWTH_LOOP_SCHEMA_VERSION,
      sharePath: `/receipt/${receipt.id}`,
      counterpartyVerification: {
        operatorStatusSurface: "npm run pay:production-readiness-json",
        productionReady: false,
        verificationCommand: "npm run pay:growth-loop-check",
        verifierRoute: "/receipt/:receiptId",
        verifierSurface: "ReceiptVerificationPage",
      },
      invitedUse: {
        invitationClaimAllowed: false,
        invitationStatus: "local-preview-only",
        nextAction: "share_receipt_with_counterparty",
      },
      repeatedPrivateAction: {
        liveUsageMeasured: false,
        repeatIntent: "counterparty_can_request_next_private_settlement",
      },
      usageVelocity: {
        primitive: "Pay",
        evidenceStatus: "local-fixture-measured-claim-blocked",
        metricSurface: "npm run usage-velocity-check",
        volume7dUsd: growthLoopEvidence.derivedCounters.volume7dUsd,
        volume30dUsd: growthLoopEvidence.derivedCounters.volume30dUsd,
        transactionCount7d: growthLoopEvidence.derivedCounters.transactionCount7d,
        transactionCount30d: growthLoopEvidence.derivedCounters.transactionCount30d,
        invitedCounterparties7d: growthLoopEvidence.derivedCounters.invitedCounterparties7d,
        repeatedPrivateActions7d: growthLoopEvidence.derivedCounters.repeatedPrivateActions7d,
        claimLiftBlockedUntilMeasured: true,
      },
      evidence: growthLoopEvidence,
      productionReady: false,
    },
    counterpartyActivation,
    committedCheckoutAcceptance,
    version: VANTA_PAY_RECEIPT_PUBLIC_VIEW_VERSION,
  };
}
