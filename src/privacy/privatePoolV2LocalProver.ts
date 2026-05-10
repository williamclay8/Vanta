import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
  type VantaPrivatePoolV2ProofRequest,
  type VantaPrivatePoolV2ProofResult,
  type VantaPrivatePoolV2Prover,
  type VantaPrivatePoolV2Readiness,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME =
  "sha256-private-pool-v2-local-prover-0.1" as const;

export type VantaPrivatePoolV2LocalProverArgs = {
  enabled?: boolean;
  provingKeyId?: string;
};

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

function serializeProofRequest(request: VantaPrivatePoolV2ProofRequest) {
  const circuitPublicInputs = request.circuitPublicInputs ?? request.publicInputs;

  return JSON.stringify({
    amountBaseUnits: request.amountBaseUnits.toString(),
    assetId: request.assetId,
    circuitPublicInputs: [...circuitPublicInputs],
    intent: request.intent,
    publicInputs: [...request.publicInputs],
  });
}

export class VantaPrivatePoolV2LocalProver implements VantaPrivatePoolV2Prover {
  readonly scheme = VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME;

  #enabled: boolean;
  #provingKeyId: string;

  constructor({
    enabled = true,
    provingKeyId = `${VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION}:local-proving-key-0.1`,
  }: VantaPrivatePoolV2LocalProverArgs = {}) {
    this.#enabled = enabled;
    this.#provingKeyId = provingKeyId;
  }

  async prove(request: VantaPrivatePoolV2ProofRequest): Promise<VantaPrivatePoolV2ProofResult> {
    const readiness = this.readiness();

    if (!readiness.ready) {
      throw new Error(readiness.blockers.join(" "));
    }

    if (request.amountBaseUnits <= 0n) {
      throw new Error("Proof amount must be positive.");
    }

    if ((request.circuitPublicInputs ?? request.publicInputs).length === 0) {
      throw new Error("Proof request must bind at least one public input.");
    }

    const serializedRequest = serializeProofRequest(request);
    const publicInputCommitment = hashParts(this.scheme, "public-inputs", serializedRequest);
    const proofMaterial = hashParts(
      this.scheme,
      "proof",
      this.#provingKeyId,
      publicInputCommitment,
    );

    return {
      proofBytes: new TextEncoder().encode(proofMaterial),
      proofSystem: "mock",
      publicInputCommitment,
      verifyingKeyId: this.#provingKeyId.replace("proving", "verifying"),
    };
  }

  readiness(): VantaPrivatePoolV2Readiness {
    if (!this.#enabled) {
      return {
        blockers: ["Local Private Pool v2 prover is disabled."],
        ready: false,
        warnings: [],
      };
    }

    return {
      blockers: [],
      ready: true,
      warnings: [
        "Local Private Pool v2 prover is deterministic harness code, not a production ZK proof.",
      ],
    };
  }

  async verify({
    proof,
    request,
  }: {
    proof: VantaPrivatePoolV2ProofResult;
    request: VantaPrivatePoolV2ProofRequest;
  }) {
    const expected = await this.prove(request);
    return (
      proof.proofSystem === expected.proofSystem &&
      proof.publicInputCommitment === expected.publicInputCommitment &&
      proof.verifyingKeyId === expected.verifyingKeyId &&
      bytesToHex(proof.proofBytes) === bytesToHex(expected.proofBytes)
    );
  }
}

export function createVantaPrivatePoolV2LocalProver(args?: VantaPrivatePoolV2LocalProverArgs) {
  return new VantaPrivatePoolV2LocalProver(args);
}
