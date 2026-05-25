import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const solUnshieldOperatorHealthSource = readFileSync(
  resolve(repoRoot, "src/solana/solUnshieldOperatorHealth.ts"),
  "utf8",
);
const unshieldServerSource = readFileSync(resolve(repoRoot, "operator/unshield-server.mjs"), "utf8");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-sol-unshield-operator-"));
const fixtureVaultOwner = "11111111111111111111111111111111";

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
    SOLANA_RPC_URL: "https://api.mainnet-beta.solana.com",
    VANTA_MAINNET_TOKEN_MINT: "So11111111111111111111111111111111111111112",
    VANTA_MAINNET_VAULT_OWNER: vaultOwner,
    VANTA_MAINNET_VAULT_SIGNER_SECRET_KEY: signer ? "legacy-unused" : "",
    VANTA_SOLANA_CLUSTER: "mainnet-beta",
    VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, `consumes-${port}.json`),
    VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, `proofs-${port}.json`),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, `private-core-releases-${port}.json`),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, `roots-${port}.json`),
    VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, `send-proofs-${port}.json`),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, `sends-${port}.json`),
    VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, `swap-proofs-${port}.json`),
    VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, `swaps-${port}.json`),
	    VANTA_UNSHIELD_RELEASE_STORE_PATH: join(tempRoot, `releases-${port}.json`),
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

  await withOperator(
    createOperatorEnv({
      port: readyPort,
      signer: null,
      vaultOwner: fixtureVaultOwner,
    }),
    async (baseUrl) => {
      const health = await requestJson(baseUrl, "/health/sol-unshield");
      assert.equal(health.status, 503, health.text);
      assert.equal(health.body?.ready, false, "Expected SOL unshield health to fail closed.");
      assert.equal(health.body?.endpoint, "/unshield/sol");
      assert.equal(health.body?.releaseModel, "program-tag-unshield-pda-cpi-fail-closed");
      assert.equal(health.body?.signerAddress, null);
      assert.equal(
        health.body?.checks?.some(
          (check) => check.check === "tag-unshield-program-relay" && check.ready === false,
        ),
        true,
        "Expected SOL health to expose fail-closed TAG_UNSHIELD relay status.",
      );
      printStatus("SOL unshield operator health fail-closed: PASS");

      const malformed = await requestJson(baseUrl, "/unshield/sol", {
        body: JSON.stringify({}),
        method: "POST",
      });
      assert.equal(malformed.status, 400);
      assert.match(malformed.text, /Invalid authenticated SOL unshield request/);
      printStatus("SOL unshield malformed request rejection: PASS");

      const records = await requestJson(baseUrl, "/state/sol-unshield-records");
      assert.equal(records.status, 200, records.text);
      assert.equal(records.body?.stateVersion, 1);
      assert.deepEqual(records.body?.consumedNoteReferenceHashes, []);
      assert.equal(records.body?.consumedNoteIds, undefined);
      assert.equal(records.body?.records, undefined);
      printStatus("SOL unshield hashed record state endpoint: PASS");

      const tokenRecords = await requestJson(baseUrl, "/state/unshield-records");
      assert.equal(tokenRecords.status, 200, tokenRecords.text);
      assert.equal(tokenRecords.body?.stateVersion, 1);
      assert.deepEqual(tokenRecords.body?.consumedNoteReferenceHashes, []);
      assert.equal(tokenRecords.body?.consumedNoteIds, undefined);
      assert.equal(tokenRecords.body?.records, undefined);
      printStatus("Token unshield hashed record state endpoint: PASS");
    },
  );

  const missingVaultOwnerPort = await reservePort();
  const missingVaultOwnerEnv = createOperatorEnv({
    port: missingVaultOwnerPort,
    signer: null,
    vaultOwner: "",
  });
  missingVaultOwnerEnv.VANTA_MAINNET_VAULT_OWNER = "";
  missingVaultOwnerEnv.VITE_VANTA_MAINNET_VAULT_OWNER = "";
  missingVaultOwnerEnv.VANTA_VAULT_OWNER = "";
  missingVaultOwnerEnv.VITE_VANTA_VAULT_OWNER = "";

  await withOperator(missingVaultOwnerEnv, async (baseUrl) => {
    const health = await requestJson(baseUrl, "/health/sol-unshield");
    assert.equal(health.status, 503, health.text);
    assert.equal(
      health.body?.kind,
      "vanta-sol-unshield-operator-health",
      "Expected missing env vault owner to still expose shaped SOL health.",
    );
    assert.equal(
      health.body?.checks?.some(
        (check) => check.check === "vault-owner" && check.ready === false,
      ),
      true,
      "Expected SOL health to fail closed without an explicit vault owner.",
    );
    assert.equal(
      health.body?.checks?.some(
        (check) => check.check === "tag-unshield-program-relay" && check.ready === false,
      ),
      true,
      "Expected SOL health to remain blocked until TAG_UNSHIELD relay is wired.",
    );
    printStatus("SOL unshield missing vault-owner health: PASS");
  });
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
