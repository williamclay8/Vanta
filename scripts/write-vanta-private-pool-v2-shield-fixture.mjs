import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_shield_entry/Prover.toml",
);
const fixtureMode = process.argv[2] ?? "valid";

if (
  fixtureMode !== "valid" &&
  fixtureMode !== "forged-append-path" &&
  fixtureMode !== "invalid-economics-commitment" &&
  fixtureMode !== "invalid-binding" &&
  fixtureMode !== "invalid-root"
) {
  console.error(
    'Expected fixture mode "valid", "forged-append-path", "invalid-economics-commitment", "invalid-binding", or "invalid-root". Example: node scripts/write-vanta-private-pool-v2-shield-fixture.mjs invalid-root',
  );
  process.exit(1);
}

const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-shield-fixture-"));
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
  const source = readFileSync(filePath, "utf8")
    .replace(/from "\.\/privatePoolV2ProofRequests"/g, 'from "./privatePoolV2ProofRequests.js"')
    .replace(/from "\.\/privatePoolV2Types"/g, 'from "./privatePoolV2Types.js"');
  writeFileSync(filePath, source);
}

try {
  mkdirSync(tempTsDir, { recursive: true });
  copySource("protocolAdapter.ts");
  copySource("privatePoolV2Types.ts");
  copySource("privatePoolV2ProofRequests.ts");
  copySource("privatePoolV2ShieldCircuitFixture.ts");

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      join(tempTsDir, "privatePoolV2Types.ts"),
      join(tempTsDir, "protocolAdapter.ts"),
      join(tempTsDir, "privatePoolV2ProofRequests.ts"),
      join(tempTsDir, "privatePoolV2ShieldCircuitFixture.ts"),
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

  patchRelativeImports("privatePoolV2ProofRequests.ts");
  patchRelativeImports("privatePoolV2ShieldCircuitFixture.ts");

  const fixtureModule = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2ShieldCircuitFixture.js")).href
  );
  const fixture = fixtureModule.createVantaPrivatePoolV2ShieldCircuitFixture({
    mode: fixtureMode,
  });
  const toml = fixtureModule.serializeVantaPrivatePoolV2ShieldCircuitFixtureToToml(fixture);

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
