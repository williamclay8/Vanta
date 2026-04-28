import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-http-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const storePath = join(tempRoot, "private-pool-v2-receipts.json");
const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
];
const port = 9880 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const routedShieldSettlementEvidence = {
  depositSignature: "protocol-shield-deposit-signature",
  owner: "owner-public-key",
  stateSignature: "protocol-shield-state-signature",
  vaultOwner: "protocol-shield-vault-owner",
};
const localIndexerScheme = "sha256-append-only-private-pool-v2-local-indexer-0.1";
const payPrivateSettlementAdapterVersion = "vanta-pay-private-settlement-adapter-0.1";
const hiddenEconomicsAssetId = "hidden:economic-terms";

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

function treeIdForAsset(asset) {
  return hashHex(payPrivateSettlementAdapterVersion, "tree", asset).slice(0, 34);
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

async function requestJsonAt(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
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

async function waitForExit(child, timeoutMs = 5_000) {
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

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

async function loadFixtureRuntime() {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
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

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const [
    { createVantaPrivatePoolV2ClaimProofRequest, createVantaPrivatePoolV2ShieldProofRequest },
    { createVantaPrivatePoolV2LocalIndexer },
    { createVantaPrivatePoolV2LocalProver },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalIndexer.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
  ]);

  const indexer = createVantaPrivatePoolV2LocalIndexer();
  const previousRoot = await indexer.getCurrentRoot("vanta-http-tree");
  const commitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:http-shield-output-commitment",
    treeId: "vanta-http-tree",
  });
  const merkleProof = await indexer.getMerkleProof(commitment.commitment);
  const prover = createVantaPrivatePoolV2LocalProver();
  const shieldRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: 1_000_000n,
    ownerCommitment: "field:owner",
    previousRoot,
    routeCommitment: "field:route",
    sourceMintAddress: "mint:public-usdc",
    targetAssetId: "USDC",
    targetMintAddress: "mint:shielded-usdc",
    treeCommitment: commitment,
  });
  const quote = {
    estimatedFeeBaseUnits: 100n,
    expiresAtSlot: 1_000_150n,
    relayerId: "relayer:http",
  };
  const claimRequest = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: 1_000_000n,
    destinationAddress: "recipient-public-address",
    merkleProof,
    nullifier: "field:http-nullifier",
    ownerCommitment: "field:owner",
    quote,
  });

  return {
    claimProof: await prover.prove(claimRequest),
    claimRequest,
    shieldProof: await prover.prove(shieldRequest),
    shieldRequest,
  };
}

function encodePayload({ proof, request }) {
  return JSON.stringify({
    proof: {
      ...proof,
      proofBytes: [...proof.proofBytes],
    },
    request: {
      ...request,
      amountBaseUnits: request.amountBaseUnits.toString(),
    },
  });
}

const fixture = await loadFixtureRuntime();
const insecureProductionServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port + 1_000),
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "insecure-production-store.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let insecureProductionStderr = "";
insecureProductionServer.stderr.on("data", (chunk) => {
  insecureProductionStderr += chunk.toString("utf8");
});
const insecureProductionExitCode = await waitForExit(insecureProductionServer);
if (insecureProductionExitCode === null) {
  insecureProductionServer.kill("SIGTERM");
  throw new Error("Expected insecure production Private Pool V2 operator to exit.");
}
assert(
  insecureProductionStderr.includes("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"),
  "Expected missing Private Pool V2 production auth token error.",
);
console.log("private-pool-v2 production auth guard: PASS");

const storelessProductionServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-live-token",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port + 1_002),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let storelessProductionStderr = "";
storelessProductionServer.stderr.on("data", (chunk) => {
  storelessProductionStderr += chunk.toString("utf8");
});
const storelessProductionExitCode = await waitForExit(storelessProductionServer);
if (storelessProductionExitCode === null) {
  storelessProductionServer.kill("SIGTERM");
  throw new Error("Expected production Private Pool V2 operator without durable store to exit.");
}
assert(
  storelessProductionStderr.includes("VANTA_PRIVATE_POOL_V2_DATABASE_URL"),
  "Expected missing Private Pool V2 production database URL error.",
);
console.log("private-pool-v2 production database guard: PASS");

const fileOnlyProductionServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-live-token",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port + 1_003),
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "file-only-production-store.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let fileOnlyProductionStderr = "";
fileOnlyProductionServer.stderr.on("data", (chunk) => {
  fileOnlyProductionStderr += chunk.toString("utf8");
});
const fileOnlyProductionExitCode = await waitForExit(fileOnlyProductionServer);
if (fileOnlyProductionExitCode === null) {
  fileOnlyProductionServer.kill("SIGTERM");
  throw new Error("Expected production Private Pool V2 operator with file-only store to exit.");
}
assert(
  fileOnlyProductionStderr.includes("VANTA_PRIVATE_POOL_V2_DATABASE_URL"),
  "Expected file-only Private Pool V2 production store to require a database URL.",
);
console.log("private-pool-v2 production file-store rejection: PASS");

const authPort = port + 1_001;
const authBaseUrl = `http://127.0.0.1:${authPort}`;
const authenticatedServer = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "vanta-private-pool-v2-test-token",
    VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(authPort),
    VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, "authenticated-store.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJsonAt(authBaseUrl, "/health");
      if (response.ok) {
        break;
      }
    } catch {
      // Server still booting.
    }
    await sleep(250);
  }

  const unauthenticatedStatus = await requestJsonAt(authBaseUrl, "/state/private-pool-v2-status");
  assert(unauthenticatedStatus.status === 401, "Expected auth-protected status endpoint.");
  const authenticatedStatus = await requestJsonAt(authBaseUrl, "/state/private-pool-v2-status", {
    headers: { Authorization: "Bearer vanta-private-pool-v2-test-token" },
  });
  assert(authenticatedStatus.ok, authenticatedStatus.text || "Expected authenticated status.");
  console.log("private-pool-v2 bearer auth: PASS");
} finally {
  if (authenticatedServer.exitCode === null) {
    await new Promise((resolvePromise) => {
      authenticatedServer.once("close", resolvePromise);
      authenticatedServer.kill("SIGTERM");
    });
  }
}

const server = spawn("node", ["operator/private-pool-v2-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
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

  const status = await requestJson("/state/private-pool-v2-status");
  assert(status.ok, status.text || "Expected operator status response.");
  assert(status.parsed?.productionReady === false, "Expected operator status to be explicit about production readiness.");
  assert(status.parsed?.surfaces?.verifierRegistry === "ready", "Expected verifierRegistry ready.");
  assert(
    status.parsed?.storage?.durableStoreConfigured === true,
    "Expected operator status to expose configured durable storage.",
  );
  assert(
    status.parsed?.nullifierReplayGuard?.acceptedNullifierCount === 0,
    "Expected no accepted nullifiers before claim acceptance.",
  );
  assert(
    status.parsed?.settlementPolicy?.failClosedValidation === true,
    "Expected fail-closed settlement validation policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.identicalReplayIdempotency === true,
    "Expected identical settlement replay idempotency policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.conflictingReplayRejection === true,
    "Expected conflicting settlement replay rejection policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.restartSafeSettlementReceipts === true,
    "Expected restart-safe settlement receipt policy.",
  );
  assert(
    status.parsed?.settlementPolicy?.productionDurableStoreRequired === true,
    "Expected production durable-store settlement policy.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.shield === "shield_circuit_request",
    "Expected shield protocol action proof mode.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.unshield ===
      "committed_unshield_or_claim_circuit_request",
    "Expected unshield protocol action proof mode.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.send === "send_circuit_request",
    "Expected send protocol action proof mode.",
  );
  assert(
    status.parsed?.protocolActionProofModes?.swap === "swap_to_shielded_circuit_request",
    "Expected swap protocol action proof mode.",
  );
  console.log("private-pool-v2 http status: PASS");

  const emptyReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(emptyReceipts.ok, emptyReceipts.text || "Expected receipts response.");
  assert(emptyReceipts.parsed?.receiptCount === 0, "Expected empty receipt state.");
  console.log("private-pool-v2 http empty receipts: PASS");

  const rejectedPayCheckoutSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "1.00",
        currency: "USDC",
        id: "vcs_malformed_missing_client_token",
        merchantId: "mrc_123",
      },
    }),
    method: "POST",
  });
  assert(!rejectedPayCheckoutSettlement.ok, "Expected raw Pay checkout settlement to be rejected.");
  assert(
    rejectedPayCheckoutSettlement.status === 410 &&
      String(rejectedPayCheckoutSettlement.parsed?.error ?? "").includes(
        "Legacy raw Pay settlements are disabled",
      ),
    rejectedPayCheckoutSettlement.text || "Expected raw Pay checkout fail-closed error.",
  );
  console.log("private-pool-v2 http raw Pay checkout rejection: PASS");

  const malformedProtocolSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "1.00",
      asset: "USDC",
      owner: "owner-public-key",
      settlementId: "protocol-malformed-missing-destination",
    }),
    method: "POST",
  });
  assert(!malformedProtocolSettlement.ok, "Expected malformed protocol settlement to be rejected.");
  assert(
    String(malformedProtocolSettlement.parsed?.error ?? "").includes("destination"),
    malformedProtocolSettlement.text || "Expected malformed protocol settlement validation error.",
  );

  const shieldReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.shieldProof, request: fixture.shieldRequest }),
    method: "POST",
  });
  assert(shieldReceipt.ok, shieldReceipt.text || "Expected shield proof receipt.");
  assert(shieldReceipt.parsed?.receipt?.intent === "shield", "Expected shield receipt intent.");
  console.log("private-pool-v2 http shield proof: PASS");

  const claimReceipt = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.claimProof, request: fixture.claimRequest }),
    method: "POST",
  });
  assert(claimReceipt.ok, claimReceipt.text || "Expected claim proof receipt.");
  assert(claimReceipt.parsed?.receipt?.intent === "claim", "Expected claim receipt intent.");
  console.log("private-pool-v2 http claim proof: PASS");

  const acceptedStatus = await requestJson("/state/private-pool-v2-status");
  assert(acceptedStatus.ok, acceptedStatus.text || "Expected operator status after claim acceptance.");
  assert(
    acceptedStatus.parsed?.nullifierReplayGuard?.acceptedNullifierCount === 1,
    "Expected accepted nullifier count to reflect recorded claim receipt acceptance.",
  );
  assert(
    acceptedStatus.parsed?.nullifierReplayGuard?.reservedNullifierCount === 0,
    "Expected no pending reserved nullifiers after claim acceptance.",
  );
  console.log("private-pool-v2 http accepted nullifier status: PASS");

  const replay = await requestJson("/private-pool-v2/proofs", {
    body: encodePayload({ proof: fixture.claimProof, request: fixture.claimRequest }),
    method: "POST",
  });
  assert(!replay.ok, "Expected claim replay rejection.");
  assert(
    String(replay.parsed?.error ?? replay.text).includes("already been accepted") ||
      String(replay.parsed?.error ?? replay.text).includes("already registered"),
    replay.text || "Expected replay error.",
  );
  console.log("private-pool-v2 http claim replay rejection: PASS");

  const finalReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(finalReceipts.ok, finalReceipts.text || "Expected final receipts response.");
  assert(finalReceipts.parsed?.receiptCount === 2, "Expected two accepted receipts.");
  console.log("private-pool-v2 http final receipts: PASS");

  const rejectedPayWithdrawalSettlement = await requestJson("/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      amount: "25.00",
      asset: "USDC",
      destination: "Treasury",
      kind: "withdrawal",
      merchantId: "mrc_123",
    }),
    method: "POST",
  });
  assert(!rejectedPayWithdrawalSettlement.ok, "Expected raw Pay withdrawal settlement to be rejected.");
  assert(
    rejectedPayWithdrawalSettlement.status === 410 &&
      String(rejectedPayWithdrawalSettlement.parsed?.error ?? "").includes(
        "Legacy raw Pay settlements are disabled",
      ),
    rejectedPayWithdrawalSettlement.text || "Expected raw Pay withdrawal fail-closed error.",
  );
  console.log("private-pool-v2 http raw Pay withdrawal rejection: PASS");

  const paySettlementReceipts = await requestJson("/state/private-pool-v2-receipts");
  assert(paySettlementReceipts.ok, paySettlementReceipts.text || "Expected Pay settlement receipts.");
  assert(paySettlementReceipts.parsed?.receiptCount === 2, "Expected two accepted receipts.");
  assert(
    paySettlementReceipts.parsed?.paySettlementCount === 0,
    "Expected zero operator-owned raw Pay settlement receipts.",
  );
  console.log("private-pool-v2 http raw Pay settlement fail-closed receipts: PASS");

	  for (const action of ["shield", "send", "swap", "unshield"]) {
    const isShield = action === "shield";
    const protocolSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
      body: JSON.stringify({
        action,
        amount: action === "swap" ? "10.00" : "5.00",
        asset: isShield ? "BONK" : "USDC",
        destination: action === "unshield" ? "Treasury" : "recipient-public-key",
        owner: "owner-public-key",
        settlementId: `protocol-${action}-settlement`,
        ...(isShield
          ? {
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
                routeSignature: "route-sig-bonk-to-usdc",
                sourceAmount: "5.00",
                sourceAsset: "BONK",
                sourceMintAddress: "mint:bonk",
                targetAmount: "5.00",
                targetAsset: "USDC",
                targetMintAddress: "mint:usdc",
              },
              shieldSettlementEvidence: {
                depositSignature: "deposit-sig-protocol-shield-settlement",
                owner: "owner-public-key",
                stateSignature: "protocol-shield-settlement",
                vaultOwner: "protocol-shield-vault-owner",
              },
            }
          : {}),
      }),
      method: "POST",
    });
    assert(protocolSettlement.ok, protocolSettlement.text || `Expected ${action} protocol settlement.`);
    assert(
      protocolSettlement.parsed?.protocolSettlementReceipt?.action === action,
      `Expected ${action} protocol settlement receipt.`,
    );
    assert(
      String(protocolSettlement.parsed?.settlementFingerprint ?? "").startsWith("0x"),
      `Expected ${action} protocol settlement fingerprint.`,
    );

    if (isShield) {
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.sourceAsset === "BONK",
        "Expected shield protocol receipt to preserve source asset.",
      );
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.targetAsset === "USDC",
        "Expected shield protocol receipt to preserve target shield asset.",
      );
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.shieldCapabilityMode ===
          "route-to-configured-shield-token",
        "Expected shield protocol receipt to preserve capability mode.",
      );
      assert(
        protocolSettlement.parsed?.proofReceipt?.assetId === "USDC",
        "Expected routed shield proof receipt to bind target shield asset.",
      );
      assert(
        protocolSettlement.parsed?.protocolSettlementReceipt?.routeProvider === "jupiter",
        "Expected shield protocol receipt to preserve route evidence provider.",
      );
    }
  }

  const committedShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      economicsCommitment: "0xcommitted_shield_economics",
      economicsMode: "committed-economics",
      nullifierOrReplayCommitment: "0xcommitted_shield_replay",
      outputCommitment: "0xcommitted_shield_output",
      ownerCommitment: "0xcommitted_shield_owner",
      routeCommitment: "0xcommitted_shield_route",
      settlementCommitment: "0xcommitted_shield_settlement",
      settlementId: "protocol-committed-shield-settlement",
    }),
    method: "POST",
  });
  assert(
    committedShieldSettlement.ok,
    committedShieldSettlement.text || "Expected committed shield protocol settlement.",
  );
  assert(
    committedShieldSettlement.parsed?.proofReceipt?.intent === "shield",
    "Expected committed Shield proof receipt intent.",
  );
  assert(
    committedShieldSettlement.parsed?.protocolSettlementReceipt?.economicsMode ===
      "committed-economics",
    "Expected committed shield receipt to preserve economics mode.",
  );
  assert(
    !("amount" in committedShieldSettlement.parsed.protocolSettlementReceipt) &&
      !("asset" in committedShieldSettlement.parsed.protocolSettlementReceipt) &&
      !("destination" in committedShieldSettlement.parsed.protocolSettlementReceipt) &&
      !("owner" in committedShieldSettlement.parsed.protocolSettlementReceipt),
    "Expected committed shield receipt to redact raw settlement fields.",
  );
  assert(
    typeof committedShieldSettlement.parsed?.protocolSettlementReceipt?.shieldReceiptBindingHash ===
      "string" &&
      committedShieldSettlement.parsed.protocolSettlementReceipt.shieldReceiptBindingHash.startsWith("0x"),
    "Expected committed Shield receipt to preserve a binding hash.",
  );

  const committedShieldOutput = {
    assetId: hiddenEconomicsAssetId,
    commitment: "0xcommitted_shield_output",
    leafIndex: 0,
    merkleRoot: hashLeaf({
      assetId: hiddenEconomicsAssetId,
      commitment: "0xcommitted_shield_output",
      leafIndex: 0,
      treeId: treeIdForAsset(hiddenEconomicsAssetId),
    }),
    treeId: treeIdForAsset(hiddenEconomicsAssetId),
  };

  const committedUnshieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "unshield",
      economicsCommitment: "0xcommitted_unshield_economics",
      economicsMode: "committed-economics",
      exitTermsCommitment: "0xcommitted_unshield_exit_terms",
      inputCommitment: committedShieldOutput.commitment,
      inputRoot: committedShieldOutput.merkleRoot,
      nullifierOrReplayCommitment: "0xcommitted_unshield_replay",
      ownerCommitment: "0xcommitted_unshield_owner",
      routeCommitment: "0xcommitted_unshield_route",
      settlementCommitment: "0xcommitted_unshield_settlement",
      settlementId: "protocol-committed-unshield-settlement",
      unshieldContextTag: "0xcommitted_unshield_context",
      unshieldPublicInputHash: "0xcommitted_unshield_public_input_hash",
    }),
    method: "POST",
  });
  assert(
    committedUnshieldSettlement.ok,
    committedUnshieldSettlement.text || "Expected committed unshield protocol settlement.",
  );
  assert(
    committedUnshieldSettlement.parsed?.proofReceipt?.intent === "unshield",
    "Expected committed unshield proof receipt intent.",
  );
  assert(
    committedUnshieldSettlement.parsed?.protocolSettlementReceipt?.economicsMode ===
      "committed-economics",
    "Expected committed unshield receipt to preserve economics mode.",
  );
  assert(
    committedUnshieldSettlement.parsed?.protocolSettlementReceipt?.exitTermsCommitment ===
      "0xcommitted_unshield_exit_terms",
    "Expected committed unshield receipt to preserve exit terms commitment.",
  );
  assert(
    !("amount" in committedUnshieldSettlement.parsed.protocolSettlementReceipt) &&
      !("asset" in committedUnshieldSettlement.parsed.protocolSettlementReceipt) &&
      !("destination" in committedUnshieldSettlement.parsed.protocolSettlementReceipt) &&
      !("owner" in committedUnshieldSettlement.parsed.protocolSettlementReceipt),
    "Expected committed unshield receipt to redact raw settlement fields.",
  );
	  for (const rawField of ["amount", "asset", "destination", "owner"]) {
	    const rejectedCommittedUnshield = await requestJson("/private-pool-v2/protocol-settlements", {
	      body: JSON.stringify({
	        action: "unshield",
	        economicsCommitment: `0xraw_rejected_unshield_economics_${rawField}`,
	        economicsMode: "committed-economics",
	        exitTermsCommitment: `0xraw_rejected_unshield_exit_terms_${rawField}`,
	        inputCommitment: `0xraw_rejected_unshield_input_${rawField}`,
	        inputRoot: `0xraw_rejected_unshield_input_root_${rawField}`,
	        nullifierOrReplayCommitment: `0xraw_rejected_unshield_replay_${rawField}`,
	        ownerCommitment: `0xraw_rejected_unshield_owner_${rawField}`,
	        routeCommitment: `0xraw_rejected_unshield_route_${rawField}`,
	        settlementCommitment: `0xraw_rejected_unshield_settlement_${rawField}`,
	        settlementId: `protocol-committed-unshield-raw-${rawField}-rejected`,
	        unshieldContextTag: `0xraw_rejected_unshield_context_${rawField}`,
	        [rawField]: rawField === "amount" ? "7.00" : `raw-${rawField}`,
	      }),
	      method: "POST",
	    });
	    assert(!rejectedCommittedUnshield.ok, `Expected committed unshield raw ${rawField} rejection.`);
	    assert(
	      String(rejectedCommittedUnshield.parsed?.error ?? "").includes(
	        `rejects raw ${rawField}`,
	      ),
	      rejectedCommittedUnshield.text || `Expected committed unshield raw ${rawField} rejection.`,
	    );
	  }
	  const rejectedCommittedUnshieldReplay = await requestJson("/private-pool-v2/protocol-settlements", {
	    body: JSON.stringify({
	      action: "unshield",
	      economicsCommitment: "0xcommitted_unshield_replay_economics",
	      economicsMode: "committed-economics",
	      exitTermsCommitment: "0xcommitted_unshield_replay_exit_terms",
	      inputCommitment: "0xcommitted_unshield_replay_input",
	      inputRoot: "0xcommitted_unshield_replay_input_root",
	      nullifierOrReplayCommitment: "0xcommitted_unshield_replay",
	      ownerCommitment: "0xcommitted_unshield_replay_owner",
	      routeCommitment: "0xcommitted_unshield_replay_route",
	      settlementCommitment: "0xcommitted_unshield_replay_settlement",
	      settlementId: "protocol-committed-unshield-replay-rejected",
	      unshieldContextTag: "0xcommitted_unshield_replay_context",
	    }),
	    method: "POST",
	  });
	  assert(!rejectedCommittedUnshieldReplay.ok, "Expected committed unshield replay commitment reuse rejection.");
	  assert(
	    String(rejectedCommittedUnshieldReplay.parsed?.error ?? "").includes(
	      "Private-pool nullifier replay rejected",
	    ),
	    rejectedCommittedUnshieldReplay.text || "Expected committed unshield replay rejection.",
	  );
	  const missingRouteEvidenceShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "5.00",
      asset: "BONK",
      destination: "recipient-public-key",
      owner: "owner-public-key",
      settlementId: "protocol-shield-missing-route-evidence",
      shieldSettlementEvidence: {
        depositSignature: "deposit-sig-protocol-shield-missing-route",
        owner: "owner-public-key",
        stateSignature: "protocol-shield-missing-route-evidence",
        vaultOwner: "protocol-shield-vault-owner",
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
    }),
    method: "POST",
  });
  assert(
    !missingRouteEvidenceShieldSettlement.ok,
    "Expected routed shield settlement without route evidence to be rejected.",
  );
  assert(
    String(missingRouteEvidenceShieldSettlement.parsed?.error ?? "").includes("shieldRouteEvidence"),
    missingRouteEvidenceShieldSettlement.text || "Expected missing route evidence error.",
  );
  const repeatedProtocolShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "5.00",
      asset: "BONK",
      destination: "recipient-public-key",
      owner: "owner-public-key",
      settlementId: "protocol-shield-settlement",
      shieldSettlementEvidence: {
        depositSignature: "deposit-sig-protocol-shield-settlement",
        owner: "owner-public-key",
        stateSignature: "protocol-shield-settlement",
        vaultOwner: "protocol-shield-vault-owner",
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
        routeSignature: "route-sig-bonk-to-usdc",
        sourceAmount: "5.00",
        sourceAsset: "BONK",
        sourceMintAddress: "mint:bonk",
        targetAmount: "5.00",
        targetAsset: "USDC",
        targetMintAddress: "mint:usdc",
      },
    }),
    method: "POST",
  });
  assert(
    repeatedProtocolShieldSettlement.ok,
    repeatedProtocolShieldSettlement.text || "Expected repeated protocol settlement to be idempotent.",
  );
  assert(
    repeatedProtocolShieldSettlement.parsed?.protocolSettlementReceipt?.settlementId ===
      "protocol-shield-settlement",
    "Expected repeated protocol settlement to return the existing receipt.",
  );
  const conflictingProtocolShieldSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      amount: "6.00",
      asset: "BONK",
      destination: "recipient-public-key",
      owner: "owner-public-key",
      settlementId: "protocol-shield-settlement",
      shieldSettlementEvidence: {
        depositSignature: "deposit-sig-protocol-shield-settlement",
        owner: "owner-public-key",
        stateSignature: "protocol-shield-settlement",
        vaultOwner: "protocol-shield-vault-owner",
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
        routeSignature: "route-sig-bonk-to-usdc",
        sourceAmount: "5.00",
        sourceAsset: "BONK",
        sourceMintAddress: "mint:bonk",
        targetAmount: "5.00",
        targetAsset: "USDC",
        targetMintAddress: "mint:usdc",
      },
    }),
    method: "POST",
  });
  assert(
    !conflictingProtocolShieldSettlement.ok,
    "Expected conflicting protocol settlement replay to be rejected.",
  );
  assert(
    String(conflictingProtocolShieldSettlement.parsed?.error ?? "").includes("conflicts"),
    conflictingProtocolShieldSettlement.text || "Expected conflicting protocol settlement error.",
  );
  const protocolSettlementReceipts = await requestJson("/state/private-pool-v2-receipts");
	  assert(protocolSettlementReceipts.ok, protocolSettlementReceipts.text || "Expected protocol receipts.");
		  assert(protocolSettlementReceipts.parsed?.receiptCount >= 8, "Expected protocol proof receipts.");
		  assert(
		    protocolSettlementReceipts.parsed?.protocolSettlementCount >= 6,
		    "Expected operator-owned protocol settlement receipts.",
		  );
  const operatorStatusAfterProtocolSettlements = await requestJson("/state/private-pool-v2-status");
  assert(
    operatorStatusAfterProtocolSettlements.ok,
    operatorStatusAfterProtocolSettlements.text || "Expected Private Pool v2 operator status.",
  );
  assert(
    operatorStatusAfterProtocolSettlements.parsed?.anonymitySetReadiness?.version ===
      "vanta-private-pool-v2-anonymity-set-readiness-0.1",
    "Expected operator status to expose anonymity-set readiness.",
  );
  assert(
    operatorStatusAfterProtocolSettlements.parsed?.anonymitySetReadiness?.anonymitySetReadiness ===
      "blocked",
    "Expected operator status anonymity-set readiness to remain blocked.",
  );
  assert(
    operatorStatusAfterProtocolSettlements.parsed?.operatorEconomicsExposure?.hiddenEconomicsActions?.includes(
      "unshield",
    ),
    "Expected operator status to list committed Unshield as hidden-economics action.",
  );
  assert(
    !operatorStatusAfterProtocolSettlements.parsed?.operatorEconomicsExposure?.operatorStillSeesRawActions?.includes(
      "unshield",
    ),
    "Expected operator status to exclude committed Unshield from raw-visible protocol actions.",
  );
  assert(
    operatorStatusAfterProtocolSettlements.parsed?.operatorEconomicsExposure
      ?.legacyRawPaySettlementEndpointEnabled === false,
    "Expected operator status to expose disabled legacy raw Pay settlement endpoint.",
  );
  for (const rawPayAction of ["pay_checkout", "pay_withdrawal"]) {
    assert(
      !operatorStatusAfterProtocolSettlements.parsed?.operatorEconomicsExposure?.operatorStillSeesRawActions?.includes(
        rawPayAction,
      ),
      `Expected operator status to exclude ${rawPayAction} from raw-visible actions by default.`,
    );
  }
  console.log("private-pool-v2 http protocol settlements: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (stdout.trim()) {
    console.error(stdout.trim());
  }
  if (stderr.trim()) {
    console.error(stderr.trim());
  }
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  rmSync(tempRoot, { recursive: true, force: true });
}
