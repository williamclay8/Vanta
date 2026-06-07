import { createHash, randomBytes } from "node:crypto";
import type { VantaPayReceipt, VantaPayAsset } from "../pay/vantaPayTypes.ts";

// Types for the Compliance Gateway (MVP v0.1)
export const VANTA_COMPLIANCE_GATEWAY_SCHEMA_VERSION = "vanta-compliance-gateway-v0.1" as const;
export const VANTA_COMPLIANCE_GATEWAY_CLAIM_BOUNDARY =
  "beta-selective-disclosure-not-production-private-or-regulator-approved" as const;
export const VANTA_COMPLIANCE_GATEWAY_REAL_NOIR_ADAPTER = {
  adapterId: "vanta-selective-disclosure-noir-v0.1",
  circuitPath: "zk/noir/vanta_selective_disclosure",
  proofMode: "real-noir-adapter-interface-only",
  publicInputs: ["threshold", "expected_jurisdiction", "amount_commitment"],
  privateInputs: ["amount", "jurisdiction", "blinding"],
  verificationCommand: "npm run zk:selective-disclosure-circuit-check",
  claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
} as const;

export type VantaSelectiveDisclosureAttribute =
  | { kind: "amountAboveThreshold"; threshold: string; asset: VantaPayAsset }
  | { kind: "jurisdictionMatch"; jurisdiction: string };

export type VantaCompliancePublicProofPacket = {
  schemaVersion: "vanta-compliance-public-proof-packet-v0.1";
  attributeKind: VantaSelectiveDisclosureAttribute["kind"];
  commitment: string;
  publicInputs: {
    predicate: string;
    result: boolean;
    disclosedValue?: string;
  };
  verified: boolean;
};

export type VantaComplianceVerifierLocalOpeningStub = {
  schemaVersion: "vanta-compliance-verifier-local-opening-stub-v0.1";
  encodedOpening: string;
  disclosedToVerifierOnly: true;
  containsPrivateOpeningMaterial: true;
  redactedFromPublicPacket: true;
};

export type VantaComplianceRealNoirProofEnvelope = {
  status: "pending-real-noir-proof-generation";
  proofBytes: null;
  adapter: typeof VANTA_COMPLIANCE_GATEWAY_REAL_NOIR_ADAPTER;
};

export type VantaComplianceProofEnvelope = {
  schemaVersion: "vanta-compliance-proof-envelope-v0.1";
  proofMode: "verifier-local-opening-stub-real-noir-pending";
  publicPacket: VantaCompliancePublicProofPacket;
  verifierLocalOpeningStub: VantaComplianceVerifierLocalOpeningStub;
  realNoirProof: VantaComplianceRealNoirProofEnvelope;
};

export type VantaSelectiveDisclosureProof = {
  attribute: VantaSelectiveDisclosureAttribute;
  proofEnvelope: VantaComplianceProofEnvelope;
  publicInputs: {
    predicate: string; // e.g. "amount >= 100 USDC"
    result: boolean;
    disclosedValue?: string; // for the attribute fact
  };
  verified: boolean;
};

export type VantaComplianceDisclosureRequest = {
  schemaVersion: "vanta-compliance-disclosure-request-v0.1";
  id: string;
  receiptRef: string;
  requestedAttributes: VantaSelectiveDisclosureAttribute[];
  scope: {
    expiresAt: string;
    regulatorId: string;
    basis: "time-and-scope-limited";
  };
  purpose: string;
};

export type VantaComplianceGatewayDisclosure = {
  // Extends / composes with existing institutional receipt
  schemaVersion: typeof VANTA_COMPLIANCE_GATEWAY_SCHEMA_VERSION;
  requestId: string;
  receiptRef: string;
  selectiveProofs: VantaSelectiveDisclosureProof[];
  scope: VantaComplianceDisclosureRequest["scope"];
  claimBoundary: typeof VANTA_COMPLIANCE_GATEWAY_CLAIM_BOUNDARY;
  realNoirAdapter: typeof VANTA_COMPLIANCE_GATEWAY_REAL_NOIR_ADAPTER;
  verificationCommands: string[];
};

function hashCommitment(blinding: Buffer, value: string, attrKind: string): string {
  const h = createHash("sha256");
  h.update(blinding);
  h.update(Buffer.from(value, "utf8"));
  h.update(Buffer.from(attrKind, "utf8"));
  return h.digest("hex");
}

function generateBlinding(): Buffer {
  return randomBytes(32);
}

function createProofEnvelope(
  attribute: VantaSelectiveDisclosureAttribute,
  commitment: string,
  openingData: { commitment: string; blinding: string; value: string },
  publicInputs: VantaSelectiveDisclosureProof["publicInputs"]
): VantaComplianceProofEnvelope {
  const publicPacket: VantaCompliancePublicProofPacket = {
    schemaVersion: "vanta-compliance-public-proof-packet-v0.1",
    attributeKind: attribute.kind,
    commitment,
    publicInputs,
    verified: false,
  };

  return {
    schemaVersion: "vanta-compliance-proof-envelope-v0.1",
    proofMode: "verifier-local-opening-stub-real-noir-pending",
    publicPacket,
    verifierLocalOpeningStub: {
      schemaVersion: "vanta-compliance-verifier-local-opening-stub-v0.1",
      encodedOpening: Buffer.from(JSON.stringify(openingData)).toString("hex"),
      disclosedToVerifierOnly: true,
      containsPrivateOpeningMaterial: true,
      redactedFromPublicPacket: true,
    },
    realNoirProof: {
      status: "pending-real-noir-proof-generation",
      proofBytes: null,
      adapter: VANTA_COMPLIANCE_GATEWAY_REAL_NOIR_ADAPTER,
    },
  };
}

export function createDisclosureRequest(
  receiptId: string,
  attributes: VantaSelectiveDisclosureAttribute[],
  regulatorId = "regulator_demo_001"
): VantaComplianceDisclosureRequest {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return {
    schemaVersion: "vanta-compliance-disclosure-request-v0.1",
    id: `req_${randomBytes(8).toString("hex")}`,
    receiptRef: receiptId,
    requestedAttributes: attributes,
    scope: {
      expiresAt: expires.toISOString(),
      regulatorId,
      basis: "time-and-scope-limited",
    },
    purpose: "regulator attribute verification for institutional settlement",
  };
}

export function issueSelectiveDisclosure(
  receipt: VantaPayReceipt,
  request: VantaComplianceDisclosureRequest
): VantaComplianceGatewayDisclosure {
  const proofs: VantaSelectiveDisclosureProof[] = [];

  for (const attr of request.requestedAttributes) {
    let proof: VantaSelectiveDisclosureProof;

    if (attr.kind === "amountAboveThreshold") {
      const amountStr = receipt.amount; // e.g. "42.00"
      const threshold = attr.threshold;
      const satisfies = parseFloat(amountStr) >= parseFloat(threshold);

      const blinding = generateBlinding();
      const commitment = hashCommitment(blinding, amountStr, attr.kind);

      // Proof is the opening (for MVP verifiable commitment + predicate)
      const proofData = {
        commitment,
        blinding: blinding.toString("hex"),
        value: amountStr, // opened for verifier in this MVP; future ZK hides
      };
      const publicInputs = {
        predicate: `amount >= ${threshold} ${attr.asset}`,
        result: satisfies,
        disclosedValue: satisfies ? `>= ${threshold}` : amountStr, // selective: disclose fact
      };

      proof = {
        attribute: attr,
        proofEnvelope: createProofEnvelope(attr, commitment, proofData, publicInputs),
        publicInputs,
        verified: false, // set by verifier
      };
    } else if (attr.kind === "jurisdictionMatch") {
      // MVP: always "matches" for demo; real would use KYC credential proof
      const blinding = generateBlinding();
      const jurisdictionValue = "US"; // mock from private data
      const commitment = hashCommitment(blinding, jurisdictionValue, attr.kind);

      const proofData = {
        commitment,
        blinding: blinding.toString("hex"),
        value: jurisdictionValue,
      };
      const publicInputs = {
        predicate: `jurisdiction == ${attr.jurisdiction}`,
        result: jurisdictionValue === attr.jurisdiction,
        disclosedValue: attr.jurisdiction,
      };

      proof = {
        attribute: attr,
        proofEnvelope: createProofEnvelope(attr, commitment, proofData, publicInputs),
        publicInputs,
        verified: false,
      };
    } else {
      throw new Error(`Unsupported attribute kind`);
    }

    proofs.push(proof);
  }

  return {
    schemaVersion: VANTA_COMPLIANCE_GATEWAY_SCHEMA_VERSION,
    requestId: request.id,
    receiptRef: request.receiptRef,
    selectiveProofs: proofs,
    scope: request.scope,
    claimBoundary: VANTA_COMPLIANCE_GATEWAY_CLAIM_BOUNDARY,
    realNoirAdapter: VANTA_COMPLIANCE_GATEWAY_REAL_NOIR_ADAPTER,
    verificationCommands: [
      "npm run compliance:gateway-check",
      "npm run pay:institutional-disclosure-receipt-check",
    ],
  };
}

export function verifySelectiveDisclosure(
  disclosure: VantaComplianceGatewayDisclosure,
  request: VantaComplianceDisclosureRequest,
  receiptAmountForVerification?: string // optional cross-check
): { valid: boolean; proofsVerified: number; errors: string[]; updatedDisclosure: VantaComplianceGatewayDisclosure } {
  const errors: string[] = [];
  let verifiedCount = 0;

  const now = new Date();
  if (new Date(disclosure.scope.expiresAt) < now) {
    errors.push("Disclosure scope expired");
  }

  if (disclosure.requestId !== request.id) {
    errors.push("Request ID mismatch");
  }

  const updatedProofs = disclosure.selectiveProofs.map((p) => {
    try {
      const openingStub = p.proofEnvelope.verifierLocalOpeningStub;
      const proofData = JSON.parse(Buffer.from(openingStub.encodedOpening, "hex").toString("utf8"));
      const { commitment, blinding: blindingHex, value } = proofData;
      const blinding = Buffer.from(blindingHex, "hex");

      const recomputed = hashCommitment(blinding, value, p.attribute.kind);

      if (recomputed !== commitment) {
        errors.push(`Commitment mismatch for ${p.attribute.kind}`);
        return { ...p, verified: false };
      }

      let predicateHolds = false;
      if (p.attribute.kind === "amountAboveThreshold") {
        const threshold = p.attribute.threshold;
        predicateHolds = parseFloat(value) >= parseFloat(threshold);
        if (receiptAmountForVerification && value !== receiptAmountForVerification) {
          errors.push("Amount does not match receipt for verification");
        }
      } else if (p.attribute.kind === "jurisdictionMatch") {
        predicateHolds = value === p.attribute.jurisdiction;
      }

      const verified = predicateHolds && recomputed === commitment;
      if (verified) verifiedCount++;

      const publicInputs = {
        ...p.publicInputs,
        result: predicateHolds,
      };

      return {
        ...p,
        publicInputs,
        proofEnvelope: {
          ...p.proofEnvelope,
          publicPacket: {
            ...p.proofEnvelope.publicPacket,
            publicInputs,
            verified,
          },
        },
        verified,
      };
    } catch (e) {
      errors.push(`Proof parse/verify error for ${p.attribute.kind}: ${e}`);
      return { ...p, verified: false };
    }
  });

  const valid = errors.length === 0 && verifiedCount === disclosure.selectiveProofs.length;

  const updatedDisclosure: VantaComplianceGatewayDisclosure = {
    ...disclosure,
    selectiveProofs: updatedProofs,
  };

  return { valid, proofsVerified: verifiedCount, errors, updatedDisclosure };
}

export function toPublicGatewayDisclosurePacket(disclosure: VantaComplianceGatewayDisclosure) {
  return {
    schemaVersion: "vanta-compliance-gateway-public-packet-v0.1" as const,
    requestId: disclosure.requestId,
    receiptRef: disclosure.receiptRef,
    scope: disclosure.scope,
    claimBoundary: disclosure.claimBoundary,
    proofMode: "public-packet-redacted-verifier-local-opening-stub-held-out" as const,
    proofMaterialPubliclyDisclosed: false as const,
    privateInputsDisclosed: false as const,
    witnessDisclosed: false as const,
    realNoirAdapter: disclosure.realNoirAdapter,
    selectiveProofs: disclosure.selectiveProofs.map((p) => p.proofEnvelope.publicPacket),
    verificationCommands: disclosure.verificationCommands,
  };
}

// Helper to attach to existing institutional flow (additive, non-breaking)
export function attachGatewayProofsToReceipt(
  baseReceipt: any,
  gatewayDisclosure: VantaComplianceGatewayDisclosure
) {
  return {
    ...baseReceipt,
    selectiveGatewayProofs: gatewayDisclosure.selectiveProofs.map((p) => ({
      attribute: p.attribute,
      predicateResult: p.publicInputs.result,
      verified: p.verified,
      proofMode: p.proofEnvelope.proofMode,
    })),
    complianceGatewayRef: gatewayDisclosure.requestId,
    complianceGatewayClaimBoundary: gatewayDisclosure.claimBoundary,
    complianceGatewayPublicPacket: toPublicGatewayDisclosurePacket(gatewayDisclosure),
  };
}
