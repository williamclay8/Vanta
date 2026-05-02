import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-protocol-client-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const storePath = join(tempRoot, "private-pool-v2-protocol-client.json");
const port = 10780 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const localProverScheme = "sha256-private-pool-v2-local-prover-0.1";
const localIndexerScheme = "sha256-append-only-private-pool-v2-local-indexer-0.1";
const payPrivateSettlementAdapterVersion = "vanta-pay-private-settlement-adapter-0.1";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function hashHex(...parts) {
  return `0x${bytesToHex(sha256(new TextEncoder().encode(parts.join("\u001f"))))}`;
}

function expectedLocalPublicInputCommitment(request) {
  const serializedRequest = JSON.stringify({
    amountBaseUnits: request.amountBaseUnits.toString(),
    assetId: request.assetId,
    circuitPublicInputs: [...(request.circuitPublicInputs ?? request.publicInputs)],
    intent: request.intent,
  });

  return hashHex(localProverScheme, "public-inputs", serializedRequest);
}

function treeIdForAsset(asset) {
  return hashHex(payPrivateSettlementAdapterVersion, "tree", asset).slice(0, 34);
}

function assetIdForAsset(asset) {
  return hashHex(payPrivateSettlementAdapterVersion, "asset", asset);
}

function hashLeaf(record) {
  return hashHex(
    localIndexerScheme,
    "leaf",
    record.treeId,
    String(record.leafIndex),
    record.assetId,
    record.commitment,
  );
}

function hashNode(treeId, depth, left, right) {
  return hashHex(localIndexerScheme, "node", treeId, String(depth), left, right);
}

function currentRoot(treeId, records) {
  if (records.length === 0) {
    return hashHex(localIndexerScheme, "empty-root", treeId);
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

  return current[0];
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

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
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

async function assertRejects(operation, expectedMessage, message) {
  try {
    await operation();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(expectedMessage),
      `${message} Expected error to include "${expectedMessage}", received "${
        error instanceof Error ? error.message : String(error)
      }".`,
    );
    return;
  }

  throw new Error(`${message} Expected request to be rejected.`);
}

function compileClient() {
  mkdirSync(tempTsDir, { recursive: true });
  const clientSourceFiles = [
    "protocolAdapter.ts",
    "privatePoolV2Types.ts",
    "privatePoolV2ProofRequests.ts",
    "privatePoolV2ProtocolSettlementClient.ts",
  ];

  for (const file of clientSourceFiles) {
    writeFileSync(
      join(tempTsDir, file),
      readFileSync(resolve(repoRoot, "src/privacy", file), "utf8"),
    );
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...clientSourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of clientSourceFiles) {
    const filePath = join(tempJsDir, file.replace(/\.ts$/, ".js"));
    const source = readFileSync(filePath, "utf8").replace(
      /from "\.\/([A-Za-z0-9]+)"/g,
      'from "./$1.js"',
    );
    writeFileSync(filePath, source);
  }
}

compileClient();

const server = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-client-test-token",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port),
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
  await waitForHealth();

  const {
    VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    createVantaPrivatePoolV2ActualPrivateSpendProofRequest,
    createVantaPrivatePoolV2SendProofRequest,
    createVantaPrivatePoolV2SwapToShieldedProofRequest,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);

  const {
    fetchVantaPrivatePoolV2OperatorStatus,
    fetchVantaPrivatePoolV2ProtocolSettlementStatus,
    requestVantaPrivatePoolV2ProtocolSettlement,
    validateVantaPrivatePoolV2ProtocolSettlementResponse,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProtocolSettlementClient.js")).href);
  assert(
    typeof validateVantaPrivatePoolV2ProtocolSettlementResponse === "function",
    "Expected typed protocol settlement client to export response validation.",
  );

  const authToken = "vanta-private-pool-v2-client-test-token";
  const operatorStatus = await fetchVantaPrivatePoolV2OperatorStatus({ authToken, baseUrl });
  assert(
    operatorStatus?.settlementPolicy?.conflictingReplayRejection === true,
    "Expected typed client to read conflicting replay rejection policy.",
  );

  const emptyStatus = await fetchVantaPrivatePoolV2ProtocolSettlementStatus({ authToken, baseUrl });
  assert(emptyStatus?.protocolSettlementCount === 0, "Expected empty protocol settlement status.");

  const setupShield = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "7.00",
      asset: "USDC",
      destination: "protocol-client-send-setup-destination",
      owner: "protocol-client-send-setup-owner",
      settlementId: "protocol-client-committed-send-setup-shield",
      shieldCapability: {
        blockers: [],
        mode: "direct-configured-token",
        requiresPublicRoute: false,
        sourceAsset: {
          mintAddress: "mint:usdc",
          symbol: "USDC",
        },
        supportsDirectShield: true,
        targetShieldAsset: {
          assetKey: "USDC",
          label: "Shielded USDC",
          mintAddress: "mint:usdc",
          name: "USD Coin",
        },
      },
      shieldSettlementEvidence: {
        depositSignature: "protocol-client-committed-send-setup-deposit",
        owner: "protocol-client-send-setup-owner",
        stateSignature: "protocol-client-committed-send-setup-shield",
        vaultOwner: "protocol-client-committed-send-setup-vault",
      },
    }),
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    method: "POST",
  });
  assert(setupShield.ok, `Expected setup shield to be accepted: ${setupShield.text}`);
  const committedSendInputTreeId = treeIdForAsset("USDC");
  const committedSendInputCommitment = hashHex(
    payPrivateSettlementAdapterVersion,
    "protocol-shield-output",
    "protocol-client-committed-send-setup-shield",
    "7.00",
    "USDC",
  );
  const committedSendInputRecord = {
    assetId: "USDC",
    commitment: committedSendInputCommitment,
    leafIndex: 0,
    treeId: committedSendInputTreeId,
  };
  const committedSendInputRoot = currentRoot(committedSendInputTreeId, [
    committedSendInputRecord,
  ]);
  const committedSendRecipientRecord = {
    assetId: "stablecoin-usdc-v1",
    commitment: "0xcommittedsend_recipient_output",
    leafIndex: 1,
    treeId: committedSendInputTreeId,
  };
  const committedSendRecipientRoot = currentRoot(committedSendInputTreeId, [
    committedSendInputRecord,
    committedSendRecipientRecord,
  ]);
  const committedSendChangeRecord = {
    assetId: "stablecoin-usdc-v1",
    commitment: "0xcommittedsend_change_output",
    leafIndex: 2,
    treeId: committedSendInputTreeId,
  };
  const committedSendChangeRoot = currentRoot(committedSendInputTreeId, [
    committedSendInputRecord,
    committedSendRecipientRecord,
    committedSendChangeRecord,
  ]);

  const committedSendProofRequest = createVantaPrivatePoolV2ActualPrivateSpendProofRequest({
    acceptedRoot: committedSendInputRoot,
    assetCohort: "stablecoin-usdc-v1",
    contextHash: "0xcommittedsend_context",
    nullifier: "0xcommittedsend_replay",
    outputCommitments: ["0xcommittedsend_recipient_output", "0xcommittedsend_change_output"],
    poolId: committedSendInputTreeId,
    privateSpendPublicInputHash: "0xcommittedsend_public_input_hash",
  });
  const committedSendSettlement = await requestVantaPrivatePoolV2ProtocolSettlement({
    action: "send",
    acceptedRoot: committedSendInputRoot,
    assetCohort: "stablecoin-usdc-v1",
    authToken,
    baseUrl,
    changeOutputCommitment: "0xcommittedsend_change_output",
    economicsCommitment: "0xcommittedsend_economics",
    economicsMode: "committed-economics",
    nullifierOrReplayCommitment: "0xcommittedsend_replay",
    outputCommitment: "0xcommittedsend_recipient_output",
    ownerCommitment: "0xcommittedsend_owner",
    poolId: committedSendInputTreeId,
    privateSpendContextHash: "0xcommittedsend_context",
    privateSpendPublicInputHash: "0xcommittedsend_public_input_hash",
    routeCommitment: "0xcommittedsend_route",
    settlementCommitment: "0xcommittedsend_settlement",
    settlementId: "protocol-client-committed-send",
  });
  assert(
    committedSendSettlement?.kind === "protocol_settlement",
    `Expected committed Send settlement to be accepted: ${JSON.stringify(committedSendSettlement)}`,
  );
  assert(
    committedSendSettlement?.proofReceipt?.intent === "private-send",
    "Expected committed Send settlement to record private-send proof request intent.",
  );
  assert(
    committedSendSettlement?.proofReceipt?.assetId === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    "Expected committed Send proof receipt to use the hidden-economics asset sentinel.",
  );
  assert(
    committedSendProofRequest.amountBaseUnits ===
      VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    "Expected committed Send proof request to use the hidden-economics amount sentinel.",
  );
  assert(
    committedSendSettlement?.proofReceipt?.publicInputCommitment ===
      expectedLocalPublicInputCommitment(committedSendProofRequest),
    `Expected committed Send settlement to record the dedicated private-send proof request hash. expected=${expectedLocalPublicInputCommitment(committedSendProofRequest)} actual=${committedSendSettlement?.proofReceipt?.publicInputCommitment}`,
  );
  assert(
    !JSON.stringify(committedSendSettlement).includes("USDC") &&
      !JSON.stringify(committedSendSettlement).includes("1.00") &&
      !JSON.stringify(committedSendSettlement).includes("recipient-public-address") &&
      !JSON.stringify(committedSendSettlement).includes(committedSendInputCommitment) &&
      !JSON.stringify(committedSendSettlement).includes("inputRoot") &&
      !JSON.stringify(committedSendSettlement).includes("outputLeafIndex"),
    "Expected committed Send settlement response to keep raw asset, amount, destination, and source-state terms redacted.",
  );
  const committedSendReplayCheck = await requestJson("/private-pool-v2/nullifier-replay-checks", {
    body: JSON.stringify({
      intent: "private-send",
      nullifier: "0xcommittedsend_replay",
      requestId: "protocol-client-committed-send-duplicate-probe",
    }),
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    method: "POST",
  });
  assert(
    committedSendReplayCheck.ok,
    committedSendReplayCheck.text || "Expected committed Send duplicate replay check response.",
  );
  assert(
    committedSendReplayCheck.parsed?.accepted === false &&
      committedSendReplayCheck.parsed?.mutated === false &&
      committedSendReplayCheck.parsed?.decision?.replay === true,
    `Expected committed Send nullifier to reject a duplicate replay probe without mutation: ${JSON.stringify(committedSendReplayCheck.parsed)}`,
  );

  await assertRejects(
    async () => {
      const rejected = await requestJson("/private-pool-v2/protocol-settlements", {
        body: JSON.stringify({
          action: "send",
          assetIdCommitment: "0xrejectedsend_asset_id",
          changeOutputCommitment: "0xrejectedsend_change_output",
          economicsCommitment: "0xrejectedsend_economics",
          economicsMode: "committed-economics",
          nullifierOrReplayCommitment: "0xrejectedsend_replay",
          ownerCommitment: "0xrejectedsend_owner",
          outputCommitment: "0xrejectedsend_output",
          routeCommitment: "0xrejectedsend_route",
          settlementCommitment: "0xrejectedsend_settlement",
          settlementId: "protocol-client-rejected-committed-send",
        }),
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: "POST",
      });

      if (!rejected.ok) {
        throw new Error(rejected.parsed?.error ?? rejected.text);
      }
    },
    "Private Pool v2 settlement requires actual-private send fields or full stateful send terms",
    "Expected committed Send settlement to require actual-private send fields when stateful terms are absent.",
  );

  await assertRejects(
    () =>
      requestVantaPrivatePoolV2ProtocolSettlement({
        action: "send",
        amount: "1.00",
        asset: "USDC",
        authToken,
        baseUrl,
        destination: "recipient-public-address",
        economicsCommitment: "0xcommittedsend_economics",
        economicsMode: "committed-economics",
        nullifierOrReplayCommitment: "0xcommittedsend_replay",
        outputCommitment: "0xcommittedsend_output",
        owner: "protocol-client-raw-owner",
        ownerCommitment: "0xcommittedsend_owner",
        routeCommitment: "0xcommittedsend_route",
        settlementCommitment: "0xcommittedsend_settlement",
        settlementId: "protocol-client-rejected-raw-committed-send",
      }),
    "Committed economics protocol settlement rejects raw amount",
    "Expected committed Send settlement to reject raw fields.",
  );
  assert(
    committedSendSettlement?.protocolSettlementReceipt?.economicsMode === "committed-economics",
    "Expected committed Send settlement receipt to preserve committed economics mode.",
  );
  assert(
    committedSendSettlement?.protocolSettlementReceipt?.economicsCommitment ===
      "0xcommittedsend_economics",
    "Expected committed Send settlement receipt to preserve economics commitment.",
  );
  assert(
    committedSendSettlement?.protocolSettlementReceipt?.settlementCommitment ===
      "0xcommittedsend_settlement",
    "Expected committed Send settlement receipt to preserve settlement commitment.",
  );
  assert(
    !("amount" in committedSendSettlement.protocolSettlementReceipt),
    "Expected committed Send settlement receipt to redact raw amount.",
  );
  assert(
    !("asset" in committedSendSettlement.protocolSettlementReceipt),
    "Expected committed Send settlement receipt to redact raw asset.",
  );
  assert(
    !("destination" in committedSendSettlement.protocolSettlementReceipt),
    "Expected committed Send settlement receipt to redact raw destination.",
  );

  await assertRejects(
    () =>
      requestVantaPrivatePoolV2ProtocolSettlement({
        action: "swap",
        authToken,
        baseUrl,
        economicsCommitment: "0xcommittedswap_economics",
        economicsMode: "committed-economics",
        inputCommitment: "0xcommittedswap_input",
        nullifierOrReplayCommitment: "0xcommittedswap_replay",
        outputCommitment: "0xcommittedswap_output",
        ownerCommitment: "0xcommittedswap_owner",
        routeCommitment: "0xcommittedswap_route",
        settlementCommitment: "0xcommittedswap_settlement",
        settlementId: "protocol-client-committed-swap-missing-state",
      }),
    "Private Pool v2 settlement requires inputRoot",
    "Expected committed Swap settlement to require dedicated state-transition fields.",
  );

  const setupSwap = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "5.00",
      asset: "USDC",
      destination: "protocol-client-swap-setup-destination",
      owner: "protocol-client-swap-setup-owner",
      settlementId: "protocol-client-committed-swap-setup-shield",
      shieldCapability: {
        blockers: [],
        mode: "direct-configured-token",
        requiresPublicRoute: false,
        sourceAsset: {
          mintAddress: "mint:usdc",
          symbol: "USDC",
        },
        supportsDirectShield: true,
        targetShieldAsset: {
          assetKey: "USDC",
          label: "Shielded USDC",
          mintAddress: "mint:usdc",
          name: "USD Coin",
        },
      },
      shieldSettlementEvidence: {
        depositSignature: "protocol-client-committed-swap-setup-deposit",
        owner: "protocol-client-swap-setup-owner",
        stateSignature: "protocol-client-committed-swap-setup-shield",
        vaultOwner: "protocol-client-committed-swap-setup-vault",
      },
    }),
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    method: "POST",
  });
  assert(setupSwap.ok, `Expected setup swap shield to be accepted: ${setupSwap.text}`);
  const committedSwapInputCommitment = hashHex(
    payPrivateSettlementAdapterVersion,
    "protocol-shield-output",
    "protocol-client-committed-swap-setup-shield",
    "5.00",
    "USDC",
  );
  const committedSwapInputRecord = {
    assetId: "USDC",
    commitment: committedSwapInputCommitment,
    leafIndex: 3,
    treeId: committedSendInputTreeId,
  };
  const committedSwapInputRoot = currentRoot(committedSendInputTreeId, [
    committedSendInputRecord,
    committedSendRecipientRecord,
    committedSendChangeRecord,
    committedSwapInputRecord,
  ]);
  const committedSwapOutputRecord = {
    assetId: "USDC",
    commitment: "0xcommittedswap_output",
    leafIndex: 4,
    treeId: committedSendInputTreeId,
  };
  const committedSwapOutputRoot = currentRoot(committedSendInputTreeId, [
    committedSendInputRecord,
    committedSendRecipientRecord,
    committedSendChangeRecord,
    committedSwapInputRecord,
    committedSwapOutputRecord,
  ]);
  const committedSwapProofRequest = createVantaPrivatePoolV2SwapToShieldedProofRequest({
    economicsCommitment: "0xcommittedswap_economics",
    inputCommitment: committedSwapInputCommitment,
    inputRoot: committedSwapInputRoot,
    nullifierOrReplayCommitment: "0xcommittedswap_replay",
    outputCommitment: "0xcommittedswap_output",
    outputLeafIndex: "4",
    outputRoot: committedSwapOutputRoot,
    ownerCommitment: "0xcommittedswap_owner",
    routeCommitment: "0xcommittedswap_route",
    settlementCommitment: "0xcommittedswap_settlement",
    swapContextTag: "0xcommittedswap_context",
    swapPublicInputHash: "0xcommittedswap_public_input_hash",
  });
  const committedSwapSettlement = await requestVantaPrivatePoolV2ProtocolSettlement({
    action: "swap",
    authToken,
    baseUrl,
    economicsCommitment: "0xcommittedswap_economics",
    economicsMode: "committed-economics",
    inputCommitment: committedSwapInputCommitment,
    inputRoot: committedSwapInputRoot,
    nullifierOrReplayCommitment: "0xcommittedswap_replay",
    outputCommitment: "0xcommittedswap_output",
    outputLeafIndex: "4",
    outputRoot: committedSwapOutputRoot,
    ownerCommitment: "0xcommittedswap_owner",
    routeCommitment: "0xcommittedswap_route",
    settlementCommitment: "0xcommittedswap_settlement",
    settlementId: "protocol-client-committed-swap",
    swapContextTag: "0xcommittedswap_context",
    swapPublicInputHash: "0xcommittedswap_public_input_hash",
  });
  assert(
    committedSwapSettlement?.proofReceipt?.intent === "swap-to-shielded",
    "Expected committed Swap settlement to record swap-to-shielded proof request intent.",
  );
  assert(
    committedSwapSettlement?.proofReceipt?.assetId ===
      VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    "Expected committed Swap proof receipt to use the hidden-economics asset sentinel.",
  );
  assert(
    committedSwapProofRequest.amountBaseUnits ===
      VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    "Expected committed Swap proof request to use the hidden-economics amount sentinel.",
  );
  assert(
    committedSwapSettlement?.proofReceipt?.publicInputCommitment ===
      expectedLocalPublicInputCommitment(committedSwapProofRequest),
    `Expected committed Swap settlement to record the dedicated swap-to-shielded proof request hash. expected=${expectedLocalPublicInputCommitment(committedSwapProofRequest)} actual=${committedSwapSettlement?.proofReceipt?.publicInputCommitment}`,
  );
  assert(
    !JSON.stringify(committedSwapSettlement).includes("USDC") &&
      !JSON.stringify(committedSwapSettlement).includes("5.00") &&
      !JSON.stringify(committedSwapSettlement).includes("protocol-client-swap-destination"),
    "Expected committed Swap settlement response to keep raw asset, amount, and destination redacted.",
  );
  assert(
    committedSwapSettlement?.protocolSettlementReceipt?.economicsMode === "committed-economics",
    "Expected committed Swap settlement receipt to preserve committed economics mode.",
  );
  assert(
    committedSwapSettlement?.protocolSettlementReceipt?.economicsCommitment ===
      "0xcommittedswap_economics",
    "Expected committed Swap settlement receipt to preserve economics commitment.",
  );
  assert(
    committedSwapSettlement?.protocolSettlementReceipt?.settlementCommitment ===
      "0xcommittedswap_settlement",
    "Expected committed Swap settlement receipt to preserve settlement commitment.",
  );
  for (const rawField of ["amount", "asset", "destination", "owner"]) {
    assert(
      !(rawField in committedSwapSettlement.protocolSettlementReceipt),
      `Expected committed Swap settlement receipt to redact raw ${rawField}.`,
    );
  }

  await assertRejects(
    () =>
      requestVantaPrivatePoolV2ProtocolSettlement({
        action: "swap",
        authToken,
        baseUrl,
        economicsCommitment: "0xcommittedswap_economics_second",
        economicsMode: "committed-economics",
        inputCommitment: "0xcommittedsend_recipient_output",
        inputRoot: committedSwapOutputRoot,
        nullifierOrReplayCommitment: "0xcommittedswap_replay",
        outputCommitment: "0xcommittedswap_output_second",
        outputLeafIndex: "4",
        outputRoot: "0xcommittedswap_output_root_second",
        ownerCommitment: "0xcommittedswap_owner_second",
        routeCommitment: "0xcommittedswap_route_second",
        settlementCommitment: "0xcommittedswap_settlement_second",
        settlementId: "protocol-client-committed-swap-replay",
        swapContextTag: "0xcommittedswap_context_second",
      }),
    "Private-pool nullifier replay rejected",
    "Expected committed Swap replay commitment reuse to be rejected.",
  );

  const committedUnshieldSettlement = await requestVantaPrivatePoolV2ProtocolSettlement({
    action: "unshield",
    authToken,
    baseUrl,
    economicsCommitment: "0xcommittedunshield_economics",
    economicsMode: "committed-economics",
    exitTermsCommitment: "0xcommittedunshield_exit_terms",
    inputCommitment: "0xcommittedswap_output",
    inputRoot: committedSwapOutputRoot,
    nullifierOrReplayCommitment: "0xcommittedunshield_replay",
    ownerCommitment: "0xcommittedunshield_owner",
    routeCommitment: "0xcommittedunshield_route",
    settlementCommitment: "0xcommittedunshield_settlement",
    settlementId: "protocol-client-committed-unshield",
    unshieldContextTag: "0xcommittedunshield_context",
    unshieldPublicInputHash: "0xcommittedunshield_public_input_hash",
  });
  assert(
    committedUnshieldSettlement?.protocolSettlementReceipt?.action === "unshield",
    "Expected committed Unshield settlement receipt to preserve action.",
  );
  assert(
    committedUnshieldSettlement?.proofReceipt?.intent === "unshield",
    "Expected committed Unshield proof receipt intent.",
  );
  assert(
    committedUnshieldSettlement?.proofReceipt?.assetId === "hidden:economic-terms",
    "Expected committed Unshield proof receipt to use hidden-economics asset sentinel.",
  );
  assert(
    committedUnshieldSettlement?.protocolSettlementReceipt?.economicsMode ===
      "committed-economics",
    "Expected committed Unshield settlement receipt to preserve committed economics mode.",
  );
  assert(
    committedUnshieldSettlement?.protocolSettlementReceipt?.economicsCommitment ===
      "0xcommittedunshield_economics",
    "Expected committed Unshield settlement receipt to preserve economics commitment.",
  );
  assert(
    committedUnshieldSettlement?.protocolSettlementReceipt?.settlementCommitment ===
      "0xcommittedunshield_settlement",
    "Expected committed Unshield settlement receipt to preserve settlement commitment.",
  );
  assert(
    committedUnshieldSettlement?.protocolSettlementReceipt?.exitTermsCommitment ===
      "0xcommittedunshield_exit_terms",
    "Expected committed Unshield settlement receipt to preserve exit terms commitment.",
  );
  for (const rawField of ["amount", "asset", "destination", "owner"]) {
    assert(
      !(rawField in committedUnshieldSettlement.protocolSettlementReceipt),
      `Expected committed Unshield settlement receipt to redact raw ${rawField}.`,
    );
  }

  await assertRejects(
    () =>
      requestVantaPrivatePoolV2ProtocolSettlement({
        action: "unshield",
        amount: "3.00",
        asset: "USDC",
        authToken,
        baseUrl,
        destination: "protocol-client-raw-unshield-destination",
        economicsCommitment: "0xrejectedunshield_economics",
        economicsMode: "committed-economics",
        exitTermsCommitment: "0xrejectedunshield_exit_terms",
        inputCommitment: "0xrejectedunshield_input",
        inputRoot: "0xrejectedunshield_input_root",
        nullifierOrReplayCommitment: "0xrejectedunshield_replay",
        owner: "protocol-client-raw-owner",
        ownerCommitment: "0xrejectedunshield_owner",
        routeCommitment: "0xrejectedunshield_route",
        settlementCommitment: "0xrejectedunshield_settlement",
        settlementId: "protocol-client-rejected-committed-unshield",
        unshieldContextTag: "0xrejectedunshield_context",
      }),
    "Committed economics protocol settlement rejects raw amount",
    "Expected committed Unshield settlement to reject raw fields.",
  );

  await assertRejects(
    () =>
      requestVantaPrivatePoolV2ProtocolSettlement({
        action: "unshield",
        authToken,
        baseUrl,
        economicsCommitment: "0xcommittedunshield_economics_second",
        economicsMode: "committed-economics",
        exitTermsCommitment: "0xcommittedunshield_exit_terms_second",
        inputCommitment: "0xcommittedunshield_input_second",
        inputRoot: "0xcommittedunshield_input_root_second",
        nullifierOrReplayCommitment: "0xcommittedunshield_replay",
        ownerCommitment: "0xcommittedunshield_owner_second",
        routeCommitment: "0xcommittedunshield_route_second",
        settlementCommitment: "0xcommittedunshield_settlement_second",
        settlementId: "protocol-client-committed-unshield-replay",
        unshieldContextTag: "0xcommittedunshield_context_second",
      }),
    "Private-pool nullifier replay rejected",
    "Expected committed Unshield replay commitment reuse to be rejected.",
  );

  const settlementRequests = [
    {
      action: "shield",
      amount: "12.00",
      asset: "BONK",
      authToken,
      baseUrl,
      destination: "protocol-client-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-shield",
      shieldSettlementEvidence: {
        depositSignature: "typed-client-deposit-sig-bonk-to-usdc",
        owner: "protocol-client-owner",
        stateSignature: "protocol-client-shield",
        vaultOwner: "protocol-client-vault-owner",
      },
      shieldCapability: {
        blockers: [],
        mode: "route-to-configured-shield-token",
        requiresPublicRoute: true,
        sourceAsset: {
          mintAddress: "mint:bonk",
          symbol: "BONK",
        },
        supportsDirectShield: false,
        targetShieldAsset: {
          assetKey: "USDC",
          label: "Shielded USDC",
          mintAddress: "mint:usdc",
          name: "USD Coin",
        },
      },
      shieldRouteEvidence: {
        provider: "jupiter",
        routeSignature: "typed-client-route-sig-bonk-to-usdc",
        sourceAmount: "12.00",
        sourceAsset: "BONK",
        sourceMintAddress: "mint:bonk",
        targetAmount: "12.00",
        targetAsset: "USDC",
        targetMintAddress: "mint:usdc",
      },
    },
    {
      action: "shield",
      amount: "2.00",
      asset: "USDC",
      authToken,
      baseUrl,
      destination: "protocol-client-direct-shield-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-direct-shield",
      shieldSettlementEvidence: {
        depositSignature: "typed-client-deposit-sig-usdc",
        owner: "protocol-client-owner",
        stateSignature: "protocol-client-direct-shield",
        vaultOwner: "protocol-client-vault-owner",
      },
      shieldCapability: {
        blockers: [],
        mode: "direct-configured-token",
        requiresPublicRoute: false,
        sourceAsset: {
          mintAddress: "mint:usdc",
          symbol: "USDC",
        },
        supportsDirectShield: true,
        targetShieldAsset: {
          assetKey: "USDC",
          label: "Shielded USDC",
          mintAddress: "mint:usdc",
          name: "USD Coin",
        },
      },
      shieldRouteEvidence: null,
    },
    {
      action: "send",
      amount: "4.00",
      asset: "USDC",
      authToken,
      baseUrl,
      destination: "protocol-client-send-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-send",
    },
    {
      action: "swap",
      amount: "5.00",
      asset: "USDC",
      authToken,
      baseUrl,
      destination: "protocol-client-swap-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-swap",
    },
    {
      action: "unshield",
      amount: "3.00",
      asset: "USDC",
      authToken,
      baseUrl,
      destination: "protocol-client-unshield-destination",
      owner: "protocol-client-owner",
      settlementId: "protocol-client-unshield",
    },
  ];
  const settlements = [];

  await assertRejects(
    () =>
      Promise.resolve(
        validateVantaPrivatePoolV2ProtocolSettlementResponse({
          request: settlementRequests[0],
          response: {
            kind: "protocol_settlement",
            proofReceipt: {
              assetId: "WRONG",
              intent: "shield",
              publicInputCommitment: "0xcommitment",
              receiptId: "0xreceipt",
              recordedAtSlot: "1",
              replayKey: "shield:bad",
              shadowCommitments: {
                economicsCommitment: "0xeconomics",
                operatorVisibleTermsCommitment: "0xterms",
                scheme: "vanta-private-pool-v2-shadow-operator-visible-terms-sha256-0.1",
              },
            },
            protocolSettlementReceipt: {
              action: "shield",
              amount: "12.00",
              asset: "BONK",
              id: "proto_bad",
              object: "protocol_settlement_receipt",
              operatorVisibleTermsCommitment: "0xterms",
              proofReceiptId: "ppv2_receipt",
              proofReceiptPublicInputCommitment: "0xcommitment",
              routeProvider: "jupiter",
              routeSignature: "route-sig-bonk-to-usdc",
              routeSourceAmount: "12.00",
              routeSourceAsset: "BONK",
              routeSourceMintAddress: "mint:bonk",
              routeTargetAmount: "12.00",
              settlementId: "protocol-client-shield",
              shieldReceiptBindingHash: "0xbinding",
              shieldCapabilityMode: "route-to-configured-shield-token",
              depositSignature: "typed-client-deposit-sig-bonk-to-usdc",
              owner: "protocol-client-owner",
              sourceAsset: "BONK",
              sourceMintAddress: "mint:bonk",
              stateSignature: "protocol-client-shield",
              status: "confirmed",
              targetAsset: "USDC",
              targetMintAddress: "mint:usdc",
              vaultOwner: "protocol-client-vault-owner",
            },
          },
        }),
      ),
    "Shield proof receipt asset does not match the target shield asset",
    "Expected Shield settlement validation to reject mismatched proof receipt asset.",
  );

  await assertRejects(
    () =>
      Promise.resolve(
        validateVantaPrivatePoolV2ProtocolSettlementResponse({
          request: settlementRequests[0],
          response: {
            kind: "protocol_settlement",
            proofReceipt: {
              assetId: "USDC",
              intent: "shield",
              publicInputCommitment: "0xcommitment",
              receiptId: "0xproofreceipt",
              recordedAtSlot: "1",
              replayKey: "shield:bad",
              shadowCommitments: {
                economicsCommitment: "0xeconomics",
                operatorVisibleTermsCommitment: "0xterms",
                scheme: "vanta-private-pool-v2-shadow-operator-visible-terms-sha256-0.1",
              },
            },
            protocolSettlementReceipt: {
              action: "shield",
              amount: "12.00",
              asset: "BONK",
              id: "proto_bad",
              object: "protocol_settlement_receipt",
              operatorVisibleTermsCommitment: "0xterms",
              proofReceiptId: "ppv2_wrongproof",
              proofReceiptPublicInputCommitment: "0xcommitment",
              routeProvider: "jupiter",
              routeSignature: "typed-client-route-sig-bonk-to-usdc",
              routeSourceAmount: "12.00",
              routeSourceAsset: "BONK",
              routeSourceMintAddress: "mint:bonk",
              routeTargetAmount: "12.00",
              settlementId: "protocol-client-shield",
              shieldReceiptBindingHash: "0xbinding",
              shieldCapabilityMode: "route-to-configured-shield-token",
              depositSignature: "typed-client-deposit-sig-bonk-to-usdc",
              owner: "protocol-client-owner",
              sourceAsset: "BONK",
              sourceMintAddress: "mint:bonk",
              stateSignature: "protocol-client-shield",
              status: "confirmed",
              targetAsset: "USDC",
              targetMintAddress: "mint:usdc",
              vaultOwner: "protocol-client-vault-owner",
            },
          },
        }),
      ),
    "proof id does not match the proof receipt",
    "Expected Shield settlement validation to reject a spliced proof receipt id.",
  );

  for (const settlementRequest of settlementRequests) {
    const settlement = await requestVantaPrivatePoolV2ProtocolSettlement(settlementRequest);
    assert(
      settlement?.protocolSettlementReceipt?.proofReceiptId?.startsWith("ppv2_"),
      `Expected ${settlementRequest.action} settlement to return a ppv2 proof receipt.`,
    );
    assert(
      settlement?.protocolSettlementReceipt?.action === settlementRequest.action,
      `Expected ${settlementRequest.action} settlement receipt to preserve action.`,
    );
    assert(
      settlement?.protocolSettlementReceipt?.settlementId === settlementRequest.settlementId,
      `Expected ${settlementRequest.action} settlement receipt to preserve settlement id.`,
    );
    assert(
      settlement?.protocolSettlementReceipt?.status === "confirmed",
      `Expected ${settlementRequest.action} settlement receipt to be confirmed.`,
    );
    assert(
      settlement?.proofReceipt?.receiptId,
      `Expected ${settlementRequest.action} settlement to include an operator proof receipt.`,
    );
    if (settlementRequest.action === "shield" || settlementRequest.action === "unshield") {
      assert(
        settlement?.proofReceipt?.shadowCommitments?.scheme ===
          "vanta-private-pool-v2-shadow-operator-visible-terms-sha256-0.1",
        `Expected ${settlementRequest.action} settlement proof receipt to include shadow commitment scheme.`,
      );
      assert(
        settlement?.proofReceipt?.shadowCommitments?.operatorVisibleTermsCommitment?.startsWith("0x"),
        `Expected ${settlementRequest.action} settlement proof receipt to include operator-visible terms shadow commitment.`,
      );
    }

    const idempotentSettlement = await requestVantaPrivatePoolV2ProtocolSettlement(settlementRequest);
    assert(
      idempotentSettlement?.protocolSettlementReceipt?.id === settlement.protocolSettlementReceipt.id,
      `Expected repeated ${settlementRequest.action} settlement to return the same receipt id.`,
    );
    assert(
      idempotentSettlement?.protocolSettlementReceipt?.proofReceiptId ===
        settlement.protocolSettlementReceipt.proofReceiptId,
      `Expected repeated ${settlementRequest.action} settlement to return the same proof receipt id.`,
    );

    await assertRejects(
      () =>
        requestVantaPrivatePoolV2ProtocolSettlement({
          ...settlementRequest,
          amount: "99.00",
        }),
      "conflicts with an existing settlement amount",
      `Expected conflicting ${settlementRequest.action} replay to be rejected.`,
    );

    settlements.push(settlement);
  }

  const shieldSettlement = settlements.find(
    (settlement) => settlement.protocolSettlementReceipt.action === "shield",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.sourceAsset === "BONK",
    "Expected typed protocol settlement client to preserve source asset.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.targetAsset === "USDC",
    "Expected typed protocol settlement client to preserve target shield asset.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.routeProvider === "jupiter",
    "Expected typed protocol settlement client to preserve route evidence.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.depositSignature ===
      "typed-client-deposit-sig-bonk-to-usdc",
    "Expected typed protocol settlement client to preserve Shield deposit signature.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.stateSignature === "protocol-client-shield",
    "Expected typed protocol settlement client to preserve Shield state signature.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.owner === "protocol-client-owner",
    "Expected typed protocol settlement client to preserve Shield owner evidence.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.vaultOwner === "protocol-client-vault-owner",
    "Expected typed protocol settlement client to preserve Shield vault owner evidence.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.routeSourceAmount === "12.00",
    "Expected typed protocol settlement client to preserve routed Shield source amount.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.routeSourceAsset === "BONK",
    "Expected typed protocol settlement client to preserve routed Shield source asset.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.routeSourceMintAddress === "mint:bonk",
    "Expected typed protocol settlement client to preserve routed Shield source mint.",
  );
  assert(
    shieldSettlement?.protocolSettlementReceipt?.targetMintAddress === "mint:usdc",
    "Expected typed protocol settlement client to preserve routed Shield target mint.",
  );

  const directShieldSettlement = settlements.find(
    (settlement) =>
      settlement.protocolSettlementReceipt.settlementId === "protocol-client-direct-shield",
  );
  assert(
    directShieldSettlement?.protocolSettlementReceipt?.shieldCapabilityMode ===
      "direct-configured-token",
    "Expected direct Shield settlement to preserve direct capability mode.",
  );
  assert(
    !("routeProvider" in directShieldSettlement.protocolSettlementReceipt),
    "Expected direct Shield settlement receipt not to include route provider.",
  );

  const finalStatus = await fetchVantaPrivatePoolV2ProtocolSettlementStatus({ authToken, baseUrl });
  assert(
    finalStatus?.protocolSettlementCount === settlementRequests.length + 5,
    "Expected typed status to report every protocol settlement.",
  );
  assert(
    finalStatus?.protocolSettlements?.length === settlementRequests.length + 5,
    "Expected typed status to include every protocol settlement.",
  );
  assert(
    finalStatus?.receiptCount === settlementRequests.length + 5,
    "Expected one accepted proof receipt per protocol settlement in typed status.",
  );
  assert(
    finalStatus?.receipts?.length === settlementRequests.length + 5,
    "Expected typed status receipts to include every protocol proof receipt.",
  );

  const statusSettlementIds = new Set(
    finalStatus.protocolSettlements.map(
      (settlement) => settlement.protocolSettlementReceipt?.settlementId,
    ),
  );
  const statusProofReceiptIds = new Set(
    finalStatus.receipts.map((receipt) => `ppv2_${receipt.receiptId.slice(2, 26)}`),
  );

  for (const settlementRequest of settlementRequests) {
    const settlement = settlements.find(
      (candidate) =>
        candidate.protocolSettlementReceipt.settlementId === settlementRequest.settlementId,
    );
    assert(
      statusSettlementIds.has(settlementRequest.settlementId),
      `Expected typed status to include ${settlementRequest.action} settlement.`,
    );
    assert(
      statusProofReceiptIds.has(settlement.protocolSettlementReceipt.proofReceiptId),
      `Expected typed status receipts to include ${settlementRequest.action} proof receipt.`,
    );
    if (settlementRequest.action === "shield" || settlementRequest.action === "unshield") {
      const statusReceipt = finalStatus.receipts.find(
        (receipt) =>
          `ppv2_${receipt.receiptId.slice(2, 26)}` ===
          settlement.protocolSettlementReceipt.proofReceiptId,
      );
      assert(
        statusReceipt?.shadowCommitments?.operatorVisibleTermsCommitment ===
          settlement.proofReceipt.shadowCommitments.operatorVisibleTermsCommitment,
        `Expected typed status receipts to preserve ${settlementRequest.action} shadow commitment.`,
      );
    }
  }
  for (const committedSettlement of [
    committedSendSettlement,
    committedSwapSettlement,
    committedUnshieldSettlement,
  ]) {
    const statusSettlement = finalStatus.protocolSettlements.find(
      (settlement) =>
        settlement.protocolSettlementReceipt?.settlementId ===
        committedSettlement.protocolSettlementReceipt.settlementId,
    );
    assert(statusSettlement, "Expected typed status to include committed economics settlement.");
    assert(
      statusSettlement.protocolSettlementReceipt.economicsMode === "committed-economics",
      "Expected typed status to preserve committed economics mode.",
    );
    assert(
      !("amount" in statusSettlement.protocolSettlementReceipt),
      "Expected typed status committed settlement to redact raw amount.",
    );
    assert(
      !("asset" in statusSettlement.protocolSettlementReceipt),
      "Expected typed status committed settlement to redact raw asset.",
    );
    assert(
      !("destination" in statusSettlement.protocolSettlementReceipt),
      "Expected typed status committed settlement to redact raw destination.",
    );
  }

  const finalOperatorStatus = await fetchVantaPrivatePoolV2OperatorStatus({ authToken, baseUrl });
  assert(
    finalOperatorStatus?.receiptCount === settlementRequests.length + 5,
    "Expected typed operator status to report every protocol proof receipt.",
  );
  assert(
    finalOperatorStatus?.operatorEconomicsExposure?.committedSettlementCount === 3,
    `Expected typed operator status to report committed economics settlement count; received ${finalOperatorStatus?.operatorEconomicsExposure?.committedSettlementCount}.`,
  );
  assert(
    finalOperatorStatus?.operatorEconomicsExposure?.rawSettlementCount ===
      finalStatus.protocolSettlements.filter(
        (settlement) =>
          (settlement.protocolSettlementReceipt?.economicsMode ?? "raw-operator-visible") ===
          "raw-operator-visible",
      ).length,
    `Expected typed operator status to report raw economics settlement count; received ${finalOperatorStatus?.operatorEconomicsExposure?.rawSettlementCount}.`,
  );
  assert(
    finalOperatorStatus?.operatorEconomicsExposure?.hiddenEconomicsActions?.includes("unshield"),
    "Expected typed operator status to list unshield as a hidden-economics action.",
  );
  assert(
    finalOperatorStatus?.operatorEconomicsExposure?.hiddenEconomicsActions?.includes("swap"),
    "Expected typed operator status to list swap as a hidden-economics action.",
  );
  assert(
    !finalOperatorStatus?.operatorEconomicsExposure?.operatorStillSeesRawActions?.includes(
      "unshield",
    ),
    "Expected typed operator status raw-action list to exclude committed Unshield.",
  );
  assert(
    !finalOperatorStatus?.operatorEconomicsExposure?.operatorStillSeesRawActions?.includes("swap"),
    "Expected typed operator status raw-action list to exclude committed Swap.",
  );
  assert(
    finalOperatorStatus?.anonymitySetReadiness?.version ===
      "vanta-private-pool-v2-anonymity-set-readiness-0.1",
    "Expected typed operator status to expose anonymity-set readiness.",
  );
  assert(
    finalOperatorStatus?.anonymitySetReadiness?.anonymitySetReadiness === "blocked",
    "Expected typed operator status to keep anonymity-set readiness blocked.",
  );
  assert(
    finalOperatorStatus?.shadowCommitmentCount === finalStatus.shadowCommitmentCount,
    `Expected typed operator status to report shield and claim shadow commitments; received operator=${finalOperatorStatus?.shadowCommitmentCount}, status=${finalStatus.shadowCommitmentCount}.`,
  );

  console.log("private-pool-v2 protocol settlement client: PASS");
} finally {
  if (server.exitCode === null) {
    await new Promise((resolvePromise) => {
      server.once("close", resolvePromise);
      server.kill("SIGTERM");
    });
  }
  rmSync(tempRoot, { force: true, recursive: true });

  if (server.exitCode && server.exitCode !== 0) {
    process.stderr.write(stdout);
    process.stderr.write(stderr);
  }
}
