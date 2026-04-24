import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { poseidon2, poseidon3, poseidon4 } from "poseidon-lite";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-hash-alignment-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2ShieldCircuitFixture.ts",
  "privatePoolV2ClaimCircuitFixture.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

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

function parsePublicInputs(inputs) {
  return inputs.map((input) => {
    const separator = input.indexOf(":");
    assert(separator > 0, `Expected labeled public input, received ${input}.`);
    return [input.slice(0, separator), input.slice(separator + 1)];
  });
}

function toMap(entries) {
  return new Map(entries);
}

function assertOrder(entries, expectedLabels, lane) {
  const labels = entries.map(([label]) => label);
  assert(
    JSON.stringify(labels) === JSON.stringify(expectedLabels),
    `Expected ${lane} public input order ${expectedLabels.join(", ")}, received ${labels.join(", ")}.`,
  );
}

function assertValue(publicInputMap, label, expected, lane) {
  const actual = publicInputMap.get(label);
  assert(
    actual === expected.toString(10),
    `Expected ${lane} ${label} to equal ${expected.toString(10)}, received ${actual}.`,
  );
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
    computeVantaPrivatePoolV2ShieldPublicInputHash,
    createVantaPrivatePoolV2ShieldCircuitFixture,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ShieldCircuitFixture.js")).href);
  const {
    computeVantaPrivatePoolV2ClaimPublicInputHash,
    createVantaPrivatePoolV2ClaimCircuitFixture,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ClaimCircuitFixture.js")).href);

  const shield = createVantaPrivatePoolV2ShieldCircuitFixture();
  const shieldEntries = parsePublicInputs(shield.proofRequest.publicInputs);
  const shieldMap = toMap(shieldEntries);
  const shieldWitness = shield.witness;

  assertOrder(
    shieldEntries,
    [
      "vanta-private-pool-v2-shield-proof-request-0.1",
      "source-mint",
      "target-mint",
      "target-asset",
      "amount",
      "owner-commitment",
      "route-commitment",
      "tree-id",
      "leaf-index",
      "output-commitment",
      "previous-root",
      "output-root",
    ],
    "shield",
  );
  assertValue(shieldMap, "source-mint", shieldWitness.source_mint, "shield");
  assertValue(shieldMap, "target-mint", shieldWitness.target_mint, "shield");
  assertValue(shieldMap, "target-asset", shieldWitness.target_asset_id, "shield");
  assertValue(shieldMap, "amount", shieldWitness.amount, "shield");
  assertValue(shieldMap, "owner-commitment", shieldWitness.owner_commitment, "shield");
  assertValue(shieldMap, "route-commitment", shieldWitness.route_commitment, "shield");
  assertValue(shieldMap, "tree-id", shieldWitness.tree_id, "shield");
  assertValue(shieldMap, "leaf-index", shieldWitness.leaf_index, "shield");
  assertValue(shieldMap, "output-commitment", shieldWitness.output_commitment, "shield");
  assertValue(shieldMap, "previous-root", shieldWitness.previous_root, "shield");
  assertValue(shieldMap, "output-root", shieldWitness.output_root, "shield");

  const rootTransition = poseidon2([shieldWitness.previous_root, shieldWitness.output_root]);
  assert(rootTransition > 0n, "Expected shield root transition to be derived.");
  assert(
    computeVantaPrivatePoolV2ShieldPublicInputHash(shieldWitness) ===
      shield.shieldPublicInputHash,
    "Expected shield fixture hash to match Noir public hash preimage.",
  );
  assert(
    JSON.stringify(shield.proofRequest.circuitPublicInputs) ===
      JSON.stringify([`shield-public-input-hash:${shield.shieldPublicInputHash.toString(10)}`]),
    "Expected shield proof request to expose only the computed hash on the circuit-public lane.",
  );
  console.log("private pool v2 shield public-input hash alignment: PASS");

  const claim = createVantaPrivatePoolV2ClaimCircuitFixture();
  const claimEntries = parsePublicInputs(claim.proofRequest.publicInputs);
  const claimMap = toMap(claimEntries);
  const claimWitness = claim.witness;

  assertOrder(
    claimEntries,
    [
      "vanta-private-pool-v2-claim-proof-request-0.1",
      "asset",
      "amount",
      "owner-commitment",
      "tree-id",
      "leaf-index",
      "input-commitment",
      "input-root",
      "nullifier",
      "destination",
      "relayer",
      "relayer-fee",
      "quote-expires-at-slot",
    ],
    "claim",
  );
  assertValue(claimMap, "asset", claimWitness.asset_id, "claim");
  assertValue(claimMap, "amount", claimWitness.amount, "claim");
  assertValue(claimMap, "owner-commitment", claimWitness.owner_commitment, "claim");
  assertValue(claimMap, "tree-id", claimWitness.tree_id, "claim");
  assertValue(claimMap, "leaf-index", claimWitness.leaf_index, "claim");
  assertValue(claimMap, "input-commitment", claimWitness.input_commitment, "claim");
  assertValue(claimMap, "input-root", claimWitness.input_root, "claim");
  assertValue(claimMap, "nullifier", claimWitness.nullifier, "claim");
  assertValue(claimMap, "destination", claimWitness.destination, "claim");
  assertValue(claimMap, "relayer", claimWitness.relayer_id, "claim");
  assertValue(claimMap, "relayer-fee", claimWitness.relayer_fee, "claim");
  assertValue(claimMap, "quote-expires-at-slot", claimWitness.quote_expires_at_slot, "claim");

  const inputMembership = poseidon3([
    claimWitness.tree_id,
    claimWitness.leaf_index,
    claimWitness.input_root,
  ]);
  const claimTerms = poseidon4([
    claimWitness.destination,
    claimWitness.relayer_id,
    claimWitness.relayer_fee,
    claimWitness.quote_expires_at_slot,
  ]);
  assert(inputMembership > 0n, "Expected claim input membership to be derived.");
  assert(claimTerms > 0n, "Expected claim terms hash to be derived.");
  assert(
    computeVantaPrivatePoolV2ClaimPublicInputHash(claimWitness) === claim.claimPublicInputHash,
    "Expected claim fixture hash to match Noir public hash preimage.",
  );
  assert(
    JSON.stringify(claim.proofRequest.circuitPublicInputs) ===
      JSON.stringify([`claim-public-input-hash:${claim.claimPublicInputHash.toString(10)}`]),
    "Expected claim proof request to expose only the computed hash on the circuit-public lane.",
  );
  console.log("private pool v2 claim public-input hash alignment: PASS");
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
