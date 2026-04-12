
import type { CanonicalNullifierBasis } from "./canonicalNote";

export const CANONICAL_CONSUMPTION_BASIS_SCHEME_V1 =
  "vanta-placeholder-canonical-consumption-basis-v1" as const;
export const CANONICAL_NULLIFIER_STUB_SCHEME_V1 =
  "vanta-placeholder-canonical-nullifier-stub-v1" as const;

export type CanonicalConsumptionKind = "send" | "swap" | "unshield";

export type CanonicalConsumptionBasis = {
  scheme: typeof CANONICAL_CONSUMPTION_BASIS_SCHEME_V1;
  value: string;
};

export type CanonicalNullifierStub = {
  scheme: typeof CANONICAL_NULLIFIER_STUB_SCHEME_V1;
  value: string;
};

export type CanonicalLifecycleConsumptionRecord = {
  consumptionId: string;
  recordLifecycleId: string;
  lineageId: string;
  consumedLifecycleId: string;
  consumptionKind: CanonicalConsumptionKind;
  consumedNullifierBasis: CanonicalNullifierBasis;
  consumptionBasis: CanonicalConsumptionBasis;
  nullifierStub: CanonicalNullifierStub;
  producedLifecycleIds: string[];
  exitLifecycleId?: string;
};

export async function createCanonicalConsumptionRecord(args: {
  recordLifecycleId: string;
  lineageId: string;
  consumedLifecycleId: string;
  consumptionKind: CanonicalConsumptionKind;
  consumedNullifierBasis: CanonicalNullifierBasis;
  producedLifecycleIds: string[];
  exitLifecycleId?: string;
}): Promise<CanonicalLifecycleConsumptionRecord> {
  const serialized = JSON.stringify({
    recordLifecycleId: args.recordLifecycleId,
    lineageId: args.lineageId,
    consumedLifecycleId: args.consumedLifecycleId,
    consumptionKind: args.consumptionKind,
    consumedNullifierBasis: args.consumedNullifierBasis.value,
    producedLifecycleIds: args.producedLifecycleIds,
    exitLifecycleId: args.exitLifecycleId,
  });

  const consumptionBasisValue = await derivePlaceholderDigest(
    "vanta:canonical-consumption-basis:placeholder:v1",
    serialized,
  );
  const consumptionId = await derivePlaceholderDigest(
    "vanta:canonical-consumption-id:placeholder:v1",
    `${args.consumedLifecycleId}\n${consumptionBasisValue}`,
  );
  const nullifierStubValue = await derivePlaceholderDigest(
    "vanta:canonical-nullifier-stub:placeholder:v1",
    `${args.consumedLifecycleId}\n${args.consumedNullifierBasis.value}\n${consumptionBasisValue}`,
  );

  return {
    consumptionId,
    recordLifecycleId: args.recordLifecycleId,
    lineageId: args.lineageId,
    consumedLifecycleId: args.consumedLifecycleId,
    consumptionKind: args.consumptionKind,
    consumedNullifierBasis: args.consumedNullifierBasis,
    consumptionBasis: {
      scheme: CANONICAL_CONSUMPTION_BASIS_SCHEME_V1,
      value: consumptionBasisValue,
    },
    nullifierStub: {
      scheme: CANONICAL_NULLIFIER_STUB_SCHEME_V1,
      value: nullifierStubValue,
    },
    producedLifecycleIds: args.producedLifecycleIds,
    exitLifecycleId: args.exitLifecycleId,
  };
}

async function derivePlaceholderDigest(domain: string, payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${domain}\n${payload}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
