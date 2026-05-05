export const VANTA_SHIELD_PRIVACY_READINESS_VERSION =
  "vanta-shield-privacy-readiness-0.1";

const CURRENT_LOCAL_CAPABILITY_INPUTS = {
  committedSettlementReady: true,
  decoyBatchingReady: true,
  nativeSolShieldReady: true,
  shieldEntryProofReady: true,
  routeEvidenceReady: true,
  universalTargetReady: true,
  viewingKeyCustodyReady: true,
  viewingKeyMemoReady: true,
};

const PRODUCTION_GATE_BLOCKERS = [
  {
    id: "production-anonymity-set",
    inputKey: "productionAnonymitySetReady",
    requiredEvidenceRefs: [
      "VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF",
      "VANTA_PRIVATE_POOL_V2_PRODUCTION_ANONYMITY_METRICS_REF",
      "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
      "npm run private-pool-v2:anonymity-set-evidence-check",
      "npm run private-pool-v2:anonymity-set-readiness-check",
    ],
  },
  {
    id: "durable-production-services",
    inputKey: "durableProductionServicesReady",
    requiredEvidenceRefs: [
      "ops/mainnet/service-deployment.evidence.json",
      "npm run mainnet:service-deployment-evidence-check",
    ],
  },
  {
    id: "relayer-separation",
    inputKey: "relayerSeparationReady",
    requiredEvidenceRefs: [
      "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
      "VANTA_PRIVATE_POOL_V2_RELAYER_LOG_REDACTION_REF",
      "VANTA_PRIVATE_POOL_V2_RELAYER_DEPLOYMENT_SEPARATION_REF",
      "ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
      "npm run private-pool-v2:relayer-separation-evidence-check",
    ],
  },
];

const EXTERNAL_GATE_BLOCKERS = [
  {
    id: "independent-audit",
    inputKey: "independentAuditReady",
    requiredEvidenceRefs: ["VANTA_PRIVATE_POOL_V2_AUDIT_REF"],
  },
  {
    id: "live-mainnet-settlement",
    inputKey: "liveMainnetSettlementReady",
    requiredEvidenceRefs: [
      "VANTA_PRIVATE_POOL_V2_PRODUCTION_SMOKE_EVIDENCE_REF",
      "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
      "npm run mainnet:production-smoke-evidence-check",
    ],
  },
  {
    id: "production-key-custody",
    inputKey: "productionKeyCustodyReady",
    requiredEvidenceRefs: [
      "VANTA_SHIELD_PRODUCTION_KEY_CUSTODY_REF",
      "ops/mainnet/mainnet-approval-gates.evidence.json",
      "npm run mainnet:approval-gates-evidence-check",
    ],
  },
];

const GATE_BLOCKERS = [...PRODUCTION_GATE_BLOCKERS, ...EXTERNAL_GATE_BLOCKERS];

const CURRENT_EVIDENCE_REFS = [
  "npm run shield:committed-settlement-check",
  "npm run private-pool-v2:shield-proof-request-check",
  "npm run private-pool-v2:shield-circuit-check",
  "npm run private-pool-v2:shield-prove",
  "npm run shield:memo-encryption-check",
  "npm run shield:viewing-key-custody-check",
  "npm run shield:decoy-batcher-check",
  "npm run shield:ui-claim-boundary-check",
  "npm run shield:native-sol-check",
  "npm run shield:route-evidence-check",
  "npm run shield:privacy-readiness-check",
];

function unique(values) {
  return [...new Set(values)];
}

function createGateStatus(blocker, input) {
  return {
    id: blocker.id,
    ready: input[blocker.inputKey] === true,
    requiredEvidenceRefs: blocker.requiredEvidenceRefs,
  };
}

export function createCurrentVantaShieldPrivacyReadiness(input = {}) {
  return createVantaShieldPrivacyReadiness({
    ...CURRENT_LOCAL_CAPABILITY_INPUTS,
    ...input,
  });
}

export function createVantaShieldPrivacyReadiness(input = {}) {
  const committedSettlementReady = input.committedSettlementReady === true;
  const viewingKeyMemoReady = input.viewingKeyMemoReady === true;
  const viewingKeyCustodyReady = input.viewingKeyCustodyReady === true;
  const decoyBatchingReady = input.decoyBatchingReady === true;
  const nativeSolShieldReady = input.nativeSolShieldReady === true;
  const shieldEntryProofReady = input.shieldEntryProofReady === true;
  const universalTargetReady = input.universalTargetReady === true;
  const routeEvidenceReady = input.routeEvidenceReady === true;
  const productionGateBlockers = PRODUCTION_GATE_BLOCKERS.map((blocker) =>
    createGateStatus(blocker, input),
  );
  const externalGateBlockers = EXTERNAL_GATE_BLOCKERS.map((blocker) =>
    createGateStatus(blocker, input),
  );
  const productionBlockers = Object.fromEntries(
    [...productionGateBlockers, ...externalGateBlockers].map((blocker) => [
      blocker.id,
      blocker.ready,
    ]),
  );
  const blockers = [...productionGateBlockers, ...externalGateBlockers]
    .filter((blocker) => !blocker.ready)
    .map((blocker) => blocker.id);
  const localCapabilitiesReady =
    committedSettlementReady &&
    viewingKeyMemoReady &&
    viewingKeyCustodyReady &&
    decoyBatchingReady &&
    nativeSolShieldReady &&
    shieldEntryProofReady &&
    universalTargetReady &&
    routeEvidenceReady;
  const productionEvidenceReady = blockers.length === 0;
  const requiredEvidenceRefs = unique(
    GATE_BLOCKERS.flatMap((blocker) => blocker.requiredEvidenceRefs),
  );

  return {
    version: VANTA_SHIELD_PRIVACY_READINESS_VERSION,
    kind: "vanta-shield-privacy-readiness",
    failClosed: true,
    gateCommand: "npm run shield:privacy-readiness-check",
    currentTruth:
      "local Shield uses committed settlement packets, a proof-bound Private Pool v2 Shield entry circuit, viewing-key encrypted memos, beta backup/restore custody, native/SPL entry support, route evidence, and decoy writes; production privacy claims remain blocked",
    localCommittedSettlementReady: committedSettlementReady,
    localViewingKeyMemoReady: viewingKeyMemoReady,
    localViewingKeyCustodyReady: viewingKeyCustodyReady,
    localDecoyBatchingReady: decoyBatchingReady,
    localNativeSolShieldReady: nativeSolShieldReady,
    localShieldEntryProofReady: shieldEntryProofReady,
    localUniversalTargetReady: universalTargetReady,
    localRouteEvidenceReady: routeEvidenceReady,
    localCapabilities: {
      committedSettlementReady,
      viewingKeyMemoReady,
      viewingKeyCustodyReady,
      decoyBatchingReady,
      nativeSolShieldReady,
      shieldEntryProofReady,
      universalTargetReady,
      routeEvidenceReady,
    },
    localCapabilitiesReady,
    currentEvidenceRefs: CURRENT_EVIDENCE_REFS,
    requiredEvidenceRefs,
    productionGateBlockers,
    externalGateBlockers,
    productionBlockers,
    productionEvidenceReady,
    blockers,
    strictReady: false,
    claimAllowed: false,
    privacyClaimAllowed: false,
    fullyPrivateShieldClaimAllowed: false,
    livePrivateShieldClaimAllowed: false,
    liveProductionClaimAllowed: false,
    mainnetReady: false,
  };
}
