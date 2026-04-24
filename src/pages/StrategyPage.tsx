import { useMemo, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { describePricingForSurface } from "@/pricing/vantaPricing";
import { createStrategyPlan, type VantaStrategyPlan } from "@/strategy/strategyPlanner.mjs";
import {
  STRATEGY_CUSTOM_TIME_WINDOW,
  createStrategyCapabilityState,
  createStrategyFormErrors,
  parseStrategyAmount,
  parseStrategyCustomDuration,
  parseStrategySlippageBps,
  strategyDestinations,
  strategyFundingSources,
  strategyTimeWindows,
  type StrategyDestination,
  type StrategyFundingSource,
  type StrategyTimeWindow,
} from "@/strategy/strategyPageState";

type StrategyMode = "Stealth DCA" | "Private TWAP";

type StrategyFormState = {
  asset: string;
  customTimeWindow: string;
  destination: StrategyDestination;
  fundingSource: StrategyFundingSource;
  landingMode: string;
  maxSlippage: string;
  mode: StrategyMode;
  side: "Buy" | "Sell";
  slicePolicy: string;
  timeWindow: StrategyTimeWindow;
  timingPolicy: string;
  totalSize: string;
  urgency: string;
};

const strategyAssets = ["SOL", "JUP", "BONK", "WIF"];
const slicePolicies = ["Randomized sizing", "Fixed count", "Min/max child size", "Venue threshold"];
const timingPolicies = ["Randomized cadence", "Evenly spaced", "Volatility-aware", "Liquidity-aware"];
const urgencies = ["Low footprint", "Balanced", "Fastest completion"];
const landingModes = ["Protected landing", "Bundle-preferred", "Standard"];
const amountErrorId = "strategy-amount-error";
const customDurationErrorId = "strategy-custom-duration-error";
const maxSlippageErrorId = "strategy-max-slippage-error";
const strategyPricing = describePricingForSurface("strategy");
const strategyReviewCta = "Review strategy settings";
const strategyEnvironmentUnavailableCopy =
  "Live execution is unavailable in this environment.";
const strategyPublicFundingCopy =
  "Move funds into your private balance before execution.";
const strategyExternalWalletCopy =
  "Connect and fund the required wallet before execution.";
const strategySettingsActionHint =
  "Keep settings editable while live strategy execution remains unavailable.";

const defaultForm: StrategyFormState = {
  asset: "SOL",
  customTimeWindow: "12 hours",
  destination: strategyDestinations[0],
  fundingSource: strategyFundingSources[0],
  landingMode: landingModes[0],
  maxSlippage: "0.50%",
  mode: "Stealth DCA",
  side: "Buy",
  slicePolicy: slicePolicies[0],
  timeWindow: strategyTimeWindows[1],
  timingPolicy: timingPolicies[0],
  totalSize: "250000",
  urgency: urgencies[0],
};

function deriveStrategyPair(form: Pick<StrategyFormState, "asset" | "side">) {
  return form.side === "Sell" ? `${form.asset} -> USDC` : `USDC -> ${form.asset}`;
}

function StrategySelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="strategy-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function StrategyPage() {
  const [form, setForm] = useState<StrategyFormState>(defaultForm);
  const strategyPair = deriveStrategyPair(form);

  const parsedAmount = useMemo(() => parseStrategyAmount(form.totalSize), [form.totalSize]);
  const parsedSlippage = useMemo(() => parseStrategySlippageBps(form.maxSlippage), [form.maxSlippage]);
  const parsedCustomDuration = useMemo(
    () =>
      form.timeWindow === STRATEGY_CUSTOM_TIME_WINDOW
        ? parseStrategyCustomDuration(form.customTimeWindow)
        : { error: null, value: form.timeWindow },
    [form.customTimeWindow, form.timeWindow],
  );

  const formErrors = useMemo(
    () =>
      createStrategyFormErrors({
        amount: form.totalSize,
        customTimeWindow: form.customTimeWindow,
        maxSlippage: form.maxSlippage,
        timeWindow: form.timeWindow,
      }),
    [form.customTimeWindow, form.maxSlippage, form.timeWindow, form.totalSize],
  );
  const hasErrors = Object.values(formErrors).some((error) => error !== null);
  const effectiveTimeWindow = parsedCustomDuration.value;
  const capabilityState = useMemo(
    () =>
      createStrategyCapabilityState({
        destination: form.destination,
        fundingSource: form.fundingSource,
        hasErrors,
        isBetaMode,
      }),
    [form.destination, form.fundingSource, hasErrors],
  );

  const strategyPlan = useMemo<VantaStrategyPlan | null>(() => {
    if (parsedAmount.value === null || parsedSlippage.value === null || effectiveTimeWindow === null) {
      return null;
    }

    return createStrategyPlan({
      destination: form.destination,
      fundingSource: form.fundingSource,
      landingMode: form.landingMode,
      maxSlippageBps: parsedSlippage.value,
      mode: form.mode,
      pair: strategyPair,
      seed: "vanta-strategy-preview",
      side: form.side,
      slicePolicy: form.slicePolicy,
      timingPolicy: form.timingPolicy,
      timeWindow: effectiveTimeWindow,
      totalNotional: parsedAmount.value,
      urgency: form.urgency,
    });
  }, [effectiveTimeWindow, form, parsedAmount.value, parsedSlippage.value, strategyPair]);

  const environmentBlockingIssues = isBetaMode ? [strategyEnvironmentUnavailableCopy] : [];
  const fundingBlockingIssues = useMemo(() => {
    if (form.fundingSource === "Public balance") {
      return [strategyPublicFundingCopy];
    }

    if (form.fundingSource === "External wallet") {
      return [strategyExternalWalletCopy];
    }

    return [];
  }, [form.fundingSource]);
  const strategyPrimaryActionLabel = isBetaMode ? "Beta mode" : strategyReviewCta;
  const strategyActionHint = isBetaMode
    ? "Beta mode keeps Strategy visible but prevents live execution while production services are offline."
    : strategySettingsActionHint;
  const modeCopy = useMemo(() => {
    if (form.mode === "Private TWAP") {
      return "Bounded randomization, protected routing, and tighter schedule control.";
    }

    return "Randomized sizing and cadence for private accumulation with reduced on-chain observability.";
  }, [form.mode]);

  const updateForm = <Key extends keyof StrategyFormState>(
    key: Key,
    value: StrategyFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="send-page strategy-page" aria-labelledby="strategy-title">
      <div className="strategy-shell">
        <header className="module-page__hero send-page__hero strategy-header product-intro">
          <div className="strategy-header__copy">
            <span className="strategy-kicker product-intro__eyebrow">Plan trades</span>
            <h1 id="strategy-title">Strategy</h1>
            <p>{modeCopy}</p>
          </div>
        </header>

        <div className="strategy-main">
          <form
            className="send-card send-card--workspace strategy-card strategy-card--primary"
            onSubmit={(event) => {
              event.preventDefault();

              if (!strategyPlan || capabilityState.submitDisabled) {
                return;
              }
            }}
          >
            <div className="strategy-card__header">
              <div>
                <span className="strategy-kicker">Build strategy</span>
                <h2>{form.mode}</h2>
              </div>
              <div className="strategy-mode-toggle" aria-label="Strategy type">
                {(["Stealth DCA", "Private TWAP"] as const).map((mode) => (
                  <button
                    className={mode === form.mode ? "strategy-mode strategy-mode--active" : "strategy-mode"}
                    key={mode}
                    onClick={() => {
                      updateForm("mode", mode);
                    }}
                    type="button"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="strategy-form-grid strategy-form-grid--simple">
              <StrategySelect
                label="You want to"
                options={["Buy", "Sell"]}
                value={form.side}
                onChange={(value) => {
                  updateForm("side", value as StrategyFormState["side"]);
                }}
              />
              <StrategySelect
                label="Asset"
                options={strategyAssets}
                value={form.asset}
                onChange={(value) => {
                  updateForm("asset", value);
                }}
              />
              <label className="strategy-field strategy-field--amount">
                <span>Amount</span>
                <input
                  aria-label="Amount"
                  aria-describedby={formErrors.amount ? amountErrorId : undefined}
                  aria-invalid={formErrors.amount ? true : undefined}
                  inputMode="decimal"
                  value={form.totalSize}
                  onChange={(event) => {
                    updateForm("totalSize", event.target.value);
                  }}
                />
                {formErrors.amount ? (
                  <small className="strategy-field-error" id={amountErrorId} role="alert">
                    {formErrors.amount}
                  </small>
                ) : null}
              </label>
              <StrategySelect
                label="Duration"
                options={strategyTimeWindows}
                value={form.timeWindow}
                onChange={(value) => {
                  updateForm("timeWindow", value as StrategyTimeWindow);
                }}
              />
            </div>

            {form.timeWindow === STRATEGY_CUSTOM_TIME_WINDOW ? (
              <label className="strategy-field strategy-field--custom-duration">
                <span>Custom duration</span>
                <input
                  aria-describedby={formErrors.customTimeWindow ? customDurationErrorId : undefined}
                  aria-invalid={formErrors.customTimeWindow ? true : undefined}
                  aria-label="Custom duration"
                  placeholder="Example: 12 hours or 3 days"
                  value={form.customTimeWindow}
                  onChange={(event) => {
                    updateForm("customTimeWindow", event.target.value);
                  }}
                />
                {formErrors.customTimeWindow ? (
                  <small className="strategy-field-error" id={customDurationErrorId} role="alert">
                    {formErrors.customTimeWindow}
                  </small>
                ) : null}
              </label>
            ) : null}

            <details className="strategy-advanced">
              <summary>Tune execution</summary>
              <div className="strategy-form-grid strategy-form-grid--advanced">
                <StrategySelect
                  label="Slice policy"
                  options={slicePolicies}
                  value={form.slicePolicy}
                  onChange={(value) => {
                    updateForm("slicePolicy", value);
                  }}
                />
                <StrategySelect
                  label="Timing policy"
                  options={timingPolicies}
                  value={form.timingPolicy}
                  onChange={(value) => {
                    updateForm("timingPolicy", value);
                  }}
                />
                <StrategySelect
                  label="Urgency"
                  options={urgencies}
                  value={form.urgency}
                  onChange={(value) => {
                    updateForm("urgency", value);
                  }}
                />
                <label className="strategy-field">
                  <span>Max slippage</span>
                  <input
                    aria-label="Max slippage"
                    aria-describedby={formErrors.maxSlippage ? maxSlippageErrorId : undefined}
                    aria-invalid={formErrors.maxSlippage ? true : undefined}
                    value={form.maxSlippage}
                    onChange={(event) => {
                      updateForm("maxSlippage", event.target.value);
                    }}
                  />
                  {formErrors.maxSlippage ? (
                    <small className="strategy-field-error" id={maxSlippageErrorId} role="alert">
                      {formErrors.maxSlippage}
                    </small>
                  ) : null}
                </label>
                <StrategySelect
                  label="Landing mode"
                  options={landingModes}
                  value={form.landingMode}
                  onChange={(value) => {
                    updateForm("landingMode", value);
                  }}
                />
                <StrategySelect
                  label="Destination"
                  options={strategyDestinations}
                  value={form.destination}
                  onChange={(value) => {
                    updateForm("destination", value as StrategyDestination);
                  }}
                />
                <StrategySelect
                  label="Fund from"
                  options={strategyFundingSources}
                  value={form.fundingSource}
                  onChange={(value) => {
                    updateForm("fundingSource", value as StrategyFundingSource);
                  }}
                />
              </div>
            </details>

            <section className="strategy-prerequisites" aria-label="Strategy prerequisites">
              <div className="strategy-prerequisite-grid">
                <div className="strategy-prerequisite-item">
                  <span>Fund from</span>
                  <strong>{capabilityState.fundingSource}</strong>
                </div>
                <div className="strategy-prerequisite-item">
                  <span>Destination</span>
                  <strong>{capabilityState.destination}</strong>
                </div>
              </div>
              {environmentBlockingIssues.length > 0 ? (
                <ul className="strategy-blocking-list" aria-label="Environment status">
                  {environmentBlockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              {fundingBlockingIssues.length > 0 ? (
                <ul className="strategy-blocking-list">
                  {fundingBlockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </section>

            <div className="strategy-actions">
              <button
                className="button button-primary strategy-primary-action"
                disabled={isBetaMode || capabilityState.submitDisabled || strategyPlan === null}
                type="submit"
              >
                {strategyPrimaryActionLabel}
              </button>
              <span>{strategyActionHint}</span>
            </div>
          </form>
        </div>

        <div className="strategy-panels">
          <div className="strategy-pricing-note" aria-label="Strategy pricing">
            <strong>{strategyPricing.feeLabel}</strong>
            <span>{strategyPricing.passThroughLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
