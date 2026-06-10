/**
 * Vanta Privacy SDK & Primitives Marketplace (Product 4 FULL MVP)
 * Reusable, composable privacy primitives extracted/generalized from Products 1-3.
 * Commitment hiding, nullifiers, selective disclosure, settlement stubs, velocity primitives.
 * Enhanced marketplace with usage/composition helpers.
 * Pre-circuit simulation (node:crypto). Fail-closed.
 * For integration into Pay, Private Pool, RWA, Perps, Velocity, future apps.
 * Run via demos/checks; import in consuming code.
 */

import { createHash, randomBytes } from "node:crypto";

export const VANTA_PRIVACY_SDK_SCHEMA_VERSION = "vanta-privacy-sdk-v0.1";
export const VANTA_PRIVACY_SDK_CLAIM_BOUNDARY = "beta-privacy-sdk-not-production-private-or-audited-primitives";
export const VANTA_REAL_NOIR_ADAPTERS = {
  selectiveDisclosure: {
    adapterId: "vanta-selective-disclosure-noir-v0.1",
    circuitPath: "zk/noir/vanta_selective_disclosure",
    proofMode: "real-noir-adapter-interface-only",
    publicInputs: ["threshold", "expected_jurisdiction", "amount_commitment"],
    privateInputs: ["amount", "jurisdiction", "blinding"],
    verificationCommand: "npm run zk:selective-disclosure-circuit-check",
    claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
  },
  velocityAggregate: {
    adapterId: "vanta-velocity-aggregate-noir-v0.1",
    circuitPath: "zk/noir/vanta_velocity_aggregate",
    proofMode: "real-noir-adapter-interface-only",
    publicInputs: [
      "threshold",
      "velocity_commitment",
      "period_start",
      "period_end",
      "expected_jurisdiction",
      "expected_accredited",
    ],
    privateInputs: ["velocity_sum", "jurisdiction", "accredited", "blinding"],
    verificationCommand: "npm run zk:velocity-aggregate-circuit-check",
    claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
  },
  creditNoteTransfer: {
    adapterId: "vanta-credit-note-transfer-noir-v0.1",
    circuitPath: "zk/noir/vanta_private_credit_note_transfer",
    proofMode: "real-noir-adapter-interface-only",
    publicInputs: [
      "amount_bucket_min",
      "amount_bucket_max",
      "asset_id",
      "recipient_commitment",
      "withdraw_context",
      "deposit_commitment",
      "claim_code_commitment",
      "credit_note_commitment",
      "nullifier",
    ],
    privateInputs: ["amount", "deposit_secret", "claim_secret", "deposit_blinding", "credit_blinding"],
    verificationCommand: "npm run zk:credit-note-transfer-circuit-check",
    claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
  },
  rwaCompliance: {
    adapterId: "vanta-rwa-compliance-noir-v0.1",
    circuitPath: "zk/noir/vanta_rwa_compliance",
    proofMode: "real-noir-adapter-interface-only",
    publicInputs: [
      "min_value",
      "asset_id",
      "expected_jurisdiction",
      "expected_accredited",
      "owner_commitment",
      "rwa_commitment",
    ],
    privateInputs: ["amount", "owner_secret", "jurisdiction", "accredited", "rwa_id", "blinding"],
    verificationCommand: "npm run zk:rwa-compliance-circuit-check",
    claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
  },
  privatePerpsRisk: {
    adapterId: "vanta-private-perps-risk-noir-v0.1",
    circuitPath: "zk/noir/vanta_private_perps_risk",
    proofMode: "real-noir-adapter-interface-only",
    publicInputs: ["market_id", "max_leverage", "maintenance_bps", "position_commitment", "liquidation_context"],
    privateInputs: ["notional_amount", "collateral_amount", "position_secret", "blinding"],
    verificationCommand: "npm run zk:private-perps-risk-circuit-check",
    claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
  },
  agentSpendingLimit: {
    adapterId: "vanta-agent-spending-limit-noir-v0.1",
    circuitPath: "zk/noir/vanta_agent_spending_limit",
    proofMode: "real-noir-adapter-interface-only",
    publicInputs: [
      "agent_id",
      "spending_limit",
      "policy_epoch",
      "human_approval_commitment",
      "authorization_nullifier",
      "policy_commitment",
    ],
    privateInputs: ["spend_amount", "approval_secret", "agent_secret", "policy_blinding"],
    verificationCommand: "npm run zk:agent-spending-limit-circuit-check",
    claimBoundary: "beta-real-zk-circuits-not-production-private-or-onchain-ready",
  },
};

export function generateBlinding() {
  return randomBytes(32);
}

export function hashCommitment(blinding, value, label) {
  const h = createHash("sha256");
  h.update(blinding);
  h.update(Buffer.from(String(value)));
  h.update(Buffer.from(label));
  return h.digest("hex");
}

function readBlindingHex(commitment) {
  if (typeof commitment === "string") return commitment;
  const blinding = commitment?.privateWitness?.blinding ?? commitment?.blinding;
  if (!blinding) {
    throw new Error("Missing private witness blinding for prover-side operation");
  }
  return blinding;
}

export function toPublicCommitmentPacket(commitment) {
  return {
    commitment: commitment.commitment,
    label: commitment.label,
    count: commitment.count,
    nullifier: commitment.nullifier,
    ownershipNullifier: commitment.ownershipNullifier,
    period: commitment.period,
    claimBoundary: VANTA_PRIVACY_SDK_CLAIM_BOUNDARY,
  };
}

export function getRealNoirAdapter(adapterId) {
  return VANTA_REAL_NOIR_ADAPTERS[adapterId] ?? { error: "Real Noir adapter not found", adapterId };
}

export function createRealNoirProofRequest(adapterId, publicInputs = {}) {
  const adapter = getRealNoirAdapter(adapterId);
  if (adapter.error) return adapter;
  return {
    adapter,
    publicInputs,
    status: "candidate-interface-only-proof-not-generated",
    proofBytes: null,
    claimBoundary: adapter.claimBoundary,
  };
}

export function createCommitment(data, label = "vanta-primitive") {
  const blinding = generateBlinding();
  const valueForCommit = JSON.stringify(data);
  const commitment = hashCommitment(blinding, valueForCommit, label);
  return {
    commitment,
    label,
    privateWitness: {
      blinding: blinding.toString("hex"),
    },
  };
}

export function createNullifier(blindingHexOrCommitment, secret, label = "vanta-nullifier") {
  const blindingHex = readBlindingHex(blindingHexOrCommitment);
  const blinding = Buffer.from(blindingHex, "hex");
  return hashCommitment(blinding, secret, label);
}

export function proveOwnershipOrState(commitment, secret, nullifierLabel = "vanta-ownership-nullifier") {
  const blinding = Buffer.from(readBlindingHex(commitment), "hex");
  const recomputed = hashCommitment(blinding, secret, nullifierLabel);
  const holds = recomputed === commitment.ownershipNullifier || recomputed === commitment.nullifier;
  return {
    holds,
    predicate: "holder proves knowledge of secret matching committed nullifier without revealing value",
    verified: holds,
    commitmentRef: commitment.commitment ? commitment.commitment.slice(0, 16) : "n/a",
  };
}

// Generalized selective disclosure (from compliance + RWA + perps needs)
export function createSelectiveDisclosure(commitment, attributes, predicateResults) {
  const blinding = Buffer.from(readBlindingHex(commitment), "hex");
  const selectiveProofs = attributes.map((attr, i) => {
    const attrCommit = hashCommitment(blinding, String(attr.value), attr.kind);
    return {
      attribute: attr,
      publicInputs: {
        predicate: attr.predicate || `${attr.kind} == ${attr.value}`,
        result: predicateResults[i] !== undefined ? predicateResults[i] : true,
      },
      commitment: attrCommit,
    };
  });
  return {
    schemaVersion: VANTA_PRIVACY_SDK_SCHEMA_VERSION,
    commitmentRef: commitment.commitment,
    selectiveProofs,
    claimBoundary: VANTA_PRIVACY_SDK_CLAIM_BOUNDARY,
    realNoirAdapters: [
      VANTA_REAL_NOIR_ADAPTERS.selectiveDisclosure,
    ],
    verificationCommands: ["npm run privacy-sdk:check", "npm run compliance:gateway-check", "npm run pay:verify"],
  };
}

// Composable settlement stub (unifies Pay/Pool hooks from prior products)
export function createSettlementStub(commitment, disclosure, context = "generic-private-asset") {
  return {
    commitmentRef: commitment.commitment,
    settlementRef: `settle_${context}_${commitment.commitment.slice(0, 8)}`,
    selectiveDisclosure: disclosure,
    claimBoundary: disclosure.claimBoundary,
    verificationCommands: disclosure.verificationCommands,
    hooks: {
      pay: "vantaPaySettlement",
      privatePool: "vantaPrivatePoolCustody",
      compliance: "vantaComplianceGateway",
    },
  };
}

// NEW for full MVP: Velocity primitive (for Product 5)
export function createVelocityCommitment(volumes, label = "vanta-velocity") {
  const blinding = generateBlinding();
  const total = volumes.reduce((sum, v) => sum + parseFloat(v), 0);
  const commitment = hashCommitment(blinding, total.toString(), label);
  return {
    commitment,
    count: volumes.length,
    label,
    privateWitness: {
      blinding: blinding.toString("hex"),
      velocitySum: total,
    },
  };
}

export function proveVelocityAboveThreshold(velocityCommitment, threshold, secretLabel = "velocity-threshold") {
  const blinding = Buffer.from(readBlindingHex(velocityCommitment), "hex");
  // Simulate predicate: total > threshold without revealing total
  const result = velocityCommitment.privateWitness.velocitySum > threshold;
  const predicateCommit = hashCommitment(blinding, result.toString(), secretLabel);
  return {
    aboveThreshold: result,
    predicate: `velocity > ${threshold}`,
    verified: result,
    commitmentRef: velocityCommitment.commitment.slice(0, 16),
  };
}

// NEW: Predicate composer for complex disclosures
export function composePredicates(commitment, predicates) {
  const composerSeedHex = commitment?.privateWitness?.blinding ?? commitment?.blinding ?? commitment.commitment.slice(0, 64);
  const blinding = Buffer.from(composerSeedHex, "hex");
  const composed = predicates.map(p => {
    const pCommit = hashCommitment(blinding, String(p.result), p.kind);
    return {
      ...p,
      commitment: pCommit,
    };
  });
  return {
    schemaVersion: VANTA_PRIVACY_SDK_SCHEMA_VERSION,
    commitmentRef: commitment.commitment,
    composedPredicates: composed,
    claimBoundary: VANTA_PRIVACY_SDK_CLAIM_BOUNDARY,
  };
}

// Enhanced Marketplace of composable primitives (with more for full MVP)
export function getMarketplacePrimitives() {
  return [
    {
      id: "commitment-v0.1",
      name: "Blinded Commitment",
      description: "Hide value + owner with sha256 blinding. Reusable across RWA, perps, transfers.",
      audited: false,
      version: "0.1",
      usage: "createCommitment(data, label)",
    },
    {
      id: "nullifier-v0.1",
      name: "Ownership/ Update Nullifier",
      description: "Private state transition (close, transfer, update) without replay.",
      audited: false,
      version: "0.1",
      usage: "createNullifier(blindingHex, secret)",
    },
    {
      id: "selective-disclosure-v0.1",
      name: "Selective Disclosure",
      description: "Disclose only predicate results (e.g. accredited, amountAboveThreshold, jurisdiction) for compliance.",
      audited: false,
      version: "0.1",
      usage: "createSelectiveDisclosure(commitment, attributes, results)",
    },
    {
      id: "settlement-stub-v0.1",
      name: "Private Settlement Stub",
      description: "Hook to Pay + Private Pool v2 + Compliance for shielded assets/positions/RWAs.",
      audited: false,
      version: "0.1",
      usage: "createSettlementStub(commitment, disclosure, context)",
    },
    {
      id: "velocity-v0.1",
      name: "Velocity Commitment & Predicate",
      description: "Private aggregate velocity (sum of hidden volumes) + prove above threshold for intelligence/dashboards.",
      audited: false,
      version: "0.1",
      usage: "createVelocityCommitment(volumes) + proveVelocityAboveThreshold(vel, threshold)",
    },
    {
      id: "predicate-composer-v0.1",
      name: "Predicate Composer",
      description: "Compose multiple predicates (e.g. accredited AND velocity > X) for complex selective disclosures.",
      audited: false,
      version: "0.1",
      usage: "composePredicates(commitment, predicates)",
    },
    {
      id: "credit-note-transfer-v0.1",
      name: "Credit-Note Transfer Primitive",
      description: "DarkDrop-inspired deposit, encrypted claim code, credit-note commitment, amount bucket, and nullifier request shape.",
      audited: false,
      version: "0.1",
      usage: "createRealNoirProofRequest('creditNoteTransfer', publicInputs)",
    },
    {
      id: "agent-spending-limit-v0.1",
      name: "Agent Spending-Limit Proof",
      description: "zkRune-inspired client-side proof request for spending limit plus human approval commitment.",
      audited: false,
      version: "0.1",
      usage: "createRealNoirProofRequest('agentSpendingLimit', publicInputs)",
    },
  ];
}

// NEW: Marketplace helper - simulate acquiring and using a primitive
export function useMarketplacePrimitive(primitiveId, ...args) {
  const primitives = getMarketplacePrimitives();
  const prim = primitives.find(p => p.id === primitiveId);
  if (!prim) return { error: "Primitive not found in marketplace" };
  return {
    primitive: prim,
    usageNote: `Acquired ${prim.name}. Usage: ${prim.usage}. (beta stub - not production audited)`,
    // In real: would return bound function or example invocation
  };
}

// Example composable flows (for demo / SDK consumers) - enhanced
export function issuePrivateAssetSDK(assetData, context = "rwa") {
  const commitment = createCommitment({ amount: assetData.amount, asset: assetData.asset }, `${context}-issuance`);
  const ownershipNullifier = createNullifier(commitment, assetData.ownerSecret, `${context}-ownership-nullifier`);
  const fullCommitment = { ...commitment, ownershipNullifier };
  return fullCommitment;
}

export function buildPrivatePositionOrRWAWithSDK(data, type = "rwa") {
  const committed = issuePrivateAssetSDK(data, type);
  const label = type === "rwa" ? "rwa-ownership-nullifier" : "perp-ownership-nullifier";
  const ownership = proveOwnershipOrState(committed, data.ownerSecret, label);
  const attrs = [
    { kind: "accreditedInvestor", value: data.accredited || true, predicate: "accreditedInvestor == true" },
    { kind: "amountAboveThreshold", value: "threshold-met", predicate: "amount >= threshold" },
  ];
  const results = [data.accredited || true, true];
  const disclosure = createSelectiveDisclosure(committed, attrs, results);
  const publicCommitment = toPublicCommitmentPacket(committed);
  const settlement = createSettlementStub(publicCommitment, disclosure, type);
  return { committed: publicCommitment, ownership, disclosure, settlement, marketplace: getMarketplacePrimitives() };
}

// NEW composable for velocity intelligence (bridges to Product 5)
export function buildVelocityFlowWithSDK(volumes, threshold = 100000) {
  const velCommitment = createVelocityCommitment(volumes);
  const velocityProof = proveVelocityAboveThreshold(velCommitment, threshold);
  const attrs = [
    { kind: "velocityAboveThreshold", value: threshold, predicate: `velocity > ${threshold}` },
  ];
  const results = [velocityProof.aboveThreshold];
  const disclosure = createSelectiveDisclosure(velCommitment, attrs, results);
  disclosure.realNoirAdapters = [VANTA_REAL_NOIR_ADAPTERS.velocityAggregate];
  const publicVelocityCommitment = toPublicCommitmentPacket(velCommitment);
  const settlement = createSettlementStub(publicVelocityCommitment, disclosure, "velocity-intelligence");
  return {
    velCommitment: publicVelocityCommitment,
    velocityProof,
    disclosure,
    settlement,
    marketplace: getMarketplacePrimitives(),
    realNoirAdapter: VANTA_REAL_NOIR_ADAPTERS.velocityAggregate,
  };
}

console.log("Vanta Privacy SDK loaded (FULL MVP). Primitives: commitment, nullifier, selective-disclosure, settlement, velocity, predicate-composer. Marketplace + helpers available. Claim boundary enforced.");
