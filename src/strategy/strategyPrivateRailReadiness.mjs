export const VANTA_STRATEGY_PRIVATE_RAIL_READINESS_VERSION =
  "vanta-strategy-private-rail-readiness-0.1";

const PRODUCTION_BLOCKERS = [
  ["live-strategy-scheduler", "liveStrategySchedulerReady"],
  ["route-quote-privacy", "routeQuotePrivacyReady"],
  ["production-anonymity-set", "productionAnonymitySetReady"],
  ["relayer-separation", "relayerSeparationReady"],
  ["independent-audit", "independentAuditReady"],
  ["durable-production-services", "durableProductionServicesReady"],
  ["live-mainnet-settlement", "liveMainnetSettlementReady"],
];

export function createStrategyPrivateRailPrivacyReadiness(input = {}) {
  const localRedactedHandoffReady = input.redactedHandoffReady === true;
  const localCommittedRequestReady = input.committedSettlementRequestReady === true;
  const productionBlockers = Object.fromEntries(
    PRODUCTION_BLOCKERS.map(([id, inputKey]) => [id, input[inputKey] === true]),
  );
  const blockers = PRODUCTION_BLOCKERS.filter(([id]) => !productionBlockers[id]).map(([id]) => id);
  const productionEvidenceReady = blockers.length === 0;
  const localCapabilitiesReady = localRedactedHandoffReady && localCommittedRequestReady;
  const strictReady = localCapabilitiesReady && productionEvidenceReady;

  return {
    version: VANTA_STRATEGY_PRIVATE_RAIL_READINESS_VERSION,
    kind: "vanta-strategy-private-rail-readiness",
    failClosed: true,
    gateCommand: "npm run strategy:privacy-readiness-check",
    currentTruth:
      "hash-bound proof-public Strategy rail preview with local redacted handoff and committed request packet",
    localRedactedHandoffReady,
    localCommittedRequestReady,
    localCapabilities: {
      redactedHandoffReady: localRedactedHandoffReady,
      committedSettlementRequestReady: localCommittedRequestReady,
    },
    productionBlockers,
    blockers,
    strictReady,
    fullyPrivateStrategyClaimAllowed: false,
    livePrivateStrategyExecutionClaimAllowed: false,
    liveProductionClaimAllowed: false,
    mainnetReady: false,
  };
}
