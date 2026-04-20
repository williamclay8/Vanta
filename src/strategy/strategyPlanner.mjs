const FUNDING_ACTIONS = {
  "External wallet": "connect-external-wallet",
  "Private balance": "use-private-balance",
  "Public balance": "move-to-private-before-execution",
};

const HOURS_BY_WINDOW = {
  "6 hours": 6,
  "24 hours": 24,
  "7 days": 168,
  Custom: 24,
};

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let state = hashSeed(seed) || 1;

  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function parseWindowHours(timeWindow) {
  if (HOURS_BY_WINDOW[timeWindow]) {
    return HOURS_BY_WINDOW[timeWindow];
  }

  const customWindow = String(timeWindow).trim().toLowerCase();
  const match = customWindow.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|d|day|days)$/u);

  if (!match) {
    return 24;
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(value) || value <= 0) {
    return 24;
  }

  return unit.startsWith("d") ? value * 24 : value;
}

function chooseSliceCount(input) {
  const hours = parseWindowHours(input.timeWindow);

  if (input.mode === "Private TWAP") {
    return Math.max(6, Math.min(96, Math.round(hours)));
  }

  if (input.urgency === "Fastest completion") {
    return Math.max(6, Math.min(72, Math.round(hours * 3)));
  }

  if (input.urgency === "Balanced") {
    return Math.max(6, Math.min(64, Math.round(hours * 1.5)));
  }

  return Math.max(6, Math.min(48, Math.round(hours)));
}

function createChildWeights(count, randomized, random) {
  if (!randomized) {
    return Array.from({ length: count }, () => 1);
  }

  return Array.from({ length: count }, () => 0.7 + random() * 0.6);
}

function createChildOrders(input, count, random) {
  const hours = parseWindowHours(input.timeWindow);
  const randomizedSize = input.slicePolicy === "Randomized sizing";
  const randomizedCadence = input.timingPolicy === "Randomized cadence";
  const weights = createChildWeights(count, randomizedSize, random);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const baseIntervalMinutes = (hours * 60) / count;
  let scheduledAtMinute = 0;

  const orders = weights.map((weight, index) => {
    const jitter = randomizedCadence ? (random() - 0.5) * baseIntervalMinutes * 0.56 : 0;
    scheduledAtMinute = Math.max(index === 0 ? 1 : scheduledAtMinute + 1, index * baseIntervalMinutes + jitter);

    return {
      index: index + 1,
      notional: roundMoney((input.totalNotional * weight) / totalWeight),
      scheduledAtMinute: Math.max(1, Math.round(scheduledAtMinute)),
    };
  });

  const reconciledTotal = orders.reduce((sum, order) => sum + order.notional, 0);
  orders[orders.length - 1].notional = roundMoney(
    orders[orders.length - 1].notional + input.totalNotional - reconciledTotal,
  );

  return orders;
}

export function createStrategyPlan(input) {
  if (!Number.isFinite(input.totalNotional) || input.totalNotional <= 0) {
    throw new Error("totalNotional must be positive before strategy execution");
  }

  if (!Number.isFinite(input.maxSlippageBps) || input.maxSlippageBps <= 0) {
    throw new Error("maxSlippageBps must be positive before strategy execution");
  }

  const random = createRandom(
    [
      input.seed,
      input.mode,
      input.side,
      input.pair,
      input.totalNotional,
      input.timeWindow,
      input.slicePolicy,
      input.timingPolicy,
    ].join(":"),
  );
  const childOrders = createChildOrders(input, chooseSliceCount(input), random);
  const protectedLanding =
    input.landingMode === "Protected landing" || input.landingMode === "Bundle-preferred";

  return {
    id: `strat_${hashSeed(`${input.seed}:${input.pair}:${input.totalNotional}`).toString(16)}`,
    averageChildSize: roundMoney(input.totalNotional / childOrders.length),
    childOrders,
    fundingAction: FUNDING_ACTIONS[input.fundingSource] ?? "connect-external-wallet",
    guardrails: {
      deferWhenRouteQualityTooPoor: true,
      maxSlippageBps: input.maxSlippageBps,
      skipIntervalWhenSlippageExceeded: true,
    },
    mode: input.mode,
    pair: input.pair,
    routingPolicy: {
      allowRfq: input.mode === "Private TWAP" || input.urgency !== "Low footprint",
      destination: input.destination,
      protectedLanding,
      routeControl: "quote-build-submit",
      routeEngine: "Jupiter",
    },
    side: input.side,
    totalNotional: input.totalNotional,
    windowHours: parseWindowHours(input.timeWindow),
  };
}
