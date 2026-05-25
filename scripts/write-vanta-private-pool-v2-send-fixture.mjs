import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_send_entry/Prover.toml",
);
const args = process.argv.slice(2);
let fixtureMode = "valid";
let witnessJsonPath = null;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--witness-json") {
    witnessJsonPath = args[index + 1] ?? null;
    index += 1;
    continue;
  }

  fixtureMode = arg ?? fixtureMode;
}

if (!witnessJsonPath && process.argv[2]) {
  fixtureMode = process.argv[2];
}
const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2MerkleFixtureHelpers.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2SendCircuitFixture.ts",
];

if (
  witnessJsonPath === null &&
  fixtureMode !== "valid" &&
  fixtureMode !== "forged-input-membership" &&
  fixtureMode !== "forged-recipient-append-path" &&
  fixtureMode !== "forged-change-append-path" &&
  fixtureMode !== "invalid-amount-conservation" &&
  fixtureMode !== "invalid-amount-range" &&
  fixtureMode !== "invalid-binding" &&
  fixtureMode !== "invalid-change-output-commitment-preimage" &&
  fixtureMode !== "invalid-input-commitment-preimage" &&
  fixtureMode !== "invalid-memo-ciphertext-hash" &&
  fixtureMode !== "invalid-nullifier" &&
  fixtureMode !== "invalid-owner-secret-binding" &&
  fixtureMode !== "invalid-relayer-fee-conservation" &&
  fixtureMode !== "invalid-relayer-fee-exceeds-input" &&
  fixtureMode !== "invalid-relayer-fee-public-binding" &&
  fixtureMode !== "invalid-valid-until-slot-public-binding" &&
  fixtureMode !== "invalid-recipient-output-commitment-preimage" &&
  fixtureMode !== "invalid-output-root"
) {
  console.error(
    'Expected fixture mode "valid", "forged-input-membership", "forged-recipient-append-path", "forged-change-append-path", "invalid-amount-conservation", "invalid-amount-range", "invalid-binding", "invalid-change-output-commitment-preimage", "invalid-input-commitment-preimage", "invalid-memo-ciphertext-hash", "invalid-nullifier", "invalid-owner-secret-binding", "invalid-relayer-fee-conservation", "invalid-relayer-fee-exceeds-input", "invalid-relayer-fee-public-binding", "invalid-valid-until-slot-public-binding", "invalid-recipient-output-commitment-preimage", or "invalid-output-root".',
  );
  process.exit(1);
}

if (witnessJsonPath !== null && !witnessJsonPath.trim()) {
  console.error("--witness-json requires a path.");
  process.exit(1);
}

if (witnessJsonPath !== null && fixtureMode !== "valid") {
  console.error("--witness-json is only supported with the valid fixture mode.");
  process.exit(1);
}

const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-send-fixture-"));
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
    pathToFileURL(join(tempJsDir, "privatePoolV2SendCircuitFixture.js")).href
  );
  const fixture =
    witnessJsonPath === null
      ? fixtureModule.createVantaPrivatePoolV2SendCircuitFixture({
          mode: fixtureMode,
        })
      : fixtureModule.createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput(
          JSON.parse(readFileSync(resolve(repoRoot, witnessJsonPath), "utf8")),
        );
  const toml = fixtureModule.serializeVantaPrivatePoolV2SendCircuitFixtureToToml(fixture);

  writeFileSync(outputPath, toml);
  console.log(
    witnessJsonPath === null
      ? `Wrote ${fixtureMode} fixture to ${outputPath}`
      : `Wrote witness-input fixture to ${outputPath}`,
  );
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
