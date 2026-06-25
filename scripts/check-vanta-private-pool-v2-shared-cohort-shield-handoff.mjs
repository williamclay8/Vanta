import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts["private-pool-v2:shared-cohort-shield-handoff-check"],
  "node scripts/check-vanta-private-pool-v2-shared-cohort-shield-handoff.mjs",
);

const shieldPage = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");
assert.match(
  shieldPage,
  /submitVantaPrivatePoolV2SharedCohortShieldHandoff/,
  "ShieldPage must call shared-cohort shield handoff.",
);

const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-shared-cohort-shield-handoff-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = ["privatePoolV2IndexerClient.ts", "privatePoolV2SharedCohortShieldHandoff.ts"];

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
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
    resolveVantaPrivatePoolV2IndexerBaseUrl,
    VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2IndexerClient.js")).href);
  const {
    getVantaPrivatePoolV2SharedCohortShieldHandoffPolicy,
    isVantaPrivatePoolV2OnChainTreeAppendEnabled,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2SharedCohortShieldHandoff.js")).href);

  assert.equal(VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID, "vanta-private-pool-v2-unified-tree-v1");
  assert.equal(resolveVantaPrivatePoolV2IndexerBaseUrl("https://example.com/indexer/"), "https://example.com/indexer");

  const policy = getVantaPrivatePoolV2SharedCohortShieldHandoffPolicy();
  assert.equal(policy.productionSharedCohortReady, false);
  assert.equal(policy.privacyClaimAllowed, false);
  assert.equal(policy.onChainTreeAppendProductionReady, false);
  assert.equal(isVantaPrivatePoolV2OnChainTreeAppendEnabled(), false);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Vanta Private Pool v2 shared-cohort shield handoff check: PASS");
