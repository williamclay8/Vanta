import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "scripts/print-vanta-actual-private-settlement-operator-packet.mjs");
const packagePath = resolve(repoRoot, "package.json");
const approvalStatus = createVantaMainnetRealFundsApprovalStatus();

const run = spawnSync("node", [packetPath], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(run.status, 0, run.stderr || run.stdout);
assert.equal(run.stderr, "");

const packet = JSON.parse(run.stdout);
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(packet.version, "vanta-actual-private-settlement-operator-packet-0.1");
assert.equal(packet.action.expectedActionRef, approvalStatus.approvalActionRef);
if (
  approvalStatus.approvalActionRef.startsWith("actual-private/mainnet-settlement-evidence-run-") ||
  approvalStatus.approvalActionRef.startsWith("actual-private/mainnet-shared-cohort-settlement-evidence-run-")
) {
  assert.equal(packet.action.actualPrivateActionScoped, true);
  assert.match(
    packet.action.expectedActionRef,
    /^actual-private\/mainnet-(?:shared-cohort-settlement|settlement)-evidence-run-\d{4}-\d{2}-\d{2}/,
  );
  assert.equal(packet.action.scopeBlocker, null);
} else {
  assert.equal(packet.action.actualPrivateActionScoped, false);
  assert.equal(packet.action.scopeBlocker, "approved-action-not-actual-private-settlement-scope");
}
assert.equal(packet.action.currentApprovalWindowRef, approvalStatus.approvalWindowRef);
assert.equal(packet.action.liveMainnetActionsAllowedNow, approvalStatus.liveMainnetActionsAllowedNow);
assert.equal(
  packet.action.stopConditionStatus.appliesToCurrentApproval,
  approvalStatus.stopCondition.appliesToCurrentApproval,
);
assert.match(packet.action.stopCondition, /stop after the first failed transaction/);
assert.equal(packet.action.expectedMaximumFundsAtRisk, approvalStatus.maximumFundsAtRiskRef);
assert.equal(packet.action.expectedMaximumFundsAtRiskLamports, parseSolLamports(approvalStatus.maximumFundsAtRiskRef));
assert.equal(packet.action.requiresFreshBoundedApprovalWindow, true);
assert.match(packet.approvalTextTemplate, /fresh exact date\/time range/);
assert.ok(packet.approvalTextTemplate.includes(approvalStatus.maximumFundsAtRiskRef));

assert.equal(packet.commands.preflight, "npm run mainnet:actual-private-settlement-live");
assert.equal(packet.commands.execute, "node scripts/run-vanta-actual-private-mainnet-settlement-evidence.mjs --live --execute");
assert.equal(packet.commands.executorCheck, packageJson.scripts["mainnet:actual-private-settlement-executor-check"]);
assert.equal(
  packet.commands.productionCapabilityCheck,
  packageJson.scripts["mainnet:actual-private-production-capability-check"],
);
assert.equal(packet.commands.evidencePreview, packageJson.scripts["mainnet:actual-private-settlement-evidence-preview"]);

assert.equal(packet.requiredEnvironment.walletPublicKeyRef, "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF");
assert.equal(packet.requiredEnvironment.serviceRefs.length, 5);
for (const service of packet.requiredEnvironment.serviceRefs) {
  assert.match(service.urlValue, /^https:\/\/vanta-prod-private-pool-v2-/);
  assert.match(service.tokenRefValue, /_AUTH_TOKEN_REF$/);
}
assert.deepEqual(packet.requiredEnvironment.publicSolanaSpendAccountRefs, {
  authorityRef: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY_REF",
  nullifierSetRef: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET_REF",
  outputQueueRef: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE_REF",
  poolStateRef: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE_REF",
  programIdRef: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID_REF",
});
assert.deepEqual(packet.requiredEnvironment.publicSolanaSpendRuntimeEnv, {
  authority: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY",
  nullifierSet: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET",
  outputQueue: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE",
  poolState: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE",
  programId: "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID",
});

assert.equal(packet.requiredEnvironment.planRefs.length, 18);
for (const planRef of packet.requiredEnvironment.planRefs) {
  assert.match(planRef.env, /^VANTA_ACTUAL_PRIVATE_[A-Z_]+_REF$/);
  assert.equal(typeof packet.settlementPlanJsonShape[planRef.field], "string");
}

assert.deepEqual(packet.requiredEnvironment.rawSecretPresenceOnly, ["VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"]);
assert.equal(packet.requiredEnvironment.rawPlanJsonPresenceOnly, "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON");
assert.equal(
  packet.requiredEnvironment.acknowledgements.VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK,
  "I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS",
);
assert.equal(
  packet.requiredEnvironment.acknowledgements.VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK,
  "I_UNDERSTAND_THIS_WILL_REQUEST_A_MAINNET_PRIVATE_SETTLEMENT",
);

assert.equal(
  packet.productionCapabilityGate.evidenceRef,
  "ops/mainnet/actual-private-production-capability.evidence.json",
);
assert.equal(packet.productionCapabilityGate.requiredStatusPath, "/state/private-pool-v2-status");
assert.equal(packet.productionCapabilityGate.requiredSendProofMode, "actual_private_spend_circuit_request");
assert.equal(packet.productionCapabilityGate.staleSendProofMode, "send_circuit_request");
assert.equal(packet.productionCapabilityGate.executeAllowedWhenStale, false);

assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY")));

const serialized = JSON.stringify(packet);
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
  assert.ok(!serialized.includes(forbidden), `Operator packet must not include ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-operator-packet"],
  "node scripts/print-vanta-actual-private-settlement-operator-packet.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-operator-packet-check"],
  "node scripts/check-vanta-actual-private-settlement-operator-packet.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-operator-packet-check"),
  "mainnet:preflight must include actual-private settlement operator packet check.",
);

console.log("Vanta actual-private settlement operator packet check: PASS");

function parseSolLamports(value) {
  const match = String(value).trim().match(/^(\d+)(?:\.(\d{1,9}))? SOL$/);
  assert.ok(match, "maximumFundsAtRiskRef must use '<amount> SOL' with at most 9 decimal places.");
  const [, whole, fraction = ""] = match;
  return Number(BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0")));
}
