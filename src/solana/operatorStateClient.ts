import { liveSwapPair } from "@/solana/shieldConfig";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

type SolUnshieldStateResponse = {
  consumedNoteReferenceHashes: string[];
};

type UnshieldStateResponse = {
  consumedNoteReferenceHashes: string[];
};

export const LOCALLY_RELEASED_SOL_NOTE_REFERENCE_HASHES_STORAGE_KEY =
  "vanta.locallyReleasedSolNoteReferenceHashes.v1";
export const LOCALLY_RELEASED_SOL_NOTE_REFERENCE_HASHES_CHANGED_EVENT =
  "vanta:locally-released-sol-note-reference-hashes-changed";

const VANTA_UNSHIELD_CONSUMED_NOTE_REFERENCE_HASH_DOMAIN =
  "vanta-unshield-consumed-note-reference-v1";

export function createUnshieldConsumedNoteReferenceHash(noteId: string) {
  return `sha256:${bytesToHex(
    sha256(
      new TextEncoder().encode(
        `${VANTA_UNSHIELD_CONSUMED_NOTE_REFERENCE_HASH_DOMAIN}:${noteId}`,
      ),
    ),
  )}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalReleasedSolNoteReferenceHashes() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LOCALLY_RELEASED_SOL_NOTE_REFERENCE_HASHES_STORAGE_KEY) ??
        "[]",
    );

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => {
          return typeof value === "string" && value.startsWith("sha256:");
        })
      : [];
  } catch {
    return [];
  }
}

function writeLocalReleasedSolNoteReferenceHashes(referenceHashes: readonly string[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    LOCALLY_RELEASED_SOL_NOTE_REFERENCE_HASHES_STORAGE_KEY,
    JSON.stringify([...new Set(referenceHashes)]),
  );
}

function notifyLocallyReleasedSolNoteReferenceHashesChanged(referenceHash: string) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(LOCALLY_RELEASED_SOL_NOTE_REFERENCE_HASHES_CHANGED_EVENT, {
      detail: { referenceHash },
    }),
  );
}

export function loadLocallyReleasedSolNoteReferenceHashes() {
  return new Set(readLocalReleasedSolNoteReferenceHashes());
}

export function recordLocallyReleasedSolNoteReferenceHash(consumedNoteId: string) {
  if (!consumedNoteId) {
    return null;
  }

  const referenceHash = createUnshieldConsumedNoteReferenceHash(consumedNoteId);
  const localReferenceHashes = loadLocallyReleasedSolNoteReferenceHashes();

  if (!localReferenceHashes.has(referenceHash)) {
    writeLocalReleasedSolNoteReferenceHashes([...localReferenceHashes, referenceHash]);
  }

  notifyLocallyReleasedSolNoteReferenceHashesChanged(referenceHash);
  return referenceHash;
}

function parseConsumedNoteReferenceHashes(
  parsed: Partial<SolUnshieldStateResponse | UnshieldStateResponse>,
  label: string,
) {
  if (!Array.isArray(parsed.consumedNoteReferenceHashes)) {
    throw new Error(`The ${label} unshield state payload was invalid.`);
  }

  return new Set(
    parsed.consumedNoteReferenceHashes.filter(
      (noteId): noteId is string => typeof noteId === "string",
    ),
  );
}

export async function fetchLocallyReleasedUnshieldNoteReferenceHashes(
  operatorUrl: string,
): Promise<Set<string>> {
  const stateUrl = new URL(
    "../state/unshield-records",
    `${operatorUrl.replace(/\/+$/u, "")}/`,
  ).toString();
  const response = await fetch(stateUrl, {
    method: "GET",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error("The token unshield release state could not be loaded.");
  }

  return parseConsumedNoteReferenceHashes(
    (await response.json()) as Partial<UnshieldStateResponse>,
    "token",
  );
}

export async function fetchLocallyReleasedSolNoteReferenceHashes(): Promise<Set<string>> {
  const localReferenceHashes = loadLocallyReleasedSolNoteReferenceHashes();
  const stateUrl = new URL(
    "../../state/sol-unshield-records",
    `${liveSwapPair.solUnshieldOperatorUrl}/`,
  ).toString();

  try {
    const response = await fetch(stateUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error("The local SOL unshield state could not be loaded.");
    }

    const remoteReferenceHashes = parseConsumedNoteReferenceHashes(
      (await response.json()) as Partial<SolUnshieldStateResponse>,
      "local SOL",
    );

    return new Set([...localReferenceHashes, ...remoteReferenceHashes]);
  } catch (error) {
    if (localReferenceHashes.size > 0) {
      return localReferenceHashes;
    }

    throw error;
  }
}
