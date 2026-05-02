import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2Indexer,
  VantaPrivatePoolV2MerkleProof,
  VantaPrivatePoolV2Nullifier,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_LOCAL_INDEXER_SCHEME =
  "sha256-append-only-private-pool-v2-local-indexer-0.1" as const;

export type VantaPrivatePoolV2AppendCommitmentArgs = {
  assetId: string;
  commitment: string;
  treeId: string;
};

export type VantaPrivatePoolV2RegisterNullifierArgs = {
  nullifier: string;
  spentAtSlot?: bigint | null;
};

export type VantaPrivatePoolV2ApplyPrivateSendTransitionArgs = {
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
};

export type VantaPrivatePoolV2PrivateSendTransitionResult = {
  changeCommitment: VantaPrivatePoolV2Commitment;
  nullifier: VantaPrivatePoolV2Nullifier;
  recipientCommitment: VantaPrivatePoolV2Commitment;
};

export type VantaPrivatePoolV2ApplySwapToShieldedTransitionArgs = {
  inputCommitment: string;
  inputRoot: string;
  nullifierOrReplayCommitment: string;
  outputCommitment: string;
  outputLeafIndex: number;
  outputRoot: string;
  spentAtSlot?: bigint | null;
};

export type VantaPrivatePoolV2SwapToShieldedTransitionResult = {
  nullifier: VantaPrivatePoolV2Nullifier;
  outputCommitment: VantaPrivatePoolV2Commitment;
};

export type VantaPrivatePoolV2ApplyActualPrivateSpendTransitionArgs = {
  acceptedRoot: string;
  assetCohort: string;
  nullifier: string;
  outputCommitments: readonly string[];
  poolId: string;
  spentAtSlot?: bigint | null;
};

export type VantaPrivatePoolV2ActualPrivateSpendTransitionResult = {
  nullifier: VantaPrivatePoolV2Nullifier;
  outputCommitments: readonly VantaPrivatePoolV2Commitment[];
};

export type VantaPrivatePoolV2ApplyPrivateUnshieldExitTransitionArgs = {
  inputCommitment: string;
  inputRoot: string;
  nullifierOrReplayCommitment: string;
  spentAtSlot?: bigint | null;
};

export type VantaPrivatePoolV2PrivateUnshieldExitTransitionResult = {
  nullifier: VantaPrivatePoolV2Nullifier;
};

type MerkleLayer = readonly string[];

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

function hashLeaf(record: Omit<VantaPrivatePoolV2Commitment, "merkleRoot">) {
  return hashParts(
    VANTA_PRIVATE_POOL_V2_LOCAL_INDEXER_SCHEME,
    "leaf",
    record.treeId,
    String(record.leafIndex),
    record.assetId,
    record.commitment,
  );
}

function hashNode(treeId: string, depth: number, left: string, right: string) {
  return hashParts(
    VANTA_PRIVATE_POOL_V2_LOCAL_INDEXER_SCHEME,
    "node",
    treeId,
    String(depth),
    left,
    right,
  );
}

function emptyRoot(treeId: string) {
  return hashParts(VANTA_PRIVATE_POOL_V2_LOCAL_INDEXER_SCHEME, "empty-root", treeId);
}

function buildMerkleLayers(treeId: string, records: readonly VantaPrivatePoolV2Commitment[]) {
  if (records.length === 0) {
    return [[emptyRoot(treeId)]] satisfies readonly MerkleLayer[];
  }

  const leaves = records.map((record) => hashLeaf(record));
  const layers: string[][] = [leaves];
  let current = leaves;
  let depth = 0;

  while (current.length > 1) {
    const next: string[] = [];

    for (let index = 0; index < current.length; index += 2) {
      const left = current[index]!;
      const right = current[index + 1] ?? left;
      next.push(hashNode(treeId, depth, left, right));
    }

    layers.push(next);
    current = next;
    depth += 1;
  }

  return layers;
}

function currentRoot(treeId: string, records: readonly VantaPrivatePoolV2Commitment[]) {
  const layers = buildMerkleLayers(treeId, records);
  return layers[layers.length - 1]?.[0] ?? emptyRoot(treeId);
}

export class VantaPrivatePoolV2LocalIndexer implements VantaPrivatePoolV2Indexer {
  readonly scheme = VANTA_PRIVATE_POOL_V2_LOCAL_INDEXER_SCHEME;

  #commitments: VantaPrivatePoolV2Commitment[];
  #nullifiers: Map<string, VantaPrivatePoolV2Nullifier>;

  constructor(args: {
    commitments?: readonly VantaPrivatePoolV2Commitment[];
    nullifiers?: readonly VantaPrivatePoolV2Nullifier[];
  } = {}) {
    this.#commitments = [...(args.commitments ?? [])].sort(
      (left, right) => left.leafIndex - right.leafIndex,
    );
    this.#nullifiers = new Map(
      (args.nullifiers ?? []).map((record) => [record.nullifier, record] as const),
    );
  }

  appendCommitment(args: VantaPrivatePoolV2AppendCommitmentArgs): VantaPrivatePoolV2Commitment {
    const treeCommitments = this.#treeCommitments(args.treeId);
    const recordWithoutRoot = {
      assetId: args.assetId,
      commitment: args.commitment,
      leafIndex: treeCommitments.length,
      treeId: args.treeId,
    };
    const record = {
      ...recordWithoutRoot,
      merkleRoot: currentRoot(args.treeId, [
        ...treeCommitments,
        { ...recordWithoutRoot, merkleRoot: "" },
      ]),
    } satisfies VantaPrivatePoolV2Commitment;

    this.#commitments.push(record);
    return record;
  }

  async getCurrentRoot(treeId: string) {
    return currentRoot(treeId, this.#treeCommitments(treeId));
  }

  async getMerkleProof(commitment: string): Promise<VantaPrivatePoolV2MerkleProof> {
    const record = this.#commitments.find((candidate) => candidate.commitment === commitment);

    if (!record) {
      throw new Error(`Unknown private-pool commitment ${commitment}.`);
    }

    const treeCommitments = this.#treeCommitments(record.treeId);
    const layers = buildMerkleLayers(record.treeId, treeCommitments);
    const path: string[] = [];
    const pathIndices: number[] = [];
    let currentIndex = record.leafIndex;

    for (let depth = 0; depth < layers.length - 1; depth += 1) {
      const layer = layers[depth]!;
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      path.push(layer[siblingIndex] ?? layer[currentIndex]!);
      pathIndices.push(isRight ? 1 : 0);
      currentIndex = Math.floor(currentIndex / 2);
    }

    const root = layers[layers.length - 1]?.[0] ?? emptyRoot(record.treeId);

    return {
      leaf: {
        ...record,
        merkleRoot: root,
      },
      path,
      pathIndices,
      root,
    };
  }

  async getNullifier(nullifier: string) {
    return this.#nullifiers.get(nullifier) ?? null;
  }

  async listCommitments({
    assetId,
    fromLeafIndex = 0,
    treeId,
  }: {
    assetId?: string;
    fromLeafIndex?: number;
    treeId: string;
  }) {
    return this.#treeCommitments(treeId).filter(
      (record) =>
        record.leafIndex >= fromLeafIndex && (!assetId || record.assetId === assetId),
    );
  }

  registerNullifier({
    nullifier,
    spentAtSlot = null,
  }: VantaPrivatePoolV2RegisterNullifierArgs): VantaPrivatePoolV2Nullifier {
    if (this.#nullifiers.has(nullifier)) {
      throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
    }

    const record = {
      nullifier,
      spentAtSlot,
    } satisfies VantaPrivatePoolV2Nullifier;

    this.#nullifiers.set(nullifier, record);
    return record;
  }

  async applyPrivateSendTransition({
    changeLeafIndex,
    changeOutputCommitment,
    changeOutputRoot,
    inputCommitment,
    inputRoot,
    nullifier,
    recipientLeafIndex,
    recipientOutputCommitment,
    recipientOutputRoot,
    spentAtSlot = null,
  }: VantaPrivatePoolV2ApplyPrivateSendTransitionArgs): Promise<VantaPrivatePoolV2PrivateSendTransitionResult> {
    if (this.#nullifiers.has(nullifier)) {
      throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
    }

    const inputRecord = this.#commitments.find(
      (candidate) => candidate.commitment === inputCommitment,
    );
    if (!inputRecord) {
      throw new Error(`Unknown private-pool commitment ${inputCommitment}.`);
    }

    const treeCommitments = this.#treeCommitments(inputRecord.treeId);
    const currentInputRoot = currentRoot(inputRecord.treeId, treeCommitments);
    if (currentInputRoot !== inputRoot) {
      throw new Error("Private-send proof input root does not match verifier indexer root.");
    }

    if (treeCommitments.length !== recipientLeafIndex) {
      throw new Error(
        `Private-send recipient leaf index ${recipientLeafIndex} does not match next verifier leaf ${treeCommitments.length}.`,
      );
    }

    if (changeLeafIndex !== recipientLeafIndex + 1) {
      throw new Error("Private-send change leaf index must follow recipient leaf index.");
    }

    const recipientWithoutRoot = {
      assetId: inputRecord.assetId,
      commitment: recipientOutputCommitment,
      leafIndex: recipientLeafIndex,
      treeId: inputRecord.treeId,
    };
    const recipientCommitment = {
      ...recipientWithoutRoot,
      merkleRoot: currentRoot(inputRecord.treeId, [
        ...treeCommitments,
        { ...recipientWithoutRoot, merkleRoot: "" },
      ]),
    } satisfies VantaPrivatePoolV2Commitment;

    if (recipientCommitment.merkleRoot !== recipientOutputRoot) {
      throw new Error("Private-send recipient output root does not match verifier indexer root.");
    }

    const changeWithoutRoot = {
      assetId: inputRecord.assetId,
      commitment: changeOutputCommitment,
      leafIndex: changeLeafIndex,
      treeId: inputRecord.treeId,
    };
    const changeCommitment = {
      ...changeWithoutRoot,
      merkleRoot: currentRoot(inputRecord.treeId, [
        ...treeCommitments,
        recipientCommitment,
        { ...changeWithoutRoot, merkleRoot: "" },
      ]),
    } satisfies VantaPrivatePoolV2Commitment;

    if (changeCommitment.merkleRoot !== changeOutputRoot) {
      throw new Error("Private-send change output root does not match verifier indexer root.");
    }

    const nullifierRecord = {
      nullifier,
      spentAtSlot,
    } satisfies VantaPrivatePoolV2Nullifier;

    this.#commitments.push(recipientCommitment, changeCommitment);
    this.#nullifiers.set(nullifier, nullifierRecord);

    return {
      changeCommitment,
      nullifier: nullifierRecord,
      recipientCommitment,
    };
  }

  async applySwapToShieldedTransition({
    inputCommitment,
    inputRoot,
    nullifierOrReplayCommitment,
    outputCommitment,
    outputLeafIndex,
    outputRoot,
    spentAtSlot = null,
  }: VantaPrivatePoolV2ApplySwapToShieldedTransitionArgs): Promise<VantaPrivatePoolV2SwapToShieldedTransitionResult> {
    if (this.#nullifiers.has(nullifierOrReplayCommitment)) {
      throw new Error(`Private-pool nullifier ${nullifierOrReplayCommitment} is already registered.`);
    }

    const inputRecord = this.#commitments.find(
      (candidate) => candidate.commitment === inputCommitment,
    );
    if (!inputRecord) {
      throw new Error(`Unknown private-pool commitment ${inputCommitment}.`);
    }

    const treeCommitments = this.#treeCommitments(inputRecord.treeId);
    const currentInputRoot = currentRoot(inputRecord.treeId, treeCommitments);
    if (currentInputRoot !== inputRoot) {
      throw new Error("Swap-to-shielded proof input root does not match verifier indexer root.");
    }

    if (treeCommitments.length !== outputLeafIndex) {
      throw new Error(
        `Swap-to-shielded output leaf index ${outputLeafIndex} does not match next verifier leaf ${treeCommitments.length}.`,
      );
    }

    const outputWithoutRoot = {
      assetId: inputRecord.assetId,
      commitment: outputCommitment,
      leafIndex: outputLeafIndex,
      treeId: inputRecord.treeId,
    };
    const outputRecord = {
      ...outputWithoutRoot,
      merkleRoot: currentRoot(inputRecord.treeId, [
        ...treeCommitments,
        { ...outputWithoutRoot, merkleRoot: "" },
      ]),
    } satisfies VantaPrivatePoolV2Commitment;

    if (outputRecord.merkleRoot !== outputRoot) {
      throw new Error("Swap-to-shielded output root does not match verifier indexer root.");
    }

    const nullifierRecord = {
      nullifier: nullifierOrReplayCommitment,
      spentAtSlot,
    } satisfies VantaPrivatePoolV2Nullifier;

    this.#commitments.push(outputRecord);
    this.#nullifiers.set(nullifierOrReplayCommitment, nullifierRecord);

    return {
      nullifier: nullifierRecord,
      outputCommitment: outputRecord,
    };
  }

  async applyActualPrivateSpendTransition({
    acceptedRoot,
    assetCohort,
    nullifier,
    outputCommitments,
    poolId,
    spentAtSlot = null,
  }: VantaPrivatePoolV2ApplyActualPrivateSpendTransitionArgs): Promise<VantaPrivatePoolV2ActualPrivateSpendTransitionResult> {
    if (this.#nullifiers.has(nullifier)) {
      throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
    }

    const normalizedOutputs = outputCommitments.map((commitment) => commitment.trim());
    if (
      normalizedOutputs.length !== 2 ||
      normalizedOutputs.some((commitment) => commitment.length === 0)
    ) {
      throw new Error("Actual private spend transition requires exactly two output commitments.");
    }

    if (new Set(normalizedOutputs).size !== normalizedOutputs.length) {
      throw new Error("Actual private spend transition output commitments must be unique.");
    }

    const treeCommitments = this.#treeCommitments(poolId);
    const currentAcceptedRoot = currentRoot(poolId, treeCommitments);
    if (currentAcceptedRoot !== acceptedRoot) {
      throw new Error("Actual private spend accepted root does not match verifier indexer root.");
    }

    const outputRecords: VantaPrivatePoolV2Commitment[] = [];
    let nextTree = [...treeCommitments];

    for (const [offset, commitment] of normalizedOutputs.entries()) {
      const recordWithoutRoot = {
        assetId: assetCohort,
        commitment,
        leafIndex: treeCommitments.length + offset,
        treeId: poolId,
      };
      const record = {
        ...recordWithoutRoot,
        merkleRoot: currentRoot(poolId, [
          ...nextTree,
          { ...recordWithoutRoot, merkleRoot: "" },
        ]),
      } satisfies VantaPrivatePoolV2Commitment;

      outputRecords.push(record);
      nextTree = [...nextTree, record];
    }

    const nullifierRecord = {
      nullifier,
      spentAtSlot,
    } satisfies VantaPrivatePoolV2Nullifier;

    this.#commitments.push(...outputRecords);
    this.#nullifiers.set(nullifier, nullifierRecord);

    return {
      nullifier: nullifierRecord,
      outputCommitments: outputRecords,
    };
  }

  async applyPrivateUnshieldExitTransition({
    inputCommitment,
    inputRoot,
    nullifierOrReplayCommitment,
    spentAtSlot = null,
  }: VantaPrivatePoolV2ApplyPrivateUnshieldExitTransitionArgs): Promise<VantaPrivatePoolV2PrivateUnshieldExitTransitionResult> {
    if (this.#nullifiers.has(nullifierOrReplayCommitment)) {
      throw new Error(`Private-pool nullifier ${nullifierOrReplayCommitment} is already registered.`);
    }

    const inputRecord = this.#commitments.find(
      (candidate) => candidate.commitment === inputCommitment,
    );
    if (!inputRecord) {
      throw new Error(`Unknown private-pool commitment ${inputCommitment}.`);
    }

    const currentInputRoot = currentRoot(
      inputRecord.treeId,
      this.#treeCommitments(inputRecord.treeId),
    );
    if (currentInputRoot !== inputRoot) {
      throw new Error("Private unshield proof input root does not match verifier indexer root.");
    }

    const nullifierRecord = {
      nullifier: nullifierOrReplayCommitment,
      spentAtSlot,
    } satisfies VantaPrivatePoolV2Nullifier;

    this.#nullifiers.set(nullifierOrReplayCommitment, nullifierRecord);

    return {
      nullifier: nullifierRecord,
    };
  }

  #treeCommitments(treeId: string) {
    return this.#commitments
      .filter((record) => record.treeId === treeId)
      .sort((left, right) => left.leafIndex - right.leafIndex);
  }
}

export function createVantaPrivatePoolV2LocalIndexer(args?: {
  commitments?: readonly VantaPrivatePoolV2Commitment[];
  nullifiers?: readonly VantaPrivatePoolV2Nullifier[];
}) {
  return new VantaPrivatePoolV2LocalIndexer(args);
}
