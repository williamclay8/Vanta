import type { LiveShieldTokenAssetKey } from "@/solana/shieldConfig";

const STORAGE_KEY = "vanta.recentShieldTokenNotes.v1";

export type PendingRecentShieldTokenNote = {
  amount: number;
  asset: LiveShieldTokenAssetKey;
  createdAt: number;
  depositSignature: string;
  mintAddress: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
};

type StoredRecentShieldTokenNote = PendingRecentShieldTokenNote;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isStoredRecentShieldTokenNote(value: unknown): value is StoredRecentShieldTokenNote {
  if (!value || typeof value !== "object") {
    return false;
  }

  const note = value as Partial<StoredRecentShieldTokenNote>;
  return (
    typeof note.amount === "number" &&
    Number.isFinite(note.amount) &&
    note.amount > 0 &&
    typeof note.asset === "string" &&
    typeof note.createdAt === "number" &&
    typeof note.depositSignature === "string" &&
    typeof note.mintAddress === "string" &&
    typeof note.owner === "string" &&
    typeof note.stateSignature === "string" &&
    typeof note.vaultOwner === "string"
  );
}

function readStoredNotes() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isStoredRecentShieldTokenNote) : [];
  } catch {
    return [];
  }
}

function writeStoredNotes(notes: readonly StoredRecentShieldTokenNote[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(-50)));
}

function createRecentShieldTokenNoteId(note: {
  asset: LiveShieldTokenAssetKey;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
}) {
  return `vnta_recent_token_${note.asset}_${note.owner}_${note.vaultOwner}_${note.stateSignature}`;
}

function toPendingRecentShieldTokenNote(
  note: StoredRecentShieldTokenNote,
): PendingRecentShieldTokenNote & { pendingNoteId: string } {
  return {
    ...note,
    pendingNoteId: createRecentShieldTokenNoteId(note),
  };
}

export function recordRecentShieldTokenNote(args: {
  amount: number;
  asset: LiveShieldTokenAssetKey;
  createdAt: number;
  depositSignature?: string | null;
  mintAddress: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
}) {
  const nextNote = {
    amount: args.amount,
    asset: args.asset,
    createdAt: args.createdAt,
    depositSignature: args.depositSignature ?? args.stateSignature,
    mintAddress: args.mintAddress,
    owner: args.owner,
    stateSignature: args.stateSignature,
    vaultOwner: args.vaultOwner,
  } satisfies StoredRecentShieldTokenNote;
  const existingNotes = readStoredNotes().filter(
    (note) =>
      !(
        note.asset === nextNote.asset &&
        note.owner === nextNote.owner &&
        note.vaultOwner === nextNote.vaultOwner &&
        (note.stateSignature === nextNote.stateSignature ||
          note.depositSignature === nextNote.depositSignature)
      ),
  );

  writeStoredNotes([...existingNotes, nextNote]);
  return toPendingRecentShieldTokenNote(nextNote);
}

export function loadRecentShieldTokenNotes(args: {
  asset: LiveShieldTokenAssetKey;
  mintAddress: string | null | undefined;
  owner: string | null | undefined;
  vaultOwner: string | null | undefined;
}) {
  if (!args.owner || !args.vaultOwner || !args.mintAddress) {
    return [];
  }

  return readStoredNotes()
    .filter(
      (note) =>
        note.asset === args.asset &&
        note.owner === args.owner &&
        note.vaultOwner === args.vaultOwner &&
        note.mintAddress === args.mintAddress,
    )
    .map(toPendingRecentShieldTokenNote);
}
