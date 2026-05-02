export const tradingLabPolicyWarnings = [
  "Educational market research only.",
  "This is not personalized investment advice.",
  "No live signals or trade execution are enabled.",
  "Exchange data may be delayed, unavailable, or differ from other venues.",
];

export function createTradingLabPolicyState(input = {}) {
  const blockers = [];

  if (!input.validatedStrategyModel) {
    blockers.push("No validated strategy model for this live snapshot.");
  }

  if (!input.paperLedgerReady) {
    blockers.push("No typed paper-trading ledger evidence for this setup.");
  }

  if (!input.liveShadowReady) {
    blockers.push("No live-shadow reconciliation for this setup.");
  }

  if (!input.humanApprovalPacket) {
    blockers.push("No human approval packet.");
  }

  if (!input.executionIntegrationReady) {
    blockers.push("No execution integration is enabled.");
  }

  return {
    blockers,
    canDisplayLiveGuidance: blockers.length === 0,
    mode: blockers.length === 0 ? "manual_guidance_candidate" : "research_only",
    warnings: tradingLabPolicyWarnings,
  };
}

export function assertNoAdviceCopy(copy) {
  const banned = [
    "buy now",
    "sell now",
    "guaranteed",
    "best trade",
    "follow this signal",
    "live signal to trade",
  ];
  const lower = copy.toLowerCase();
  const hit = banned.find((phrase) => lower.includes(phrase));

  if (hit) {
    throw new Error(`Trading Lab copy must not include advice-like phrase: ${hit}`);
  }
}
