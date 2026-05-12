import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-send-no-witness-"));
const artifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_send_entry/target/vanta_private_pool_v2_send_entry.proof.json",
);
const port = 12180 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const productionBaseUrl = `http://127.0.0.1:${port + 1_000}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} ${args.join(" ")} failed.`);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function requestJson(path, options = {}, targetBaseUrl = baseUrl) {
  const response = await fetch(`${targetBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, parsed, status: response.status, text };
}

async function waitForHealth(server, targetBaseUrl = baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error("Private Pool V2 operator exited before health check.");
    }

    try {
      const response = await requestJson("/health", {}, targetBaseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server still booting.
    }

    await sleep(250);
  }

  throw new Error("Private Pool V2 operator did not become healthy.");
}

async function expectReject(label, body, expectedMessageFragment, targetBaseUrl = baseUrl) {
  const response = await requestJson("/private-pool-v2/proof-artifacts/verify", {
    body: JSON.stringify(body),
    method: "POST",
  }, targetBaseUrl);
  assert(!response.ok, `${label} unexpectedly succeeded.`);
  assert(
    String(response.parsed?.error ?? response.text).includes(expectedMessageFragment),
    `${label} rejected with unexpected message: ${response.text}`,
  );
  console.log(`${label}: PASS`);
}

run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "send"]);
const proofArtifact = JSON.parse(readFileSync(artifactPath, "utf8"));

const server = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port),
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "private-pool-v2-send-no-witness.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
let stdout = "";
server.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForHealth(server);

  const accepted = await requestJson("/private-pool-v2/proof-artifacts/verify", {
    body: JSON.stringify({ proofArtifact }),
    method: "POST",
  });
  assert(accepted.ok, accepted.text || "Expected proof artifact verification to succeed.");
  assert(accepted.parsed?.verifiedReceipt?.verified === true, "Expected verified receipt.");
  assert(
    accepted.parsed?.verifiedReceipt?.verifiedPublicInputs?.sendPublicInputHash ===
      proofArtifact.publicInputs[0],
    "Expected verified receipt to decode Send public input hash.",
  );
  console.log("private-pool-v2 operator Send proof artifact no-witness acceptance: PASS");

  const acceptedWithExpectedPublicInput = await requestJson(
    "/private-pool-v2/proof-artifacts/verify",
    {
      body: JSON.stringify({
        expectedPublicInputs: { sendPublicInputHash: proofArtifact.publicInputs[0] },
        proofArtifact,
      }),
      method: "POST",
    },
  );
  assert(
    acceptedWithExpectedPublicInput.ok,
    acceptedWithExpectedPublicInput.text ||
      "Expected proof artifact verification with expected Send public input to succeed.",
  );
  console.log(
    "private-pool-v2 operator Send expected public input binding acceptance: PASS",
  );

  await expectReject(
    "private-pool-v2 operator Send mismatched expected public input rejection",
    {
      expectedPublicInputs: {
        sendPublicInputHash: (BigInt(proofArtifact.publicInputs[0]) + 1n).toString(10),
      },
      proofArtifact,
    },
    "sendPublicInputHash mismatch",
  );

  await expectReject(
    "private-pool-v2 operator mixed witnessPackage rejection",
    { proofArtifact, witnessPackage: { privateWitness: true } },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator mixed privateWitness rejection",
    { privateWitness: { input_amount: "5000" }, proofArtifact },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator mixed witness alias rejection",
    { proofArtifact, witness: { input_amount: "5000" } },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator mixed privateInputs alias rejection",
    { privateInputs: { input_amount: "5000" }, proofArtifact },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator mixed noteSecret alias rejection",
    { noteSecret: "do-not-accept", proofArtifact },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator mixed sourcePublicInputs rejection",
    { proofArtifact, sourcePublicInputs: { input_root: "1" } },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator nested witness alias rejection",
    { proofArtifact: { ...proofArtifact, witness: { input_amount: "5000" } } },
    "forbidden no-witness field",
  );
  await expectReject(
    "private-pool-v2 operator relabelled remote artifact rejection",
    { proofArtifact: { ...proofArtifact, proofBackend: "remote-service" } },
    "local-bb-fixture-artifact",
  );
  await expectReject(
    "private-pool-v2 operator missing proofArtifact rejection",
    { publicInputs: proofArtifact.publicInputs },
    "proofArtifact",
  );
} catch (error) {
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  throw error;
} finally {
  if (server.exitCode === null) {
    await new Promise((resolvePromise) => {
      server.once("close", resolvePromise);
      server.kill("SIGTERM");
    });
  }
}

const productionServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port + 1_000),
    VANTA_PRIVATE_POOL_V2_REQUIRE_PRODUCTION_PROOF_SYSTEM: "true",
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "private-pool-v2-send-production.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForHealth(productionServer, productionBaseUrl);
  await expectReject(
    "private-pool-v2 operator production local artifact rejection",
    { proofArtifact },
    "remote proof artifact verification",
    productionBaseUrl,
  );
} finally {
  if (productionServer.exitCode === null) {
    await new Promise((resolvePromise) => {
      productionServer.once("close", resolvePromise);
      productionServer.kill("SIGTERM");
    });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Vanta Private Pool v2 Send operator no-witness check: PASS");
