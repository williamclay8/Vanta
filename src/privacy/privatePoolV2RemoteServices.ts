import {
  VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
  type VantaPrivatePoolV2Asset,
  type VantaPrivatePoolV2ClaimQuote,
  type VantaPrivatePoolV2Commitment,
  type VantaPrivatePoolV2Indexer,
  type VantaPrivatePoolV2MerkleProof,
  type VantaPrivatePoolV2Nullifier,
  type VantaPrivatePoolV2ProofRequest,
  type VantaPrivatePoolV2ProofArtifactVerificationReceipt,
  type VantaPrivatePoolV2ProofResult,
  type VantaPrivatePoolV2Protocol,
  type VantaPrivatePoolV2Readiness,
  type VantaPrivatePoolV2Relayer,
  type VantaPrivatePoolV2VerifierRegistry,
} from "./privatePoolV2Types";
import type { VantaPrivacyNetwork } from "./protocolAdapter";

const VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND = "remote-service" as const;
const VANTA_PRIVATE_POOL_V2_REMOTE_PRODUCTION_VERIFYING_KEY_HASH_KIND =
  "production-verifying-key-hash" as const;
const VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_ARTIFACT_VERIFYING_KEY_ID_PREFIX =
  "local-acir-bytecode:";
const VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_ARTIFACT_TRANSCRIPT_FIELDS = [
  "acirBytecodeHash",
  "backend",
  "circuit",
  "proofSystem",
  "proofBackend",
  "proofRuntimePackage",
  "proofRuntimeVersion",
  "publicInputCommitment",
  "proofHex",
  "verifyingKeyHash",
  "verifyingKeyHashKind",
  "verifyingKeyId",
] as const;
const VANTA_PRIVATE_POOL_V2_REMOTE_PRODUCTION_PROOF_SYSTEMS = new Set([
  "groth16",
  "noir-bb",
  "plonk",
]);
const VANTA_PRIVATE_POOL_V2_REMOTE_FORBIDDEN_WITNESS_KEYS = new Set([
  "notesecret",
  "noirwitnesspackage",
  "privateinputs",
  "privatewitness",
  "rawprivateinputs",
  "secret",
  "sourceartifacts",
  "sourcepublicinputs",
  "witness",
  "witnesspackage",
]);

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

function normalizeRemoteKey(key: string) {
  return key.replace(/[^a-z0-9]/giu, "").toLowerCase();
}

function assertNoRemoteProofWitnessMaterial(value: unknown, label: string, path: readonly string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoRemoteProofWitnessMaterial(entry, label, [...path, String(index)]),
    );
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = normalizeRemoteKey(key);
    if (VANTA_PRIVATE_POOL_V2_REMOTE_FORBIDDEN_WITNESS_KEYS.has(normalizedKey)) {
      throw new Error(
        `${label} must not include witness material field ${[...path, key].join(".")}.`,
      );
    }
    assertNoRemoteProofWitnessMaterial(nested, label, [...path, key]);
  }
}

function normalizeRemoteProofSystem(value: unknown) {
  const proofSystem = String(value ?? "");
  if (!VANTA_PRIVATE_POOL_V2_REMOTE_PRODUCTION_PROOF_SYSTEMS.has(proofSystem)) {
    throw new Error(
      "Private Pool v2 remote services require a production proof system, not mock proof metadata.",
    );
  }

  return proofSystem as "groth16" | "noir-bb" | "plonk";
}

function normalizeRemoteProofBackend(
  value: unknown,
  { allowMissing = true }: { allowMissing?: boolean } = {},
) {
  if ((value === undefined || value === null) && allowMissing) {
    return VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND;
  }

  const proofBackend = String(value ?? "");
  if (proofBackend !== VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND) {
    throw new Error(
      "Private Pool v2 remote services require proofBackend=remote-service.",
    );
  }

  return VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_BACKEND;
}

function toProofBytes(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Private Pool v2 remote proof response requires non-empty proofBytes.");
  }

  const proofBytes = value.map((entry) => Number(entry));
  if (
    proofBytes.some(
      (entry) => !Number.isInteger(entry) || entry < 0 || entry > 255,
    )
  ) {
    throw new Error("Private Pool v2 remote proof response proofBytes must be byte values.");
  }

  return new Uint8Array(proofBytes);
}

function assertRemoteProductionProofResult(proof: VantaPrivatePoolV2ProofResult) {
  normalizeRemoteProofSystem(proof.proofSystem);
  normalizeRemoteProofBackend(proof.proofBackend, { allowMissing: false });
}

function assertRemoteProductionVerifyingKeyId(value: unknown) {
  const verifyingKeyId = String(value ?? "").trim();
  if (
    !verifyingKeyId ||
    verifyingKeyId
      .toLowerCase()
      .includes(VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_ARTIFACT_VERIFYING_KEY_ID_PREFIX)
  ) {
    throw new Error(
      "Private Pool v2 remote proof-artifact verification rejects relabelled local bb fixture metadata; requires a production verifying-key id.",
    );
  }
}

function toStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Private Pool v2 remote proof-artifact verification requires ${fieldName}.`);
  }

  return value.map(String);
}

function transcriptString(value: unknown) {
  return String(value ?? "").trim();
}

function assertRemoteProofArtifactReceiptMatchesRequest(
  proofArtifact: unknown,
  receipt: VantaPrivatePoolV2ProofArtifactVerificationReceipt,
) {
  if (!proofArtifact || typeof proofArtifact !== "object" || Array.isArray(proofArtifact)) {
    throw new Error("Private Pool v2 remote proof-artifact verification requires proofArtifact.");
  }

  const artifact = proofArtifact as Record<string, unknown>;
  for (const field of VANTA_PRIVATE_POOL_V2_REMOTE_PROOF_ARTIFACT_TRANSCRIPT_FIELDS) {
    if (transcriptString(artifact[field]) !== transcriptString(receipt[field])) {
      throw new Error(
        `Private Pool v2 remote verifier receipt ${field} must match submitted proof artifact.`,
      );
    }
  }

  const artifactPublicInputs = toStringArray(artifact.publicInputs, "publicInputs");
  if (JSON.stringify(artifactPublicInputs) !== JSON.stringify(receipt.publicInputs)) {
    throw new Error(
      "Private Pool v2 remote verifier receipt publicInputs must match submitted proof artifact.",
    );
  }

  const artifactPublicInputLabels = toStringArray(artifact.publicInputLabels, "publicInputLabels");
  if (JSON.stringify(artifactPublicInputLabels) !== JSON.stringify(receipt.publicInputLabels)) {
    throw new Error(
      "Private Pool v2 remote verifier receipt publicInputLabels must match submitted proof artifact.",
    );
  }
}

function toVerifiedPublicInputs(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "Private Pool v2 remote proof-artifact verification requires verifiedPublicInputs.",
    );
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)]),
  );
}

function assertRemoteProductionProofArtifactRequest(body: {
  expectedPublicInputs?: Record<string, string>;
  proofArtifact: unknown;
}) {
  assertNoRemoteProofWitnessMaterial(
    body,
    "Private Pool v2 remote proof-artifact verification request",
  );

  const proofArtifact = body.proofArtifact;
  if (!proofArtifact || typeof proofArtifact !== "object" || Array.isArray(proofArtifact)) {
    throw new Error("Private Pool v2 remote proof-artifact verification requires proofArtifact.");
  }

  const artifact = proofArtifact as Record<string, unknown>;
  normalizeRemoteProofSystem(artifact.proofSystem);
  normalizeRemoteProofBackend(artifact.proofBackend, { allowMissing: false });
  if (
    artifact.verifyingKeyHashKind !==
    VANTA_PRIVATE_POOL_V2_REMOTE_PRODUCTION_VERIFYING_KEY_HASH_KIND
  ) {
    throw new Error(
      "Private Pool v2 remote proof-artifact verification requires a production verifying-key hash.",
    );
  }
  assertRemoteProductionVerifyingKeyId(artifact.verifyingKeyId);
}

function toProofArtifactVerificationReceipt(
  value: any,
): VantaPrivatePoolV2ProofArtifactVerificationReceipt {
  const receipt = value?.verifiedReceipt ?? value;
  if (!receipt || typeof receipt !== "object") {
    throw new Error(
      "Private Pool v2 remote proof-artifact verification requires a verified receipt.",
    );
  }

  const proofSystem = normalizeRemoteProofSystem(receipt.proofSystem);
  const proofBackend = normalizeRemoteProofBackend(receipt.proofBackend, { allowMissing: false });
  if (receipt.verified !== true) {
    throw new Error("Private Pool v2 remote proof-artifact verification requires verified=true.");
  }
  if (
    receipt.verifyingKeyHashKind !==
    VANTA_PRIVATE_POOL_V2_REMOTE_PRODUCTION_VERIFYING_KEY_HASH_KIND
  ) {
    throw new Error(
      "Private Pool v2 remote proof-artifact verification requires a production verifying-key hash.",
    );
  }
  if (receipt.backend !== "barretenberg-ultrahonk") {
    throw new Error(
      "Private Pool v2 remote proof-artifact verification requires barretenberg-ultrahonk backend.",
    );
  }
  if (receipt.proofRuntimePackage !== "@aztec/bb.js") {
    throw new Error(
      "Private Pool v2 remote proof-artifact verification requires the bb.js proof runtime.",
    );
  }
  assertRemoteProductionVerifyingKeyId(receipt.verifyingKeyId);

  return {
    acirBytecodeHash: String(receipt.acirBytecodeHash),
    backend: String(receipt.backend) as "barretenberg-ultrahonk",
    circuit: String(receipt.circuit),
    proofBackend,
    proofByteLength: Number(receipt.proofByteLength),
    proofFieldCount: Number(receipt.proofFieldCount),
    proofHex: String(receipt.proofHex),
    proofRuntimePackage: String(receipt.proofRuntimePackage) as "@aztec/bb.js",
    proofRuntimeVersion: String(receipt.proofRuntimeVersion),
    proofSystem,
    publicInputCommitment: String(receipt.publicInputCommitment),
    publicInputCount: Number(receipt.publicInputCount),
    publicInputLabels: toStringArray(receipt.publicInputLabels, "publicInputLabels"),
    publicInputs: toStringArray(receipt.publicInputs, "publicInputs"),
    verified: true,
    verifiedPublicInputs: toVerifiedPublicInputs(receipt.verifiedPublicInputs),
    verifyingKeyHash: String(receipt.verifyingKeyHash),
    verifyingKeyHashKind: VANTA_PRIVATE_POOL_V2_REMOTE_PRODUCTION_VERIFYING_KEY_HASH_KIND,
    verifyingKeyId: String(receipt.verifyingKeyId),
  };
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
    proofBackend: normalizeRemoteProofBackend(value.proofBackend),
    proofBytes: toProofBytes(value.proofBytes),
    proofSystem: normalizeRemoteProofSystem(value.proofSystem),
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
      assertNoRemoteProofWitnessMaterial(request, "Private Pool v2 remote prover request");
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
      assertNoRemoteProofWitnessMaterial({ proof, request }, "Private Pool v2 remote proof verification request");
      assertRemoteProductionProofResult(proof);
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
      assertNoRemoteProofWitnessMaterial(body, "Private Pool v2 remote verifier request");
      assertRemoteProductionProofResult(body.proof);
      const response: any = await client.post("/v1/proofs/accept", body);
      return {
        assetId: String(response.assetId),
        intent: response.intent,
        proofBackend: normalizeRemoteProofBackend(response.proofBackend ?? body.proof.proofBackend),
        proofSystem: normalizeRemoteProofSystem(response.proofSystem ?? body.proof.proofSystem),
        publicInputCommitment: String(response.publicInputCommitment),
        receiptId: String(response.receiptId),
        recordedAtSlot: toBigInt(response.recordedAtSlot),
        replayKey: String(response.replayKey),
      };
    },
    async verifyProofArtifact(body) {
      assertRemoteProductionProofArtifactRequest(body);
      const response: any = await client.post("/v1/proof-artifacts/verify", body);
      const receipt = toProofArtifactVerificationReceipt(response);
      assertRemoteProofArtifactReceiptMatchesRequest(body.proofArtifact, receipt);
      return receipt;
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
