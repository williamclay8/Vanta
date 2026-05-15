import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

/**
 * @deprecated (Phase 2 migration-only) — Legacy parallel WSOL-based tracking for native SOL.
 * New native SOL shields (and migrated legacy) use v2 path: NATIVE_SOL_ASSET_ID_SENTINEL + /v1/ingest-native-sol-shield-deposit into Private Pool v2 unified tree.
 * One-time migration helper (migrateLegacyVantaShieldedSolNoteToV2 in vantaShieldState) + UI in ShieldPage computes sentinel commitment from legacy VantaShieldedSolNote and submits.
 * After successful migration + removeLegacy..., note is removed from this quarantine store; v2 indexer state becomes canonical.
 * Legacy notes remain usable via old sol-unshield path (fail-closed) until user completes migration or re-shields.
 * Quarantine policy modeled on getVantaLegacyV1MemoQuarantinePolicy.
 *
 * See authoritative design document: /Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md Phase 2 handoff, §9 success criteria ("Legacy native SOL tracking code is either removed or clearly marked as migration-only"), §11.
 * Also: status note checklist "Recommended Next Actions" item 3, VANTA_ZK_REVIEW.md, unshieldTrustContract.ts nativeSol boundary.
 */
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
    lifecycleStatus: "pending",
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

// Phase 2: Legacy WSOL note quarantine + migration support (one-time, fail-closed).
// Mirrors the R12 legacy v1 memo quarantine pattern (getVantaLegacyV1MemoQuarantinePolicy + check script).
// After migrateLegacyVantaShieldedSolNoteToV2 succeeds, call remove to quarantine the legacy record out of local balance tracking.
// New v2 path (sentinel + indexer) takes over for PositionSummary / NoteStatePanel / ShieldPage canonical balances.

export const VANTA_LEGACY_NATIVE_SOL_WSOL_MIGRATION_POLICY_VERSION =
  "vanta-legacy-native-sol-wsol-to-sentinel-v2-0.1";

export function getVantaLegacyNativeSolWsolMigrationPolicy() {
  return {
    version: VANTA_LEGACY_NATIVE_SOL_WSOL_MIGRATION_POLICY_VERSION,
    status: "legacy-wsol-notes-quarantined-one-time-migration-to-v2-sentinel-available",
    appliesTo: ["verifiedNativeSolShieldNotes.v1", "recoveredNativeSolShieldNotes.v1"],
    migrationHelper: "migrateLegacyVantaShieldedSolNoteToV2 (vantaShieldState.ts)",
    ingestionEndpoint: "POST /v1/ingest-native-sol-shield-deposit (sentinel commitment + original depositSignature)",
    legacyUnshieldPathStillSupported: true,
    productionPrivacyClaimsEligible: false,
    privacyClaimsExcluded: true,
    v2PathRequiredForNewNotes: true,
    quarantineBoundary:
      "Legacy VantaShieldedSolNote (WSOL mint parallel path) quarantined to localStorage only. One-time migration to sentinel assetId + unified v2 tree per design doc Phase 2. No new WSOL commitments created in v2 tree. See design document 2026-05-14-native-sol-private-pool-v2-integration.md Phase 2 + §9 success criteria. Legacy remains for unshield fallback until migrated or re-shielded.",
  } as const;
}

export function removeLegacyNativeSolShieldNoteAfterMigration(args: {
  depositSignature: string;
  owner: string;
  vaultOwner: string;
}): boolean {
  if (!canUseLocalStorage()) {
    return false;
  }

  const existing = readStoredNotes();
  const filtered = existing.filter(
    (note) =>
      !(
        note.depositSignature === args.depositSignature &&
        note.owner === args.owner &&
        note.vaultOwner === args.vaultOwner
      ),
  );

  if (filtered.length === existing.length) {
    return false; // not found
  }

  writeStoredNotes(filtered);
  notifyVerifiedNativeSolShieldNotesChanged({
    depositSignature: args.depositSignature,
    owner: args.owner,
    vaultOwner: args.vaultOwner,
  } as any); // re-use event for UI refresh (detail includes migrated flag in practice)

  // Also notify with migrated marker
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent(VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT, {
        detail: {
          depositSignature: args.depositSignature,
          owner: args.owner,
          vaultOwner: args.vaultOwner,
          migratedToV2Sentinel: true,
        },
      }),
    );
  }

  return true;
}

export function loadNonMigratedLegacyNativeSolShieldNotes(args: {
  owner: string | null | undefined;
  vaultOwner: string | null | undefined;
}) {
  // Post-migration removal achieves the quarantine; this is alias for clarity in hooks/UI.
  return loadVerifiedNativeSolShieldNotes(args);
}
