import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-remote-proof-artifact-"));
const operatorPort = 13780 + Math.floor(Math.random() * 300);
const remotePort = operatorPort + 1_000;
const operatorBaseUrl = `http://127.0.0.1:${operatorPort}`;
const remoteBaseUrl = `http://127.0.0.1:${remotePort}`;
const operatorToken = "operator-token";
const remoteToken = "remote-token";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function readJsonRequest(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : null;
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

const remoteCalls = [];
const remoteServer = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/v1/proof-artifacts/verify") {
    sendJson(response, 404, { error: "unexpected path" });
    return;
  }

  const body = await readJsonRequest(request);
  remoteCalls.push({
    authorization: request.headers.authorization,
    body,
    url: request.url,
  });

  const shieldPublicInputHash = body?.expectedPublicInputs?.shieldPublicInputHash;
  if (shieldPublicInputHash === "456") {
    sendJson(response, 200, {
      verifiedReceipt: {
        ...remoteShieldReceipt("456"),
        proofSystem: "mock",
      },
    });
    return;
  }

  if (shieldPublicInputHash === "789") {
    sendJson(response, 200, {
      verifiedReceipt: {
        ...remoteShieldReceipt("789"),
        verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
      },
    });
    return;
  }

  sendJson(response, 200, {
    verifiedReceipt: remoteShieldReceipt(shieldPublicInputHash ?? "123"),
  });
});

function remoteShieldArtifact(publicInput = "123") {
  return {
    acirBytecodeHash: "sha256:remote-acir",
    backend: "barretenberg-ultrahonk",
    circuit: "vanta_private_pool_v2_shield_entry",
    proofBackend: "remote-service",
    proofHex: "abcd",
    proofRuntimePackage: "@aztec/bb.js",
    proofRuntimeVersion: "remote-fixture",
    proofSystem: "noir-bb",
    publicInputCommitment: `sha256:remote-public-input-${publicInput}`,
    publicInputLabels: ["shield-public-input-hash"],
    publicInputs: [publicInput],
    verifyingKeyHash: "sha256:remote-production-vk",
    verifyingKeyHashKind: "production-verifying-key-hash",
    verifyingKeyId: "production-vk:vanta_private_pool_v2_shield_entry:remote",
  };
}

function remoteShieldReceipt(publicInput = "123") {
  return {
    ...remoteShieldArtifact(publicInput),
    proofByteLength: 2,
    proofFieldCount: 1,
    publicInputCount: 1,
    verified: true,
    verifiedPublicInputs: {
      shieldPublicInputHash: publicInput,
    },
  };
}

async function requestOperator(path, body) {
  const response = await fetch(`${operatorBaseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
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

async function getOperatorState() {
  const response = await fetch(`${operatorBaseUrl}/state/private-pool-v2-receipts`, {
    headers: {
      Authorization: `Bearer ${operatorToken}`,
    },
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;
  assert(response.ok, text || "Expected receipt state to load.");
  return parsed;
}

async function waitForHealth(server) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error("Private Pool V2 operator exited before health check.");
    }

    try {
      const response = await fetch(`${operatorBaseUrl}/health`);
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

async function expectReject(label, body, expectedMessageFragment) {
  const response = await requestOperator("/private-pool-v2/proof-artifacts/verify", body);
  assert(!response.ok, `${label} unexpectedly succeeded.`);
  assert(
    String(response.parsed?.error ?? response.text).includes(expectedMessageFragment),
    `${label} rejected with unexpected message: ${response.text}`,
  );
  console.log(`${label}: PASS`);
}

await new Promise((resolvePromise) => remoteServer.listen(remotePort, "127.0.0.1", resolvePromise));

const operator = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_ALLOW_INSECURE_LOOPBACK_REMOTE_SERVICES: "true",
    VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: remoteToken,
    VANTA_PRIVATE_POOL_V2_INDEXER_URL: remoteBaseUrl,
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: operatorToken,
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(operatorPort),
    VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN: remoteToken,
    VANTA_PRIVATE_POOL_V2_PROVER_URL: remoteBaseUrl,
    VANTA_PRIVATE_POOL_V2_REAL_FUNDS_SETTLEMENT_ENABLED: "true",
    VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN: remoteToken,
    VANTA_PRIVATE_POOL_V2_RELAYER_URL: remoteBaseUrl,
    VANTA_PRIVATE_POOL_V2_RUNTIME_MODE: "remote-services",
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "private-pool-v2-remote-proof-artifact.json"),
    VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN: remoteToken,
    VANTA_PRIVATE_POOL_V2_VERIFIER_URL: remoteBaseUrl,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
let stdout = "";
operator.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
operator.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForHealth(operator);

  const stateBeforeRemoteArtifactVerify = await getOperatorState();
  const accepted = await requestOperator("/private-pool-v2/proof-artifacts/verify", {
    expectedPublicInputs: { shieldPublicInputHash: "123" },
    proofArtifact: remoteShieldArtifact("123"),
  });
  assert(accepted.ok, accepted.text || "Expected remote proof-artifact verification to succeed.");
  assert(
    accepted.parsed?.kind === "Private Pool V2 Shield proof artifact verification",
    "Expected Shield proof artifact verification kind.",
  );
  assert(
    accepted.parsed?.verifiedReceipt?.proofBackend === "remote-service",
    "Expected remote-service proof backend.",
  );
  assert(
    accepted.parsed?.verifiedReceipt?.verifiedPublicInputs?.shieldPublicInputHash === "123",
    "Expected Shield public input binding from remote verifier.",
  );
  assert(remoteCalls.length === 1, "Expected one remote verifier call.");
  assert(remoteCalls[0]?.authorization === `Bearer ${remoteToken}`, "Expected verifier auth token.");
  console.log("private-pool-v2 production remote Shield proof artifact acceptance: PASS");
  const stateAfterRemoteArtifactVerify = await getOperatorState();
  assert(
    stateAfterRemoteArtifactVerify.receiptCount === stateBeforeRemoteArtifactVerify.receiptCount,
    "Remote proof-artifact verification must not append verifier receipts.",
  );
  assert(
    stateAfterRemoteArtifactVerify.protocolSettlementCount ===
      stateBeforeRemoteArtifactVerify.protocolSettlementCount,
    "Remote proof-artifact verification must not append protocol settlements.",
  );
  assert(
    stateAfterRemoteArtifactVerify.paySettlementCount ===
      stateBeforeRemoteArtifactVerify.paySettlementCount,
    "Remote proof-artifact verification must not append Pay settlements.",
  );
  assert(
    stateAfterRemoteArtifactVerify.shadowCommitmentCount ===
      stateBeforeRemoteArtifactVerify.shadowCommitmentCount,
    "Remote proof-artifact verification must not append shadow commitments.",
  );
  console.log("private-pool-v2 production remote proof artifact read-only receipt state: PASS");

  await expectReject(
    "private-pool-v2 production local proof artifact rejection",
    {
      expectedPublicInputs: { shieldPublicInputHash: "123" },
      proofArtifact: {
        ...remoteShieldArtifact("123"),
        proofBackend: "local-bb-fixture-artifact",
      },
    },
    "proofBackend=remote-service",
  );
  assert(remoteCalls.length === 1, "Local proof artifact should reject before remote verifier call.");

  await expectReject(
    "private-pool-v2 production remote mock proofSystem response rejection",
    {
      expectedPublicInputs: { shieldPublicInputHash: "456" },
      proofArtifact: remoteShieldArtifact("456"),
    },
    "production proof system",
  );

  await expectReject(
    "private-pool-v2 production remote local verifying-key response rejection",
    {
      expectedPublicInputs: { shieldPublicInputHash: "789" },
      proofArtifact: remoteShieldArtifact("789"),
    },
    "production verifying-key hash",
  );

  await expectReject(
    "private-pool-v2 production remote proof artifact witness alias rejection",
    {
      expectedPublicInputs: { shieldPublicInputHash: "123" },
      proofArtifact: remoteShieldArtifact("123"),
      witnessPackage: { noteSecret: "secret" },
    },
    "strict no-witness",
  );
  console.log("Vanta Private Pool v2 remote proof artifact boundary check: PASS");
} catch (error) {
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  throw error;
} finally {
  if (operator.exitCode === null) {
    await new Promise((resolvePromise) => {
      operator.once("close", resolvePromise);
      operator.kill("SIGTERM");
    });
  }
  await new Promise((resolvePromise) => remoteServer.close(resolvePromise));
  rmSync(tempRoot, { recursive: true, force: true });
}
