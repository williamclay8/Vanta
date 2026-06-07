import type {
  VantaPayGrowthLoopDerivedCounters,
  VantaPayGrowthLoopEvent,
  VantaPayGrowthLoopEventType,
  VantaPayGrowthLoopEvidence,
  VantaPayLiveGrowthLoopMeasurement,
  VantaPayReceipt,
} from "./vantaPayTypes.ts";

export const VANTA_PAY_GROWTH_LOOP_EVIDENCE_SCHEMA_VERSION =
  "vanta-pay-growth-loop-evidence-v0.1" as const;
export const VANTA_PAY_GROWTH_LOOP_EVIDENCE_STATUS =
  "local-fixture-measured-claim-blocked" as const;
export const VANTA_PAY_LIVE_GROWTH_LOOP_MEASUREMENT_SCHEMA_VERSION =
  "vanta-pay-live-growth-loop-measurement-v0.1" as const;

export const VANTA_PAY_GROWTH_LOOP_EVENT_TYPES = [
  "receipt_generated",
  "share_link_copied",
  "counterparty_verifier_opened",
  "next_private_settlement_requested",
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
] as const satisfies readonly VantaPayGrowthLoopEventType[];

function addMinutes(isoTimestamp: string, minutes: number): string {
  const date = new Date(isoTimestamp);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString();
}

function toUsdAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventIdFor(receiptId: string, eventType: VantaPayGrowthLoopEventType): string {
  return `gl_${eventType}_${receiptId}`;
}

export function createVantaPayGrowthLoopFixtureEvents(
  receipt: VantaPayReceipt,
): readonly VantaPayGrowthLoopEvent[] {
  const sharePath = `/receipt/${receipt.id}`;

  return [
    {
      counterpartyRole: "merchant",
      eventId: eventIdFor(receipt.id, "receipt_generated"),
      eventType: "receipt_generated",
      measurementSource: "local-ui-fixture",
      occurredAt: receipt.createdAt,
      receiptId: receipt.id,
      sharePath,
    },
    {
      counterpartyRole: "buyer",
      eventId: eventIdFor(receipt.id, "share_link_copied"),
      eventType: "share_link_copied",
      measurementSource: "local-ui-fixture",
      occurredAt: addMinutes(receipt.createdAt, 1),
      receiptId: receipt.id,
      sharePath,
    },
    {
      counterpartyRole: "counterparty",
      eventId: eventIdFor(receipt.id, "counterparty_verifier_opened"),
      eventType: "counterparty_verifier_opened",
      measurementSource: "local-ui-fixture",
      occurredAt: addMinutes(receipt.createdAt, 2),
      receiptId: receipt.id,
      sharePath,
    },
    {
      counterpartyRole: "counterparty",
      eventId: eventIdFor(receipt.id, "next_private_settlement_requested"),
      eventType: "next_private_settlement_requested",
      measurementSource: "local-ui-fixture",
      occurredAt: addMinutes(receipt.createdAt, 3),
      receiptId: receipt.id,
      sharePath,
    },
    {
      counterpartyRole: "counterparty",
      eventId: eventIdFor(receipt.id, "committed_checkout_acceptance_created"),
      eventType: "committed_checkout_acceptance_created",
      measurementSource: "local-ui-fixture",
      occurredAt: addMinutes(receipt.createdAt, 4),
      receiptId: receipt.id,
      sharePath,
    },
  ];
}

function countEvents(
  events: readonly VantaPayGrowthLoopEvent[],
  eventType: VantaPayGrowthLoopEventType,
): number {
  return events.filter((event) => event.eventType === eventType).length;
}

function countAnyEvent(
  events: readonly VantaPayGrowthLoopEvent[],
  eventTypes: readonly VantaPayGrowthLoopEventType[],
): number {
  const allowedTypes = new Set(eventTypes);
  return events.filter((event) => allowedTypes.has(event.eventType)).length;
}

export function deriveVantaPayGrowthLoopCounters(
  receipt: VantaPayReceipt,
  events: readonly VantaPayGrowthLoopEvent[],
): VantaPayGrowthLoopDerivedCounters {
  return deriveVantaPayGrowthLoopCountersForReceipts([receipt], events);
}

export function deriveVantaPayGrowthLoopCountersForReceipts(
  receipts: readonly VantaPayReceipt[],
  events: readonly VantaPayGrowthLoopEvent[],
): VantaPayGrowthLoopDerivedCounters {
  const receiptById = new Map(receipts.map((receipt) => [receipt.id, receipt]));
  const receiptGeneratedCount = countEvents(events, "receipt_generated");
  const shareLinkCopiedCount = countAnyEvent(events, [
    "share_link_copied",
    "counterparty_invite_created",
  ]);
  const verifierOpenedCount = countAnyEvent(events, [
    "counterparty_verifier_opened",
    "counterparty_invite_opened",
  ]);
  const nextSettlementRequestCount = countAnyEvent(events, [
    "next_private_settlement_requested",
    "next_settlement_intent_created",
    "committed_checkout_acceptance_created",
  ]);
  const volumeUsd = events
    .filter((event) => event.eventType === "receipt_generated")
    .reduce((total, event) => total + toUsdAmount(receiptById.get(event.receiptId)?.amount ?? "0"), 0);

  return {
    counterpartyVerifierOpened7d: verifierOpenedCount,
    counterpartyVerifierOpened30d: verifierOpenedCount,
    invitedCounterparties7d: shareLinkCopiedCount,
    invitedCounterparties30d: shareLinkCopiedCount,
    nextPrivateSettlementRequests7d: nextSettlementRequestCount,
    nextPrivateSettlementRequests30d: nextSettlementRequestCount,
    repeatedPrivateActions7d: nextSettlementRequestCount,
    repeatedPrivateActions30d: nextSettlementRequestCount,
    transactionCount7d: receiptGeneratedCount,
    transactionCount30d: receiptGeneratedCount,
    volume7dUsd: volumeUsd,
    volume30dUsd: volumeUsd,
  };
}

export function buildVantaPayGrowthLoopEvidence(
  receipt: VantaPayReceipt,
  events: readonly VantaPayGrowthLoopEvent[] = createVantaPayGrowthLoopFixtureEvents(receipt),
): VantaPayGrowthLoopEvidence {
  const safeEvents = events.filter((event) => event.receiptId === receipt.id);

  return {
    schemaVersion: VANTA_PAY_GROWTH_LOOP_EVIDENCE_SCHEMA_VERSION,
    measurementMode: "local-fixture-only",
    eventLedger: {
      object: "growth_loop_event_ledger",
      events: safeEvents,
      liveMeasurementEnabled: false,
      measurementMode: "local-fixture-only",
      productionReady: false,
      retentionBoundary: "local-test-fixture-no-customer-private-inputs",
    },
    derivedCounters: deriveVantaPayGrowthLoopCounters(receipt, safeEvents),
    publicSummary: {
      nextAction: "request_next_private_settlement",
      receiptId: receipt.id,
      sharePath: `/receipt/${receipt.id}`,
    },
    claimControls: {
      adoptionClaimAllowed: false,
      anonymityClaimAllowed: false,
      claimLiftBlockedUntilLiveEvidence: true,
      complianceSafeClaimAllowed: false,
      productionReady: false,
      regulatorApprovalClaimAllowed: false,
    },
    verificationCommand: "npm run pay:growth-loop-check",
  };
}

export function buildVantaPayLiveGrowthLoopMeasurement(
  receipts: readonly VantaPayReceipt[],
  events: readonly VantaPayGrowthLoopEvent[],
): VantaPayLiveGrowthLoopMeasurement {
  const knownReceiptIds = new Set(receipts.map((receipt) => receipt.id));
  const safeEvents = events.filter(
    (event) =>
      knownReceiptIds.has(event.receiptId) &&
      event.measurementSource === "pay-operator-live-redacted",
  );

  return {
    schemaVersion: VANTA_PAY_LIVE_GROWTH_LOOP_MEASUREMENT_SCHEMA_VERSION,
    object: "pay_growth_loop_live_measurement",
    measurementMode: "live-redacted-first-party",
    liveMeasurementEnabled: true,
    eventLedger: {
      object: "growth_loop_event_ledger",
      events: safeEvents,
      liveMeasurementEnabled: true,
      measurementMode: "live-redacted-first-party",
      productionReady: false,
      retentionBoundary: "redacted-live-event-ledger-no-customer-private-inputs",
    },
    derivedCounters: deriveVantaPayGrowthLoopCountersForReceipts(receipts, safeEvents),
    privacyBoundary: {
      customerEmailStored: false,
      fullAuditDisclosureIdStored: false,
      fullPrivateRailReceiptIdStored: false,
      ipAddressStored: false,
      privateInputsStored: false,
      rawSettlementTermsStored: false,
      userAgentStored: false,
      witnessStored: false,
    },
    claimControls: {
      adoptionClaimAllowed: false,
      anonymityClaimAllowed: false,
      claimLiftBlockedUntilReviewedLiveEvidence: true,
      complianceSafeClaimAllowed: false,
      productionReady: false,
      regulatorApprovalClaimAllowed: false,
    },
    statusEndpoint: "GET /v1/growth-loop/status",
    eventIntakeEndpoint: "POST /v1/growth-loop/events",
    verificationCommand: "npm run pay:growth-loop-check",
  };
}
