import { strict as assert } from "node:assert";

import {
  createVantaActualPrivateSettlementPlan,
  validateVantaActualPrivateSettlementPlan,
} from "../src/mainnet/actualPrivateSettlementPlan.mjs";

const plan = createVantaActualPrivateSettlementPlan({
  acceptedRoot: "root:actual-private-demo",
  assetCohort: "stablecoin-usdc-v1",
  assetIdCommitment: "commitment:asset-id",
  changeLeafIndex: "43",
  changeOutputCommitment: "commitment:change-output",
  changeOutputRoot: "root:change-output",
  economicsCommitment: "commitment:economics",
  nullifier: "nullifier:actual-private-demo",
  outputCommitment: "commitment:merchant-output",
  outputLeafIndex: "42",
  outputRoot: "root:merchant-output",
  ownerCommitment: "commitment:owner",
  poolId: "pool:stablecoin-usdc-v1",
  privateSpendContextHash: "context:actual-private-demo",
  privateSpendPublicInputHash: "public-input-hash:actual-private-demo",
  routeCommitment: "commitment:route",
  settlementCommitment: "commitment:settlement",
  settlementId: "settlement:actual-private-demo",
});
const relayerSerializedTransaction = `base64:${Buffer.from([1, 2, 3, 4]).toString("base64")}`;
const planWithRelayerTransaction = createVantaActualPrivateSettlementPlan({
  ...plan.request,
  nullifier: plan.request.nullifierOrReplayCommitment,
  privateSpendContextHash: plan.request.privateSpendContextHash,
  privateSpendPublicInputHash: plan.request.privateSpendPublicInputHash,
  relayerSerializedTransaction,
});
const unshieldPlan = createVantaActualPrivateSettlementPlan({
  action: "unshield",
  assetCohort: "stablecoin-usdc-v1",
  assetIdCommitment: "commitment:asset-id",
  economicsCommitment: "commitment:economics",
  exitTermsCommitment: "commitment:exit-terms",
  inputCommitment: "commitment:input-note",
  inputRoot: "root:input",
  nullifier: "nullifier:actual-private-unshield-demo",
  ownerCommitment: "commitment:owner",
  poolId: "pool:stablecoin-usdc-v1",
  proofBoundDestinationCommitment:
    "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  routeCommitment: "commitment:route",
  settlementCommitment: "commitment:settlement",
  settlementId: "settlement:actual-private-unshield-demo",
  unshieldContextTag: "context:actual-private-unshield-demo",
  unshieldPublicInputHash: "public-input-hash:actual-private-unshield-demo",
});
assert.throws(
  () =>
    createVantaActualPrivateSettlementPlan({
      ...unshieldPlan.request,
      nullifier: unshieldPlan.request.nullifierOrReplayCommitment,
      relayerSerializedTransaction,
    }),
  /only supports relayerSerializedTransaction for send/,
);

assert.equal(plan.operatorEndpoint, "/private-pool-v2/protocol-settlements");
assert.equal(plan.request.action, "send");
assert.equal(plan.request.economicsMode, "committed-economics");
assert.equal(plan.request.assetCohort, "stablecoin-usdc-v1");
assert.equal(plan.request.assetIdCommitment, "commitment:asset-id");
assert.equal(plan.request.changeLeafIndex, "43");
assert.equal(plan.request.changeOutputRoot, "root:change-output");
assert.equal(plan.request.nullifierOrReplayCommitment, "nullifier:actual-private-demo");
assert.equal(plan.request.outputLeafIndex, "42");
assert.equal(plan.request.outputRoot, "root:merchant-output");
assert.deepEqual(validateVantaActualPrivateSettlementPlan(plan), {
  accepted: true,
  reason: "actual-private-settlement-plan-ready",
});
assert.equal(planWithRelayerTransaction.request.relayerSerializedTransaction, relayerSerializedTransaction);
assert.deepEqual(validateVantaActualPrivateSettlementPlan(planWithRelayerTransaction), {
  accepted: true,
  reason: "actual-private-settlement-plan-ready",
});
assert.equal(unshieldPlan.operatorEndpoint, "/private-pool-v2/protocol-settlements");
assert.equal(unshieldPlan.request.action, "unshield");
assert.equal(unshieldPlan.request.economicsMode, "committed-economics");
assert.equal(unshieldPlan.request.exitTermsCommitment, "commitment:exit-terms");
assert.equal(unshieldPlan.request.inputCommitment, "commitment:input-note");
assert.equal(unshieldPlan.request.inputRoot, "root:input");
assert.equal(
  unshieldPlan.request.proofBoundDestinationCommitment,
  "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
);
assert.equal(unshieldPlan.request.unshieldContextTag, "context:actual-private-unshield-demo");
assert.equal(
  unshieldPlan.request.unshieldPublicInputHash,
  "public-input-hash:actual-private-unshield-demo",
);
assert.deepEqual(validateVantaActualPrivateSettlementPlan(unshieldPlan), {
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

const serializedUnshield = JSON.stringify(unshieldPlan);
for (const forbidden of [
  "\"amount\"",
  "\"asset\"",
  "\"destination\"",
  "inputLeafIndex",
  "merchantSettlementAddress",
  "payerSourceWallet",
  "sourceWallet",
  "rawAmount",
  "rawAsset",
]) {
  assert.ok(
    !serializedUnshield.includes(forbidden),
    `Actual-private Unshield settlement plan leaked forbidden term ${forbidden}.`,
  );
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

const rejectedRelayerTransaction = {
  ...plan,
  request: {
    ...plan.request,
    relayerSerializedTransaction: "not base64",
  },
};

assert.equal(validateVantaActualPrivateSettlementPlan(rejectedRelayerTransaction).accepted, false);
assert.match(
  validateVantaActualPrivateSettlementPlan(rejectedRelayerTransaction).reason,
  /base64 relayerSerializedTransaction/,
);

const rejectedUnshield = {
  ...unshieldPlan,
  request: {
    ...unshieldPlan.request,
    exitTermsCommitment: "",
  },
};

assert.equal(validateVantaActualPrivateSettlementPlan(rejectedUnshield).accepted, false);
assert.equal(validateVantaActualPrivateSettlementPlan(rejectedUnshield).reason, "missing-exitTermsCommitment");

const rejectedUnshieldDestinationBinding = {
  ...unshieldPlan,
  request: {
    ...unshieldPlan.request,
    proofBoundDestinationCommitment: "",
  },
};

assert.equal(validateVantaActualPrivateSettlementPlan(rejectedUnshieldDestinationBinding).accepted, false);
assert.equal(
  validateVantaActualPrivateSettlementPlan(rejectedUnshieldDestinationBinding).reason,
  "missing-proofBoundDestinationCommitment",
);

const rejectedRawUnshieldDestinationBinding = {
  ...unshieldPlan,
  request: {
    ...unshieldPlan.request,
    proofBoundDestinationCommitment: "recipient-public-address",
  },
};

assert.equal(validateVantaActualPrivateSettlementPlan(rejectedRawUnshieldDestinationBinding).accepted, false);
assert.equal(
  validateVantaActualPrivateSettlementPlan(rejectedRawUnshieldDestinationBinding).reason,
  "invalid-proofBoundDestinationCommitment",
);

const rejectedUnshieldRelayerTransaction = {
  ...unshieldPlan,
  request: {
    ...unshieldPlan.request,
    relayerSerializedTransaction,
  },
};

assert.equal(validateVantaActualPrivateSettlementPlan(rejectedUnshieldRelayerTransaction).accepted, false);
assert.equal(
  validateVantaActualPrivateSettlementPlan(rejectedUnshieldRelayerTransaction).reason,
  "relayerSerializedTransaction-only-supported-for-send",
);

console.log("Vanta actual-private settlement plan check: PASS");
