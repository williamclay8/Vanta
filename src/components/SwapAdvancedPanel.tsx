import type { ReactNode } from "react";
import { NotePicker, type NotePickerOption } from "@/components/NotePicker";

type SwapAdvancedPanelProps = {
  className?: string;
  maxSlippageLabel: ReactNode;
  notePickerOptions: readonly NotePickerOption[];
  noteSelectionLabel: ReactNode;
  onSelectNote: (noteId: string | null) => void;
  routeTruthLabel: ReactNode;
  selectedNoteId: string | null;
  sourceAssetLabel: string;
  venueLabel: ReactNode;
};

export function SwapAdvancedPanel({
  className,
  maxSlippageLabel,
  notePickerOptions,
  noteSelectionLabel,
  onSelectNote,
  routeTruthLabel,
  selectedNoteId,
  sourceAssetLabel,
  venueLabel,
}: SwapAdvancedPanelProps) {
  const rootClassName = ["send-advanced-panel", "swap-advanced-panel", className]
    .filter(Boolean)
    .join(" ");

  return (
    <details
      className={rootClassName}
      aria-label="Swap advanced settings"
      data-vanta-swap-advanced-panel
    >
      <summary>Advanced swap settings</summary>
      <div className="send-advanced-panel__grid">
        <div className="send-advanced-panel__field">
          <span>Max slippage</span>
          <strong>{maxSlippageLabel}</strong>
          <small>Displayed from the current route adapter when the quote exposes it.</small>
        </div>
        <div className="send-advanced-panel__field">
          <span>Note selection</span>
          <strong>{noteSelectionLabel}</strong>
          <NotePicker
            ariaLabel="Swap note selection"
            automaticLabel="Automatic exact-note match"
            emptyCopy={`start with Shield to create a spendable shielded ${sourceAssetLabel} note.`}
            emptyOptionLabel={`No spendable shielded ${sourceAssetLabel} notes`}
            helperText="Swap execution still requires an exact shielded source note."
            onSelectNote={onSelectNote}
            options={notePickerOptions}
            selectedNoteId={selectedNoteId}
          />
          <small>Swap execution still requires an exact shielded source note.</small>
        </div>
        <div className="send-advanced-panel__field">
          <span>Venue routing</span>
          <strong>{venueLabel}</strong>
          <small>{routeTruthLabel}</small>
        </div>
      </div>
    </details>
  );
}
