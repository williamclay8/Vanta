import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const serviceVersion = "vanta-private-pool-v2-service-network-0.1";
const textEncoder = new TextEncoder();

const roleConfig = {
  indexer: {
    defaultPort: 8801,
    service: "vanta-private-pool-v2-indexer",
    storeEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
  },
  prover: {
    defaultPort: 8802,
    service: "vanta-private-pool-v2-prover",
    storeEnv: "VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
  },
  relayer: {
    defaultPort: 8803,
    service: "vanta-private-pool-v2-relayer",
    storeEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
  },
  verifier: {
    defaultPort: 8804,
    service: "vanta-private-pool-v2-verifier",
    storeEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
  },
};

function hashHex(...parts) {
  return `0x${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f"))))}`;
}

function normalizeForJson(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeForJson(nested)]),
    );
  }

  return value;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(`${JSON.stringify(normalizeForJson(payload), null, 2)}\n`);
}

function parseCliPort(defaultPort) {
  const portIndex = process.argv.indexOf("--port");
  if (portIndex >= 0) {
    const value = Number(process.argv[portIndex + 1]);
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
  }

  return Number(process.env.PORT ?? defaultPort);
}

function readRequestBody(request) {
  return new Promise((resolvePromise, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });
    request.on("end", () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function toBigInt(value, fallback = 0n) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return BigInt(String(value));
}

function basePayload(role) {
  const storePath = process.env[roleConfig[role].storeEnv];
  return {
    mainnetReady: false,
    ok: true,
    privacyRail: "vanta-private-pool-v2",
    productionReady: false,
    role,
    service: roleConfig[role].service,
    serviceNetworkReady: true,
    storage: {
      durableStoreConfigured: Boolean(storePath),
      kind: storePath ? "local-json-snapshot-store" : "in-memory",
      productionReady: false,
    },
    version: serviceVersion,
    warnings: [
      "This service is a separated Private Pool v2 runtime surface, not audited production proving infrastructure.",
      "Keep productionReady and mainnetReady false until deployed services, secret refs, production smoke evidence, audit, legal/custody review, and explicit mainnet funds approval are complete.",
    ],
  };
}

function requireAuth({ authToken, request, response, role }) {
  if (request.method === "GET" && request.url === "/health") {
    return true;
  }

  if (!authToken) {
    if (process.env.NODE_ENV === "production") {
      sendJson(response, 500, {
        error: `${role} service requires ${roleConfig[role].tokenEnv} in production.`,
        ok: false,
      });
      return false;
    }

    return true;
  }

  if (request.headers.authorization !== `Bearer ${authToken}`) {
    sendJson(response, 401, {
      error: `Missing or invalid Private Pool v2 ${role} token.`,
      ok: false,
    });
    return false;
  }

  return true;
}

function assertProductionRoleConfig(role) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const { storeEnv, tokenEnv } = roleConfig[role];
  if (!process.env[tokenEnv]) {
    throw new Error(`Private Pool v2 ${role} production service requires ${tokenEnv}.`);
  }

  if (!process.env[storeEnv]) {
    throw new Error(`Private Pool v2 ${role} production service requires ${storeEnv}.`);
  }
}

function readSnapshot(storePath, defaultSnapshot) {
  if (!storePath || !existsSync(storePath)) {
    return defaultSnapshot;
  }

  return JSON.parse(readFileSync(storePath, "utf8"));
}

function writeSnapshot(storePath, snapshot) {
  if (!storePath) {
    return;
  }

  const resolvedStorePath = resolve(storePath);
  mkdirSync(dirname(resolvedStorePath), { recursive: true });
  const tempPath = `${resolvedStorePath}.${process.pid}.tmp`;
  writeFileSync(
    tempPath,
    `${JSON.stringify(
      {
        ...normalizeForJson(snapshot),
        stateVersion: 1,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  renameSync(tempPath, resolvedStorePath);
}

function readIndexerSnapshot(storePath) {
  const parsed = readSnapshot(storePath, { commitments: [], nullifiers: [] });
  return {
    commitments: (parsed.commitments ?? []).map((record) => ({
      assetId: String(record.assetId),
      commitment: String(record.commitment),
      leafIndex: Number(record.leafIndex),
      merkleRoot: String(record.merkleRoot),
      treeId: String(record.treeId),
    })),
    nullifiers: (parsed.nullifiers ?? []).map((record) => ({
      nullifier: String(record.nullifier),
      spentAtSlot:
        record.spentAtSlot === null || record.spentAtSlot === undefined
          ? null
          : toBigInt(record.spentAtSlot),
    })),
  };
}

function writeIndexerSnapshot(storePath, snapshot) {
  writeSnapshot(storePath, snapshot);
}

function createInMemoryIndexerState({ storePath } = {}) {
  const snapshot = readIndexerSnapshot(storePath);
  const commitments = [...snapshot.commitments];
  const nullifiers = new Map(snapshot.nullifiers.map((record) => [record.nullifier, record]));

  function save() {
    writeIndexerSnapshot(storePath, {
      commitments,
      nullifiers: [...nullifiers.values()],
    });
  }

  function currentRoot(treeId) {
    const treeCommitments = commitments.filter((record) => record.treeId === treeId);
    if (treeCommitments.length === 0) {
      return hashHex(serviceVersion, "empty-root", treeId);
    }

    return hashHex(
      serviceVersion,
      "root",
      treeId,
      ...treeCommitments.map((record) => `${record.leafIndex}:${record.commitment}`),
    );
  }

  return {
    appendCommitment({ assetId, commitment, treeId }) {
      const leafIndex = commitments.filter((record) => record.treeId === treeId).length;
      const record = {
        assetId,
        commitment,
        leafIndex,
        merkleRoot: hashHex(serviceVersion, "root", treeId, String(leafIndex), commitment),
        treeId,
      };
      commitments.push(record);
      save();
      return record;
    },
    currentRoot,
    getCommitment(commitment) {
      return commitments.find((record) => record.commitment === commitment) ?? null;
    },
    getNullifier(nullifier) {
      return nullifiers.get(nullifier) ?? null;
    },
    listCommitments({ assetId, fromLeafIndex = 0, treeId }) {
      return commitments.filter(
        (record) =>
          record.treeId === treeId &&
          record.leafIndex >= fromLeafIndex &&
          (!assetId || record.assetId === assetId),
      );
    },
    registerNullifier({ nullifier, spentAtSlot = 1_000_000n }) {
      if (nullifiers.has(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }
      const record = { nullifier, spentAtSlot };
      nullifiers.set(nullifier, record);
      save();
      return record;
    },
  };
}

function proofResultFor(request) {
  const serializedRequest = JSON.stringify(normalizeForJson(request));
  const publicInputCommitment = hashHex(serviceVersion, "public-inputs", serializedRequest);
  const proofMaterial = hashHex(serviceVersion, "proof", publicInputCommitment);

  return {
    proofBytes: [...textEncoder.encode(proofMaterial)],
    proofSystem: "mock",
    publicInputCommitment,
    verifyingKeyId: "vanta-private-pool-v2:service-network-verifying-key-0.1",
  };
}

function createProverState({ storePath } = {}) {
  const snapshot = readSnapshot(storePath, { proofs: [] });
  const proofs = new Map((snapshot.proofs ?? []).map((proof) => [proof.publicInputCommitment, proof]));

  function save() {
    writeSnapshot(storePath, { proofs: [...proofs.values()] });
  }

  return {
    get(publicInputCommitment) {
      return proofs.get(publicInputCommitment) ?? null;
    },
    put(proof) {
      proofs.set(proof.publicInputCommitment, proof);
      save();
      return proof;
    },
  };
}

function quoteKey(quote) {
  return [
    String(quote.relayerId),
    String(quote.estimatedFeeBaseUnits),
    String(quote.expiresAtSlot),
  ].join(":");
}

function createRelayerState({ storePath } = {}) {
  const snapshot = readSnapshot(storePath, { claims: [], quotes: [] });
  const quotes = new Map((snapshot.quotes ?? []).map((quote) => [quoteKey(quote), quote]));
  const claims = new Map((snapshot.claims ?? []).map((claim) => [quoteKey(claim.quote), claim]));

  function save() {
    writeSnapshot(storePath, {
      claims: [...claims.values()],
      quotes: [...quotes.values()],
    });
  }

  return {
    getQuote(quote) {
      return quotes.get(quoteKey(quote)) ?? null;
    },
    putQuote(quote) {
      quotes.set(quoteKey(quote), quote);
      save();
      return quote;
    },
    submitClaim({ quote, serializedTransaction }) {
      const key = quoteKey(quote);
      if (!quotes.has(key)) {
        throw new Error(`Unknown relayer quote ${quote.relayerId}.`);
      }
      if (claims.has(key)) {
        throw new Error(`Relayer quote ${quote.relayerId} has already been submitted.`);
      }

      const claim = {
        quote,
        relayerId: String(quote.relayerId),
        serializedTransaction: String(serializedTransaction),
        signature: hashHex(serviceVersion, "claim", key, String(serializedTransaction)),
      };
      claims.set(key, claim);
      save();
      return claim;
    },
  };
}

function createVerifierState({ storePath } = {}) {
  const snapshot = readSnapshot(storePath, { acceptedProofs: [] });
  const acceptedProofs = new Map(
    (snapshot.acceptedProofs ?? []).map((receipt) => [receipt.replayKey, receipt]),
  );

  function save() {
    writeSnapshot(storePath, { acceptedProofs: [...acceptedProofs.values()] });
  }

  return {
    get(replayKey) {
      return acceptedProofs.get(replayKey) ?? null;
    },
    put(receipt) {
      acceptedProofs.set(receipt.replayKey, receipt);
      save();
      return receipt;
    },
  };
}

function proofMatches({ proof, request }) {
  if (!proof || !request) {
    return false;
  }

  const expected = proofResultFor(request);
  return (
    proof.proofSystem === expected.proofSystem &&
    proof.publicInputCommitment === expected.publicInputCommitment &&
    proof.verifyingKeyId === expected.verifyingKeyId &&
    JSON.stringify(proof.proofBytes ?? []) === JSON.stringify(expected.proofBytes)
  );
}

function readPublicInput(request, prefix) {
  return request?.publicInputs
    ?.find((input) => String(input).startsWith(prefix))
    ?.slice(prefix.length) ?? null;
}

function requirePublicInput(request, prefix) {
  const value = readPublicInput(request, prefix);
  if (!value) {
    throw new Error(`Proof receipt requires public input ${prefix}.`);
  }

  return value;
}

function replayKeyFor(request) {
  if (request?.intent === "claim") {
    const nullifier = readPublicInput(request, "nullifier:");
    return `claim:${nullifier ?? request.publicInputs?.join("|") ?? "unknown"}`;
  }

  if (request?.intent === "shield") {
    const commitment = readPublicInput(request, "output-commitment:");
    return `shield:${commitment ?? request.publicInputs?.join("|") ?? "unknown"}`;
  }

  return `${request?.intent ?? "proof"}:${request?.publicInputs?.join("|") ?? "unknown"}`;
}

async function postIndexerJson(path, body) {
  const baseUrl = process.env.VANTA_PRIVATE_POOL_V2_INDEXER_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return null;
  }

  const authToken = process.env.VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN;
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    method: "POST",
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Private Pool v2 indexer write failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function mirrorAcceptedProofToIndexer(request) {
  if (request?.intent === "shield") {
    return await postIndexerJson("/v1/commitments", {
      assetId: requirePublicInput(request, "target-asset:"),
      commitment: requirePublicInput(request, "output-commitment:"),
      treeId: requirePublicInput(request, "tree-id:"),
    });
  }

  if (request?.intent === "claim") {
    const nullifier = requirePublicInput(request, "nullifier:");
    return await postIndexerJson("/v1/nullifiers", { nullifier });
  }

  return null;
}

function createServiceHandlers(role, {
  indexerStorePath,
  proverStorePath,
  relayerStorePath,
  verifierStorePath,
} = {}) {
  const indexerState = createInMemoryIndexerState({ storePath: indexerStorePath });
  const proverState = createProverState({ storePath: proverStorePath });
  const relayerState = createRelayerState({ storePath: relayerStorePath });
  const verifierState = createVerifierState({ storePath: verifierStorePath });

  async function handleIndexer({ request, response }) {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/v1/roots/latest") {
      const treeId = url.searchParams.get("treeId") ?? "vanta-private-pool-v2-default-tree";
      sendJson(response, 200, {
        ...basePayload(role),
        root: indexerState.currentRoot(treeId),
        treeId,
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/v1/commitments") {
      const treeId = url.searchParams.get("treeId") ?? "vanta-private-pool-v2-default-tree";
      sendJson(response, 200, {
        ...basePayload(role),
        commitments: indexerState.listCommitments({
          assetId: url.searchParams.get("assetId") ?? undefined,
          fromLeafIndex: Number(url.searchParams.get("fromLeafIndex") ?? "0"),
          treeId,
        }),
      });
      return true;
    }

    if (request.method === "GET" && url.pathname.startsWith("/v1/commitments/")) {
      const commitment = decodeURIComponent(url.pathname.split("/")[3] ?? "");
      const leaf = indexerState.getCommitment(commitment);
      if (!leaf) {
        sendJson(response, 404, { error: `Unknown private-pool commitment ${commitment}.`, ok: false });
        return true;
      }
      sendJson(response, 200, {
        ...basePayload(role),
        leaf,
        path: [],
        pathIndices: [],
        root: leaf.merkleRoot,
      });
      return true;
    }

    if (request.method === "GET" && url.pathname.startsWith("/v1/nullifiers/")) {
      const nullifier = decodeURIComponent(url.pathname.split("/")[3] ?? "");
      sendJson(response, 200, {
        ...basePayload(role),
        nullifier: indexerState.getNullifier(nullifier),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/v1/nullifiers") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        nullifier: indexerState.registerNullifier({
          nullifier: String(body.nullifier),
          spentAtSlot: body.spentAtSlot === undefined ? 1_000_000n : toBigInt(body.spentAtSlot),
        }),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/v1/commitments") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        commitment: indexerState.appendCommitment(body),
      });
      return true;
    }

    return false;
  }

  async function handleProver({ request, response }) {
    if (request.method === "GET" && request.url === "/v1/proofs/health") {
      sendJson(response, 200, {
        ...basePayload(role),
        proofSystem: "mock",
        ready: true,
      });
      return true;
    }

    if (request.method === "POST" && request.url === "/v1/proofs") {
      const body = await readRequestBody(request);
      const requestBody = body.request ?? body;
      if (toBigInt(requestBody.amountBaseUnits) <= 0n) {
        throw new Error("Proof amount must be positive.");
      }
      sendJson(response, 200, proverState.put(proofResultFor(requestBody)));
      return true;
    }

    if (request.method === "GET" && request.url?.startsWith("/v1/proofs/")) {
      const url = new URL(request.url, "http://127.0.0.1");
      const publicInputCommitment = decodeURIComponent(url.pathname.split("/")[3] ?? "");
      const proof = proverState.get(publicInputCommitment);
      if (!proof) {
        sendJson(response, 404, { error: `Unknown proof ${publicInputCommitment}.`, ok: false });
        return true;
      }
      sendJson(response, 200, {
        ...basePayload(role),
        proof,
      });
      return true;
    }

    if (request.method === "POST" && request.url === "/v1/proofs/verify") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        accepted: proofMatches(body),
      });
      return true;
    }

    return false;
  }

  async function handleRelayer({ request, response }) {
    if (request.method === "GET" && request.url === "/v1/claims/quote") {
      sendJson(response, 200, {
        ...basePayload(role),
        quoteMode: "deterministic-no-real-funds",
      });
      return true;
    }

    if (request.method === "POST" && request.url === "/v1/claims/quote") {
      const body = await readRequestBody(request);
      const amountBaseUnits = toBigInt(body.amountBaseUnits);
      if (amountBaseUnits <= 0n) {
        throw new Error("Claim amount must be positive.");
      }
      const relayerId = `vanta-service-relayer:${hashHex(
        serviceVersion,
        "quote",
        String(body.assetId),
        String(body.destinationAddress),
        amountBaseUnits.toString(),
      ).slice(2, 18)}`;
      sendJson(response, 200, relayerState.putQuote({
        estimatedFeeBaseUnits: (amountBaseUnits * 10n) / 10_000n,
        expiresAtSlot: 1_000_150n,
        relayerId,
      }));
      return true;
    }

    if (request.method === "POST" && request.url === "/v1/claims/submit") {
      const body = await readRequestBody(request);
      sendJson(response, 200, relayerState.submitClaim(body));
      return true;
    }

    return false;
  }

  async function handleVerifier({ request, response }) {
    if (request.method === "GET" && request.url === "/v1/proofs/accept") {
      sendJson(response, 200, {
        ...basePayload(role),
        verifierMode: "deterministic-no-real-funds",
      });
      return true;
    }

    if (request.method === "POST" && request.url === "/v1/proofs/accept") {
      const body = await readRequestBody(request);
      const requestBody = body.request;
      const proof = body.proof;
      const replayKey = replayKeyFor(requestBody);
      if (verifierState.get(replayKey)) {
        throw new Error(`Private Pool v2 receipt ${replayKey} has already been accepted.`);
      }
      if (!proofMatches({ proof, request: requestBody })) {
        throw new Error("Private Pool v2 proof verification failed.");
      }
      await mirrorAcceptedProofToIndexer(requestBody);
      const receipt = {
        assetId: String(requestBody.assetId),
        intent: requestBody.intent,
        publicInputCommitment: proof.publicInputCommitment,
        receiptId: hashHex(serviceVersion, "receipt", replayKey, proof.publicInputCommitment),
        recordedAtSlot: 1_000_000n,
        replayKey,
      };
      verifierState.put(receipt);
      sendJson(response, 200, receipt);
      return true;
    }

    return false;
  }

  return {
    indexer: handleIndexer,
    prover: handleProver,
    relayer: handleRelayer,
    verifier: handleVerifier,
  }[role];
}

export function startVantaPrivatePoolV2RoleService(role) {
  if (!roleConfig[role]) {
    throw new Error(`Unknown Private Pool v2 service role ${role}.`);
  }
  assertProductionRoleConfig(role);

  const host = process.env.HOST ?? "0.0.0.0";
  const port = parseCliPort(roleConfig[role].defaultPort);
  const authToken = process.env[roleConfig[role].tokenEnv];
  const handleRoleRequest = createServiceHandlers(role, {
    indexerStorePath: process.env.VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH,
    proverStorePath: process.env.VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH,
    relayerStorePath: process.env.VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH,
    verifierStorePath: process.env.VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH,
  });

  const server = createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        sendJson(response, 200, basePayload(role));
        return;
      }

      if (!requireAuth({ authToken, request, response, role })) {
        return;
      }

      if (await handleRoleRequest({ request, response })) {
        return;
      }

      sendJson(response, 404, { error: "Not found.", ok: false });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
      });
    }
  });

  server.listen(port, host);

  function close() {
    server.close(() => process.exit(0));
  }

  process.on("SIGTERM", close);
  process.on("SIGINT", close);

  return server;
}
