import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-mock-proof-boundary-"));
const storePath = join(tempRoot, "private-pool-v2-mock-proof-boundary.json");
const port = 11780 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
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

async function waitForHealth(server) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error("Private Pool V2 operator exited before health check.");
    }

    try {
      const response = await requestJson("/health");
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

async function waitForExit(server) {
  if (server.exitCode !== null) {
    return server.exitCode;
  }

  return await new Promise((resolvePromise) => {
    const timeout = setTimeout(() => resolvePromise(null), 2_000);
    server.once("exit", (code) => {
      clearTimeout(timeout);
      resolvePromise(code);
    });
  });
}

const productionLocalServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VANTA_PRIVATE_POOL_V2_DATABASE_URL: "postgres://127.0.0.1:1/vanta_mock_boundary",
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-live-token",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port + 1_000),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let productionLocalStderr = "";
productionLocalServer.stderr.on("data", (chunk) => {
  productionLocalStderr += chunk.toString("utf8");
});
const productionLocalExitCode = await waitForExit(productionLocalServer);
if (productionLocalExitCode === null) {
  productionLocalServer.kill("SIGTERM");
  throw new Error("Expected production local-benchmark Private Pool V2 operator to exit.");
}
assert(
  productionLocalStderr.includes("VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services"),
  "Expected production startup to reject local mock-proof runtime mode.",
);
console.log("private-pool-v2 production mock runtime rejection: PASS");

const server = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port),
    VANTA_PRIVATE_POOL_V2_REQUIRE_PRODUCTION_PROOF_SYSTEM: "true",
    VANTA_PRIVATE_POOL_V2_STORE_PATH: storePath,
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

  const status = await requestJson("/state/private-pool-v2-status");
  assert(status.ok, status.text || "Expected operator status response.");
  assert(
    status.parsed?.settlementPolicy?.mockProofRealFundsBlocked === true,
    "Expected settlement policy to block mock proofs from real-funds settlement.",
  );
  assert(
    status.parsed?.settlementPolicy?.productionProofSystemRequired === true,
    "Expected settlement policy to require production proof systems for real-funds settlement.",
  );
  assert(
    status.parsed?.proofTrustBoundary?.mockProofRealFundsAllowed === false,
    "Expected proof trust boundary to expose mock real-funds rejection.",
  );
  assert(
    status.parsed?.proofTrustBoundary?.productionProofSystemRequiredNow === true,
    "Expected proof trust boundary to show production proof requirement is active.",
  );
  assert(
    status.parsed?.proofTrustBoundary?.acceptedProductionProofSystems?.includes("noir-bb"),
    "Expected proof trust boundary to list accepted production proof systems.",
  );
  console.log("private-pool-v2 mock proof status boundary: PASS");

  const mockBackedSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      acceptedRoot: "field:mock-accepted-root",
      action: "send",
      assetCohort: "USDC:100",
      changeOutputCommitment: "field:mock-change-output",
      economicsCommitment: "field:mock-economics",
      economicsMode: "committed-economics",
      nullifierOrReplayCommitment: "field:mock-nullifier",
      outputCommitment: "field:mock-merchant-output",
      ownerCommitment: "field:mock-owner",
      poolId: "pool:stablecoin-usdc-v1:100",
      privateSpendContextHash: "field:mock-context",
      privateSpendPublicInputHash: "field:mock-public-input-hash",
      routeCommitment: "field:mock-route",
      settlementCommitment: "field:mock-settlement",
      settlementId: "mock-proof-boundary-send",
    }),
    method: "POST",
  });
  assert(!mockBackedSettlement.ok, "Expected mock-proof-backed real-funds settlement to reject.");
  assert(
    String(mockBackedSettlement.parsed?.error ?? mockBackedSettlement.text).includes(
      "requires a production ZK proof system",
    ),
    mockBackedSettlement.text || "Expected production proof-system error.",
  );
  console.log("private-pool-v2 mock proof settlement rejection: PASS");

  const directMockProof = await requestJson("/private-pool-v2/proofs", {
    body: JSON.stringify({
      proof: {
        proofBytes: [1, 2, 3],
        proofSystem: "mock",
        publicInputCommitment: "field:direct-mock-public-input",
        verifyingKeyId: "mock-verifying-key",
      },
      request: {
        amountBaseUnits: "1",
        assetId: "hidden:economic-terms",
        intent: "private-send",
        publicInputs: [
          "vanta-private-pool-v2-hidden-economics-proof-request-0.1:version",
          "intent:private-send",
          "nullifier:field:direct-mock-nullifier",
        ],
      },
      requestId: "direct-mock-proof-boundary",
    }),
    method: "POST",
  });
  assert(!directMockProof.ok, "Expected direct mock proof acceptance to reject.");
  assert(
    String(directMockProof.parsed?.error ?? directMockProof.text).includes(
      "requires a production ZK proof system",
    ),
    directMockProof.text || "Expected direct proof production proof-system error.",
  );
  console.log("private-pool-v2 direct mock proof rejection: PASS");

  const spoofedLocalBackendProof = await requestJson("/private-pool-v2/proofs", {
    body: JSON.stringify({
      proof: {
        proofBackend: "local-mock",
        proofBytes: [1, 2, 3],
        proofSystem: "noir-bb",
        publicInputCommitment: "field:spoofed-local-backend-public-input",
        verifyingKeyId: "mock-verifying-key",
      },
      request: {
        amountBaseUnits: "1",
        assetId: "hidden:economic-terms",
        intent: "private-send",
        publicInputs: [
          "vanta-private-pool-v2-hidden-economics-proof-request-0.1:version",
          "intent:private-send",
          "nullifier:field:spoofed-local-backend-nullifier",
        ],
      },
      requestId: "spoofed-local-backend-proof-boundary",
    }),
    method: "POST",
  });
  assert(!spoofedLocalBackendProof.ok, "Expected spoofed local-backend proof acceptance to reject.");
  assert(
    String(spoofedLocalBackendProof.parsed?.error ?? spoofedLocalBackendProof.text).includes(
      "requires a remote production proof backend",
    ),
    spoofedLocalBackendProof.text || "Expected production proof-backend error.",
  );
  console.log("private-pool-v2 spoofed local-backend proof rejection: PASS");
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
  rmSync(tempRoot, { recursive: true, force: true });
}
