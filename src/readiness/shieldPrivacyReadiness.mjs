export const VANTA_SHIELD_PRIVACY_READINESS_VERSION =
  "vanta-shield-privacy-readiness-0.1";

const PRODUCTION_BLOCKERS = [
  ["production-anonymity-set", "productionAnonymitySetReady"],
  ["durable-production-services", "durableProductionServicesReady"],
  ["relayer-separation", "relayerSeparationReady"],
  ["independent-audit", "independentAuditReady"],
  ["live-mainnet-settlement", "liveMainnetSettlementReady"],
  ["production-key-custody", "productionKeyCustodyReady"],
];

export function createVantaShieldPrivacyReadiness(input = {}) {
  const committedSettlementReady = input.committedSettlementReady === true;
  const viewingKeyMemoReady = input.viewingKeyMemoReady === true;
  const viewingKeyCustodyReady = input.viewingKeyCustodyReady === true;
  const decoyBatchingReady = input.decoyBatchingReady === true;
  const nativeSolShieldReady = input.nativeSolShieldReady === true;
  const universalTargetReady = input.universalTargetReady === true;
  const routeEvidenceReady = input.routeEvidenceReady === true;
  const productionBlockers = Object.fromEntries(
    PRODUCTION_BLOCKERS.map(([id, inputKey]) => [id, input[inputKey] === true]),
  );
  const blockers = PRODUCTION_BLOCKERS.filter(([id]) => !productionBlockers[id]).map(
    ([id]) => id,
  );
  const productionEvidenceReady = blockers.length === 0;
  const localCapabilitiesReady =
    committedSettlementReady &&
    viewingKeyMemoReady &&
    viewingKeyCustodyReady &&
    decoyBatchingReady &&
    nativeSolShieldReady &&
    universalTargetReady &&
    routeEvidenceReady;
  const strictReady = localCapabilitiesReady && productionEvidenceReady;

  return {
    version: VANTA_SHIELD_PRIVACY_READINESS_VERSION,
    kind: "vanta-shield-privacy-readiness",
    failClosed: true,
    gateCommand: "npm run shield:privacy-readiness-check",
    currentTruth:
      "local Shield uses committed settlement packets, viewing-key encrypted memos, beta backup/restore custody, native/SPL entry support, route evidence, and decoy writes; production privacy claims remain blocked",
    localCommittedSettlementReady: committedSettlementReady,
    localViewingKeyMemoReady: viewingKeyMemoReady,
    localViewingKeyCustodyReady: viewingKeyCustodyReady,
    localDecoyBatchingReady: decoyBatchingReady,
    localNativeSolShieldReady: nativeSolShieldReady,
    localUniversalTargetReady: universalTargetReady,
    localRouteEvidenceReady: routeEvidenceReady,
    localCapabilities: {
      committedSettlementReady,
      viewingKeyMemoReady,
      viewingKeyCustodyReady,
      decoyBatchingReady,
      nativeSolShieldReady,
      universalTargetReady,
      routeEvidenceReady,
    },
    productionBlockers,
    blockers,
    strictReady,
    fullyPrivateShieldClaimAllowed: false,
    livePrivateShieldClaimAllowed: false,
    liveProductionClaimAllowed: false,
    mainnetReady: false,
  };
}
