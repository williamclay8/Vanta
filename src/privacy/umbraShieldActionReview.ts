import {
  createUmbraDepositApprovalSummary,
  createUmbraOperationApprovalDisplay,
  type UmbraOperationApprovalDisplay,
} from "@/privacy/umbraOperations";

export function createUmbraShieldActionApprovalReview({
  amountBaseUnits,
  destinationAddress,
  expiresAt,
  issuedAt,
  mintAddress,
  requester,
}: {
  amountBaseUnits: bigint | number | string;
  destinationAddress: string;
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

  if (!destinationAddress.trim()) {
    throw new Error("Vanta Umbra shield approval requires a vault destination.");
  }

  return createUmbraOperationApprovalDisplay(
    createUmbraDepositApprovalSummary({
      amountBaseUnits,
      destinationAddress,
      expiresAt,
      issuedAt,
      mintAddress,
      requester,
    }),
  );
}
