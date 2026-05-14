import type { CSSProperties } from "react";

export type StrategySelectOptionConfig = {
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  value: string;
};
export type StrategySelectOption = string | StrategySelectOptionConfig;

export type StrategyModeOption<Value extends string = string> = {
  hoverCopy: string;
  label: string;
  shortCopy: string;
  ticks: readonly number[];
  value: Value;
};

function normalizeStrategySelectOption(option: StrategySelectOption): StrategySelectOptionConfig {
  return typeof option === "string" ? { value: option } : option;
}

function formatStrategySelectOptionLabel(option: StrategySelectOptionConfig): string {
  const label = option.label ?? option.value;
  return option.disabled ? `${label} - ${option.disabledReason ?? "Unavailable"}` : label;
}

export function StrategySelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly StrategySelectOption[];
  value: string;
}) {
  const normalizedOptions = options.map(normalizeStrategySelectOption);

  return (
    <label className="strategy-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const option = normalizedOptions.find((candidate) => candidate.value === event.target.value);
          if (option?.disabled) {
            return;
          }

          onChange(event.target.value);
        }}
      >
        {normalizedOptions.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {formatStrategySelectOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

type StrategyAdvancedPanelProps<ModeValue extends string = string> = {
  className?: string;
  maxSlippage: string;
  maxSlippageError?: string | null;
  maxSlippageErrorId: string;
  modeOptions: readonly StrategyModeOption<ModeValue>[];
  onMaxSlippageChange: (value: string) => void;
  onModeChange: (value: ModeValue) => void;
  onPayFromChange: (value: string) => void;
  onSchedulePatternChange: (value: string) => void;
  onSettleToChange: (value: string) => void;
  onSubmitMethodChange: (value: string) => void;
  onTradeSizeVariationChange: (value: string) => void;
  onUrgencyChange: (value: string) => void;
  payFrom: string;
  payFromOptions: readonly StrategySelectOption[];
  schedulePattern: string;
  schedulePatternOptions: readonly StrategySelectOption[];
  selectedMode: ModeValue;
  settleTo: string;
  settleToOptions: readonly StrategySelectOption[];
  submitMethod: string;
  submitMethodOptions: readonly StrategySelectOption[];
  tradeSizeVariation: string;
  tradeSizeVariationOptions: readonly StrategySelectOption[];
  urgency: string;
  urgencyOptions: readonly StrategySelectOption[];
};

export function StrategyAdvancedPanel<ModeValue extends string = string>({
  className,
  maxSlippage,
  maxSlippageError,
  maxSlippageErrorId,
  modeOptions,
  onMaxSlippageChange,
  onModeChange,
  onPayFromChange,
  onSchedulePatternChange,
  onSettleToChange,
  onSubmitMethodChange,
  onTradeSizeVariationChange,
  onUrgencyChange,
  payFrom,
  payFromOptions,
  schedulePattern,
  schedulePatternOptions,
  selectedMode,
  settleTo,
  settleToOptions,
  submitMethod,
  submitMethodOptions,
  tradeSizeVariation,
  tradeSizeVariationOptions,
  urgency,
  urgencyOptions,
}: StrategyAdvancedPanelProps<ModeValue>) {
  const rootClassName = ["strategy-advanced", className].filter(Boolean).join(" ");

  return (
    <details className={rootClassName} aria-label="Strategy advanced settings" data-vanta-strategy-advanced-panel>
      <summary>Advanced strategy settings</summary>
      <div className="strategy-form-grid strategy-form-grid--advanced">
        <div className="strategy-mode-toggle strategy-mode-toggle--advanced" aria-label="Strategy style">
          {modeOptions.map((mode) => (
            <button
              className={mode.value === selectedMode ? "strategy-mode strategy-mode--active" : "strategy-mode"}
              key={mode.value}
              onClick={() => {
                onModeChange(mode.value);
              }}
              title={mode.hoverCopy}
              type="button"
            >
              <span className="strategy-mode__spark" aria-hidden="true">
                {mode.ticks.map((height, index) => (
                  <span
                    key={`${mode.value}-${index}`}
                    style={{ "--strategy-mode-tick-height": `${height}px` } as CSSProperties}
                  />
                ))}
              </span>
              <span className="strategy-mode__content">
                <span>{mode.label}</span>
                <small>{mode.shortCopy}</small>
              </span>
            </button>
          ))}
        </div>
        <StrategySelect
          label="Trade size variation"
          options={tradeSizeVariationOptions}
          value={tradeSizeVariation}
          onChange={onTradeSizeVariationChange}
        />
        <StrategySelect
          label="Schedule pattern"
          options={schedulePatternOptions}
          value={schedulePattern}
          onChange={onSchedulePatternChange}
        />
        <StrategySelect label="How fast to complete" options={urgencyOptions} value={urgency} onChange={onUrgencyChange} />
        <label className="strategy-field">
          <span>Max slippage</span>
          <input
            aria-label="Max slippage"
            aria-describedby={maxSlippageError ? maxSlippageErrorId : undefined}
            aria-invalid={maxSlippageError ? true : undefined}
            value={maxSlippage}
            onChange={(event) => {
              onMaxSlippageChange(event.target.value);
            }}
          />
          {maxSlippageError ? (
            <small className="strategy-field-error" id={maxSlippageErrorId} role="alert">
              {maxSlippageError}
            </small>
          ) : null}
        </label>
        <StrategySelect label="Submit method" options={submitMethodOptions} value={submitMethod} onChange={onSubmitMethodChange} />
        <StrategySelect label="Settle to" options={settleToOptions} value={settleTo} onChange={onSettleToChange} />
        <StrategySelect label="Pay from" options={payFromOptions} value={payFrom} onChange={onPayFromChange} />
      </div>
    </details>
  );
}
