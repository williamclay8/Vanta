import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

import type {
  VantaCommittedEconomicsProtocolSettlementRequest,
  VantaProtocolShieldCapability,
  VantaProtocolShieldRouteEvidence,
} from "./privatePoolV2ProtocolSettlementClient";

export const VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION =
  "vanta-shield-committed-settlement-0.1" as const;

export type VantaShieldCommittedEconomicsSettlementArgs = {
  amount: string;
  depositSignature: string;
  owner: string;
  routeEvidence: VantaProtocolShieldRouteEvidence | null;
  settlementId: string;
  shieldCapability: VantaProtocolShieldCapability;
  sourceAsset: string;
  vaultOwner: string;
};

export type VantaShieldCommittedEconomicsSettlementRequest =
  VantaCommittedEconomicsProtocolSettlementRequest & {
    action: "shield";
  };

/**
 * Per-field domain tags. Every commitment is bound to one of these so that a
 * preimage that opens an `economics` commitment can never be replayed against
 * an `owner` commitment (and vice versa).
 */
const DOMAIN_TAG_ECONOMICS = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:economics`;
const DOMAIN_TAG_ROUTE = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:route`;
const DOMAIN_TAG_OUTPUT = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:output`;
const DOMAIN_TAG_OWNER = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:owner`;
const DOMAIN_TAG_SETTLEMENT = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:settlement`;
const DOMAIN_TAG_REPLAY = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:replay`;
const DOMAIN_TAG_SOURCE = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:source`;
const DOMAIN_TAG_ID = `${VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION}:id`;

const TEXT_ENCODER = new TextEncoder();

/**
 * Canonical preimage layout for a commitment hash:
 *
 *   SHA256(
 *     domainTagBytes                          // raw UTF-8, fixed per field
 *     || nonce (32 bytes, present iff hiding) // raw bytes, no length prefix
 *     || lengthPrefixed(part_0)
 *     || lengthPrefixed(part_1)
 *     || ...
 *   )
 *
 * `lengthPrefixed(x)` = 4-byte big-endian u32 length of `x` followed by the
 * raw bytes of `x`. Length-prefixing every variable component makes the
 * concatenation unambiguously parseable, so distinct ordered tuples of parts
 * map to distinct preimages.
 *
 * Domain tags themselves do not need a length prefix because they are fixed
 * compile-time constants per commitment kind. The 32-byte nonce is also
 * fixed-width so it does not need one.
 *
 * For the deterministic `settlementId` we omit the nonce: idempotency for the
 * operator requires repeated calls with the same input id to map to the same
 * output id, so the id is a plain keyed hash with no blinding.
 */

function lengthPrefixedUtf8(value: string): Uint8Array {
  const bytes = TEXT_ENCODER.encode(value);
  const out = new Uint8Array(4 + bytes.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, bytes.length, false);
  out.set(bytes, 4);
  return out;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function buildPreimage(
  domainTag: string,
  nonce: Uint8Array | null,
  preimageParts: readonly string[],
): Uint8Array {
  const segments: Uint8Array[] = [TEXT_ENCODER.encode(domainTag)];
  if (nonce) {
    segments.push(nonce);
  }
  for (const part of preimageParts) {
    segments.push(lengthPrefixedUtf8(part));
  }
  return concatBytes(segments);
}

function commitWithNonce(
  domainTag: string,
  preimageParts: readonly string[],
): { commitment: string; nonce: Uint8Array } {
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const digest = sha256(buildPreimage(domainTag, nonce, preimageParts));
  return { commitment: `0x${bytesToHex(digest)}`, nonce };
}

function deterministicCommit(domainTag: string, preimageParts: readonly string[]): string {
  const digest = sha256(buildPreimage(domainTag, null, preimageParts));
  return `0x${bytesToHex(digest)}`;
}

function requireNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`Committed Shield settlement requires ${label}.`);
  }

  return value;
}

export type VantaShieldCommittedEconomicsSettlementOpeningField = {
  nonce: Uint8Array;
  preimageParts: readonly string[];
};

export type VantaShieldCommittedEconomicsSettlementOpening = {
  economics: VantaShieldCommittedEconomicsSettlementOpeningField;
  route: VantaShieldCommittedEconomicsSettlementOpeningField;
  output: VantaShieldCommittedEconomicsSettlementOpeningField;
  owner: VantaShieldCommittedEconomicsSettlementOpeningField;
  replay: VantaShieldCommittedEconomicsSettlementOpeningField;
  settlement: VantaShieldCommittedEconomicsSettlementOpeningField;
  source: VantaShieldCommittedEconomicsSettlementOpeningField;
  settlementIdPreimageParts: readonly string[];
};

export type VantaShieldCommittedEconomicsSettlementResult = {
  request: VantaShieldCommittedEconomicsSettlementRequest;
  opening: VantaShieldCommittedEconomicsSettlementOpening;
};

export function createVantaShieldCommittedEconomicsSettlement({
  amount,
  depositSignature,
  owner,
  routeEvidence,
  settlementId,
  shieldCapability,
  sourceAsset,
  vaultOwner,
}: VantaShieldCommittedEconomicsSettlementArgs): VantaShieldCommittedEconomicsSettlementResult {
  const sourceMintAddress = requireNonEmpty(
    shieldCapability.sourceAsset?.mintAddress ?? "",
    "a source mint",
  );
  const targetAsset = requireNonEmpty(
    shieldCapability.targetShieldAsset?.assetKey ?? "",
    "a target shield asset",
  );
  const targetMintAddress = requireNonEmpty(
    shieldCapability.targetShieldAsset?.mintAddress ?? "",
    "a target mint",
  );

  requireNonEmpty(amount, "an amount");
  requireNonEmpty(depositSignature, "a deposit signature");
  requireNonEmpty(owner, "an owner");
  requireNonEmpty(settlementId, "a settlement id");
  requireNonEmpty(sourceAsset, "a source asset");
  requireNonEmpty(vaultOwner, "a vault owner");

  if (shieldCapability.requiresPublicRoute && !routeEvidence) {
    throw new Error("Committed routed Shield settlement requires route evidence.");
  }

  // The source side of the economics commitment binds asset / mint / amount.
  // It is itself a hiding commitment so the operator cannot brute-force the
  // small space of plausible amounts and assets.
  const sourcePreimageParts: readonly string[] = [
    "source",
    sourceAsset,
    sourceMintAddress,
    amount,
  ];
  const { commitment: sourceSideCommitment, nonce: sourceNonce } = commitWithNonce(
    DOMAIN_TAG_SOURCE,
    sourcePreimageParts,
  );

  const routePreimageParts: readonly string[] = [
    "route",
    routeEvidence?.provider ?? "direct",
    routeEvidence?.routeSignature ?? "",
    routeEvidence?.sourceAmount ?? amount,
    routeEvidence?.sourceAsset ?? sourceAsset,
    routeEvidence?.sourceMintAddress ?? sourceMintAddress,
    routeEvidence?.targetAmount ?? amount,
    routeEvidence?.targetAsset ?? targetAsset,
    routeEvidence?.targetMintAddress ?? targetMintAddress,
  ];
  const { commitment: routeCommitment, nonce: routeNonce } = commitWithNonce(
    DOMAIN_TAG_ROUTE,
    routePreimageParts,
  );

  const outputPreimageParts: readonly string[] = [
    "output",
    targetAsset,
    targetMintAddress,
    settlementId,
    depositSignature,
  ];
  const { commitment: outputCommitment, nonce: outputNonce } = commitWithNonce(
    DOMAIN_TAG_OUTPUT,
    outputPreimageParts,
  );

  const economicsPreimageParts: readonly string[] = [
    "economics",
    sourceSideCommitment,
    routeCommitment,
    outputCommitment,
  ];
  const { commitment: economicsCommitment, nonce: economicsNonce } = commitWithNonce(
    DOMAIN_TAG_ECONOMICS,
    economicsPreimageParts,
  );

  const ownerPreimageParts: readonly string[] = ["owner", owner, vaultOwner];
  const { commitment: ownerCommitment, nonce: ownerNonce } = commitWithNonce(
    DOMAIN_TAG_OWNER,
    ownerPreimageParts,
  );

  const settlementPreimageParts: readonly string[] = [
    "settlement",
    settlementId,
    sourceSideCommitment,
    outputCommitment,
  ];
  const { commitment: settlementCommitment, nonce: settlementNonce } = commitWithNonce(
    DOMAIN_TAG_SETTLEMENT,
    settlementPreimageParts,
  );

  const replayPreimageParts: readonly string[] = ["replay", settlementId, depositSignature];
  const { commitment: nullifierOrReplayCommitment, nonce: replayNonce } = commitWithNonce(
    DOMAIN_TAG_REPLAY,
    replayPreimageParts,
  );

  const settlementIdHashed = deterministicCommit(DOMAIN_TAG_ID, [settlementId]);

  const request: VantaShieldCommittedEconomicsSettlementRequest = {
    action: "shield",
    economicsCommitment,
    economicsMode: "committed-economics",
    nullifierOrReplayCommitment,
    outputCommitment,
    ownerCommitment,
    routeCommitment,
    settlementCommitment,
    settlementId: settlementIdHashed,
  };

  const opening: VantaShieldCommittedEconomicsSettlementOpening = {
    economics: {
      nonce: economicsNonce,
      preimageParts: economicsPreimageParts,
    },
    route: {
      nonce: routeNonce,
      preimageParts: routePreimageParts,
    },
    output: {
      nonce: outputNonce,
      preimageParts: outputPreimageParts,
    },
    owner: {
      nonce: ownerNonce,
      preimageParts: ownerPreimageParts,
    },
    replay: {
      nonce: replayNonce,
      preimageParts: replayPreimageParts,
    },
    settlement: {
      nonce: settlementNonce,
      preimageParts: settlementPreimageParts,
    },
    source: {
      nonce: sourceNonce,
      preimageParts: sourcePreimageParts,
    },
    settlementIdPreimageParts: [settlementId],
  };

  return { request, opening };
}

export function createVantaShieldCommittedEconomicsSettlementRequest(
  args: VantaShieldCommittedEconomicsSettlementArgs,
): VantaShieldCommittedEconomicsSettlementRequest {
  return createVantaShieldCommittedEconomicsSettlement(args).request;
}

export function verifyVantaShieldCommittedEconomicsCommitment({
  commitment,
  opening,
  domainTag,
  preimageParts,
}: {
  commitment: string;
  opening: Uint8Array;
  domainTag: string;
  preimageParts: readonly string[];
}): boolean {
  const digest = sha256(buildPreimage(domainTag, opening, preimageParts));
  const expected = `0x${bytesToHex(digest)}`;
  return expected === commitment;
}

export function verifyVantaShieldCommittedEconomicsSettlementOpening({
  opening,
  request,
}: VantaShieldCommittedEconomicsSettlementResult): boolean {
  const sourceCommitment = deterministicCommitWithNonce(
    DOMAIN_TAG_SOURCE,
    opening.source.nonce,
    opening.source.preimageParts,
  );
  const routeCommitment = deterministicCommitWithNonce(
    DOMAIN_TAG_ROUTE,
    opening.route.nonce,
    opening.route.preimageParts,
  );
  const outputCommitment = deterministicCommitWithNonce(
    DOMAIN_TAG_OUTPUT,
    opening.output.nonce,
    opening.output.preimageParts,
  );
  const economicsCommitment = deterministicCommitWithNonce(
    DOMAIN_TAG_ECONOMICS,
    opening.economics.nonce,
    opening.economics.preimageParts,
  );
  const ownerCommitment = deterministicCommitWithNonce(
    DOMAIN_TAG_OWNER,
    opening.owner.nonce,
    opening.owner.preimageParts,
  );
  const settlementCommitment = deterministicCommitWithNonce(
    DOMAIN_TAG_SETTLEMENT,
    opening.settlement.nonce,
    opening.settlement.preimageParts,
  );
  const replayCommitment = deterministicCommitWithNonce(
    DOMAIN_TAG_REPLAY,
    opening.replay.nonce,
    opening.replay.preimageParts,
  );
  const settlementId = deterministicCommit(DOMAIN_TAG_ID, opening.settlementIdPreimageParts);

  return (
    request.economicsCommitment === economicsCommitment &&
    request.nullifierOrReplayCommitment === replayCommitment &&
    request.outputCommitment === outputCommitment &&
    request.ownerCommitment === ownerCommitment &&
    request.routeCommitment === routeCommitment &&
    request.settlementCommitment === settlementCommitment &&
    request.settlementId === settlementId &&
    opening.economics.preimageParts[1] === sourceCommitment &&
    opening.economics.preimageParts[2] === routeCommitment &&
    opening.economics.preimageParts[3] === outputCommitment &&
    opening.settlement.preimageParts[2] === sourceCommitment &&
    opening.settlement.preimageParts[3] === outputCommitment
  );
}

function deterministicCommitWithNonce(
  domainTag: string,
  nonce: Uint8Array,
  preimageParts: readonly string[],
): string {
  const digest = sha256(buildPreimage(domainTag, nonce, preimageParts));
  return `0x${bytesToHex(digest)}`;
}
