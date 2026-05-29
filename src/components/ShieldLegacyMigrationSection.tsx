import { LaneProgressiveSection } from "@/components/LaneProgressiveSection";
import { ShieldLegacyMigrationPanel } from "@/components/ShieldLegacyMigrationPanel";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

type LegacyMigrationStatus = "idle" | "migrating" | "success" | "error";

type ShieldLegacyMigrationSectionProps = {
  handleMigrateAllLegacyNotes: () => void | Promise<void>;
  handleMigrateLegacySolNote: (note: VantaShieldedSolNote) => void | Promise<void>;
  isMigratingAll: boolean;
  legacyMigrationError: string | null;
  legacyMigrationStatus: Record<string, LegacyMigrationStatus>;
  legacySolNotes: readonly VantaShieldedSolNote[];
  onClearLegacyPrompts: () => void;
  onHideLegacyMigrationPanel: () => void;
  onReshieldLegacyNote: (note: VantaShieldedSolNote) => void;
  walletConnected: boolean;
};

export function ShieldLegacyMigrationSection({
  handleMigrateAllLegacyNotes,
  handleMigrateLegacySolNote,
  isMigratingAll,
  legacyMigrationError,
  legacyMigrationStatus,
  legacySolNotes,
  onClearLegacyPrompts,
  onHideLegacyMigrationPanel,
  onReshieldLegacyNote,
  walletConnected,
}: ShieldLegacyMigrationSectionProps) {
  if (legacySolNotes.length === 0) {
    return null;
  }

  return (
    <LaneProgressiveSection
      className="shield-page__legacy-migration"
      summary={`Legacy SOL migration (${legacySolNotes.length} note${legacySolNotes.length === 1 ? "" : "s"})`}
      variant="optional"
    >
      <ShieldLegacyMigrationPanel
        isMigratingAll={isMigratingAll}
        legacyMigrationError={legacyMigrationError}
        legacyMigrationStatus={legacyMigrationStatus}
        legacySolNotes={legacySolNotes}
        onClearLegacyPrompts={onClearLegacyPrompts}
        onHide={onHideLegacyMigrationPanel}
        onMigrateAll={() => {
          void handleMigrateAllLegacyNotes();
        }}
        onMigrateNote={(note) => {
          void handleMigrateLegacySolNote(note);
        }}
        onReshieldNote={onReshieldLegacyNote}
        walletConnected={walletConnected}
      />
    </LaneProgressiveSection>
  );
}
