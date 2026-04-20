import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  VantaPrivatePoolV2ClaimQuote,
  VantaPrivatePoolV2Relayer,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_LOCAL_RELAYER_SCHEME =
  "sha256-private-pool-v2-local-relayer-0.1" as const;

export type VantaPrivatePoolV2LocalRelayerClaim = {
  quote: VantaPrivatePoolV2ClaimQuote;
  serializedTransaction: string;
  signature: string;
  submittedAtSlot: bigint;
};

export type VantaPrivatePoolV2LocalRelayerArgs = {
  currentSlot?: bigint;
  feeBps?: bigint;
  quoteTtlSlots?: bigint;
  relayerId?: string;
};

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

export class VantaPrivatePoolV2LocalRelayer implements VantaPrivatePoolV2Relayer {
  readonly scheme = VANTA_PRIVATE_POOL_V2_LOCAL_RELAYER_SCHEME;

  #claims = new Map<string, VantaPrivatePoolV2LocalRelayerClaim>();
  #currentSlot: bigint;
  #feeBps: bigint;
  #quoteTtlSlots: bigint;
  #quotes = new Map<string, VantaPrivatePoolV2ClaimQuote>();
  #relayerId: string;

  constructor({
    currentSlot = 1_000_000n,
    feeBps = 10n,
    quoteTtlSlots = 150n,
    relayerId = "vanta-local-relayer-v2",
  }: VantaPrivatePoolV2LocalRelayerArgs = {}) {
    this.#currentSlot = currentSlot;
    this.#feeBps = feeBps;
    this.#quoteTtlSlots = quoteTtlSlots;
    this.#relayerId = relayerId;
  }

  get submittedClaims() {
    return [...this.#claims.values()];
  }

  advanceSlot(slots: bigint) {
    if (slots < 0n) {
      throw new Error("Cannot rewind local relayer slot.");
    }

    this.#currentSlot += slots;
    return this.#currentSlot;
  }

  async quoteClaim({
    amountBaseUnits,
    assetId,
    destinationAddress,
  }: {
    amountBaseUnits: bigint;
    assetId: string;
    destinationAddress: string;
  }) {
    if (amountBaseUnits <= 0n) {
      throw new Error("Claim amount must be positive.");
    }

    const quote = {
      estimatedFeeBaseUnits: (amountBaseUnits * this.#feeBps) / 10_000n,
      expiresAtSlot: this.#currentSlot + this.#quoteTtlSlots,
      relayerId: [
        this.#relayerId,
        hashParts(
          this.scheme,
          "quote",
          assetId,
          destinationAddress,
          amountBaseUnits.toString(),
          this.#currentSlot.toString(),
        ).slice(2, 18),
      ].join(":"),
    } satisfies VantaPrivatePoolV2ClaimQuote;

    this.#quotes.set(this.#quoteKey(quote), quote);
    return quote;
  }

  async submitClaim({
    quote,
    serializedTransaction,
  }: {
    quote: VantaPrivatePoolV2ClaimQuote;
    serializedTransaction: string;
  }) {
    const quoteKey = this.#quoteKey(quote);

    if (!this.#quotes.has(quoteKey)) {
      throw new Error(`Unknown relayer quote ${quote.relayerId}.`);
    }

    if (quote.expiresAtSlot < this.#currentSlot) {
      throw new Error(`Expired relayer quote ${quote.relayerId}.`);
    }

    if (this.#claims.has(quoteKey)) {
      throw new Error(`Relayer quote ${quote.relayerId} has already been submitted.`);
    }

    const signature = hashParts(
      this.scheme,
      "claim",
      quoteKey,
      serializedTransaction,
      this.#currentSlot.toString(),
    );
    const claim = {
      quote,
      serializedTransaction,
      signature,
      submittedAtSlot: this.#currentSlot,
    } satisfies VantaPrivatePoolV2LocalRelayerClaim;

    this.#claims.set(quoteKey, claim);

    return {
      relayerId: quote.relayerId,
      signature,
    };
  }

  #quoteKey(quote: VantaPrivatePoolV2ClaimQuote) {
    return [
      quote.relayerId,
      quote.estimatedFeeBaseUnits.toString(),
      quote.expiresAtSlot.toString(),
    ].join(":");
  }
}

export function createVantaPrivatePoolV2LocalRelayer(args?: VantaPrivatePoolV2LocalRelayerArgs) {
  return new VantaPrivatePoolV2LocalRelayer(args);
}
