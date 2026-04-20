import type {
  VantaPrivacyCapabilityProfile,
  VantaPrivacyProtocolAdapter,
  VantaPrivacyRouteAssessment,
  VantaPrivacyRouteIntent,
} from "./protocolAdapter";
import { createVantaPrivatePoolV2PrivacyAdapter } from "./privatePoolV2CapabilityProfile";
import { createUmbraExternalPrivacyAdapter } from "./umbraCapabilityProfile";
import { createVantaLocalPrivacyAdapter } from "./vantaLocalAdapter";

export type VantaHybridCapabilityMatrix = {
  assessments: readonly VantaPrivacyRouteAssessment[];
  profiles: readonly VantaPrivacyCapabilityProfile[];
  recommended: VantaPrivacyRouteAssessment | null;
};

function scoreAssessment(assessment: VantaPrivacyRouteAssessment) {
  if (!assessment.supported) {
    return -1;
  }

  const flags = assessment.profile.flags;
  return [
    flags.unlinkableTransfers,
    flags.sharedAnonymitySet,
    flags.relayedClaims,
    flags.amountPrivacy,
    flags.accountBalanceConfidentiality,
    flags.hiddenChangeOutputs,
    flags.broadPublicAssetEntry,
  ].filter(Boolean).length;
}

export function createDefaultVantaPrivacyAdapters(): readonly VantaPrivacyProtocolAdapter[] {
  return [
    createVantaLocalPrivacyAdapter(),
    createUmbraExternalPrivacyAdapter(),
    createVantaPrivatePoolV2PrivacyAdapter(),
  ];
}

export function buildVantaHybridCapabilityMatrix(
  intent: VantaPrivacyRouteIntent,
  adapters = createDefaultVantaPrivacyAdapters(),
): VantaHybridCapabilityMatrix {
  const assessments = adapters.map((adapter) => adapter.assessRoute(intent));
  const recommended =
    assessments
      .filter((assessment) => assessment.supported)
      .sort((left, right) => scoreAssessment(right) - scoreAssessment(left))[0] ?? null;

  return {
    assessments,
    profiles: adapters.map((adapter) => adapter.getCapabilityProfile()),
    recommended,
  };
}
