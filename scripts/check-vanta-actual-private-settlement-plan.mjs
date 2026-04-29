import { strict as assert } from "node:assert";

import {
  createVantaActualPrivateSettlementPlan,
  validateVantaActualPrivateSettlementPlan,
} from "../src/mainnet/actualPrivateSettlementPlan.mjs";

const plan = createVantaActualPrivateSettlementPlan({
  acceptedRoot: "root:actual-private-demo",
  assetCohort: "stablecoin-usdc-v1",
  changeOutputCommitment: "commitment:change-output",
  economicsCommitment: "commitment:economics",
  nullifier: "nullifier:actual-private-demo",
  outputCommitment: "commitment:merchant-output",
  ownerCommitment: "commitment:owner",
  poolId: "pool:stablecoin-usdc-v1",
  privateSpendContextHash: "context:actual-private-demo",
  privateSpendPublicInputHash: "public-input-hash:actual-private-demo",
  routeCommitment: "commitment:route",
  settlementCommitment: "commitment:settlement",
  settlementId: "settlement:actual-private-demo",
});

assert.equal(plan.operatorEndpoint, "/private-pool-v2/protocol-settlements");
assert.equal(plan.request.action, "send");
assert.equal(plan.request.economicsMode, "committed-economics");
assert.equal(plan.request.assetCohort, "stablecoin-usdc-v1");
assert.equal(plan.request.nullifierOrReplayCommitment, "nullifier:actual-private-demo");
assert.deepEqual(validateVantaActualPrivateSettlementPlan(plan), {
  accepted: true,
  reason: "actual-private-settlement-plan-ready",
});

const serialized = JSON.stringify(plan);
for (const forbidden of [
  "\"amount\"",
  "\"asset\"",
  "\"destination\"",
  "\"owner\"",
  "inputCommitment",
  "inputLeafIndex",
  "merchantSettlementAddress",
  "payerSourceWallet",
  "sourceWallet",
  "rawAmount",
  "rawAsset",
]) {
  assert.ok(!serialized.includes(forbidden), `Actual-private settlement plan leaked forbidden term ${forbidden}.`);
}

const rejected = {
  ...plan,
  request: {
    ...plan.request,
    amount: "25",
  },
};

assert.equal(validateVantaActualPrivateSettlementPlan(rejected).accepted, false);
assert.match(validateVantaActualPrivateSettlementPlan(rejected).reason, /forbids request\.amount/);

console.log("Vanta actual-private settlement plan check: PASS");
