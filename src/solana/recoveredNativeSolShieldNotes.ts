import type { NativeSolShieldDepositCandidate } from "@/solana/nativeSolShield";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

const STORAGE_KEY = "vanta.recoveredNativeSolShieldNotes.v1";

type StoredRecoveredNativeSolShieldNote = {
  amount: number;
  createdAt: number;
  depositSignature: string;
  owner: string;
  vaultOwner: string;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredNotes() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");

    return Array.isArray(parsed)
      ? parsed.filter((note): note is StoredRecoveredNativeSolShieldNote => {
          return (
            typeof note.amount === "number" &&
            Number.isFinite(note.amount) &&
            note.amount > 0 &&
            typeof note.createdAt === "number" &&
            typeof note.depositSignature === "string" &&
            typeof note.owner === "string" &&
            typeof note.vaultOwner === "string"
          );
        })
      : [];
  } catch {
    return [];
  }
}

function writeStoredNotes(notes: readonly StoredRecoveredNativeSolShieldNote[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function createRecoveredNativeSolShieldNoteId(note: {
  depositSignature: string;
  owner: string;
  vaultOwner: string;
}) {
  return `vnta_native_sol_recovered_${note.owner}_${note.vaultOwner}_${note.depositSignature}`;
}

function toShieldedSolNote(note: StoredRecoveredNativeSolShieldNote): VantaShieldedSolNote {
  return {
    amount: note.amount,
    asset: "SOL",
    createdAt: note.createdAt,
    depositSignature: note.depositSignature,
    lifecycleStatus: "spendable",
    noteId: createRecoveredNativeSolShieldNoteId(note),
    owner: note.owner,
    sourceSwapNoteId: "native-sol-recovery",
    stateSignature: `local-sol-recovery:${note.depositSignature}`,
    vaultOwner: note.vaultOwner,
  };
}

export function recordRecoveredNativeSolShieldNote(args: {
  deposit: NativeSolShieldDepositCandidate;
  owner: string;
  vaultOwner: string;
}) {
  const nextNote = {
    amount: args.deposit.amount,
    createdAt: args.deposit.createdAt,
    depositSignature: args.deposit.signature,
    owner: args.owner,
    vaultOwner: args.vaultOwner,
  } satisfies StoredRecoveredNativeSolShieldNote;
  const existingNotes = readStoredNotes().filter(
    (note) =>
      !(
        note.depositSignature === nextNote.depositSignature &&
        note.owner === nextNote.owner &&
        note.vaultOwner === nextNote.vaultOwner
      ),
  );

  writeStoredNotes([...existingNotes, nextNote]);
  return toShieldedSolNote(nextNote);
}

export function loadRecoveredNativeSolShieldNotes(args: {
  owner: string | null | undefined;
  vaultOwner: string | null | undefined;
}) {
  if (!args.owner || !args.vaultOwner) {
    return [];
  }

  return readStoredNotes()
    .filter((note) => note.owner === args.owner && note.vaultOwner === args.vaultOwner)
    .map(toShieldedSolNote);
}

export function loadRecoveredNativeSolShieldDepositSignatures(args: {
  owner: string | null | undefined;
  vaultOwner: string | null | undefined;
}) {
  if (!args.owner || !args.vaultOwner) {
    return new Set<string>();
  }

  return new Set(
    readStoredNotes()
      .filter((note) => note.owner === args.owner && note.vaultOwner === args.vaultOwner)
      .map((note) => note.depositSignature),
  );
}
