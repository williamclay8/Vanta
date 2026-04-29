import { strict as assert } from "node:assert";

import { createVantaActualPrivateSettlementPlan } from "../src/mainnet/actualPrivateSettlementPlan.mjs";
import {
  requestVantaActualPrivateSettlementViaRelayer,
  validateVantaActualPrivateSettlementResponse,
} from "../src/mainnet/actualPrivateSettlementRelayerCaller.mjs";

const plan = createVantaActualPrivateSettlementPlan({
  acceptedRoot: "root:actual-private-demo",
  assetCohort: "stablecoin-usdc-v1",
  assetIdCommitment: "commitment:asset-id",
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

const calls = [];
const result = await requestVantaActualPrivateSettlementViaRelayer({
  authToken: "test-token-not-printed",
  operatorBaseUrl: "https://operator.example.invalid",
  plan,
  async fetchImpl(url, init) {
    calls.push({ body: init.body, headers: init.headers, method: init.method, url });
    return {
      ok: true,
      async json() {
        return {
          kind: "protocol_settlement",
          proofReceipt: {
            assetId: "hidden:economic-terms",
            intent: "private-send",
            publicInputCommitment: "commitment:proof-public-input",
            receiptId: "receipt:actual-private-demo",
            replayKey: "private-send:nullifier:actual-private-demo",
          },
          protocolSettlementReceipt: {
            action: "send",
            economicsCommitment: "commitment:economics",
            economicsMode: "committed-economics",
            id: "proto:actual-private-demo",
            object: "protocol_settlement_receipt",
            proofReceiptId: "ppv2_receipt",
            proofReceiptPublicInputCommitment: "commitment:proof-public-input",
            settlementCommitment: "commitment:settlement",
            settlementId: "settlement:actual-private-demo",
            status: "confirmed",
          },
        };
      },
      status: 200,
    };
  },
});

assert.equal(calls.length, 1);
assert.equal(calls[0].url, "https://operator.example.invalid/private-pool-v2/protocol-settlements");
assert.equal(calls[0].method, "POST");
assert.equal(calls[0].headers.Authorization, "Bearer test-token-not-printed");
assert.equal(result.responseDecision.accepted, true);
assert.equal(result.evidenceRefs.operatorReceiptRef, "operator-receipt:ppv2_receipt");
assert.equal(result.evidenceRefs.relayerSubmittedSpendTxRef, "operator-protocol-settlement:proto:actual-private-demo");

const body = JSON.parse(calls[0].body);
assert.equal(body.action, "send");
assert.equal(body.assetIdCommitment, "commitment:asset-id");
assert.equal(body.economicsMode, "committed-economics");
for (const forbidden of [
  "amount",
  "asset",
  "destination",
  "owner",
  "inputCommitment",
  "inputLeafIndex",
  "merchantSettlementAddress",
  "payerSourceWallet",
  "sourceWallet",
]) {
  assert.equal(Object.hasOwn(body, forbidden), false, `Relayer caller body leaked ${forbidden}.`);
}

assert.equal(
  validateVantaActualPrivateSettlementResponse({
    plan,
    response: {
      ...result.response,
      proofReceipt: {
        ...result.response.proofReceipt,
        replayKey: "private-send:wrong-nullifier",
      },
    },
  }).accepted,
  false,
);

await assert.rejects(
  () =>
    requestVantaActualPrivateSettlementViaRelayer({
      authToken: "token",
      operatorBaseUrl: "https://user:pass@operator.example.invalid",
      plan,
      async fetchImpl() {
        throw new Error("fetch must not run with credential-bearing URLs");
      },
    }),
  /credential-bearing/,
);

console.log("Vanta actual-private settlement relayer caller check: PASS");
