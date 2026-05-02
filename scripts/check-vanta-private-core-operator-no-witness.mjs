import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-operator-no-witness-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const port = 10850 + Math.floor(Math.random() * 150);
const baseUrl = `http://127.0.0.1:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function printStatus(message) {
  console.log(message);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function compileFixtureModule() {
  mkdirSync(tempTsDir, { recursive: true });

  writeFileSync(
    join(tempTsDir, "vantaPrivateCore.ts"),
    readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8"),
  );
  writeFileSync(
    join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"),
    readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"), "utf8").replace(
      /from "@\/zk\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore"',
    ),
  );

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      join(tempTsDir, "vantaPrivateCore.ts"),
      join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"),
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

  const compiledProofPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
  writeFileSync(
    compiledProofPath,
    readFileSync(compiledProofPath, "utf8").replace(
      /from "\.\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore.js"',
    ),
  );

  return pathToFileURL(compiledProofPath).href;
}

async function requestJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/state/private-core-summary`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the operator is listening.
    }
    await sleep(250);
  }

  throw new Error("strict no-witness operator did not become ready in time.");
}

async function expectWitnessRejection(path, body) {
  const response = await requestJson(path, body);
  assert(!response.ok, `${path} unexpectedly accepted private witness material.`);
  assert(
    response.text.includes("strict no-witness operator mode rejects witnessPackage.privateWitness"),
    `${path} rejected with the wrong message: ${response.text}`,
  );
  printStatus(`strict no-witness ${path}: PASS`);
}

const fixtureModuleUrl = compileFixtureModule();
const { getVantaPrivateCoreFixedDepthUnshieldFixtureV0 } = await import(fixtureModuleUrl);
const { proveAndVerifyVantaPrivateCoreUnshield } = await import(
  pathToFileURL(resolve(repoRoot, "operator/private-core-proof.mjs")).href
);
const fixture = getVantaPrivateCoreFixedDepthUnshieldFixtureV0();
const witnessPackage = fixture.validBoundary.noirWitnessPackage;
assert(
  witnessPackage.provingTreeContract === "poseidon4-current-sibling-hi-sibling-lo-direction-v0",
  "Witness package must name the v0 direction-tagged proving tree contract.",
);
assert(
  witnessPackage.sourcePublicInputContract ===
    "sha256-source-inputs-with-poseidon-consume-context-tag-v0",
  "Witness package must name the source/proving public input split.",
);
assert(
  witnessPackage.consumeContextTagContract === "poseidon-proving-lane-public-field-v0",
  "Witness package must name the Poseidon consume context tag contract.",
);
assert(
  witnessPackage.publicInputs.consume_context_tag_hi === "0",
  "Consume context tag high limb must stay zero for the public field ABI.",
);
const sourceArtifacts = fixture.validSourceArtifacts;
const proofReceipt = await proveAndVerifyVantaPrivateCoreUnshield({ witnessPackage });
const proofArtifact = {
  backend: proofReceipt.backend,
  circuitPublicInputs: witnessPackage.publicInputs,
  circuit: proofReceipt.circuit,
  proofHex: proofReceipt.proofHex,
  proofVersion: proofReceipt.proofVersion,
  provingHashLane: proofReceipt.provingHashLane,
  publicInputs: proofReceipt.publicInputs,
  sourceArtifacts,
  sourcePublicInputs: witnessPackage.sourcePublicInputs,
};

const server = spawn("node", ["operator/unshield-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    VANTA_DEVNET_TOKEN_MINT:
      process.env.VANTA_DEVNET_TOKEN_MINT ??
      "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
    VANTA_DEVNET_VAULT_OWNER:
      process.env.VANTA_DEVNET_VAULT_OWNER ??
      "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
    VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, "consumes.json"),
    VANTA_PRIVATE_CORE_OPERATOR_WITNESS_MODE: "strict-no-witness",
    VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, "proofs.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, "send-proofs.json"),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, "swap-proofs.json"),
    VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, "swaps.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "swap-records.json"),
    VANTA_UNSHIELD_OPERATOR_PORT: String(port),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForHealth();
  const summary = await fetch(`${baseUrl}/state/private-core-summary`).then((response) =>
    response.json(),
  );
  assert(
    summary.operatorWitnessMaterialPolicy === "reject-private-witness-material",
    "Expected operator summary to expose strict no-witness material policy.",
  );
  printStatus("strict no-witness summary policy: PASS");

  await expectWitnessRejection("/private-core/unshield-proof", { witnessPackage });
  await expectWitnessRejection("/private-core/register-root", {
    sourceArtifacts,
    witnessPackage,
  });
  await expectWitnessRejection("/private-core/unshield-consume", {
    sourceArtifacts,
    witnessPackage,
  });

  const proofOnlyResponse = await requestJson("/private-core/unshield-proof", { proofArtifact });
  assert(
    proofOnlyResponse.ok,
    `/private-core/unshield-proof rejected verifier-only artifact: ${proofOnlyResponse.text}`,
  );
  printStatus("strict no-witness /private-core/unshield-proof artifact: PASS");

  const rootResponse = await requestJson("/private-core/register-root", {
    proofArtifact,
    sourceArtifacts,
  });
  assert(
    rootResponse.ok,
    `/private-core/register-root rejected verifier-only artifact: ${rootResponse.text}`,
  );
  printStatus("strict no-witness /private-core/register-root artifact: PASS");

  const tamperedSourceArtifactsResponse = await requestJson("/private-core/register-root", {
    proofArtifact,
    sourceArtifacts: {
      ...sourceArtifacts,
      noteCommitment: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    },
  });
  assert(
    !tamperedSourceArtifactsResponse.ok &&
      tamperedSourceArtifactsResponse.text.includes("mismatched proof-artifact note commitment"),
    "strict no-witness register-root accepted source artifacts that diverged from the proof artifact.",
  );
  printStatus("strict no-witness proof-artifact source-artifact binding: PASS");

  const consumeResponse = await requestJson("/private-core/unshield-consume", {
    proofArtifact,
    sourceArtifacts,
  });
  assert(
    consumeResponse.ok,
    `/private-core/unshield-consume rejected verifier-only artifact: ${consumeResponse.text}`,
  );
  const consumeBody = JSON.parse(consumeResponse.text);
  assert(
    consumeBody.releaseRecorded === true && consumeBody.verified === true,
    "Expected verifier-only consume artifact to record a verified release.",
  );
  printStatus("strict no-witness /private-core/unshield-consume artifact: PASS");
} finally {
  if (server.exitCode === null) {
    await new Promise((resolvePromise) => {
      server.once("close", resolvePromise);
      server.kill("SIGTERM");
      setTimeout(resolvePromise, 1000);
    });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

if (stderr.includes("Error:")) {
  console.error(stderr);
}
