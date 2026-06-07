/**
 * Vanta Shielded RWA Tokenization Suite (Product 3 MVP)
 * Reusable RWA module built on the Vanta Privacy SDK primitives.
 * Pre-circuit commitment simulation only; no production privacy or tokenization claims.
 */

import {
  VANTA_REAL_NOIR_ADAPTERS,
  createCommitment,
  createNullifier,
  createSelectiveDisclosure,
  createSettlementStub,
  proveOwnershipOrState,
  toPublicCommitmentPacket,
} from "../sdk/vantaPrivacySDK.mjs";

export const VANTA_SHIELDED_RWA_SCHEMA_VERSION = "vanta-shielded-rwa-v0.1";
export const VANTA_SHIELDED_RWA_CLAIM_BOUNDARY =
  "beta-shielded-rwa-not-production-private-rwa-or-tokenization";

export function issuePrivateRWA(rwaData) {
  const baseCommitment = createCommitment(
    {
      issuanceAmount: rwaData.issuanceAmount,
      assetClass: rwaData.assetClass,
      jurisdiction: rwaData.jurisdiction,
    },
    "rwa-issuance"
  );
  const ownershipNullifier = createNullifier(
    baseCommitment,
    rwaData.ownerSecret,
    "rwa-ownership-nullifier"
  );

  return {
    schemaVersion: VANTA_SHIELDED_RWA_SCHEMA_VERSION,
    object: "shielded_rwa_prover_commitment",
    commitment: baseCommitment.commitment,
    label: baseCommitment.label,
    public: {
      assetClass: rwaData.assetClass,
      jurisdiction: rwaData.jurisdiction,
    },
    ownershipNullifier,
    proofStub: `rwa-issued-${baseCommitment.commitment.slice(0, 16)}`,
    privateWitness: {
      ...baseCommitment.privateWitness,
      issuanceAmount: rwaData.issuanceAmount,
      ownerSecret: rwaData.ownerSecret,
      accredited: rwaData.accredited,
    },
    claimBoundary: VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
  };
}

export function toPublicRWACommitmentPacket(rwaCommitment) {
  return {
    ...toPublicCommitmentPacket(rwaCommitment),
    schemaVersion: VANTA_SHIELDED_RWA_SCHEMA_VERSION,
    object: "shielded_rwa_public_commitment_packet",
    public: rwaCommitment.public,
    proofStub: rwaCommitment.proofStub,
    ownershipNullifier: rwaCommitment.ownershipNullifier,
    claimBoundary: VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
  };
}

export function provePrivateOwnership(rwaCommitment, ownerSecret) {
  const ownership = proveOwnershipOrState(
    rwaCommitment,
    ownerSecret,
    "rwa-ownership-nullifier"
  );
  return {
    ...ownership,
    schemaVersion: VANTA_SHIELDED_RWA_SCHEMA_VERSION,
    predicate: "owner holds valid nullifier for committed RWA issuance",
    owns: ownership.holds,
    claimBoundary: VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
  };
}

export function createSelectiveDisclosureForRWA(rwaCommitment) {
  const accredited = Boolean(rwaCommitment.privateWitness?.accredited);
  const aboveThreshold =
    Number.parseFloat(rwaCommitment.privateWitness?.issuanceAmount ?? "0") >= 100000;
  const disclosure = createSelectiveDisclosure(
    rwaCommitment,
    [
      {
        kind: "accreditedInvestor",
        value: accredited ? "credential-present" : "credential-missing",
        predicate: "accreditedInvestor == true",
      },
      {
        kind: "amountAboveThreshold",
        value: "threshold-result",
        threshold: "100000",
        asset: "USD",
        predicate: "issuance >= 100000 USD",
      },
    ],
    [accredited, aboveThreshold]
  );

  return {
    ...disclosure,
    schemaVersion: "vanta-rwa-selective-disclosure-v0.1",
    rwaCommitment: rwaCommitment.commitment,
    claimBoundary: VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
    realNoirAdapters: [VANTA_REAL_NOIR_ADAPTERS.selectiveDisclosure],
    verificationCommands: [
      "npm run shielded-rwa:check",
      "npm run compliance:gateway-check",
      "npm run privacy-sdk:check",
      "npm run pay:verify",
    ],
  };
}

export function createRWASettlementStub(publicRWACommitment, disclosure) {
  const baseSettlement = createSettlementStub(publicRWACommitment, disclosure, "rwa");
  return {
    ...baseSettlement,
    schemaVersion: VANTA_SHIELDED_RWA_SCHEMA_VERSION,
    object: "shielded_rwa_settlement_stub",
    rwaCommitment: publicRWACommitment.commitment,
    claimBoundary: VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
    verificationCommands: disclosure.verificationCommands,
    hooks: {
      pay: "vantaPaySettlement",
      privatePool: "vantaPrivatePoolCustody",
      compliance: "vantaComplianceGateway",
      privacySDK: "vantaPrivacySDK",
    },
  };
}

export function buildShieldedRWAFlow(rwaData) {
  const issued = issuePrivateRWA(rwaData);
  const publicCommitment = toPublicRWACommitmentPacket(issued);
  const ownership = provePrivateOwnership(issued, rwaData.ownerSecret);
  const disclosure = createSelectiveDisclosureForRWA(issued);
  const settlement = createRWASettlementStub(publicCommitment, disclosure);
  const publicPacket = {
    schemaVersion: VANTA_SHIELDED_RWA_SCHEMA_VERSION,
    object: "shielded_rwa_public_flow_packet",
    rwaCommitment: publicCommitment,
    ownershipProof: ownership,
    selectiveDisclosure: disclosure,
    settlement,
    claimBoundary: VANTA_SHIELDED_RWA_CLAIM_BOUNDARY,
    verificationCommands: settlement.verificationCommands,
  };
  assertNoPrivateRWALeaks(publicPacket, rwaData, issued.privateWitness);
  return publicPacket;
}

export function assertNoPrivateRWALeaks(publicArtifact, privateData, privateWitness = {}) {
  const serialized = JSON.stringify(publicArtifact);
  const banned = [
    privateData.issuanceAmount,
    privateData.ownerSecret,
    privateWitness.blinding,
    "ownerSecret",
    "privateWitness",
  ];
  for (const value of banned) {
    if (value && serialized.includes(value)) {
      throw new Error(`Private RWA leak detected in public artifact: ${value}`);
    }
  }
}
