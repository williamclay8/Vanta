import type { VantaProductSlug } from "@/products/vantaProductSuite";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type VantaProductWorkbenchResult = {
  actionLabel: string;
  claimBoundary: string;
  generatedAt: string;
  noFundsMoved: true;
  privateWitnessStatus: "Private witness withheld";
  publicPacket: { [key: string]: JsonValue };
  receipt: {
    status: "Packet generated";
    trustPacketKind: string;
    verifierCanCheck: string[];
  };
  verificationCommands: string[];
  withheld: string[];
};

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteCount = 16) {
  const bytes = new Uint8Array(byteCount);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashHex(label: string, payload: JsonValue) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Browser crypto is required for the product workbench.");
  }

  const encoded = new TextEncoder().encode(`${label}:${JSON.stringify(payload)}:${randomHex(12)}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

function baseResult(input: {
  actionLabel: string;
  claimBoundary: string;
  publicPacket: VantaProductWorkbenchResult["publicPacket"];
  trustPacketKind: string;
  verifierCanCheck: string[];
  verificationCommands: string[];
  withheld: string[];
}): VantaProductWorkbenchResult {
  return {
    actionLabel: input.actionLabel,
    claimBoundary: input.claimBoundary,
    generatedAt: new Date().toISOString(),
    noFundsMoved: true,
    privateWitnessStatus: "Private witness withheld",
    publicPacket: input.publicPacket,
    receipt: {
      status: "Packet generated",
      trustPacketKind: input.trustPacketKind,
      verifierCanCheck: input.verifierCanCheck,
    },
    verificationCommands: input.verificationCommands,
    withheld: input.withheld,
  };
}

async function runComplianceGatewayWorkbench() {
  const privateReceipt = {
    amount: "125000.00",
    asset: "USDC",
    jurisdiction: "US",
    blinding: randomHex(32),
  };
  const amountCommitment = await hashHex("compliance-amount", privateReceipt);
  const requestId = `cg_${randomHex(6)}`;

  return baseResult({
    actionLabel: "Selective disclosure packet",
    claimBoundary: "beta-selective-disclosure-not-production-private-or-regulator-approved",
    publicPacket: {
      schemaVersion: "vanta-compliance-gateway-public-packet-v0.1",
      object: "compliance_gateway_public_packet",
      requestId,
      receiptRef: "pay_receipt_beta_demo",
      proofMode: "public-packet-redacted-verifier-local-opening-stub-held-out",
      privateInputsDisclosed: false,
      witnessDisclosed: false,
      proofBytesPubliclyDisclosed: false,
      selectiveProofs: [
        {
          attributeKind: "amountAboveThreshold",
          commitment: amountCommitment,
          publicInputs: {
            predicate: "amount >= 100000 USDC",
            result: true,
            disclosedValue: ">= 100000",
          },
          verified: false,
        },
        {
          attributeKind: "jurisdictionMatch",
          commitment: await hashHex("compliance-jurisdiction", {
            jurisdiction: privateReceipt.jurisdiction,
            blinding: privateReceipt.blinding,
          }),
          publicInputs: {
            predicate: "jurisdiction == US",
            result: true,
            disclosedValue: "US",
          },
          verified: false,
        },
      ],
    },
    trustPacketKind: "Compliance Gateway selective disclosure",
    verifierCanCheck: ["threshold predicate", "jurisdiction predicate", "receipt reference"],
    verificationCommands: [
      "npm run compliance:gateway-check",
      "npm run pay:institutional-disclosure-receipt-check",
    ],
    withheld: ["receipt amount", "verifier-local opening", "blinding", "private witness"],
  });
}

async function runPrivatePerpsWorkbench() {
  const privatePosition = {
    notional: "480000",
    entryPrice: "150.00",
    ownerSecret: randomHex(32),
    blinding: randomHex(32),
  };
  const positionCommitment = await hashHex("private-perps-position", privatePosition);

  return baseResult({
    actionLabel: "Private position packet",
    claimBoundary: "beta-shielded-perps-not-production-private-derivatives-or-settlement",
    publicPacket: {
      schemaVersion: "vanta-private-perps-engine-v0.1",
      object: "private_perps_public_position_packet",
      positionCommitment,
      publicMetadata: {
        collateralAsset: "USDC",
        leverage: "4",
      },
      liquidationPredicate: {
        predicate: "equity < 80% of collateral at price 142.00",
        currentPrice: "142.00",
        liquidatable: true,
        verified: true,
      },
      settlementStub: `settle_perps_${positionCommitment.slice(0, 8)}`,
      proofSummary: {
        proofMaterialPubliclyDisclosed: false,
        proofMode: "verifier-local-opening-stub-held-out",
        verificationCommand: "npm run private-perps:check",
      },
    },
    trustPacketKind: "Private Perps position and liquidation packet",
    verifierCanCheck: ["position commitment", "public leverage metadata", "liquidation predicate"],
    verificationCommands: [
      "npm run private-perps:check",
      "npm run pay:verify",
      "npm run private-pool-v2:shield-proof-request-check",
    ],
    withheld: ["position notional", "entry opening", "owner secret", "private witness"],
  });
}

async function runShieldedRwaWorkbench() {
  const privateIssuance = {
    issuanceAmount: "250000",
    ownerSecret: randomHex(32),
    blinding: randomHex(32),
    accredited: true,
  };
  const rwaCommitment = await hashHex("shielded-rwa-issuance", privateIssuance);

  return baseResult({
    actionLabel: "Shielded RWA packet",
    claimBoundary: "beta-shielded-rwa-not-production-private-rwa-or-tokenization",
    publicPacket: {
      schemaVersion: "vanta-shielded-rwa-v0.1",
      object: "shielded_rwa_public_flow_packet",
      rwaCommitment: {
        commitment: rwaCommitment,
        object: "shielded_rwa_public_commitment_packet",
        public: {
          assetClass: "treasury-note-allocation",
          jurisdiction: "US",
        },
      },
      ownershipProof: {
        predicate: "owner holds valid nullifier for committed RWA issuance",
        owns: true,
        verified: true,
      },
      selectiveDisclosure: {
        proofCount: 2,
        predicates: [
          {
            kind: "accreditedInvestor",
            predicate: "accreditedInvestor == true",
            result: true,
          },
          {
            kind: "amountAboveThreshold",
            predicate: "issuance >= 100000 USD",
            result: true,
          },
        ],
      },
      settlement: {
        settlementRef: `settle_rwa_${rwaCommitment.slice(0, 8)}`,
        hooks: ["Pay", "Private Pool", "Compliance Gateway", "Privacy SDK"],
      },
    },
    trustPacketKind: "Shielded RWA public flow packet",
    verifierCanCheck: ["ownership predicate", "accreditation predicate", "settlement hook shape"],
    verificationCommands: [
      "npm run shielded-rwa:check",
      "npm run compliance:gateway-check",
      "npm run privacy-sdk:check",
    ],
    withheld: ["issuance amount", "owner secret", "blinding", "private witness"],
  });
}

async function runPrivacySdkWorkbench() {
  const sampleCommitment = await hashHex("sdk-sample-commitment", {
    amount: "hidden",
    owner: "hidden",
    blinding: randomHex(32),
  });

  return baseResult({
    actionLabel: "SDK primitive packet",
    claimBoundary: "beta-privacy-sdk-not-production-private-or-audited-primitives",
    publicPacket: {
      schemaVersion: "vanta-privacy-sdk-v0.1",
      object: "privacy_sdk_marketplace_packet",
      primitiveCount: 6,
      selectedPrimitive: "Velocity Commitment & Predicate",
      acquiredPrimitive: {
        id: "velocity-v0.1",
        audited: false,
        usage: "createVelocityCommitment(volumes) + proveVelocityAboveThreshold(velocity, threshold)",
      },
      samplePublicPacket: {
        commitment: sampleCommitment,
        claimBoundary: "beta-privacy-sdk-not-production-private-or-audited-primitives",
      },
      proofResultAdapter: {
        generatedProofClaimAllowed: false,
        productionReady: false,
      },
    },
    trustPacketKind: "Privacy SDK primitive acquisition packet",
    verifierCanCheck: ["primitive metadata", "public commitment packet", "claim-blocked adapter status"],
    verificationCommands: [
      "npm run privacy-sdk:check",
      "npm run zk:phase2-product-proof-requests-check",
    ],
    withheld: ["sample amount", "owner secret", "blinding", "proof bytes"],
  });
}

async function runPrivateVelocityWorkbench() {
  const privateVelocity = {
    sourceVolumes: ["125000", "98000", "146000"],
    blinding: randomHex(32),
    period: "24h",
  };
  const velocityCommitment = await hashHex("private-velocity", privateVelocity);

  return baseResult({
    actionLabel: "Private velocity packet",
    claimBoundary: "beta-private-velocity-not-production-private-analytics-or-dashboards",
    publicPacket: {
      schemaVersion: "vanta-private-velocity-v0.1",
      object: "private_velocity_dashboard_packet",
      velocityCommitmentRef: velocityCommitment.slice(0, 16),
      period: "24h",
      disclosureSummary: {
        proofCount: 4,
        predicates: [
          {
            kind: "institutionalVelocityAbove100k",
            predicate: "velocity > 100000 USD",
            result: true,
          },
          {
            kind: "institutionalVelocityAbove300k",
            predicate: "velocity > 300000 USD",
            result: true,
          },
          {
            kind: "jurisdictionMatch",
            predicate: "jurisdiction == US",
            result: true,
          },
          {
            kind: "accreditedInvestor",
            predicate: "accredited == true",
            result: true,
          },
        ],
      },
      publicInsights: {
        sources: 3,
        redactedRange: "100k-1M USD",
        complianceFactsIncluded: 2,
      },
      nullifierRollover: {
        velocityRef: velocityCommitment.slice(0, 16),
        period: "24h",
      },
    },
    trustPacketKind: "Private Velocity dashboard packet",
    verifierCanCheck: ["threshold predicates", "redacted dashboard range", "rollover reference"],
    verificationCommands: [
      "npm run velocity-intelligence:check",
      "npm run privacy-sdk:check",
      "npm run compliance:gateway-check",
    ],
    withheld: ["exact source volumes", "aggregate sum", "blinding", "private witness"],
  });
}

export function runProductWorkbench(slug: VantaProductSlug) {
  switch (slug) {
    case "compliance-gateway":
      return runComplianceGatewayWorkbench();
    case "private-perps-engine":
      return runPrivatePerpsWorkbench();
    case "shielded-rwa-tokenization":
      return runShieldedRwaWorkbench();
    case "privacy-sdk-primitives-marketplace":
      return runPrivacySdkWorkbench();
    case "private-velocity-intelligence":
      return runPrivateVelocityWorkbench();
  }
}
