import { strict as assert } from "node:assert";

import { createVantaActualPrivateSettlementPlan } from "../src/mainnet/actualPrivateSettlementPlan.mjs";
import {
  requestVantaActualPrivateSettlementViaRelayer,
  validateVantaActualPrivateOperatorCapability,
  validateVantaActualPrivateSettlementResponse,
} from "../src/mainnet/actualPrivateSettlementRelayerCaller.mjs";

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

const calls = [];
const result = await requestVantaActualPrivateSettlementViaRelayer({
  authToken: "test-token-not-printed",
  operatorBaseUrl: "https://operator.example.invalid",
  plan,
  async fetchImpl(url, init) {
    calls.push({ body: init.body, headers: init.headers, method: init.method, url });
    if (init.method === "GET") {
      return {
        ok: true,
        async json() {
          return {
            protocolActionProofModes: {
              send: "actual_private_spend_circuit_request",
            },
          };
        },
        status: 200,
      };
    }
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

assert.equal(calls.length, 2);
assert.equal(calls[0].url, "https://operator.example.invalid/state/private-pool-v2-status");
assert.equal(calls[0].method, "GET");
assert.equal(calls[0].headers.Authorization, "Bearer test-token-not-printed");
assert.equal(calls[1].url, "https://operator.example.invalid/private-pool-v2/protocol-settlements");
assert.equal(calls[1].method, "POST");
assert.equal(calls[1].headers.Authorization, "Bearer test-token-not-printed");
assert.equal(result.responseDecision.accepted, true);
assert.equal(result.evidenceRefs.operatorReceiptRef, "operator-receipt:ppv2_receipt");
assert.equal(result.evidenceRefs.protocolSettlementRef, "operator-protocol-settlement:proto:actual-private-demo");
assert.equal(result.evidenceRefs.relayerSubmittedSpendTxRef, null);

const body = JSON.parse(calls[1].body);
assert.equal(body.action, "send");
assert.equal(body.assetIdCommitment, "commitment:asset-id");
assert.equal(body.changeLeafIndex, "43");
assert.equal(body.changeOutputRoot, "root:change-output");
assert.equal(body.economicsMode, "committed-economics");
assert.equal(body.outputLeafIndex, "42");
assert.equal(body.outputRoot, "root:merchant-output");
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
  validateVantaActualPrivateOperatorCapability({
    status: {
      protocolActionProofModes: {
        send: "send_circuit_request",
      },
    },
  }).accepted,
  false,
);

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

assert.equal(
  validateVantaActualPrivateSettlementResponse({
    plan,
    response: {
      ...result.response,
      onChainSubmission: {
        signature: "operator-protocol-settlement:proto:actual-private-demo",
        submittedBy: "relayer",
      },
    },
  }).reason,
  "invalid-relayer-solana-signature",
);

assert.equal(
  validateVantaActualPrivateSettlementResponse({
    plan,
    response: {
      ...result.response,
      onChainSubmission: {
        signature: "4".repeat(88),
        submittedBy: "source-wallet",
      },
    },
  }).reason,
  "invalid-relayer-submitter",
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

await assert.rejects(
  () =>
    requestVantaActualPrivateSettlementViaRelayer({
      authToken: "token",
      operatorBaseUrl: "https://operator.example.invalid",
      plan,
      async fetchImpl(url, init) {
        if (init.method === "GET") {
          return {
            ok: true,
            async json() {
              return {
                protocolActionProofModes: {
                  send: "send_circuit_request",
                },
              };
            },
            status: 200,
          };
        }
        throw new Error(`settlement POST must not run when capability is stale: ${url}`);
      },
    }),
  /operator-send-proof-mode-not-actual-private/,
);

console.log("Vanta actual-private settlement relayer caller check: PASS");
