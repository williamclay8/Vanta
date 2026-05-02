const STRATEGY_TRADING_LAB_VERSION = "vanta-strategy-trading-lab-0.1" as const;
const DETERMINISTIC_CREATED_AT = "1970-01-01T00:00:00.000Z" as const;

export const STRATEGY_CONFIDENCE_LABELS = [
  "No Signal",
  "Watch",
  "Low Confidence",
  "Medium Confidence",
  "High Confidence",
  "Actionable Recommendation",
] as const;

export type StrategyConfidenceLabel = (typeof STRATEGY_CONFIDENCE_LABELS)[number];

export type StrategySetupCardInput = {
  asset: string;
  evidenceRefs: string[];
  invalidation: string;
  maxAccountRiskBps: number;
  setupType: string;
  thesis: string;
  timeframe: string;
};

export type StrategySetupCard = StrategySetupCardInput & {
  createdAt: typeof DETERMINISTIC_CREATED_AT;
  id: string;
  liveSubmission: false;
  object: "strategy_trading_lab_setup_card";
  status: "paper_candidate";
  version: typeof STRATEGY_TRADING_LAB_VERSION;
};

export type StrategyAgentPolicyPacketInput = {
  allowedAssets: string[];
  approvalExpiresAt: string;
  humanApprovalRequired: boolean;
  maxNotional: number;
  maxSlippageBps: number;
  principalRef: string;
  routeQuoteCommitmentRefs: string[];
  simulationRef: string;
  strategyIntentRef: string;
  walletScope: string;
};

export type StrategyAgentPolicyPacket = StrategyAgentPolicyPacketInput & {
  createdAt: typeof DETERMINISTIC_CREATED_AT;
  liveSubmission: false;
  object: "strategy_agent_policy_packet";
  policyMode: "research_only";
  version: typeof STRATEGY_TRADING_LAB_VERSION;
};

export type StrategyAgentPolicyPacketValidation = {
  blockingIssues: string[];
  ok: boolean;
};

export type StrategySignalValidationGateInput = {
  backtestIncludesCosts: boolean;
  confidenceCalibrated: boolean;
  hasLiveShadowEvidence: boolean;
  hasPaperEvidence: boolean;
  humanApprovalPacketValid: boolean;
  leakageTestsPassed: boolean;
  minimumSampleSizeReached: boolean;
  pointInTimeData: boolean;
  productionReadinessGatesPassed: boolean;
  walkForwardValidated: boolean;
};

export type StrategySignalValidationGate = {
  blockingIssues: string[];
  canShowLiveSignal: boolean;
  canShowResearchView: boolean;
};

export type StrategyRecommendationLedgerEntryInput = {
  confidenceLabel: StrategyConfidenceLabel;
  evidenceRefs: string[];
  expectedValueBps: number;
  hasLiveShadowEvidence: boolean;
  hasPaperEvidence: boolean;
  probability: number;
  recommendationRef: string;
  setupId: string;
};

export type StrategyRecommendationLedgerEntry = StrategyRecommendationLedgerEntryInput & {
  actionable: boolean;
  createdAt: typeof DETERMINISTIC_CREATED_AT;
  liveSubmission: false;
  object: "strategy_recommendation_ledger_entry";
  recommendationMode: "research_only" | "paper_validated" | "manual_guidance_candidate";
  version: typeof STRATEGY_TRADING_LAB_VERSION;
};

export type StrategyPaperTradingLedgerEntry = {
  actualEntry: number;
  expectedEntry: number;
  invalidationRespected: boolean;
  outcome: "win" | "loss" | "flat";
  setupId: string;
  slippageBps: number;
};

export type StrategyPaperTradingLedgerSummary = {
  averageSlippageBps: number;
  lossCount: number;
  planAdherenceRate: number;
  totalPaperTrades: number;
  winCount: number;
};

export type StrategyConfidenceCalibrationEvent = {
  bucket: StrategyConfidenceLabel;
  predictedProbability: number;
  realizedWin: boolean;
};

export type StrategyConfidenceCalibrationBucket = {
  bucket: StrategyConfidenceLabel;
  calibrationError: number;
  predictedProbability: number;
  realizedWinRate: number;
  sampleCount: number;
};

export type StrategyLiveShadowDriftInput = {
  backtestExpectedValueBps: number;
  liveShadowExpectedValueBps: number;
  maxAllowedDriftBps: number;
  paperExpectedValueBps: number;
};

export type StrategyLiveShadowDriftSummary = {
  degraded: boolean;
  driftBps: number;
  driftStatus: "inside_tolerance" | "outside_tolerance";
};

export type StrategyModelScorecardInput = {
  calibrationEvents: StrategyConfidenceCalibrationEvent[];
  liveShadowDrift: StrategyLiveShadowDriftInput;
  modelId: string;
  paperTrades: StrategyPaperTradingLedgerEntry[];
  recommendationLedgerEntries?: StrategyRecommendationLedgerEntry[];
};

export type StrategyModelScorecardSummary = {
  actionableRecommendationCount: number;
  confidenceCalibration: StrategyConfidenceCalibrationBucket[];
  drift: StrategyLiveShadowDriftSummary;
  liveSubmission: false;
  modelId: string;
  object: "strategy_model_scorecard_summary";
  paperTrading: StrategyPaperTradingLedgerSummary;
  recommendationCount: number;
  status: "research_only" | "paper_validated" | "degraded";
  trustNotes: string[];
  version: typeof STRATEGY_TRADING_LAB_VERSION;
};

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

function hashId(prefix: string, value: unknown): string {
  let hash = 2166136261;
  const serialized = stableJson(value);

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${prefix}_${(hash >>> 0).toString(16)}`;
}

function roundMetric(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasEvidenceRefs(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isFilledString);
}

export function assertTradingLabPreviewOnly(record: { liveSubmission?: unknown }): void {
  if (record.liveSubmission !== false) {
    throw new Error("Trading Lab records must keep liveSubmission=false until production gates pass.");
  }
}

export function assertStrategySetupCardInput(input: StrategySetupCardInput): void {
  if (!isFilledString(input.invalidation) || !hasEvidenceRefs(input.evidenceRefs)) {
    throw new Error("Strategy setup cards require invalidation and at least one evidence ref.");
  }

  if (!isFilledString(input.thesis) || !isFilledString(input.asset) || !isFilledString(input.setupType)) {
    throw new Error("Strategy setup cards require asset, setup type, and thesis.");
  }

  if (!Number.isFinite(input.maxAccountRiskBps) || input.maxAccountRiskBps <= 0) {
    throw new Error("Strategy setup cards require a positive max account risk.");
  }
}

export function createStrategySetupCard(input: StrategySetupCardInput): StrategySetupCard {
  assertStrategySetupCardInput(input);

  return {
    ...input,
    createdAt: DETERMINISTIC_CREATED_AT,
    id: hashId("setup", input),
    liveSubmission: false,
    object: "strategy_trading_lab_setup_card",
    status: "paper_candidate",
    version: STRATEGY_TRADING_LAB_VERSION,
  };
}

export function createStrategyAgentPolicyPacket(
  input: StrategyAgentPolicyPacketInput,
): StrategyAgentPolicyPacket {
  const packet = {
    ...input,
    createdAt: DETERMINISTIC_CREATED_AT,
    liveSubmission: false,
    object: "strategy_agent_policy_packet",
    policyMode: "research_only",
    version: STRATEGY_TRADING_LAB_VERSION,
  } as const;

  assertStrategyAgentPolicyPacket(packet);
  return packet;
}

export function validateStrategyAgentPolicyPacket(packet: {
  liveSubmission?: unknown;
}): StrategyAgentPolicyPacketValidation {
  const blockingIssues: string[] = [];

  if (packet.liveSubmission !== false) {
    blockingIssues.push("Trading Lab policy packets must keep liveSubmission=false until production gates pass.");
  }

  if ("humanApprovalRequired" in packet && packet.humanApprovalRequired !== true) {
    blockingIssues.push("Trading Lab policy packets must require human approval.");
  }

  return {
    blockingIssues,
    ok: blockingIssues.length === 0,
  };
}

export function assertStrategyAgentPolicyPacket(packet: {
  allowedAssets?: unknown;
  humanApprovalRequired?: unknown;
  liveSubmission?: unknown;
  maxNotional?: unknown;
  maxSlippageBps?: unknown;
  principalRef?: unknown;
  routeQuoteCommitmentRefs?: unknown;
  simulationRef?: unknown;
  strategyIntentRef?: unknown;
  walletScope?: unknown;
}): void {
  const validation = validateStrategyAgentPolicyPacket(packet);

  if (!validation.ok) {
    throw new Error(validation.blockingIssues.join(" "));
  }

  if (
    !isFilledString(packet.principalRef) ||
    !isFilledString(packet.simulationRef) ||
    !isFilledString(packet.strategyIntentRef) ||
    !isFilledString(packet.walletScope)
  ) {
    throw new Error("Trading Lab policy packets require principal, wallet scope, simulation, and intent refs.");
  }

  if (!hasEvidenceRefs(packet.allowedAssets) || !hasEvidenceRefs(packet.routeQuoteCommitmentRefs)) {
    throw new Error("Trading Lab policy packets require allowed assets and route/quote commitment refs.");
  }

  if (!Number.isFinite(packet.maxNotional) || Number(packet.maxNotional) <= 0) {
    throw new Error("Trading Lab policy packets require a positive max notional.");
  }

  if (!Number.isFinite(packet.maxSlippageBps) || Number(packet.maxSlippageBps) <= 0) {
    throw new Error("Trading Lab policy packets require a positive max slippage.");
  }
}

export function evaluateStrategySignalValidationGate(
  input: StrategySignalValidationGateInput,
): StrategySignalValidationGate {
  const blockingIssues: string[] = [];

  if (!input.pointInTimeData) {
    blockingIssues.push("Point-in-time data integrity is required before promotion.");
  }

  if (!input.leakageTestsPassed) {
    blockingIssues.push("Leakage tests must pass before promotion.");
  }

  if (!input.walkForwardValidated) {
    blockingIssues.push("Walk-forward validation is required before promotion.");
  }

  if (!input.backtestIncludesCosts) {
    blockingIssues.push("Backtests must include fees, spread, slippage, and latency costs.");
  }

  if (!input.confidenceCalibrated) {
    blockingIssues.push("Confidence buckets must be calibrated before promotion.");
  }

  if (!input.minimumSampleSizeReached) {
    blockingIssues.push("Minimum signal sample size must be reached before promotion.");
  }

  if (!input.hasPaperEvidence) {
    blockingIssues.push("Paper trading evidence is required before live signal display.");
  }

  if (!input.hasLiveShadowEvidence) {
    blockingIssues.push("Live shadow evidence is required before limited manual guidance.");
  }

  if (!input.productionReadinessGatesPassed) {
    blockingIssues.push("Production readiness, audit, and mainnet gates must pass before live signal display.");
  }

  if (!input.humanApprovalPacketValid) {
    blockingIssues.push("A valid human approval policy packet is required before live signal display.");
  }

  return {
    blockingIssues,
    canShowLiveSignal: blockingIssues.length === 0,
    canShowResearchView: true,
  };
}

export function assertStrategyRecommendationLedgerEntryInput(
  input: StrategyRecommendationLedgerEntryInput,
): void {
  if (!STRATEGY_CONFIDENCE_LABELS.includes(input.confidenceLabel)) {
    throw new Error("Strategy recommendation ledger entries require a known confidence label.");
  }

  if (!hasEvidenceRefs(input.evidenceRefs)) {
    throw new Error("Strategy recommendation ledger entries require at least one evidence ref.");
  }

  if (!isFilledString(input.recommendationRef) || !isFilledString(input.setupId)) {
    throw new Error("Strategy recommendation ledger entries require recommendation and setup refs.");
  }

  if (!Number.isFinite(input.probability) || input.probability < 0 || input.probability > 1) {
    throw new Error("Strategy recommendation ledger entries require probability between 0 and 1.");
  }

  if (
    input.confidenceLabel === "Actionable Recommendation" &&
    (!input.hasPaperEvidence || !input.hasLiveShadowEvidence)
  ) {
    throw new Error("Actionable Recommendation requires paper and live-shadow evidence.");
  }

  if (
    input.confidenceLabel === "Actionable Recommendation" &&
    (!input.evidenceRefs.some((ref) => ref.startsWith("paper-ledger:")) ||
      !input.evidenceRefs.some((ref) => ref.startsWith("live-shadow:")))
  ) {
    throw new Error("Actionable Recommendation requires paper-ledger and live-shadow evidence refs.");
  }

  if (
    (input.confidenceLabel === "Medium Confidence" || input.confidenceLabel === "High Confidence") &&
    !input.hasPaperEvidence
  ) {
    throw new Error(`${input.confidenceLabel} requires paper evidence before promotion.`);
  }
}

export function createStrategyRecommendationLedgerEntry(
  input: StrategyRecommendationLedgerEntryInput,
): StrategyRecommendationLedgerEntry {
  assertStrategyRecommendationLedgerEntryInput(input);

  const actionable = input.confidenceLabel === "Actionable Recommendation";
  const recommendationMode =
    input.hasLiveShadowEvidence && input.hasPaperEvidence
      ? "manual_guidance_candidate"
      : input.hasPaperEvidence
        ? "paper_validated"
        : "research_only";

  return {
    ...input,
    actionable,
    createdAt: DETERMINISTIC_CREATED_AT,
    liveSubmission: false,
    object: "strategy_recommendation_ledger_entry",
    recommendationMode,
    version: STRATEGY_TRADING_LAB_VERSION,
  };
}

export function summarizeStrategyPaperTradingLedger(
  entries: StrategyPaperTradingLedgerEntry[],
): StrategyPaperTradingLedgerSummary {
  const totalPaperTrades = entries.length;
  const winCount = entries.filter((entry) => entry.outcome === "win").length;
  const lossCount = entries.filter((entry) => entry.outcome === "loss").length;
  const adherenceCount = entries.filter((entry) => entry.invalidationRespected).length;
  const slippageTotal = entries.reduce((sum, entry) => sum + entry.slippageBps, 0);

  return {
    averageSlippageBps: totalPaperTrades === 0 ? 0 : roundMetric(slippageTotal / totalPaperTrades),
    lossCount,
    planAdherenceRate: totalPaperTrades === 0 ? 0 : roundMetric(adherenceCount / totalPaperTrades),
    totalPaperTrades,
    winCount,
  };
}

export function summarizeStrategyConfidenceCalibration(
  events: StrategyConfidenceCalibrationEvent[],
): StrategyConfidenceCalibrationBucket[] {
  const byBucket = new Map<StrategyConfidenceLabel, StrategyConfidenceCalibrationEvent[]>();

  for (const event of events) {
    byBucket.set(event.bucket, [...(byBucket.get(event.bucket) ?? []), event]);
  }

  return Array.from(byBucket.entries())
    .map(([bucket, bucketEvents]) => {
      const sampleCount = bucketEvents.length;
      const predictedProbability =
        bucketEvents.reduce((sum, event) => sum + event.predictedProbability, 0) / sampleCount;
      const realizedWinRate =
        bucketEvents.filter((event) => event.realizedWin).length / sampleCount;

      return {
        bucket,
        calibrationError: roundMetric(Math.abs(predictedProbability - realizedWinRate)),
        predictedProbability: roundMetric(predictedProbability),
        realizedWinRate: roundMetric(realizedWinRate),
        sampleCount,
      };
    })
    .sort((left, right) => left.bucket.localeCompare(right.bucket));
}

export function summarizeStrategyLiveShadowDrift(
  input: StrategyLiveShadowDriftInput,
): StrategyLiveShadowDriftSummary {
  const driftBps = roundMetric(Math.abs(input.backtestExpectedValueBps - input.liveShadowExpectedValueBps));
  const degraded = driftBps > input.maxAllowedDriftBps;

  return {
    degraded,
    driftBps,
    driftStatus: degraded ? "outside_tolerance" : "inside_tolerance",
  };
}

export function summarizeStrategyModelScorecard(
  input: StrategyModelScorecardInput,
): StrategyModelScorecardSummary {
  const paperTrading = summarizeStrategyPaperTradingLedger(input.paperTrades);
  const confidenceCalibration = summarizeStrategyConfidenceCalibration(input.calibrationEvents);
  const drift = summarizeStrategyLiveShadowDrift(input.liveShadowDrift);
  const recommendationLedgerEntries = input.recommendationLedgerEntries ?? [];
  const actionableRecommendationCount = recommendationLedgerEntries.filter((entry) => entry.actionable).length;
  const hasPaperTrades = paperTrading.totalPaperTrades > 0;
  const trustNotes: string[] = [];

  if (paperTrading.totalPaperTrades === 0) {
    trustNotes.push("No paper trading evidence has been recorded.");
  }

  if (confidenceCalibration.length === 0) {
    trustNotes.push("No confidence calibration samples have been recorded.");
  }

  if (drift.degraded) {
    trustNotes.push("Live-shadow expected value drift is outside tolerance.");
  }

  if (actionableRecommendationCount > 0) {
    trustNotes.push("Actionable labels remain manual-guidance candidates, not live execution authority.");
  }

  const status =
    drift.degraded || (hasPaperTrades && paperTrading.planAdherenceRate < 0.5)
      ? "degraded"
      : hasPaperTrades && confidenceCalibration.length > 0
        ? "paper_validated"
        : "research_only";

  return {
    actionableRecommendationCount,
    confidenceCalibration,
    drift,
    liveSubmission: false,
    modelId: input.modelId,
    object: "strategy_model_scorecard_summary",
    paperTrading,
    recommendationCount: recommendationLedgerEntries.length,
    status,
    trustNotes,
    version: STRATEGY_TRADING_LAB_VERSION,
  };
}
