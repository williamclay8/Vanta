import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { createVantaPrivatePoolV2SolanaRelayerSubmitterFromEnv } from "../src/privacy/privatePoolV2SolanaRelayerSubmission.mjs";
import { createPrivatePoolV2RoleSnapshotStore } from "../src/storage/vantaPrivatePoolV2RoleSnapshotStore.mjs";

const serviceVersion = "vanta-private-pool-v2-service-network-0.1";
const proofBackend = "remote-service";
const textEncoder = new TextEncoder();
const sendDiscoveryPacketVersion = "vanta-private-pool-v2-send-discovery-packet-0.1";
const sendDiscoveryClaimBoundary =
  "local encrypted-view-tag index only; not production recipient discovery";
const sendDiscoveryBlockerIds = [
  "send-memo-indexer-body-hash-handoff-not-deployed",
];
const sendLegacyHistoryScope = {
  freshV2OnlyClaimScoped: true,
  legacyV1EligibleForProductionPrivacyClaims: false,
  legacyV1ParseCompatible: true,
  migrated: false,
  productionReady: false,
  scopeBoundary:
    "production Send privacy claims are scoped to fresh v2 AEAD sends unless legacy v1 plaintext history is migrated or segregated with reviewed evidence",
  status: "fresh-v2-only-production-claim-scope",
  version: "vanta-send-history-privacy-scope-0.1",
};

const roleConfig = {
  indexer: {
    databaseEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL",
    defaultPort: 8801,
    service: "vanta-private-pool-v2-indexer",
    storeEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
  },
  prover: {
    databaseEnv: "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL",
    defaultPort: 8802,
    service: "vanta-private-pool-v2-prover",
    storeEnv: "VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
  },
  relayer: {
    databaseEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
    defaultPort: 8803,
    service: "vanta-private-pool-v2-relayer",
    storeEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
  },
  verifier: {
    databaseEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL",
    defaultPort: 8804,
    service: "vanta-private-pool-v2-verifier",
    storeEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH",
    tokenEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
  },
};

function hashHex(...parts) {
  return `0x${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f"))))}`;
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

function currentMerkleRoot(treeId, records) {
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

function optionalPlainObject(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value) || typeof value !== "object") {
    throw new Error(`Private Pool v2 relayer requires ${fieldName} to be an object.`);
  }
  return value;
}

const forbiddenPrivateSpendProofTerms = [
  "onChainVerifier",
  "proof",
  "proof_artifact",
  "proof_bytes",
  "proofArtifact",
  "proofBackend",
  "proofBytes",
  "proofSystem",
  "verifierProgramId",
  "verifier_program_id",
  "verifying_key_hash",
  "verifyingKey",
  "verifyingKeyHash",
];

function assertNoPrivateSpendProofTerms(value, path = "transaction") {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPrivateSpendProofTerms.includes(key)) {
      throw new Error(`Private Pool v2 relayer forbids ${path}.${key}.`);
    }
    assertNoPrivateSpendProofTerms(child, `${path}.${key}`);
  }
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

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Private Pool v2 Send discovery packet requires ${fieldName}.`);
  }
  return value.trim();
}

function assertSendDiscoveryAllowedKeys(packet) {
  const allowedKeys = new Set([
    "audience",
    "claimBoundary",
    "encryptedViewTag",
    "memoCiphertextBodyHash",
    "memoCiphertextRef",
    "outputCommitment",
    "outputLeafIndex",
    "outputRoot",
    "packetId",
    "productionReady",
    "proofBoundMemoCiphertextBodyHash",
    "proofReceiptId",
    "proofReceiptPublicInputCommitment",
    "recordedAtSlot",
    "sendPublicInputHash",
    "treeId",
    "version",
  ]);

  for (const key of Object.keys(packet)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Private Pool v2 Send discovery packet includes unsupported field ${key}.`);
    }
  }
}

function assertSendDiscoveryRawFieldsAbsent(value, path = []) {
  if (!value || typeof value !== "object") {
    return;
  }

  const forbiddenKeys = new Set([
    "amount",
    "amountBaseUnits",
    "asset",
    "changeAmount",
    "depositSignature",
    "inputCommitment",
    "inputLeafIndex",
    "memo",
    "mintAddress",
    "owner",
    "ownerPubkey",
    "plaintext",
    "plaintextMemo",
    "privateInputs",
    "rawPrivateInputs",
    "recipient",
    "recipientAddress",
    "seedPhrase",
    "serializedTransaction",
    "vaultOwner",
    "walletPrivateKey",
    "witness",
  ]);

  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) {
      throw new Error(
        `Private Pool v2 Send discovery packet must not include raw private field ${[...path, key].join(".")}.`,
      );
    }
    if (Array.isArray(nested)) {
      nested.forEach((entry, index) => assertSendDiscoveryRawFieldsAbsent(entry, [...path, key, String(index)]));
    } else if (nested && typeof nested === "object") {
      assertSendDiscoveryRawFieldsAbsent(nested, [...path, key]);
    }
  }
}

function normalizeSendDiscoveryPacket(packet) {
  if (!packet || Array.isArray(packet) || typeof packet !== "object") {
    throw new Error("Private Pool v2 Send discovery packet must be an object.");
  }
  assertSendDiscoveryAllowedKeys(packet);
  assertSendDiscoveryRawFieldsAbsent(packet);

  const version = packet.version === undefined ? sendDiscoveryPacketVersion : String(packet.version);
  if (version !== sendDiscoveryPacketVersion) {
    throw new Error(`Private Pool v2 Send discovery packet version must be ${sendDiscoveryPacketVersion}.`);
  }

  const audience = assertNonEmptyString(packet.audience, "audience");
  if (!["recipient", "change"].includes(audience)) {
    throw new Error("Private Pool v2 Send discovery packet audience must be recipient or change.");
  }

  const encryptedViewTag = assertNonEmptyString(packet.encryptedViewTag, "encryptedViewTag");
  if (!/^vtag:[0-9a-f]{16}$/u.test(encryptedViewTag)) {
    throw new Error("Private Pool v2 Send discovery packet encryptedViewTag must be vtag:<16 lowercase hex>.");
  }

  const memoCiphertextBodyHash = assertNonEmptyString(
    packet.memoCiphertextBodyHash,
    "memoCiphertextBodyHash",
  );
  if (!/^sha256:[0-9a-f]{64}$/u.test(memoCiphertextBodyHash)) {
    throw new Error(
      "Private Pool v2 Send discovery packet memoCiphertextBodyHash must be sha256:<64 lowercase hex>.",
    );
  }
  const proofBoundMemoCiphertextBodyHash =
    packet.proofBoundMemoCiphertextBodyHash === undefined
      ? memoCiphertextBodyHash
      : assertNonEmptyString(
          packet.proofBoundMemoCiphertextBodyHash,
          "proofBoundMemoCiphertextBodyHash",
        );
  if (proofBoundMemoCiphertextBodyHash !== memoCiphertextBodyHash) {
    throw new Error(
      "Private Pool v2 Send discovery packet proofBoundMemoCiphertextBodyHash must match memoCiphertextBodyHash.",
    );
  }

  const recordedAtSlot = toBigInt(packet.recordedAtSlot, 1_000_000n);
  if (recordedAtSlot < 0n) {
    throw new Error("Private Pool v2 Send discovery packet recordedAtSlot must be non-negative.");
  }

  if (packet.productionReady !== undefined && packet.productionReady !== false) {
    throw new Error("Private Pool v2 Send discovery packet productionReady must remain false.");
  }
  if (packet.claimBoundary !== undefined && packet.claimBoundary !== sendDiscoveryClaimBoundary) {
    throw new Error(
      `Private Pool v2 Send discovery packet claimBoundary must be ${sendDiscoveryClaimBoundary}.`,
    );
  }

  const outputLeafIndexSource = packet.outputLeafIndex;
  if (
    typeof outputLeafIndexSource !== "number" &&
    (typeof outputLeafIndexSource !== "string" ||
      !/^(0|[1-9][0-9]*)$/u.test(outputLeafIndexSource))
  ) {
    throw new Error("Private Pool v2 Send discovery packet outputLeafIndex must be a non-negative integer.");
  }

  const normalized = {
    audience,
    claimBoundary: sendDiscoveryClaimBoundary,
    encryptedViewTag,
    memoCiphertextBodyHash,
    memoCiphertextRef:
      packet.memoCiphertextRef === undefined
        ? null
        : assertNonEmptyString(packet.memoCiphertextRef, "memoCiphertextRef"),
    outputCommitment: assertNonEmptyString(packet.outputCommitment, "outputCommitment"),
    outputLeafIndex: Number(outputLeafIndexSource),
    outputRoot: assertNonEmptyString(packet.outputRoot, "outputRoot"),
    productionReady: false,
    proofBoundMemoCiphertextBodyHash,
    proofReceiptId: assertNonEmptyString(packet.proofReceiptId, "proofReceiptId"),
    proofReceiptPublicInputCommitment: assertNonEmptyString(
      packet.proofReceiptPublicInputCommitment,
      "proofReceiptPublicInputCommitment",
    ),
    recordedAtSlot,
    sendPublicInputHash: assertNonEmptyString(packet.sendPublicInputHash, "sendPublicInputHash"),
    treeId: assertNonEmptyString(packet.treeId, "treeId"),
    version,
  };

  if (!Number.isInteger(normalized.outputLeafIndex) || normalized.outputLeafIndex < 0) {
    throw new Error("Private Pool v2 Send discovery packet outputLeafIndex must be a non-negative integer.");
  }

  const packetId = hashHex(
    sendDiscoveryPacketVersion,
    normalized.audience,
    normalized.encryptedViewTag,
    normalized.memoCiphertextBodyHash,
    normalized.outputCommitment,
    String(normalized.outputLeafIndex),
    normalized.treeId,
  );

  if (packet.packetId !== undefined && packet.packetId !== packetId) {
    throw new Error("Private Pool v2 Send discovery packet packetId does not match packet contents.");
  }

  return {
    ...normalized,
    packetId,
  };
}

function sendDiscoveryStatusPayload(packetCount) {
  return {
    blockerIds: sendDiscoveryBlockerIds,
    claimBoundary: sendDiscoveryClaimBoundary,
    freshV2OnlyClaimScoped: sendLegacyHistoryScope.freshV2OnlyClaimScoped,
    legacyHistoryScope: sendLegacyHistoryScope,
    implemented: true,
    localPacketCount: packetCount,
    productionReady: false,
    version: sendDiscoveryPacketVersion,
  };
}

function basePayload(role) {
  const storePath = process.env[roleConfig[role].storeEnv];
  const databaseUrl =
    process.env[roleConfig[role].databaseEnv] ?? process.env.VANTA_PRIVATE_POOL_V2_DATABASE_URL;
  return {
    mainnetReady: false,
    ok: true,
    privacyRail: "vanta-private-pool-v2",
    productionReady: false,
    role,
    service: roleConfig[role].service,
    serviceNetworkReady: true,
    storage: {
      durableStoreConfigured: Boolean(databaseUrl || storePath),
      kind: databaseUrl
        ? "postgres-jsonb-snapshot-store"
        : storePath
          ? "local-json-snapshot-store"
          : "in-memory",
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

  if (
    !process.env[storeEnv] &&
    !process.env[roleConfig[role].databaseEnv] &&
    !process.env.VANTA_PRIVATE_POOL_V2_DATABASE_URL
  ) {
    throw new Error(
      `Private Pool v2 ${role} production service requires ${storeEnv}, ${roleConfig[role].databaseEnv}, or VANTA_PRIVATE_POOL_V2_DATABASE_URL.`,
    );
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
  return readIndexerSnapshotFromParsed(
    readSnapshot(storePath, { commitments: [], nullifiers: [], sendDiscoveryPackets: [] }),
  );
}

function readIndexerSnapshotFromParsed(parsed) {
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
    sendDiscoveryPackets: (parsed.sendDiscoveryPackets ?? []).map((record) =>
      normalizeSendDiscoveryPacket(record),
    ),
  };
}

function writeIndexerSnapshot(storePath, snapshot) {
  writeSnapshot(storePath, snapshot);
}

function createIndexerState({ snapshotStore, storePath } = {}) {
  let loaded = false;
  let commitments = [];
  let nullifiers = new Map();
  let sendDiscoveryPackets = [];

  async function ensureLoaded() {
    if (loaded) {
      return;
    }

    const snapshot = snapshotStore
      ? readIndexerSnapshotFromParsed(await snapshotStore.load())
      : readIndexerSnapshot(storePath);
    commitments = [...snapshot.commitments];
    nullifiers = new Map(snapshot.nullifiers.map((record) => [record.nullifier, record]));
    sendDiscoveryPackets = [...snapshot.sendDiscoveryPackets];
    loaded = true;
  }

  async function save() {
    const snapshot = {
      commitments,
      nullifiers: [...nullifiers.values()],
      sendDiscoveryPackets,
    };
    if (snapshotStore) {
      await snapshotStore.save(snapshot);
      return;
    }
    writeIndexerSnapshot(storePath, snapshot);
  }

  async function currentRoot(treeId) {
    await ensureLoaded();
    const treeCommitments = commitments.filter((record) => record.treeId === treeId);
    return currentMerkleRoot(treeId, treeCommitments);
  }

  return {
    async applyPrivateSendTransition({
      changeLeafIndex,
      changeOutputCommitment,
      changeOutputRoot,
      inputCommitment,
      inputRoot,
      nullifier,
      recipientLeafIndex,
      recipientOutputCommitment,
      recipientOutputRoot,
      spentAtSlot = 1_000_000n,
    }) {
      await ensureLoaded();
      if (nullifiers.has(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }

      const inputRecord = commitments.find((record) => record.commitment === inputCommitment);
      if (!inputRecord) {
        throw new Error(`Unknown private-pool commitment ${inputCommitment}.`);
      }
      const treeCommitments = commitments.filter((record) => record.treeId === inputRecord.treeId);
      const currentInputRoot = currentMerkleRoot(inputRecord.treeId, treeCommitments);
      if (currentInputRoot !== inputRoot) {
        throw new Error("Private-send proof input root does not match indexer root.");
      }

      if (treeCommitments.length !== recipientLeafIndex) {
        throw new Error(
          `Private-send recipient leaf index ${recipientLeafIndex} does not match next indexer leaf ${treeCommitments.length}.`,
        );
      }
      if (changeLeafIndex !== recipientLeafIndex + 1) {
        throw new Error("Private-send change leaf index must follow recipient leaf index.");
      }

      const recipientWithoutRoot = {
        assetId: inputRecord.assetId,
        commitment: recipientOutputCommitment,
        leafIndex: recipientLeafIndex,
        treeId: inputRecord.treeId,
      };
      const recipientCommitment = {
        ...recipientWithoutRoot,
        merkleRoot: currentMerkleRoot(inputRecord.treeId, [
          ...treeCommitments,
          { ...recipientWithoutRoot, merkleRoot: "" },
        ]),
      };
      if (recipientCommitment.merkleRoot !== recipientOutputRoot) {
        throw new Error("Private-send recipient output root does not match indexer root.");
      }

      const changeWithoutRoot = {
        assetId: inputRecord.assetId,
        commitment: changeOutputCommitment,
        leafIndex: changeLeafIndex,
        treeId: inputRecord.treeId,
      };
      const changeCommitment = {
        ...changeWithoutRoot,
        merkleRoot: currentMerkleRoot(inputRecord.treeId, [
          ...treeCommitments,
          recipientCommitment,
          { ...changeWithoutRoot, merkleRoot: "" },
        ]),
      };
      if (changeCommitment.merkleRoot !== changeOutputRoot) {
        throw new Error("Private-send change output root does not match indexer root.");
      }

      const nullifierRecord = {
        nullifier,
        spentAtSlot,
      };

      commitments.push(recipientCommitment, changeCommitment);
      nullifiers.set(nullifier, nullifierRecord);
      await save();

      return {
        changeCommitment,
        nullifier: nullifierRecord,
        recipientCommitment,
      };
    },
    async applySwapToShieldedTransition({
      inputCommitment,
      inputRoot,
      nullifierOrReplayCommitment,
      outputCommitment,
      outputLeafIndex,
      outputRoot,
      spentAtSlot = 1_000_000n,
    }) {
      await ensureLoaded();
      if (nullifiers.has(nullifierOrReplayCommitment)) {
        throw new Error(`Private-pool nullifier ${nullifierOrReplayCommitment} is already registered.`);
      }

      const inputRecord = commitments.find((record) => record.commitment === inputCommitment);
      if (!inputRecord) {
        throw new Error(`Unknown private-pool commitment ${inputCommitment}.`);
      }
      const treeCommitments = commitments.filter((record) => record.treeId === inputRecord.treeId);
      const currentInputRoot = currentMerkleRoot(inputRecord.treeId, treeCommitments);
      if (currentInputRoot !== inputRoot) {
        throw new Error("Swap-to-shielded proof input root does not match indexer root.");
      }

      if (treeCommitments.length !== outputLeafIndex) {
        throw new Error(
          `Swap-to-shielded output leaf index ${outputLeafIndex} does not match next indexer leaf ${treeCommitments.length}.`,
        );
      }

      const outputWithoutRoot = {
        assetId: inputRecord.assetId,
        commitment: outputCommitment,
        leafIndex: outputLeafIndex,
        treeId: inputRecord.treeId,
      };
      const outputRecord = {
        ...outputWithoutRoot,
        merkleRoot: currentMerkleRoot(inputRecord.treeId, [
          ...treeCommitments,
          { ...outputWithoutRoot, merkleRoot: "" },
        ]),
      };
      if (outputRecord.merkleRoot !== outputRoot) {
        throw new Error("Swap-to-shielded output root does not match indexer root.");
      }

      const nullifierRecord = {
        nullifier: nullifierOrReplayCommitment,
        spentAtSlot,
      };

      commitments.push(outputRecord);
      nullifiers.set(nullifierOrReplayCommitment, nullifierRecord);
      await save();

      return {
        nullifier: nullifierRecord,
        outputCommitment: outputRecord,
      };
    },
    async applyActualPrivateSpendTransition({
      acceptedRoot,
      assetCohort,
      nullifier,
      outputCommitments,
      poolId,
      spentAtSlot = 1_000_000n,
    }) {
      await ensureLoaded();
      if (nullifiers.has(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }

      const normalizedOutputs = outputCommitments.map((commitment) => String(commitment).trim());
      if (
        normalizedOutputs.length !== 2 ||
        normalizedOutputs.some((commitment) => commitment.length === 0)
      ) {
        throw new Error("Actual private spend transition requires exactly two output commitments.");
      }
      if (new Set(normalizedOutputs).size !== normalizedOutputs.length) {
        throw new Error("Actual private spend transition output commitments must be unique.");
      }

      const treeCommitments = commitments.filter((record) => record.treeId === poolId);
      const currentAcceptedRoot = currentMerkleRoot(poolId, treeCommitments);
      if (currentAcceptedRoot !== acceptedRoot) {
        throw new Error("Actual private spend accepted root does not match indexer root.");
      }

      const outputRecords = [];
      let nextTree = [...treeCommitments];
      for (const [offset, commitment] of normalizedOutputs.entries()) {
        const record = {
          assetId: assetCohort,
          commitment,
          leafIndex: treeCommitments.length + offset,
          treeId: poolId,
        };
        record.merkleRoot = currentMerkleRoot(poolId, [...nextTree, record]);
        outputRecords.push(record);
        nextTree = [...nextTree, record];
      }

      const nullifierRecord = { nullifier, spentAtSlot };
      commitments.push(...outputRecords);
      nullifiers.set(nullifier, nullifierRecord);
      await save();

      return {
        nullifier: nullifierRecord,
        outputCommitments: outputRecords,
      };
    },
    async appendCommitment({ assetId, commitment, treeId }) {
      await ensureLoaded();
      const leafIndex = commitments.filter((record) => record.treeId === treeId).length;
      const record = {
        assetId,
        commitment,
        leafIndex,
        treeId,
      };
      record.merkleRoot = currentMerkleRoot(treeId, [...commitments, record]);
      commitments.push(record);
      await save();
      return record;
    },
    async appendSendDiscoveryPacket(packet) {
      await ensureLoaded();
      const record = normalizeSendDiscoveryPacket(packet);
      if (sendDiscoveryPackets.some((stored) => stored.packetId === record.packetId)) {
        throw new Error(`Private Pool v2 Send discovery packet ${record.packetId} is already indexed.`);
      }
      sendDiscoveryPackets.push(record);
      await save();
      return record;
    },
    currentRoot,
    async getCommitment(commitment) {
      await ensureLoaded();
      return commitments.find((record) => record.commitment === commitment) ?? null;
    },
    async getNullifier(nullifier) {
      await ensureLoaded();
      return nullifiers.get(nullifier) ?? null;
    },
    async listCommitments({ assetId, fromLeafIndex = 0, treeId }) {
      await ensureLoaded();
      return commitments.filter(
        (record) =>
          record.treeId === treeId &&
          record.leafIndex >= fromLeafIndex &&
          (!assetId || record.assetId === assetId),
      );
    },
    async listSendDiscoveryPackets({ audience, encryptedViewTag, fromSlot = 0n } = {}) {
      await ensureLoaded();
      return sendDiscoveryPackets.filter(
        (record) =>
          record.recordedAtSlot >= fromSlot &&
          (!audience || record.audience === audience) &&
          (!encryptedViewTag || record.encryptedViewTag === encryptedViewTag),
      );
    },
    async registerNullifier({ nullifier, spentAtSlot = 1_000_000n }) {
      await ensureLoaded();
      if (nullifiers.has(nullifier)) {
        throw new Error(`Private-pool nullifier ${nullifier} is already registered.`);
      }
      const record = { nullifier, spentAtSlot };
      nullifiers.set(nullifier, record);
      await save();
      return record;
    },
  };
}

function proofResultFor(request) {
  const serializedRequest = JSON.stringify(normalizeForJson(request));
  const publicInputCommitment = hashHex(serviceVersion, "public-inputs", serializedRequest);
  const proofMaterial = hashHex(serviceVersion, "proof", publicInputCommitment);

  return {
    proofBackend,
    proofBytes: [...textEncoder.encode(proofMaterial)],
    proofSystem: "mock",
    publicInputCommitment,
    verifyingKeyId: "vanta-private-pool-v2:service-network-verifying-key-0.1",
  };
}

function createProverState({ snapshotStore, storePath } = {}) {
  let loaded = false;
  let proofs = new Map();

  async function ensureLoaded() {
    if (loaded) {
      return;
    }

    const snapshot = snapshotStore
      ? await snapshotStore.load()
      : readSnapshot(storePath, { proofs: [] });
    proofs = new Map((snapshot.proofs ?? []).map((proof) => [proof.publicInputCommitment, proof]));
    loaded = true;
  }

  async function save() {
    const snapshot = { proofs: [...proofs.values()] };
    if (snapshotStore) {
      await snapshotStore.save(snapshot);
      return;
    }
    writeSnapshot(storePath, snapshot);
  }

  return {
    async get(publicInputCommitment) {
      await ensureLoaded();
      return proofs.get(publicInputCommitment) ?? null;
    },
    async put(proof) {
      await ensureLoaded();
      proofs.set(proof.publicInputCommitment, proof);
      await save();
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

function createRelayerState({ snapshotStore, storePath } = {}) {
  let loaded = false;
  let quotes = new Map();
  let claims = new Map();
  let privateSpends = new Map();
  const liveSolanaSubmitter =
    process.env.VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMISSION_MODE === "live"
      ? createVantaPrivatePoolV2SolanaRelayerSubmitterFromEnv(process.env)
      : null;

  async function ensureLoaded() {
    if (loaded) {
      return;
    }

    const snapshot = snapshotStore
      ? await snapshotStore.load()
      : readSnapshot(storePath, { claims: [], quotes: [] });
    quotes = new Map((snapshot.quotes ?? []).map((quote) => [quoteKey(quote), quote]));
    claims = new Map((snapshot.claims ?? []).map((claim) => [quoteKey(claim.quote), claim]));
    privateSpends = new Map(
      (snapshot.privateSpends ?? []).map((submission) => [
        [submission.settlementId, submission.proofReceiptId, submission.publicInputCommitment].join(":"),
        submission,
      ]),
    );
    loaded = true;
  }

  async function save() {
    const snapshot = {
      claims: [...claims.values()],
      privateSpends: [...privateSpends.values()],
      quotes: [...quotes.values()],
    };
    if (snapshotStore) {
      await snapshotStore.save(snapshot);
      return;
    }
    writeSnapshot(storePath, snapshot);
  }

  return {
    async getQuote(quote) {
      await ensureLoaded();
      return quotes.get(quoteKey(quote)) ?? null;
    },
    async putQuote(quote) {
      await ensureLoaded();
      quotes.set(quoteKey(quote), quote);
      await save();
      return quote;
    },
    async submitClaim({ quote, serializedTransaction }) {
      await ensureLoaded();
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
      await save();
      return claim;
    },
    async submitPrivateSpend(input = {}) {
      assertNoPrivateSpendProofTerms(input);
      const {
        expectedAccounts,
        expectedPublicInputs,
        proofReceiptId,
        publicInputCommitment,
        serializedTransaction,
        settlementId,
      } = input;
      await ensureLoaded();
      const key = [settlementId, proofReceiptId, publicInputCommitment].join(":");
      if (privateSpends.has(key)) {
        throw new Error(`Private spend ${settlementId} has already been submitted.`);
      }

      const baseSubmission = {
        proofReceiptId: String(proofReceiptId),
        publicInputCommitment: String(publicInputCommitment),
        serializedTransaction: String(serializedTransaction),
        settlementId: String(settlementId),
      };
      const expectedAccountRefs = optionalPlainObject(expectedAccounts, "expectedAccounts");
      const expectedPublicInputRefs = optionalPlainObject(expectedPublicInputs, "expectedPublicInputs");
      const liveSubmissionRequest = {
        ...baseSubmission,
        ...(expectedAccountRefs ? { expectedAccounts: expectedAccountRefs } : {}),
        ...(expectedPublicInputRefs ? { expectedPublicInputs: expectedPublicInputRefs } : {}),
      };
      const liveSubmission = liveSolanaSubmitter
        ? await liveSolanaSubmitter.submitPrivateSpend(liveSubmissionRequest)
        : null;
      const submission = liveSubmission
        ? {
            ...liveSubmissionRequest,
            relayerId: liveSubmission.relayerId,
            signature: liveSubmission.signature,
            submittedBy: liveSubmission.submittedBy,
          }
        : {
            ...liveSubmissionRequest,
            relayerId: `vanta-service-relayer:${hashHex(serviceVersion, "private-spend", String(settlementId)).slice(2, 18)}`,
            signature: hashHex(serviceVersion, "private-spend", key, String(serializedTransaction)),
            submittedBy: "relayer",
          };
      privateSpends.set(key, submission);
      await save();
      return submission;
    },
  };
}

function createVerifierState({ snapshotStore, storePath } = {}) {
  let loaded = false;
  let acceptedProofs = new Map();

  async function ensureLoaded() {
    if (loaded) {
      return;
    }

    const snapshot = snapshotStore
      ? await snapshotStore.load()
      : readSnapshot(storePath, { acceptedProofs: [] });
    acceptedProofs = new Map(
      (snapshot.acceptedProofs ?? []).map((receipt) => [receipt.replayKey, receipt]),
    );
    loaded = true;
  }

  async function save() {
    const snapshot = { acceptedProofs: [...acceptedProofs.values()] };
    if (snapshotStore) {
      await snapshotStore.save(snapshot);
      return;
    }
    writeSnapshot(storePath, snapshot);
  }

  return {
    async get(replayKey) {
      await ensureLoaded();
      return acceptedProofs.get(replayKey) ?? null;
    },
    async put(receipt) {
      await ensureLoaded();
      acceptedProofs.set(receipt.replayKey, receipt);
      await save();
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
    proof.proofBackend === expected.proofBackend &&
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

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function requirePublicInputField(request, prefix) {
  const value = requirePublicInput(request, prefix);
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`Proof receipt requires public input ${prefix} to be a decimal BN254 field.`);
  }

  if (BigInt(value) >= BN254_SCALAR_FIELD) {
    throw new Error(`Proof receipt requires public input ${prefix} to fit in BN254.`);
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

  if (request?.intent === "private-send") {
    const nullifier = readPublicInput(request, "nullifier:");
    if (nullifier) {
      return `private-send:${nullifier}`;
    }
  }

  if (request?.intent === "swap-to-shielded") {
    const nullifierOrReplayCommitment = readPublicInput(request, "nullifier-or-replay-commitment:");
    if (nullifierOrReplayCommitment) {
      return `swap-to-shielded:${nullifierOrReplayCommitment}`;
    }
  }

  return `${request?.intent ?? "proof"}:${request?.publicInputs?.join("|") ?? "unknown"}`;
}

function isStatefulPrivateSendRequest(request) {
  const hasStatefulVersion = Boolean(
    request?.intent === "private-send" &&
      request?.publicInputs?.some((input) =>
        String(input).startsWith("vanta-private-pool-v2-send-proof-request-0.1:version"),
      ),
  );

  if (!hasStatefulVersion) {
    return false;
  }

  const changeOutputCommitment = readPublicInput(request, "change-output-commitment:");
  const recipientMemoHashField = requirePublicInputField(
    request,
    "recipient-memo-ciphertext-body-hash-field:",
  );
  const changeMemoHashField = requirePublicInputField(
    request,
    "change-memo-ciphertext-body-hash-field:",
  );
  if (recipientMemoHashField === "0") {
    throw new Error("Private-send proof receipt requires a nonzero recipient memo ciphertext body hash.");
  }

  if (
    changeOutputCommitment &&
    changeOutputCommitment !== "0" &&
    changeMemoHashField === "0"
  ) {
    throw new Error(
      "Private-send proof receipt requires a change memo ciphertext body hash for nonzero change outputs.",
    );
  }

  return true;
}

function isActualPrivateSpendRequest(request) {
  return Boolean(
    request?.intent === "private-send" &&
      request?.publicInputs?.some((input) =>
        String(input).startsWith("vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version"),
      ),
  );
}

function isStatefulSwapToShieldedRequest(request) {
  return Boolean(
    request?.intent === "swap-to-shielded" &&
      request?.publicInputs?.some((input) =>
        String(input).startsWith("vanta-private-pool-v2-swap-to-shielded-proof-request-0.1:version"),
      ),
  );
}

function readActualPrivateSpendOutputCommitments(request) {
  const outputs = (request?.publicInputs ?? [])
    .flatMap((input) => {
      const match = String(input).match(/^output-commitment-(\d+):(.+)$/);
      if (!match) {
        return [];
      }

      return [{ index: Number(match[1]), commitment: match[2] }];
    })
    .sort((left, right) => left.index - right.index);

  if (
    outputs.length !== 2 ||
    outputs[0]?.index !== 0 ||
    outputs[1]?.index !== 1 ||
    outputs.some((output) => String(output.commitment).trim().length === 0)
  ) {
    throw new Error("Actual private spend proof receipt requires exactly output-commitment-0 and output-commitment-1.");
  }

  const commitments = outputs.map((output) => output.commitment);
  if (new Set(commitments).size !== commitments.length) {
    throw new Error("Actual private spend proof receipt output commitments must be unique.");
  }

  return commitments;
}

async function postIndexerJson(path, body) {
  const baseUrl = process.env.VANTA_PRIVATE_POOL_V2_INDEXER_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("Private Pool v2 stateful verifier acceptance requires VANTA_PRIVATE_POOL_V2_INDEXER_URL.");
  }

  const authToken = process.env.VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN;
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(normalizeForJson(body)),
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

  if (isStatefulPrivateSendRequest(request)) {
    return await postIndexerJson("/v1/private-sends", {
      changeLeafIndex: Number(requirePublicInput(request, "change-leaf-index:")),
      changeOutputCommitment: requirePublicInput(request, "change-output-commitment:"),
      changeOutputRoot: requirePublicInput(request, "change-output-root:"),
      inputCommitment: requirePublicInput(request, "input-commitment:"),
      inputRoot: requirePublicInput(request, "input-root:"),
      nullifier: requirePublicInput(request, "nullifier:"),
      recipientLeafIndex: Number(requirePublicInput(request, "recipient-leaf-index:")),
      recipientOutputCommitment: requirePublicInput(request, "recipient-output-commitment:"),
      recipientOutputRoot: requirePublicInput(request, "recipient-output-root:"),
      spentAtSlot: 1_000_000n,
    });
  }

  if (isActualPrivateSpendRequest(request)) {
    const acceptedRoot = requirePublicInput(request, "accepted-root:");
    const nullifier = requirePublicInput(request, "nullifier:");
    const poolId = requirePublicInput(request, "pool-id:");
    const assetCohort = requirePublicInput(request, "asset-cohort:");
    const outputCommitments = readActualPrivateSpendOutputCommitments(request);

    return await postIndexerJson("/v1/actual-private-spends", {
      acceptedRoot,
      assetCohort,
      nullifier,
      outputCommitments,
      poolId,
      spentAtSlot: 1_000_000n,
    });
  }

  if (isStatefulSwapToShieldedRequest(request)) {
    return await postIndexerJson("/v1/swap-to-shielded", {
      inputCommitment: requirePublicInput(request, "input-commitment:"),
      inputRoot: requirePublicInput(request, "input-root:"),
      nullifierOrReplayCommitment: requirePublicInput(request, "nullifier-or-replay-commitment:"),
      outputCommitment: requirePublicInput(request, "output-commitment:"),
      outputLeafIndex: Number(requirePublicInput(request, "output-leaf-index:")),
      outputRoot: requirePublicInput(request, "output-root:"),
      spentAtSlot: 1_000_000n,
    });
  }

  return null;
}

async function createRoleSnapshotStore(role, storePath) {
  return await createPrivatePoolV2RoleSnapshotStore({
    role,
    storePath,
    tableName: "vanta_private_pool_v2_role_snapshots",
  });
}

async function createServiceHandlers(role, {
  indexerStorePath,
  proverStorePath,
  relayerStorePath,
  verifierStorePath,
} = {}) {
  const [indexerSnapshotStore, proverSnapshotStore, relayerSnapshotStore, verifierSnapshotStore] =
    await Promise.all([
      createRoleSnapshotStore("indexer", indexerStorePath),
      createRoleSnapshotStore("prover", proverStorePath),
      createRoleSnapshotStore("relayer", relayerStorePath),
      createRoleSnapshotStore("verifier", verifierStorePath),
    ]);
  const indexerState = createIndexerState({ snapshotStore: indexerSnapshotStore, storePath: indexerStorePath });
  const proverState = createProverState({ snapshotStore: proverSnapshotStore, storePath: proverStorePath });
  const relayerState = createRelayerState({ snapshotStore: relayerSnapshotStore, storePath: relayerStorePath });
  const verifierState = createVerifierState({ snapshotStore: verifierSnapshotStore, storePath: verifierStorePath });

  async function handleIndexer({ request, response }) {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/v1/roots/latest") {
      const treeId = url.searchParams.get("treeId") ?? "vanta-private-pool-v2-default-tree";
      sendJson(response, 200, {
        ...basePayload(role),
        root: await indexerState.currentRoot(treeId),
        treeId,
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/v1/commitments") {
      const treeId = url.searchParams.get("treeId") ?? "vanta-private-pool-v2-default-tree";
      sendJson(response, 200, {
        ...basePayload(role),
        commitments: await indexerState.listCommitments({
          assetId: url.searchParams.get("assetId") ?? undefined,
          fromLeafIndex: Number(url.searchParams.get("fromLeafIndex") ?? "0"),
          treeId,
        }),
      });
      return true;
    }

    if (request.method === "GET" && url.pathname.startsWith("/v1/commitments/")) {
      const commitment = decodeURIComponent(url.pathname.split("/")[3] ?? "");
      const leaf = await indexerState.getCommitment(commitment);
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
        nullifier: await indexerState.getNullifier(nullifier),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/v1/nullifiers") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        nullifier: await indexerState.registerNullifier({
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
        commitment: await indexerState.appendCommitment(body),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/v1/private-sends") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        transition: await indexerState.applyPrivateSendTransition({
          ...body,
          changeLeafIndex: Number(body.changeLeafIndex),
          recipientLeafIndex: Number(body.recipientLeafIndex),
          spentAtSlot:
            body.spentAtSlot === undefined ? 1_000_000n : toBigInt(body.spentAtSlot),
        }),
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/v1/send-discovery/status") {
      const packets = await indexerState.listSendDiscoveryPackets();
      sendJson(response, 200, {
        ...basePayload(role),
        sendDiscovery: sendDiscoveryStatusPayload(packets.length),
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/v1/send-discovery-packets") {
      const audience = url.searchParams.get("audience") ?? undefined;
      const encryptedViewTag = url.searchParams.get("encryptedViewTag") ?? undefined;
      const fromSlot = toBigInt(url.searchParams.get("fromSlot") ?? "0");
      sendJson(response, 200, {
        ...basePayload(role),
        packets: await indexerState.listSendDiscoveryPackets({
          audience,
          encryptedViewTag,
          fromSlot,
        }),
        sendDiscovery: sendDiscoveryStatusPayload(
          (await indexerState.listSendDiscoveryPackets()).length,
        ),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/v1/send-discovery-packets") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        packet: await indexerState.appendSendDiscoveryPacket(body),
        sendDiscovery: sendDiscoveryStatusPayload(
          (await indexerState.listSendDiscoveryPackets()).length,
        ),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/v1/swap-to-shielded") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        transition: await indexerState.applySwapToShieldedTransition({
          ...body,
          outputLeafIndex: Number(body.outputLeafIndex),
          spentAtSlot:
            body.spentAtSlot === undefined ? 1_000_000n : toBigInt(body.spentAtSlot),
        }),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/v1/actual-private-spends") {
      const body = await readRequestBody(request);
      sendJson(response, 200, {
        ...basePayload(role),
        transition: await indexerState.applyActualPrivateSpendTransition({
          ...body,
          spentAtSlot:
            body.spentAtSlot === undefined ? 1_000_000n : toBigInt(body.spentAtSlot),
        }),
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
        proofBackend,
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
      sendJson(response, 200, await proverState.put(proofResultFor(requestBody)));
      return true;
    }

    if (request.method === "GET" && request.url?.startsWith("/v1/proofs/")) {
      const url = new URL(request.url, "http://127.0.0.1");
      const publicInputCommitment = decodeURIComponent(url.pathname.split("/")[3] ?? "");
      const proof = await proverState.get(publicInputCommitment);
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
      sendJson(
        response,
        200,
        await relayerState.putQuote({
          estimatedFeeBaseUnits: (amountBaseUnits * 10n) / 10_000n,
          expiresAtSlot: 1_000_150n,
          relayerId,
        }),
      );
      return true;
    }

    if (request.method === "POST" && request.url === "/v1/claims/submit") {
      const body = await readRequestBody(request);
      sendJson(response, 200, await relayerState.submitClaim(body));
      return true;
    }

    if (request.method === "POST" && request.url === "/v1/private-spends/submit") {
      const body = await readRequestBody(request);
      sendJson(response, 200, await relayerState.submitPrivateSpend(body));
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
      if (await verifierState.get(replayKey)) {
        throw new Error(`Private Pool v2 receipt ${replayKey} has already been accepted.`);
      }
      if (!proofMatches({ proof, request: requestBody })) {
        throw new Error("Private Pool v2 proof verification failed.");
      }
      await mirrorAcceptedProofToIndexer(requestBody);
      const receipt = {
        assetId: String(requestBody.assetId),
        intent: requestBody.intent,
        proofSystem: proof.proofSystem,
        proofBackend: proof.proofBackend,
        publicInputCommitment: proof.publicInputCommitment,
        receiptId: hashHex(serviceVersion, "receipt", replayKey, proof.publicInputCommitment),
        recordedAtSlot: 1_000_000n,
        replayKey,
      };
      await verifierState.put(receipt);
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

export async function startVantaPrivatePoolV2RoleService(role) {
  if (!roleConfig[role]) {
    throw new Error(`Unknown Private Pool v2 service role ${role}.`);
  }
  assertProductionRoleConfig(role);

  const host = process.env.HOST ?? "0.0.0.0";
  const port = parseCliPort(roleConfig[role].defaultPort);
  const authToken = process.env[roleConfig[role].tokenEnv];
  const handleRoleRequest = await createServiceHandlers(role, {
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
