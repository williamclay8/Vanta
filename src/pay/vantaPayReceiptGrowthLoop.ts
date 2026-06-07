import type { VantaPayReceipt, VantaPayReceiptGrowthLoop } from "./vantaPayTypes.ts";
// @ts-expect-error Node-based Pay checks import this TS source directly and need the explicit suffix.
import { buildVantaPayGrowthLoopEvidence } from "./vantaPayGrowthLoopEvidence.ts";

export const VANTA_PAY_RECEIPT_GROWTH_LOOP_SCHEMA_VERSION =
  "vanta-pay-receipt-growth-loop-v0.1" as const;

export const VANTA_PAY_RECEIPT_GROWTH_LOOP_STEPS = [
  "private_action",
  "trust_packet_ready",
  "counterparty_verification",
  "invited_use",
  "repeated_private_action",
] as const satisfies VantaPayReceiptGrowthLoop["loopSteps"];

export function buildVantaPayReceiptGrowthLoop(receipt: VantaPayReceipt): VantaPayReceiptGrowthLoop {
  const evidence = buildVantaPayGrowthLoopEvidence(receipt);

  return {
    schemaVersion: VANTA_PAY_RECEIPT_GROWTH_LOOP_SCHEMA_VERSION,
    object: "receipt_growth_loop",
    loopName: "counterparty-verifiable private settlement",
    loopSteps: VANTA_PAY_RECEIPT_GROWTH_LOOP_STEPS,
    privateAction: {
      amount: receipt.amount,
      asset: receipt.asset,
      primitive: "Pay",
      receiptId: receipt.id,
      status: receipt.status,
    },
    trustPacket: {
      claimBoundary: "receipt-backed-test-settlement-not-production-private",
      disclosedSummary: "receipt-status-amount-asset-payment-reference",
      redactedSummary: "customer-email-full-private-rail-and-audit-ids",
      schemaVersion: "vanta-pay-receipt-public-view-0.1",
      sharePath: `/receipt/${receipt.id}`,
    },
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
      volume7dUsd: evidence.derivedCounters.volume7dUsd,
      volume30dUsd: evidence.derivedCounters.volume30dUsd,
      transactionCount7d: evidence.derivedCounters.transactionCount7d,
      transactionCount30d: evidence.derivedCounters.transactionCount30d,
      invitedCounterparties7d: evidence.derivedCounters.invitedCounterparties7d,
      repeatedPrivateActions7d: evidence.derivedCounters.repeatedPrivateActions7d,
      claimLiftBlockedUntilMeasured: true,
    },
    evidence,
    claimControls: {
      adoptionClaimAllowed: false,
      anonymityClaimAllowed: false,
      complianceSafeClaimAllowed: false,
      productionReady: false,
      regulatorApprovalClaimAllowed: false,
    },
    verification: {
      commands: [
        "npm run pay:growth-loop-check",
        "npm run pay:receipt-public-view-check",
        "npm run usage-velocity-check",
        "npm run pay:verify",
      ],
    },
  };
}
