const ADAPTER_VERSION = "vanta-strategy-execution-adapter-0.1";

function toAssetPair(pair) {
  const [source, target] = pair.split("->").map((part) => part.trim());
  return {
    sourceAsset: source || "UNKNOWN",
    targetAsset: target || "UNKNOWN",
  };
}

function createFundingStep(plan) {
  return {
    kind: plan.fundingAction,
    requiredBeforeFirstChild: plan.fundingAction !== "use-private-balance",
    status: plan.fundingAction === "use-private-balance" ? "ready" : "required",
  };
}

function createDestinationSettlement(plan) {
  if (plan.routingPolicy.destination === "Private balance") {
    return {
      kind: "settle-acquired-asset-private",
      status: "planned",
    };
  }

  if (plan.routingPolicy.destination === "Treasury vault") {
    return {
      kind: "settle-acquired-asset-treasury",
      status: "planned",
    };
  }

  return {
    kind: "settle-acquired-asset-public",
    status: "planned",
  };
}

function resolveFallback({ currentSlippageBps, plan, protectedLandingAvailable, protectedLandingPolicy, routeQuality }) {
  if (routeQuality === "poor" && plan.guardrails.deferWhenRouteQualityTooPoor) {
    return {
      action: "defer",
      reason: "Route quality below strategy threshold.",
      status: "deferred",
    };
  }

  if (currentSlippageBps > plan.guardrails.maxSlippageBps && plan.guardrails.skipIntervalWhenSlippageExceeded) {
    return {
      action: "skip",
      reason: "Current slippage exceeds strategy max.",
      status: "skipped",
    };
  }

  if (plan.routingPolicy.protectedLanding && !protectedLandingAvailable) {
    if (protectedLandingPolicy === "downgrade") {
      return {
        action: "downgrade-landing",
        reason: "Protected landing unavailable; using standard landing for this child order.",
        status: "ready",
      };
    }

    return {
      action: "retry-protected-landing",
      reason: "Protected landing unavailable; waiting for protected lane.",
      status: "deferred",
    };
  }

  return {
    action: "execute",
    reason: "Strategy guardrails satisfied.",
    status: "ready",
  };
}

function createLanding(plan, fallback, protectedLandingAvailable) {
  if (
    !plan.routingPolicy.protectedLanding ||
    fallback.action === "downgrade-landing" ||
    (!protectedLandingAvailable && fallback.action !== "retry-protected-landing")
  ) {
    return {
      mode: "standard",
      transport: "standard-rpc",
    };
  }

  return {
    mode: "protected",
    transport: "Jito",
  };
}

function createChildJob(plan, childOrder, options) {
  const fallback = resolveFallback({ plan, ...options });
  const landing = createLanding(plan, fallback, options.protectedLandingAvailable);
  const { sourceAsset, targetAsset } = toAssetPair(plan.pair);

  return {
    id: `${plan.id}:child:${childOrder.index}`,
    childIndex: childOrder.index,
    fallback,
    landing,
    notional: childOrder.notional,
    route: {
      allowRfq: plan.routingPolicy.allowRfq,
      control: plan.routingPolicy.routeControl,
      engine: plan.routingPolicy.routeEngine,
      sourceAsset,
      targetAsset,
    },
    scheduledAtMinute: childOrder.scheduledAtMinute,
    settlement: {
      destination: plan.routingPolicy.destination,
      required: true,
    },
    status: fallback.status,
  };
}

export function createStrategyExecutionPreview(
  plan,
  {
    currentSlippageBps = 0,
    protectedLandingAvailable = true,
    protectedLandingPolicy = "retry",
    routeQuality = "healthy",
  } = {},
) {
  return {
    version: ADAPTER_VERSION,
    destinationSettlement: createDestinationSettlement(plan),
    fundingStep: createFundingStep(plan),
    childJobs: plan.childOrders.map((childOrder) =>
      createChildJob(plan, childOrder, {
        currentSlippageBps,
        protectedLandingAvailable,
        protectedLandingPolicy,
        routeQuality,
      }),
    ),
    liveSubmission: false,
    planId: plan.id,
    safety: {
      requiresWalletApprovalBeforeLiveSubmit: true,
      simulateBeforeSubmit: true,
    },
  };
}
