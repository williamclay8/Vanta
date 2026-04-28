import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStrategyPlan } from "../src/strategy/strategyPlanner.mjs";
import { createStrategyRouteQuotePrivacyEvidence } from "../src/strategy/strategyRouteQuotePrivacyEvidence.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

async function loadCompiledModules() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/strategy-route-quote-privacy-check-"));
  const tempSrcDir = join(tempRoot, "src");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(join(tempSrcDir, "privacy"), { recursive: true });
    mkdirSync(join(tempSrcDir, "strategy"), { recursive: true });
    mkdirSync(join(tempSrcDir, "zk"), { recursive: true });

    for (const file of [
      "privacy/privatePoolV2ProtocolSettlementClient.ts",
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
  "0x3030303030303030303030303030303030303030303030303030303030303030",
);
const ledger = new privateCore.VantaPrivateCoreLedger();
const shields = Array.from({ length: 6 }, (_, index) =>
  ledger.shield({
    amount: BigInt((index + 1) * 1_000_000),
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
  seed: "vanta-strategy-route-quote-privacy",
  side: "Buy",
  slicePolicy: "Fixed count",
  timingPolicy: "Evenly spaced",
  timeWindow: "6 hours",
  totalNotional: 300_000,
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
const committedSettlementRequests =
  strategySettlement.createStrategyPrivateRailCommittedSettlementRequests({
    handoff,
    settlementIdPrefix: "strategy-route-quote-privacy-check",
  });
const evidence = createStrategyRouteQuotePrivacyEvidence({ committedSettlementRequests });

assert.equal(evidence.version, "vanta-strategy-route-quote-privacy-evidence-0.1");
assert.equal(evidence.kind, "vanta-strategy-route-quote-privacy-evidence");
assert.equal(evidence.productionPrivacyClaimAllowed, false);
assert.equal(evidence.routeQuoteCommitmentOnly, true);
assert.deepEqual(evidence.requestActions, ["send", "swap"]);
assert.deepEqual(evidence.leakedFieldPaths, []);
assert.deepEqual(evidence.malformedCommitmentPaths, []);

const serialized = JSON.stringify(committedSettlementRequests);
for (const rawTerm of [
  "USDC -> SOL",
  "300000",
  "6 hours",
  "Evenly spaced",
  "Private TWAP",
  "scheduledAtMinute",
  "Jupiter",
  "venue",
]) {
  assert.ok(!serialized.includes(rawTerm), `Strategy route/quote privacy evidence leaked raw term: ${rawTerm}`);
}

console.log("Vanta Strategy route/quote privacy check: PASS");
