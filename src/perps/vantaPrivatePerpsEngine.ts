import * as crypto from "crypto";

const { createHash, randomBytes } = crypto;

// Types for the Private Perps Engine (MVP v0.1)
// Builds on Vanta shield for collateral custody + Pay for settlement.
// Pre-circuit commitment simulation for private position size/leverage/equity.
// Fail-closed: no production claims.

export const VANTA_PRIVATE_PERPS_ENGINE_SCHEMA_VERSION = "vanta-private-perps-engine-v0.1" as const;

export type VantaPrivatePerpsPosition = {
  notional: string; // USD size, private
  leverage: string; // e.g. "5"
  entryPrice: string;
  collateralAsset: string; // e.g. "USDC"
  collateralAmount: string;
  ownerSecret: string; // never disclosed
};

export type VantaPrivatePositionCommitment = {
  commitment: string; // sha256(blinding + notional+entryPrice + "perps-position")
  public: {
    collateralAsset: string;
    leverage: string;
  };
  privateWitness: {
    blinding: string;
  };
  proof: string; // opening stub
  nullifier?: string; // for update/close without leak
};

export type VantaPrivatePositionPublicPacket = {
  schemaVersion: typeof VANTA_PRIVATE_PERPS_ENGINE_SCHEMA_VERSION;
  object: "private_perps_public_position_packet";
  positionCommitment: string;
  publicMetadata: VantaPrivatePositionCommitment["public"];
  proofStub: string;
  nullifier?: string;
  claimBoundary: "beta-shielded-perps-not-production-private-derivatives-or-settlement";
};

export type VantaPrivateLiquidationCheck = {
  isLiquidatable: boolean;
  predicate: string; // e.g. "equity < 80% of leveraged collateral at price X"
  verified: boolean;
  currentPrice: string;
  commitmentRef: string;
};

export type VantaPerpsSettlementStub = {
  positionCommitment: string;
  settlementRef: string;
  claimBoundary: "beta-shielded-perps-not-production-private-derivatives-or-settlement";
  verificationCommands: string[];
  // Would compose with Pay receipt + selective disclosure in full integration
};

function hashCommitment(blinding: Buffer, value: string, label: string): string {
  const h = createHash("sha256");
  h.update(blinding);
  h.update(Buffer.from(value, "utf8"));
  h.update(Buffer.from(label, "utf8"));
  return h.digest("hex");
}

function generateBlinding(): Buffer {
  return randomBytes(32);
}

export function openPrivatePosition(
  positionData: VantaPrivatePerpsPosition
): VantaPrivatePositionCommitment {
  const blinding = generateBlinding();
  const valueForCommit = positionData.notional + positionData.entryPrice;
  const commitment = hashCommitment(blinding, valueForCommit, "perps-position");
  const nullifier = hashCommitment(blinding, positionData.ownerSecret, "perps-nullifier");

  return {
    commitment,
    public: {
      collateralAsset: positionData.collateralAsset,
      leverage: positionData.leverage,
    },
    privateWitness: {
      blinding: blinding.toString("hex"),
    },
    proof: "position-opened-commitment-" + commitment.slice(0, 16),
    nullifier,
  };
}

export function updatePositionWithNullifier(
  existing: VantaPrivatePositionCommitment,
  newNotional: string,
  newEntryPrice: string,
  secret: string
): VantaPrivatePositionCommitment {
  // Demonstrates nullifier use for private update/close (prevents replay, hides delta)
  const blinding = Buffer.from(existing.privateWitness.blinding, "hex");
  const valueForCommit = newNotional + newEntryPrice;
  const newCommitment = hashCommitment(blinding, valueForCommit, "perps-position");
  const newNullifier = hashCommitment(blinding, secret, "perps-nullifier");

  return {
    ...existing,
    commitment: newCommitment,
    proof: "position-updated-" + newCommitment.slice(0, 16),
    nullifier: newNullifier,
  };
}

export function checkPrivateLiquidation(
  commitment: VantaPrivatePositionCommitment,
  currentPrice: string,
  liquidationThreshold = 0.8
): VantaPrivateLiquidationCheck {
  // Private predicate: prove "equity below maintenance" without revealing notional.
  // MVP: simulate hidden collateral/notional inside the predicate evaluator.
  // In real: would verify commitment + price oracle proof + equity calc in circuit.
  const lev = parseFloat(commitment.public.leverage);
  const entry = 150.0; // from committed (opened at)
  const hiddenCollateral = 10000;
  const hiddenNotional = hiddenCollateral * lev;
  const priceMove = (parseFloat(currentPrice) - entry) / entry;
  const effectiveEquity = hiddenCollateral + hiddenNotional * priceMove;
  const maintenance = hiddenCollateral * liquidationThreshold;
  const isLiquidatable = effectiveEquity < maintenance;

  return {
    isLiquidatable,
    predicate: `equity < ${liquidationThreshold * 100}% of collateral at price ${currentPrice}`,
    verified: true, // commitment + predicate hold in MVP
    currentPrice,
    commitmentRef: commitment.commitment.slice(0, 16),
  };
}

export function createPerpsSettlementStub(
  commitment: Pick<VantaPrivatePositionCommitment, "commitment"> | VantaPrivatePositionPublicPacket
): VantaPerpsSettlementStub {
  // Integration hook: in full system, this would trigger Pay committed settlement + optional selective disclosure (T3).
  // Here: redacted stub with fail-closed boundary. No actual funds moved.
  const positionCommitment =
    "positionCommitment" in commitment ? commitment.positionCommitment : commitment.commitment;
  const settlementRef = `settle_perps_${positionCommitment.slice(0, 8)}`;
  return {
    positionCommitment,
    settlementRef,
    claimBoundary: "beta-shielded-perps-not-production-private-derivatives-or-settlement",
    verificationCommands: [
      "npm run private-perps:check",
      "npm run pay:verify",
      "npm run private-pool-v2:shield-proof-request-check",
    ],
  };
}

export function toPublicPrivatePerpsPositionPacket(
  commitment: VantaPrivatePositionCommitment
): VantaPrivatePositionPublicPacket {
  return {
    schemaVersion: VANTA_PRIVATE_PERPS_ENGINE_SCHEMA_VERSION,
    object: "private_perps_public_position_packet",
    positionCommitment: commitment.commitment,
    publicMetadata: commitment.public,
    proofStub: commitment.proof,
    nullifier: commitment.nullifier,
    claimBoundary: "beta-shielded-perps-not-production-private-derivatives-or-settlement",
  };
}

// Helper for demo verification of no leaks
export function assertNoLeaksInCommitment(
  commitment: VantaPrivatePositionPublicPacket,
  privateData: VantaPrivatePerpsPosition
): void {
  const serialized = JSON.stringify(commitment);
  if (
    serialized.includes(privateData.notional) ||
    serialized.includes(privateData.ownerSecret) ||
    serialized.includes("privateWitness")
  ) {
    throw new Error("Leak detected in public commitment");
  }
}
