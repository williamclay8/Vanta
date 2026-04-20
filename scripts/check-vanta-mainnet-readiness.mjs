import { strict as assert } from "node:assert";
import { createVantaMainnetReadinessSnapshot } from "../src/readiness/mainnetReadiness.mjs";

const snapshot = createVantaMainnetReadinessSnapshot();

assert.equal(snapshot.version, "vanta-mainnet-readiness-0.1");
assert.equal(snapshot.mainnetReady, false, "Vanta must not report mainnet readiness while blockers remain.");
assert.equal(snapshot.productionReady, false, "Top-level productionReady must remain false before audit/mainnet gates.");
assert.equal(snapshot.decision, "blocked");
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
  snapshot.lanes.privatePoolV2.status === "local-benchmark",
  "Private Pool v2 should be represented as local benchmark infrastructure.",
);
assert.ok(
  snapshot.lanes.pay.status === "local-merchant-harness",
  "Pay should be represented as a local merchant harness.",
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
assert.ok(snapshot.requiredCommands.includes("npm run storage:adapter-check"), "Missing storage adapter command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:abuse-observability-check"),
  "Missing abuse/observability contract command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run ops:rate-limit-check"), "Missing rate-limit check command.");
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
  snapshot.requiredCommands.includes("npm run wallet:signing-safety-check"),
  "Missing wallet signing safety command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:transaction-safety-check"),
  "Missing transaction safety summary command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:secret-handling-check"),
  "Missing secret handling contract command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run audit:package-check"), "Missing audit package command.");
assert.ok(snapshot.nextActions[0]?.includes("external gates packet"), "First next action should push toward external gates.");

console.log("Vanta mainnet readiness check: PASS");
