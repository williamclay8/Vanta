/**
 * Shield decoy batcher.
 *
 * Privacy goal: when a user clicks "Shield", the network sequence
 * (deposit → state memo → settlement request) is deterministic in time.
 * An on-the-wire observer can correlate the real shield trivially because
 * (a) the timing fingerprint is unique, and (b) the operator's anonymity set
 * is currently reported as "blocked" — i.e. the protocol-side decoy padding
 * is not active.
 *
 * `runShieldWithDecoys` mitigates that by:
 *   1. Burying the start time of the real request in a small uniform jitter
 *      window (so the start is not pinned to the user's click timestamp).
 *   2. Concurrently firing N decoy POSTs to `/private-pool-v2/decoy-commitments`
 *      whose request fingerprint (URL, method, content-type, body shape) is
 *      indistinguishable from a real Private-Pool-v2 commitment write, so a
 *      passive observer cannot filter the real one out by shape.
 *   3. Awaiting all of them together so the real request's wall-clock is
 *      buried in the flock.
 *
 * This module is intentionally browser-only (uses global `crypto` and
 * `fetch`). It has no Node-only imports so it can be reused by the React
 * Shield page.
 */

const HEX_ALPHABET = "0123456789abcdef";

/**
 * Inclusive uniform integer in [minInclusive, maxInclusive] using
 * `crypto.getRandomValues` (rejection-sampled to avoid modulo bias).
 */
export function uniformRandomInt(minInclusive: number, maxInclusive: number): number {
  if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
    throw new TypeError("uniformRandomInt requires integer bounds.");
  }
  if (maxInclusive < minInclusive) {
    throw new RangeError("uniformRandomInt requires maxInclusive >= minInclusive.");
  }
  const range = maxInclusive - minInclusive + 1;
  if (range === 1) {
    return minInclusive;
  }
  // 32-bit rejection sampling: discard values that fall in the partial
  // bucket so the remaining samples are uniformly distributed mod `range`.
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    const sample = buf[0];
    if (sample < limit) {
      return minInclusive + (sample % range);
    }
  }
}

/**
 * Returns a 0x-prefixed lowercase 32-byte hex string. By construction this is
 * indistinguishable from a real Private-Pool-v2 commitment so an on-the-wire
 * observer (or a malicious operator inspecting payload shape) cannot filter
 * decoy commitments out from the real ones.
 */
export function generateDecoyCommitment(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "0x";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    out += HEX_ALPHABET[(byte >>> 4) & 0xf];
    out += HEX_ALPHABET[byte & 0xf];
  }
  return out;
}

export type ShieldDecoyOptions = {
  baseUrl?: string | null;
  decoyCount?: number;
  jitterMinMs?: number;
  jitterMaxMs?: number;
  authToken?: string | null;
};

const DEFAULT_JITTER_MIN_MS = 250;
const DEFAULT_JITTER_MAX_MS = 1500;
const DEFAULT_DECOY_COUNT_MIN = 2;
const DEFAULT_DECOY_COUNT_MAX = 6;
const DECOY_PATH = "/private-pool-v2/decoy-commitments";

function buildDecoyUrl(baseUrl: string | null | undefined): string {
  if (baseUrl === null || baseUrl === undefined || baseUrl === "") {
    return DECOY_PATH;
  }
  // Trim a single trailing slash so we don't produce a double slash.
  const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}${DECOY_PATH}`;
}

function buildDecoyHeaders(authToken: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken !== null && authToken !== undefined && authToken !== "") {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function fireDecoy(url: string, headers: Record<string, string>): Promise<unknown> {
  // A network error from a decoy must NEVER surface — the real request's
  // outcome is the only one the caller cares about. We deliberately swallow
  // both rejections and any thrown synchronous error from `fetch`.
  let pending: Promise<unknown>;
  try {
    pending = fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ commitment: generateDecoyCommitment() }),
    }) as Promise<unknown>;
  } catch {
    return Promise.resolve(undefined);
  }
  return Promise.resolve(pending).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Runs the real Shield-related request inside a flock of decoy commitment
 * writes so that timing and request-shape fingerprints don't single out the
 * real one. Returns the real request's resolved value (or rethrows its
 * rejection). Decoy errors are swallowed.
 */
export async function runShieldWithDecoys<T>(
  realRequest: () => Promise<T>,
  options?: ShieldDecoyOptions,
): Promise<T> {
  const jitterMinMs = options?.jitterMinMs ?? DEFAULT_JITTER_MIN_MS;
  const jitterMaxMs = options?.jitterMaxMs ?? DEFAULT_JITTER_MAX_MS;
  if (jitterMaxMs < jitterMinMs) {
    throw new RangeError("jitterMaxMs must be >= jitterMinMs.");
  }
  const decoyCount =
    options?.decoyCount ?? uniformRandomInt(DEFAULT_DECOY_COUNT_MIN, DEFAULT_DECOY_COUNT_MAX);
  if (!Number.isInteger(decoyCount) || decoyCount < 0) {
    throw new RangeError("decoyCount must be a non-negative integer.");
  }

  const jitterMs = uniformRandomInt(Math.max(0, jitterMinMs), Math.max(0, jitterMaxMs));
  await delay(jitterMs);

  const url = buildDecoyUrl(options?.baseUrl ?? null);
  const headers = buildDecoyHeaders(options?.authToken ?? null);

  // Kick off the real request synchronously so it races with the decoys
  // rather than queueing strictly after them. We also wrap any synchronous
  // throw from `realRequest` into a rejected promise so `Promise.allSettled`
  // can still observe both groups before we re-raise.
  let realPromise: Promise<T>;
  try {
    realPromise = realRequest();
  } catch (error) {
    realPromise = Promise.reject(error);
  }

  const decoyPromises: Promise<unknown>[] = [];
  for (let i = 0; i < decoyCount; i += 1) {
    decoyPromises.push(fireDecoy(url, headers));
  }

  await Promise.allSettled([realPromise, ...decoyPromises]);

  // `await realPromise` here re-raises the original rejection (if any) so
  // callers see the genuine failure mode. Decoy outcomes are intentionally
  // discarded above.
  return realPromise;
}
