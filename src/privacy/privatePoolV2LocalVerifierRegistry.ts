import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2Indexer,
  VantaPrivatePoolV2ProofRequest,
  VantaPrivatePoolV2ProofResult,
  VantaPrivatePoolV2Prover,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_LOCAL_VERIFIER_REGISTRY_SCHEME =
  "sha256-private-pool-v2-local-verifier-registry-0.1" as const;

export type VantaPrivatePoolV2LocalVerifierRegistryArgs = {
  currentSlot?: bigint;
  indexer: VantaPrivatePoolV2Indexer & {
    appendCommitment?: (args: {
      assetId: string;
      commitment: string;
      treeId: string;
    }) => VantaPrivatePoolV2Commitment;
    registerNullifier?: (args: {
      nullifier: string;
      spentAtSlot?: bigint | null;
    }) => { nullifier: string; spentAtSlot: bigint | null };
  };
  prover: VantaPrivatePoolV2Prover;
  receipts?: readonly VantaPrivatePoolV2ProofReceipt[];
};

export type VantaPrivatePoolV2ProofReceipt = {
  assetId: string;
  intent: VantaPrivatePoolV2ProofRequest["intent"];
  publicInputCommitment: string;
  receiptId: string;
  recordedAtSlot: bigint;
  replayKey: string;
};

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

function readPublicInput(request: VantaPrivatePoolV2ProofRequest, prefix: string) {
  const input = request.publicInputs.find((candidate) => candidate.startsWith(prefix));
  return input?.slice(prefix.length) ?? null;
}

function requirePublicInput(request: VantaPrivatePoolV2ProofRequest, prefix: string) {
  const value = readPublicInput(request, prefix);
  if (!value) {
    throw new Error(`Proof receipt requires public input ${prefix}.`);
  }

  return value;
}

function replayKeyForRequest(request: VantaPrivatePoolV2ProofRequest) {
  if (request.intent === "shield") {
    const outputCommitment = readPublicInput(request, "output-commitment:");
    if (!outputCommitment) {
      throw new Error("Shield proof receipt requires an output commitment.");
    }

    return `shield:${outputCommitment}`;
  }

  if (request.intent === "claim") {
    const nullifier = readPublicInput(request, "nullifier:");
    if (!nullifier) {
      throw new Error("Claim proof receipt requires a nullifier.");
    }

    return `claim:${nullifier}`;
  }

  return `${request.intent}:${request.publicInputs.join("|")}`;
}

export class VantaPrivatePoolV2LocalVerifierRegistry {
  readonly scheme = VANTA_PRIVATE_POOL_V2_LOCAL_VERIFIER_REGISTRY_SCHEME;

  #currentSlot: bigint;
  #indexer: VantaPrivatePoolV2LocalVerifierRegistryArgs["indexer"];
  #prover: VantaPrivatePoolV2Prover;
  #receipts = new Map<string, VantaPrivatePoolV2ProofReceipt>();

  constructor({
    currentSlot = 1_000_000n,
    indexer,
    prover,
    receipts = [],
  }: VantaPrivatePoolV2LocalVerifierRegistryArgs) {
    this.#currentSlot = currentSlot;
    this.#indexer = indexer;
    this.#prover = prover;
    this.#receipts = new Map(receipts.map((receipt) => [receipt.replayKey, receipt] as const));
  }

  get receipts() {
    return [...this.#receipts.values()];
  }

  async acceptProof({
    proof,
    request,
  }: {
    proof: VantaPrivatePoolV2ProofResult;
    request: VantaPrivatePoolV2ProofRequest;
  }): Promise<VantaPrivatePoolV2ProofReceipt> {
    if (!this.#prover.verify) {
      throw new Error("Private Pool v2 verifier registry requires a prover verify boundary.");
    }

    const verified = await this.#prover.verify({ proof, request });
    if (!verified) {
      throw new Error("Private Pool v2 proof verification failed.");
    }

    const replayKey = replayKeyForRequest(request);
    if (this.#receipts.has(replayKey)) {
      throw new Error(`Private Pool v2 receipt ${replayKey} has already been accepted.`);
    }

    if (request.intent === "shield") {
      if (!this.#indexer.appendCommitment) {
        throw new Error("Shield proof receipt requires a commitment indexer.");
      }

      const expectedLeafIndex = Number(requirePublicInput(request, "leaf-index:"));
      const expectedRoot = requirePublicInput(request, "output-root:");
      const treeId = requirePublicInput(request, "tree-id:");
      const currentCommitments = await this.#indexer.listCommitments({ treeId });
      if (currentCommitments.length !== expectedLeafIndex) {
        throw new Error(
          `Shield proof leaf index ${expectedLeafIndex} does not match next verifier leaf ${currentCommitments.length}.`,
        );
      }

      const record = this.#indexer.appendCommitment({
        assetId: requirePublicInput(request, "target-asset:"),
        commitment: requirePublicInput(request, "output-commitment:"),
        treeId,
      });

      if (record.leafIndex !== expectedLeafIndex) {
        throw new Error(
          `Shield proof leaf index ${expectedLeafIndex} does not match appended leaf ${record.leafIndex}.`,
        );
      }

      if (record.merkleRoot !== expectedRoot) {
        throw new Error("Shield proof output root does not match verifier indexer root.");
      }
    }

    if (request.intent === "claim") {
      const nullifier = readPublicInput(request, "nullifier:");
      if (!nullifier) {
        throw new Error("Claim proof receipt requires a nullifier.");
      }

      if (await this.#indexer.getNullifier(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }

      if (!this.#indexer.registerNullifier) {
        throw new Error("Claim proof receipt requires a nullifier registry.");
      }

      this.#indexer.registerNullifier({
        nullifier,
        spentAtSlot: this.#currentSlot,
      });
    }

    const receipt = {
      assetId: request.assetId,
      intent: request.intent,
      publicInputCommitment: proof.publicInputCommitment,
      receiptId: hashParts(
        this.scheme,
        "receipt",
        replayKey,
        proof.publicInputCommitment,
        this.#currentSlot.toString(),
      ),
      recordedAtSlot: this.#currentSlot,
      replayKey,
    } satisfies VantaPrivatePoolV2ProofReceipt;

    this.#receipts.set(replayKey, receipt);
    return receipt;
  }

  getReceipt(replayKey: string) {
    return this.#receipts.get(replayKey) ?? null;
  }
}

export function createVantaPrivatePoolV2LocalVerifierRegistry(
  args: VantaPrivatePoolV2LocalVerifierRegistryArgs,
) {
  return new VantaPrivatePoolV2LocalVerifierRegistry(args);
}
