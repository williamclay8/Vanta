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
