import {
  createUmbraDepositApprovalSummary,
  createUmbraOperationApprovalDisplay,
  type UmbraOperationApprovalDisplay,
} from "@/privacy/umbraOperations";

export function createUmbraShieldActionApprovalReview({
  amountBaseUnits,
  expiresAt,
  issuedAt,
  mintAddress,
  requester,
}: {
  amountBaseUnits: bigint | number | string;
  expiresAt: number;
  issuedAt: number;
  mintAddress: string;
  requester: string;
}): UmbraOperationApprovalDisplay {
  if (!requester.trim()) {
    throw new Error("Vanta Umbra shield approval requires a requester wallet.");
  }

  if (!mintAddress.trim()) {
    throw new Error("Vanta Umbra shield approval requires a target mint.");
  }

  return createUmbraOperationApprovalDisplay(
    createUmbraDepositApprovalSummary({
      amountBaseUnits,
      expiresAt,
      issuedAt,
      mintAddress,
      requester,
    }),
  );
}
