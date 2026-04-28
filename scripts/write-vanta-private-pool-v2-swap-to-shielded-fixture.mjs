import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/Prover.toml",
);
const fixtureMode = process.argv[2] ?? "valid";
const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2SwapToShieldedCircuitFixture.ts",
];

if (
  fixtureMode !== "valid" &&
  fixtureMode !== "invalid-binding" &&
  fixtureMode !== "invalid-nullifier" &&
  fixtureMode !== "invalid-output-root"
) {
  console.error(
    'Expected fixture mode "valid", "invalid-binding", "invalid-nullifier", or "invalid-output-root".',
  );
  process.exit(1);
}

const tempRoot = mkdtempSync(
  resolve(repoRoot, ".tmp/vanta-private-pool-v2-swap-to-shielded-fixture-"),
);
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

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

  const fixtureModule = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2SwapToShieldedCircuitFixture.js")).href
  );
  const fixture = fixtureModule.createVantaPrivatePoolV2SwapToShieldedCircuitFixture({
    mode: fixtureMode,
  });
  const toml =
    fixtureModule.serializeVantaPrivatePoolV2SwapToShieldedCircuitFixtureToToml(fixture);

  writeFileSync(outputPath, toml);
  console.log(`Wrote ${fixtureMode} fixture to ${outputPath}`);
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
