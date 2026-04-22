import { useMemo, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { createStrategyExecutionPreview } from "@/strategy/strategyExecutionAdapter.mjs";
import { createStrategyPlan, type VantaStrategyPlan } from "@/strategy/strategyPlanner.mjs";
import { createVantaStrategyRuntime, type VantaStrategyRecord } from "@/strategy/strategyRuntime.mjs";

type StrategyMode = "Stealth DCA" | "Private TWAP";

type StrategyFormState = {
  asset: string;
  customTimeWindow: string;
  mode: StrategyMode;
  side: "Buy" | "Sell";
  totalSize: string;
  timeWindow: string;
  slicePolicy: string;
  timingPolicy: string;
  urgency: string;
  maxSlippage: string;
  landingMode: string;
  destination: string;
  fundingSource: string;
};

const strategyAssets = ["SOL", "JUP", "BONK", "WIF"];
const windows = ["6 hours", "24 hours", "7 days", "Custom"];
const slicePolicies = ["Randomized sizing", "Fixed count", "Min/max child size", "Venue threshold"];
const timingPolicies = ["Randomized cadence", "Evenly spaced", "Volatility-aware", "Liquidity-aware"];
const urgencies = ["Low footprint", "Balanced", "Fastest completion"];
const landingModes = ["Protected landing", "Bundle-preferred", "Standard"];
const destinations = ["Private balance", "Public wallet", "Treasury vault"];
const fundingSources = ["Private balance", "Public balance", "External wallet"];

const defaultForm: StrategyFormState = {
  asset: "SOL",
  customTimeWindow: "12 hours",
  mode: "Stealth DCA",
  side: "Buy",
  totalSize: "250000",
  timeWindow: windows[1],
  slicePolicy: slicePolicies[0],
  timingPolicy: timingPolicies[0],
  urgency: urgencies[0],
  maxSlippage: "0.50%",
  landingMode: landingModes[0],
  destination: destinations[0],
  fundingSource: fundingSources[0],
};

function deriveStrategyPair(form: Pick<StrategyFormState, "asset" | "side">) {
  return form.side === "Sell" ? `${form.asset} -> USDC` : `USDC -> ${form.asset}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function parseTotalSize(value: string) {
  const parsed = Number(value.replace(/[$,\s]/gu, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSlippageBps(value: string) {
  const parsed = Number(value.replace(/[%\s]/gu, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 50;
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
  const strategyRuntime = useMemo(() => createVantaStrategyRuntime(), []);
  const [createdStrategy, setCreatedStrategy] = useState<VantaStrategyRecord | null>(null);
  const strategyPair = deriveStrategyPair(form);
  const effectiveTimeWindow =
    form.timeWindow === "Custom" ? form.customTimeWindow.trim() || defaultForm.customTimeWindow : form.timeWindow;

  const strategyPlan = useMemo<VantaStrategyPlan>(
    () =>
      createStrategyPlan({
        destination: form.destination,
        fundingSource: form.fundingSource,
        landingMode: form.landingMode,
        maxSlippageBps: parseSlippageBps(form.maxSlippage),
        mode: form.mode,
        pair: strategyPair,
        seed: "vanta-strategy-preview",
        side: form.side,
        slicePolicy: form.slicePolicy,
        timingPolicy: form.timingPolicy,
        timeWindow: effectiveTimeWindow,
        totalNotional: Math.max(1, parseTotalSize(form.totalSize)),
        urgency: form.urgency,
      }),
    [effectiveTimeWindow, form, strategyPair],
  );
  const executionPreview = useMemo(
    () =>
      createStrategyExecutionPreview(strategyPlan, {
        currentSlippageBps: parseSlippageBps(form.maxSlippage),
        protectedLandingAvailable: true,
        protectedLandingPolicy: "retry",
        routeQuality: "healthy",
      }),
    [form.maxSlippage, strategyPlan],
  );
  const firstExecutionJob = executionPreview.childJobs[0];

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
    <section className="strategy-page" aria-labelledby="strategy-title">
      <div className="strategy-shell">
        <header className="strategy-header">
          <div>
            <span className="strategy-kicker">Execution</span>
            <h1 id="strategy-title">Strategy</h1>
          </div>
          <p>{modeCopy}</p>
        </header>

        <div className="strategy-main">
          <form
            className="strategy-card strategy-card--primary"
            onSubmit={(event) => {
              event.preventDefault();
              if (isBetaMode) {
                return;
              }
              setCreatedStrategy(
                strategyRuntime.createStrategy({
                  clientRequestId: `strategy-${form.mode}-${strategyPair}-${form.totalSize}`,
                  destination: form.destination,
                  fundingSource: form.fundingSource,
                  landingMode: form.landingMode,
                  maxSlippageBps: parseSlippageBps(form.maxSlippage),
                  mode: form.mode,
                  pair: strategyPair,
                  seed: "vanta-strategy-ui",
                  side: form.side,
                  slicePolicy: form.slicePolicy,
                  timingPolicy: form.timingPolicy,
                  timeWindow: effectiveTimeWindow,
                  totalNotional: Math.max(1, parseTotalSize(form.totalSize)),
                  urgency: form.urgency,
                }),
              );
            }}
          >
            <div className="strategy-card__header">
              <div>
                <span className="strategy-kicker">Create Strategy</span>
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
                  inputMode="decimal"
                  value={form.totalSize}
                  onChange={(event) => {
                    updateForm("totalSize", event.target.value);
                  }}
                />
              </label>
              <StrategySelect
                label="Duration"
                options={windows}
                value={form.timeWindow}
                onChange={(value) => {
                  updateForm("timeWindow", value);
                }}
              />
            </div>

            {form.timeWindow === "Custom" && (
              <label className="strategy-field strategy-field--custom-duration">
                <span>Custom duration</span>
                <input
                  aria-label="Custom duration"
                  placeholder="Example: 12 hours or 3 days"
                  value={form.customTimeWindow}
                  onChange={(event) => {
                    updateForm("customTimeWindow", event.target.value);
                  }}
                />
              </label>
            )}

            <details className="strategy-advanced">
              <summary>Advanced settings</summary>
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
                    value={form.maxSlippage}
                    onChange={(event) => {
                      updateForm("maxSlippage", event.target.value);
                    }}
                  />
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
                  options={destinations}
                  value={form.destination}
                  onChange={(value) => {
                    updateForm("destination", value);
                  }}
                />
                <StrategySelect
                  label="Fund from"
                  options={fundingSources}
                  value={form.fundingSource}
                  onChange={(value) => {
                    updateForm("fundingSource", value);
                  }}
                />
              </div>
            </details>

            <div className="strategy-actions">
              <button
                className="button button-primary strategy-primary-action"
                disabled={isBetaMode}
                type="submit"
              >
                {isBetaMode ? "Beta mode" : "Create strategy"}
              </button>
              <span>
                {isBetaMode
                  ? "Beta mode keeps Strategy visible but prevents live execution while production services are offline."
                  : `${strategyPair} · ${form.landingMode} · destination: private`}
              </span>
            </div>

          </form>
        </div>

        <div className="strategy-panels">
          <section className="strategy-card strategy-card--secondary">
            <div className="strategy-card__header">
              <div>
                <span className="strategy-kicker">Preview</span>
                <h2>Execution preview</h2>
              </div>
            </div>
            <div className="strategy-detail-grid">
              <div className="strategy-funding-line">
                <span>Pair</span>
                <strong>{strategyPair}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Amount</span>
                <strong>{formatCurrency(parseTotalSize(form.totalSize))}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Duration</span>
                <strong>{effectiveTimeWindow}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Child orders</span>
                <strong>{String(strategyPlan.childOrders.length)}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Average child size</span>
                <strong>{formatCurrency(strategyPlan.averageChildSize)}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Funding</span>
                <strong>{strategyPlan.fundingAction.replace(/-/gu, " ")}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Route</span>
                <strong>{firstExecutionJob?.route.engine ?? strategyPlan.routingPolicy.routeEngine ?? "Jupiter"}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Landing</span>
                <strong>{firstExecutionJob?.landing.transport ?? "Jito"}</strong>
              </div>
              <div className="strategy-funding-line">
                <span>Submit</span>
                <strong>{executionPreview.liveSubmission ? "Live submission on" : "Live submission off"}</strong>
              </div>
            </div>
          </section>

          {createdStrategy ? (
            <section className="strategy-card strategy-card--secondary" role="status">
              <div className="strategy-card__header">
                <div>
                  <span className="strategy-kicker">Created</span>
                  <h2>Strategy queued</h2>
                </div>
              </div>
              <div className="strategy-detail-grid">
                <div className="strategy-funding-line">
                  <span>Mode</span>
                  <strong>{createdStrategy.plan.mode}</strong>
                </div>
                <div className="strategy-funding-line">
                  <span>Pair</span>
                  <strong>{createdStrategy.plan.pair}</strong>
                </div>
                <div className="strategy-funding-line">
                  <span>Status</span>
                  <strong>{createdStrategy.status}</strong>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
