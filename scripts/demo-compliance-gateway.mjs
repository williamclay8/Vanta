#!/usr/bin/env node
/**
 * Vanta Compliance Gateway Demo (MVP v0.1)
 * Fully functional local runnable prototype.
 * End-to-end: create regulator request -> issue selective disclosure with proofs (amount threshold + jurisdiction) -> verify -> output receipt-like packet.
 * All local, no secrets, fail-closed claims.
 * Run: node scripts/demo-compliance-gateway.mjs
 */

import { createHash, randomBytes } from "node:crypto";
import { strict as assert } from "node:assert";

// Mock receipt (inspired by existing institutional test fixture)
const mockReceipt = {
  id: "rcpt_compliance_gateway_demo",
  paymentId: "pay_compliance_gateway_demo",
  amount: "150.00",
  asset: "USDC",
  status: "paid",
  invoiceReference: "INV-GATEWAY-001",
  auditDisclosureId: "aud_gateway_demo_123",
  privateRailReceiptId: "prail_gateway_demo",
  createdAt: new Date().toISOString(),
  // sensitive fields that must stay redacted
  customerEmail: "buyer@institution.example",
  customerPaymentEvidenceRef: "evidence_secret",
};

// Types (mirrors the TS module for demo independence)
const SCHEMA = "vanta-compliance-gateway-v0.1";
const CLAIM_BOUNDARY = "beta-selective-disclosure-not-production-private-or-regulator-approved";
const REAL_NOIR_ADAPTER = {
  adapterId: "vanta-selective-disclosure-noir-v0.1",
  circuitPath: "zk/noir/vanta_selective_disclosure",
  proofMode: "real-noir-adapter-interface-only",
  publicInputs: ["threshold", "expected_jurisdiction", "amount_commitment"],
  privateInputs: ["amount", "jurisdiction", "blinding"],
  verificationCommand: "npm run zk:selective-disclosure-circuit-check",
  claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
};

function hashCommitment(blinding, value, attrKind) {
  const h = createHash("sha256");
  h.update(blinding);
  h.update(Buffer.from(String(value), "utf8"));
  h.update(Buffer.from(attrKind, "utf8"));
  return h.digest("hex");
}

function generateBlinding() {
  return randomBytes(32);
}

function createProofEnvelope(attribute, commitment, openingData, publicInputs) {
  return {
    schemaVersion: "vanta-compliance-proof-envelope-v0.1",
    proofMode: "verifier-local-opening-stub-real-noir-pending",
    publicPacket: {
      schemaVersion: "vanta-compliance-public-proof-packet-v0.1",
      attributeKind: attribute.kind,
      commitment,
      publicInputs,
      verified: false,
    },
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
      adapter: REAL_NOIR_ADAPTER,
    },
  };
}

function createDisclosureRequest(receiptId, attributes, regulatorId = "regulator_demo_001") {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
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

function issueSelectiveDisclosure(receipt, request) {
  const proofs = [];

  for (const attr of request.requestedAttributes) {
    let proof;

    if (attr.kind === "amountAboveThreshold") {
      const amountStr = receipt.amount;
      const threshold = attr.threshold;
      const satisfies = parseFloat(amountStr) >= parseFloat(threshold);

      const blinding = generateBlinding();
      const commitment = hashCommitment(blinding, amountStr, attr.kind);

      const proofData = {
        commitment,
        blinding: blinding.toString("hex"),
        value: amountStr,
      };
      const publicInputs = {
        predicate: `amount >= ${threshold} ${attr.asset}`,
        result: satisfies,
        disclosedValue: satisfies ? `>= ${threshold}` : amountStr,
      };

      proof = {
        attribute: attr,
        proofEnvelope: createProofEnvelope(attr, commitment, proofData, publicInputs),
        publicInputs,
        verified: false,
      };
    } else if (attr.kind === "jurisdictionMatch") {
      const blinding = generateBlinding();
      const jurisdictionValue = "US"; // from private KYC-like data
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
      throw new Error(`Unsupported attribute: ${attr.kind}`);
    }

    proofs.push(proof);
  }

  return {
    schemaVersion: SCHEMA,
    requestId: request.id,
    receiptRef: request.receiptRef,
    selectiveProofs: proofs,
    scope: request.scope,
    claimBoundary: CLAIM_BOUNDARY,
    realNoirAdapter: REAL_NOIR_ADAPTER,
    verificationCommands: [
      "npm run compliance:gateway-check",
      "npm run pay:institutional-disclosure-receipt-check",
    ],
  };
}

function verifySelectiveDisclosure(disclosure, request, receiptAmountCheck) {
  const errors = [];
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
      const proofData = JSON.parse(Buffer.from(p.proofEnvelope.verifierLocalOpeningStub.encodedOpening, "hex").toString("utf8"));
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
        if (receiptAmountCheck && value !== receiptAmountCheck) {
          errors.push("Cross-check amount mismatch with receipt");
        }
      } else if (p.attribute.kind === "jurisdictionMatch") {
        predicateHolds = value === p.attribute.jurisdiction;
      }

      const verified = predicateHolds && recomputed === commitment;
      if (verified) verifiedCount++;

      const publicInputs = { ...p.publicInputs, result: predicateHolds };

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
      errors.push(`Proof error for ${p.attribute.kind}: ${e.message}`);
      return { ...p, verified: false };
    }
  });

  const valid = errors.length === 0 && verifiedCount === disclosure.selectiveProofs.length;

  return {
    valid,
    proofsVerified: verifiedCount,
    errors,
    updatedDisclosure: { ...disclosure, selectiveProofs: updatedProofs },
  };
}

// === DEMO EXECUTION ===
console.log("=== Vanta Compliance Gateway Demo (Product 1 MVP) ===");
console.log("Fully functional local prototype. No secrets, fail-closed.\n");

const attributes = [
  { kind: "amountAboveThreshold", threshold: "100", asset: "USDC" },
  { kind: "jurisdictionMatch", jurisdiction: "US" },
];

const request = createDisclosureRequest(mockReceipt.id, attributes);
console.log("1. Regulator Request created:");
console.log(JSON.stringify(request, null, 2));

const disclosure = issueSelectiveDisclosure(mockReceipt, request);
console.log("\n2. Selective Disclosure issued (with proofs):");
console.log("   Request ID:", disclosure.requestId);
console.log("   Proofs count:", disclosure.selectiveProofs.length);
console.log("   Proof envelope mode:", disclosure.selectiveProofs[0].proofEnvelope.proofMode);
disclosure.selectiveProofs.forEach((p, i) => {
  console.log(`   Proof ${i + 1}: ${p.attribute.kind} -> predicate: ${p.publicInputs.predicate}, result: ${p.publicInputs.result}`);
});

const verification = verifySelectiveDisclosure(disclosure, request, mockReceipt.amount);
console.log("\n3. Verification result:");
console.log("   Valid:", verification.valid);
console.log("   Proofs verified:", verification.proofsVerified);
if (verification.errors.length > 0) {
  console.log("   Errors:", verification.errors);
} else {
  console.log("   No errors. Predicates hold, commitments open correctly.");
}

console.log("\n4. Final Gateway Disclosure Packet (redacted, claim-controlled):");
const finalPacket = verification.updatedDisclosure;
console.log(JSON.stringify({
  schemaVersion: finalPacket.schemaVersion,
  requestId: finalPacket.requestId,
  receiptRef: finalPacket.receiptRef,
  scope: finalPacket.scope,
  claimBoundary: finalPacket.claimBoundary,
  proofMode: "public-packet-redacted-verifier-local-opening-stub-held-out",
  proofMaterialPubliclyDisclosed: false,
  privateInputsDisclosed: false,
  realNoirAdapter: finalPacket.realNoirAdapter,
  selectiveProofs: finalPacket.selectiveProofs.map(p => p.proofEnvelope.publicPacket),
  verificationCommands: finalPacket.verificationCommands,
}, null, 2));

// Safety assertions (TDD style - these must pass for functional MVP)
assert.equal(verification.valid, true, "Verification must pass");
assert.equal(verification.proofsVerified, 2, "Both proofs must verify");
assert.ok(!JSON.stringify(finalPacket).includes(mockReceipt.customerEmail), "Customer email must not leak");
assert.ok(!JSON.stringify(finalPacket).includes(mockReceipt.customerPaymentEvidenceRef), "Evidence must not leak");
assert.equal(finalPacket.claimBoundary, CLAIM_BOUNDARY);
assert.equal(finalPacket.selectiveProofs[0].proofEnvelope.verifierLocalOpeningStub.redactedFromPublicPacket, true);
assert.ok(finalPacket.verificationCommands.includes("npm run compliance:gateway-check"));

console.log("\n=== DEMO COMPLETE: SUCCESS (functional end-to-end MVP) ===");
console.log("All predicates verified, no leaks, claims fail-closed.");
console.log("Ready for integration with Pay receipts and on-chain verifier format.");
console.log("Next: Wire as `npm run compliance:gateway-check` and update vault.");
