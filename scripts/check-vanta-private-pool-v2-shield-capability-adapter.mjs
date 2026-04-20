import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-shield-capability-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "src/privacy/protocolAdapter.ts",
  "src/privacy/privatePoolV2Types.ts",
  "src/privacy/privatePoolV2ProofRequests.ts",
  "src/privacy/privatePoolV2ShieldCapabilityAdapter.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  const targetPath = join(tempTsDir, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

async function expectRejection(action, expectedMessage) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(expectedMessage),
      `Expected rejection containing "${expectedMessage}", received "${message}".`,
    );
    return;
  }

  throw new Error(`Expected rejection containing "${expectedMessage}".`);
}

const treeCommitment = {
  assetId: "USDC",
  commitment: "field:output-commitment",
  leafIndex: 7,
  merkleRoot: "field:output-root",
  treeId: "vanta-private-pool-v2-usdc",
};

const directCapability = {
  blockers: [],
  mode: "direct-configured-token",
  requiresPublicRoute: false,
  sourceAsset: {
    mintAddress: "mint:usdc",
    symbol: "USDC",
  },
  supportsDirectShield: true,
  targetShieldAsset: {
    assetKey: "USDC",
    label: "Shielded USDC",
    mintAddress: "mint:usdc",
    name: "USD Coin",
  },
};

const routedCapability = {
  blockers: [],
  mode: "route-to-configured-shield-token",
  requiresPublicRoute: true,
  sourceAsset: {
    mintAddress: "mint:bonk",
    symbol: "BONK",
  },
  supportsDirectShield: false,
  targetShieldAsset: {
    assetKey: "USDC",
    label: "Shielded USDC",
    mintAddress: "mint:usdc",
    name: "USD Coin",
  },
};

try {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--rootDir",
      tempTsDir,
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const {
    createPrivatePoolV2ShieldProofRequestFromCapability,
  } = await import(
    pathToFileURL(join(tempJsDir, "src/privacy/privatePoolV2ShieldCapabilityAdapter.js")).href
  );

  const directRequest = createPrivatePoolV2ShieldProofRequestFromCapability({
    amountBaseUnits: 1_000_000n,
    capability: directCapability,
    ownerCommitment: "field:owner",
    previousRoot: "field:previous-root",
    treeCommitment,
  });

  assert(directRequest.intent === "shield", "Expected direct shield request.");
  assert(directRequest.assetId === "USDC", "Expected direct target asset id.");
  assert(
    directRequest.publicInputs.includes("source-mint:mint:usdc"),
    "Expected direct source mint binding.",
  );
  assert(
    directRequest.publicInputs.includes("target-mint:mint:usdc"),
    "Expected direct target mint binding.",
  );
  assert(
    directRequest.publicInputs.includes("route-commitment:capability:direct-configured-token:direct"),
    "Expected direct capability route binding.",
  );
  console.log("private-pool-v2 shield capability direct proof request: PASS");

  const routedRequest = createPrivatePoolV2ShieldProofRequestFromCapability({
    amountBaseUnits: 2_000_000n,
    capability: routedCapability,
    ownerCommitment: "field:owner",
    treeCommitment,
  });

  assert(routedRequest.assetId === "USDC", "Expected routed target asset id.");
  assert(
    routedRequest.publicInputs.includes("source-mint:mint:bonk"),
    "Expected routed source mint binding.",
  );
  assert(
    routedRequest.publicInputs.includes("target-mint:mint:usdc"),
    "Expected routed target mint binding.",
  );
  assert(
    routedRequest.publicInputs.includes(
      "route-commitment:capability:route-to-configured-shield-token:routed",
    ),
    "Expected routed capability route binding.",
  );
  console.log("private-pool-v2 shield capability routed proof request: PASS");

  await expectRejection(
    () =>
      createPrivatePoolV2ShieldProofRequestFromCapability({
        amountBaseUnits: 1n,
        capability: {
          ...directCapability,
          blockers: ["No configured shield target is available for this asset."],
          mode: "unsupported",
          targetShieldAsset: null,
        },
        ownerCommitment: "field:owner",
        treeCommitment,
      }),
    "not supported",
  );
  console.log("private-pool-v2 shield capability unsupported guard: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
