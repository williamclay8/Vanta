import type { VantaShieldAccountState } from "@/solana/vantaShieldState";

type NoteStatePanelProps = {
  account: VantaShieldAccountState | null;
  title?: string;
};

function abbreviate(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function formatAmount(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} VUSD`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function NoteStatePanel({
  account,
  title = "Current note state",
}: NoteStatePanelProps) {
  if (!account) {
    return (
      <div className="note-state-panel">
        <div className="shield-card__header">
          <div>
            <span>Shielded note state</span>
            <h3>{title}</h3>
          </div>
          <small>VUSD only</small>
        </div>
        <p className="shield-review-note">
          Connect a wallet and enter the live VUSD path to resolve current
          spendable, consumed, and change-derived notes.
        </p>
      </div>
    );
  }

  return (
    <div className="note-state-panel">
      <div className="shield-card__header">
        <div>
          <span>Shielded note state</span>
          <h3>{title}</h3>
        </div>
        <small>{account.noteStatusSummary.total} resolved notes</small>
      </div>

      <div className="preview-grid note-state-summary">
        <div className="preview-card preview-card--accent">
          <span>Spendable</span>
          <strong>{account.noteStatusSummary.spendable}</strong>
        </div>
        <div className="preview-card">
          <span>Consumed</span>
          <strong>{account.noteStatusSummary.consumed}</strong>
        </div>
        <div className="preview-card">
          <span>Change-derived</span>
          <strong>{account.noteStatusSummary.changeDerived}</strong>
        </div>
        <div className="preview-card">
          <span>Shielded balance</span>
          <strong>{formatAmount(account.balance)}</strong>
        </div>
      </div>

      <div className="note-state-list">
        {account.noteStates.slice(0, 5).map((note) => (
          <div key={note.noteId} className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>{formatAmount(note.amount)}</strong>
                <span>{abbreviate(note.noteId)}</span>
              </div>
              <div className="note-state-chips">
                <span
                  className={
                    note.lifecycleStatus === "spendable"
                      ? "note-state-chip note-state-chip--spendable"
                      : "note-state-chip note-state-chip--consumed"
                  }
                >
                  {note.lifecycleStatus === "spendable" ? "Spendable" : "Consumed"}
                </span>
                {note.sourceType === "change_derived" && (
                  <span className="note-state-chip note-state-chip--change">
                    Change-derived
                  </span>
                )}
              </div>
            </div>

            <div className="note-state-row__meta">
              <span>Created {formatDate(note.createdAt)}</span>
              {note.parentNoteId && <span>Parent {abbreviate(note.parentNoteId)}</span>}
              {note.consumedByTransitionId && note.consumedByTransitionKind && (
                <span>
                  {note.consumedByTransitionKind === "send" ? "Send" : "Unshield"}{" "}
                  {abbreviate(note.consumedByTransitionId)}
                </span>
              )}
              {note.spentMarkerId && <span>Spent {abbreviate(note.spentMarkerId)}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="shield-review-note">
        This view reflects Vanta&apos;s current resolver interpretation for
        `VUSD`: note identity, spendability, and change lineage. It is a
        product-facing protocol summary, not a full explorer.
      </p>
    </div>
  );
}
