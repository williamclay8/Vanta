import { execFileSync, spawnSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaActualPrivateSettlementLiveDataPacket } from "../src/mainnet/actualPrivateSettlementLiveDataProducer.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.ok(existsSync(resolve(repoRoot, "src/mainnet/actualPrivateSettlementLiveDataProducer.mjs")));
assert.ok(existsSync(resolve(repoRoot, "scripts/print-vanta-actual-private-settlement-live-data.mjs")));
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-live-data"],
  "node scripts/print-vanta-actual-private-settlement-live-data.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-live-data-check"],
  "node scripts/check-vanta-actual-private-settlement-live-data.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-live-data-check"),
  "mainnet:preflight must include actual-private settlement live-data check.",
);

const statusPacket = createVantaActualPrivateSettlementLiveDataPacket({
  env: {},
});
assert.equal(statusPacket.liveReady, false);
assert.equal(statusPacket.demoDerived, false);
assert.equal(statusPacket.claimBoundary, "no-live-data-source-ref");
assert.deepEqual(statusPacket.missingLiveInputs, [
  "VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF",
  "VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION",
]);
assert.equal(statusPacket.plan, null);
assert.equal(statusPacket.safety.movesFunds, false);
assert.equal(statusPacket.safety.submitsTransactions, false);

const fixturePlanJson = JSON.stringify({
  acceptedRoot: "0x" + "11".repeat(32),
  assetCohort: "stablecoin-usdc-v1",
  assetIdCommitment: "0x" + "22".repeat(32),
  changeOutputCommitment: "0x" + "33".repeat(32),
  economicsCommitment: "0x" + "44".repeat(32),
  nullifier: "0x" + "55".repeat(32),
  outputCommitment: "0x" + "66".repeat(32),
  ownerCommitment: "0x" + "77".repeat(32),
  poolId: "pool:stablecoin-usdc-v1:100",
  privateSpendContextHash: "0x" + "88".repeat(32),
  privateSpendPublicInputHash: "0x" + "99".repeat(32),
  routeCommitment: "0x" + "aa".repeat(32),
  settlementCommitment: "0x" + "bb".repeat(32),
  settlementId: "settlement:fixture",
});
const liveSourceWithoutPlan = createVantaActualPrivateSettlementLiveDataPacket({
  env: {
    VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF: "operator-live-data:fixture",
    VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION: "base64:AQIDBA==",
  },
});
assert.equal(liveSourceWithoutPlan.liveReady, false);
assert.equal(liveSourceWithoutPlan.plan, null);
const liveSourceWithPlan = createVantaActualPrivateSettlementLiveDataPacket({
  env: {
    VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF: "operator-live-data:fixture",
    VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION: "base64:AQIDBA==",
    VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON: fixturePlanJson,
  },
});
assert.equal(liveSourceWithPlan.liveReady, true);
assert.equal(liveSourceWithPlan.claimBoundary, "live-source-ref-and-plan-json-present-operator-reviewed");
assert.equal(liveSourceWithPlan.plan.request.relayerSerializedTransaction, "base64:AQIDBA==");

const demoPacket = createVantaActualPrivateSettlementLiveDataPacket({
  env: {
    VANTA_ACTUAL_PRIVATE_LIVE_DATA_ALLOW_DEMO: "true",
    VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF:
      "5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi",
    VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION: `base64:${Buffer.from([1, 2, 3, 4]).toString("base64")}`,
  },
  mode: "demo",
});
assert.equal(demoPacket.liveReady, false);
assert.equal(demoPacket.demoDerived, true);
assert.equal(demoPacket.claimBoundary, "demo-derived-plan-terms-not-live-settlement-evidence");
assert.equal(demoPacket.plan.request.action, "send");
assert.equal(demoPacket.plan.request.economicsMode, "committed-economics");
assert.equal(demoPacket.plan.request.relayerSerializedTransaction, "base64:AQIDBA==");
for (const forbidden of [
  "\"amount\"",
  "\"rawAmount\"",
  "\"rawAsset\"",
  "\"destination\"",
  "sourceWallet",
  "payerSourceWallet",
  "merchantSettlementAddress",
  "privateKey",
  "seedPhrase",
]) {
  assert.equal(JSON.stringify(demoPacket.plan.request).includes(forbidden), false);
}

const redactedOutput = execFileSync("npm", ["run", "--silent", "mainnet:actual-private-settlement-live-data", "--", "--demo"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_LIVE_DATA_ALLOW_DEMO: "true",
    VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION: "base64:AQIDBA==",
  },
});
const redacted = JSON.parse(redactedOutput);
assert.equal(redacted.plan.requestFieldCount, 21);
assert.equal(JSON.stringify(redacted).includes("base64:AQIDBA=="), false);
assert.equal(JSON.stringify(redacted).includes("nullifierOrReplayCommitment"), false);

const blockedExport = spawnSync(
  "npm",
  ["run", "--silent", "mainnet:actual-private-settlement-live-data", "--", "--demo", "--export"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      VANTA_ACTUAL_PRIVATE_LIVE_DATA_ALLOW_DEMO: "true",
      VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION: "base64:AQIDBA==",
    },
  },
);
assert.notEqual(blockedExport.status, 0, "Demo export must require explicit --allow-demo-export.");
assert.match(blockedExport.stderr, /Refusing to export demo-derived settlement data/);

console.log("Vanta actual-private settlement live-data producer check: PASS");
