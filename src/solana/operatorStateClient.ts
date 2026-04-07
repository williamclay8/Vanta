import { liveSwapPair } from "@/solana/shieldConfig";

type SolUnshieldStateResponse = {
  consumedNoteIds: string[];
};

export async function fetchLocallyReleasedSolNoteIds(): Promise<Set<string>> {
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

  const parsed = (await response.json()) as Partial<SolUnshieldStateResponse>;

  if (!Array.isArray(parsed.consumedNoteIds)) {
    throw new Error("The local SOL unshield state payload was invalid.");
  }

  return new Set(
    parsed.consumedNoteIds.filter((noteId): noteId is string => typeof noteId === "string"),
  );
}
