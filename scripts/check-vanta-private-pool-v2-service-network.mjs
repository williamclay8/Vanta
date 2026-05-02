import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const basePort = 12_000 + Math.floor(Math.random() * 1_000);
const authToken = "vanta-private-pool-v2-service-network-test-token";
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-service-network-"));
const indexerStorePath = join(tempRoot, "indexer-state.json");
const proverStorePath = join(tempRoot, "prover-state.json");
const relayerStorePath = join(tempRoot, "relayer-state.json");
const verifierStorePath = join(tempRoot, "verifier-state.json");

const services = [
  {
    healthServiceName: "vanta-private-pool-v2-indexer",
    readinessEndpoint: "/v1/roots/latest?treeId=vanta-service-network-test-tree",
    role: "indexer",
    script: "private-pool-v2:indexer",
    startFile: "operator/private-pool-v2-indexer-server.mjs",
    storeEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
  },
  {
    healthServiceName: "vanta-private-pool-v2-prover",
    readinessEndpoint: "/v1/proofs/health",
    role: "prover",
    script: "private-pool-v2:prover",
    startFile: "operator/private-pool-v2-prover-server.mjs",
    storeEnv: "VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
  },
  {
    healthServiceName: "vanta-private-pool-v2-relayer",
    readinessEndpoint: "/v1/claims/quote",
    role: "relayer",
    script: "private-pool-v2:relayer",
    startFile: "operator/private-pool-v2-relayer-server.mjs",
    storeEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
  },
  {
    healthServiceName: "vanta-private-pool-v2-verifier",
    readinessEndpoint: "/v1/proofs/accept",
    role: "verifier",
    script: "private-pool-v2:verifier",
    startFile: "operator/private-pool-v2-verifier-server.mjs",
    storeEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH",
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

async function waitForExit(child, timeoutMs = 1_500) {
  if (child.exitCode !== null) {
    return child.exitCode;
  }

  return await new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(null), timeoutMs);
    child.once("close", (code) => {
      clearTimeout(timer);
      resolvePromise(code);
    });
  });
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

function serviceNetworkTestEnv(overrides = {}) {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) => !name.startsWith("VANTA_PRIVATE_POOL_V2_") && name !== "NODE_ENV",
      ),
    ),
    ...overrides,
  };
}

function hashHex(...parts) {
  return `0x${createHash("sha256").update(parts.join("\u001f")).digest("hex")}`;
}

const localIndexerRootScheme = "vanta-private-pool-v2-local-indexer-0.1";

function hashLeaf(record) {
  return hashHex(
    localIndexerRootScheme,
    "leaf",
    record.treeId,
    String(record.leafIndex),
    record.assetId,
    record.commitment,
  );
}

function hashNode(treeId, depth, left, right) {
  return hashHex(localIndexerRootScheme, "node", treeId, String(depth), left, right);
}

function emptyRoot(treeId) {
  return hashHex(localIndexerRootScheme, "empty-root", treeId);
}

function serviceNetworkCurrentRoot(treeId, records) {
  if (records.length === 0) {
    return emptyRoot(treeId);
  }

  let current = records.map((record) => hashLeaf(record));
  let depth = 0;

  while (current.length > 1) {
    const next = [];

    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = current[index + 1] ?? left;
      next.push(hashNode(treeId, depth, left, right));
    }

    current = next;
    depth += 1;
  }

  return current[0] ?? emptyRoot(treeId);
}

function serviceNetworkAppendRoot(records, record) {
  return serviceNetworkCurrentRoot(record.treeId, [...records, { ...record, merkleRoot: "" }]);
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
    const insecureProduction = spawn("npm", ["run", service.script, "--", "--port", String(basePort + 100 + index)], {
      cwd: repoRoot,
      env: serviceNetworkTestEnv({
        NODE_ENV: "production",
      }),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let insecureStderr = "";
    insecureProduction.stderr.on("data", (chunk) => {
      insecureStderr += chunk.toString("utf8");
    });
    const insecureExitCode = await waitForExit(insecureProduction, 5_000);
    if (insecureExitCode === null) {
      insecureProduction.kill("SIGTERM");
      throw new Error(
        `Expected insecure production ${service.role} service to exit. stderr=${insecureStderr}`,
      );
    }
    assert(
      insecureStderr.includes(service.tokenEnv),
      `Expected missing production token guard for ${service.role}.`,
    );

    const storelessProduction = spawn(
      "npm",
      ["run", service.script, "--", "--port", String(basePort + 200 + index)],
      {
        cwd: repoRoot,
        env: serviceNetworkTestEnv({
          NODE_ENV: "production",
          [service.tokenEnv]: authToken,
        }),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let storelessStderr = "";
    storelessProduction.stderr.on("data", (chunk) => {
      storelessStderr += chunk.toString("utf8");
    });
    const storelessExitCode = await waitForExit(storelessProduction, 5_000);
    if (storelessExitCode === null) {
      storelessProduction.kill("SIGTERM");
      throw new Error(
        `Expected storeless production ${service.role} service to exit. stderr=${storelessStderr}`,
      );
    }
    assert(
      storelessStderr.includes(service.storeEnv),
      `Expected missing production store guard for ${service.role}.`,
    );

    const databaseBackedProduction = spawn(
      "npm",
      ["run", service.script, "--", "--port", String(basePort + 300 + index)],
      {
        cwd: repoRoot,
        env: serviceNetworkTestEnv({
          NODE_ENV: "production",
          [service.role === "indexer"
            ? "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL"
            : service.role === "prover"
              ? "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL"
              : service.role === "relayer"
                ? "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL"
                : "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL"]: `postgresql://vanta.invalid/private-pool-v2-${service.role}`,
          [service.tokenEnv]: authToken,
        }),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let databaseBackedStderr = "";
    databaseBackedProduction.stderr.on("data", (chunk) => {
      databaseBackedStderr += chunk.toString("utf8");
    });
    children.push({
      child: databaseBackedProduction,
      role: `${service.role}-production-database-guard`,
      stderr: () => databaseBackedStderr,
    });
    const databaseBackedHealth = await waitForHealth(`http://127.0.0.1:${basePort + 300 + index}`);
    assert(
      databaseBackedHealth.parsed?.storage?.kind === "postgres-jsonb-snapshot-store",
      `Expected ${service.role} production database health to expose Postgres storage.`,
    );
    assert(
      databaseBackedHealth.parsed?.storage?.durableStoreConfigured === true,
      `Expected ${service.role} production database health to expose durable storage.`,
    );
  }
  console.log("private-pool-v2 role production guards: PASS");

  for (const [index, service] of services.entries()) {
    const port = basePort + index;
    const baseUrl = `http://127.0.0.1:${port}`;
    serviceUrls.set(service.role, baseUrl);
    const child = spawn("npm", ["run", service.script, "--", "--port", String(port)], {
      cwd: repoRoot,
      env: serviceNetworkTestEnv({
        [service.tokenEnv]: authToken,
        ...(service.role === "indexer"
          ? { VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH: indexerStorePath }
          : {}),
        ...(service.role === "prover" ? { VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH: proverStorePath } : {}),
        ...(service.role === "relayer" ? { VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH: relayerStorePath } : {}),
        ...(service.role === "verifier"
          ? {
              VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: authToken,
              VANTA_PRIVATE_POOL_V2_INDEXER_URL: serviceUrls.get("indexer") ?? "",
              VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH: verifierStorePath,
            }
          : {}),
        VANTA_PRIVATE_POOL_V2_INDEXER_URL: serviceUrls.get("indexer") ?? "",
      }),
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
    if (service.role !== "operator") {
      assert(
        health.parsed?.storage?.durableStoreConfigured === true,
        `Expected ${service.role} service health to expose configured durable store.`,
      );
      assert(
        health.parsed?.storage?.productionReady === false,
        `Expected ${service.role} service storage to remain productionReady false.`,
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

  const runningProver = children.find((entry) => entry.role === "prover");
  assert(runningProver, "Expected running prover process.");
  await new Promise((resolvePromise) => {
    runningProver.child.once("close", resolvePromise);
    runningProver.child.kill("SIGTERM");
  });

  const restartedProver = spawn("npm", ["run", "private-pool-v2:prover", "--", "--port", String(basePort + 1)], {
    cwd: repoRoot,
    env: serviceNetworkTestEnv({
      VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH: proverStorePath,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let restartedProverStderr = "";
  restartedProver.stderr.on("data", (chunk) => {
    restartedProverStderr += chunk.toString("utf8");
  });
  children.push({ child: restartedProver, role: "prover-restart", stderr: () => restartedProverStderr });
  await waitForHealth(serviceUrls.get("prover"));

  const restoredProof = await requestJson(
    serviceUrls.get("prover"),
    `/v1/proofs/${encodeURIComponent(proof.parsed.publicInputCommitment)}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(restoredProof.ok, restoredProof.text || "Expected restored prover proof artifact.");
  assert(
    restoredProof.parsed?.proof?.publicInputCommitment === proof.parsed.publicInputCommitment,
    "Expected prover service to restore proof artifacts after restart.",
  );

  const receipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({ proof: proof.parsed, request: shieldRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(receipt.ok, receipt.text || "Expected verifier receipt.");
  assert(receipt.parsed?.intent === "shield", "Expected shield receipt intent.");

  const runningVerifier = children.find((entry) => entry.role === "verifier");
  assert(runningVerifier, "Expected running verifier process.");
  await new Promise((resolvePromise) => {
    runningVerifier.child.once("close", resolvePromise);
    runningVerifier.child.kill("SIGTERM");
  });

  const restartedVerifier = spawn("npm", ["run", "private-pool-v2:verifier", "--", "--port", String(basePort + 3)], {
    cwd: repoRoot,
    env: serviceNetworkTestEnv({
      VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_INDEXER_URL: serviceUrls.get("indexer"),
      VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH: verifierStorePath,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let restartedVerifierStderr = "";
  restartedVerifier.stderr.on("data", (chunk) => {
    restartedVerifierStderr += chunk.toString("utf8");
  });
  children.push({ child: restartedVerifier, role: "verifier-restart", stderr: () => restartedVerifierStderr });
  await waitForHealth(serviceUrls.get("verifier"));

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
    env: serviceNetworkTestEnv({
      VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH: indexerStorePath,
    }),
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

  const sendInputCommitment = restoredCommitments.parsed.commitments[0];
  const sendRecipientCommitment = {
    assetId: sendInputCommitment.assetId,
    commitment: "field:service-network-send-recipient-output",
    leafIndex: 1,
    treeId: sendInputCommitment.treeId,
  };
  const sendRecipientRoot = serviceNetworkAppendRoot(
    restoredCommitments.parsed.commitments,
    sendRecipientCommitment,
  );
  const sendChangeCommitment = {
    assetId: sendInputCommitment.assetId,
    commitment: "field:service-network-send-change-output",
    leafIndex: 2,
    treeId: sendInputCommitment.treeId,
  };
  const sendChangeRoot = serviceNetworkAppendRoot(
    [...restoredCommitments.parsed.commitments, { ...sendRecipientCommitment, merkleRoot: sendRecipientRoot }],
    sendChangeCommitment,
  );
  const privateSendRequest = {
    amountBaseUnits: "1",
    assetId: "hidden:economic-terms",
    circuitPublicInputs: ["send-public-input-hash:field:service-network-send-public-input-hash"],
    intent: "private-send",
    publicInputs: [
      "vanta-private-pool-v2-send-proof-request-0.1:version",
      `input-root:${sendInputCommitment.merkleRoot}`,
      `input-commitment:${sendInputCommitment.commitment}`,
      "nullifier:field:service-network-send-nullifier",
      "recipient-output-commitment:field:service-network-send-recipient-output",
      "recipient-leaf-index:1",
      `recipient-output-root:${sendRecipientRoot}`,
      "change-output-commitment:field:service-network-send-change-output",
      "change-leaf-index:2",
      `change-output-root:${sendChangeRoot}`,
      "asset-id-commitment:field:service-network-send-asset",
      "economics-commitment:field:service-network-send-economics",
      "owner-commitment:field:service-network-send-owner",
      "send-context-tag:field:service-network-send-context",
    ],
  };
  const privateSendProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: privateSendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(privateSendProof.ok, privateSendProof.text || "Expected private-send proof response.");
  const privateSendReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({ proof: privateSendProof.parsed, request: privateSendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(privateSendReceipt.ok, privateSendReceipt.text || "Expected private-send verifier receipt.");
  assert(privateSendReceipt.parsed?.intent === "private-send", "Expected private-send receipt intent.");
  assert(
    privateSendReceipt.parsed?.replayKey === "private-send:field:service-network-send-nullifier",
    "Expected private-send receipt to replay-key by nullifier.",
  );
  const privateSendNullifier = await requestJson(
    serviceUrls.get("indexer"),
    `/v1/nullifiers/${encodeURIComponent("field:service-network-send-nullifier")}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(
    privateSendNullifier.parsed?.nullifier?.nullifier === "field:service-network-send-nullifier",
    "Expected private-send verifier acceptance to register the send nullifier through the indexer service.",
  );
  const privateSendCommitments = await requestJson(
    serviceUrls.get("indexer"),
    "/v1/commitments?treeId=vanta-service-network-test-tree",
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(privateSendCommitments.ok, privateSendCommitments.text || "Expected private-send commitments.");
  assert(
    privateSendCommitments.parsed?.commitments?.length === 3,
    "Expected private-send verifier acceptance to append recipient and change commitments.",
  );
  assert(
    privateSendCommitments.parsed.commitments[1]?.commitment ===
      "field:service-network-send-recipient-output",
    "Expected private-send recipient output commitment to be indexed.",
  );
  assert(
    privateSendCommitments.parsed.commitments[2]?.commitment === "field:service-network-send-change-output",
    "Expected private-send change output commitment to be indexed.",
  );
  assert(
    privateSendCommitments.parsed.commitments[1]?.merkleRoot === sendRecipientRoot,
    "Expected private-send recipient output root to match the canonical service-network indexer root.",
  );
  assert(
    privateSendCommitments.parsed.commitments[2]?.merkleRoot === sendChangeRoot,
    "Expected private-send change output root to match the canonical service-network indexer root.",
  );
  const privateSendReplay = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({ proof: privateSendProof.parsed, request: privateSendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!privateSendReplay.ok, "Expected duplicate private-send proof receipt to be rejected.");

  const tamperedPrivateSendRequest = {
    ...privateSendRequest,
    publicInputs: privateSendRequest.publicInputs.map((input) =>
      input.startsWith("change-output-root:") ? "change-output-root:field:wrong-service-root" : input,
    ),
  };
  const tamperedPrivateSendProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: tamperedPrivateSendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(tamperedPrivateSendProof.ok, tamperedPrivateSendProof.text || "Expected tampered send proof.");
  const tamperedPrivateSendReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: tamperedPrivateSendProof.parsed,
      request: tamperedPrivateSendRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!tamperedPrivateSendReceipt.ok, "Expected tampered private-send output root to be rejected.");
  const afterTamperCommitments = await requestJson(
    serviceUrls.get("indexer"),
    "/v1/commitments?treeId=vanta-service-network-test-tree",
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(
    afterTamperCommitments.parsed?.commitments?.length === 3,
    "Expected rejected private-send transition not to append partial remote outputs.",
  );

  const staleInputCommitment = privateSendCommitments.parsed.commitments[0];
  const staleRecipientCommitment = {
    assetId: staleInputCommitment.assetId,
    commitment: "field:service-network-stale-send-recipient-output",
    leafIndex: 3,
    treeId: staleInputCommitment.treeId,
  };
  const staleRecipientRoot = serviceNetworkAppendRoot(
    privateSendCommitments.parsed.commitments,
    staleRecipientCommitment,
  );
  const staleChangeCommitment = {
    assetId: staleInputCommitment.assetId,
    commitment: "field:service-network-stale-send-change-output",
    leafIndex: 4,
    treeId: staleInputCommitment.treeId,
  };
  const staleChangeRoot = serviceNetworkAppendRoot(
    [...privateSendCommitments.parsed.commitments, { ...staleRecipientCommitment, merkleRoot: staleRecipientRoot }],
    staleChangeCommitment,
  );
  const staleRootPrivateSendRequest = {
    ...privateSendRequest,
    publicInputs: privateSendRequest.publicInputs.map((input) => {
      if (input.startsWith("nullifier:")) {
        return "nullifier:field:service-network-stale-send-nullifier";
      }
      if (input.startsWith("input-root:")) {
        return `input-root:${staleInputCommitment.merkleRoot}`;
      }
      if (input.startsWith("recipient-output-commitment:")) {
        return `recipient-output-commitment:${staleRecipientCommitment.commitment}`;
      }
      if (input.startsWith("recipient-leaf-index:")) {
        return "recipient-leaf-index:3";
      }
      if (input.startsWith("recipient-output-root:")) {
        return `recipient-output-root:${staleRecipientRoot}`;
      }
      if (input.startsWith("change-output-commitment:")) {
        return `change-output-commitment:${staleChangeCommitment.commitment}`;
      }
      if (input.startsWith("change-leaf-index:")) {
        return "change-leaf-index:4";
      }
      if (input.startsWith("change-output-root:")) {
        return `change-output-root:${staleChangeRoot}`;
      }
      return input;
    }),
  };
  const staleRootPrivateSendProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: staleRootPrivateSendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    staleRootPrivateSendProof.ok,
    staleRootPrivateSendProof.text || "Expected stale-root private-send proof response.",
  );
  const staleRootPrivateSendReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: staleRootPrivateSendProof.parsed,
      request: staleRootPrivateSendRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    !staleRootPrivateSendReceipt.ok,
    "Expected private-send proof with stale input root to be rejected.",
  );

  console.log("private-pool-v2 service-network private-send transition: PASS");

  const swapInputCommitment = privateSendCommitments.parsed.commitments[1];
  const swapOutputCommitment = {
    assetId: swapInputCommitment.assetId,
    commitment: "field:service-network-swap-output",
    leafIndex: 3,
    treeId: swapInputCommitment.treeId,
  };
  const swapOutputRoot = serviceNetworkAppendRoot(
    privateSendCommitments.parsed.commitments,
    swapOutputCommitment,
  );
  const swapToShieldedRequest = {
    amountBaseUnits: "1",
    assetId: "hidden:economic-terms",
    circuitPublicInputs: [
      "swap-public-input-hash:field:service-network-swap-public-input-hash",
    ],
    intent: "swap-to-shielded",
    publicInputs: [
      "vanta-private-pool-v2-swap-to-shielded-proof-request-0.1:version",
      `input-root:${privateSendCommitments.parsed.commitments[2].merkleRoot}`,
      `input-commitment:${swapInputCommitment.commitment}`,
      "nullifier-or-replay-commitment:field:service-network-swap-nullifier",
      "settlement-commitment:field:service-network-swap-settlement",
      "route-commitment:field:service-network-swap-route",
      "economics-commitment:field:service-network-swap-economics",
      `output-commitment:${swapOutputCommitment.commitment}`,
      "output-leaf-index:3",
      `output-root:${swapOutputRoot}`,
      "owner-commitment:field:service-network-swap-owner",
      "swap-context-tag:field:service-network-swap-context",
      "swap-public-input-hash:field:service-network-swap-public-input-hash",
    ],
  };
  const swapToShieldedProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: swapToShieldedRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(swapToShieldedProof.ok, swapToShieldedProof.text || "Expected swap-to-shielded proof response.");
  const swapToShieldedReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({ proof: swapToShieldedProof.parsed, request: swapToShieldedRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    swapToShieldedReceipt.ok,
    swapToShieldedReceipt.text || "Expected swap-to-shielded verifier receipt.",
  );
  assert(
    swapToShieldedReceipt.parsed?.intent === "swap-to-shielded",
    "Expected swap-to-shielded receipt intent.",
  );
  assert(
    swapToShieldedReceipt.parsed?.replayKey ===
      "swap-to-shielded:field:service-network-swap-nullifier",
    "Expected swap-to-shielded receipt to replay-key by nullifier/replay commitment.",
  );
  const swapNullifier = await requestJson(
    serviceUrls.get("indexer"),
    `/v1/nullifiers/${encodeURIComponent("field:service-network-swap-nullifier")}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(
    swapNullifier.parsed?.nullifier?.nullifier === "field:service-network-swap-nullifier",
    "Expected swap-to-shielded verifier acceptance to register the swap nullifier through the indexer service.",
  );
  const swapCommitments = await requestJson(
    serviceUrls.get("indexer"),
    "/v1/commitments?treeId=vanta-service-network-test-tree",
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(swapCommitments.ok, swapCommitments.text || "Expected swap-to-shielded commitments.");
  assert(
    swapCommitments.parsed?.commitments?.length === 4,
    "Expected swap-to-shielded verifier acceptance to append the output commitment.",
  );
  assert(
    swapCommitments.parsed.commitments[3]?.commitment === "field:service-network-swap-output",
    "Expected swap-to-shielded output commitment to be indexed.",
  );
  assert(
    swapCommitments.parsed.commitments[3]?.merkleRoot === swapOutputRoot,
    "Expected swap-to-shielded output root to match the canonical service-network indexer root.",
  );
  const swapReplay = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({ proof: swapToShieldedProof.parsed, request: swapToShieldedRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!swapReplay.ok, "Expected duplicate swap-to-shielded proof receipt to be rejected.");

  const tamperedSwapRequest = {
    ...swapToShieldedRequest,
    publicInputs: swapToShieldedRequest.publicInputs.map((input) => {
      if (input.startsWith("input-root:")) {
        return `input-root:${swapCommitments.parsed.commitments[3].merkleRoot}`;
      }
      if (input.startsWith("nullifier-or-replay-commitment:")) {
        return "nullifier-or-replay-commitment:field:service-network-bad-root-swap-nullifier";
      }
      if (input.startsWith("output-commitment:")) {
        return "output-commitment:field:service-network-bad-root-swap-output";
      }
      if (input.startsWith("output-leaf-index:")) {
        return "output-leaf-index:4";
      }
      return input.startsWith("output-root:") ? "output-root:field:wrong-service-swap-root" : input;
    }),
  };
  const tamperedSwapProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: tamperedSwapRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(tamperedSwapProof.ok, tamperedSwapProof.text || "Expected tampered swap proof.");
  const tamperedSwapReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: tamperedSwapProof.parsed,
      request: tamperedSwapRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!tamperedSwapReceipt.ok, "Expected tampered swap-to-shielded output root to be rejected.");

  const badLeafSwapRequest = {
    ...swapToShieldedRequest,
    publicInputs: swapToShieldedRequest.publicInputs.map((input) => {
      if (input.startsWith("input-root:")) {
        return `input-root:${swapCommitments.parsed.commitments[3].merkleRoot}`;
      }
      if (input.startsWith("nullifier-or-replay-commitment:")) {
        return "nullifier-or-replay-commitment:field:service-network-bad-leaf-swap-nullifier";
      }
      if (input.startsWith("output-commitment:")) {
        return "output-commitment:field:service-network-bad-leaf-swap-output";
      }
      if (input.startsWith("output-leaf-index:")) {
        return "output-leaf-index:5";
      }
      if (input.startsWith("output-root:")) {
        return `output-root:${serviceNetworkAppendRoot(swapCommitments.parsed.commitments, {
          assetId: swapInputCommitment.assetId,
          commitment: "field:service-network-bad-leaf-swap-output",
          leafIndex: 4,
          treeId: swapInputCommitment.treeId,
        })}`;
      }
      return input;
    }),
  };
  const badLeafSwapProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: badLeafSwapRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(badLeafSwapProof.ok, badLeafSwapProof.text || "Expected bad-leaf swap proof.");
  const badLeafSwapReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: badLeafSwapProof.parsed,
      request: badLeafSwapRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!badLeafSwapReceipt.ok, "Expected bad swap-to-shielded output leaf index to be rejected.");

  const staleSwapRequest = {
    ...swapToShieldedRequest,
    publicInputs: swapToShieldedRequest.publicInputs.map((input) => {
      if (input.startsWith("nullifier-or-replay-commitment:")) {
        return "nullifier-or-replay-commitment:field:service-network-stale-swap-nullifier";
      }
      if (input.startsWith("output-commitment:")) {
        return "output-commitment:field:service-network-stale-swap-output";
      }
      if (input.startsWith("output-leaf-index:")) {
        return "output-leaf-index:4";
      }
      if (input.startsWith("output-root:")) {
        return `output-root:${serviceNetworkAppendRoot(swapCommitments.parsed.commitments, {
          assetId: swapInputCommitment.assetId,
          commitment: "field:service-network-stale-swap-output",
          leafIndex: 4,
          treeId: swapInputCommitment.treeId,
        })}`;
      }
      return input;
    }),
  };
  const staleSwapProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: staleSwapRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(staleSwapProof.ok, staleSwapProof.text || "Expected stale-root swap proof response.");
  const staleSwapReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: staleSwapProof.parsed,
      request: staleSwapRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!staleSwapReceipt.ok, "Expected swap-to-shielded proof with stale input root to be rejected.");

  console.log("private-pool-v2 service-network swap-to-shielded transition: PASS");

  const actualPrivatePoolId = "pool:service-network-actual-private:100";
  const actualPrivateSeed = await requestJson(serviceUrls.get("indexer"), "/v1/commitments", {
    body: JSON.stringify({
      assetId: "stablecoin-usdc-v1",
      commitment: "field:service-network-actual-private-input",
      treeId: actualPrivatePoolId,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(actualPrivateSeed.ok, actualPrivateSeed.text || "Expected actual-private seed commitment.");
  const actualPrivateRoot = await requestJson(
    serviceUrls.get("indexer"),
    `/v1/roots/latest?treeId=${encodeURIComponent(actualPrivatePoolId)}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(actualPrivateRoot.ok, actualPrivateRoot.text || "Expected actual-private current root.");

  const actualPrivateSpendRequest = {
    amountBaseUnits: "1",
    assetId: "hidden:economic-terms",
    circuitPublicInputs: [
      "private-spend-public-input-hash:field:service-network-actual-private-public-input-hash",
    ],
    intent: "private-send",
    publicInputs: [
      "vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version",
      `pool-id:${actualPrivatePoolId}`,
      "asset-cohort:stablecoin-usdc-v1",
      `accepted-root:${actualPrivateRoot.parsed.root}`,
      "nullifier:field:service-network-actual-private-nullifier",
      "output-commitment-0:field:service-network-actual-private-merchant-output",
      "output-commitment-1:field:service-network-actual-private-change-output",
      "context-hash:field:service-network-actual-private-context",
      "private-spend-public-input-hash:field:service-network-actual-private-public-input-hash",
    ],
  };
  const actualPrivateSpendSerialized = JSON.stringify(actualPrivateSpendRequest);
  for (const forbidden of [
    "input-commitment:",
    "leaf-index:",
    "destination:",
    "amount:",
    "source-wallet:",
    "merchant-address:",
    "deposit-signature:",
  ]) {
    assert(
      !actualPrivateSpendSerialized.includes(forbidden),
      `Actual private service-network request leaked ${forbidden}.`,
    );
  }
  const actualPrivateSpendProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: actualPrivateSpendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    actualPrivateSpendProof.ok,
    actualPrivateSpendProof.text || "Expected actual-private spend proof response.",
  );
  const noIndexerVerifierPort = basePort + 50;
  const noIndexerVerifier = spawn("npm", ["run", "private-pool-v2:verifier", "--", "--port", String(noIndexerVerifierPort)], {
    cwd: repoRoot,
    env: serviceNetworkTestEnv({
      VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH: join(tempRoot, "verifier-no-indexer-state.json"),
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let noIndexerVerifierStderr = "";
  noIndexerVerifier.stderr.on("data", (chunk) => {
    noIndexerVerifierStderr += chunk.toString("utf8");
  });
  children.push({
    child: noIndexerVerifier,
    role: "verifier-no-indexer",
    stderr: () => noIndexerVerifierStderr,
  });
  const noIndexerVerifierUrl = `http://127.0.0.1:${noIndexerVerifierPort}`;
  await waitForHealth(noIndexerVerifierUrl);
  const noIndexerActualPrivateSpendReceipt = await requestJson(
    noIndexerVerifierUrl,
    "/v1/proofs/accept",
    {
      body: JSON.stringify({
        proof: actualPrivateSpendProof.parsed,
        request: actualPrivateSpendRequest,
      }),
      headers: { Authorization: `Bearer ${authToken}` },
      method: "POST",
    },
  );
  assert(
    !noIndexerActualPrivateSpendReceipt.ok,
    "Expected actual-private spend verifier acceptance without indexer mirroring to fail closed.",
  );
  const actualPrivateSpendReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: actualPrivateSpendProof.parsed,
      request: actualPrivateSpendRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    actualPrivateSpendReceipt.ok,
    actualPrivateSpendReceipt.text || "Expected actual-private spend verifier receipt.",
  );
  assert(
    actualPrivateSpendReceipt.parsed?.replayKey ===
      "private-send:field:service-network-actual-private-nullifier",
    "Expected actual-private spend receipt to replay-key by nullifier.",
  );
  const actualPrivateSpendNullifier = await requestJson(
    serviceUrls.get("indexer"),
    `/v1/nullifiers/${encodeURIComponent("field:service-network-actual-private-nullifier")}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(
    actualPrivateSpendNullifier.parsed?.nullifier?.nullifier ===
      "field:service-network-actual-private-nullifier",
    "Expected actual-private spend verifier acceptance to register the nullifier through the indexer service.",
  );
  const actualPrivateSpendCommitments = await requestJson(
    serviceUrls.get("indexer"),
    `/v1/commitments?treeId=${encodeURIComponent(actualPrivatePoolId)}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(
    actualPrivateSpendCommitments.parsed?.commitments?.length === 3,
    "Expected actual-private spend verifier acceptance to preserve the seed and append both output commitments.",
  );
  assert(
    actualPrivateSpendCommitments.parsed.commitments[1]?.commitment ===
      "field:service-network-actual-private-merchant-output",
    "Expected actual-private spend merchant output commitment to be indexed.",
  );
  assert(
    actualPrivateSpendCommitments.parsed.commitments[2]?.commitment ===
      "field:service-network-actual-private-change-output",
    "Expected actual-private spend change output commitment to be indexed.",
  );
  const actualPrivateSpendReplay = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: actualPrivateSpendProof.parsed,
      request: actualPrivateSpendRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!actualPrivateSpendReplay.ok, "Expected duplicate actual-private spend receipt to be rejected.");

  const malformedActualPrivateSpendRequest = {
    ...actualPrivateSpendRequest,
    publicInputs: actualPrivateSpendRequest.publicInputs.filter(
      (input) => !input.startsWith("output-commitment-1:"),
    ).map((input) =>
      input.startsWith("nullifier:")
        ? "nullifier:field:service-network-actual-private-malformed-nullifier"
        : input,
    ),
  };
  const malformedActualPrivateSpendProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: malformedActualPrivateSpendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(malformedActualPrivateSpendProof.ok, "Expected malformed actual-private proof artifact.");
  const malformedActualPrivateSpendReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: malformedActualPrivateSpendProof.parsed,
      request: malformedActualPrivateSpendRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    !malformedActualPrivateSpendReceipt.ok,
    "Expected malformed actual-private output shape to be rejected.",
  );

  const staleActualPrivateSpendRequest = {
    ...actualPrivateSpendRequest,
    publicInputs: actualPrivateSpendRequest.publicInputs.map((input) => {
      if (input.startsWith("accepted-root:")) {
        return "accepted-root:field:service-network-actual-private-stale-root";
      }
      if (input.startsWith("nullifier:")) {
        return "nullifier:field:service-network-actual-private-stale-root-nullifier";
      }
      if (input.startsWith("output-commitment-0:")) {
        return "output-commitment-0:field:service-network-actual-private-stale-merchant-output";
      }
      if (input.startsWith("output-commitment-1:")) {
        return "output-commitment-1:field:service-network-actual-private-stale-change-output";
      }
      return input;
    }),
  };
  const staleActualPrivateSpendProof = await requestJson(serviceUrls.get("prover"), "/v1/proofs", {
    body: JSON.stringify({ request: staleActualPrivateSpendRequest }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(staleActualPrivateSpendProof.ok, "Expected stale-root actual-private proof artifact.");
  const staleActualPrivateSpendReceipt = await requestJson(serviceUrls.get("verifier"), "/v1/proofs/accept", {
    body: JSON.stringify({
      proof: staleActualPrivateSpendProof.parsed,
      request: staleActualPrivateSpendRequest,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    !staleActualPrivateSpendReceipt.ok,
    "Expected actual-private spend with stale accepted root to be rejected.",
  );
  const afterRejectedActualPrivateSpendCommitments = await requestJson(
    serviceUrls.get("indexer"),
    `/v1/commitments?treeId=${encodeURIComponent(actualPrivatePoolId)}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(
    afterRejectedActualPrivateSpendCommitments.parsed?.commitments?.length === 3,
    "Expected rejected actual-private proofs to leave indexer commitments unchanged.",
  );

  const privateSpendSubmission = await requestJson(serviceUrls.get("relayer"), "/v1/private-spends/submit", {
    body: JSON.stringify({
      proofReceiptId: actualPrivateSpendReceipt.parsed.receiptId,
      publicInputCommitment: actualPrivateSpendReceipt.parsed.publicInputCommitment,
      serializedTransaction: "serialized-private-spend-service-network-test",
      settlementId: "settlement:service-network-actual-private",
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(privateSpendSubmission.ok, privateSpendSubmission.text || "Expected private spend relayer submission.");
  assert(
    privateSpendSubmission.parsed?.submittedBy === "relayer",
    "Expected private spend submission to be marked relayer-submitted.",
  );
  assert(
    String(privateSpendSubmission.parsed?.signature ?? "").startsWith("0x"),
    "Expected local service-network private spend signature to remain deterministic mock evidence.",
  );
  const duplicatePrivateSpendSubmission = await requestJson(serviceUrls.get("relayer"), "/v1/private-spends/submit", {
    body: JSON.stringify({
      proofReceiptId: actualPrivateSpendReceipt.parsed.receiptId,
      publicInputCommitment: actualPrivateSpendReceipt.parsed.publicInputCommitment,
      serializedTransaction: "serialized-private-spend-service-network-test",
      settlementId: "settlement:service-network-actual-private",
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!duplicatePrivateSpendSubmission.ok, "Expected duplicate private spend relayer submission to be rejected.");

  console.log("private-pool-v2 service-network actual-private spend transition: PASS");

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

  const runningRelayer = children.find((entry) => entry.role === "relayer");
  assert(runningRelayer, "Expected running relayer process.");
  await new Promise((resolvePromise) => {
    runningRelayer.child.once("close", resolvePromise);
    runningRelayer.child.kill("SIGTERM");
  });

  const restartedRelayer = spawn("npm", ["run", "private-pool-v2:relayer", "--", "--port", String(basePort + 2)], {
    cwd: repoRoot,
    env: serviceNetworkTestEnv({
      VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH: relayerStorePath,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let restartedRelayerStderr = "";
  restartedRelayer.stderr.on("data", (chunk) => {
    restartedRelayerStderr += chunk.toString("utf8");
  });
  children.push({ child: restartedRelayer, role: "relayer-restart", stderr: () => restartedRelayerStderr });
  await waitForHealth(serviceUrls.get("relayer"));

  const submittedClaim = await requestJson(serviceUrls.get("relayer"), "/v1/claims/submit", {
    body: JSON.stringify({
      quote: quote.parsed,
      serializedTransaction: "serialized-claim-service-network-test",
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(submittedClaim.ok, submittedClaim.text || "Expected restored relayer quote to submit after restart.");

  console.log("private-pool-v2 proof roundtrip across services: PASS");

  const operatorPort = basePort + services.length;
  const operatorBaseUrl = `http://127.0.0.1:${operatorPort}`;
  const operator = spawn("npm", ["run", "private-pool-v2:operator"], {
    cwd: repoRoot,
    env: serviceNetworkTestEnv({
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
    }),
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
  assert(
    remoteOperatorStatus.parsed?.protocolEnforcement?.layer ===
      "operator-claim-preflight-plus-verifier-receipt-idempotency-plus-indexer-nullifier-registration",
    "Expected remote operator status to expose the stronger protocol replay layer.",
  );
  assert(
    remoteOperatorStatus.parsed?.protocolEnforcement?.finalLayerImplemented === true,
    "Expected remote operator status to mark the final protocol replay layer implemented.",
  );
  assert(
    remoteOperatorStatus.parsed?.protocolEnforcement?.finalLayerProductionReady === false,
    "Expected remote operator status to keep the protocol replay layer productionReady false.",
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
    !remotePaySettlement.ok && remotePaySettlement.status >= 400,
    remotePaySettlement.text || operatorStderr || "Expected remote operator raw Pay settlement rejection.",
  );
  assert(
    String(remotePaySettlement.parsed?.error ?? "").includes(
      "Legacy raw Pay settlements are disabled",
    ),
    "Expected remote operator Pay settlement rejection to point to committed protocol settlements.",
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
