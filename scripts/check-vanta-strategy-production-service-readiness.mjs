import { strict as assert } from "node:assert";
import { createStrategyProductionServiceReadiness } from "../src/strategy/strategyProductionServiceReadiness.mjs";

const blocked = createStrategyProductionServiceReadiness({
  durableTables: ["strategies", "strategy_child_orders"],
  envRefs: {
    VANTA_STRATEGY_OPERATOR_AUTH_TOKEN_REF: "doppler:vanta/strategy/operator-auth",
  },
  evidenceRefs: {
    "strategy-production-service-ref": "render:vanta-strategy-production-pending",
  },
  localOperatorQueueReady: true,
  schedulerDrainPreviewReady: true,
});

assert.equal(blocked.version, "vanta-strategy-production-service-readiness-0.1");
assert.equal(blocked.kind, "vanta-strategy-production-service-readiness");
assert.equal(blocked.failClosed, true);
assert.equal(blocked.gateCommand, "npm run strategy:production-service-readiness-check");
assert.equal(blocked.localOperatorQueueReady, true);
assert.equal(blocked.schedulerDrainPreviewReady, true);
assert.equal(blocked.durableProductionServiceReady, false);
assert.equal(blocked.liveStrategySchedulerReady, false);
assert.equal(blocked.liveSubmissionAllowed, false);
assert.equal(blocked.productionReady, false);
assert.equal(blocked.mainnetReady, false);
assert.ok(blocked.missingEnvRefs.includes("VANTA_STRATEGY_DATABASE_URL_REF"));
assert.ok(blocked.missingEnvRefs.includes("VANTA_PRIVATE_POOL_V2_OPERATOR_URL_REF"));
assert.ok(blocked.missingDurableTables.includes("strategy_funding_events"));
assert.ok(blocked.missingDurableTables.includes("strategy_fills"));
assert.ok(blocked.missingEvidenceRefs.includes("strategy-scheduler-restart-replay"));
assert.ok(blocked.missingEvidenceRefs.includes("strategy-live-submission-approval"));
assert.ok(blocked.blockers.some((blocker) => blocker.startsWith("missing-env-ref:")));
assert.ok(blocked.blockers.some((blocker) => blocker.startsWith("missing-durable-table:")));
assert.ok(blocked.blockers.some((blocker) => blocker.startsWith("missing-evidence-ref:")));

const fullyReferencedButStillExternal = createStrategyProductionServiceReadiness({
  durableTables: [
    "strategies",
    "strategy_funding_events",
    "strategy_child_orders",
    "strategy_fills",
    "strategy_execution_attempts",
    "strategy_disclosures",
  ],
  envRefs: Object.fromEntries(
    blocked.requiredEnvRefs.map((ref) => [ref, `ref:${ref.toLowerCase()}`]),
  ),
  evidenceRefs: Object.fromEntries(
    blocked.requiredEvidenceRefs.map((ref) => [ref, `evidence:${ref}`]),
  ),
  localOperatorQueueReady: true,
  schedulerDrainPreviewReady: true,
});

assert.deepEqual(fullyReferencedButStillExternal.missingEnvRefs, []);
assert.deepEqual(fullyReferencedButStillExternal.missingDurableTables, []);
assert.deepEqual(fullyReferencedButStillExternal.missingEvidenceRefs, []);
assert.deepEqual(fullyReferencedButStillExternal.blockers, []);
assert.equal(fullyReferencedButStillExternal.durableProductionServiceReady, false);
assert.equal(fullyReferencedButStillExternal.liveSubmissionAllowed, false);
assert.equal(fullyReferencedButStillExternal.productionReady, false);
assert.equal(fullyReferencedButStillExternal.mainnetReady, false);

console.log("Vanta Strategy production service readiness check: PASS");
