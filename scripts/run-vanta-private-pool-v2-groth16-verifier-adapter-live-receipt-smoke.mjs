import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ed25519 } from "@noble/curves/ed25519.js";
import { Keypair } from "@solana/web3.js";

import {
  GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
  GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256,
} from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";
import { formatUnshieldIntentMessage } from "../operator/unshield-auth.mjs";
import { formatSolUnshieldIntentMessage } from "../operator/sol-unshield-auth.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const productionServicesManifestPath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-services.manifest.json",
);
const adapterEvidencePath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-groth16-verifier-adapter-artifact.evidence.json",
);
const manifestPath = resolve(
  repoRoot,
  GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
  "manifest.json",
);
const liveSmokeEvidencePath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json",
);

const writeEvidence = process.argv.includes("--write-evidence");
const laneArg = process.argv.find((arg) => arg.startsWith("--lane="));
const lanes = laneArg ? laneArg.slice("--lane=".length).split(",") : ["all"];
const runSol = lanes.includes("all") || lanes.includes("sol");
const runToken = lanes.includes("all") || lanes.includes("token");

const NATIVE_SOL_ASSET_ID_HEX =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const MAINNET_USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const forbiddenEvidenceFragments = ["Bearer ", "privateKey", "seedPhrase", "mnemonic", "secretKey"];

function fail(message) {
  console.error(
    `Vanta Private Pool v2 Groth16 verifier adapter live receipt smoke: FAIL - ${message}`,
  );
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readJson(path) {
  return readFileSync(path, "utf8");
}

function parseJson(path) {
  return JSON.parse(readJson(path));
}

function productionOperatorUrl() {
  const manifest = parseJson(productionServicesManifestPath);
  const operator = manifest.services?.find((service) => service.id === "operator");
  const url = operator?.deployedService?.url?.trim();
  assert(typeof url === "string" && url.length > 0, "Missing production operator URL in services manifest.");
  return url.replace(/\/+$/, "");
}

function resolveOperatorUrl() {
  const override = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim();
  const url = override || productionOperatorUrl();
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    fail("Operator URL must be a valid HTTP(S) URL.");
  }

  assert(["http:", "https:"].includes(parsed.protocol), "Operator URL must use HTTP(S).");
  assert(!parsed.username && !parsed.password, "Operator URL must not include credentials.");
  return url.replace(/\/+$/, "");
}

function expectedReceiptTruth() {
  const adapterEvidence = parseJson(adapterEvidencePath);
  const manifest = parseJson(manifestPath);

  assert(
    adapterEvidence.version === "vanta-private-pool-v2-groth16-verifier-adapter-artifact-evidence-0.1",
    "Groth16 adapter evidence version mismatch.",
  );
  assert(
    adapterEvidence.artifactRoot === GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
    "Groth16 adapter evidence artifactRoot mismatch.",
  );
  assert(
    adapterEvidence.expectedArtifactSha256.publicWitness ===
      GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.publicWitness,
    "Groth16 adapter evidence public witness sha256 mismatch.",
  );

  return {
    artifactRoot: adapterEvidence.artifactRoot,
    gnarkProofSha256: adapterEvidence.expectedArtifactSha256.proof,
    gnarkProofSource: "groth16-verifier-adapter-artifact",
    gnarkPublicWitnessSha256: adapterEvidence.expectedArtifactSha256.publicWitness,
    groth16VerifierAdapterStatus: manifest.status,
    programRelayBindingSource: "groth16-verifier-adapter-artifact",
    releaseModel: "program-tag-unshield-pda-cpi-fail-closed",
  };
}

function signPayload(formatMessage, payload, keypair) {
  const message = new TextEncoder().encode(formatMessage(payload));
  const signatureBytes = ed25519.sign(message, keypair.secretKey.slice(0, 32));
  return {
    ...payload,
    signature: Buffer.from(signatureBytes).toString("base64"),
  };
}

function buildSignedSolUnshieldBody() {
  const keypair = Keypair.generate();
  const owner = keypair.publicKey.toBase58();
  const requestId = `groth16-live-receipt-smoke-sol-${randomUUID()}`;
  const consumedNoteId = `note-${randomUUID()}`;
  const transitionNoteId = `direct:${consumedNoteId}`;

  return {
    body: signPayload(formatSolUnshieldIntentMessage, {
      amount: "1",
      asset: "SOL",
      assetId: NATIVE_SOL_ASSET_ID_HEX,
      consumedNoteId,
      destinationOwner: owner,
      issuedAt: Date.now(),
      owner,
      requestId,
      requester: owner,
      transitionNoteId,
      vaultOwner: owner,
      version: "v1",
    }, keypair),
    requestId,
  };
}

function buildSignedTokenUnshieldBody(vaultOwner) {
  const keypair = Keypair.generate();
  const owner = keypair.publicKey.toBase58();
  const requestId = `groth16-live-receipt-smoke-token-${randomUUID()}`;
  const noteId = `note-${randomUUID()}`;
  const transitionNoteId = `direct:${noteId}`;

  return {
    body: signPayload(formatUnshieldIntentMessage, {
      amount: "1",
      destinationOwner: owner,
      issuedAt: Date.now(),
      mintAddress: MAINNET_USDC_MINT_ADDRESS,
      noteId,
      owner,
      requestId,
      requester: owner,
      transitionNoteId,
      vaultOwner,
      version: "v1",
    }, keypair),
    requestId,
  };
}

async function resolveMainnetVaultOwner(operatorUrl) {
  const configured = process.env.VANTA_MAINNET_VAULT_OWNER?.trim();
  if (configured) {
    return configured;
  }

  const authToken = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN?.trim();
  if (authToken) {
    const response = await fetch(`${operatorUrl}/state/private-pool-v2-status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(response.ok, `Authenticated operator status failed with HTTP ${response.status}.`);
    const parsed = await response.json();
    const vaultOwner = parsed?.tagUnshieldProgramRelay?.mainnetVaultOwnerPublicKey;
    assert(
      typeof vaultOwner === "string" && vaultOwner.length > 0,
      "Operator status must expose tagUnshieldProgramRelay.mainnetVaultOwnerPublicKey for token lane when VANTA_MAINNET_VAULT_OWNER is unset.",
    );
    return vaultOwner;
  }

  fail(
    "Token lane requires VANTA_MAINNET_VAULT_OWNER or VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN for authenticated operator status lookup.",
  );
}

async function postJson(operatorUrl, path, body) {
  const response = await fetch(`${operatorUrl}${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const text = await response.text();
  let parsed = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  return {
    parsed,
    status: response.status,
    text,
  };
}

function assertLiveReceipt({ endpoint, expected, parsed, requestId, status }) {
  assert(status === 503, `${endpoint} expected fail-closed 503, got HTTP ${status}.`);
  assert(parsed && typeof parsed === "object", `${endpoint} live unshield response must be JSON.`);
  assert(parsed.blocked === true, `${endpoint} live unshield response must remain blocked.`);
  assert(parsed.releaseModel === expected.releaseModel, `${endpoint} live releaseModel mismatch.`);
  assert(
    parsed.programRelayBindingSource === expected.programRelayBindingSource,
    `${endpoint} live programRelayBindingSource mismatch: ${parsed.programRelayBindingSource ?? "null"}`,
  );

  const receipt = parsed.releaseReceipt;
  assert(receipt && typeof receipt === "object", `${endpoint} live response must include releaseReceipt.`);
  assert(
    receipt.groth16VerifierAdapterStatus === expected.groth16VerifierAdapterStatus,
    `${endpoint} live groth16VerifierAdapterStatus mismatch: ${receipt.groth16VerifierAdapterStatus ?? "null"}`,
  );
  assert(
    receipt.groth16VerifierAdapterArtifactRoot === expected.artifactRoot,
    `${endpoint} live groth16VerifierAdapterArtifactRoot mismatch: ${receipt.groth16VerifierAdapterArtifactRoot ?? "null"}`,
  );
  assert(
    receipt.gnarkProofSource === expected.gnarkProofSource,
    `${endpoint} live gnarkProofSource mismatch: ${receipt.gnarkProofSource ?? "null"}`,
  );
  assert(
    receipt.gnarkProofSha256 === expected.gnarkProofSha256,
    `${endpoint} live gnarkProofSha256 mismatch: ${receipt.gnarkProofSha256 ?? "null"}`,
  );
  assert(
    receipt.gnarkPublicWitnessSha256 === expected.gnarkPublicWitnessSha256,
    `${endpoint} live gnarkPublicWitnessSha256 mismatch: ${receipt.gnarkPublicWitnessSha256 ?? "null"}`,
  );
  assert(receipt.gnarkUsesScaffoldProof === false, `${endpoint} live gnarkUsesScaffoldProof must be false.`);
  assert(
    parsed.requestId === requestId,
    `${endpoint} live response requestId must echo the signed intent requestId.`,
  );
}

async function assertOperatorStatusSurfacing(operatorUrl, expected) {
  const authToken = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN?.trim();
  if (!authToken) {
    return null;
  }

  const response = await fetch(`${operatorUrl}/state/private-pool-v2-status`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert(response.ok, `Authenticated operator status failed with HTTP ${response.status}.`);
  const parsed = await response.json();
  const relay = parsed?.tagUnshieldProgramRelay;
  assert(relay && typeof relay === "object", "Operator status must expose tagUnshieldProgramRelay.");
  assert(
    relay.releaseModel === expected.releaseModel,
    "Operator status tagUnshieldProgramRelay.releaseModel mismatch.",
  );
  assert(relay.productionReady === false, "Operator status tagUnshieldProgramRelay.productionReady must be false.");

  const adapter = relay.groth16VerifierAdapter;
  assert(adapter && typeof adapter === "object", "Operator status must expose groth16VerifierAdapter.");
  assert(
    adapter.gnarkProofSha256 === expected.gnarkProofSha256,
    "Operator status groth16VerifierAdapter.gnarkProofSha256 mismatch.",
  );
  assert(
    adapter.relayBindings?.gnarkProofSource === expected.gnarkProofSource,
    "Operator status relayBindings.gnarkProofSource mismatch.",
  );
  assert(
    adapter.relayBindings?.gnarkUsesScaffoldProof === false,
    "Operator status relayBindings.gnarkUsesScaffoldProof must be false.",
  );

  return {
    groth16VerifierAdapterStatus: adapter.status,
    mainnetVaultOwnerPublicKey: relay.mainnetVaultOwnerPublicKey ?? null,
  };
}

async function runLane({ endpoint, operatorUrl, postBodyBuilder, expected }) {
  const { body, requestId } = await postBodyBuilder();
  const result = await postJson(operatorUrl, endpoint, body);
  assertLiveReceipt({
    endpoint,
    expected,
    parsed: result.parsed,
    requestId,
    status: result.status,
  });

  return {
    endpoint,
    expectedReceiptFields: {
      gnarkProofSha256: expected.gnarkProofSha256,
      gnarkProofSource: expected.gnarkProofSource,
      gnarkPublicWitnessSha256: expected.gnarkPublicWitnessSha256,
      groth16VerifierAdapterArtifactRoot: expected.artifactRoot,
      groth16VerifierAdapterStatus: expected.groth16VerifierAdapterStatus,
      gnarkUsesScaffoldProof: false,
      programRelayBindingSource: expected.programRelayBindingSource,
      releaseModel: expected.releaseModel,
    },
    httpStatus: result.status,
    requestIdPrefix: requestId.slice(0, 32),
    status: "live-fail-closed-receipt-smoke-pass-not-production",
  };
}

async function run() {
  const operatorUrl = resolveOperatorUrl();
  const expected = expectedReceiptTruth();
  const laneResults = [];

  const health = await fetch(`${operatorUrl}/health`);
  assert(health.ok, `Operator health check failed with HTTP ${health.status}.`);

  const operatorStatus = await assertOperatorStatusSurfacing(operatorUrl, expected);

  if (runSol) {
    laneResults.push(
      await runLane({
        endpoint: "/unshield/sol",
        expected,
        operatorUrl,
        postBodyBuilder: async () => buildSignedSolUnshieldBody(),
      }),
    );
  }

  if (runToken) {
    const vaultOwner = await resolveMainnetVaultOwner(operatorUrl);
    laneResults.push(
      await runLane({
        endpoint: "/unshield",
        expected,
        operatorUrl,
        postBodyBuilder: async () => buildSignedTokenUnshieldBody(vaultOwner),
      }),
    );
  }

  assert(laneResults.length > 0, "No smoke lanes selected. Use --lane=sol, --lane=token, or --lane=all.");

  const evidence = {
    checkedAt: new Date().toISOString(),
    lanes: laneResults,
    operatorStatusSurfacing: operatorStatus
      ? {
          checked: true,
          groth16VerifierAdapterStatus: operatorStatus.groth16VerifierAdapterStatus,
          mainnetVaultOwnerPublicKeyConfigured: Boolean(operatorStatus.mainnetVaultOwnerPublicKey),
          path: "/state/private-pool-v2-status",
        }
      : {
          checked: false,
          reason:
            "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN unset; operator status surfacing was not authenticated on this run.",
          path: "/state/private-pool-v2-status",
        },
    operatorUrlHost: new URL(operatorUrl).host,
    operatorUrlRef: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim()
      ? "VANTA_PRIVATE_POOL_V2_OPERATOR_URL"
      : "ops/mainnet/private-pool-v2-services.manifest.json#operator",
    productionReady: false,
    purpose:
      "Live fail-closed unshield receipt smoke proving deployed operator surfaces Groth16 adapter relay truth instead of scaffold gnark bytes.",
    secretPolicy: "hashes-and-status-only-no-wallet-signatures-or-auth-tokens",
    truthBoundary:
      "This smoke only proves deployed blocked unshield receipts expose in-repo local-unsafe Groth16 adapter relay bindings. It is not production verifier-adapter acceptance, SBF/live lineage, audit closure, or fund release.",
    version: "vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke-evidence-0.2",
  };

  const serializedEvidence = `${JSON.stringify(evidence, null, 2)}\n`;
  for (const forbidden of forbiddenEvidenceFragments) {
    assert(!serializedEvidence.includes(forbidden), `Live smoke evidence leaked ${forbidden}.`);
  }

  console.log(serializedEvidence);
  if (writeEvidence) {
    writeFileSync(liveSmokeEvidencePath, serializedEvidence);
    console.error(
      "Vanta Private Pool v2 Groth16 verifier adapter live receipt smoke evidence: WROTE ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json",
    );
  }
  console.error("Vanta Private Pool v2 Groth16 verifier adapter live receipt smoke: PASS");
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
