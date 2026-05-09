import {
  VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
  type VantaPrivatePoolV2Asset,
  type VantaPrivatePoolV2ClaimQuote,
  type VantaPrivatePoolV2Commitment,
  type VantaPrivatePoolV2Indexer,
  type VantaPrivatePoolV2MerkleProof,
  type VantaPrivatePoolV2Nullifier,
  type VantaPrivatePoolV2ProofRequest,
  type VantaPrivatePoolV2ProofResult,
  type VantaPrivatePoolV2Protocol,
  type VantaPrivatePoolV2Readiness,
  type VantaPrivatePoolV2Relayer,
  type VantaPrivatePoolV2VerifierRegistry,
} from "./privatePoolV2Types";
import type { VantaPrivacyNetwork } from "./protocolAdapter";

type FetchLike = (url: string, init?: RequestInit) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

type RemoteServiceArgs = {
  allowInsecureLoopback?: boolean;
  authToken: string;
  baseUrl: string;
  fetchImpl?: FetchLike;
};

function requireText(value: string, fieldName: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Private Pool v2 remote service requires ${fieldName}.`);
  }

  return value.trim();
}

function isLoopbackHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1")
    );
  } catch {
    return false;
  }
}

function normalizeBaseUrl(baseUrl: string, { allowInsecureLoopback = false }: {
  allowInsecureLoopback?: boolean;
} = {}): string {
  const normalized = requireText(baseUrl, "baseUrl").replace(/\/+$/, "");
  if (!normalized.startsWith("https://") && !(allowInsecureLoopback && isLoopbackHttpUrl(normalized))) {
    throw new Error("Private Pool v2 remote services require HTTPS URLs.");
  }

  return normalized;
}

function encodeJson(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => encodeJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, encodeJson(nested)]),
    );
  }

  return value;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  return BigInt(String(value));
}

function toCommitment(value: any): VantaPrivatePoolV2Commitment {
  return {
    assetId: String(value.assetId),
    commitment: String(value.commitment),
    leafIndex: Number(value.leafIndex),
    merkleRoot: String(value.merkleRoot),
    treeId: String(value.treeId),
  };
}

function toProofResult(value: any): VantaPrivatePoolV2ProofResult {
  return {
    proofBytes: new Uint8Array(value.proofBytes ?? []),
    proofSystem: value.proofSystem,
    publicInputCommitment: String(value.publicInputCommitment),
    verifyingKeyId: String(value.verifyingKeyId),
  };
}

function createRemoteJsonClient({
  allowInsecureLoopback = false,
  authToken,
  baseUrl,
  fetchImpl = fetch,
}: RemoteServiceArgs) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl, { allowInsecureLoopback });
  const token = requireText(authToken, "authToken");

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetchImpl(`${resolvedBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Private Pool v2 remote service request failed (${response.status}): ${await response.text()}`,
      );
    }

    return response.json();
  }

  return {
    get(path: string) {
      return request(path);
    },
    post(path: string, body: unknown) {
      return request(path, {
        body: JSON.stringify(encodeJson(body)),
        method: "POST",
      });
    },
  };
}

export function createVantaPrivatePoolV2RemoteIndexer(args: RemoteServiceArgs): VantaPrivatePoolV2Indexer {
  const client = createRemoteJsonClient(args);

  return {
    async getCurrentRoot(treeId) {
      const response: any = await client.get(`/v1/roots/latest?treeId=${encodeURIComponent(treeId)}`);
      return String(response.root);
    },
    async getMerkleProof(commitment) {
      const response: any = await client.get(`/v1/commitments/${encodeURIComponent(commitment)}/proof`);
      return {
        leaf: toCommitment(response.leaf),
        path: response.path.map(String),
        pathIndices: response.pathIndices.map(Number),
        root: String(response.root),
      } satisfies VantaPrivatePoolV2MerkleProof;
    },
    async getNullifier(nullifier) {
      const response: any = await client.get(`/v1/nullifiers/${encodeURIComponent(nullifier)}`);
      if (!response?.nullifier) {
        return null;
      }

      return {
        nullifier: String(response.nullifier),
        spentAtSlot: response.spentAtSlot === null || response.spentAtSlot === undefined
          ? null
          : toBigInt(response.spentAtSlot),
      } satisfies VantaPrivatePoolV2Nullifier;
    },
    async listCommitments({ assetId, fromLeafIndex, treeId }) {
      const params = new URLSearchParams({ treeId });
      if (assetId) {
        params.set("assetId", assetId);
      }
      if (fromLeafIndex !== undefined) {
        params.set("fromLeafIndex", String(fromLeafIndex));
      }
      const response: any = await client.get(`/v1/commitments?${params.toString()}`);
      return (response.commitments ?? []).map(toCommitment);
    },
  };
}

export function createVantaPrivatePoolV2RemoteProver(args: RemoteServiceArgs) {
  const client = createRemoteJsonClient(args);

  return {
    async prove(request: VantaPrivatePoolV2ProofRequest) {
      const response = await client.post("/v1/proofs", { request });
      return toProofResult(response);
    },
    readiness(): VantaPrivatePoolV2Readiness {
      return {
        blockers: ["remote-prover-health-not-fetched"],
        ready: false,
        warnings: ["Remote prover readiness is checked by deployment health probes."],
      };
    },
    async verify({ proof, request }: {
      proof: VantaPrivatePoolV2ProofResult;
      request: VantaPrivatePoolV2ProofRequest;
    }) {
      const response: any = await client.post("/v1/proofs/verify", { proof, request });
      return response.accepted === true;
    },
  };
}

export function createVantaPrivatePoolV2RemoteRelayer(args: RemoteServiceArgs): VantaPrivatePoolV2Relayer {
  const client = createRemoteJsonClient(args);

  return {
    async quoteClaim(body) {
      const response: any = await client.post("/v1/claims/quote", body);
      return {
        estimatedFeeBaseUnits: toBigInt(response.estimatedFeeBaseUnits),
        expiresAtSlot: toBigInt(response.expiresAtSlot),
        relayerId: String(response.relayerId),
      } satisfies VantaPrivatePoolV2ClaimQuote;
    },
    async submitClaim(body) {
      const response: any = await client.post("/v1/claims/submit", body);
      return {
        relayerId: String(response.relayerId),
        signature: String(response.signature),
      };
    },
    async submitPrivateSpend(body) {
      const response: any = await client.post("/v1/private-spends/submit", body);
      return {
        relayerId: String(response.relayerId),
        signature: String(response.signature),
        submittedBy: "relayer",
      } as const;
    },
  };
}

export function createVantaPrivatePoolV2RemoteVerifierRegistry(
  args: RemoteServiceArgs,
): VantaPrivatePoolV2VerifierRegistry {
  const client = createRemoteJsonClient(args);

  return {
    async acceptProof(body) {
      const response: any = await client.post("/v1/proofs/accept", body);
      return {
        assetId: String(response.assetId),
        intent: response.intent,
        proofSystem: response.proofSystem ?? body.proof.proofSystem,
        publicInputCommitment: String(response.publicInputCommitment),
        receiptId: String(response.receiptId),
        recordedAtSlot: toBigInt(response.recordedAtSlot),
        replayKey: String(response.replayKey),
      };
    },
  };
}

export function createVantaPrivatePoolV2RemoteRuntime({
  assets,
  indexer,
  network,
  prover,
  relayer,
  verifierRegistry,
}: {
  assets: readonly VantaPrivatePoolV2Asset[];
  indexer: VantaPrivatePoolV2Indexer;
  network: VantaPrivacyNetwork;
  prover: ReturnType<typeof createVantaPrivatePoolV2RemoteProver>;
  relayer: VantaPrivatePoolV2Relayer;
  verifierRegistry: VantaPrivatePoolV2VerifierRegistry;
}): VantaPrivatePoolV2Protocol {
  return {
    assets,
    contractVersion: VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
    indexer,
    infrastructure: ["indexer", "relayer", "web-zk-prover", "operator"],
    network,
    prover,
    readiness() {
      return {
        blockers: [],
        ready: Boolean(indexer && prover && relayer && verifierRegistry),
        warnings: ["Remote runtime readiness still depends on deployment health, audit, and mainnet approval."],
      };
    },
    relayer,
    verifierRegistry,
  };
}
