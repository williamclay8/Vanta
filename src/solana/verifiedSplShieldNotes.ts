import { getLiveShieldTokenAsset, type LiveShieldTokenAssetKey } from "@/solana/shieldConfig";
import type { VantaShieldNote } from "@/solana/vantaShieldState";

export const VERIFIED_SPL_SHIELD_NOTES_STORAGE_KEY = "vanta.verifiedSplShieldNotes.v1";
export const VERIFIED_SPL_SHIELD_NOTES_CHANGED_EVENT =
  "vanta:verified-spl-shield-notes-changed";

type StoredVerifiedSplShieldNote = {
  amount: number;
  amountDisplay: string;
  asset: LiveShieldTokenAssetKey;
  createdAt: number;
  depositSignature: string;
  mintAddress: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hashString(input: string) {
  let hash = 0xcbf29ce484222325n;

  for (const char of input) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
}

function createDeterministicNoteId(parts: Record<string, string | number>) {
  const material = Object.entries(parts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `vnta_note_${hashString(material)}`;
}

function createVerifiedSplShieldNoteId(note: {
  amountDisplay: string;
  asset: LiveShieldTokenAssetKey;
  createdAt: number;
  depositSignature: string;
  mintAddress: string;
  owner: string;
  vaultOwner: string;
}) {
  return createDeterministicNoteId({
    amount: note.amountDisplay,
    asset: note.asset,
    createdAt: note.createdAt,
    depositSignature: note.depositSignature,
    kind: "shield",
    mintAddress: note.mintAddress,
    owner: note.owner,
    vaultOwner: note.vaultOwner,
  });
}

function isKnownSplShieldAsset(value: string): value is LiveShieldTokenAssetKey {
  try {
    const asset = getLiveShieldTokenAsset(value as LiveShieldTokenAssetKey);
    return asset.assetKey === value;
  } catch {
    return false;
  }
}

function isStoredVerifiedSplShieldNote(value: unknown): value is StoredVerifiedSplShieldNote {
  if (!value || typeof value !== "object") {
    return false;
  }

  const note = value as Partial<StoredVerifiedSplShieldNote>;
  return (
    typeof note.amount === "number" &&
    Number.isFinite(note.amount) &&
    note.amount > 0 &&
    typeof note.amountDisplay === "string" &&
    note.amountDisplay.trim().length > 0 &&
    typeof note.asset === "string" &&
    isKnownSplShieldAsset(note.asset) &&
    typeof note.createdAt === "number" &&
    Number.isFinite(note.createdAt) &&
    typeof note.depositSignature === "string" &&
    note.depositSignature.length > 0 &&
    typeof note.mintAddress === "string" &&
    note.mintAddress.length > 0 &&
    typeof note.owner === "string" &&
    note.owner.length > 0 &&
    typeof note.stateSignature === "string" &&
    note.stateSignature.length > 0 &&
    typeof note.vaultOwner === "string" &&
    note.vaultOwner.length > 0
  );
}

function readStoredNotes() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(VERIFIED_SPL_SHIELD_NOTES_STORAGE_KEY) ?? "[]",
    );

    return Array.isArray(parsed) ? parsed.filter(isStoredVerifiedSplShieldNote) : [];
  } catch {
    return [];
  }
}

function writeStoredNotes(notes: readonly StoredVerifiedSplShieldNote[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    VERIFIED_SPL_SHIELD_NOTES_STORAGE_KEY,
    JSON.stringify(notes.slice(-100)),
  );
}

function notifyVerifiedSplShieldNotesChanged(note: StoredVerifiedSplShieldNote) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(VERIFIED_SPL_SHIELD_NOTES_CHANGED_EVENT, {
      detail: {
        asset: note.asset,
        depositSignature: note.depositSignature,
        mintAddress: note.mintAddress,
        owner: note.owner,
        vaultOwner: note.vaultOwner,
      },
    }),
  );
}

function toShieldNote(note: StoredVerifiedSplShieldNote): VantaShieldNote {
  return {
    amount: note.amount,
    asset: note.asset,
    createdAt: note.createdAt,
    depositSignature: note.depositSignature,
    kind: "shield",
    mintAddress: note.mintAddress,
    noteId: createVerifiedSplShieldNoteId(note),
    origin: "deposit",
    owner: note.owner,
    stateSignature: note.stateSignature,
    vaultOwner: note.vaultOwner,
  };
}

export function recordVerifiedSplShieldNote(args: {
  amount: number;
  amountDisplay: string;
  asset: LiveShieldTokenAssetKey;
  createdAt: number;
  depositSignature: string;
  mintAddress: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
}) {
  const nextNote = {
    amount: args.amount,
    amountDisplay: args.amountDisplay,
    asset: args.asset,
    createdAt: args.createdAt,
    depositSignature: args.depositSignature,
    mintAddress: args.mintAddress,
    owner: args.owner,
    stateSignature: args.stateSignature,
    vaultOwner: args.vaultOwner,
  } satisfies StoredVerifiedSplShieldNote;
  const existingNotes = readStoredNotes().filter(
    (note) =>
      !(
        note.asset === nextNote.asset &&
        note.owner === nextNote.owner &&
        note.vaultOwner === nextNote.vaultOwner &&
        note.mintAddress === nextNote.mintAddress &&
        (note.depositSignature === nextNote.depositSignature ||
          note.stateSignature === nextNote.stateSignature)
      ),
  );

  writeStoredNotes([...existingNotes, nextNote]);
  notifyVerifiedSplShieldNotesChanged(nextNote);
  return toShieldNote(nextNote);
}

export function loadVerifiedSplShieldNotes(args: {
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
        note.owner === args.owner &&
        note.vaultOwner === args.vaultOwner &&
        note.mintAddress === args.mintAddress,
    )
    .map(toShieldNote);
}

export function hasVerifiedSplShieldNote(args: {
  depositSignature: string | null | undefined;
  mintAddress: string | null | undefined;
  owner: string | null | undefined;
  vaultOwner: string | null | undefined;
}) {
  if (!args.depositSignature || !args.owner || !args.vaultOwner || !args.mintAddress) {
    return false;
  }

  return readStoredNotes().some(
    (note) =>
      note.depositSignature === args.depositSignature &&
      note.owner === args.owner &&
      note.vaultOwner === args.vaultOwner &&
      note.mintAddress === args.mintAddress,
  );
}
