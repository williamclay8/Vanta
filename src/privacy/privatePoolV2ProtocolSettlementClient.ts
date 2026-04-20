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

export type VantaProtocolSettlementRequest = {
  action: VantaProtocolSettlementAction;
  amount: string;
  asset: string;
  authToken?: string | null;
  baseUrl?: string | null;
  destination: string;
  owner: string;
  settlementId: string;
  shieldCapability?: VantaProtocolShieldCapability | null;
  shieldRouteEvidence?: VantaProtocolShieldRouteEvidence | null;
};

export type VantaProtocolSettlementReceipt = {
  action: VantaProtocolSettlementAction;
  amount: string;
  asset: string;
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

export type VantaProtocolSettlementResponse = {
  kind: "protocol_settlement";
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
  receipts: unknown[];
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
  contractVersion: string;
  kind: "Private Pool V2 operator status";
  ok: boolean;
  protocolActionProofModes: Record<VantaProtocolSettlementAction, string>;
  receiptCount: number;
  receiptStorePath: string;
  settlementPolicy: VantaPrivatePoolV2SettlementPolicy;
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
  owner,
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
      owner,
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
