import { liveSwapPair } from "@/solana/shieldConfig";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

type SolUnshieldStateResponse = {
  consumedNoteReferenceHashes: string[];
};

type UnshieldStateResponse = {
  consumedNoteReferenceHashes: string[];
};

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
  const stateUrl = new URL(
    "../../state/sol-unshield-records",
    `${liveSwapPair.solUnshieldOperatorUrl}/`,
  ).toString();
  const response = await fetch(stateUrl, {
    method: "GET",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error("The local SOL unshield state could not be loaded.");
  }

  return parseConsumedNoteReferenceHashes(
    (await response.json()) as Partial<SolUnshieldStateResponse>,
    "local SOL",
  );
}
