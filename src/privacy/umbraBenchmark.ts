import { getUmbraRuntimeReadiness } from "./umbraConfig";
import {
  createUmbraClaimableUtxoScanApprovalSummary,
  createUmbraDepositApprovalSummary,
  createUmbraEncryptedBalanceQueryApprovalSummary,
  createUmbraOperationApprovalDisplay,
  createUmbraWithdrawApprovalSummary,
  getUmbraMixerProverStatus,
} from "./umbraOperations";
import { getUmbraExternalCapabilityProfile } from "./umbraCapabilityProfile";
import { planShieldRoute } from "./privacyRoutePlanner";
import { getVantaLocalCapabilityProfile } from "./vantaLocalAdapter";

export function getVantaUmbraBenchmarkSnapshot() {
  const vanta = getVantaLocalCapabilityProfile();
  const umbra = getUmbraExternalCapabilityProfile();
  const readiness = getUmbraRuntimeReadiness();
  const prover = getUmbraMixerProverStatus();
  const requester = "benchmark-review-wallet";
  const issuedAt = 1_776_900_000_000;
  const expiresAt = issuedAt + 2 * 60 * 1000;
  const sampleAsset = umbra.assets[0];
  const sampleMintAddress = sampleAsset?.mintAddress ?? "not applicable";

  return {
    nextBestStep:
      readiness.ready && prover.ready
        ? "Wire Umbra mixer create/claim flows behind the adapter."
        : "Use Umbra encrypted-balance registration, query, deposit, and withdraw as the first live benchmark lane while proving support remains gated.",
    profiles: {
      umbra,
      vanta,
    },
    prover,
    readiness,
    operationApprovalSamples: [
      createUmbraOperationApprovalDisplay(
        createUmbraEncryptedBalanceQueryApprovalSummary({
          expiresAt,
          issuedAt,
          mintAddresses: umbra.assets.map((asset) => asset.mintAddress),
          requester,
        }),
      ),
      createUmbraOperationApprovalDisplay(
        createUmbraDepositApprovalSummary({
          amountBaseUnits: 1n,
          expiresAt,
          issuedAt,
          mintAddress: sampleMintAddress,
          requester,
        }),
      ),
      createUmbraOperationApprovalDisplay(
        createUmbraWithdrawApprovalSummary({
          amountBaseUnits: 1n,
          expiresAt,
          issuedAt,
          mintAddress: sampleMintAddress,
          requester,
        }),
      ),
      createUmbraOperationApprovalDisplay(
        createUmbraClaimableUtxoScanApprovalSummary({
          expiresAt,
          issuedAt,
          requester,
          treeIndex: 0,
        }),
      ),
    ],
    routeSamples: umbra.assets.map((asset) =>
      planShieldRoute({
        amountBaseUnits: 1n,
        fromMintAddress: asset.mintAddress,
        preferUmbra: true,
        toMintAddress: asset.mintAddress,
      }),
    ),
  };
}
