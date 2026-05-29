import { useCallback, useEffect, useState } from "react";
import { migrateLegacyVantaShieldedSolNoteToV2 } from "@/solana/vantaShieldState";
import {
  getVantaLegacyNativeSolWsolMigrationPolicy,
  loadNonMigratedLegacyNativeSolShieldNotes,
  removeLegacyNativeSolShieldNoteAfterMigration,
} from "@/solana/verifiedNativeSolShieldNotes";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

type LegacyMigrationStatus = "idle" | "migrating" | "success" | "error";

type RefreshNativeSolShieldState = (args: {
  signatureHint?: string | null;
  vaultOwner: string | null;
}) => Promise<void>;

type UseShieldLegacyMigrationArgs = {
  refreshNativeSolShieldState: RefreshNativeSolShieldState;
  vaultOwner: string | null | undefined;
  walletAddress: string | null | undefined;
  walletConnected: boolean;
};

export function useShieldLegacyMigration({
  refreshNativeSolShieldState,
  vaultOwner,
  walletAddress,
  walletConnected,
}: UseShieldLegacyMigrationArgs) {
  const [legacySolNotes, setLegacySolNotes] = useState<VantaShieldedSolNote[]>([]);
  const [legacyMigrationStatus, setLegacyMigrationStatus] = useState<
    Record<string, LegacyMigrationStatus>
  >({});
  const [legacyMigrationError, setLegacyMigrationError] = useState<string | null>(null);
  const [showLegacyMigrationPanel, setShowLegacyMigrationPanel] = useState(true);
  const [isMigratingAll, setIsMigratingAll] = useState(false);

  const loadLegacyNativeSolNotesForMigration = useCallback(() => {
    if (!walletAddress || !vaultOwner) {
      setLegacySolNotes([]);
      return;
    }

    const notes = loadNonMigratedLegacyNativeSolShieldNotes({
      owner: walletAddress,
      vaultOwner,
    });
    setLegacySolNotes(notes);
  }, [vaultOwner, walletAddress]);

  useEffect(() => {
    loadLegacyNativeSolNotesForMigration();
  }, [loadLegacyNativeSolNotesForMigration]);

  const handleMigrateLegacySolNote = useCallback(
    async (note: VantaShieldedSolNote) => {
      const noteKey = note.depositSignature || note.noteId;
      setLegacyMigrationStatus((prev) => ({ ...prev, [noteKey]: "migrating" }));
      setLegacyMigrationError(null);

      const policy = getVantaLegacyNativeSolWsolMigrationPolicy();
      console.info("[Phase 2 Migration] Starting legacy WSOL SOL note migration", {
        noteId: note.noteId,
        depositSignature: note.depositSignature,
        policyVersion: policy.version,
        designDoc: "2026-05-14-native-sol-private-pool-v2-integration.md Phase 2 + §9",
      });

      let result = await migrateLegacyVantaShieldedSolNoteToV2({
        legacyNote: note,
      });

      if (!result.success && result.isTransientNetworkError) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        result = await migrateLegacyVantaShieldedSolNoteToV2({ legacyNote: note });
      }

      if (result.success) {
        removeLegacyNativeSolShieldNoteAfterMigration({
          depositSignature: note.depositSignature || "",
          owner: note.owner,
          vaultOwner: note.vaultOwner,
        });
        setLegacyMigrationStatus((prev) => ({ ...prev, [noteKey]: "success" }));
        loadLegacyNativeSolNotesForMigration();
        void refreshNativeSolShieldState({
          signatureHint: note.depositSignature,
          vaultOwner: note.vaultOwner,
        }).catch(() => undefined);

        if (result.phase1MigrationNote) {
          console.info("Server migration note:", result.phase1MigrationNote);
        }

        setTimeout(() => {
          setLegacySolNotes((notes) => {
            if (notes.length <= 1) {
              setShowLegacyMigrationPanel(false);
            }
            return notes;
          });
        }, 1500);
      } else {
        setLegacyMigrationStatus((prev) => ({ ...prev, [noteKey]: "error" }));
        const isTransient = result.isTransientNetworkError;
        const errMsg =
          result.error ||
          "Migration failed (see console). Re-shield recommended as fallback per design doc.";
        setLegacyMigrationError(errMsg);

        if (isTransient) {
          console.warn(
            "[Phase 2 Migration] Transient indexer network error (will keep offering retry + re-shield)",
            result,
          );
        } else {
          console.warn("[Phase 2 Migration] Failed (fail-closed, legacy note preserved)", result);
        }
      }
    },
    [loadLegacyNativeSolNotesForMigration, refreshNativeSolShieldState],
  );

  const handleMigrateAllLegacyNotes = useCallback(async () => {
    if (!walletConnected || legacySolNotes.length === 0 || isMigratingAll) {
      return;
    }

    setIsMigratingAll(true);
    setLegacyMigrationError(null);

    const pendingNotes = legacySolNotes.filter((note) => {
      const key = note.depositSignature || note.noteId;
      const status = legacyMigrationStatus[key];
      return status !== "success" && status !== "migrating";
    });

    for (let index = 0; index < pendingNotes.length; index += 1) {
      const note = pendingNotes[index];
      try {
        await handleMigrateLegacySolNote(note);
        if (index < pendingNotes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error("[Bulk Migration] One note failed, continuing with the rest", error);
      }
    }

    setIsMigratingAll(false);
  }, [
    handleMigrateLegacySolNote,
    isMigratingAll,
    legacyMigrationStatus,
    legacySolNotes,
    walletConnected,
  ]);

  const resetLegacyMigrationPrompts = useCallback(() => {
    setLegacySolNotes([]);
    setShowLegacyMigrationPanel(false);
    setLegacyMigrationError(null);
    setLegacyMigrationStatus({});
  }, []);

  return {
    handleMigrateAllLegacyNotes,
    handleMigrateLegacySolNote,
    isMigratingAll,
    legacyMigrationError,
    legacyMigrationStatus,
    legacySolNotes,
    resetLegacyMigrationPrompts,
    setLegacyMigrationError,
    setShowLegacyMigrationPanel,
    showLegacyMigrationPanel,
  };
}
