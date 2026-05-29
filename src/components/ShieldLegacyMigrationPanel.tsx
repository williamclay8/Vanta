import { formatVantaSolAmount } from "@/solana/solAmountFormat";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

type LegacyMigrationStatus = "idle" | "migrating" | "success" | "error";

type ShieldLegacyMigrationPanelProps = {
  isMigratingAll: boolean;
  legacyMigrationError: string | null;
  legacyMigrationStatus: Record<string, LegacyMigrationStatus>;
  legacySolNotes: readonly VantaShieldedSolNote[];
  onClearLegacyPrompts: () => void;
  onHide: () => void;
  onMigrateAll: () => void;
  onMigrateNote: (note: VantaShieldedSolNote) => void;
  onReshieldNote: (note: VantaShieldedSolNote) => void;
  walletConnected: boolean;
};

export function ShieldLegacyMigrationPanel({
  isMigratingAll,
  legacyMigrationError,
  legacyMigrationStatus,
  legacySolNotes,
  onClearLegacyPrompts,
  onHide,
  onMigrateAll,
  onMigrateNote,
  onReshieldNote,
  walletConnected,
}: ShieldLegacyMigrationPanelProps) {
  return (
    <div className="shield-legacy-migration-panel">
      <div className="legacy-header">
        <div>
          <strong>Legacy SOL notes — migrate</strong>
          <p>
            {legacySolNotes.length} note(s) from the old WSOL path. One-time migration to v2 for full
            balance support. Unshield works without it.
          </p>
        </div>
        <button className="button button-ghost" type="button" onClick={onHide}>
          Hide
        </button>
      </div>

      {legacySolNotes.length > 1 && (
        <div style={{ marginTop: "10px" }}>
          <button
            className="button button-primary"
            type="button"
            onClick={onMigrateAll}
            disabled={isMigratingAll || !walletConnected}
          >
            {isMigratingAll ? "Migrating all..." : `Migrate all ${legacySolNotes.length} to v2`}
          </button>
          <span style={{ marginLeft: "10px", fontSize: "0.75em", color: "var(--muted-strong)" }}>
            (recommended for many notes)
          </span>
        </div>
      )}

      {legacyMigrationError && (
        <p style={{ color: "#b91c1c", fontSize: "0.82em", margin: "10px 0 4px", lineHeight: 1.35 }}>
          {legacyMigrationError.includes("waking up") || legacyMigrationError.includes("unreachable") ? (
            <>
              Indexer service is waking up or still stabilizing for native SOL (expected in current Phase 2).{" "}
              <strong>Re-shield is the safest option right now.</strong>
            </>
          ) : (
            <>Migration error: {legacyMigrationError}</>
          )}
        </p>
      )}

      <div style={{ marginTop: "8px" }}>
        {legacySolNotes.map((note) => {
          const key = note.depositSignature || note.noteId;
          const status = legacyMigrationStatus[key] || "idle";
          return (
            <div key={key} className="legacy-note-row">
              <span className="legacy-note-info">
                {formatVantaSolAmount(note.amount)} SOL • {note.depositSignature?.slice(0, 8)}... •{" "}
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
              <button
                className="button button-primary legacy-note-btn"
                type="button"
                disabled={isMigratingAll || status === "migrating" || status === "success" || !walletConnected}
                onClick={() => {
                  onMigrateNote(note);
                }}
              >
                {status === "migrating" ? "Migrating..." : status === "success" ? "✓ Done" : "Migrate to v2"}
              </button>
              {status === "error" && (
                <span
                  className="legacy-note-status"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  Failed —
                  <button
                    className="button button-ghost"
                    type="button"
                    style={{ fontSize: "0.7em", padding: "1px 6px" }}
                    onClick={() => {
                      onReshieldNote(note);
                    }}
                  >
                    Re-shield instead (recommended)
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="legacy-footer">
        One-time sentinel commitment + ingest. After migrate, v2 indexer handles your SOL balance.
      </p>

      <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid rgba(0,229,200,0.15)" }}>
        <button
          className="button button-ghost"
          type="button"
          style={{ fontSize: "0.72em", opacity: 0.85 }}
          onClick={onClearLegacyPrompts}
        >
          Having trouble? Reset / clear all legacy migration prompts (safe – just stops the nagging)
        </button>
        <div style={{ fontSize: "0.65em", opacity: 0.6, marginTop: "4px" }}>
          This removes the legacy notes from local tracking. Fresh SOL shielding will create proper v2 notes.
        </div>
      </div>
    </div>
  );
}
