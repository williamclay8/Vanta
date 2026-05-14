import type { ReactNode } from "react";
import { NotePicker, type NotePickerOption } from "@/components/NotePicker";

type UnshieldAdvancedPanelProps = {
  className?: string;
  notePickerOptions: readonly NotePickerOption[];
  noteSelectionLabel: ReactNode;
  onSelectNote: (noteId: string | null) => void;
  referenceNoteLabel: ReactNode;
  selectedNoteId: string | null;
};

export function UnshieldAdvancedPanel({
  className,
  notePickerOptions,
  noteSelectionLabel,
  onSelectNote,
  referenceNoteLabel,
  selectedNoteId,
}: UnshieldAdvancedPanelProps) {
  const rootClassName = ["send-advanced-panel", "unshield-advanced-panel", className]
    .filter(Boolean)
    .join(" ");

  return (
    <details
      className={rootClassName}
      aria-label="Unshield advanced settings"
      data-vanta-unshield-advanced-panel
    >
      <summary>Advanced unshield settings</summary>
      <div className="send-advanced-panel__grid">
        <div className="send-advanced-panel__field">
          <span>Custom note selection</span>
          <strong>{noteSelectionLabel}</strong>
          <NotePicker
            ariaLabel="Unshield note selection"
            automaticLabel="Automatic best note"
            emptyCopy="start with Shield to create a ledger-spendable exit note."
            emptyOptionLabel="No ledger-spendable notes"
            helperText="Unshield still releases only from ledger-spendable notes."
            onSelectNote={onSelectNote}
            options={notePickerOptions}
            selectedNoteId={selectedNoteId}
          />
          <small>Unshield still releases only from ledger-spendable notes.</small>
        </div>
        <div className="send-advanced-panel__field">
          <span>Reference note for receipt</span>
          <strong>{referenceNoteLabel}</strong>
          <small>Receipt references stay bounded to the selected exit note and public release record.</small>
        </div>
      </div>
    </details>
  );
}
