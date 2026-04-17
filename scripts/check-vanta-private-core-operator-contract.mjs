import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function printStatus(message) {
  console.log(message);
}

function randomPort() {
  return 9400 + Math.floor(Math.random() * 200);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/state/private-core-contract`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until server is listening.
    }

    await sleep(250);
  }

  throw new Error("operator server did not become ready in time");
}

async function requestJson(baseUrl, path, options = {}) {
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

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-contract-http-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn("node", ["operator/unshield-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    VANTA_UNSHIELD_OPERATOR_PORT: String(port),
    VANTA_DEVNET_TOKEN_MINT:
      process.env.VANTA_DEVNET_TOKEN_MINT ??
      "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
    VANTA_DEVNET_VAULT_OWNER:
      process.env.VANTA_DEVNET_VAULT_OWNER ??
      "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
    VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, "consumes.json"),
    VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, "proofs.json"),
    VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, "send-proofs.json"),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "swaps.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
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
  await waitForHealth(baseUrl);

  const contractState = await requestJson(baseUrl, "/state/private-core-contract", { method: "GET" });
  if (
    !contractState.ok ||
    contractState.parsed?.stateVersion !== 1 ||
    contractState.parsed?.contractVersion !== 19 ||
    contractState.parsed?.summaryVersion !== 43 ||
    contractState.parsed?.supportedSendLaneVersion !== 1 ||
    contractState.parsed?.supportedSendV1Decision !== "accepted-narrow-v1-path" ||
    typeof contractState.parsed?.supportedSendV1DecisionNote !== "string" ||
    contractState.parsed?.supportedUnshieldLaneVersion !== 1 ||
    contractState.parsed?.supportedUnshieldLaneKind !== "single-note-proof-backed-consume" ||
    contractState.parsed?.supportedUnshieldLaneStatus !== "supported" ||
    contractState.parsed?.supportedUnshieldV1Decision !== "accepted-narrow-v1-path" ||
    typeof contractState.parsed?.supportedUnshieldV1DecisionNote !== "string" ||
    contractState.parsed?.supportedReleaseLaneVersion !== 1 ||
    contractState.parsed?.supportedReleaseLaneKind !==
      "proof-backed-consume-latest-registered-root" ||
    contractState.parsed?.supportedReleaseLaneStatus !== "supported" ||
    contractState.parsed?.supportedSwapLaneVersion !== 1 ||
    contractState.parsed?.supportedSwapLaneKind !== "single-input-vusd-to-shielded-sol" ||
    contractState.parsed?.supportedSwapLaneStatus !== "supported" ||
    typeof contractState.parsed?.supportedSwapLaneNote !== "string" ||
    contractState.parsed?.supportedSwapV1Decision !== "accepted-narrow-v1-path" ||
    typeof contractState.parsed?.supportedSwapV1DecisionNote !== "string" ||
    contractState.parsed?.supportedSwapV1Role !==
      "adjacent-supported-not-required-for-finish-line" ||
    typeof contractState.parsed?.supportedSwapV1RoleNote !== "string" ||
    contractState.parsed?.supportedSwapVenue !== "meteora-dlmm-devnet" ||
    contractState.parsed?.supportedSwapOutputModel !== "shielded-sol-output-note" ||
    contractState.parsed?.supportedSwapResultingRootBasis !== "client-declared" ||
    contractState.parsed?.supportedSwapInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    contractState.parsed?.supportedSwapOutputRegistrationPolicy !==
      "resulting-root-must-register-as-swap-output" ||
    contractState.parsed?.supportedFlowVersion !== 1 ||
    contractState.parsed?.supportedShippingDecisionVersion !== 1 ||
    contractState.parsed?.supportedShippingDecisionKind !==
      "narrow-private-core-zk-v1-shipping" ||
    typeof contractState.parsed?.supportedShippingDecisionNote !== "string" ||
    contractState.parsed?.supportedOperatorStatusVersion !== 1 ||
    contractState.parsed?.supportedOperatorStatusKind !== "long-form-live-status" ||
    typeof contractState.parsed?.supportedOperatorStatusNote !== "string" ||
    contractState.parsed?.supportedOperatorStatusGateVersion !== 1 ||
    contractState.parsed?.supportedOperatorStatusGateKind !==
      "ready-gated-long-form-live-status" ||
    typeof contractState.parsed?.supportedOperatorStatusGateNote !== "string" ||
    contractState.parsed?.supportedOperatorStatusTransport !== "dedicated-endpoint" ||
    contractState.parsed?.supportedOperatorStatusEndpoint !== "/state/private-core-status" ||
    contractState.parsed?.supportedOperatorSnapshotVersion !== 1 ||
    contractState.parsed?.supportedOperatorSnapshotKind !== "contract-status-shipping-bundle" ||
    typeof contractState.parsed?.supportedOperatorSnapshotNote !== "string" ||
    contractState.parsed?.supportedOperatorSnapshotTransport !== "dedicated-endpoint" ||
    contractState.parsed?.supportedOperatorSnapshotEndpoint !== "/state/private-core-snapshot" ||
    contractState.parsed?.supportedShippingArtifactVersion !== 1 ||
    contractState.parsed?.supportedShippingArtifactKind !==
      "shipping-decision-checked-snapshot-bundle" ||
    typeof contractState.parsed?.supportedShippingArtifactNote !== "string" ||
    contractState.parsed?.supportedShippingArtifactTransport !== "dedicated-endpoint" ||
    contractState.parsed?.supportedShippingArtifactEndpoint !==
      "/state/private-core-shipping-artifact" ||
    contractState.parsed?.supportedZkV1ScopeDecision !==
      "accepted-narrow-private-core-v1-scope" ||
    typeof contractState.parsed?.supportedZkV1ScopeNote !== "string" ||
    contractState.parsed?.supportedZkV1RequiredLanes !== "send|unshield|release" ||
    typeof contractState.parsed?.supportedZkV1RequiredLanesNote !== "string" ||
    contractState.parsed?.supportedAssetSymbol !== "VUSD" ||
    contractState.parsed?.supportedEnvironment !== "solana-devnet" ||
    contractState.parsed?.supportedNoteSchema !== "note-v0" ||
    contractState.parsed?.supportedNoteVersion !== 0 ||
    contractState.parsed?.supportedRootRegistrationProvenance !==
      "shield-input|send-recipient-output|send-change-output|swap-output" ||
    contractState.parsed?.supportedSendResultingRootBasis !== "client-declared" ||
    contractState.parsed?.supportedSendInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    contractState.parsed?.supportedSendOutputRegistrationPolicy !==
      "resulting-root-must-register-as-recipient-or-change-output" ||
    contractState.parsed?.supportedRecipientModel !== "hashed-reference-to-owner-key" ||
    contractState.parsed?.supportedProofSystem !== "noir-acir-ultrahonk-bbjs" ||
    contractState.parsed?.supportedUnshieldCircuit !== "vanta_private_core_single_note_unshield" ||
    contractState.parsed?.supportedSendCircuit !== "vanta_private_core_single_note_send" ||
    contractState.parsed?.supportedUnshieldMerkleDepth !== 3 ||
    contractState.parsed?.supportedSendMerkleDepth !== 3 ||
    contractState.parsed?.supportedReleaseV1Decision !== "accepted-narrow-v1-path" ||
    typeof contractState.parsed?.supportedReleaseV1DecisionNote !== "string" ||
    contractState.parsed?.supportedReleaseRootPolicy !== "latest-registered-root" ||
    contractState.parsed?.supportedReleaseExecutionModel !== "operator-recorded-devnet-release" ||
    contractState.parsed?.supportedReleaseAtomicityModel !==
      "operator-local-atomic-consume-and-release-record" ||
    contractState.parsed?.supportedReleasePersistenceModel !== "json-store-v1" ||
    contractState.parsed?.ownerAuthorizationDecision !== "accepted-v1-off-circuit-precheck" ||
    typeof contractState.parsed?.ownerAuthorizationDecisionNote !== "string" ||
    contractState.parsed?.sourceArtifactTruthBasis !== "source-layer-artifact-bundle" ||
    contractState.parsed?.provingArtifactTruthBasis !== "verified-proving-public-input-vector" ||
    contractState.parsed?.sourceProvingRelationship !== "explicit-split-no-implicit-equality" ||
    contractState.parsed?.nullifierKeyDecision !== "accepted-v1-temporary-note-secret-key" ||
    typeof contractState.parsed?.nullifierKeyDecisionNote !== "string"
  ) {
    throw new Error(contractState.text || "operator contract endpoint returned invalid data");
  }
  printStatus("operator contract endpoint: PASS");

  const summaryState = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  const mirroredContractFields = [
    "summaryVersion",
    "supportedSendLaneVersion",
    "supportedSendLaneKind",
    "supportedSendLaneStatus",
    "supportedSendLaneNote",
    "supportedSendV1Decision",
    "supportedSendV1DecisionNote",
    "supportedUnshieldLaneVersion",
    "supportedUnshieldLaneKind",
    "supportedUnshieldLaneStatus",
    "supportedUnshieldLaneNote",
    "supportedUnshieldV1Decision",
    "supportedUnshieldV1DecisionNote",
    "supportedReleaseLaneVersion",
    "supportedReleaseLaneKind",
    "supportedReleaseLaneStatus",
    "supportedReleaseLaneNote",
    "supportedReleaseV1Decision",
    "supportedReleaseV1DecisionNote",
    "supportedSwapLaneVersion",
    "supportedSwapLaneKind",
    "supportedSwapLaneStatus",
    "supportedSwapLaneNote",
    "supportedSwapV1Decision",
    "supportedSwapV1DecisionNote",
    "supportedSwapV1Role",
    "supportedSwapV1RoleNote",
    "supportedSwapVenue",
    "supportedSwapOutputModel",
    "supportedSwapResultingRootBasis",
    "supportedSwapInputRootPolicy",
    "supportedSwapOutputRegistrationPolicy",
    "supportedFlowVersion",
    "supportedFlowKind",
    "supportedFlowStatus",
    "supportedFlowNote",
    "supportedShippingDecisionVersion",
    "supportedShippingDecisionKind",
    "supportedShippingDecisionNote",
    "supportedOperatorStatusVersion",
    "supportedOperatorStatusKind",
    "supportedOperatorStatusNote",
    "supportedOperatorStatusGateVersion",
    "supportedOperatorStatusGateKind",
    "supportedOperatorStatusGateNote",
    "supportedOperatorStatusTransport",
    "supportedOperatorStatusEndpoint",
    "supportedOperatorSnapshotVersion",
    "supportedOperatorSnapshotKind",
    "supportedOperatorSnapshotNote",
    "supportedOperatorSnapshotTransport",
    "supportedOperatorSnapshotEndpoint",
    "supportedShippingArtifactVersion",
    "supportedShippingArtifactKind",
    "supportedShippingArtifactNote",
    "supportedShippingArtifactTransport",
    "supportedShippingArtifactEndpoint",
    "supportedZkV1ScopeDecision",
    "supportedZkV1ScopeNote",
    "supportedZkV1RequiredLanes",
    "supportedZkV1RequiredLanesNote",
    "supportedAssetSymbol",
    "supportedEnvironment",
    "supportedNoteSchema",
    "supportedNoteVersion",
    "supportedRootRegistrationProvenance",
    "supportedSendResultingRootBasis",
    "supportedSendInputRootPolicy",
    "supportedSendOutputRegistrationPolicy",
    "supportedRecipientModel",
    "supportedReleaseDestinationModel",
    "supportedProofSystem",
    "supportedUnshieldCircuit",
    "supportedSendCircuit",
    "supportedUnshieldMerkleDepth",
    "supportedSendMerkleDepth",
    "supportedReleaseAuthorizationBasis",
    "supportedReleaseRootPolicy",
    "supportedReleaseExecutionModel",
    "supportedReleaseAtomicityModel",
    "supportedReleasePersistenceModel",
    "ownerAuthorizationMode",
    "ownerAuthorizationDecision",
    "ownerAuthorizationDecisionNote",
    "sourceArtifactTruthBasis",
    "provingArtifactTruthBasis",
    "sourceProvingRelationship",
    "nullifierKeyMode",
    "nullifierKeyDecision",
    "nullifierKeyDecisionNote",
    "provingHashLane",
  ];
  const mismatchedMirroredFields = !summaryState.ok
    ? ["summary fetch failed"]
    : mirroredContractFields.filter(
        (field) => summaryState.parsed?.[field] !== contractState.parsed?.[field],
      );
  if (mismatchedMirroredFields.length > 0) {
    throw new Error(
      `operator summary did not mirror contract fields: ${mismatchedMirroredFields.join(", ")}`,
    );
  }
  printStatus("operator contract summary mirror: PASS");

  const contractPreflight = await fetch(`${baseUrl}/state/private-core-contract`, {
    headers: {
      "Access-Control-Request-Method": "GET",
      Origin: "http://127.0.0.1:4173",
    },
    method: "OPTIONS",
  });
  if (
    !contractPreflight.ok ||
    !contractPreflight.headers.get("access-control-allow-methods")?.includes("GET")
  ) {
    throw new Error("operator contract preflight did not advertise GET access");
  }
  printStatus("operator contract preflight: PASS");

  const contractOutput = execFileSync("node", [
    "scripts/print-vanta-private-core-operator-contract.mjs",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (
    !contractOutput.includes("Contract state version: 1") ||
    !contractOutput.includes("Contract version: 19") ||
    !contractOutput.includes("Summary compatibility: 43") ||
    !contractOutput.includes("Supported note schema: NoteV0 / v0") ||
    !contractOutput.includes("Supported send lane version: 1") ||
    !contractOutput.includes("Supported unshield lane version: 1") ||
    !contractOutput.includes("Supported release lane version: 1") ||
    !contractOutput.includes("Supported swap lane version: 1") ||
    !contractOutput.includes("Supported shipping decision version: 1") ||
    !contractOutput.includes(
      "Supported shipping decision kind: narrow-private-core-zk-v1-shipping",
    ) ||
    !contractOutput.includes("Supported operator status version: 1") ||
    !contractOutput.includes("Supported operator status kind: long-form-live-status") ||
    !contractOutput.includes("Supported operator status gate version: 1") ||
    !contractOutput.includes(
      "Supported operator status gate kind: ready-gated-long-form-live-status",
    ) ||
    !contractOutput.includes("Supported operator status transport: dedicated-endpoint") ||
    !contractOutput.includes("Supported operator status endpoint: /state/private-core-status") ||
    !contractOutput.includes("Supported operator snapshot version: 1") ||
    !contractOutput.includes(
      "Supported operator snapshot kind: contract-status-shipping-bundle",
    ) ||
    !contractOutput.includes("Supported zk v1 required lanes: send|unshield|release") ||
    !contractOutput.includes("Supported proof system: Noir ACIR / UltraHonk / bb.js") ||
    !contractOutput.includes("Supported operator snapshot transport: dedicated-endpoint") ||
    !contractOutput.includes(
      "Supported operator snapshot endpoint: /state/private-core-snapshot",
    ) ||
    !contractOutput.includes("Supported shipping artifact version: 1") ||
    !contractOutput.includes(
      "Supported shipping artifact kind: shipping-decision-checked-snapshot-bundle",
    ) ||
    !contractOutput.includes(
      "Supported shipping artifact transport: dedicated-endpoint",
    ) ||
    !contractOutput.includes(
      "Supported shipping artifact endpoint: /state/private-core-shipping-artifact",
    )
  ) {
    throw new Error(contractOutput || "operator contract script did not reflect the contract state");
  }
  printStatus("operator contract CLI: PASS");

  const contractJsonOutput = execFileSync("npm", [
    "run",
    "--silent",
    "private-core:operator-contract-json",
    "--",
    "--base-url",
    baseUrl,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const contractJson = JSON.parse(contractJsonOutput);
  if (
    contractJson.operator !== baseUrl ||
    contractJson.stateVersion !== 1 ||
    contractJson.contractVersion !== 19 ||
    contractJson.summaryVersion !== 43 ||
    contractJson.supportedSendLaneVersion !== 1 ||
    contractJson.supportedUnshieldLaneVersion !== 1 ||
    contractJson.supportedReleaseLaneVersion !== 1 ||
    contractJson.supportedSwapLaneVersion !== 1 ||
    contractJson.supportedShippingDecisionVersion !== 1 ||
    contractJson.supportedShippingDecisionKind !== "narrow-private-core-zk-v1-shipping" ||
    contractJson.supportedShippingDecisionNote !==
      "Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane." ||
    contractJson.supportedOperatorStatusVersion !== 1 ||
    contractJson.supportedOperatorStatusKind !== "long-form-live-status" ||
    contractJson.supportedOperatorStatusNote !==
      "Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact." ||
    contractJson.supportedOperatorStatusGateVersion !== 1 ||
    contractJson.supportedOperatorStatusGateKind !== "ready-gated-long-form-live-status" ||
    contractJson.supportedOperatorStatusGateNote !==
      "Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane." ||
    contractJson.supportedOperatorStatusTransport !== "dedicated-endpoint" ||
    contractJson.supportedOperatorStatusEndpoint !== "/state/private-core-status" ||
    contractJson.supportedOperatorSnapshotVersion !== 1 ||
    contractJson.supportedOperatorSnapshotKind !== "contract-status-shipping-bundle" ||
    contractJson.supportedOperatorSnapshotNote !==
      "Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together." ||
    contractJson.supportedOperatorSnapshotTransport !== "dedicated-endpoint" ||
    contractJson.supportedOperatorSnapshotEndpoint !== "/state/private-core-snapshot" ||
    contractJson.supportedShippingArtifactVersion !== 1 ||
    contractJson.supportedShippingArtifactKind !==
      "shipping-decision-checked-snapshot-bundle" ||
    contractJson.supportedShippingArtifactNote !==
      "Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together." ||
    contractJson.supportedShippingArtifactTransport !== "dedicated-endpoint" ||
    contractJson.supportedShippingArtifactEndpoint !== "/state/private-core-shipping-artifact"
  ) {
    throw new Error(
      `Unexpected operator contract JSON output\n${JSON.stringify(contractJson, null, 2)}`,
    );
  }
  printStatus("operator contract json surface: PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (stdout.trim() || stderr.trim()) {
    console.error([stdout.trim(), stderr.trim()].filter(Boolean).join("\n"));
  }
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
  rmSync(tempRoot, { force: true, recursive: true });
}
