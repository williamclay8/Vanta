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
    contractState.parsed?.contractVersion !== 14 ||
    contractState.parsed?.summaryVersion !== 38 ||
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
    !contractOutput.includes("Contract version: 14") ||
    !contractOutput.includes("Summary compatibility: 38") ||
    !contractOutput.includes("Supported note schema: NoteV0 / v0") ||
    !contractOutput.includes("Supported send v1 decision: accepted-narrow-v1-path") ||
    !contractOutput.includes("Supported unshield v1 decision: accepted-narrow-v1-path") ||
    !contractOutput.includes(
      "Supported unshield lane kind: single-note-proof-backed-consume",
    ) ||
    !contractOutput.includes("Supported unshield lane status: supported") ||
    !contractOutput.includes(
      "Supported root provenance: Shield input / send recipient output / send change output / swap output",
    ) ||
    !contractOutput.includes("Supported send root basis: Client-declared") ||
    !contractOutput.includes("Supported release v1 decision: accepted-narrow-v1-path") ||
    !contractOutput.includes(
      "Supported release lane kind: proof-backed-consume-latest-registered-root",
    ) ||
    !contractOutput.includes("Supported release lane status: supported") ||
    !contractOutput.includes("Supported swap lane version: 1") ||
    !contractOutput.includes("Supported swap lane kind: single-input-vusd-to-shielded-sol") ||
    !contractOutput.includes("Supported swap lane status: supported") ||
    !contractOutput.includes("Supported swap v1 decision: accepted-narrow-v1-path") ||
    !contractOutput.includes(
      "Supported swap v1 role: adjacent-supported-not-required-for-finish-line",
    ) ||
    !contractOutput.includes(
      "Supported swap v1 role note: Current constrained swap lane is supported operator-backed infrastructure in the repo, but it is not required for the minimum zk v1 finish line.",
    ) ||
    !contractOutput.includes(
      "Supported zk v1 scope decision: accepted-narrow-private-core-v1-scope",
    ) ||
    !contractOutput.includes(
      "Supported zk v1 scope note: Current zk v1 finish line is the narrow private-core lane frozen in this repo, not the broader long-term privacy product surface.",
    ) ||
    !contractOutput.includes("Supported zk v1 required lanes: send|unshield|release") ||
    !contractOutput.includes(
      "Supported zk v1 required lanes note: Minimum zk v1 finish line requires the narrow private-core send, unshield, and release lanes; constrained swap remains adjacent supported infrastructure.",
    ) ||
    !contractOutput.includes("Supported swap venue: meteora-dlmm-devnet") ||
    !contractOutput.includes("Supported swap output model: shielded-sol-output-note") ||
    !contractOutput.includes("Supported swap root basis: Client-declared") ||
    !contractOutput.includes(
      "Supported swap input-root policy: Latest registered root with linked registration proof",
    ) ||
    !contractOutput.includes(
      "Supported swap output registration: Resulting root must register as swap output",
    ) ||
    !contractOutput.includes(
      "Supported send input-root policy: Latest registered root with linked registration proof",
    ) ||
    !contractOutput.includes(
      "Supported recipient model: hashed-reference-to-owner-key",
    ) ||
    !contractOutput.includes(
      "Supported release root policy: latest-registered-root",
    ) ||
    !contractOutput.includes(
      "Supported release execution: operator-recorded-devnet-release",
    ) ||
    !contractOutput.includes(
      "Supported release atomicity: operator-local-atomic-consume-and-release-record",
    ) ||
    !contractOutput.includes("Supported release persistence: json-store-v1") ||
    !contractOutput.includes(
      "Owner authorization decision: accepted-v1-off-circuit-precheck",
    ) ||
    !contractOutput.includes(
      "Nullifier key decision: accepted-v1-temporary-note-secret-key",
    ) ||
    !contractOutput.includes("Source artifact truth: source-layer-artifact-bundle") ||
    !contractOutput.includes(
      "Proving artifact truth: verified-proving-public-input-vector",
    ) ||
    !contractOutput.includes(
      "Source/proving relationship: explicit-split-no-implicit-equality",
    ) ||
    !contractOutput.includes(
      "Supported send output registration: Resulting root must register as recipient or change output",
    ) ||
    !contractOutput.includes("Supported proof system: Noir ACIR / UltraHonk / bb.js") ||
    !contractOutput.includes(
      "Supported unshield circuit: vanta_private_core_single_note_unshield @ depth 3",
    ) ||
    !contractOutput.includes(
      "Supported send circuit: vanta_private_core_single_note_send @ depth 3",
    )
  ) {
    throw new Error(contractOutput || "operator contract script did not reflect the contract state");
  }
  printStatus("operator contract CLI: PASS");
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
