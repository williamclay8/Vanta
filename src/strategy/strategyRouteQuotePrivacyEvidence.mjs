export const VANTA_STRATEGY_ROUTE_QUOTE_PRIVACY_EVIDENCE_VERSION =
  "vanta-strategy-route-quote-privacy-evidence-0.1";

const COMMITMENT_FIELD_PATTERN = /^(?:0x)?[0-9a-f]{64}$/u;
const RAW_ROUTE_QUOTE_FIELD_NAMES = new Set([
  "childNotional",
  "inputAmount",
  "notional",
  "outputAmount",
  "pair",
  "quote",
  "quoteHandle",
  "rawSchedule",
  "route",
  "routeHandle",
  "scheduledAtMinute",
  "timeWindow",
  "timingPolicy",
  "totalNotional",
  "venue",
]);

export function createStrategyRouteQuotePrivacyEvidence({ committedSettlementRequests }) {
  const leakedFieldPaths = [];
  const malformedCommitmentPaths = [];

  function inspect(value, path = "$") {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => inspect(entry, `${path}[${index}]`));
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    for (const [key, entry] of Object.entries(value)) {
      const childPath = `${path}.${key}`;

      if (RAW_ROUTE_QUOTE_FIELD_NAMES.has(key)) {
        leakedFieldPaths.push(childPath);
      }

      if ((key === "routeHandleCommitment" || key === "quoteHandleCommitment") && !COMMITMENT_FIELD_PATTERN.test(String(entry))) {
        malformedCommitmentPaths.push(childPath);
      }

      inspect(entry, childPath);
    }
  }

  inspect(committedSettlementRequests);

  const requests = Array.isArray(committedSettlementRequests?.requests)
    ? committedSettlementRequests.requests
    : [];
  const requestActions = requests.map((request) => request.action);
  const routeQuoteCommitmentOnly = leakedFieldPaths.length === 0 && malformedCommitmentPaths.length === 0;

  return {
    version: VANTA_STRATEGY_ROUTE_QUOTE_PRIVACY_EVIDENCE_VERSION,
    kind: "vanta-strategy-route-quote-privacy-evidence",
    evidenceScope: "local-committed-settlement-request-shape",
    productionPrivacyClaimAllowed: false,
    routeQuoteCommitmentOnly,
    requestActions,
    requestCount: requests.length,
    leakedFieldPaths,
    malformedCommitmentPaths,
    checkedFields: ["routeHandleCommitment", "quoteHandleCommitment"],
    blockedRawFields: Array.from(RAW_ROUTE_QUOTE_FIELD_NAMES).sort(),
  };
}
