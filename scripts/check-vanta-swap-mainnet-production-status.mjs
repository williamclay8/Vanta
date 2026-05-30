import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaSwapMainnetProductionStatus } from "../src/readiness/swapMainnetProductionStatus.mjs";
import { filterActiveBlockers } from "../src/readiness/operatorExternalGateSkips.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const swapPageSource = readFileSync(resolve(repoRoot, "src/pages/SwapPage.tsx"), "utf8");
const committedSettlementCheckSource = readFileSync(
  resolve(repoRoot, "scripts/check-vanta-swap-committed-settlement-bridge.mjs"),
  "utf8",
);
const trustPacketSource = readFileSync(
  resolve(repoRoot, "scripts/print-vanta-private-core-swap-trust-packet.mjs"),
  "utf8",
);

const status = createVantaSwapMainnetProductionStatus();

assert.equal(status.version, "vanta-swap-mainnet-production-status-0.1");
assert.equal(status.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(status.mainnetReady, false);
assert.equal(status.productionReady, false);
assert.equal(status.privacyClaimAllowed, false);
assert.equal(status.status, "blocked");
assert.equal(status.localLaneCovered, true);
assert.equal(status.localSwapProofBoundaryCovered, true);
assert.equal(status.committedSettlementCovered, true);
assert.equal(status.localAtomicMutationCovered, true);
assert.equal(status.noFundsOperatorEndpointCovered, true);
assert.equal(status.turnkeyLiquiditySignerDryRunCovered, true);
assert.equal(status.turnkeyLiquidityLiveSignerAdapterCovered, true);
assert.equal(status.quoteRoutePrivacyProven, false);
assert.equal(status.liveVenuePrivacyProven, false);
assert.equal(status.liveSettlementProven, false);
assert.equal(status.exactSwapApprovalScoped, false);
assert.equal(status.boundedApprovalActive, false);

const expectedBlockers = filterActiveBlockers([
  "no-exact-swap-bounded-approval-window",
  "swap-quote-route-privacy-not-production-proven",
  "swap-live-venue-privacy-not-production-proven",
  "no-reviewed-live-mainnet-swap-settlement-evidence",
  ...(status.currentApproval.approvalWindowStatus === "active" ? [] : ["bounded-approval-window-expired"]),
  "no-proven-audited-shared-anonymity-set",
  "no-proven-live-mainnet-private-settlement-evidence",
  "no-third-party-audit",
]);
for (const blocker of expectedBlockers) {
  assert.ok(status.blockers.includes(blocker), `Swap mainnet production status missing blocker: ${blocker}`);
}

for (const [key, command] of Object.entries({
  mainnetPreflight: "npm run mainnet:preflight",
  privateCoreVerify: "npm run private-core:verify",
  privatePoolV2Verify: "npm run private-pool-v2:verify",
  privateSettlementStatus: "npm run --silent mainnet:private-settlement-status-json",
  realFundsApprovalStatus: "npm run --silent mainnet:real-funds-approval-status-json",
  swapCircuit: "npm run private-pool-v2:swap-to-shielded-circuit-check",
  swapCommittedSettlement: "npm run swap:committed-settlement-check",
  swapLivePath: "npm run private-core:swap-live-path-check",
  swapProofRequest: "npm run private-pool-v2:swap-to-shielded-proof-request-check",
  swapTrustPacket: "npm run swap:trust-packet-check",
  turnkeyLiquiditySignerDryRun: "npm run swap:turnkey-liquidity-signer-dry-run-check",
  turnkeyLiquidityLiveSignerAdapter: "npm run swap:turnkey-liquidity-live-signer-adapter-check",
  walletSigningStatus: "npm run mainnet:wallet-signing-status-check",
})) {
  assert.equal(status.evidenceRefs[key], command, `Swap status evidence ref mismatch for ${key}.`);
}

for (const phrase of [
  "requestVantaPrivatePoolV2ProtocolSettlement",
  "createCommittedSwapSettlementTerms",
  'economicsMode: "committed-economics"',
  'proofReceipt?.intent !== "swap-to-shielded"',
]) {
  assert.ok(swapPageSource.includes(phrase), `Swap page must preserve ${phrase}.`);
}

assert.ok(
  committedSettlementCheckSource.includes("Committed Swap settlement request must not send raw"),
  "Swap committed-settlement check must guard against raw settlement fields.",
);
assert.ok(
  trustPacketSource.includes("atomic local verifier/indexer nullifier registration and output append"),
  "Swap trust packet must expose the checked local atomic mutation.",
);

assert.equal(
  packageJson.scripts["mainnet:swap-production-status"],
  "node scripts/print-vanta-swap-mainnet-production-status.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:swap-production-status-json"],
  "node scripts/print-vanta-swap-mainnet-production-status.mjs --json",
);
assert.equal(
  packageJson.scripts["mainnet:swap-production-status-check"],
  "node scripts/print-vanta-swap-mainnet-production-status.mjs --check",
);
assert.equal(
  packageJson.scripts["mainnet:swap-production-check"],
  "npm run swap:turnkey-liquidity-signer-dry-run-check && npm run swap:turnkey-liquidity-live-signer-adapter-check && node scripts/check-vanta-swap-mainnet-production-status.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:swap-production-check"),
  "mainnet:preflight must include the Swap production status check.",
);

const serialized = JSON.stringify(status);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
  "rawQuote",
]) {
  assert.ok(!serialized.includes(forbidden), `Swap production status must not contain ${forbidden}.`);
}

console.log("Vanta Swap mainnet production status check: PASS");
