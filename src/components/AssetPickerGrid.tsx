export type AssetPickerGridOption = {
  balanceLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  id: string;
  label: string;
  loading?: boolean;
  logoAlt?: string;
  logoSrc?: string | null;
  name?: string;
  statusLabel?: string;
  symbol: string;
};

type AssetPickerGridProps = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  emptyLabel?: string;
  onSelectOption: (optionId: string) => void;
  options: readonly AssetPickerGridOption[];
  readOnly?: boolean;
  selectedOptionId: string;
};

export function AssetPickerGrid({
  ariaLabel,
  className,
  disabled = false,
  emptyLabel = "No assets available",
  onSelectOption,
  options,
  readOnly = false,
  selectedOptionId,
}: AssetPickerGridProps) {
  const rootClassName = ["asset-picker-grid", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName} aria-label={ariaLabel} role="radiogroup">
      {options.length === 0 ? (
        <div className="asset-picker-grid__empty">{emptyLabel}</div>
      ) : (
        <div className="asset-picker-grid__options">
          {options.map((option) => {
            const selected = option.id === selectedOptionId;
            const optionUnavailable = disabled || option.disabled || option.loading;
            const optionDisabled = optionUnavailable || readOnly;
            const optionClassName = [
              "asset-picker-grid__option",
              selected ? "asset-picker-grid__option--selected" : "",
              optionUnavailable ? "asset-picker-grid__option--disabled" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                aria-checked={selected}
                aria-label={`${option.label}${option.disabledReason ? ` - ${option.disabledReason}` : ""}`}
                className={optionClassName}
                disabled={optionDisabled}
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                role="radio"
                type="button"
              >
                <span className="asset-picker-grid__logo" aria-hidden="true">
                  {option.loading ? (
                    <span className="asset-picker-grid__shimmer" />
                  ) : option.logoSrc ? (
                    <img alt={option.logoAlt ?? ""} src={option.logoSrc} />
                  ) : (
                    <span>{option.symbol.slice(0, 3)}</span>
                  )}
                </span>
                <span className="asset-picker-grid__body">
                  <span className="asset-picker-grid__symbol">{option.symbol}</span>
                  <span className="asset-picker-grid__label">{option.label || "\u00A0"}</span>
                  <span className="asset-picker-grid__meta">
                    {[option.balanceLabel, option.statusLabel].filter(Boolean).join(" - ") || "\u00A0"}
                  </span>
                </span>
                {option.disabledReason && (
                  <span className="asset-picker-grid__reason">{option.disabledReason}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
