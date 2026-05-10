import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2Indexer,
  VantaPrivatePoolV2ProofRequest,
  VantaPrivatePoolV2ProofResult,
  VantaPrivatePoolV2ProofSystem,
  VantaPrivatePoolV2Prover,
  VantaPrivatePoolV2ShadowCommitments,
} from "./privatePoolV2Types";
import { createVantaPrivatePoolV2ShadowCommitments } from "./privatePoolV2ProofRequests";

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
    applyPrivateSendTransition?: (args: {
      changeLeafIndex: number;
      changeOutputCommitment: string;
      changeOutputRoot: string;
      inputCommitment: string;
      inputRoot: string;
      nullifier: string;
      recipientLeafIndex: number;
      recipientOutputCommitment: string;
      recipientOutputRoot: string;
      spentAtSlot?: bigint | null;
    }) => Promise<{
      changeCommitment: VantaPrivatePoolV2Commitment;
      nullifier: { nullifier: string; spentAtSlot: bigint | null };
      recipientCommitment: VantaPrivatePoolV2Commitment;
    }>;
    applySwapToShieldedTransition?: (args: {
      inputCommitment: string;
      inputRoot: string;
      nullifierOrReplayCommitment: string;
      outputCommitment: string;
      outputLeafIndex: number;
      outputRoot: string;
      spentAtSlot?: bigint | null;
    }) => Promise<{
      nullifier: { nullifier: string; spentAtSlot: bigint | null };
      outputCommitment: VantaPrivatePoolV2Commitment;
    }>;
    applyActualPrivateSpendTransition?: (args: {
      acceptedRoot: string;
      assetCohort: string;
      nullifier: string;
      outputCommitments: readonly string[];
      poolId: string;
      spentAtSlot?: bigint | null;
    }) => Promise<{
      nullifier: { nullifier: string; spentAtSlot: bigint | null };
      outputCommitments: readonly VantaPrivatePoolV2Commitment[];
    }>;
    applyPrivateUnshieldExitTransition?: (args: {
      inputCommitment: string;
      inputRoot: string;
      nullifierOrReplayCommitment: string;
      spentAtSlot?: bigint | null;
    }) => Promise<{
      nullifier: { nullifier: string; spentAtSlot: bigint | null };
    }>;
  };
  prover: VantaPrivatePoolV2Prover;
  receipts?: readonly VantaPrivatePoolV2ProofReceipt[];
};

export type VantaPrivatePoolV2ProofReceipt = {
  assetId: string;
  intent: VantaPrivatePoolV2ProofRequest["intent"];
  proofSystem: VantaPrivatePoolV2ProofSystem;
  publicInputCommitment: string;
  receiptId: string;
  recordedAtSlot: bigint;
  replayKey: string;
  shadowCommitments?: VantaPrivatePoolV2ShadowCommitments;
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

const U128_MAX = (1n << 128n) - 1n;

function requirePublicInputU128(request: VantaPrivatePoolV2ProofRequest, prefix: string) {
  const value = requirePublicInput(request, prefix);
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`Proof receipt requires public input ${prefix} to be a decimal u128 limb.`);
  }

  if (BigInt(value) > U128_MAX) {
    throw new Error(`Proof receipt requires public input ${prefix} to fit in u128.`);
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

  if (request.intent === "private-send") {
    const nullifier = readPublicInput(request, "nullifier:");
    if (nullifier) {
      return `private-send:${nullifier}`;
    }
  }

  if (request.intent === "swap-to-shielded") {
    const nullifierOrReplayCommitment = readPublicInput(
      request,
      "nullifier-or-replay-commitment:",
    );
    if (nullifierOrReplayCommitment) {
      return `swap-to-shielded:${nullifierOrReplayCommitment}`;
    }
  }

  if (request.intent === "unshield") {
    const nullifierOrReplayCommitment = readPublicInput(
      request,
      "nullifier-or-replay-commitment:",
    );
    if (nullifierOrReplayCommitment) {
      return `unshield:${nullifierOrReplayCommitment}`;
    }
  }

  return `${request.intent}:${request.publicInputs.join("|")}`;
}

function canonicalShadowCommitmentsForRequest(
  request: VantaPrivatePoolV2ProofRequest,
): VantaPrivatePoolV2ShadowCommitments | undefined {
  if (
    (request.intent !== "shield" && request.intent !== "claim") ||
    !request.operatorVisibleTerms
  ) {
    return undefined;
  }

  return createVantaPrivatePoolV2ShadowCommitments({
    intent: request.intent,
    operatorVisibleTerms: request.operatorVisibleTerms,
  });
}

function assertShadowCommitmentsMatchRequest(request: VantaPrivatePoolV2ProofRequest) {
  const canonical = canonicalShadowCommitmentsForRequest(request);
  if (!canonical) {
    return undefined;
  }

  if (
    request.shadowCommitments &&
    JSON.stringify(request.shadowCommitments) !== JSON.stringify(canonical)
  ) {
    throw new Error("Private Pool v2 proof request shadow commitment does not match operator-visible terms.");
  }

  return canonical;
}

function isStatefulPrivateSendRequest(request: VantaPrivatePoolV2ProofRequest) {
  const hasStatefulVersion = request.publicInputs.some((input) =>
    input.startsWith("vanta-private-pool-v2-send-proof-request-0.1:version"),
  );

  if (!hasStatefulVersion) {
    return false;
  }

  const changeOutputCommitment = readPublicInput(request, "change-output-commitment:");
  const recipientMemoHashHi = requirePublicInputU128(
    request,
    "recipient-memo-ciphertext-body-hash-hi:",
  );
  const recipientMemoHashLo = requirePublicInputU128(
    request,
    "recipient-memo-ciphertext-body-hash-lo:",
  );
  const changeMemoHashHi = requirePublicInputU128(
    request,
    "change-memo-ciphertext-body-hash-hi:",
  );
  const changeMemoHashLo = requirePublicInputU128(
    request,
    "change-memo-ciphertext-body-hash-lo:",
  );
  if (recipientMemoHashHi === "0" && recipientMemoHashLo === "0") {
    throw new Error("Private-send proof receipt requires a nonzero recipient memo ciphertext body hash.");
  }

  if (
    changeOutputCommitment &&
    changeOutputCommitment !== "0" &&
    changeMemoHashHi === "0" &&
    changeMemoHashLo === "0"
  ) {
    throw new Error(
      "Private-send proof receipt requires a change memo ciphertext body hash for nonzero change outputs.",
    );
  }

  return true;
}

function isActualPrivateSpendRequest(request: VantaPrivatePoolV2ProofRequest) {
  return request.publicInputs.some((input) =>
    input.startsWith("vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version"),
  );
}

function readActualPrivateSpendOutputCommitments(request: VantaPrivatePoolV2ProofRequest) {
  const outputs = request.publicInputs.flatMap((input) => {
    const match = input.match(/^output-commitment-(\d+):(.+)$/);
    if (!match) {
      return [];
    }

    return [{ index: Number(match[1]), commitment: match[2] }] as const;
  });

  const sorted = outputs.sort((left, right) => left.index - right.index);
  if (
    sorted.length !== 2 ||
    sorted[0]?.index !== 0 ||
    sorted[1]?.index !== 1 ||
    sorted.some((output) => output.commitment.trim().length === 0)
  ) {
    throw new Error("Actual private spend proof receipt requires exactly output-commitment-0 and output-commitment-1.");
  }

  const commitments = sorted.map((output) => output.commitment);
  if (new Set(commitments).size !== commitments.length) {
    throw new Error("Actual private spend proof receipt output commitments must be unique.");
  }

  return commitments;
}

function isStatefulSwapToShieldedRequest(request: VantaPrivatePoolV2ProofRequest) {
  return request.publicInputs.some((input) =>
    input.startsWith("vanta-private-pool-v2-swap-to-shielded-proof-request-0.1:version"),
  );
}

function isStatefulPrivateUnshieldRequest(request: VantaPrivatePoolV2ProofRequest) {
  return request.publicInputs.some((input) =>
    input.startsWith("vanta-private-pool-v2-unshield-proof-request-0.1:version"),
  );
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

    const shadowCommitments = assertShadowCommitmentsMatchRequest(request);

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
        assetId: request.assetId,
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

    if (request.intent === "private-send" && isStatefulPrivateSendRequest(request)) {
      const inputCommitment = requirePublicInput(request, "input-commitment:");
      const inputRoot = requirePublicInput(request, "input-root:");
      const nullifier = requirePublicInput(request, "nullifier:");
      const recipientOutputCommitment = requirePublicInput(
        request,
        "recipient-output-commitment:",
      );
      const recipientLeafIndex = Number(requirePublicInput(request, "recipient-leaf-index:"));
      const recipientOutputRoot = requirePublicInput(request, "recipient-output-root:");
      const changeOutputCommitment = requirePublicInput(request, "change-output-commitment:");
      const changeLeafIndex = Number(requirePublicInput(request, "change-leaf-index:"));
      const changeOutputRoot = requirePublicInput(request, "change-output-root:");

      if (!Number.isSafeInteger(recipientLeafIndex) || recipientLeafIndex < 0) {
        throw new Error("Private-send proof receipt requires a valid recipient leaf index.");
      }

      if (!Number.isSafeInteger(changeLeafIndex) || changeLeafIndex < 0) {
        throw new Error("Private-send proof receipt requires a valid change leaf index.");
      }

      if (await this.#indexer.getNullifier(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }

      if (!this.#indexer.registerNullifier) {
        throw new Error("Private-send proof receipt requires a nullifier registry.");
      }

      if (!this.#indexer.appendCommitment) {
        throw new Error("Private-send proof receipt requires a commitment indexer.");
      }

      if (!this.#indexer.applyPrivateSendTransition) {
        throw new Error("Private-send proof receipt requires an atomic send transition indexer.");
      }

      await this.#indexer.applyPrivateSendTransition({
        changeLeafIndex,
        changeOutputCommitment,
        changeOutputRoot,
        inputCommitment,
        inputRoot,
        nullifier,
        recipientLeafIndex,
        recipientOutputCommitment,
        recipientOutputRoot,
        spentAtSlot: this.#currentSlot,
      });
    }

    if (request.intent === "private-send" && isActualPrivateSpendRequest(request)) {
      const acceptedRoot = requirePublicInput(request, "accepted-root:");
      const nullifier = requirePublicInput(request, "nullifier:");
      const poolId = requirePublicInput(request, "pool-id:");
      const assetCohort = requirePublicInput(request, "asset-cohort:");
      const outputCommitments = readActualPrivateSpendOutputCommitments(request);

      if (await this.#indexer.getNullifier(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }

      if (!this.#indexer.applyActualPrivateSpendTransition) {
        throw new Error("Actual private spend proof receipt requires an atomic actual-private spend transition indexer.");
      }

      await this.#indexer.applyActualPrivateSpendTransition({
        acceptedRoot,
        assetCohort,
        nullifier,
        outputCommitments,
        poolId,
        spentAtSlot: this.#currentSlot,
      });
    }

    if (request.intent === "swap-to-shielded" && isStatefulSwapToShieldedRequest(request)) {
      const inputCommitment = requirePublicInput(request, "input-commitment:");
      const inputRoot = requirePublicInput(request, "input-root:");
      const nullifierOrReplayCommitment = requirePublicInput(
        request,
        "nullifier-or-replay-commitment:",
      );
      const outputCommitment = requirePublicInput(request, "output-commitment:");
      const outputLeafIndex = Number(requirePublicInput(request, "output-leaf-index:"));
      const outputRoot = requirePublicInput(request, "output-root:");

      if (!Number.isSafeInteger(outputLeafIndex) || outputLeafIndex < 0) {
        throw new Error("Swap-to-shielded proof receipt requires a valid output leaf index.");
      }

      if (await this.#indexer.getNullifier(nullifierOrReplayCommitment)) {
        throw new Error(`Private-pool nullifier ${nullifierOrReplayCommitment} is already registered.`);
      }

      if (!this.#indexer.registerNullifier) {
        throw new Error("Swap-to-shielded proof receipt requires a nullifier registry.");
      }

      if (!this.#indexer.appendCommitment) {
        throw new Error("Swap-to-shielded proof receipt requires a commitment indexer.");
      }

      if (!this.#indexer.applySwapToShieldedTransition) {
        throw new Error("Swap-to-shielded proof receipt requires an atomic swap transition indexer.");
      }

      await this.#indexer.applySwapToShieldedTransition({
        inputCommitment,
        inputRoot,
        nullifierOrReplayCommitment,
        outputCommitment,
        outputLeafIndex,
        outputRoot,
        spentAtSlot: this.#currentSlot,
      });
    }

    if (request.intent === "unshield" && isStatefulPrivateUnshieldRequest(request)) {
      const inputCommitment = requirePublicInput(request, "input-commitment:");
      const inputRoot = requirePublicInput(request, "input-root:");
      const nullifierOrReplayCommitment = requirePublicInput(
        request,
        "nullifier-or-replay-commitment:",
      );

      if (await this.#indexer.getNullifier(nullifierOrReplayCommitment)) {
        throw new Error(`Private-pool nullifier ${nullifierOrReplayCommitment} is already registered.`);
      }

      if (!this.#indexer.applyPrivateUnshieldExitTransition) {
        throw new Error("Private unshield proof receipt requires an atomic exit transition indexer.");
      }

      await this.#indexer.applyPrivateUnshieldExitTransition({
        inputCommitment,
        inputRoot,
        nullifierOrReplayCommitment,
        spentAtSlot: this.#currentSlot,
      });
    }

    const receipt = {
      assetId: request.assetId,
      intent: request.intent,
      proofSystem: proof.proofSystem,
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
      ...(shadowCommitments ? { shadowCommitments } : {}),
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
