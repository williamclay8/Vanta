import { strict as assert } from "node:assert";
import { createVantaMainnetReadinessSnapshot } from "../src/readiness/mainnetReadiness.mjs";

const snapshot = createVantaMainnetReadinessSnapshot();

assert.equal(snapshot.version, "vanta-mainnet-readiness-0.1");
assert.equal(snapshot.mainnetReady, false, "Vanta must not report mainnet readiness while blockers remain.");
assert.equal(snapshot.productionReady, false, "Top-level productionReady must remain false before audit/mainnet gates.");
assert.equal(snapshot.decision, "blocked");
assert.equal(snapshot.privacyRail.activeRailId, "alpha-public-warning");
assert.equal(snapshot.privacyRail.meaningfulPrivacyReady, false);
assert.equal(snapshot.privacyRail.activeRail.canClaimMeaningfulPrivacy, false);
assert.ok(snapshot.privacyRail.userFacingRule.includes("Do not claim meaningful privacy"));
assert.ok(snapshot.score >= 0 && snapshot.score <= 100, "Readiness score must be a percentage.");
assert.ok(snapshot.blockers.length >= 8, "Mainnet readiness must enumerate concrete blockers.");
assert.ok(
  snapshot.blockers.some((blocker) => blocker.id === "real-mainnet-private-settlement"),
  "Missing private-settlement blocker.",
);
assert.ok(
  snapshot.blockers.some((blocker) => blocker.id === "third-party-security-audit"),
  "Missing audit blocker.",
);
assert.ok(
  snapshot.blockers.some((blocker) => blocker.id === "secure-key-secret-handling"),
  "Missing key/secret blocker.",
);
assert.ok(
  snapshot.blockers.some((blocker) => blocker.id === "no-mainnet-funds-without-explicit-approval"),
  "Missing mainnet funds approval blocker.",
);
assert.ok(
  snapshot.lanes.privateCore.status === "verified-local",
  "Private Core should be represented as locally verified, not mainnet complete.",
);
assert.ok(
  snapshot.lanes.privatePoolV2.status === "staging-render-postgres",
  "Private Pool v2 should be represented as staging Render/Postgres infrastructure.",
);
assert.ok(
  snapshot.lanes.privatePoolV2.truth.includes("Render") &&
    snapshot.lanes.privatePoolV2.truth.includes("postgres-jsonb-snapshot-store") &&
    snapshot.lanes.privatePoolV2.truth.includes("not a deployed shared anonymity set"),
  "Private Pool v2 truth must mention staging Render/Postgres and preserve non-production limits.",
);
assert.ok(
  snapshot.lanes.pay.status === "staging-render-pay",
  "Pay should be represented as a staging Render Pay deployment.",
);
assert.ok(
  snapshot.lanes.pay.truth.includes("Render") &&
    snapshot.lanes.pay.truth.includes("postgres-jsonb-snapshot-store") &&
    snapshot.lanes.pay.truth.includes("not a production processor"),
  "Pay truth must mention staging Render/Postgres and preserve non-production limits.",
);
assert.ok(
  snapshot.lanes.strategy.status === "local-planning-runtime",
  "Strategy should be represented as a local planning/runtime lane.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run private-core:verify"),
  "Missing private-core verification command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run private-pool-v2:verify"),
  "Missing private-pool-v2 verification command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run private-pool-v2:role-storage-check"),
  "Missing Private Pool v2 role storage verification command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:service-contract-check"),
  "Missing production service contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:service-topology-check"),
  "Missing production service topology command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:storage-contract-check"),
  "Missing production storage contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:storage-migration-check"),
  "Missing production storage migration command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:backup-restore-check"),
  "Missing production backup/restore check command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run storage:adapter-check"), "Missing storage adapter command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:abuse-observability-check"),
  "Missing abuse/observability contract command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run ops:rate-limit-check"), "Missing rate-limit check command.");
assert.ok(snapshot.requiredCommands.includes("npm run ops:safe-telemetry-check"), "Missing safe telemetry check command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:production-service-setup-check"),
  "Missing production service setup check command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run privacy-rail:contract-check"),
  "Missing privacy rail contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:observability-sink-check"),
  "Missing production observability sink check command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run nullifier:replay-guard-check"),
  "Missing nullifier replay guard command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run mainnet:preflight"), "Missing mainnet preflight command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:external-gates-check"),
  "Missing external gates packet command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:deployment-manifest-check"),
  "Missing deployment manifest command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:private-pool-v2-production-smoke-check"),
  "Missing Private Pool v2 production smoke template command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:signing-safety-check"),
  "Missing wallet signing safety command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:browser-signing-safety-check"),
  "Missing browser-backed wallet signing safety command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:transaction-safety-check"),
  "Missing transaction safety summary command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:secret-handling-check"),
  "Missing secret handling contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:approval-gates-check"),
  "Missing approval gates command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run audit:package-check"), "Missing audit package command.");
assert.ok(snapshot.nextActions[0]?.includes("external gates packet"), "First next action should push toward external gates.");
assert.ok(
  snapshot.nextActions.some((action) => action.includes("production log sources")),
  "Next actions must include production log source setup.",
);
assert.ok(
  snapshot.nextActions.some((action) => action.includes("backup")),
  "Next actions must include backup/restore evidence setup.",
);

console.log("Vanta mainnet readiness check: PASS");
