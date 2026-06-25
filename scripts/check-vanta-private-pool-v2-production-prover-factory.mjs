import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts["private-pool-v2:production-prover-factory-check"],
  "node scripts/check-vanta-private-pool-v2-production-prover-factory.mjs",
);

const mockRuntime = readFileSync(resolve(repoRoot, "src/privacy/privatePoolV2MockRuntime.ts"), "utf8");
assert.match(
  mockRuntime,
  /createVantaPrivatePoolV2LocalProver/,
  "Mock runtime may keep local mock for explicit harness use.",
);

const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-production-prover-factory-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2RemoteServices.ts",
  "privatePoolV2ProductionProverFactory.ts",
];

function copySource(relativePath) {
  const sourcePath =
    relativePath === "protocolAdapter.ts"
      ? resolve(repoRoot, "src/privacy/protocolAdapter.ts")
      : resolve(repoRoot, "src/privacy", relativePath);
  writeFileSync(join(tempTsDir, relativePath), readFileSync(sourcePath, "utf8"));
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

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
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const {
    createVantaPrivatePoolV2ProductionProver,
    getVantaPrivatePoolV2ProductionProverPolicy,
    resolveVantaPrivatePoolV2ProductionProverMode,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProductionProverFactory.js")).href);

  const policy = getVantaPrivatePoolV2ProductionProverPolicy();
  assert.equal(policy.h08ProductionProverReady, false);
  assert.equal(policy.productionRemoteProverReady, false);
  assert.equal(policy.privacyClaimAllowed, false);

  assert.equal(resolveVantaPrivatePoolV2ProductionProverMode(), "blocked");
  assert.equal(
    resolveVantaPrivatePoolV2ProductionProverMode({
      proverUrl: "https://prover.example",
      proverAuthToken: "token",
    }),
    "remote-service",
  );
  assert.equal(
    resolveVantaPrivatePoolV2ProductionProverMode({ allowLocalMock: true }),
    "local-mock-explicit",
  );
  assert.equal(createVantaPrivatePoolV2ProductionProver({ allowLocalMock: true }) !== null, true);
  assert.equal(createVantaPrivatePoolV2ProductionProver() === null, true);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Vanta Private Pool v2 production prover factory check: PASS");
