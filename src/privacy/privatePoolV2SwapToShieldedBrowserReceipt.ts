import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { CompiledCircuit } from "@noir-lang/noir_js";

import {
  createVantaPrivatePoolV2SwapToShieldedCircuitFixture,
  createVantaPrivatePoolV2SwapToShieldedCircuitNoirInputs,
  type VantaPrivatePoolV2SwapToShieldedCircuitFixture,
} from "./privatePoolV2SwapToShieldedCircuitFixture";
import {
  createVantaPrivatePoolV2LocalBbFixtureProver,
  VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND,
} from "./privatePoolV2LocalProver";
import { VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID } from "./privatePoolV2ProofRequests";
import type {
  VantaPrivatePoolV2ProofResult,
  VantaPrivatePoolV2SwapToShieldedProofArtifact,
} from "./privatePoolV2Types";
import type {
  VantaPrivatePoolV2ProofReceipt,
  VantaProtocolSettlementResponse,
} from "./privatePoolV2ProtocolSettlementClient";
import type {
  LiveSwapCanonicalRecord,
  LiveSwapCommittedSettlementTerms,
} from "@/zk/liveSwapBridge";

export const VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_RECEIPT_VERSION =
  "vanta-private-pool-v2-swap-to-shielded-browser-receipt-0.1" as const;

export const VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_CIRCUIT_ASSET_URL =
  "/proofs/private-pool-v2/vanta_private_pool_v2_swap_to_shielded_entry.json" as const;

const SWAP_TO_SHIELDED_CIRCUIT = "vanta_private_pool_v2_swap_to_shielded_entry" as const;
const SWAP_TO_SHIELDED_LOCAL_PROOF_RUNTIME_VERSION = "^4.1.3" as const;
const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

type SwapToShieldedCompiledCircuitAsset = {
  abi: CompiledCircuit["abi"];
  bytecode: string;
};

export type VantaPrivatePoolV2SwapToShieldedBrowserProofRequestContext = {
  canonicalSettlementBindingHash: string;
  canonicalTermsCommitmentHash: string;
  fixture: VantaPrivatePoolV2SwapToShieldedCircuitFixture;
  recordId: string;
  settlementId: string;
  swapPublicInputHash: string;
  version: typeof VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_RECEIPT_VERSION;
};

export type VantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceipt = {
  canonicalSettlementBindingHash: string;
  canonicalTermsCommitmentHash: string;
  proofReceipt: VantaPrivatePoolV2ProofReceipt;
  protocolSettlementResponse: VantaProtocolSettlementResponse;
  recordId: string;
  settlementId: string;
  version: typeof VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_RECEIPT_VERSION;
};

export type VantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceiptArgs = {
  canonicalRecord: LiveSwapCanonicalRecord;
  circuitAssetUrl?: string;
  committedSettlementTerms: LiveSwapCommittedSettlementTerms;
};

export type VantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceiptResult = {
  browserLocalProofReceipt: VantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceipt;
  protocolSettlementResponse: VantaProtocolSettlementResponse;
};

function hashHex(...parts: readonly unknown[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(JSON.stringify(parts))),
  )}`;
}

export function fieldFromParts(...parts: readonly unknown[]) {
  return (BigInt(hashHex("field", ...parts)) % BN254_SCALAR_FIELD).toString(10);
}

function assertNoWitnessMaterial(value: unknown, label = "Swap-to-shielded browser-local receipt") {
  const forbiddenFragments = [
    "owner_secret",
    "privateInputs",
    "private_inputs",
    "Prover.toml",
    "witness",
    "witnessInput",
    "sourceArtifacts",
  ];

  function visit(node: unknown, path: readonly string[] = []) {
    if (node === null || node === undefined) {
      return;
    }

    if (typeof node === "string") {
      for (const fragment of forbiddenFragments) {
        if (node.includes(fragment)) {
          throw new Error(`${label} exposes forbidden no-witness value ${fragment}.`);
        }
      }
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...path, String(index)]));
      return;
    }

    for (const [key, entry] of Object.entries(node)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/gu, "");
      if (
        normalizedKey.includes("witness") ||
        normalizedKey.includes("ownersecret") ||
        normalizedKey.includes("privateinput") ||
        normalizedKey.includes("sourceartifact")
      ) {
        throw new Error(`${label} exposes forbidden no-witness field ${[...path, key].join(".")}.`);
      }
      visit(entry, [...path, key]);
    }
  }

  visit(value);
}

async function loadSwapToShieldedCircuitAsset(
  circuitAssetUrl: string,
): Promise<SwapToShieldedCompiledCircuitAsset> {
  const response = await fetch(circuitAssetUrl);
  if (!response.ok) {
    throw new Error("Swap-to-shielded browser-local receipt could not load the public circuit asset.");
  }

  const asset = (await response.json()) as Partial<SwapToShieldedCompiledCircuitAsset>;
  if (!asset || typeof asset.bytecode !== "string" || !asset.abi) {
    throw new Error("Swap-to-shielded browser-local receipt circuit asset is malformed.");
  }

  return {
    abi: asset.abi as CompiledCircuit["abi"],
    bytecode: asset.bytecode,
  };
}

export function createVantaPrivatePoolV2SwapToShieldedBrowserProofRequestContext({
  canonicalRecord,
  committedSettlementTerms,
}: {
  canonicalRecord: LiveSwapCanonicalRecord;
  committedSettlementTerms: LiveSwapCommittedSettlementTerms;
}): VantaPrivatePoolV2SwapToShieldedBrowserProofRequestContext {
  const fixture = createVantaPrivatePoolV2SwapToShieldedCircuitFixture();
  const canonicalTermsCommitmentHash = hashHex(
    "canonicalTermsCommitmentHash",
    canonicalRecord.recordId,
    committedSettlementTerms,
  );
  const canonicalSettlementBindingHash = hashHex(
    "canonicalSettlementBindingHash",
    canonicalRecord.recordId,
    committedSettlementTerms.settlementId,
    committedSettlementTerms.settlementCommitment,
    committedSettlementTerms.swapPublicInputHash,
    fieldFromParts("swap-public-input", committedSettlementTerms.swapPublicInputHash),
  );

  return {
    canonicalSettlementBindingHash,
    canonicalTermsCommitmentHash,
    fixture,
    recordId: canonicalRecord.recordId,
    settlementId: committedSettlementTerms.settlementId,
    swapPublicInputHash: fixture.swapPublicInputHash.toString(10),
    version: VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_RECEIPT_VERSION,
  };
}

export function createVantaPrivatePoolV2SwapToShieldedBrowserWorkerArtifactProducer({
  circuitAssetUrl = VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_CIRCUIT_ASSET_URL,
}: {
  circuitAssetUrl?: string;
} = {}) {
  return async ({
    fixture,
  }: {
    fixture: VantaPrivatePoolV2SwapToShieldedCircuitFixture;
  }): Promise<VantaPrivatePoolV2SwapToShieldedProofArtifact> => {
    const circuitAsset = await loadSwapToShieldedCircuitAsset(circuitAssetUrl);
    const { createVantaPrivatePoolV2BrowserProverClient } = await import(
      "./privatePoolV2BrowserProverClient"
    );
    const proofArtifact =
      await createVantaPrivatePoolV2BrowserProverClient().proveSwapToShielded({
        circuit: SWAP_TO_SHIELDED_CIRCUIT,
        compiledProgramAbi: circuitAsset.abi,
        compiledProgramBytecode: circuitAsset.bytecode,
        expectedPublicInputHash: fixture.swapPublicInputHash.toString(10),
        proofRuntimeVersion: SWAP_TO_SHIELDED_LOCAL_PROOF_RUNTIME_VERSION,
        target: "swap-to-shielded",
        witnessInput: createVantaPrivatePoolV2SwapToShieldedCircuitNoirInputs(fixture),
      });

    if (proofArtifact.proofSystem !== "noir-bb") {
      throw new Error("Swap-to-shielded browser-local receipt rejects non-noir-bb proof evidence.");
    }
    if (proofArtifact.proofBackend !== VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND) {
      throw new Error(
        "Swap-to-shielded browser-local receipt rejects proof evidence that is not local-bb-derived-artifact.",
      );
    }
    if (proofArtifact.publicInputs[0] !== fixture.swapPublicInputHash.toString(10)) {
      throw new Error("Swap-to-shielded browser-local receipt proof artifact public input mismatch.");
    }

    assertNoWitnessMaterial(proofArtifact, "Swap-to-shielded browser proof artifact");
    return proofArtifact;
  };
}

function createProofReceipt({
  committedSettlementTerms,
  proofResult,
  recordId,
}: {
  committedSettlementTerms: LiveSwapCommittedSettlementTerms;
  proofResult: VantaPrivatePoolV2ProofResult;
  recordId: string;
}): VantaPrivatePoolV2ProofReceipt {
  if (proofResult.proofSystem !== "noir-bb") {
    throw new Error("Swap-to-shielded browser-local receipt rejects non-noir-bb proof result.");
  }
  if (proofResult.proofBackend !== VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND) {
    throw new Error(
      "Swap-to-shielded browser-local receipt rejects proof result that is not local-bb-derived-artifact.",
    );
  }

  return {
    assetId: VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    intent: "swap-to-shielded",
    proofBackend: proofResult.proofBackend,
    proofSystem: proofResult.proofSystem,
    publicInputCommitment: proofResult.publicInputCommitment,
    receiptId: hashHex("swap-browser-local-proof-receipt", recordId, proofResult.publicInputCommitment),
    recordedAtSlot: committedSettlementTerms.validUntilSlot,
    replayKey: `swap-to-shielded:${committedSettlementTerms.nullifierOrReplayCommitment}`,
  };
}

function createProtocolSettlementResponse({
  committedSettlementTerms,
  proofReceipt,
}: {
  committedSettlementTerms: LiveSwapCommittedSettlementTerms;
  proofReceipt: VantaPrivatePoolV2ProofReceipt;
}): VantaProtocolSettlementResponse {
  return {
    kind: "protocol_settlement",
    proofReceipt,
    protocolSettlementReceipt: {
      action: "swap",
      economicsCommitment: committedSettlementTerms.economicsCommitment,
      economicsMode: "committed-economics",
      id: hashHex("swap-browser-local-protocol-settlement", committedSettlementTerms.settlementId),
      object: "protocol_settlement_receipt",
      proofReceiptId: `ppv2_${proofReceipt.receiptId.slice(2, 26)}`,
      proofReceiptPublicInputCommitment: proofReceipt.publicInputCommitment,
      settlementCommitment: committedSettlementTerms.settlementCommitment,
      settlementId: committedSettlementTerms.settlementId,
      status: "confirmed",
    },
  };
}

export async function createVantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceipt({
  canonicalRecord,
  circuitAssetUrl,
  committedSettlementTerms,
}: VantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceiptArgs): Promise<VantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceiptResult> {
  const context = createVantaPrivatePoolV2SwapToShieldedBrowserProofRequestContext({
    canonicalRecord,
    committedSettlementTerms,
  });
  const proofArtifact =
    await createVantaPrivatePoolV2SwapToShieldedBrowserWorkerArtifactProducer({
      circuitAssetUrl,
    })({ fixture: context.fixture });
  const proofResult = await createVantaPrivatePoolV2LocalBbFixtureProver({
    fixtureProofRequest: context.fixture.proofRequest,
    proofArtifact,
    target: "swap-to-shielded",
  }).prove(context.fixture.proofRequest);
  const proofReceipt = createProofReceipt({
    committedSettlementTerms,
    proofResult,
    recordId: canonicalRecord.recordId,
  });
  const protocolSettlementResponse = createProtocolSettlementResponse({
    committedSettlementTerms,
    proofReceipt,
  });
  const browserLocalProofReceipt = {
    canonicalSettlementBindingHash: context.canonicalSettlementBindingHash,
    canonicalTermsCommitmentHash: context.canonicalTermsCommitmentHash,
    proofReceipt,
    protocolSettlementResponse,
    recordId: canonicalRecord.recordId,
    settlementId: committedSettlementTerms.settlementId,
    version: VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_RECEIPT_VERSION,
  };

  assertNoWitnessMaterial(browserLocalProofReceipt, "Swap-to-shielded browser-local persisted proof receipt");
  return {
    browserLocalProofReceipt,
    protocolSettlementResponse,
  };
}
