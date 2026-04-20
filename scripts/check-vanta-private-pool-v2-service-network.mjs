import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const basePort = 12_000 + Math.floor(Math.random() * 1_000);
const authToken = "vanta-private-pool-v2-service-network-test-token";
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-service-network-"));
const indexerStorePath = join(tempRoot, "indexer-state.json");

const services = [
  {
    healthServiceName: "vanta-private-pool-v2-indexer",
    readinessEndpoint: "/v1/roots/latest?treeId=vanta-service-network-test-tree",
    role: "indexer",
    script: "private-pool-v2:indexer",
    startFile: "operator/private-pool-v2-indexer-server.mjs",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
  },
  {
    healthServiceName: "vanta-private-pool-v2-prover",
    readinessEndpoint: "/v1/proofs/health",
    role: "prover",
    script: "private-pool-v2:prover",
    startFile: "operator/private-pool-v2-prover-server.mjs",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
  },
  {
    healthServiceName: "vanta-private-pool-v2-relayer",
    readinessEndpoint: "/v1/claims/quote",
    role: "relayer",
    script: "private-pool-v2:relayer",
    startFile: "operator/private-pool-v2-relayer-server.mjs",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
  },
  {
    healthServiceName: "vanta-private-pool-v2-verifier",
    readinessEndpoint: "/v1/proofs/accept",
    role: "verifier",
    script: "private-pool-v2:verifier",
    startFile: "operator/private-pool-v2-verifier-server.mjs",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJson(baseUrl, "/health");
      if (response.ok) {
        return response;
      }
    } catch {
      // Service still booting.
    }

    await sleep(250);
  }

  throw new Error(`Private Pool v2 service did not become healthy at ${baseUrl}.`);
}

for (const service of services) {
  assert(
    existsSync(resolve(repoRoot, service.startFile)),
    `Expected ${service.role} entrypoint ${service.startFile}.`,
  );
  assert(
    packageJson.scripts?.[service.script] === `node ${service.startFile}`,
    `Expected package script ${service.script} to run ${service.startFile}.`,
  );
}

const children = [];
const serviceUrls = new Map();

try {
  for (const [index, service] of services.entries()) {
    const port = basePort + index;
    const baseUrl = `http://127.0.0.1:${port}`;
    serviceUrls.set(service.role, baseUrl);
    const child = spawn("npm", ["run", service.script, "--", "--port", String(port)], {
      cwd: repoRoot,
      env: {
        ...process.env,
        [service.tokenEnv]: authToken,
        VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: authToken,
        ...(service.role === "indexer"
          ? { VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH: indexerStorePath }
          : {}),
        VANTA_PRIVATE_POOL_V2_INDEXER_URL: serviceUrls.get("indexer") ?? "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    children.push({ child, role: service.role, stderr: () => stderr });

    const health = await waitForHealth(baseUrl);
    assert(health.parsed?.ok === true, `${service.role} health should report ok.`);
    assert(
      health.parsed?.service === service.healthServiceName,
      `${service.role} health should expose safe service name.`,
    );
    assert(health.parsed?.role === service.role, `${service.role} health should expose role.`);
    assert(
      health.parsed?.mainnetReady === false,
      `${service.role} health must not claim mainnet readiness.`,
    );
    if (service.role === "indexer") {
      assert(
        health.parsed?.storage?.durableStoreConfigured === true,
        "Expected indexer service health to expose configured durable store.",
      );
      assert(
        health.parsed?.storage?.productionReady === false,
        "Expected indexer service storage to remain productionReady false.",
      );
    }

    const unauthenticated = await requestJson(baseUrl, service.readinessEndpoint);
    assert(
      unauthenticated.status === 401,
      `${service.role} readiness endpoint should require bearer auth.`,
    );

    const readiness = await requestJson(baseUrl, service.readinessEndpoint, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(readiness.ok, readiness.text || `${service.role} readiness should respond.`);
    assert(readiness.parsed?.ok === true, `${service.role} readiness should be ok.`);
    assert(readiness.parsed?.role === service.role, `${service.role} readiness should expose role.`);
    assert(
      readiness.parsed?.privacyRail === "vanta-private-pool-v2",
      `${service.role} readiness should expose the Private Pool v2 rail.`,
    );
    assert(
      readiness.parsed?.productionReady === false,
      `${service.role} readiness must stay productionReady false until external gates clear.`,
    );

    console.log(`private-pool-v2 ${service.role} service: PASS`);
  }

  const shieldRequest = {
    amountBaseUnits: "1000000",
    assetId: "USDC",
    intent: "shield",
    publicInputs: [
      "vanta-private-pool-v2-service-network-test:version",
      "tree-id:vanta-service-network-test-tree",
      "target-asset:USDC",
      "leaf-index:0",
      "output-root:service-network-test-root",
      "output-commitment:field:service-network-output-commitment",
    ],
  };
  const proof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: shieldRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(proof.ok, proof.text || "Expected prover proof response.");

  const receipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({ proof: proof.parsed, request: shieldRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(receipt.ok, receipt.text || "Expected verifier receipt.");
  assert(receipt.parsed?.intent === "shield", "Expected shield receipt intent.");

  const indexedCommitments = await requestJson(
    serviceUrls.get("indexer"),
    "/v1/commitments?treeId=vanta-service-network-test-tree",
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(indexedCommitments.ok, indexedCommitments.text || "Expected indexed commitments.");
  assert(
    indexedCommitments.parsed?.commitments?.length === 1,
    "Expected verifier-accepted shield proof to append through the indexer service.",
  );

  const runningIndexer = children.find((entry) => entry.role === "indexer");
  assert(runningIndexer, "Expected running indexer process.");
  await new Promise((resolvePromise) => {
    runningIndexer.child.once("close", resolvePromise);
    runningIndexer.child.kill("SIGTERM");
  });

  const restartedIndexer = spawn("npm", ["run", "private-pool-v2:indexer", "--", "--port", String(basePort)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH: indexerStorePath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let restartedIndexerStderr = "";
  restartedIndexer.stderr.on("data", (chunk) => {
    restartedIndexerStderr += chunk.toString("utf8");
  });
  children.push({ child: restartedIndexer, role: "indexer-restart", stderr: () => restartedIndexerStderr });
  await waitForHealth(serviceUrls.get("indexer"));

  const restoredCommitments = await requestJson(
    serviceUrls.get("indexer"),
    "/v1/commitments?treeId=vanta-service-network-test-tree",
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(restoredCommitments.ok, restoredCommitments.text || "Expected restored indexed commitments.");
  assert(
    restoredCommitments.parsed?.commitments?.length === 1,
    "Expected indexer service to restore accepted commitments after restart.",
  );

  const replayReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({ proof: proof.parsed, request: shieldRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!replayReceipt.ok, "Expected duplicate proof receipt to be rejected.");

  const quote = await requestJson(serviceUrls.get("relayer"), "/v1/claims/quote", {
    body: JSON.stringify({
      amountBaseUnits: "1000000",
      assetId: "USDC",
      destinationAddress: "recipient-service-network-test",
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(quote.ok, quote.text || "Expected relayer quote.");
  assert(String(quote.parsed?.relayerId ?? "").startsWith("vanta-service-relayer:"), "Expected relayer id.");

  console.log("private-pool-v2 proof roundtrip across services: PASS");

  const operatorPort = basePort + services.length;
  const operatorBaseUrl = `http://127.0.0.1:${operatorPort}`;
  const operator = spawn("npm", ["run", "private-pool-v2:operator"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      VANTA_PRIVATE_POOL_V2_ALLOW_INSECURE_LOOPBACK_REMOTE_SERVICES: "true",
      VANTA_PRIVATE_POOL_V2_DATABASE_URL: "",
      VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_INDEXER_URL: serviceUrls.get("indexer"),
      VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(operatorPort),
      VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_PROVER_URL: serviceUrls.get("prover"),
      VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_RELAYER_URL: serviceUrls.get("relayer"),
      VANTA_PRIVATE_POOL_V2_RUNTIME_MODE: "remote-services",
      VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "operator-remote-service-network.json"),
      VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_VERIFIER_URL: serviceUrls.get("verifier"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let operatorStderr = "";
  operator.stderr.on("data", (chunk) => {
    operatorStderr += chunk.toString("utf8");
  });
  children.push({ child: operator, stderr: () => operatorStderr });

  await waitForHealth(operatorBaseUrl);

  const remoteOperatorStatus = await requestJson(operatorBaseUrl, "/state/private-pool-v2-status", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert(remoteOperatorStatus.ok, remoteOperatorStatus.text || operatorStderr || "Expected remote operator status.");
  assert(
    remoteOperatorStatus.parsed?.runtime?.mode === "remote-services",
    "Expected operator to run against the remote service network.",
  );

  const remotePaySettlement = await requestJson(operatorBaseUrl, "/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "12.50",
        clientToken: "vtok_service_network_operator",
        currency: "USDC",
        id: "vcs_service_network_operator",
        merchantId: "mrc_service_network",
      },
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    remotePaySettlement.ok,
    remotePaySettlement.text || operatorStderr || "Expected remote operator Pay settlement.",
  );
  assert(
    remotePaySettlement.parsed?.privateRailReceipt?.proofReceiptId?.startsWith("ppv2_"),
    "Expected remote operator Pay settlement to return a Private Pool v2 proof receipt.",
  );

  console.log("private-pool-v2 remote operator service network: PASS");
  console.log("private-pool-v2 service network: PASS");
} finally {
  await Promise.all(
    children.map(
      ({ child }) =>
        new Promise((resolvePromise) => {
          if (child.exitCode !== null) {
            resolvePromise();
            return;
          }
          child.once("close", resolvePromise);
          child.kill("SIGTERM");
      }),
    ),
  );
  rmSync(tempRoot, { recursive: true, force: true });
}
