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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/strategy-private-rail-check-"));
  const tempSrcDir = join(tempRoot, "src");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(join(tempSrcDir, "zk"), { recursive: true });
    mkdirSync(join(tempSrcDir, "strategy"), { recursive: true });
    writeFileSync(
      join(tempSrcDir, "zk/vantaPrivateCore.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8"),
    );
    writeFileSync(
      join(tempSrcDir, "zk/vantaPrivateCoreSendProof.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts"), "utf8").replaceAll(
        '@/zk/vantaPrivateCore',
        "./vantaPrivateCore.js",
      ),
    );
    writeFileSync(
      join(tempSrcDir, "zk/vantaPrivateCoreSwapProof.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreSwapProof.ts"), "utf8").replaceAll(
        '@/zk/vantaPrivateCore',
        "./vantaPrivateCore.js",
      ),
    );
    writeFileSync(
      join(tempSrcDir, "strategy/strategyPrivateRail.ts"),
      readFileSync(resolve(repoRoot, "src/strategy/strategyPrivateRail.ts"), "utf8"),
    );
    writeFileSync(
      join(tempSrcDir, "strategy/strategyPrivateRailTrustContract.ts"),
      readFileSync(resolve(repoRoot, "src/strategy/strategyPrivateRailTrustContract.ts"), "utf8"),
    );

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempSrcDir, "zk/vantaPrivateCore.ts"),
        join(tempSrcDir, "zk/vantaPrivateCoreSendProof.ts"),
        join(tempSrcDir, "zk/vantaPrivateCoreSwapProof.ts"),
        join(tempSrcDir, "strategy/strategyPrivateRail.ts"),
        join(tempSrcDir, "strategy/strategyPrivateRailTrustContract.ts"),
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
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const { privateCore, strategyPrivateRail } = await loadCompiledModules();

const owner = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x1010101010101010101010101010101010101010101010101010101010101010",
);
const ledger = new privateCore.VantaPrivateCoreLedger();
const shields = Array.from({ length: 6 }, (_, index) =>
  ledger.shield({
    amount: index === 2 ? 250_000n : BigInt((index + 1) * 1_000_000),
    assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ownerPublicKey: owner.publicKey,
  }),
);
const initialHold = ledger.hold({
  encryptedPayload: shields[2].encryptedPayload,
  ownerSecretKey: owner.secretKey,
});
const sourceRootBeforePreview = ledger.getRoot();
const sourceNullifier = privateCore.deriveVantaPrivateCoreNullifier(initialHold.note, initialHold.witness);
const simulationLedger = new privateCore.VantaPrivateCoreLedger();
const simulationShields = Array.from({ length: 6 }, (_, index) =>
  simulationLedger.shield({
    amount: index === 2 ? 250_000n : BigInt((index + 1) * 1_000_000),
    assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ownerPublicKey: owner.publicKey,
  }),
);
const simulationInitialHold = simulationLedger.hold({
  encryptedPayload: simulationShields[2].encryptedPayload,
  ownerSecretKey: owner.secretKey,
});
const baseInput = {
  destination: "Vanta private balance",
  fundingSource: "Vanta private balance",
  landingMode: "Protected landing",
  maxSlippageBps: 50,
  mode: "Stealth DCA",
  pair: "USDC -> SOL",
  seed: "vanta-strategy-private-rail",
  side: "Buy",
  slicePolicy: "Fixed count",
  timingPolicy: "Evenly spaced",
  timeWindow: "6 hours",
  totalNotional: 250_000,
  urgency: "Low footprint",
};
const plan = createStrategyPlan(baseInput);

const preview = strategyPrivateRail.createStrategyPrivateRailPreview({
  initialHold: simulationInitialHold,
  maxChildren: 1,
  outputAssetId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  ownerPublicKey: owner.publicKey,
  ownerSecretKey: owner.secretKey,
  plan,
  quoteOutputAmount: ({ childOrder }) => BigInt(Math.floor(childOrder.notional / 2)),
  simulationLedger,
});
const handoff = strategyPrivateRail.createStrategyPrivateRailOperatorHandoff(preview);
const sourceRootBeforeArtifactHandoff = ledger.getRoot();
const artifactSourceNullifier = privateCore.deriveVantaPrivateCoreNullifier(initialHold.note, initialHold.witness);
const artifactHandoff = strategyPrivateRail.createStrategyPrivateRailOperatorHandoffFromShieldSimulation({
  initialShieldArtifact: shields[2],
  maxChildren: 1,
  outputAssetId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  ownerPublicKey: owner.publicKey,
  ownerSecretKey: owner.secretKey,
  plan,
  quoteOutputAmount: ({ childOrder }) => BigInt(Math.floor(childOrder.notional / 2)),
  sourceShieldArtifacts: shields,
});

assert.equal(preview.version, "vanta-strategy-private-rail-preview-0.1");
assert.equal(
  preview.trustContract.version,
  "vanta-strategy-private-rail-trust-contract-0.1",
  "strategy private rail preview must carry its trust contract version",
);
assert.equal(
  preview.trustContract.claimControls.fullyPrivateStrategyClaim,
  false,
  "strategy private rail trust contract must keep full-privacy claims locked",
);
assert.ok(
  preview.trustContract.redactedFields.includes("rawSchedule"),
  "strategy private rail trust contract must list raw schedule as redacted",
);
assert.equal(preview.liveSubmission, false, "private Strategy rail slice must remain non-live");
assert.equal(preview.operatorPlaintextStrategyShared, false, "operator packet must not receive raw Strategy state");
assert.equal(preview.children.length, 1, "first slice should support a bounded child execution preview");
assert.equal(
  ledger.getRoot(),
  sourceRootBeforePreview,
  "strategy private rail preview must not mutate the source ledger root",
);
assert.equal(
  ledger.isNullifierConsumed(sourceNullifier.value),
  false,
  "strategy private rail preview must not consume the source ledger nullifier",
);
assert.equal(preview.children[0].source.inputRoot, simulationInitialHold.witness.root);
assert.ok(preview.children[0].source.inputNullifier.startsWith("0x"));
assert.equal(preview.operatorPackets[0].send.inputCommitment, simulationInitialHold.commitment.value);
assert.ok(preview.children[0].send.recipientCommitment.startsWith("0x"));
assert.ok(preview.children[0].send.changeCommitment?.startsWith("0x"));
assert.ok(preview.children[0].swap.outputCommitment.startsWith("0x"));
assert.equal(preview.operatorPackets[0].swap.inputCommitment, preview.children[0].send.recipientCommitment);
assert.equal(preview.operatorPackets[0].send.proofKind, "vanta-private-core-send-proof-boundary-v0");
assert.equal(preview.operatorPackets[0].swap.proofKind, "vanta-private-core-swap-proof-boundary-v0");
assert.ok(
  preview.operatorPackets[0].send.proofPublicInputs.send_economic_terms_hash,
  "send operator packet must expose the hash-bound proof-public send economics",
);
assert.ok(
  preview.operatorPackets[0].swap.proofPublicInputs.swap_economic_terms_hash,
  "swap operator packet must expose the hash-bound proof-public swap economics",
);
assert.match(
  preview.operatorPackets[0].send.proofPublicInputs.state_root,
  /^\d+$/u,
  "send proof-public root must be encoded as a field decimal string",
);
assert.match(
  preview.operatorPackets[0].swap.proofPublicInputs.output_commitment,
  /^\d+$/u,
  "swap proof-public output commitment must be encoded as a field decimal string",
);
assert.equal(preview.nextPrivateHold.note.assetId, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
assert.equal(preview.privateOutputs[0].note.assetId, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

assert.deepEqual(
  Object.keys(handoff).sort(),
  [
    "liveSubmission",
    "operatorPackets",
    "operatorPlaintextStrategyShared",
    "privateRailBoundary",
    "trustContract",
    "version",
  ],
  "operator handoff must expose only the redacted handoff envelope",
);
assert.equal(handoff.version, "vanta-strategy-private-rail-operator-handoff-0.1");
assert.equal(handoff.liveSubmission, false, "operator handoff must stay non-live");
assert.equal(handoff.operatorPlaintextStrategyShared, false, "operator handoff must not share raw Strategy state");
assert.equal(handoff.operatorPackets.length, preview.operatorPackets.length);
assert.equal(handoff.trustContract.version, preview.trustContract.version);
assert.equal(
  ledger.getRoot(),
  sourceRootBeforeArtifactHandoff,
  "strategy private rail shield-simulation handoff must not mutate the source ledger root",
);
assert.equal(
  ledger.isNullifierConsumed(artifactSourceNullifier.value),
  false,
  "strategy private rail shield-simulation handoff must not consume the source ledger nullifier",
);
assert.deepEqual(
  Object.keys(artifactHandoff).sort(),
  [
    "liveSubmission",
    "operatorPackets",
    "operatorPlaintextStrategyShared",
    "privateRailBoundary",
    "trustContract",
    "version",
  ],
  "shield-simulation handoff must expose only the redacted handoff envelope",
);
assert.equal(artifactHandoff.version, "vanta-strategy-private-rail-operator-handoff-0.1");
assert.equal(artifactHandoff.liveSubmission, false, "shield-simulation handoff must stay non-live");
assert.equal(
  artifactHandoff.operatorPlaintextStrategyShared,
  false,
  "shield-simulation handoff must not share raw Strategy state",
);
assert.equal(artifactHandoff.operatorPackets.length, 1);
assert.equal(artifactHandoff.operatorPackets[0].send.inputRoot, initialHold.witness.root);
assert.equal(artifactHandoff.operatorPackets[0].send.inputNullifier, artifactSourceNullifier.value);

const artifactHandoffJson = JSON.stringify(artifactHandoff);
for (const banned of [
  "children",
  "nextPrivateHold",
  "privateOutputs",
  "noteSecret",
  "noteNonce",
  "blinding",
  "ownerSecretKey",
  "scheduledAtMinute",
  "notional",
  "USDC -> SOL",
  "privateWitness",
  "encryptedPayload",
  "sendAmount",
  "inputAmount",
  "outputAmount",
]) {
  assert.ok(!artifactHandoffJson.includes(banned), `shield-simulation handoff must not expose ${banned}`);
}

const operatorPacketJson = JSON.stringify(preview.operatorPackets);
const handoffJson = JSON.stringify(handoff);
assert.deepEqual(
  Object.keys(preview.operatorPackets[0]).sort(),
  ["privateCoreBoundary", "send", "swap"],
  "operator packet envelope must not expose child index or strategy metadata",
);
assert.ok(!operatorPacketJson.includes("scheduledAtMinute"), "operator packets must not expose raw schedule");
assert.ok(!operatorPacketJson.includes("notional"), "operator packets must not expose child notional");
assert.ok(!operatorPacketJson.includes("USDC -> SOL"), "operator packets must not expose raw pair text");
assert.ok(!operatorPacketJson.includes("childIndex"), "operator packets must not expose strategy child index");
assert.ok(!operatorPacketJson.includes("privateWitness"), "operator packets must not include private witness material");
assert.ok(!operatorPacketJson.includes("encryptedPayload"), "operator packets must not include encrypted payloads");
assert.ok(!operatorPacketJson.includes("sendAmount"), "operator packets must not expose raw send amount field names");
assert.ok(!operatorPacketJson.includes("inputAmount"), "operator packets must not expose raw swap input amount field names");
assert.ok(!operatorPacketJson.includes("outputAmount"), "operator packets must not expose raw swap output amount field names");

for (const banned of [
  "children",
  "nextPrivateHold",
  "privateOutputs",
  "noteSecret",
  "noteNonce",
  "blinding",
  "ownerSecretKey",
  "scheduledAtMinute",
  "notional",
  "USDC -> SOL",
  "privateWitness",
  "encryptedPayload",
  "sendAmount",
  "inputAmount",
  "outputAmount",
]) {
  assert.ok(!handoffJson.includes(banned), `operator handoff must not expose ${banned}`);
}

assert.throws(
  () =>
    strategyPrivateRail.createStrategyPrivateRailPreview({
      initialHold,
      outputAssetId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ownerPublicKey: owner.publicKey,
      ownerSecretKey: owner.secretKey,
      plan: createStrategyPlan({
        ...baseInput,
        destination: "Connected wallet",
      }),
      simulationLedger: new privateCore.VantaPrivateCoreLedger(),
    }),
  /requires private-balance funding and private-balance destination/u,
);

console.log("Vanta strategy private rail check: PASS");
