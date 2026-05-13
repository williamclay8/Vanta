import { useMemo, useState, type CSSProperties } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { describePricingForSurface } from "@/pricing/vantaPricing";
import { createStrategyPlan, type VantaStrategyPlan } from "@/strategy/strategyPlanner.mjs";
import { getStrategyPrivateRailTrustContract } from "@/strategy/strategyPrivateRailTrustContract";
import {
  STRATEGY_CUSTOM_TIME_WINDOW,
  STRATEGY_DESTINATION_CONNECTED_WALLET,
  STRATEGY_DESTINATION_PRIVATE_BALANCE,
  STRATEGY_DESTINATION_TREASURY_WALLET,
  STRATEGY_FUNDING_SOURCE_PRIVATE_BALANCE,
  STRATEGY_FUNDING_SOURCE_PUBLIC_BALANCE,
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
type StrategyModeLabel = "Preview DCA" | "Preview TWAP";

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

type StrategySelectOptionConfig = {
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  value: string;
};
type StrategySelectOption = string | StrategySelectOptionConfig;
type StrategyTimelineOrder = {
  ariaLabel: string;
  style: CSSProperties;
  title: string;
};
type StrategyPreviewLedger = {
  averageChildSize: string;
  cadenceEstimate: string;
  childTrades: string;
  settlementTarget: string;
  summary: string;
};

const strategyAssets = ["SOL", "JUP", "BONK", "WIF"];
const supportedSlicePolicies = ["Randomized sizing", "Fixed count"] as const;
const supportedTimingPolicies = ["Randomized cadence", "Evenly spaced"] as const;
const slicePolicyOptions: readonly StrategySelectOptionConfig[] = [
  { value: "Randomized sizing" },
  { value: "Fixed count" },
  { value: "Min/max child size", disabled: true, disabledReason: "Coming soon" },
  { value: "Venue threshold", disabled: true, disabledReason: "Coming soon" },
];
const timingPolicyOptions: readonly StrategySelectOptionConfig[] = [
  { value: "Randomized cadence" },
  { value: "Evenly spaced" },
  { value: "Volatility-aware", disabled: true, disabledReason: "Coming soon" },
  { value: "Liquidity-aware", disabled: true, disabledReason: "Coming soon" },
];
const urgencies = ["Low footprint", "Balanced", "Fastest completion"];
const landingModes = ["Protected landing", "Bundle-preferred", "Standard"];
const amountErrorId = "strategy-amount-error";
const customDurationErrorId = "strategy-custom-duration-error";
const maxSlippageErrorId = "strategy-max-slippage-error";
const strategyModeDca = ("Stealth" + " DCA") as StrategyMode;
const strategyModeTwap = ("Private" + " TWAP") as StrategyMode;
const strategyModePreviews: Record<
  StrategyMode,
  {
    hoverCopy: string;
    shortCopy: string;
    ticks: readonly number[];
  }
> = {
  "Stealth DCA": {
    hoverCopy: "Irregular child-order sizing and cadence preview.",
    shortCopy: "Irregular sizing and cadence",
    ticks: [16, 29, 21, 34, 19, 27, 38, 24],
  },
  "Private TWAP": {
    hoverCopy: "Evenly spaced child-order schedule preview.",
    shortCopy: "Even spacing across the window",
    ticks: [26, 26, 26, 26, 26, 26, 26, 26],
  },
};
const strategyPricing = describePricingForSurface("strategy");
const strategyReviewCta = "Preview strategy";
const strategyEnvironmentUnavailableCopy =
  "Beta mode keeps Strategy visible while live execution stays locked.";
const strategyPublicFundingCopy =
  "Shield funds from your public wallet into your Vanta private balance before live execution.";
const strategySettingsActionHint =
  "Keep settings editable while live strategy execution remains unavailable.";
const strategyRouteNote =
  "This screen shapes a local strategy preview. No funds move and no trades are submitted.";
const walletNotConnectedCopy = "No wallet connected";

const defaultForm: StrategyFormState = {
  asset: "SOL",
  customTimeWindow: "12 hours",
  destination: strategyDestinations[0],
  fundingSource: strategyFundingSources[0],
  landingMode: landingModes[0],
  maxSlippage: "0.50%",
  mode: strategyModeDca,
  side: "Buy",
  slicePolicy: supportedSlicePolicies[0],
  timeWindow: strategyTimeWindows[1],
  timingPolicy: supportedTimingPolicies[0],
  totalSize: "250000",
  urgency: urgencies[0],
};

function deriveStrategyPair(form: Pick<StrategyFormState, "asset" | "side">) {
  return form.side === "Sell" ? `${form.asset} -> USDC` : `USDC -> ${form.asset}`;
}

function abbreviatePrivateOwner(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function formatStrategyModeLabel(mode: StrategyMode): StrategyModeLabel {
  return mode === strategyModeTwap ? "Preview TWAP" : "Preview DCA";
}

function formatStrategyMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatStrategyWindow(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function formatStrategyMinutes(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${minutes} min`;
}

function createStrategyPreviewLedger(plan: VantaStrategyPlan, settlementTarget: string): StrategyPreviewLedger {
  const childCount = plan.childOrders.length;
  const averageInterval = Math.max(1, Math.round((plan.windowHours * 60) / Math.max(1, childCount)));
  const intervalDeltas = plan.childOrders.slice(1).map((order, index) =>
    Math.abs(order.scheduledAtMinute - plan.childOrders[index].scheduledAtMinute - averageInterval),
  );
  const jitter = intervalDeltas.length > 0 ? Math.max(...intervalDeltas) : 0;
  const cadenceEstimate = `Every ${formatStrategyMinutes(averageInterval)} +/- ${formatStrategyMinutes(jitter)} jitter`;
  const childTrades = `~${childCount}`;
  const averageChildSize = formatStrategyMoney(plan.averageChildSize);
  const windowLabel = formatStrategyWindow(plan.windowHours);
  const summary = `This strategy preview produces ${childTrades} child trades over ${windowLabel}, averaging ${averageChildSize}, with ${cadenceEstimate.toLowerCase()} and settlement to ${settlementTarget}.`;

  return {
    averageChildSize,
    cadenceEstimate,
    childTrades,
    settlementTarget,
    summary,
  };
}

function formatStrategyOrderTitle(order: VantaStrategyPlan["childOrders"][number]): string {
  return `Child ${order.index}: ${formatStrategyMoney(order.notional)} at minute ${order.scheduledAtMinute}`;
}

function createStrategyTimelineOrders(plan: VantaStrategyPlan): StrategyTimelineOrder[] {
  const totalMinutes = Math.max(1, plan.windowHours * 60);
  const maxNotional = Math.max(...plan.childOrders.map((order) => order.notional), 1);

  return plan.childOrders.map((order) => {
    const left = Math.min(100, Math.max(0, (order.scheduledAtMinute / totalMinutes) * 100));
    const height = 18 + (order.notional / maxNotional) * 42;
    const title = formatStrategyOrderTitle(order);

    return {
      ariaLabel: title,
      style: {
        "--strategy-order-height": `${height.toFixed(2)}px`,
        "--strategy-order-left": `${left.toFixed(4)}%`,
      } as CSSProperties,
      title,
    };
  });
}

function describeFundingWallet(input: {
  fundingSource: StrategyFundingSource;
  privateOwnerShort: string;
  walletAddressShort: string | null;
  walletConnected: boolean;
}) {
  if (input.fundingSource === STRATEGY_FUNDING_SOURCE_PRIVATE_BALANCE) {
    return `Uses shielded funds under Vanta private owner ${input.privateOwnerShort}.`;
  }

  if (input.fundingSource === STRATEGY_FUNDING_SOURCE_PUBLIC_BALANCE) {
    return input.walletConnected && input.walletAddressShort
      ? `Uses public wallet ${input.walletAddressShort}; Vanta must shield funds into your private balance before live execution.`
      : "Connect a wallet to choose the public wallet, then shield funds before live execution.";
  }

  return "Choose whether this preview starts from a public wallet or Vanta private balance.";
}

function describeDestinationWallet(input: {
  destination: StrategyDestination;
  privateOwnerShort: string;
  walletAddressShort: string | null;
  walletConnected: boolean;
}) {
  if (input.destination === STRATEGY_DESTINATION_PRIVATE_BALANCE) {
    return `Keeps proceeds under Vanta private owner ${input.privateOwnerShort}.`;
  }

  if (input.destination === STRATEGY_DESTINATION_CONNECTED_WALLET) {
    return input.walletConnected && input.walletAddressShort
      ? `Sends proceeds to connected wallet ${input.walletAddressShort}.`
      : "Connect a wallet to choose where proceeds return.";
  }

  if (input.destination === STRATEGY_DESTINATION_TREASURY_WALLET) {
    return "Uses the treasury wallet configured before a live run.";
  }

  return "";
}

function normalizeStrategySelectOption(option: StrategySelectOption): StrategySelectOptionConfig {
  return typeof option === "string" ? { value: option } : option;
}

function formatStrategySelectOptionLabel(option: StrategySelectOptionConfig): string {
  const label = option.label ?? option.value;
  return option.disabled ? `${label} - ${option.disabledReason ?? "Unavailable"}` : label;
}

function StrategySelect({
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

export function StrategyPage() {
  const [form, setForm] = useState<StrategyFormState>(defaultForm);
  const { privateCoreHoldState, privateCoreOwner } = usePrivacyFlow();
  const { walletAddressShort, walletConnected } = useWalletState();
  const strategyPair = deriveStrategyPair(form);
  const privateOwnerShort = abbreviatePrivateOwner(privateCoreOwner.publicKey);
  const strategyPrivateRailTrustContract = useMemo(() => getStrategyPrivateRailTrustContract(), []);
  const strategyProductionClaimStatus = strategyPrivateRailTrustContract.claimControls.productionPrivacyClaimsLocked
    ? "Locked"
    : "Needs review";
  const strategyProductionClaimCopy = strategyPrivateRailTrustContract.claimControls.productionPrivacyClaimsLocked
    ? "Live strategy execution still needs readiness, operator, audit, and mainnet evidence."
    : "Live private strategy claims require a fresh readiness review before they can be shown.";

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
  const strategyPreviewLedger = useMemo(
    () => (strategyPlan ? createStrategyPreviewLedger(strategyPlan, form.destination) : null),
    [form.destination, strategyPlan],
  );
  const strategyTimelineOrders = useMemo(
    () => (strategyPlan ? createStrategyTimelineOrders(strategyPlan) : []),
    [strategyPlan],
  );

  const environmentBlockingIssues = isBetaMode ? [strategyEnvironmentUnavailableCopy] : [];
  const fundingBlockingIssues = useMemo(() => {
    if (form.fundingSource === STRATEGY_FUNDING_SOURCE_PUBLIC_BALANCE) {
      return [strategyPublicFundingCopy];
    }

    return [];
  }, [form.fundingSource]);
  const connectedWalletCopy = walletConnected && walletAddressShort ? walletAddressShort : walletNotConnectedCopy;
  const fundingWalletCopy = useMemo(
    () =>
      describeFundingWallet({
        fundingSource: form.fundingSource,
        privateOwnerShort,
        walletAddressShort,
        walletConnected,
      }),
    [form.fundingSource, privateOwnerShort, walletAddressShort, walletConnected],
  );
  const destinationWalletCopy = useMemo(
    () =>
      describeDestinationWallet({
        destination: form.destination,
        privateOwnerShort,
        walletAddressShort,
        walletConnected,
      }),
    [form.destination, privateOwnerShort, walletAddressShort, walletConnected],
  );
  const strategyPrimaryActionLabel = isBetaMode ? "Beta mode" : strategyReviewCta;
  const strategyActionHint = isBetaMode
    ? "Beta mode keeps settings editable while live strategy execution stays locked."
    : strategySettingsActionHint;
  const modeCopy = useMemo(() => {
    if (formatStrategyModeLabel(form.mode) === "Preview TWAP") {
      return "Preview a staged route, schedule, and receipt packet before live execution is available.";
    }

    return "Preview sizing and cadence for a shielded-balance strategy. No trades are submitted from this screen.";
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
            <span className="strategy-kicker product-intro__eyebrow">Preview strategy route</span>
            <h1 id="strategy-title">Strategy</h1>
            <p>{modeCopy}</p>
          </div>
          <div className="module-state">
            <strong>Local preview</strong>
            <p>Build the route, funding, and receipt packet shape before live execution is available.</p>
          </div>
        </header>

        <LaneFlowIndicator
          ariaLabel="Strategy flow"
          activeStepIndex={1}
          className="strategy-flow-indicator"
          steps={[
            { id: "choose-route", label: "Choose route" },
            { id: "preview-plan", label: "Preview plan" },
            { id: "verify-packet", label: "Verify packet" },
            { id: "execute-later", label: "Execute later" },
          ]}
        />

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
            <div className="shield-card__header strategy-card__header">
              <div>
                <span className="strategy-kicker">Build preview</span>
                <h2>What are you trying to do?</h2>
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

            <p className="strategy-front-door-note">
              Vanta splits this into smaller preview trades over the window and settles to your private balance by default.
            </p>

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

            {strategyPlan && strategyPreviewLedger ? (
              <section className="strategy-preview-workbench" aria-label="Strategy preview">
                <div className="strategy-timeline" aria-label="Child-order schedule">
                  <div className="strategy-preview-heading">
                    <span className="strategy-kicker">Child-order schedule</span>
                    <strong>{strategyPreviewLedger.childTrades} preview orders</strong>
                  </div>
                  <div className="strategy-timeline__rail">
                    {strategyTimelineOrders.map((order, index) => (
                      <span
                        aria-label={order.ariaLabel}
                        className="strategy-timeline__mark"
                        key={`${strategyPlan.id}-${index}`}
                        role="img"
                        style={order.style}
                        tabIndex={0}
                        title={order.title}
                      />
                    ))}
                  </div>
                </div>
                <div className="strategy-preview-ledger" aria-label="Strategy preview ledger">
                  <div className="strategy-preview-heading">
                    <span className="strategy-kicker">Strategy preview ledger</span>
                    <p>{strategyPreviewLedger.summary}</p>
                  </div>
                  <div className="strategy-preview-ledger__grid">
                    <div>
                      <span>Child trades</span>
                      <strong>{strategyPreviewLedger.childTrades}</strong>
                    </div>
                    <div>
                      <span>Average child size</span>
                      <strong>{strategyPreviewLedger.averageChildSize}</strong>
                    </div>
                    <div>
                      <span>Cadence estimate</span>
                      <strong>{strategyPreviewLedger.cadenceEstimate}</strong>
                    </div>
                    <div>
                      <span>Settlement target</span>
                      <strong>{strategyPreviewLedger.settlementTarget}</strong>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <details className="strategy-advanced">
              <summary>Advanced strategy settings</summary>
              <div className="strategy-form-grid strategy-form-grid--advanced">
                <div className="strategy-mode-toggle strategy-mode-toggle--advanced" aria-label="Strategy style">
                  {([strategyModeDca, strategyModeTwap] as StrategyMode[]).map((mode) => (
                    <button
                      className={mode === form.mode ? "strategy-mode strategy-mode--active" : "strategy-mode"}
                      key={mode}
                      onClick={() => {
                        updateForm("mode", mode);
                      }}
                      title={strategyModePreviews[mode].hoverCopy}
                      type="button"
                    >
                      <span className="strategy-mode__spark" aria-hidden="true">
                        {strategyModePreviews[mode].ticks.map((height, index) => (
                          <span
                            key={`${mode}-${index}`}
                            style={{ "--strategy-mode-tick-height": `${height}px` } as CSSProperties}
                          />
                        ))}
                      </span>
                      <span className="strategy-mode__content">
                        <span>{formatStrategyModeLabel(mode)}</span>
                        <small>{strategyModePreviews[mode].shortCopy}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <StrategySelect
                  label="Trade size variation"
                  options={slicePolicyOptions}
                  value={form.slicePolicy}
                  onChange={(value) => {
                    updateForm("slicePolicy", value);
                  }}
                />
                <StrategySelect
                  label="Schedule pattern"
                  options={timingPolicyOptions}
                  value={form.timingPolicy}
                  onChange={(value) => {
                    updateForm("timingPolicy", value);
                  }}
                />
                <StrategySelect
                  label="How fast to complete"
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
                  label="Submit method"
                  options={landingModes}
                  value={form.landingMode}
                  onChange={(value) => {
                    updateForm("landingMode", value);
                  }}
                />
                <StrategySelect
                  label="Settle to"
                  options={strategyDestinations}
                  value={form.destination}
                  onChange={(value) => {
                    updateForm("destination", value as StrategyDestination);
                  }}
                />
                <StrategySelect
                  label="Pay from"
                  options={strategyFundingSources}
                  value={form.fundingSource}
                  onChange={(value) => {
                    updateForm("fundingSource", value as StrategyFundingSource);
                  }}
                />
              </div>
            </details>

            <section className="strategy-prerequisites" aria-label="Strategy prerequisites">
              <p className="strategy-route-note">{strategyRouteNote}</p>
              <div className="strategy-wallet-route" role="status">
                <span>Connected wallet</span>
                <strong>{connectedWalletCopy}</strong>
              </div>
              <div className="strategy-prerequisite-grid">
                <div className="strategy-prerequisite-item">
                  <span>Funding source</span>
                  <strong>{capabilityState.fundingSource}</strong>
                  <small>{fundingWalletCopy}</small>
                </div>
                <div className="strategy-prerequisite-item">
                  <span>Proceeds destination</span>
                  <strong>{capabilityState.destination}</strong>
                  <small>{destinationWalletCopy}</small>
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
          <section className="strategy-private-rail-panel" aria-label="Strategy trust packet">
            <div className="shield-card__header strategy-card__header">
              <div>
                <span className="strategy-kicker">Strategy receipt packet</span>
                <h2>Hash-bound packet preview</h2>
              </div>
              <strong>{privateCoreHoldState ? "Ready to preview" : "Shielded private-core note required"}</strong>
            </div>
            <div className="strategy-prerequisite-grid">
              <div className="strategy-prerequisite-item">
                <span>Current truth</span>
                <strong>{strategyPrivateRailTrustContract.currentTruth}</strong>
                <small>Preview-only packet. This UI does not submit live strategy execution.</small>
              </div>
              <div className="strategy-prerequisite-item">
                <span>Operator plaintext shared</span>
                <strong>No</strong>
                <small>Raw pair, total notional, child sizing, and schedule stay outside the packet.</small>
              </div>
              <div className="strategy-prerequisite-item">
                <span>Production readiness</span>
                <strong>{strategyProductionClaimStatus}</strong>
                <small>{strategyProductionClaimCopy}</small>
              </div>
              <div className="strategy-prerequisite-item">
                <span>Reviewer command</span>
                <strong>npm run strategy:private-rail-check</strong>
                <small>{strategyPrivateRailTrustContract.verificationSurfaces[1]}</small>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
