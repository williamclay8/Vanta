export const VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY_VERSION =
  "vanta-private-pool-v2-settlement-policy-0.1";

export type VantaPrivatePoolV2SettlementPolicy = Readonly<{
  conflictingReplayRejection: true;
  failClosedValidation: true;
  identicalReplayIdempotency: true;
  productionDurableStoreRequired: true;
  restartSafeSettlementReceipts: true;
  version: typeof VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY_VERSION;
}>;

export const VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY = {
  conflictingReplayRejection: true,
  failClosedValidation: true,
  identicalReplayIdempotency: true,
  productionDurableStoreRequired: true,
  restartSafeSettlementReceipts: true,
  version: VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY_VERSION,
} satisfies VantaPrivatePoolV2SettlementPolicy;
