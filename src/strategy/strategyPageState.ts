type StrategyParsedNumber = {
  error: string | null;
  value: number | null;
};

type StrategyParsedDuration = {
  error: string | null;
  value: string | null;
};

export const STRATEGY_CUSTOM_TIME_WINDOW = "Custom";
export const STRATEGY_FUNDING_SOURCE_PRIVATE_BALANCE = "Vanta private balance";
export const STRATEGY_FUNDING_SOURCE_PUBLIC_BALANCE = "Public wallet balance";
export const STRATEGY_FUNDING_SOURCE_CONNECTED_WALLET = "Connected wallet";
export const STRATEGY_DESTINATION_PRIVATE_BALANCE = "Vanta private balance";
export const STRATEGY_DESTINATION_CONNECTED_WALLET = "Connected wallet";
export const STRATEGY_DESTINATION_TREASURY_WALLET = "Treasury wallet";

export const strategyFundingSources = [
  STRATEGY_FUNDING_SOURCE_PRIVATE_BALANCE,
  STRATEGY_FUNDING_SOURCE_PUBLIC_BALANCE,
  STRATEGY_FUNDING_SOURCE_CONNECTED_WALLET,
] as const;
export const strategyDestinations = [
  STRATEGY_DESTINATION_PRIVATE_BALANCE,
  STRATEGY_DESTINATION_CONNECTED_WALLET,
  STRATEGY_DESTINATION_TREASURY_WALLET,
] as const;
export const strategyTimeWindows = ["6 hours", "24 hours", "7 days", STRATEGY_CUSTOM_TIME_WINDOW] as const;

export type StrategyCapabilityMode = "preview_only" | "eligible_to_create";
export type StrategyFundingSource = (typeof strategyFundingSources)[number];
export type StrategyDestination = (typeof strategyDestinations)[number];
export type StrategyTimeWindow = (typeof strategyTimeWindows)[number];
export type StrategyClientRequestIdInput = {
  destination: StrategyDestination;
  fundingSource: StrategyFundingSource;
  landingMode: string;
  maxSlippageBps: number;
  mode: string;
  pair: string;
  side: "Buy" | "Sell";
  slicePolicy: string;
  timeWindow: string;
  timingPolicy: string;
  totalNotional: number;
  urgency: string;
};

export type StrategyCapabilityState = {
  blockingIssues: string[];
  ctaLabel: string;
  destination: StrategyDestination;
  fundingSource: StrategyFundingSource;
  livePrerequisitesMet: boolean;
  mode: StrategyCapabilityMode;
  requiresPrivateFunding: boolean;
  submitDisabled: boolean;
};

export type StrategyCapabilityCopy = {
  actionHint: string;
};

export type StrategyResultState =
  | {
      kind: "local_plan_ready";
      summary: "This plan was created locally for review. Live execution is still off.";
      title: "Strategy plan ready";
    }
  | {
      kind: "scheduled_strategy";
      summary: "Your strategy settings were saved locally. Live trading still needs a separate launch flow.";
      title: "Strategy settings saved";
    };

const amountError = "Enter an amount to review this strategy.";
const slippageError = "Enter a valid max slippage percentage.";
const customDurationError = "Use a duration like 12 hours or 3 days.";
const strategyRequestIdVersion = "v4";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function parsePositiveNumber(rawValue: string): number | null {
  const normalized = rawValue.replace(/[$,%\s,]/gu, "");

  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseStrategyAmount(value: string): StrategyParsedNumber {
  const parsed = parsePositiveNumber(value);
  return parsed === null ? { error: amountError, value: null } : { error: null, value: parsed };
}

export function parseStrategySlippageBps(value: string): StrategyParsedNumber {
  const parsed = parsePositiveNumber(value);
  return parsed === null ? { error: slippageError, value: null } : { error: null, value: Math.round(parsed * 100) };
}

export function parseStrategyCustomDuration(value: string): StrategyParsedDuration {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|d|day|days)$/u);

  if (!match) {
    return { error: customDurationError, value: null };
  }

  const [, amount, unit] = match;
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { error: customDurationError, value: null };
  }

  const normalizedAmount = String(numericAmount);
  const isDayUnit = unit.startsWith("d");
  const singularUnit = isDayUnit ? "day" : "hour";
  const pluralUnit = isDayUnit ? "days" : "hours";
  const canonicalUnit = numericAmount === 1 ? singularUnit : pluralUnit;

  return { error: null, value: `${normalizedAmount} ${canonicalUnit}` };
}

export function createStrategyFormErrors(input: {
  amount: string;
  customTimeWindow: string;
  maxSlippage: string;
  timeWindow: StrategyTimeWindow;
}): {
  amount: string | null;
  customTimeWindow: string | null;
  maxSlippage: string | null;
} {
  return {
    amount: parseStrategyAmount(input.amount).error,
    customTimeWindow:
      input.timeWindow === STRATEGY_CUSTOM_TIME_WINDOW ? parseStrategyCustomDuration(input.customTimeWindow).error : null,
    maxSlippage: parseStrategySlippageBps(input.maxSlippage).error,
  };
}

export function createStrategyCapabilityState(input: {
  destination: StrategyDestination;
  fundingSource: StrategyFundingSource;
  hasErrors: boolean;
  isBetaMode: boolean;
}): StrategyCapabilityState {
  const blockingIssues: string[] = [];
  const livePrerequisitesMet = input.fundingSource === STRATEGY_FUNDING_SOURCE_PRIVATE_BALANCE;

  if (input.isBetaMode) {
    blockingIssues.push("Live execution is unavailable in this environment.");
  }

  if (input.fundingSource === STRATEGY_FUNDING_SOURCE_PUBLIC_BALANCE) {
    blockingIssues.push("Shield funds into your Vanta private balance before live execution.");
  }

  if (input.fundingSource === STRATEGY_FUNDING_SOURCE_CONNECTED_WALLET) {
    blockingIssues.push("Connect a wallet so Vanta knows which public wallet this choice means.");
  }

  const mode: StrategyCapabilityMode = input.isBetaMode || !livePrerequisitesMet ? "preview_only" : "eligible_to_create";

  return {
    blockingIssues,
    ctaLabel: "Review strategy settings",
    destination: input.destination,
    fundingSource: input.fundingSource,
    livePrerequisitesMet,
    mode,
    requiresPrivateFunding: input.fundingSource === STRATEGY_FUNDING_SOURCE_PUBLIC_BALANCE,
    submitDisabled: input.hasErrors,
  };
}

export function createStrategyClientRequestId(input: StrategyClientRequestIdInput): string {
  return `strategy_${strategyRequestIdVersion}_${stableJson({
    destination: input.destination,
    fundingSource: input.fundingSource,
    landingMode: input.landingMode,
    maxSlippageBps: input.maxSlippageBps,
    mode: input.mode,
    pair: input.pair,
    side: input.side,
    slicePolicy: input.slicePolicy,
    timeWindow: input.timeWindow,
    timingPolicy: input.timingPolicy,
    totalNotional: input.totalNotional,
    urgency: input.urgency,
  })}`;
}

export function createStrategyCapabilityCopy(input: {
  capabilityMode: StrategyCapabilityMode;
}): StrategyCapabilityCopy {
  if (input.capabilityMode === "preview_only") {
    return {
      actionHint: "Keep settings editable before any live execution is available.",
    };
  }

  return {
    actionHint: "Review source, route, and proceeds destination before any live run.",
  };
}

export function createStrategyResultState(input: {
  capabilityMode: StrategyCapabilityMode;
}): StrategyResultState {
  if (input.capabilityMode === "preview_only") {
    return {
      kind: "local_plan_ready",
      summary: "This plan was created locally for review. Live execution is still off.",
      title: "Strategy plan ready",
    };
  }

  return {
    kind: "scheduled_strategy",
    summary: "Your strategy settings were saved locally. Live trading still needs a separate launch flow.",
    title: "Strategy settings saved",
  };
}
