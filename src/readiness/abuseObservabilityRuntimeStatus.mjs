import { readFileSync } from "node:fs";

const evidencePath = new URL("../../ops/mainnet/abuse-observability.evidence.json", import.meta.url);

export function createVantaAbuseObservabilityRuntimeStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  return {
    checkedEvidenceRef: "ops/mainnet/abuse-observability.evidence.json",
    operatorEventSinkKind: evidence.operatorEventSinkKind,
    operatorEventSinkProductionReady: evidence.operatorEventSinkProductionReady,
    payRuntimeStatus: evidence.payRuntimeStatus,
    privatePoolV2PreferredRateLimiterKind: evidence.privatePoolV2RateLimiterPreferredKind,
    privatePoolV2RateLimiter: evidence.privatePoolV2Runtime?.rateLimiter ?? null,
    privatePoolV2RuntimeMatchesPreferredRateLimiter: evidence.privatePoolV2RuntimeMatchesPreferredRateLimiter,
    privatePoolV2RuntimeMode: evidence.privatePoolV2Runtime?.runtimeMode ?? null,
    privatePoolV2StorageKind: evidence.privatePoolV2Runtime?.storageKind ?? null,
    surfaceStatuses: evidence.surfaceStatuses,
    version: "vanta-production-abuse-observability-runtime-summary-0.1",
  };
}
