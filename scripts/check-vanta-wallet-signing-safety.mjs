import { strict as assert } from "node:assert";
import { createVantaWalletSigningSafetyPolicy } from "../src/readiness/walletSigningSafety.mjs";

const policy = createVantaWalletSigningSafetyPolicy();

assert.equal(policy.version, "vanta-wallet-signing-safety-0.1");
assert.equal(policy.mainnetReady, false);
assert.equal(policy.liveMainnetSubmissionEnabled, false);
assert.equal(policy.requiresExplicitHumanApproval, true);
assert.equal(policy.requiresSimulationBeforeSignature, true);
assert.equal(policy.requiresTransactionSummaryBeforeSignature, true);
assert.equal(policy.neverStorePrivateKeys, true);
assert.equal(policy.defaultCluster, "devnet-or-localnet");
assert.ok(policy.requiredSummaryFields.includes("cluster"));
assert.ok(policy.requiredSummaryFields.includes("feePayer"));
assert.ok(policy.requiredSummaryFields.includes("recipient"));
assert.ok(policy.requiredSummaryFields.includes("amount"));
assert.ok(policy.requiredSummaryFields.includes("asset"));
assert.ok(policy.requiredSummaryFields.includes("estimatedFees"));
assert.ok(policy.blockedActions.includes("mainnet-submit-without-explicit-approval"));
assert.ok(policy.blockedActions.includes("private-key-or-seed-phrase-request"));
assert.ok(policy.blockedActions.includes("fresh-wallet-server-storage"));
assert.ok(policy.blockedActions.includes("blind-signing"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:signing-safety-check"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:browser-signing-safety-check"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:fresh-wallet-check"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:fresh-wallet-browser-check"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:transaction-safety-check"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:backed-simulation-check"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:live-send-inventory-check"));
assert.ok(policy.releaseGateCommands.includes("npm run wallet:safe-send-boundary-check"));

console.log("Vanta wallet signing safety check: PASS");
