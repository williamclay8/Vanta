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
assert.match(packet.action.expectedActionRef, /^actual-private\/mainnet-settlement-evidence-run-\d{4}-\d{2}-\d{2}/);
assert.equal(packet.action.currentApprovalWindowRef, approvalStatus.approvalWindowRef);
assert.equal(packet.action.liveMainnetActionsAllowedNow, approvalStatus.liveMainnetActionsAllowedNow);
assert.equal(
  packet.action.stopConditionStatus.appliesToCurrentApproval,
  approvalStatus.stopCondition.appliesToCurrentApproval,
);
assert.match(packet.action.stopCondition, /stop after the first failed transaction/);
assert.equal(packet.action.expectedMaximumFundsAtRisk, "0.025 SOL");
assert.equal(packet.action.expectedMaximumFundsAtRiskLamports, 25_000_000);
assert.equal(packet.action.requiresFreshBoundedApprovalWindow, true);
assert.match(packet.approvalTextTemplate, /fresh exact date\/time range/);
assert.match(packet.approvalTextTemplate, /0\.025 SOL/);

assert.equal(packet.commands.preflight, "npm run mainnet:actual-private-settlement-live");
assert.equal(packet.commands.execute, "node scripts/run-vanta-actual-private-mainnet-settlement-evidence.mjs --live --execute");
assert.equal(packet.commands.executorCheck, packageJson.scripts["mainnet:actual-private-settlement-executor-check"]);
assert.equal(packet.commands.evidencePreview, packageJson.scripts["mainnet:actual-private-settlement-evidence-preview"]);

assert.equal(packet.requiredEnvironment.walletPublicKeyRef, "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF");
assert.equal(packet.requiredEnvironment.serviceRefs.length, 5);
for (const service of packet.requiredEnvironment.serviceRefs) {
  assert.match(service.urlValue, /^https:\/\/vanta-prod-private-pool-v2-/);
  assert.match(service.tokenRefValue, /_AUTH_TOKEN_REF$/);
}

assert.equal(packet.requiredEnvironment.planRefs.length, 14);
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

assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN")));
assert.ok(packet.shellExportTemplate.some((line) => line.includes("VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON")));

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
