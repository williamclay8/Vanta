import type { VantaPayMeasuredLoopImplementation } from "./vantaPayTypes.ts";

export const VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION_SCHEMA_VERSION =
  "vanta-pay-measured-loop-implementation-v0.1" as const;

export const VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION =
  {
    schemaVersion: VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION_SCHEMA_VERSION,
    object: "pay_measured_loop_implementation",
    status: "implemented-live-redacted-claim-blocked",
    measurementMode: "live-redacted-first-party",
    liveMeasurementEnabled: true,
    implementedSurfaces: {
      automaticReceiptGeneratedEvent: true,
      committedCheckoutAcceptanceSurface: true,
      counterpartyActivationSurface: true,
      eventIntakeEndpoint: "POST /v1/growth-loop/events",
      eventLedgerSnapshotPersistence: true,
      operatorStatusEndpoint: "GET /v1/growth-loop/status",
      publicAuditDiscovery: true,
      receiptVerifierSurface: "/receipt/:receiptId",
      runtimeRedactedEventLedger: true,
    },
    liveDeployReceipt: {
      lastVerifiedAt: "2026-06-07T02:34:50Z",
      operatorDeployId: "dep-d8idfuhoagis73dar0b0",
      staticDeployId: "dep-d8idfupoagis73dar1ng",
      verifiedCommit: "eaa9144d035f6042671795cd52a2c316d7c35452",
      liveUrl: "https://vantaprivacy.xyz",
      operatorUrl: "https://vanta-0wwi.onrender.com",
    },
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
    sourceRefs: [
      "operator/pay-server.mjs",
      "src/pay/vantaPayRuntime.ts",
      "src/pay/vantaPayCommittedCheckoutAcceptance.ts",
      "src/pay/vantaPayCounterpartyActivation.ts",
      "src/pay/vantaPayGrowthLoopEvidence.ts",
      "src/pay/vantaPayMeasuredLoopImplementation.ts",
      "public/.well-known/vanta-audit.json",
      "scripts/check-vanta-pay-measured-loop-implementation.mjs",
    ],
    verificationCommands: [
      "npm run pay:measured-loop-implementation-check",
      "npm run pay:counterparty-activation-check",
      "npm run pay:committed-checkout-acceptance-check",
      "npm run pay:growth-loop-check",
      "npm run pay:merchant-api-check",
      "npm run public:audit-discovery-check",
      "npm run pay:verify",
    ],
    truthBoundary:
      "The Pay measured loop is implemented as live redacted first-party operator measurement with claim controls locked. This is not an adoption, production privacy, anonymity, compliance approval, audit acceptance, or mainnet readiness claim.",
  } as const satisfies VantaPayMeasuredLoopImplementation;
