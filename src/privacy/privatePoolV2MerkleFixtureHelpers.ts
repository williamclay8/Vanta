import { poseidon1, poseidon2 } from "poseidon-lite";

export const VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH = 20 as const;

export type VantaPrivatePoolV2SparseMerkleLeaf = {
  leafIndex: bigint;
  leafValue: bigint;
};

export function directionBitsForLeafIndex(
  leafIndex: bigint,
  depth = VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
) {
  return Array.from(
    { length: depth },
    (_, bitIndex) => (leafIndex >> BigInt(bitIndex)) & 1n,
  );
}

export function emptyMerklePathForLeafIndex(
  leafIndex: bigint,
  depth = VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
) {
  assertValidLeafIndex(leafIndex, depth);

  return Array.from({ length: depth }, (_, pathDepth) => emptyNodeAtDepth(pathDepth));
}

export function buildVantaPrivatePoolV2SparseMerkleTree({
  depth = VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
  leaves,
}: {
  depth?: number;
  leaves: readonly VantaPrivatePoolV2SparseMerkleLeaf[];
}) {
  const leafLayer = new Map<number, bigint>();

  for (const { leafIndex, leafValue } of leaves) {
    assertValidLeafIndex(leafIndex, depth);

    if (leafValue !== 0n) {
      leafLayer.set(Number(leafIndex), poseidon1([leafValue]));
    }
  }

  const layers: Map<number, bigint>[] = [leafLayer];

  for (let pathDepth = 0; pathDepth < depth; pathDepth += 1) {
    const currentLayer = layers[pathDepth] ?? new Map<number, bigint>();
    const nextLayer = new Map<number, bigint>();
    const parentIndices = new Set<number>();

    for (const index of currentLayer.keys()) {
      parentIndices.add(Math.floor(index / 2));
    }

    for (const parentIndex of parentIndices) {
      const left = currentLayer.get(parentIndex * 2) ?? emptyNodeAtDepth(pathDepth);
      const right =
        currentLayer.get(parentIndex * 2 + 1) ?? emptyNodeAtDepth(pathDepth);
      const parent = poseidon2([left, right]);

      if (parent !== emptyNodeAtDepth(pathDepth + 1)) {
        nextLayer.set(parentIndex, parent);
      }
    }

    layers.push(nextLayer);
  }

  return {
    pathForLeaf(leafIndex: bigint) {
      assertValidLeafIndex(leafIndex, depth);

      const path: bigint[] = [];
      let currentIndex = Number(leafIndex);

      for (let pathDepth = 0; pathDepth < depth; pathDepth += 1) {
        const layer = layers[pathDepth] ?? new Map<number, bigint>();
        const siblingIndex =
          currentIndex % 2 === 1 ? currentIndex - 1 : currentIndex + 1;

        path.push(layer.get(siblingIndex) ?? emptyNodeAtDepth(pathDepth));
        currentIndex = Math.floor(currentIndex / 2);
      }

      return path;
    },
    root: layers[depth]?.get(0) ?? emptyNodeAtDepth(depth),
  };
}

const emptyNodeCache = new Map<number, bigint>();

function emptyNodeAtDepth(depth: number): bigint {
  const cached = emptyNodeCache.get(depth);

  if (cached !== undefined) {
    return cached;
  }

  const value =
    depth === 0
      ? poseidon1([0n])
      : poseidon2([emptyNodeAtDepth(depth - 1), emptyNodeAtDepth(depth - 1)]);

  emptyNodeCache.set(depth, value);

  return value;
}

function assertValidLeafIndex(leafIndex: bigint, depth: number) {
  if (leafIndex < 0n || leafIndex >= (1n << BigInt(depth))) {
    throw new Error(
      `Expected Merkle leaf index within depth ${depth}, received ${leafIndex.toString(10)}.`,
    );
  }
}
