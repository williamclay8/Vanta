import type {
  VantaPayReceipt,
  VantaPayReceiptPublicView,
  VantaPayReceiptRedactedReference,
} from "./vantaPayTypes";

export const VANTA_PAY_RECEIPT_PUBLIC_VIEW_VERSION =
  "vanta-pay-receipt-public-view-0.1" as const;

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

export function buildVantaPayReceiptPublicView(
  receipt: VantaPayReceipt,
): VantaPayReceiptPublicView {
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
      mode: "selective_disclosure_design_lane",
      buyerShareable: "selective_disclosure",
      regulatorScope: "time-and-scope-limited",
      verificationCommand: "npm run institutional-lane-check",
    },
    version: VANTA_PAY_RECEIPT_PUBLIC_VIEW_VERSION,
  };
}
