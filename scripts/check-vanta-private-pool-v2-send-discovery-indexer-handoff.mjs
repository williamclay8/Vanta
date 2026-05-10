import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const port = 13_800 + Math.floor(Math.random() * 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
const authToken = "vanta-send-discovery-indexer-test-token";
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-send-discovery-indexer-"));
const indexerStorePath = join(tempRoot, "indexer-state.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForExit(childProcess, timeoutMs = 1_500) {
  if (childProcess.exitCode !== null) {
    return childProcess.exitCode;
  }

  return await new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(null), timeoutMs);
    childProcess.once("close", (code) => {
      clearTimeout(timer);
      resolvePromise(code);
    });
  });
}

async function requestJson(path, options = {}) {
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

async function waitForHealth(processLabel, childProcess) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (childProcess.exitCode !== null) {
      throw new Error(
        `${processLabel} exited before becoming healthy with code ${childProcess.exitCode}.`,
      );
    }
    try {
      const response = await requestJson("/health");
      if (response.ok) {
        return response;
      }
    } catch {
      // Service still booting.
    }
    await sleep(250);
  }
  throw new Error(`${processLabel} did not become healthy at ${baseUrl}.`);
}

async function stopChild(childProcess) {
  if (childProcess.exitCode !== null) {
    return childProcess.exitCode;
  }
  childProcess.kill("SIGTERM");
  const exitCode = await waitForExit(childProcess);
  if (exitCode === null) {
    childProcess.kill("SIGKILL");
    return await waitForExit(childProcess, 1_500);
  }
  return exitCode;
}

function cleanEnv(overrides = {}) {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) => !name.startsWith("VANTA_PRIVATE_POOL_V2_") && name !== "NODE_ENV",
      ),
    ),
    ...overrides,
  };
}

const validPacket = {
  audience: "recipient",
  encryptedViewTag: "vtag:0011223344556677",
  memoCiphertextBodyHash:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  memoCiphertextRef: "solana:memo:send-discovery-test-signature:0",
  outputCommitment: "field:send-discovery-recipient-output",
  outputLeafIndex: 1,
  outputRoot: "field:send-discovery-output-root",
  productionReady: false,
  proofBoundMemoCiphertextBodyHash:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  proofReceiptId: "receipt:send-discovery-test",
  proofReceiptPublicInputCommitment:
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  recordedAtSlot: "1000000",
  sendPublicInputHash: "field:send-discovery-public-input-hash",
  treeId: "vanta-send-discovery-test-tree",
  version: "vanta-private-pool-v2-send-discovery-packet-0.1",
};

assert(
  packageJson.scripts?.["private-pool-v2:indexer"] ===
    "node operator/private-pool-v2-indexer-server.mjs",
  "Expected package script private-pool-v2:indexer to start the indexer service.",
);

function startIndexer(processLabel) {
  const child = spawn("npm", ["run", "private-pool-v2:indexer", "--", "--port", String(port)], {
    cwd: repoRoot,
    env: cleanEnv({
      VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH: indexerStorePath,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  return { child, processLabel, stderr: () => stderr };
}

let runningIndexer = startIndexer("Private Pool v2 Send discovery indexer");

try {
  await waitForHealth(runningIndexer.processLabel, runningIndexer.child);

  const unauthenticated = await requestJson("/v1/send-discovery/status");
  assert(unauthenticated.status === 401, "Send discovery status must require bearer auth.");

  const status = await requestJson("/v1/send-discovery/status", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert(status.ok, status.text || "Expected Send discovery status.");
  assert(
    status.parsed?.sendDiscovery?.implemented === true &&
      status.parsed?.sendDiscovery?.productionReady === false,
    "Send discovery status must expose local implementation without production readiness.",
  );
  assert(
    status.parsed?.sendDiscovery?.blockerIds?.includes(
      "send-memo-indexer-body-hash-handoff-not-deployed",
    ) &&
      status.parsed?.sendDiscovery?.blockerIds?.includes(
        "legacy-v1-send-history-migration-not-scoped",
      ),
    "Send discovery status must expose the exact production blocker ids.",
  );

  const posted = await requestJson("/v1/send-discovery-packets", {
    body: JSON.stringify(validPacket),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(posted.ok, posted.text || "Expected valid Send discovery packet to be accepted.");
  assert(
    posted.parsed?.packet?.productionReady === false &&
      posted.parsed?.packet?.claimBoundary ===
        "local encrypted-view-tag index only; not production recipient discovery",
    "Accepted Send discovery packet must preserve the beta-truth claim boundary.",
  );
  assert(
    posted.parsed?.packet?.memoCiphertextBodyHash === validPacket.memoCiphertextBodyHash &&
      posted.parsed?.packet?.proofBoundMemoCiphertextBodyHash ===
        validPacket.memoCiphertextBodyHash,
    "Accepted Send discovery packet must bind the indexed body hash to the proof-bound body hash.",
  );

  const listed = await requestJson(
    `/v1/send-discovery-packets?audience=recipient&encryptedViewTag=${encodeURIComponent(
      validPacket.encryptedViewTag,
    )}&fromSlot=999999`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(listed.ok, listed.text || "Expected filtered Send discovery packet list.");
  assert(
    listed.parsed?.packets?.length === 1 &&
      listed.parsed.packets[0]?.packetId === posted.parsed.packet.packetId,
    "Expected Send discovery packet to be queryable by audience, tag, and slot.",
  );

  const duplicate = await requestJson("/v1/send-discovery-packets", {
    body: JSON.stringify(validPacket),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(!duplicate.ok, "Duplicate Send discovery packet ids must be rejected.");

  const rejectedPackets = [
    {
      label: "raw amount",
      packet: { ...validPacket, encryptedViewTag: "vtag:1011223344556677", amount: "12.5" },
    },
    {
      label: "amount alias",
      packet: {
        ...validPacket,
        amountBaseUnits: "12500000",
        encryptedViewTag: "vtag:1111223344556677",
      },
    },
    {
      label: "recipient alias",
      packet: {
        ...validPacket,
        encryptedViewTag: "vtag:1211223344556677",
        recipientAddress: "RecipientWallet11111111111111111111111111",
      },
    },
    {
      label: "owner alias",
      packet: {
        ...validPacket,
        encryptedViewTag: "vtag:1311223344556677",
        ownerPubkey: "OwnerWallet111111111111111111111111111111",
      },
    },
    {
      label: "unsupported debug field",
      packet: {
        ...validPacket,
        debugSafeNote: "not part of the packet schema",
        encryptedViewTag: "vtag:1411223344556677",
      },
    },
    {
      label: "nested recipient",
      packet: {
        ...validPacket,
        encryptedViewTag: "vtag:2011223344556677",
        debug: { recipient: "RecipientWallet11111111111111111111111111" },
      },
    },
    {
      label: "malformed body hash",
      packet: {
        ...validPacket,
        encryptedViewTag: "vtag:3011223344556677",
        memoCiphertextBodyHash: "sha256:not-a-valid-hash",
      },
    },
    {
      label: "empty output leaf index",
      packet: {
        ...validPacket,
        encryptedViewTag: "vtag:3111223344556677",
        outputLeafIndex: "",
      },
    },
    {
      label: "null output leaf index",
      packet: {
        ...validPacket,
        encryptedViewTag: "vtag:3211223344556677",
        outputLeafIndex: null,
      },
    },
    {
      label: "mismatched proof-bound body hash",
      packet: {
        ...validPacket,
        encryptedViewTag: "vtag:4011223344556677",
        proofBoundMemoCiphertextBodyHash:
          "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    },
    {
      label: "production readiness overclaim",
      packet: { ...validPacket, encryptedViewTag: "vtag:5011223344556677", productionReady: true },
    },
    {
      label: "tampered packet id",
      packet: { ...validPacket, encryptedViewTag: "vtag:6011223344556677", packetId: "0xwrong" },
    },
  ];

  for (const { label, packet } of rejectedPackets) {
    const rejected = await requestJson("/v1/send-discovery-packets", {
      body: JSON.stringify(packet),
      headers: { Authorization: `Bearer ${authToken}` },
      method: "POST",
    });
    assert(!rejected.ok, `Expected Send discovery packet with ${label} to be rejected.`);
  }

  const finalStatus = await requestJson("/v1/send-discovery/status", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert(
    finalStatus.parsed?.sendDiscovery?.localPacketCount === 1 &&
      finalStatus.parsed?.sendDiscovery?.productionReady === false,
    "Rejected Send discovery packets must not change local packet count or readiness.",
  );

  const stopped = await stopChild(runningIndexer.child);
  assert(stopped === 0 || stopped === null, `Indexer should stop cleanly. stderr=${runningIndexer.stderr()}`);
  runningIndexer = startIndexer("restarted Private Pool v2 Send discovery indexer");
  await waitForHealth(runningIndexer.processLabel, runningIndexer.child);
  const restored = await requestJson(
    `/v1/send-discovery-packets?audience=recipient&encryptedViewTag=${encodeURIComponent(
      validPacket.encryptedViewTag,
    )}`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  assert(restored.ok, restored.text || "Expected restored Send discovery packet list.");
  assert(
    restored.parsed?.packets?.length === 1 &&
      restored.parsed.packets[0]?.packetId === posted.parsed.packet.packetId,
    "Expected Send discovery packets to persist across indexer restart.",
  );

  console.log("private-pool-v2 Send discovery indexer handoff: PASS");
} finally {
  const exitCode = runningIndexer ? await stopChild(runningIndexer.child) : 0;
  rmSync(tempRoot, { force: true, recursive: true });
  if (exitCode && exitCode !== 0) {
    throw new Error(`Indexer exited with code ${exitCode}. stderr=${runningIndexer.stderr()}`);
  }
}
