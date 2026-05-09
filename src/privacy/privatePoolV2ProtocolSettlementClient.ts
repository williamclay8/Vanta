import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { createVantaPrivatePoolV2SwapToShieldedProofRequest } from "./privatePoolV2ProofRequests";
import {
  serializeVantaShieldCommittedEconomicsSettlementOpening,
  type VantaShieldCommittedEconomicsSettlementOpening,
  type VantaShieldCommittedEconomicsSettlementRequest,
} from "./vantaShieldCommittedSettlement";

const VANTA_PRODUCTION_PRIVATE_POOL_V2_RECEIPT_API_URL =
  "https://vanta-prod-private-pool-v2-operator.onrender.com" as const;
const VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME =
  "sha256-private-pool-v2-local-prover-0.1" as const;

export type VantaProtocolSettlementAction = "shield" | "send" | "swap" | "unshield";

export type VantaProtocolShieldCapability = {
  blockers: readonly string[];
  mode:
    | "direct-native-sol"
    | "direct-configured-token"
    | "route-to-configured-shield-token"
    | "unsupported";
  requiresPublicRoute: boolean;
  sourceAsset: {
    mintAddress: string;
    symbol: string;
  } | null;
  supportsDirectShield: boolean;
  targetShieldAsset: {
    assetKey: string;
    label: string;
    mintAddress: string | null;
    name: string;
  } | null;
};

export type VantaProtocolShieldRouteEvidence = {
  provider: string;
  routeSignature: string;
  sourceAmount?: string;
  sourceAsset?: string;
  sourceMintAddress?: string;
  targetAmount: string;
  targetAsset: string;
  targetMintAddress?: string;
};

export type VantaProtocolShieldSettlementEvidence = {
  depositSignature: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
};

export type VantaProtocolEconomicsMode = "raw-operator-visible" | "committed-economics";

export type VantaCommittedEconomicsSettlementTerms = {
  acceptedRoot?: string;
  assetIdCommitment?: string;
  assetCohort?: string;
  changeLeafIndex?: string;
  changeOutputCommitment?: string;
  changeOutputRoot?: string;
  economicsCommitment: string;
  exitTermsCommitment?: string;
  inputRoot?: string;
  inputCommitment?: string;
  nullifierOrReplayCommitment: string;
  outputCommitment?: string;
  outputLeafIndex?: string;
  outputRoot?: string;
  ownerCommitment: string;
  poolId?: string;
  privateSpendContextHash?: string;
  privateSpendPublicInputHash?: string;
  routeCommitment: string;
  sendContextTag?: string;
  sendPublicInputHash?: string;
  settlementCommitment: string;
  swapContextTag?: string;
  swapPublicInputHash?: string;
  unshieldContextTag?: string;
  unshieldPublicInputHash?: string;
};

export type VantaRawProtocolSettlementRequest = {
  action: VantaProtocolSettlementAction;
  amount: string;
  asset: string;
  authToken?: string | null;
  baseUrl?: string | null;
  destination: string;
  acceptedRoot?: never;
  economicsCommitment?: never;
  economicsMode?: "raw-operator-visible";
  exitTermsCommitment?: never;
  assetIdCommitment?: never;
  assetCohort?: never;
  changeLeafIndex?: never;
  changeOutputCommitment?: never;
  changeOutputRoot?: never;
  inputRoot?: never;
  inputCommitment?: never;
  nullifierOrReplayCommitment?: never;
  outputCommitment?: never;
  outputLeafIndex?: never;
  outputRoot?: never;
  owner: string;
  ownerCommitment?: never;
  poolId?: never;
  privateSpendContextHash?: never;
  privateSpendPublicInputHash?: never;
  routeCommitment?: never;
  sendContextTag?: never;
  sendPublicInputHash?: never;
  settlementId: string;
  settlementCommitment?: never;
  swapContextTag?: never;
  swapPublicInputHash?: never;
  unshieldContextTag?: never;
  unshieldPublicInputHash?: never;
  shieldCapability?: VantaProtocolShieldCapability | null;
  shieldSettlementEvidence?: VantaProtocolShieldSettlementEvidence | null;
  shieldRouteEvidence?: VantaProtocolShieldRouteEvidence | null;
};

type VantaCommittedEconomicsProtocolSettlementRequestBase = {
  amount?: never;
  asset?: never;
  authToken?: string | null;
  baseUrl?: string | null;
  destination?: never;
  economicsMode: "committed-economics";
  owner?: never;
  settlementId: string;
  shieldCapability?: never;
  shieldSettlementEvidence?: never;
  shieldRouteEvidence?: never;
};

type VantaCommittedEconomicsSendSettlementTerms = VantaCommittedEconomicsSettlementTerms & {
  assetIdCommitment: string;
  changeLeafIndex: string;
  changeOutputCommitment: string;
  changeOutputRoot: string;
  inputCommitment: string;
  inputRoot: string;
  outputCommitment: string;
  outputLeafIndex: string;
  outputRoot: string;
  sendContextTag: string;
  sendPublicInputHash: string;
};

type VantaCommittedEconomicsSwapSettlementTerms = VantaCommittedEconomicsSettlementTerms & {
  inputCommitment: string;
  inputRoot: string;
  outputCommitment: string;
  outputLeafIndex: string;
  outputRoot: string;
  swapContextTag: string;
  swapPublicInputHash: string;
};

type VantaActualPrivateCommittedEconomicsSendSettlementTerms =
  VantaCommittedEconomicsSettlementTerms & {
    acceptedRoot: string;
    assetCohort: string;
    outputCommitment: string;
    poolId: string;
    privateSpendContextHash: string;
  };

export type VantaCommittedEconomicsProtocolSettlementRequest =
  | (VantaCommittedEconomicsProtocolSettlementRequestBase & {
      action: "send";
    } & (
      | VantaCommittedEconomicsSendSettlementTerms
      | VantaActualPrivateCommittedEconomicsSendSettlementTerms
    ))
  | (VantaCommittedEconomicsProtocolSettlementRequestBase & {
      action: "swap";
    } & VantaCommittedEconomicsSwapSettlementTerms)
  | (VantaCommittedEconomicsProtocolSettlementRequestBase & {
      action: "shield" | "unshield";
    } & VantaCommittedEconomicsSettlementTerms);

export type VantaProtocolSettlementRequest =
  | VantaRawProtocolSettlementRequest
  | VantaCommittedEconomicsProtocolSettlementRequest;

export type VantaProtocolSettlementReceiptBase = {
  action: VantaProtocolSettlementAction;
  id: string;
  object: "protocol_settlement_receipt";
  operatorVisibleTermsCommitment?: string;
  proofReceiptId: string;
  proofReceiptPublicInputCommitment?: string;
  shieldReceiptBindingHash?: string;
  settlementId: string;
  shieldCapabilityMode?: VantaProtocolShieldCapability["mode"];
  depositSignature?: string;
  owner?: string;
  routeProvider?: string;
  routeSignature?: string;
  routeSourceAmount?: string;
  routeSourceAsset?: string;
  routeSourceMintAddress?: string;
  routeTargetAmount?: string;
  sourceAsset?: string;
  sourceMintAddress?: string;
  stateSignature?: string;
  status: "confirmed";
  targetAsset?: string;
  targetMintAddress?: string;
  vaultOwner?: string;
};

export type VantaRawProtocolSettlementReceipt = VantaProtocolSettlementReceiptBase & {
  amount: string;
  asset: string;
  economicsMode?: "raw-operator-visible";
};

export type VantaCommittedEconomicsProtocolSettlementReceipt =
  VantaProtocolSettlementReceiptBase & {
    amount?: never;
    asset?: never;
    economicsCommitment: string;
    economicsMode: "committed-economics";
    exitTermsCommitment?: string;
    settlementCommitment: string;
  };

export type VantaProtocolSettlementReceipt =
  | VantaRawProtocolSettlementReceipt
  | VantaCommittedEconomicsProtocolSettlementReceipt;

export type VantaPrivatePoolV2ShadowCommitments = {
  economicsCommitment: string;
  operatorVisibleTermsCommitment: string;
  scheme: string;
};

export type VantaPrivatePoolV2ProofSystem = "noir-bb" | "groth16" | "plonk" | "mock";

export type VantaPrivatePoolV2ProofReceipt = {
  assetId: string;
  intent: "shield" | "private-send" | "swap-to-shielded" | "unshield" | "claim";
  proofSystem: VantaPrivatePoolV2ProofSystem;
  publicInputCommitment: string;
  receiptId: string;
  recordedAtSlot: string | number;
  replayKey: string;
  shadowCommitments?: VantaPrivatePoolV2ShadowCommitments;
};

export type VantaProtocolSettlementResponse = {
  kind: "protocol_settlement";
  proofReceipt?: VantaPrivatePoolV2ProofReceipt;
  protocolSettlementReceipt: VantaProtocolSettlementReceipt;
};

export type VantaProtocolSettlementValidationInput = {
  requireProductionProofSystem?: boolean;
  request: VantaProtocolSettlementRequest;
  response: VantaProtocolSettlementResponse;
};

export type VantaProtocolSettlementStatusRequest = {
  authToken?: string | null;
  baseUrl?: string | null;
};

export type VantaBrowserShieldReceiptRequest = {
  baseUrl?: string | null;
  opening: VantaShieldCommittedEconomicsSettlementOpening;
  request: VantaShieldCommittedEconomicsSettlementRequest;
};

export type VantaPrivatePoolV2SettlementStatus = {
  kind: "Private Pool V2 receipts";
  paySettlementCount: number;
  paySettlements: unknown[];
  protocolSettlementCount: number;
  protocolSettlements: VantaProtocolSettlementResponse[];
  receiptCount: number;
  receipts: VantaPrivatePoolV2ProofReceipt[];
  shadowCommitmentCount?: number;
};

export type VantaPrivatePoolV2SettlementPolicy = {
  conflictingReplayRejection: boolean;
  failClosedValidation: boolean;
  identicalReplayIdempotency: boolean;
  mockProofRealFundsBlocked: boolean;
  productionProofSystemRequired: boolean;
  productionDurableStoreRequired: boolean;
  restartSafeSettlementReceipts: boolean;
  version: string;
};

export type VantaPrivatePoolV2OperatorStatus = {
  anonymitySetReadiness?: {
    anonymitySetReadiness: "blocked";
    auditedSharedAnonymitySetAvailable: false;
    liveAnonymitySetAvailable: false;
    liveMainnetPrivateSettlementAvailable: false;
    mainnetReady: false;
    meaningfulPrivacyReady: false;
    minimumDistinctCommitments: number;
    privacyClaimAllowed: false;
    productionReady: false;
    version: "vanta-private-pool-v2-anonymity-set-readiness-0.1";
  };
  contractVersion: string;
  kind: "Private Pool V2 operator status";
  ok: boolean;
  operatorEconomicsExposure?: {
    committedSettlementCount: number;
    hiddenEconomicsActions: readonly VantaProtocolSettlementAction[];
    operatorStillSeesRawActions: readonly string[];
    rawSettlementCount: number;
  };
  protocolActionProofModes: Record<VantaProtocolSettlementAction, string>;
  proofTrustBoundary?: {
    acceptedProductionProofSystems: readonly Exclude<VantaPrivatePoolV2ProofSystem, "mock">[];
    localBenchmarkProofSystem: "mock";
    mockProofRealFundsAllowed: false;
    mockProofsAcceptedOnlyFor: readonly string[];
    productionProofSystemRequired: boolean;
    productionProofSystemRequiredNow: boolean;
  };
  receiptCount: number;
  receiptStorePath: string;
  settlementPolicy: VantaPrivatePoolV2SettlementPolicy;
  shadowCommitmentCount?: number;
  shadowCommitmentScheme?: string;
  supportedAssets: string[];
  surfaces: Record<string, string>;
};

function defaultPrivatePoolOperatorUrl() {
  const meta = import.meta as unknown as {
    env?: Record<string, string | undefined>;
  };

  return meta.env?.VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_URL ?? null;
}

function defaultPrivatePoolReceiptApiUrl() {
  const meta = import.meta as unknown as {
    env?: Record<string, boolean | string | undefined>;
  };
  const explicitReceiptApiUrl = meta.env?.VITE_VANTA_PRIVATE_POOL_V2_RECEIPT_API_URL;
  const fallbackOperatorUrl = meta.env?.VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_URL;
  const browserFallbackUrl = getBrowserPrivatePoolReceiptApiFallbackUrl();

  if (typeof explicitReceiptApiUrl === "string" && explicitReceiptApiUrl.trim()) {
    return explicitReceiptApiUrl;
  }

  if (typeof fallbackOperatorUrl === "string" && fallbackOperatorUrl.trim()) {
    return fallbackOperatorUrl;
  }

  if (browserFallbackUrl) {
    return browserFallbackUrl;
  }

  return meta.env?.PROD ? VANTA_PRODUCTION_PRIVATE_POOL_V2_RECEIPT_API_URL : null;
}

function getBrowserPrivatePoolReceiptApiFallbackUrl() {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;

  if (
    hostname === "vantaprivacy.xyz" ||
    hostname === "www.vantaprivacy.xyz" ||
    hostname.endsWith(".onrender.com")
  ) {
    return VANTA_PRODUCTION_PRIVATE_POOL_V2_RECEIPT_API_URL;
  }

  return null;
}

function authHeaders(authToken?: string | null): Record<string, string> {
  const token = authToken ?? null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function requireProtocolSettlementCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function hashProtocolSettlementParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

function expectedLocalProofPublicInputCommitment(request: {
  amountBaseUnits: bigint;
  assetId: string;
  circuitPublicInputs?: readonly string[];
  intent: string;
  publicInputs: readonly string[];
}) {
  const serializedRequest = JSON.stringify({
    amountBaseUnits: request.amountBaseUnits.toString(),
    assetId: request.assetId,
    circuitPublicInputs: [...(request.circuitPublicInputs ?? request.publicInputs)],
    intent: request.intent,
  });

  return hashProtocolSettlementParts(
    VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME,
    "public-inputs",
    serializedRequest,
  );
}

export function validateVantaPrivatePoolV2ProtocolSettlementResponse({
  requireProductionProofSystem = false,
  request,
  response,
}: VantaProtocolSettlementValidationInput): VantaProtocolSettlementResponse {
  const receipt = response.protocolSettlementReceipt;
  const proofSystem = response.proofReceipt?.proofSystem;

  requireProtocolSettlementCondition(
    response.kind === "protocol_settlement",
    "Private Pool v2 protocol settlement response kind is invalid.",
  );
  requireProtocolSettlementCondition(
    receipt?.object === "protocol_settlement_receipt",
    "Private Pool v2 protocol settlement receipt object is invalid.",
  );
  requireProtocolSettlementCondition(
    receipt.action === request.action,
    "Private Pool v2 protocol settlement receipt action does not match the request.",
  );
  requireProtocolSettlementCondition(
    receipt.settlementId === request.settlementId,
    "Private Pool v2 protocol settlement receipt id does not match the request settlement id.",
  );
  requireProtocolSettlementCondition(
    receipt.status === "confirmed",
    "Private Pool v2 protocol settlement receipt is not confirmed.",
  );
  requireProtocolSettlementCondition(
    typeof receipt.proofReceiptId === "string" && receipt.proofReceiptId.startsWith("ppv2_"),
    "Private Pool v2 protocol settlement receipt is missing a proof receipt id.",
  );
  requireProtocolSettlementCondition(
    proofSystem === "noir-bb" ||
      proofSystem === "groth16" ||
      proofSystem === "plonk" ||
      proofSystem === "mock",
    "Private Pool v2 proof receipt is missing a recognized proof system.",
  );
  requireProtocolSettlementCondition(
    !requireProductionProofSystem || proofSystem !== "mock",
    "Private Pool v2 production settlement validation rejects mock proof receipts.",
  );
  if (request.action === "shield" && request.economicsMode !== "committed-economics") {
    const shieldCapability = request.shieldCapability;
    const shieldSettlementEvidence = request.shieldSettlementEvidence ?? null;
    const shieldRouteEvidence = request.shieldRouteEvidence ?? null;
    requireProtocolSettlementCondition(
      Boolean(shieldCapability?.sourceAsset && shieldCapability.targetShieldAsset),
      "Shield protocol settlement validation requires a shield capability.",
    );
    requireProtocolSettlementCondition(
      response.proofReceipt?.intent === "shield",
      "Shield protocol settlement proof receipt intent is not shield.",
    );
    requireProtocolSettlementCondition(
      response.proofReceipt?.assetId === shieldCapability?.targetShieldAsset?.assetKey,
      "Shield proof receipt asset does not match the target shield asset.",
    );
    requireProtocolSettlementCondition(
      receipt.operatorVisibleTermsCommitment ===
        response.proofReceipt?.shadowCommitments?.operatorVisibleTermsCommitment,
      "Shield protocol settlement receipt operator-visible terms commitment does not match the proof receipt.",
    );
    requireProtocolSettlementCondition(
      typeof receipt.shieldReceiptBindingHash === "string" &&
        receipt.shieldReceiptBindingHash.startsWith("0x"),
      "Shield protocol settlement receipt is missing a binding hash.",
    );
    requireProtocolSettlementCondition(
      receipt.shieldCapabilityMode === shieldCapability?.mode,
      "Shield protocol settlement receipt capability mode does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.sourceAsset === shieldCapability?.sourceAsset?.symbol,
      "Shield protocol settlement receipt source asset does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.sourceMintAddress === shieldCapability?.sourceAsset?.mintAddress,
      "Shield protocol settlement receipt source mint does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.targetAsset === shieldCapability?.targetShieldAsset?.assetKey,
      "Shield protocol settlement receipt target asset does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.targetMintAddress === shieldCapability?.targetShieldAsset?.mintAddress,
      "Shield protocol settlement receipt target mint does not match the request.",
    );
    requireProtocolSettlementCondition(
      Boolean(shieldSettlementEvidence),
      "Shield protocol settlement validation requires deposit/state evidence.",
    );
    requireProtocolSettlementCondition(
      receipt.depositSignature === shieldSettlementEvidence?.depositSignature,
      "Shield protocol settlement receipt deposit signature does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.stateSignature === shieldSettlementEvidence?.stateSignature,
      "Shield protocol settlement receipt state signature does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.owner === shieldSettlementEvidence?.owner,
      "Shield protocol settlement receipt owner does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.vaultOwner === shieldSettlementEvidence?.vaultOwner,
      "Shield protocol settlement receipt vault owner does not match the request.",
    );

    if (shieldCapability?.requiresPublicRoute) {
      requireProtocolSettlementCondition(
        Boolean(shieldRouteEvidence),
        "Routed Shield protocol settlement validation requires route evidence.",
      );
      requireProtocolSettlementCondition(
        receipt.routeProvider === shieldRouteEvidence?.provider,
        "Routed Shield protocol settlement receipt route provider does not match the request.",
      );
      requireProtocolSettlementCondition(
        receipt.routeSignature === shieldRouteEvidence?.routeSignature,
        "Routed Shield protocol settlement receipt route signature does not match the request.",
      );
      requireProtocolSettlementCondition(
        receipt.routeTargetAmount === shieldRouteEvidence?.targetAmount,
        "Routed Shield protocol settlement receipt route target amount does not match the request.",
      );
      requireProtocolSettlementCondition(
        receipt.routeSourceAmount === shieldRouteEvidence?.sourceAmount,
        "Routed Shield protocol settlement receipt route source amount does not match the request.",
      );
      requireProtocolSettlementCondition(
        receipt.routeSourceAsset === shieldRouteEvidence?.sourceAsset,
        "Routed Shield protocol settlement receipt route source asset does not match the request.",
      );
      requireProtocolSettlementCondition(
        receipt.routeSourceMintAddress === shieldRouteEvidence?.sourceMintAddress,
        "Routed Shield protocol settlement receipt route source mint does not match the request.",
      );
      requireProtocolSettlementCondition(
        receipt.targetAsset === shieldRouteEvidence?.targetAsset,
        "Routed Shield protocol settlement receipt target asset does not match route evidence.",
      );
      requireProtocolSettlementCondition(
        receipt.targetMintAddress === shieldRouteEvidence?.targetMintAddress,
        "Routed Shield protocol settlement receipt target mint does not match route evidence.",
      );
    }
  }

  if (request.economicsMode === "committed-economics") {
    const committedReceipt = receipt as VantaCommittedEconomicsProtocolSettlementReceipt;
    requireProtocolSettlementCondition(
      committedReceipt.economicsMode === "committed-economics",
      "Committed Private Pool v2 protocol settlement receipt is missing committed economics mode.",
    );
    requireProtocolSettlementCondition(
      committedReceipt.economicsCommitment === request.economicsCommitment,
      "Committed Private Pool v2 protocol settlement receipt economics commitment does not match the request.",
    );
    requireProtocolSettlementCondition(
      committedReceipt.settlementCommitment === request.settlementCommitment,
      "Committed Private Pool v2 protocol settlement receipt settlement commitment does not match the request.",
    );
    if (request.action === "unshield") {
      requireProtocolSettlementCondition(
        response.proofReceipt?.intent === "unshield",
        "Committed Unshield protocol settlement proof receipt intent is not unshield.",
      );
      requireProtocolSettlementCondition(
        committedReceipt.exitTermsCommitment === request.exitTermsCommitment,
        "Committed Unshield protocol settlement receipt exit terms commitment does not match the request.",
      );
    }
    if (request.action === "swap") {
      const proofReceipt = response.proofReceipt;
      const expectedSwapProofRequest = createVantaPrivatePoolV2SwapToShieldedProofRequest({
        economicsCommitment: request.economicsCommitment,
        inputCommitment: request.inputCommitment,
        inputRoot: request.inputRoot,
        nullifierOrReplayCommitment: request.nullifierOrReplayCommitment,
        outputCommitment: request.outputCommitment,
        outputLeafIndex: request.outputLeafIndex,
        outputRoot: request.outputRoot,
        ownerCommitment: request.ownerCommitment,
        routeCommitment: request.routeCommitment,
        settlementCommitment: request.settlementCommitment,
        swapContextTag: request.swapContextTag,
        swapPublicInputHash: request.swapPublicInputHash,
      });
      requireProtocolSettlementCondition(
        proofReceipt?.intent === "swap-to-shielded",
        "Committed Swap protocol settlement proof receipt intent is not swap-to-shielded.",
      );
      requireProtocolSettlementCondition(
        proofReceipt?.assetId === "hidden:economic-terms",
        "Committed Swap proof receipt must use the hidden-economics asset sentinel.",
      );
      requireProtocolSettlementCondition(
        proofReceipt !== undefined &&
          proofReceipt.replayKey === `swap-to-shielded:${request.nullifierOrReplayCommitment}`,
        "Committed Swap proof receipt replay key does not match the request nullifier/replay commitment.",
      );
      requireProtocolSettlementCondition(
        proofReceipt?.publicInputCommitment ===
          expectedLocalProofPublicInputCommitment(expectedSwapProofRequest),
        "Committed Swap proof receipt public input commitment does not match the request.",
      );
      for (const [fieldName, fieldValue] of [
        ["inputCommitment", request.inputCommitment],
        ["inputRoot", request.inputRoot],
        ["outputCommitment", request.outputCommitment],
        ["outputLeafIndex", request.outputLeafIndex],
        ["outputRoot", request.outputRoot],
        ["routeCommitment", request.routeCommitment],
        ["swapContextTag", request.swapContextTag],
        ["swapPublicInputHash", request.swapPublicInputHash],
      ] as const) {
        requireProtocolSettlementCondition(
          typeof fieldValue === "string" && fieldValue.trim().length > 0,
          `Committed Swap protocol settlement request is missing ${fieldName}.`,
        );
      }
    }
    if (request.action === "send") {
      const proofReceipt = response.proofReceipt;
      requireProtocolSettlementCondition(
        proofReceipt?.intent === "private-send",
        "Committed Send protocol settlement proof receipt intent is not private-send.",
      );
      requireProtocolSettlementCondition(
        proofReceipt?.assetId === "hidden:economic-terms",
        "Committed Send proof receipt must use the hidden-economics asset sentinel.",
      );
      requireProtocolSettlementCondition(
        proofReceipt !== undefined &&
          proofReceipt.replayKey === `private-send:${request.nullifierOrReplayCommitment}`,
        "Committed Send proof receipt replay key does not match the request nullifier/replay commitment.",
      );
    }
    if (request.action === "shield") {
      requireProtocolSettlementCondition(
        response.proofReceipt?.intent === "shield",
        "Committed Shield protocol settlement proof receipt intent is not shield.",
      );
      requireProtocolSettlementCondition(
        response.proofReceipt?.assetId === "hidden:economic-terms",
        "Committed Shield proof receipt must use the hidden-economics asset sentinel.",
      );
      requireProtocolSettlementCondition(
        typeof receipt.shieldReceiptBindingHash === "string" &&
          receipt.shieldReceiptBindingHash.startsWith("0x"),
        "Committed Shield protocol settlement receipt is missing a binding hash.",
      );
    }
    for (const rawField of ["amount", "asset", "destination", "owner"] as const) {
      requireProtocolSettlementCondition(
        !(rawField in receipt),
        `Committed Private Pool v2 protocol settlement receipt leaked raw ${rawField}.`,
      );
    }
  } else {
    requireProtocolSettlementCondition(
      receipt.amount === request.amount,
      "Private Pool v2 protocol settlement receipt amount does not match the request.",
    );
    requireProtocolSettlementCondition(
      receipt.asset === request.asset,
      "Private Pool v2 protocol settlement receipt asset does not match the request.",
    );
  }

  requireProtocolSettlementCondition(
    receipt.proofReceiptId === `ppv2_${response.proofReceipt?.receiptId.slice(2, 26)}`,
    "Private Pool v2 protocol settlement receipt proof id does not match the proof receipt.",
  );
  requireProtocolSettlementCondition(
    receipt.proofReceiptPublicInputCommitment === response.proofReceipt?.publicInputCommitment,
    "Private Pool v2 protocol settlement receipt public input commitment does not match the proof receipt.",
  );

  return response;
}

export async function requestVantaPrivatePoolV2ProtocolSettlement({
  action,
  amount,
  acceptedRoot,
  assetIdCommitment,
  assetCohort,
  asset,
  authToken,
  baseUrl = defaultPrivatePoolOperatorUrl(),
  changeLeafIndex,
  changeOutputCommitment,
  changeOutputRoot,
  destination,
  economicsCommitment,
  economicsMode,
  exitTermsCommitment,
  inputRoot,
  inputCommitment,
  nullifierOrReplayCommitment,
  outputCommitment,
  outputLeafIndex,
  outputRoot,
  owner,
  ownerCommitment,
  poolId,
  privateSpendContextHash,
  privateSpendPublicInputHash,
  routeCommitment,
  sendContextTag,
  sendPublicInputHash,
  settlementCommitment,
  settlementId,
  swapContextTag,
  swapPublicInputHash,
  unshieldContextTag,
  unshieldPublicInputHash,
  shieldCapability,
  shieldSettlementEvidence,
  shieldRouteEvidence,
}: VantaProtocolSettlementRequest): Promise<VantaProtocolSettlementResponse | null> {
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/private-pool-v2/protocol-settlements`, {
    body: JSON.stringify({
      action,
      amount,
      ...(acceptedRoot ? { acceptedRoot } : {}),
      ...(assetIdCommitment ? { assetIdCommitment } : {}),
      ...(assetCohort ? { assetCohort } : {}),
      asset,
      ...(changeLeafIndex ? { changeLeafIndex } : {}),
      ...(changeOutputCommitment ? { changeOutputCommitment } : {}),
      ...(changeOutputRoot ? { changeOutputRoot } : {}),
      destination,
      ...(economicsMode ? { economicsMode } : {}),
      ...(economicsCommitment ? { economicsCommitment } : {}),
      ...(exitTermsCommitment ? { exitTermsCommitment } : {}),
      ...(inputRoot ? { inputRoot } : {}),
      ...(inputCommitment ? { inputCommitment } : {}),
      ...(nullifierOrReplayCommitment ? { nullifierOrReplayCommitment } : {}),
      ...(outputCommitment ? { outputCommitment } : {}),
      ...(outputLeafIndex ? { outputLeafIndex } : {}),
      ...(outputRoot ? { outputRoot } : {}),
      owner,
      ...(ownerCommitment ? { ownerCommitment } : {}),
      ...(poolId ? { poolId } : {}),
      ...(privateSpendContextHash ? { privateSpendContextHash } : {}),
      ...(privateSpendPublicInputHash ? { privateSpendPublicInputHash } : {}),
      ...(routeCommitment ? { routeCommitment } : {}),
      ...(sendContextTag ? { sendContextTag } : {}),
      ...(sendPublicInputHash ? { sendPublicInputHash } : {}),
      ...(settlementCommitment ? { settlementCommitment } : {}),
      ...(swapContextTag ? { swapContextTag } : {}),
      ...(swapPublicInputHash ? { swapPublicInputHash } : {}),
      ...(unshieldContextTag ? { unshieldContextTag } : {}),
      ...(unshieldPublicInputHash ? { unshieldPublicInputHash } : {}),
      settlementId,
      ...(shieldCapability ? { shieldCapability } : {}),
      ...(shieldSettlementEvidence ? { shieldSettlementEvidence } : {}),
      ...(shieldRouteEvidence ? { shieldRouteEvidence } : {}),
    }),
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(authToken),
    },
    method: "POST",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `Private Pool v2 protocol settlement failed: ${response.status}`);
  }

  return validateVantaPrivatePoolV2ProtocolSettlementResponse({
    request: {
      action,
      amount,
      acceptedRoot,
      assetIdCommitment,
      assetCohort,
      asset,
      authToken,
      baseUrl,
      changeLeafIndex,
      changeOutputCommitment,
      changeOutputRoot,
      destination,
      economicsCommitment,
      economicsMode,
      exitTermsCommitment,
      inputRoot,
      inputCommitment,
      nullifierOrReplayCommitment,
      outputCommitment,
      outputLeafIndex,
      outputRoot,
      owner,
      ownerCommitment,
      poolId,
      privateSpendContextHash,
      privateSpendPublicInputHash,
      routeCommitment,
      sendContextTag,
      sendPublicInputHash,
      settlementCommitment,
      settlementId,
      swapContextTag,
      swapPublicInputHash,
      unshieldContextTag,
      unshieldPublicInputHash,
      shieldCapability,
      shieldSettlementEvidence,
      shieldRouteEvidence,
    } as VantaProtocolSettlementRequest,
    response: payload as VantaProtocolSettlementResponse,
  });
}

export async function requestVantaPrivatePoolV2BrowserShieldReceipt({
  baseUrl = defaultPrivatePoolReceiptApiUrl(),
  opening,
  request,
}: VantaBrowserShieldReceiptRequest): Promise<VantaProtocolSettlementResponse | null> {
  const resolvedBaseUrl = baseUrl ?? getBrowserPrivatePoolReceiptApiFallbackUrl();

  if (!resolvedBaseUrl) {
    return null;
  }

  if (!resolvedBaseUrl.trim()) {
    throw new Error("Hosted Vanta Shield builds must have a Private Pool v2 receipt API URL.");
  }

  const response = await fetch(`${resolvedBaseUrl}/private-pool-v2/public/shield-receipts`, {
    body: JSON.stringify({
      opening: serializeVantaShieldCommittedEconomicsSettlementOpening(opening),
      request,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `Private Pool v2 Shield receipt failed: ${response.status}`);
  }

  return validateVantaPrivatePoolV2ProtocolSettlementResponse({
    request,
    response: payload as VantaProtocolSettlementResponse,
  });
}

export async function fetchVantaPrivatePoolV2OperatorStatus({
  authToken,
  baseUrl = defaultPrivatePoolOperatorUrl(),
}: VantaProtocolSettlementStatusRequest = {}): Promise<VantaPrivatePoolV2OperatorStatus | null> {
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/state/private-pool-v2-status`, {
    headers: authHeaders(authToken),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `Private Pool v2 operator status failed: ${response.status}`);
  }

  return payload as VantaPrivatePoolV2OperatorStatus;
}

export async function fetchVantaPrivatePoolV2ProtocolSettlementStatus({
  authToken,
  baseUrl = defaultPrivatePoolOperatorUrl(),
}: VantaProtocolSettlementStatusRequest = {}): Promise<VantaPrivatePoolV2SettlementStatus | null> {
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/state/private-pool-v2-receipts`, {
    headers: authHeaders(authToken),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `Private Pool v2 settlement status failed: ${response.status}`);
  }

  return payload as VantaPrivatePoolV2SettlementStatus;
}
