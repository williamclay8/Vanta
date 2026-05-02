import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { Keypair } from "@solana/web3.js";

const repoRoot = resolve(import.meta.dirname, "..");
const solUnshieldOperatorHealthSource = readFileSync(
  resolve(repoRoot, "src/solana/solUnshieldOperatorHealth.ts"),
  "utf8",
);
const unshieldServerSource = readFileSync(resolve(repoRoot, "operator/unshield-server.mjs"), "utf8");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-sol-unshield-operator-"));
const readyKeypair = Keypair.generate();
const blockedKeypair = Keypair.generate();

function printStatus(message) {
  console.log(message);
}

async function reservePort() {
  return await new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.on("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) {
          resolvePort(port);
        } else {
          rejectPort(new Error("Could not reserve an ephemeral port."));
        }
      });
    });
  });
}

function createOperatorEnv({ port, signer, vaultOwner }) {
  return {
    ...process.env,
    SOLANA_RPC_URL: "https://api.devnet.solana.com",
    VANTA_DEVNET_TOKEN_MINT: "So11111111111111111111111111111111111111112",
    VANTA_DEVNET_VAULT_OWNER: vaultOwner,
    VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY: signer
      ? JSON.stringify(Array.from(signer.secretKey))
      : "",
    VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, `consumes-${port}.json`),
    VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, `proofs-${port}.json`),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, `private-core-releases-${port}.json`),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, `roots-${port}.json`),
    VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, `send-proofs-${port}.json`),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, `sends-${port}.json`),
    VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, `swap-proofs-${port}.json`),
    VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, `swaps-${port}.json`),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, `releases-${port}.json`),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, `sol-unshields-${port}.json`),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, `swap-records-${port}.json`),
    VANTA_UNSHIELD_OPERATOR_PORT: String(port),
  };
}

function startOperator(env) {
  const child = spawn("node", ["operator/unshield-server.mjs"], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return { child, getStderr: () => stderr };
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { body, ok: response.ok, status: response.status, text };
}

async function waitForServer(baseUrl, getStderr) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    try {
      const response = await fetch(`${baseUrl}/state/private-core-summary`);
      if (response.ok) {
        return;
      }
    } catch {
      // Wait for the listener.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  throw new Error(`Timed out waiting for SOL unshield operator.\n${getStderr()}`);
}

async function stopOperator(child) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    setTimeout(resolveStop, 2_000);
  });
}

async function withOperator(env, fn) {
  const { child, getStderr } = startOperator(env);
  try {
    const baseUrl = `http://127.0.0.1:${env.VANTA_UNSHIELD_OPERATOR_PORT}`;
    await waitForServer(baseUrl, getStderr);
    await fn(baseUrl);
  } finally {
    await stopOperator(child);
  }
}

try {
  assert.ok(
    solUnshieldOperatorHealthSource.includes("replace(/\\/+$"),
    "SOL health client must strip trailing slashes before resolving health path.",
  );
  assert.ok(
    solUnshieldOperatorHealthSource.includes("await response.text()") &&
      solUnshieldOperatorHealthSource.includes("JSON.parse(responseText || \"{}\")"),
    "SOL health client must handle non-JSON failures without response.json().",
  );
  assert.ok(
    unshieldServerSource.includes("parsePositiveIntegerEnv(") &&
      unshieldServerSource.includes("VANTA_UNSHIELD_OPERATOR_MAX_JSON_BODY_BYTES"),
    "Unshield operator must validate max JSON body bytes as a positive integer.",
  );

  const readyPort = await reservePort();
  const blockedPort = await reservePort();

  await withOperator(
    createOperatorEnv({
      port: readyPort,
      signer: readyKeypair,
      vaultOwner: readyKeypair.publicKey.toBase58(),
    }),
    async (baseUrl) => {
      const health = await requestJson(baseUrl, "/health/sol-unshield");
      assert.equal(health.status, 200, health.text);
      assert.equal(health.body?.ready, true, "Expected configured SOL unshield health.");
      assert.equal(health.body?.endpoint, "/unshield/sol");
      assert.equal(health.body?.releaseModel, "operator-signed-devnet-sol-transfer");
      assert.equal(health.body?.signerAddress, readyKeypair.publicKey.toBase58());
      printStatus("SOL unshield operator health ready: PASS");

      const malformed = await requestJson(baseUrl, "/unshield/sol", {
        body: JSON.stringify({}),
        method: "POST",
      });
      assert.equal(malformed.status, 400);
      assert.match(malformed.text, /Invalid authenticated SOL unshield request/);
      printStatus("SOL unshield malformed request rejection: PASS");

      const records = await requestJson(baseUrl, "/state/sol-unshield-records");
      assert.equal(records.status, 200, records.text);
      assert.deepEqual(records.body?.consumedNoteIds, []);
      printStatus("SOL unshield record state endpoint: PASS");
    },
  );

  await withOperator(
    createOperatorEnv({
      port: blockedPort,
      signer: blockedKeypair,
      vaultOwner: readyKeypair.publicKey.toBase58(),
    }),
    async (baseUrl) => {
      const health = await requestJson(baseUrl, "/health/sol-unshield");
      assert.equal(health.status, 503, health.text);
      assert.equal(health.body?.ready, false, "Expected mismatched signer health to be blocked.");
      assert.equal(
        health.body?.checks?.some(
          (check) => check.check === "vault-signer-matches-owner" && check.ready === false,
        ),
        true,
        "Expected SOL health to expose signer/vault mismatch.",
      );
      printStatus("SOL unshield operator health signer mismatch: PASS");
    },
  );
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
