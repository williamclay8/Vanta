export type NotePickerOption = {
  id: string;
  metaLabel?: string;
  primaryLabel: string;
  secondaryLabel?: string;
};

type NotePickerProps = {
  ariaLabel: string;
  automaticLabel: string;
  emptyCopy?: string;
  emptyOptionLabel: string;
  options: readonly NotePickerOption[];
  helperText?: string;
  onSelectNote: (noteId: string | null) => void;
  selectedNoteId: string | null;
};

export function NotePicker({
  ariaLabel,
  automaticLabel,
  emptyCopy = "start with Shield to create a spendable note.",
  emptyOptionLabel,
  helperText,
  onSelectNote,
  options,
  selectedNoteId,
}: NotePickerProps) {
  const selectedOption = options.find((option) => option.id === selectedNoteId) ?? null;

  return (
    <div className="note-picker" aria-label={ariaLabel}>
      <select
        aria-label={ariaLabel}
        className="note-picker__select"
        disabled={options.length === 0}
        value={selectedOption?.id ?? ""}
        onChange={(event) => {
          onSelectNote(event.target.value || null);
        }}
      >
        <option value="">{options.length === 0 ? emptyOptionLabel : automaticLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.secondaryLabel
              ? `${option.primaryLabel} - ${option.secondaryLabel}`
              : option.primaryLabel}
          </option>
        ))}
      </select>

      {options.length > 0 ? (
        <div className="note-picker__cards" aria-label="Spendable note cards">
          {options.slice(0, 4).map((option) => {
            const isSelected = option.id === selectedOption?.id;

            return (
              <button
                key={option.id}
                className="note-picker__card"
                data-selected={isSelected ? "true" : "false"}
                type="button"
                onClick={() => {
                  onSelectNote(option.id);
                }}
              >
                <span>{option.metaLabel ?? "Spendable note"}</span>
                <strong>{option.primaryLabel}</strong>
                {option.secondaryLabel && <small>{option.secondaryLabel}</small>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="note-picker__empty">
          <strong>Empty Vault</strong>
          <small>{emptyCopy}</small>
        </div>
      )}

      {helperText && <small className="note-picker__helper">{helperText}</small>}
    </div>
  );
}
