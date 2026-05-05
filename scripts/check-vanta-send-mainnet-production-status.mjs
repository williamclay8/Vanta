import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaSendMainnetProductionStatus } from "../src/readiness/sendMainnetProductionStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const sendPageSource = readFileSync(resolve(repoRoot, "src/pages/SendPage.tsx"), "utf8");
const sendProofRequestSource = readFileSync(
  resolve(repoRoot, "src/privacy/privatePoolV2ProofRequests.ts"),
  "utf8",
);
const sendCircuitSource = readFileSync(
  resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry/src/main.nr"),
  "utf8",
);
const actualPrivateSpendCircuitSource = readFileSync(
  resolve(repoRoot, "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr"),
  "utf8",
);

const status = createVantaSendMainnetProductionStatus();

assert.equal(status.version, "vanta-send-mainnet-production-status-0.1");
assert.equal(status.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(status.mainnetReady, false);
assert.equal(status.productionReady, false);
assert.equal(status.privacyClaimAllowed, false);
assert.equal(status.status, "blocked");
assert.equal(status.localLaneCovered, true);
assert.equal(status.actualPrivateSpendCircuitCovered, true);
assert.equal(status.noFundsOperatorEndpointCovered, true);
assert.equal(status.liveSettlementProven, false);
assert.equal(status.exactSendApprovalScoped, false);
assert.equal(status.boundedApprovalActive, false);
assert.equal(status.privateCoreSendNoWitnessBoundaryCovered, true);
assert.equal(status.privateCoreSendProofArtifactCovered, true);
assert.equal(status.privateCoreOperatorStateRedacted, true);
assert.equal(status.statefulVerifierIndexerCommitIdempotencyProven, false);

const expectedBlockers = [
  "no-reviewed-live-mainnet-send-settlement-evidence",
  "no-exact-send-bounded-approval-window",
  ...(status.currentApproval.approvalWindowStatus === "active" ? [] : ["bounded-approval-window-expired"]),
  "stateful-verifier-indexer-commit-idempotency-not-proven",
  "no-proven-audited-shared-anonymity-set",
  "no-proven-live-mainnet-private-settlement-evidence",
  "no-third-party-audit",
];
for (const blocker of expectedBlockers) {
  assert.ok(status.blockers.includes(blocker), `Send mainnet production status missing blocker: ${blocker}`);
}

for (const [key, command] of Object.entries({
  actualPrivateSpendCircuit: "npm run private-pool-v2:actual-private-spend-circuit-check",
  mainnetPreflight: "npm run mainnet:preflight",
  privateSettlementStatus: "npm run --silent mainnet:private-settlement-status-json",
  publicTranscriptReview: "npm run private-pool-v2:production-privacy-reviewer-packet-check",
  sendLiveEvidenceContract: "npm run mainnet:send-live-evidence-contract-check",
  sendNoWitnessOperatorBoundary: "npm run private-core:send-operator-no-witness-check",
  sendNullifierReplayNoWitness: "npm run private-core:send-nullifier-replay-no-witness-check",
  sendOperatorRedaction: "npm run private-core:send-operator-redaction-check",
  sendProductionPrivacyClaimGate: "npm run send:production-privacy-claim-gate",
  sendProofArtifactConsistency: "npm run private-core:send-proof-artifact-consistency-check",
  privatePoolV2SendCircuit: "npm run private-pool-v2:send-circuit-check",
  privatePoolV2SendProofRequest: "npm run private-pool-v2:send-proof-request-check",
  privatePoolV2Verify: "npm run private-pool-v2:verify",
  realFundsApprovalStatus: "npm run --silent mainnet:real-funds-approval-status-json",
  sendBalanceLedger: "npm run send:balance-ledger-check",
  sendSafeSend: "npm run send:safe-send-adoption-check",
  sendTrustPacket: "npm run send:trust-packet-check",
  walletSigningStatus: "npm run mainnet:wallet-signing-status-check",
})) {
  assert.equal(status.evidenceRefs[key], command, `Send status evidence ref mismatch for ${key}.`);
}

for (const phrase of [
  "useVantaSafeSendTransaction",
  "sendNoteTransaction",
  "spentMarkerTransaction",
]) {
  assert.ok(sendPageSource.includes(phrase), `Send page must preserve ${phrase}.`);
}

for (const phrase of [
  "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID",
  "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS",
  "send-public-input-hash",
  "operatorVisibleTerms",
]) {
  assert.ok(sendProofRequestSource.includes(phrase), `Send proof request must preserve ${phrase}.`);
}

for (const phrase of [
  "compute_nullifier",
  "recipient_output_root",
  "change_output_root",
  "send_public_input_hash",
]) {
  assert.ok(sendCircuitSource.includes(phrase), `Send circuit must preserve ${phrase}.`);
}

for (const phrase of [
  "compute_root",
  "membership_path",
  "membership_path_direction_bits",
  "accepted_root",
  "private_spend_public_input_hash",
  "nullifier",
]) {
  assert.ok(
    actualPrivateSpendCircuitSource.includes(phrase),
    `Actual-private spend circuit must preserve ${phrase}.`,
  );
}

assert.equal(
  packageJson.scripts["mainnet:send-production-status"],
  "node scripts/print-vanta-send-mainnet-production-status.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:send-production-status-json"],
  "node scripts/print-vanta-send-mainnet-production-status.mjs --json",
);
assert.equal(
  packageJson.scripts["mainnet:send-production-status-check"],
  "node scripts/print-vanta-send-mainnet-production-status.mjs --check",
);
assert.equal(
  packageJson.scripts["mainnet:send-production-check"],
  "node scripts/check-vanta-send-mainnet-production-status.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:send-production-check"),
  "mainnet:preflight must include the Send production status check.",
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
]) {
  assert.ok(!serialized.includes(forbidden), `Send production status must not contain ${forbidden}.`);
}

console.log("Vanta Send mainnet production status check: PASS");
