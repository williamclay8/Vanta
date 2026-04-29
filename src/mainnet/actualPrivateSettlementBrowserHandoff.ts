export const VANTA_ACTUAL_PRIVATE_SETTLEMENT_BROWSER_HANDOFF_VERSION =
  "vanta-actual-private-settlement-browser-handoff-0.1" as const;

export const VANTA_ACTUAL_PRIVATE_SETTLEMENT_BROWSER_HANDOFF_ROUTE =
  "/app/actual-private-settlement" as const;

export type VantaActualPrivateSettlementBrowserHandoff = {
  browserRoute: typeof VANTA_ACTUAL_PRIVATE_SETTLEMENT_BROWSER_HANDOFF_ROUTE;
  cliPreflightCommand: "npm run mainnet:actual-private-settlement-live";
  depositSigner: "source-wallet-safe-send-browser-session";
  liveSubmissionEnabled: false;
  privateSpendSubmitter: "production-relayer-service";
  requiredBoundaries: readonly string[];
  requiredEvidenceRefs: readonly string[];
  spendSigner: "relayer-fee-payer-not-source-wallet";
  version: typeof VANTA_ACTUAL_PRIVATE_SETTLEMENT_BROWSER_HANDOFF_VERSION;
};

export function createVantaActualPrivateSettlementBrowserHandoff(): VantaActualPrivateSettlementBrowserHandoff {
  return {
    browserRoute: VANTA_ACTUAL_PRIVATE_SETTLEMENT_BROWSER_HANDOFF_ROUTE,
    cliPreflightCommand: "npm run mainnet:actual-private-settlement-live",
    depositSigner: "source-wallet-safe-send-browser-session",
    liveSubmissionEnabled: false,
    privateSpendSubmitter: "production-relayer-service",
    requiredBoundaries: [
      "cli-preflight-before-browser-session",
      "browser-wallet-safe-send-for-public-deposit",
      "wallet-message-intent-safety-for-private-spend-authorization",
      "relayer-submitted-private-spend",
      "refs-only-evidence-writing",
      "no-private-key-cli",
    ],
    requiredEvidenceRefs: [
      "VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF",
      "VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF",
      "VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF",
      "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF",
      "VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF",
      "VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF",
      "VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF",
    ],
    spendSigner: "relayer-fee-payer-not-source-wallet",
    version: VANTA_ACTUAL_PRIVATE_SETTLEMENT_BROWSER_HANDOFF_VERSION,
  };
}
