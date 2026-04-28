export const VANTA_STRATEGY_PRIVATE_RAIL_TRUST_CONTRACT_VERSION =
  "vanta-strategy-private-rail-trust-contract-0.1" as const;

export type StrategyPrivateRailTrustContract = {
  version: typeof VANTA_STRATEGY_PRIVATE_RAIL_TRUST_CONTRACT_VERSION;
  currentTruth: "hash-bound proof-public Strategy rail preview";
  claimControls: {
    fullyPrivateStrategyClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
  };
  operatorPacketFields: readonly string[];
  redactedFields: readonly string[];
  readinessGateCommand: "npm run strategy:privacy-readiness-check";
  routeQuotePrivacyEvidenceGateCommand: "npm run strategy:route-quote-privacy-check";
  productionServiceReadinessGateCommand: "npm run strategy:production-service-readiness-check";
  verificationSurfaces: readonly string[];
};

export function getStrategyPrivateRailTrustContract(): StrategyPrivateRailTrustContract {
  return {
    version: VANTA_STRATEGY_PRIVATE_RAIL_TRUST_CONTRACT_VERSION,
    currentTruth: "hash-bound proof-public Strategy rail preview",
    claimControls: {
      fullyPrivateStrategyClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      productionPrivacyClaimsLocked: true,
    },
    operatorPacketFields: [
      "privateCoreBoundary",
      "proofKind",
      "proofCircuit",
      "proofReadiness",
      "proofPublicInputs",
      "inputRoot",
      "inputNullifier",
      "recipientCommitment",
      "changeCommitment",
      "outputCommitment",
      "resultingRoot",
    ],
    redactedFields: [
      "strategyPair",
      "totalNotional",
      "childNotional",
      "rawSchedule",
      "sliceOrdinal",
      "privateProofWitness",
      "ciphertextPayload",
      "rawSendAmount",
      "rawSwapInputAmount",
      "rawSwapOutputAmount",
    ],
    readinessGateCommand: "npm run strategy:privacy-readiness-check",
    routeQuotePrivacyEvidenceGateCommand: "npm run strategy:route-quote-privacy-check",
    productionServiceReadinessGateCommand: "npm run strategy:production-service-readiness-check",
    verificationSurfaces: [
      "npm run strategy:private-rail-check",
      "npm run strategy:committed-settlement-check",
      "npm run strategy:route-quote-privacy-check",
      "npm run strategy:production-service-readiness-check",
      "npm run strategy:private-rail-trust-contract-check",
      "npm run strategy:privacy-readiness-check",
      "npm run strategy:operator-runtime-check",
      "npm run strategy:verify",
      "npm run mainnet:private-settlement-check",
    ],
  };
}
