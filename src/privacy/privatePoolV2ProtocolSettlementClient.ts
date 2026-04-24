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
  targetAmount: string;
  targetAsset: string;
};

export type VantaProtocolEconomicsMode = "raw-operator-visible" | "committed-economics";

export type VantaCommittedEconomicsSettlementTerms = {
  economicsCommitment: string;
  inputCommitment?: string;
  nullifierOrReplayCommitment: string;
  outputCommitment?: string;
  ownerCommitment: string;
  routeCommitment: string;
  settlementCommitment: string;
};

export type VantaRawProtocolSettlementRequest = {
  action: VantaProtocolSettlementAction;
  amount: string;
  asset: string;
  authToken?: string | null;
  baseUrl?: string | null;
  destination: string;
  economicsCommitment?: never;
  economicsMode?: "raw-operator-visible";
  inputCommitment?: never;
  nullifierOrReplayCommitment?: never;
  outputCommitment?: never;
  owner: string;
  ownerCommitment?: never;
  routeCommitment?: never;
  settlementId: string;
  settlementCommitment?: never;
  shieldCapability?: VantaProtocolShieldCapability | null;
  shieldRouteEvidence?: VantaProtocolShieldRouteEvidence | null;
};

export type VantaCommittedEconomicsProtocolSettlementRequest = {
  action: "send" | "swap";
  amount?: never;
  asset?: never;
  authToken?: string | null;
  baseUrl?: string | null;
  destination?: never;
  economicsMode: "committed-economics";
  owner?: never;
  settlementId: string;
  shieldCapability?: never;
  shieldRouteEvidence?: never;
} & VantaCommittedEconomicsSettlementTerms;

export type VantaProtocolSettlementRequest =
  | VantaRawProtocolSettlementRequest
  | VantaCommittedEconomicsProtocolSettlementRequest;

export type VantaProtocolSettlementReceiptBase = {
  action: VantaProtocolSettlementAction;
  id: string;
  object: "protocol_settlement_receipt";
  proofReceiptId: string;
  settlementId: string;
  shieldCapabilityMode?: VantaProtocolShieldCapability["mode"];
  routeProvider?: string;
  routeSignature?: string;
  routeTargetAmount?: string;
  sourceAsset?: string;
  sourceMintAddress?: string;
  status: "confirmed";
  targetAsset?: string;
  targetMintAddress?: string;
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

export type VantaPrivatePoolV2ProofReceipt = {
  assetId: string;
  intent: "shield" | "private-send" | "swap-to-shielded" | "unshield" | "claim";
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

export type VantaProtocolSettlementStatusRequest = {
  authToken?: string | null;
  baseUrl?: string | null;
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

function defaultPrivatePoolOperatorAuthToken() {
  const meta = import.meta as unknown as {
    env?: Record<string, string | undefined>;
  };

  return meta.env?.VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN ?? null;
}

function authHeaders(authToken?: string | null): Record<string, string> {
  const token = authToken ?? defaultPrivatePoolOperatorAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requestVantaPrivatePoolV2ProtocolSettlement({
  action,
  amount,
  asset,
  authToken,
  baseUrl = defaultPrivatePoolOperatorUrl(),
  destination,
  economicsCommitment,
  economicsMode,
  inputCommitment,
  nullifierOrReplayCommitment,
  outputCommitment,
  owner,
  ownerCommitment,
  routeCommitment,
  settlementCommitment,
  settlementId,
  shieldCapability,
  shieldRouteEvidence,
}: VantaProtocolSettlementRequest): Promise<VantaProtocolSettlementResponse | null> {
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/private-pool-v2/protocol-settlements`, {
    body: JSON.stringify({
      action,
      amount,
      asset,
      destination,
      ...(economicsMode ? { economicsMode } : {}),
      ...(economicsCommitment ? { economicsCommitment } : {}),
      ...(inputCommitment ? { inputCommitment } : {}),
      ...(nullifierOrReplayCommitment ? { nullifierOrReplayCommitment } : {}),
      ...(outputCommitment ? { outputCommitment } : {}),
      owner,
      ...(ownerCommitment ? { ownerCommitment } : {}),
      ...(routeCommitment ? { routeCommitment } : {}),
      ...(settlementCommitment ? { settlementCommitment } : {}),
      settlementId,
      ...(shieldCapability ? { shieldCapability } : {}),
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

  return payload as VantaProtocolSettlementResponse;
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
