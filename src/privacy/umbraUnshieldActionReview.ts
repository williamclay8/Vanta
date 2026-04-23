import {
  createUmbraOperationApprovalDisplay,
  createUmbraWithdrawApprovalSummary,
  type UmbraOperationApprovalDisplay,
} from "@/privacy/umbraOperations";

export function createUmbraUnshieldActionApprovalReview({
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
    throw new Error("Vanta Umbra unshield approval requires a requester wallet.");
  }

  if (!destinationAddress.trim()) {
    throw new Error("Vanta Umbra unshield approval requires a destination wallet.");
  }

  if (!mintAddress.trim()) {
    throw new Error("Vanta Umbra unshield approval requires a target mint.");
  }

  return createUmbraOperationApprovalDisplay(
    createUmbraWithdrawApprovalSummary({
      amountBaseUnits,
      destinationAddress,
      expiresAt,
      issuedAt,
      mintAddress,
      requester,
    }),
  );
}
