import { poseidon2 } from 'poseidon-lite';

// Simple Poseidon call cache to reduce repeated hashing during witness generation

const cache = new Map<string, string>();

function makeKey(fn: string, inputs: (string | bigint)[]): string {
  return fn + ':' + inputs.map(x => x.toString()).join(',');
}

export function cachedPoseidon2(a: bigint, b: bigint): bigint {
  const key = makeKey('poseidon2', [a, b]);
  if (cache.has(key)) {
    return BigInt(cache.get(key)!);
  }
  const result = poseidon2([a, b]);
  cache.set(key, result.toString());
  return result;
}

// Clear cache between proofs
export function clearPoseidonCache() {
  cache.clear();
}