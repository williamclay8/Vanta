import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

export type SpendableTokenNote = {
  amount: number;
  createdAt: number;
  noteId: string;
  stateSignature: string;
};

export function parseDecimalAmountToBaseUnits(amountDisplay: string, decimals: number) {
  const normalized = amountDisplay.trim();

  if (!/^\d+(\.\d+)?$/u.test(normalized)) {
    throw new Error("Vanta Umbra unshield approval requires a decimal amount.");
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const wholeBaseUnits = BigInt(wholePart || "0") * 10n ** BigInt(decimals);
  const fractionalBaseUnits = BigInt(fractionalPart.padEnd(decimals, "0").slice(0, decimals) || "0");

  return wholeBaseUnits + fractionalBaseUnits;
}

export function parseEditableAmount(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function amountsRoughlyMatch(left: number, right: number) {
  return Math.abs(left - right) <= 0.000001;
}

function chooseBestSpendableNote<T extends { amount: number; createdAt: number }>(
  notes: readonly T[],
) {
  return [...notes].sort((left, right) => {
    if (right.amount !== left.amount) {
      return right.amount - left.amount;
    }

    return right.createdAt - left.createdAt;
  })[0] ?? null;
}

export function chooseSelectedSpendableNote<
  T extends { amount: number; createdAt: number; noteId: string },
>(notes: readonly T[], selectedNoteId: string | null) {
  if (selectedNoteId) {
    const selectedNote = notes.find((note) => note.noteId === selectedNoteId);

    if (selectedNote) {
      return selectedNote;
    }
  }

  return chooseBestSpendableNote(notes);
}

export function isCanonicalTokenSpendableNote(note: { noteId: string; stateSignature: string }) {
  return !(
    note.noteId.startsWith("vnta_recent_") ||
    note.stateSignature.startsWith("local-token-deposit:")
  );
}

export function assertCanonicalTokenSpendableNote(note: { noteId: string; stateSignature: string }) {
  if (!isCanonicalTokenSpendableNote(note)) {
    throw new Error("Vanta is still syncing this shielded token note; it is not spendable yet.");
  }
}

export function isCanonicalSolSpendableNote(note: VantaShieldedSolNote) {
  return (
    note.lifecycleStatus !== "spendable" ||
    note.noteId.startsWith("vnta_native_sol_recent_") ||
    note.stateSignature.startsWith("local-sol-recovery:") ||
    note.stateSignature.startsWith("local-sol-shield-state:") ||
    note.sourceSwapNoteId === "native-sol-shield-state"
  )
    ? false
    : true;
}

export function isVisibleSolShieldStateNote(note: VantaShieldedSolNote) {
  return note.lifecycleStatus !== "consumed";
}

export function isPendingLocalSolShieldStateNote(note: VantaShieldedSolNote) {
  return (
    note.lifecycleStatus === "pending" &&
    (note.stateSignature.startsWith("local-sol-recovery:") ||
      note.stateSignature.startsWith("local-sol-shield-state:") ||
      note.sourceSwapNoteId === "native-sol-recovery" ||
      note.sourceSwapNoteId === "native-sol-shield-state")
  );
}

export function assertCanonicalSolSpendableNote(note: VantaShieldedSolNote) {
  if (!isCanonicalSolSpendableNote(note)) {
    throw new Error("Vanta is still syncing this shielded SOL note; it is not spendable yet.");
  }
}

export function sumSpendableAmounts(notes: readonly { amount: number }[], decimals: number) {
  return Number(notes.reduce((sum, note) => sum + note.amount, 0).toFixed(decimals));
}
