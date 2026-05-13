import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial,
  verifyVantaPrivatePoolV2SendProofArtifact,
} from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry");
const compiledProgramPath = resolve(circuitDir, "target/vanta_private_pool_v2_send_entry.json");
const witnessPath = resolve(circuitDir, "target/vanta_private_pool_v2_send_entry.gz");
const proofArtifactPath = resolve(circuitDir, "target/vanta_private_pool_v2_send_entry.proof.json");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-browser-worker-prover-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2BrowserProverProtocol.ts",
  "privatePoolV2BrowserProverWorker.ts",
  "privatePoolV2BrowserProverClient.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/u, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

function normalizeFieldString(value, label) {
  const input = String(value).trim();
  const parsed = /^0x[0-9a-f]+$/u.test(input)
    ? BigInt(input)
    : /^(0|[1-9][0-9]*)$/u.test(input)
      ? BigInt(input)
      : null;

  assert(parsed !== null, `${label} must be a field string.`);
  return parsed.toString(10);
}

function assertBrowserSafeSource(relativePath, source) {
  for (const forbidden of [
    "node:",
    "child_process",
    "readFileSync",
    "writeFileSync",
    "Buffer.",
    "process.",
    "nargo",
  ]) {
    assert(
      !source.includes(forbidden),
      `${relativePath} must stay browser/Web Worker safe and avoid ${forbidden}.`,
    );
  }
}

try {
  const packageJson = JSON.parse(read("package.json"));
  assert(
    packageJson.scripts?.["private-pool-v2:browser-worker-prover-check"] ===
      "node scripts/check-vanta-private-pool-v2-browser-worker-prover.mjs",
    "package.json must expose private-pool-v2:browser-worker-prover-check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:local-prover-check"]?.includes(
      "npm run private-pool-v2:browser-worker-prover-check",
    ),
    "private-pool-v2:local-prover-check must include the browser worker prover check.",
  );
  assert(
    packageJson.scripts?.["private-pool-v2:proof-backend-boundary-check"]?.includes(
      "npm run private-pool-v2:browser-worker-prover-check",
    ),
    "private-pool-v2:proof-backend-boundary-check must include the browser worker prover check.",
  );

  const protocolSource = read("src/privacy/privatePoolV2BrowserProverProtocol.ts");
  const workerSource = read("src/privacy/privatePoolV2BrowserProverWorker.ts");
  const clientSource = read("src/privacy/privatePoolV2BrowserProverClient.ts");

  for (const [relativePath, source] of [
    ["src/privacy/privatePoolV2BrowserProverProtocol.ts", protocolSource],
    ["src/privacy/privatePoolV2BrowserProverWorker.ts", workerSource],
    ["src/privacy/privatePoolV2BrowserProverClient.ts", clientSource],
  ]) {
    assertBrowserSafeSource(relativePath, source);
  }

  assert(workerSource.includes("@aztec/bb.js"), "worker must use @aztec/bb.js.");
  assert(workerSource.includes("Barretenberg.new({ threads: 1 })"), "worker must force bb.js threads: 1.");
  assert(workerSource.includes("UltraHonkBackend"), "worker must use UltraHonkBackend.");
  assert(
    workerSource.includes("local-bb-derived-artifact"),
    "worker artifacts must stay on the local-bb-derived-artifact backend.",
  );
  assert(
    workerSource.includes("local-acir-bytecode-hash-not-production-vk"),
    "worker artifacts must stay on local ACIR bytecode hash evidence.",
  );
  assert(
    workerSource.includes("addEventListener") && workerSource.includes("postMessage"),
    "worker must expose a Web Worker message handler.",
  );
  assert(
    clientSource.includes("new Worker(new URL(\"./privatePoolV2BrowserProverWorker.ts\", import.meta.url)"),
    "client must construct the browser worker via Vite's worker URL pattern.",
  );
  assert(
    !clientSource.includes("from \"./privatePoolV2BrowserProverWorker\""),
    "client must not import the heavy worker module into the main bundle.",
  );

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
      "ES2022,DOM,WebWorker",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "send"]);

  const compiledProgram = JSON.parse(readFileSync(compiledProgramPath, "utf8"));
  const compressedWitness = readFileSync(witnessPath);
  const existingArtifact = JSON.parse(readFileSync(proofArtifactPath, "utf8"));
  const packageVersion =
    packageJson.dependencies?.["@aztec/bb.js"] ??
    packageJson.devDependencies?.["@aztec/bb.js"] ??
    "unknown";

  const { proveVantaPrivatePoolV2SendInBrowserWorker } = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2BrowserProverWorker.js")).href
  );

  const proofArtifact = await proveVantaPrivatePoolV2SendInBrowserWorker({
    circuit: "vanta_private_pool_v2_send_entry",
    compiledProgramBytecode: compiledProgram.bytecode,
    compressedWitness,
    expectedPublicInputHash: existingArtifact.publicInputs[0],
    proofRuntimeVersion: packageVersion,
    target: "send",
  });

  assert(proofArtifact.circuit === "vanta_private_pool_v2_send_entry", "artifact must stay on Send circuit.");
  assert(proofArtifact.proofBackend === "local-bb-derived-artifact", "artifact must use local-bb-derived-artifact.");
  assert(proofArtifact.proofSystem === "noir-bb", "artifact must use noir-bb.");
  assert(
    proofArtifact.verifyingKeyHashKind === "local-acir-bytecode-hash-not-production-vk",
    "artifact must not claim production verifying-key evidence.",
  );
  assert(
    normalizeFieldString(proofArtifact.publicInputs[0], "browser worker artifact public input") ===
      normalizeFieldString(existingArtifact.publicInputs[0], "existing Send public input"),
    "browser worker artifact must bind the Send public-input hash.",
  );
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(
    proofArtifact,
    "Private Pool v2 Send browser worker proof artifact",
  );

  const receipt = await verifyVantaPrivatePoolV2SendProofArtifact({ proofArtifact });
  assert(receipt.verified === true, "browser worker proof artifact must verify.");
  assert(
    normalizeFieldString(
      receipt.verifiedPublicInputs.sendPublicInputHash,
      "browser worker verified Send public input",
    ) === normalizeFieldString(existingArtifact.publicInputs[0], "existing Send public input"),
    "browser worker verified receipt must bind the Send public-input hash.",
  );

  console.log("Vanta Private Pool v2 browser worker prover check: PASS");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
