import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const tempParent = resolve(repoRoot, ".tmp");
mkdirSync(tempParent, { recursive: true });

const port = 13_900 + Math.floor(Math.random() * 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
const authToken = "vanta-indexer-view-tag-pull-test-token";
const tempRoot = mkdtempSync(resolve(tempParent, "vanta-indexer-view-tag-pull-"));
const indexerStorePath = join(tempRoot, "indexer-state.json");
const sendDiscoveryPacketVersion = "vanta-private-pool-v2-send-discovery-packet-0.1";
const viewTagPullPath = "/v1/send-discovery/view-tags";

const forbiddenResponseKeys = new Set(
  [
    "amount",
    "amountBaseUnits",
    "authToken",
    "authorization",
    "bearer",
    "cf-connecting-ip",
    "ip",
    "memo",
    "noteBlinding",
    "note_blinding",
    "owner",
    "ownerPubkey",
    "ownerPublicKey",
    "ownerSecret",
    "owner_secret",
    "plaintext",
    "plaintextMemo",
    "privateInputs",
    "proof",
    "proofBytes",
    "rawIpAddress",
    "rawPrivateInputs",
    "recipient",
    "recipientAddress",
    "recipientOwnerPublicKey",
    "recipientWallet",
    "sender",
    "senderWallet",
    "token",
    "user-agent",
    "userAgent",
    "viewingKeyPlaintext",
    "viewingSecretKey",
    "wallet",
    "witness",
    "x-forwarded-for",
  ].map((key) => key.toLowerCase()),
);

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

async function waitForHealth(processLabel, childProcess, stderr = () => "") {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (childProcess.exitCode !== null) {
      throw new Error(
        `${processLabel} exited before becoming healthy with code ${childProcess.exitCode}. ${stderr()}`,
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

function sha256Hex(label) {
  return createHash("sha256").update(label).digest("hex");
}

function discoveryPacket({
  audience = "recipient",
  encryptedViewTag,
  label,
  outputLeafIndex,
  recordedAtSlot,
}) {
  const bodyHash = `sha256:${sha256Hex(`view-tag-pull:${label}:body`)}`;
  return {
    audience,
    encryptedViewTag,
    memoCiphertextBodyHash: bodyHash,
    memoCiphertextRef: `solana:memo:view-tag-pull-${label}:0`,
    outputCommitment: `field:view-tag-pull-output-${label}`,
    outputLeafIndex,
    outputRoot: `field:view-tag-pull-root-${label}`,
    productionReady: false,
    proofBoundMemoCiphertextBodyHash: bodyHash,
    proofReceiptId: `receipt:view-tag-pull-${label}`,
    proofReceiptPublicInputCommitment: `0x${sha256Hex(`view-tag-pull:${label}:public-input`)}`,
    recordedAtSlot,
    sendPublicInputHash: `field:view-tag-pull-public-input-${label}`,
    treeId: "vanta-view-tag-pull-test-tree",
    version: sendDiscoveryPacketVersion,
  };
}

function authHeaders() {
  return { Authorization: `Bearer ${authToken}` };
}

function viewTagPullUrl(params) {
  const search = new URLSearchParams(params);
  return `${viewTagPullPath}?${search.toString()}`;
}

async function postPacket(packet) {
  return await requestJson("/v1/send-discovery-packets", {
    body: JSON.stringify(packet),
    headers: authHeaders(),
    method: "POST",
  });
}

function collectForbiddenResponseKeys(value, path = []) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const failures = [];
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (forbiddenResponseKeys.has(key.toLowerCase())) {
      failures.push(nextPath.join("."));
    }
    if (Array.isArray(nested)) {
      for (const [index, entry] of nested.entries()) {
        failures.push(...collectForbiddenResponseKeys(entry, [...nextPath, String(index)]));
      }
    } else {
      failures.push(...collectForbiddenResponseKeys(nested, nextPath));
    }
  }
  return failures;
}

function assertNoForbiddenResponseKeys(payload, label) {
  const failures = collectForbiddenResponseKeys(payload);
  assert(
    failures.length === 0,
    `${label} exposed forbidden sender/recipient/plaintext/network/private fields: ${failures.join(", ")}.`,
  );
}

assert(
  packageJson.scripts?.["indexer:view-tag-pull-check"] ===
    "node scripts/check-vanta-indexer-view-tag-pull.mjs",
  "Expected package script indexer:view-tag-pull-check to run this guard.",
);
assert(
  packageJson.scripts?.["private-pool-v2:indexer"] ===
    "node operator/private-pool-v2-indexer-server.mjs",
  "Expected package script private-pool-v2:indexer to start the indexer service.",
);

const packets = [
  discoveryPacket({
    encryptedViewTag: "vtag:0011223344556677",
    label: "first",
    outputLeafIndex: 1,
    recordedAtSlot: "1000000",
  }),
  discoveryPacket({
    encryptedViewTag: "vtag:001122aa44556677",
    label: "second",
    outputLeafIndex: 2,
    recordedAtSlot: "1000001",
  }),
  discoveryPacket({
    encryptedViewTag: "vtag:0099223344556677",
    label: "outside-prefix",
    outputLeafIndex: 3,
    recordedAtSlot: "1000002",
  }),
  discoveryPacket({
    audience: "change",
    encryptedViewTag: "vtag:001122cc44556677",
    label: "change-output",
    outputLeafIndex: 4,
    recordedAtSlot: "1000003",
  }),
];

let runningIndexer = startIndexer("Private Pool v2 view-tag pull indexer");

try {
  await waitForHealth(runningIndexer.processLabel, runningIndexer.child, runningIndexer.stderr);

  const unauthenticated = await requestJson(viewTagPullUrl({ viewTagPrefix: "vtag:001122" }));
  assert(unauthenticated.status === 401, "View-tag pull endpoint must require bearer auth.");

  const status = await requestJson("/v1/send-discovery/status", {
    headers: authHeaders(),
  });
  assert(status.ok, status.text || "Expected Send discovery status.");
  assert(
    status.parsed?.sendDiscovery?.viewTagPull?.implemented === true &&
      status.parsed?.sendDiscovery?.viewTagPull?.productionReady === false,
    "Send discovery status must expose view-tag prefix pull as local-only and not production-ready.",
  );
  assert(
    status.parsed?.sendDiscovery?.viewTagPull?.queryMode === "prefix-bucket" &&
      status.parsed?.sendDiscovery?.viewTagPull?.prefixPolicy?.rejectsFullEncryptedViewTag === true,
    "View-tag pull status must advertise prefix-bucket semantics and reject exact full tags.",
  );

  for (const packet of packets) {
    const posted = await postPacket(packet);
    assert(posted.ok, posted.text || `Expected ${packet.outputCommitment} to be accepted.`);
    assert(
      posted.parsed?.packet?.productionReady === false,
      "Indexed Send discovery packets must stay local-only and not production-ready.",
    );
  }

  const rawIpRejected = await postPacket({
    ...packets[0],
    encryptedViewTag: "vtag:2011223344556677",
    outputCommitment: "field:view-tag-pull-raw-ip-rejected",
    outputLeafIndex: 20,
    rawIpAddress: "203.0.113.10",
  });
  assert(!rawIpRejected.ok, "Indexer must reject raw IP fields in discovery packets.");

  const firstPage = await requestJson(
    viewTagPullUrl({
      audience: "recipient",
      fromSlot: "999999",
      limit: "1",
      viewTagPrefix: "vtag:001122",
    }),
    { headers: authHeaders() },
  );
  assert(firstPage.ok, firstPage.text || "Expected first prefix pull page.");
  assert(
    firstPage.parsed?.viewTagPull?.implemented === true &&
      firstPage.parsed?.viewTagPull?.productionReady === false &&
      firstPage.parsed?.viewTagPull?.queryMode === "prefix-bucket",
    "Prefix pull response must expose local-only prefix-bucket status.",
  );
  assert(
    firstPage.parsed?.packets?.length === 1 &&
      firstPage.parsed.packets[0]?.encryptedViewTag === packets[0].encryptedViewTag,
    "Expected first page to return the earliest matching recipient packet.",
  );
  assert(
    typeof firstPage.parsed?.nextCursor === "string" && firstPage.parsed.nextCursor.length > 0,
    "Expected first page to include a stable cursor when more matching packets exist.",
  );
  assertNoForbiddenResponseKeys(firstPage.parsed?.packets, "first prefix pull page");

  const secondPage = await requestJson(
    viewTagPullUrl({
      audience: "recipient",
      cursor: firstPage.parsed.nextCursor,
      fromSlot: "999999",
      limit: "10",
      viewTagPrefix: "vtag:001122",
    }),
    { headers: authHeaders() },
  );
  assert(secondPage.ok, secondPage.text || "Expected second prefix pull page.");
  assert(
    secondPage.parsed?.packets?.length === 1 &&
      secondPage.parsed.packets[0]?.encryptedViewTag === packets[1].encryptedViewTag &&
      secondPage.parsed?.nextCursor === null,
    "Expected second page to return the remaining matching recipient packet and close pagination.",
  );
  assertNoForbiddenResponseKeys(secondPage.parsed?.packets, "second prefix pull page");

  const allMatches = await requestJson(
    viewTagPullUrl({
      audience: "recipient",
      fromSlot: "999999",
      limit: "10",
      viewTagPrefix: "vtag:001122",
    }),
    { headers: authHeaders() },
  );
  assert(allMatches.ok, allMatches.text || "Expected full prefix pull page.");
  assert(
    allMatches.parsed?.packets?.length === 2 &&
      allMatches.parsed.packets.every((packet) => packet.audience === "recipient") &&
      !allMatches.parsed.packets.some(
        (packet) => packet.encryptedViewTag === packets[2].encryptedViewTag,
      ),
    "Prefix pull must return only matching recipient candidates, not unrelated tags or change outputs.",
  );
  assertNoForbiddenResponseKeys(allMatches.parsed?.packets, "full prefix pull page");

  const rejectedQueries = [
    viewTagPullUrl({ viewTagPrefix: "vtag:001" }),
    viewTagPullUrl({ viewTagPrefix: "vtag:001122zz" }),
    viewTagPullUrl({ viewTagPrefix: "vtag:0011223344556677" }),
    viewTagPullUrl({ encryptedViewTag: packets[0].encryptedViewTag, viewTagPrefix: "vtag:001122" }),
    viewTagPullUrl({ recipient: "RecipientWallet11111111111111111111111111", viewTagPrefix: "vtag:001122" }),
    viewTagPullUrl({ recipientOwnerPublicKey: "Owner111111111111111111111111111111111", viewTagPrefix: "vtag:001122" }),
    viewTagPullUrl({ amount: "1000000", viewTagPrefix: "vtag:001122" }),
    viewTagPullUrl({ userId: "user-123", viewTagPrefix: "vtag:001122" }),
    viewTagPullUrl({ cursor: "not-a-valid-cursor", viewTagPrefix: "vtag:001122" }),
  ];
  for (const rejectedPath of rejectedQueries) {
    const rejected = await requestJson(rejectedPath, { headers: authHeaders() });
    assert(!rejected.ok, `Expected view-tag pull query to reject ${rejectedPath}.`);
  }

  await stopChild(runningIndexer.child);
  runningIndexer = startIndexer("Private Pool v2 view-tag pull indexer restart");
  await waitForHealth(runningIndexer.processLabel, runningIndexer.child, runningIndexer.stderr);

  const persistedMatches = await requestJson(
    viewTagPullUrl({
      audience: "recipient",
      fromSlot: "999999",
      limit: "10",
      viewTagPrefix: "vtag:001122",
    }),
    { headers: authHeaders() },
  );
  assert(persistedMatches.ok, persistedMatches.text || "Expected persisted prefix pull page.");
  assert(
    persistedMatches.parsed?.packets?.length === 2,
    "Expected view-tag prefix pull candidates to persist across indexer restart.",
  );

  console.log("PASS indexer:view-tag-pull-check");
} finally {
  await stopChild(runningIndexer.child);
  rmSync(tempRoot, { force: true, recursive: true });
}
