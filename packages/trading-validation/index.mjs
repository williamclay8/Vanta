export function summarizePaperLedger(entries) {
  const total = entries.length;
  const winCount = entries.filter((entry) => entry.outcome === "win").length;
  const lossCount = entries.filter((entry) => entry.outcome === "loss").length;
  const adherenceCount = entries.filter((entry) => entry.invalidationRespected).length;
  const slippageTotal = entries.reduce((sum, entry) => sum + entry.slippageBps, 0);

  return {
    averageSlippageBps: total === 0 ? 0 : Math.round((slippageTotal / total) * 100) / 100,
    lossCount,
    planAdherenceRate: total === 0 ? 0 : Math.round((adherenceCount / total) * 100) / 100,
    total,
    winCount,
  };
}

export function summarizeLiveShadowDrift(input) {
  const driftBps = Math.abs(input.backtestExpectedValueBps - input.liveShadowExpectedValueBps);

  return {
    degraded: driftBps > input.maxAllowedDriftBps,
    driftBps,
    status: driftBps > input.maxAllowedDriftBps ? "outside_tolerance" : "inside_tolerance",
  };
}

export function createSetupReview({ observation, policyState }) {
  return {
    asset: observation.symbol.replace("USDT", ""),
    blocker: policyState.blockers[0] ?? "All promotion gates passed.",
    mode: policyState.mode,
    observation: `${observation.rangeLabel}. ${observation.momentumLabel}.`,
    recommendation: policyState.canDisplayLiveGuidance ? "review_manually" : "research_only",
  };
}
