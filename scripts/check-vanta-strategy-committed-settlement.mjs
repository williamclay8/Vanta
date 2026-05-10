import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStrategyPlan } from "../src/strategy/strategyPlanner.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

async function loadCompiledModules() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/strategy-committed-settlement-check-"));
  const tempSrcDir = join(tempRoot, "src");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(join(tempSrcDir, "privacy"), { recursive: true });
    mkdirSync(join(tempSrcDir, "strategy"), { recursive: true });
    mkdirSync(join(tempSrcDir, "zk"), { recursive: true });

    for (const file of [
      "privacy/privatePoolV2ProtocolSettlementClient.ts",
      "privacy/privatePoolV2ProofRequests.ts",
      "privacy/privatePoolV2Types.ts",
      "privacy/protocolAdapter.ts",
      "privacy/vantaShieldCommittedSettlement.ts",
      "strategy/strategyPrivateRail.ts",
      "strategy/strategyPrivateRailSettlement.ts",
      "strategy/strategyPrivateRailTrustContract.ts",
      "zk/vantaPrivateCore.ts",
      "zk/vantaPrivateCoreSendProof.ts",
      "zk/vantaPrivateCoreSwapProof.ts",
    ]) {
      writeFileSync(join(tempSrcDir, file), readFileSync(resolve(repoRoot, "src", file), "utf8"));
    }

    for (const file of ["zk/vantaPrivateCoreSendProof.ts", "zk/vantaPrivateCoreSwapProof.ts"]) {
      const filePath = join(tempSrcDir, file);
      writeFileSync(
        filePath,
        readFileSync(filePath, "utf8").replaceAll("@/zk/vantaPrivateCore", "./vantaPrivateCore.js"),
      );
    }

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempSrcDir, "privacy/privatePoolV2ProtocolSettlementClient.ts"),
        join(tempSrcDir, "strategy/strategyPrivateRail.ts"),
        join(tempSrcDir, "strategy/strategyPrivateRailSettlement.ts"),
        join(tempSrcDir, "strategy/strategyPrivateRailTrustContract.ts"),
        join(tempSrcDir, "zk/vantaPrivateCore.ts"),
        join(tempSrcDir, "zk/vantaPrivateCoreSendProof.ts"),
        join(tempSrcDir, "zk/vantaPrivateCoreSwapProof.ts"),
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--lib",
        "ES2022,DOM",
        "--skipLibCheck",
        "--outDir",
        tempJsDir,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return {
      privateCore: await import(pathToFileURL(join(tempJsDir, "zk/vantaPrivateCore.js")).href),
      strategyPrivateRail: await import(
        pathToFileURL(join(tempJsDir, "strategy/strategyPrivateRail.js")).href
      ),
      strategySettlement: await import(
        pathToFileURL(join(tempJsDir, "strategy/strategyPrivateRailSettlement.js")).href
      ),
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const { privateCore, strategyPrivateRail, strategySettlement } = await loadCompiledModules();

const owner = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x2020202020202020202020202020202020202020202020202020202020202020",
);
const ledger = new privateCore.VantaPrivateCoreLedger();
const shields = Array.from({ length: 6 }, (_, index) =>
  ledger.shield({
    amount: index === 1 ? 250_000n : BigInt((index + 1) * 1_000_000),
    assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ownerPublicKey: owner.publicKey,
  }),
);
const plan = createStrategyPlan({
  destination: "Vanta private balance",
  fundingSource: "Vanta private balance",
  landingMode: "Protected landing",
  maxSlippageBps: 50,
  mode: "Private TWAP",
  pair: "USDC -> SOL",
  seed: "vanta-strategy-committed-settlement",
  side: "Buy",
  slicePolicy: "Fixed count",
  timingPolicy: "Evenly spaced",
  timeWindow: "6 hours",
  totalNotional: 250_000,
  urgency: "Low footprint",
});
const handoff = strategyPrivateRail.createStrategyPrivateRailOperatorHandoffFromShieldSimulation({
  initialShieldArtifact: shields[1],
  maxChildren: 1,
  outputAssetId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  ownerPublicKey: owner.publicKey,
  ownerSecretKey: owner.secretKey,
  plan,
  quoteOutputAmount: ({ childOrder }) => BigInt(Math.floor(childOrder.notional / 2)),
  sourceShieldArtifacts: shields,
});
const packet = handoff.operatorPackets[0];
const committedRequests = strategySettlement.createStrategyPrivateRailCommittedSettlementRequests({
  handoff,
  settlementIdPrefix: "strategy-private-rail-check",
});

assert.equal(committedRequests.version, "vanta-strategy-private-rail-committed-settlement-0.1");
assert.equal(committedRequests.liveSubmission, false);
assert.deepEqual(
  committedRequests.requests.map((request) => request.action),
  ["send", "swap"],
);

const [sendRequest, swapRequest] = committedRequests.requests;
assert.equal(sendRequest.economicsMode, "committed-economics");
assert.match(
  sendRequest.routeHandleCommitment,
  /^0x[0-9a-f]{64}$/u,
  "send request must carry only a committed route handle",
);
assert.match(
  sendRequest.quoteHandleCommitment,
  /^0x[0-9a-f]{64}$/u,
  "send request must carry only a committed quote handle",
);
assert.equal(sendRequest.routeHandleCommitment, sendRequest.routeCommitment);
assert.equal(sendRequest.inputCommitment, packet.send.inputCommitment);
assert.equal(sendRequest.inputRoot, packet.send.inputRoot);
assert.equal(sendRequest.nullifierOrReplayCommitment, packet.send.inputNullifier);
assert.equal(sendRequest.outputCommitment, packet.send.recipientCommitment);
assert.equal(sendRequest.changeOutputCommitment, packet.send.changeCommitment);
assert.equal(sendRequest.outputRoot, packet.send.resultingRoot);
assert.equal(sendRequest.changeOutputRoot, packet.send.resultingRoot);
assert.equal(sendRequest.sendPublicInputHash, packet.send.proofPublicInputs.send_economic_terms_hash);
assert.match(
  sendRequest.recipientMemoCiphertextBodyHash,
  /^sha256:[0-9a-f]{64}$/u,
  "send request must carry a recipient memo ciphertext body hash for the committed Send proof request",
);
assert.match(
  sendRequest.changeMemoCiphertextBodyHash,
  /^sha256:[0-9a-f]{64}$/u,
  "send request must carry a change memo ciphertext body hash when a change output exists",
);
assert.notEqual(
  sendRequest.recipientMemoCiphertextBodyHash,
  sendRequest.changeMemoCiphertextBodyHash,
  "recipient and change memo body hashes must stay domain-separated",
);

assert.equal(swapRequest.economicsMode, "committed-economics");
assert.match(
  swapRequest.routeHandleCommitment,
  /^0x[0-9a-f]{64}$/u,
  "swap request must carry only a committed route handle",
);
assert.match(
  swapRequest.quoteHandleCommitment,
  /^0x[0-9a-f]{64}$/u,
  "swap request must carry only a committed quote handle",
);
assert.equal(swapRequest.routeHandleCommitment, swapRequest.routeCommitment);
assert.equal(swapRequest.inputCommitment, packet.swap.inputCommitment);
assert.equal(swapRequest.inputRoot, packet.swap.inputRoot);
assert.equal(swapRequest.nullifierOrReplayCommitment, packet.swap.inputNullifier);
assert.equal(swapRequest.outputCommitment, packet.swap.outputCommitment);
assert.equal(swapRequest.outputRoot, packet.swap.resultingRoot);
assert.equal(swapRequest.swapPublicInputHash, packet.swap.proofPublicInputs.swap_economic_terms_hash);

const serialized = JSON.stringify(committedRequests);
for (const rawTerm of [
  "USDC -> SOL",
  "250000",
  "scheduledAtMinute",
  "notional",
  "Private TWAP",
  "childOrders",
  "rawSchedule",
  "routeEngine",
  "routeControl",
  "Jupiter",
  "quote-build-submit",
  "quoteOutputAmount",
  "ownerSecretKey",
  "privateWitness",
  "encryptedPayload",
  "sendAmount",
  "inputAmount",
  "outputAmount",
]) {
  assert.ok(!serialized.includes(rawTerm), `Strategy committed settlement leaked raw term: ${rawTerm}`);
}

for (const rawField of ['"routeHandle"', '"quoteHandle"', '"route"', '"quote"']) {
  assert.ok(!serialized.includes(rawField), `Strategy committed settlement leaked raw field: ${rawField}`);
}

console.log("Vanta strategy committed settlement check: PASS");
