import {
  createUnsupportedRouteAssessment,
  EMPTY_PRIVACY_FLAGS,
  findCapabilityAsset,
  mergePrivacyFlags,
  type VantaPrivacyAsset,
  type VantaPrivacyCapabilityProfile,
  type VantaPrivacyProtocolAdapter,
  type VantaPrivacyRouteAssessment,
  type VantaPrivacyRouteCapability,
  type VantaPrivacyRouteIntent,
} from "./protocolAdapter";

export const UMBRA_MAINNET_SUPPORTED_ASSETS = [
  {
    decimals: 6,
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "USD Coin",
    symbol: "USDC",
    tokenProgram: "SPL",
  },
  {
    decimals: 6,
    mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    name: "Tether USD",
    symbol: "USDT",
    tokenProgram: "SPL",
  },
  {
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111112",
    name: "Wrapped SOL",
    symbol: "wSOL",
    tokenProgram: "SPL",
  },
  {
    decimals: 6,
    mintAddress: "PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta",
    name: "Umbra",
    symbol: "UMBRA",
    tokenProgram: "SPL",
  },
] as const satisfies readonly VantaPrivacyAsset[];

const umbraDepositRoute: VantaPrivacyRouteCapability = {
  description:
    "Public SPL or Token-2022 balances can deposit into Umbra encrypted token accounts for hidden balances.",
  id: "umbra-public-wallet-to-eta",
  inputDomain: "public-wallet",
  outputDomain: "confidential-balance",
  privacy: mergePrivacyFlags({
    accountBalanceConfidentiality: true,
    amountPrivacy: true,
  }),
  status: "external",
};

const umbraMixerRoute: VantaPrivacyRouteCapability = {
  description:
    "Umbra encrypted balances or public balances can create UTXOs in a shared mixer pool, then claim through a relayer into encrypted or public balances.",
  id: "umbra-eta-or-public-to-mixer-to-output",
  inputDomain: "confidential-balance",
  outputDomain: "anonymous-utxo",
  privacy: mergePrivacyFlags({
    accountBalanceConfidentiality: true,
    amountPrivacy: true,
    indexerBackedUtxoDiscovery: true,
    relayedClaims: true,
    selectiveTransparency: true,
    sharedAnonymitySet: true,
    unlinkableTransfers: true,
  }),
  status: "external",
};

export function getUmbraExternalCapabilityProfile(): VantaPrivacyCapabilityProfile {
  return {
    assets: UMBRA_MAINNET_SUPPORTED_ASSETS,
    flags: mergePrivacyFlags(EMPTY_PRIVACY_FLAGS, {
      accountBalanceConfidentiality: true,
      amountPrivacy: true,
      indexerBackedUtxoDiscovery: true,
      relayedClaims: true,
      selectiveTransparency: true,
      sharedAnonymitySet: true,
      unlinkableTransfers: true,
    }),
    infrastructure: [
      "wallet",
      "rpc",
      "rpc-subscriptions",
      "indexer",
      "relayer",
      "mpc",
      "web-zk-prover",
    ],
    network: "mainnet",
    protocolId: "umbra-external",
    routes: [umbraDepositRoute, umbraMixerRoute],
    summary:
      "Umbra external lane: SDK-backed encrypted balances plus UTXO mixer privacy for supported pools, using Arcium MPC, indexer, relayer, and Groth16 web provers.",
    trustBoundary:
      "Umbra on-chain programs, Arcium MPC, Umbra indexer, Umbra relayer, Umbra proving-key delivery, configured RPC, and the user's wallet signer.",
  };
}

function assessUmbraExternalRoute(intent: VantaPrivacyRouteIntent): VantaPrivacyRouteAssessment {
  const profile = getUmbraExternalCapabilityProfile();
  const inputAsset = findCapabilityAsset(profile, intent.fromMintAddress);
  const outputAsset = findCapabilityAsset(profile, intent.toMintAddress);

  if (!inputAsset || !outputAsset) {
    return createUnsupportedRouteAssessment({
      blockers: [
        !inputAsset ? "source mint is not one of Umbra's currently documented supported pools" : "",
        !outputAsset ? "target mint is not one of Umbra's currently documented supported pools" : "",
      ].filter(Boolean),
      intent,
      profile,
      warnings: [
        "Vanta can route broader public assets into supported private-pool mints, but Umbra-backed privacy only starts once value enters a supported Umbra pool.",
      ],
    });
  }

  return {
    blockers: [],
    capability: umbraMixerRoute,
    profile,
    supported: true,
    warnings: [
      "This profile describes a potential external Umbra-backed route; Vanta has not yet installed or executed the Umbra SDK in-app.",
      "The route depends on Umbra infrastructure and should be disclosed separately from Vanta-native private-core routes.",
    ],
  };
}

export function createUmbraExternalPrivacyAdapter(): VantaPrivacyProtocolAdapter {
  return {
    assessRoute: assessUmbraExternalRoute,
    getCapabilityProfile: getUmbraExternalCapabilityProfile,
  };
}
