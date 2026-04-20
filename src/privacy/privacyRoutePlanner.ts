import {
  findCapabilityAsset,
  type VantaPrivacyAsset,
  type VantaPrivacyNetwork,
  type VantaPrivacyRouteAssessment,
} from "./protocolAdapter";
import {
  getVantaPrivatePoolV2CapabilityProfile,
  getVantaPrivatePoolV2Readiness,
} from "./privatePoolV2CapabilityProfile";
import { getUmbraRuntimeReadiness, umbraRuntimeConfig } from "./umbraConfig";
import { getUmbraExternalCapabilityProfile } from "./umbraCapabilityProfile";
import { getUmbraMixerProverStatus } from "./umbraOperations";
import { getVantaLocalCapabilityProfile } from "./vantaLocalAdapter";

export type VantaPrivacyActionKind = "shield" | "swap-to-shielded" | "unshield";

export type VantaPlannedPrivacyBackend =
  | "vanta-local-private-core"
  | "vanta-private-pool-v2"
  | "umbra-encrypted-balance"
  | "umbra-mixer"
  | "unsupported";

export type VantaPrivacyRoutePlan = {
  action: VantaPrivacyActionKind;
  backend: VantaPlannedPrivacyBackend;
  blockers: readonly string[];
  inputAsset: VantaPrivacyAsset | null;
  label: string;
  network: VantaPrivacyNetwork;
  outputAsset: VantaPrivacyAsset | null;
  privateSet: "local-vanta" | "vanta-private-pool-v2" | "umbra-eta" | "umbra-utxo" | "none";
  requiresExplicitWalletApproval: boolean;
  route: VantaPrivacyRouteAssessment | null;
  supported: boolean;
  warnings: readonly string[];
};

export type PlanShieldRouteArgs = {
  amountBaseUnits: bigint;
  fromMintAddress: string;
  network?: VantaPrivacyNetwork;
  preferPrivatePoolV2?: boolean;
  preferUmbra?: boolean;
  toMintAddress?: string;
  useMixerWhenReady?: boolean;
};

export function planShieldRoute({
  amountBaseUnits,
  fromMintAddress,
  network = umbraRuntimeConfig.network,
  preferPrivatePoolV2 = false,
  preferUmbra = umbraRuntimeConfig.enabled,
  toMintAddress = fromMintAddress,
  useMixerWhenReady = false,
}: PlanShieldRouteArgs): VantaPrivacyRoutePlan {
  const privatePoolV2Profile = getVantaPrivatePoolV2CapabilityProfile();
  const privatePoolV2Readiness = getVantaPrivatePoolV2Readiness();
  const umbraProfile = getUmbraExternalCapabilityProfile();
  const vantaProfile = getVantaLocalCapabilityProfile();
  const umbraReadiness = getUmbraRuntimeReadiness();
  const umbraProver = getUmbraMixerProverStatus();
  const privatePoolV2Asset = findCapabilityAsset(privatePoolV2Profile, toMintAddress);
  const umbraAsset = findCapabilityAsset(umbraProfile, toMintAddress);
  const vantaAsset = findCapabilityAsset(vantaProfile, toMintAddress);

  if (preferPrivatePoolV2 && privatePoolV2Asset) {
    const assessment = {
      blockers: privatePoolV2Readiness.blockers,
      capability: privatePoolV2Profile.routes[1] ?? privatePoolV2Profile.routes[0] ?? null,
      profile: privatePoolV2Profile,
      supported: privatePoolV2Readiness.ready,
      warnings: privatePoolV2Readiness.warnings,
    } satisfies VantaPrivacyRouteAssessment;

    return {
      action: "shield",
      backend: "vanta-private-pool-v2",
      blockers: assessment.blockers,
      inputAsset: privatePoolV2Asset,
      label: privatePoolV2Readiness.ready
        ? `Shield ${privatePoolV2Asset.symbol} through Vanta Private Pool v2`
        : `Vanta Private Pool v2 ${privatePoolV2Asset.symbol} route is planned`,
      network,
      outputAsset: privatePoolV2Asset,
      privateSet: "vanta-private-pool-v2",
      requiresExplicitWalletApproval: true,
      route: assessment,
      supported: assessment.supported,
      warnings: assessment.warnings,
    };
  }

  if (preferUmbra && umbraAsset) {
    const route = {
      amountBaseUnits,
      fromMintAddress,
      network,
      toMintAddress,
    };
    const assessment = {
      blockers: umbraReadiness.blockers,
      capability: umbraProfile.routes[useMixerWhenReady ? 1 : 0] ?? null,
      profile: umbraProfile,
      supported: umbraReadiness.ready,
      warnings: [
        "Umbra support is feature-flagged and must stay behind explicit wallet approval.",
        ...(useMixerWhenReady && !umbraProver.ready ? [umbraProver.reason] : []),
      ],
    } satisfies VantaPrivacyRouteAssessment;

    if (umbraReadiness.ready && (!useMixerWhenReady || umbraProver.ready)) {
      return {
        action: "shield",
        backend: useMixerWhenReady ? "umbra-mixer" : "umbra-encrypted-balance",
        blockers: [],
        inputAsset: umbraAsset,
        label: useMixerWhenReady
          ? `Shield ${umbraAsset.symbol} through Umbra mixer`
          : `Shield ${umbraAsset.symbol} into Umbra encrypted balance`,
        network,
        outputAsset: umbraAsset,
        privateSet: useMixerWhenReady ? "umbra-utxo" : "umbra-eta",
        requiresExplicitWalletApproval: true,
        route: assessment,
        supported: true,
        warnings: assessment.warnings,
      };
    }

    return {
      action: "shield",
      backend: "umbra-encrypted-balance",
      blockers: assessment.blockers,
      inputAsset: umbraAsset,
      label: `Umbra ${umbraAsset.symbol} shield route is configured but not ready`,
      network,
      outputAsset: umbraAsset,
      privateSet: "umbra-eta",
      requiresExplicitWalletApproval: true,
      route: assessment,
      supported: false,
      warnings: assessment.warnings,
    };
  }

  if (vantaAsset) {
    const localRoute = {
      amountBaseUnits,
      fromMintAddress,
      network,
      toMintAddress,
    };
    const assessment = {
      blockers: [],
      capability: vantaProfile.routes[0] ?? null,
      profile: vantaProfile,
      supported: true,
      warnings: [
        "Vanta-local shielding is usable for configured devnet shield tokens, but it is not yet Umbra-level shared UTXO anonymity.",
      ],
    } satisfies VantaPrivacyRouteAssessment;

    return {
      action: "shield",
      backend: "vanta-local-private-core",
      blockers: [],
      inputAsset: vantaAsset,
      label: `Shield ${vantaAsset.symbol} into Vanta private state`,
      network: localRoute.network,
      outputAsset: vantaAsset,
      privateSet: "local-vanta",
      requiresExplicitWalletApproval: true,
      route: assessment,
      supported: true,
      warnings: assessment.warnings,
    };
  }

  return {
    action: "shield",
    backend: "unsupported",
    blockers: [
      "Target mint is not supported by the Umbra benchmark pools or the current Vanta shield-token registry.",
    ],
    inputAsset: null,
    label: "No private route available",
    network,
    outputAsset: null,
    privateSet: "none",
    requiresExplicitWalletApproval: true,
    route: null,
    supported: false,
    warnings: [
      "For broad public assets, Vanta should swap the source asset into a supported private-pool mint first, then shield the routed output.",
    ],
  };
}
