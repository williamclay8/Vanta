import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

export const VERIFIED_NATIVE_SOL_SHIELD_NOTES_STORAGE_KEY =
  "vanta.verifiedNativeSolShieldNotes.v1";
export const VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT =
  "vanta:verified-native-sol-shield-notes-changed";

type StoredVerifiedNativeSolShieldNote = {
  amount: number;
  createdAt: number;
  depositSignature: string;
  owner: string;
  stateSignature: string;
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
    const parsed = JSON.parse(
      window.localStorage.getItem(VERIFIED_NATIVE_SOL_SHIELD_NOTES_STORAGE_KEY) ?? "[]",
    );

    return Array.isArray(parsed)
      ? parsed.filter((note): note is StoredVerifiedNativeSolShieldNote => {
          return (
            typeof note.amount === "number" &&
            Number.isFinite(note.amount) &&
            note.amount > 0 &&
            typeof note.createdAt === "number" &&
            typeof note.depositSignature === "string" &&
            typeof note.owner === "string" &&
            typeof note.stateSignature === "string" &&
            typeof note.vaultOwner === "string"
          );
        })
      : [];
  } catch {
    return [];
  }
}

function writeStoredNotes(notes: readonly StoredVerifiedNativeSolShieldNote[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    VERIFIED_NATIVE_SOL_SHIELD_NOTES_STORAGE_KEY,
    JSON.stringify(notes),
  );
}

function notifyVerifiedNativeSolShieldNotesChanged(note: StoredVerifiedNativeSolShieldNote) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT, {
      detail: {
        depositSignature: note.depositSignature,
        owner: note.owner,
        vaultOwner: note.vaultOwner,
      },
    }),
  );
}

function createVerifiedNativeSolShieldNoteId(note: {
  depositSignature: string;
  owner: string;
  vaultOwner: string;
}) {
  return `vnta_native_sol_receipt_${note.owner}_${note.vaultOwner}_${note.depositSignature}`;
}

function toShieldedSolNote(note: StoredVerifiedNativeSolShieldNote): VantaShieldedSolNote {
  return {
    amount: note.amount,
    asset: "SOL",
    createdAt: note.createdAt,
    depositSignature: note.depositSignature,
    lifecycleStatus: "spendable",
    noteId: createVerifiedNativeSolShieldNoteId(note),
    owner: note.owner,
    sourceSwapNoteId: "native-sol-shield-state",
    stateSignature: `local-sol-shield-state:${note.stateSignature}`,
    vaultOwner: note.vaultOwner,
  };
}

export function recordVerifiedNativeSolShieldNote(args: {
  amount: number;
  createdAt: number;
  depositSignature: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
}) {
  const nextNote = {
    amount: args.amount,
    createdAt: args.createdAt,
    depositSignature: args.depositSignature,
    owner: args.owner,
    stateSignature: args.stateSignature,
    vaultOwner: args.vaultOwner,
  } satisfies StoredVerifiedNativeSolShieldNote;
  const existingNotes = readStoredNotes().filter(
    (note) =>
      !(
        note.depositSignature === nextNote.depositSignature &&
        note.owner === nextNote.owner &&
        note.vaultOwner === nextNote.vaultOwner
      ),
  );

  writeStoredNotes([...existingNotes, nextNote]);
  notifyVerifiedNativeSolShieldNotesChanged(nextNote);
  return toShieldedSolNote(nextNote);
}

export function loadVerifiedNativeSolShieldNotes(args: {
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

export function hasVerifiedNativeSolShieldNote(args: {
  depositSignature: string | null | undefined;
  owner: string | null | undefined;
  vaultOwner: string | null | undefined;
}) {
  if (!args.depositSignature || !args.owner || !args.vaultOwner) {
    return false;
  }

  return readStoredNotes().some(
    (note) =>
      note.depositSignature === args.depositSignature &&
      note.owner === args.owner &&
      note.vaultOwner === args.vaultOwner,
  );
}

export function loadVerifiedNativeSolShieldDepositSignatures(args: {
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
