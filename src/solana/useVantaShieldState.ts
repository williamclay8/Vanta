import { liveShieldAsset } from "@/solana/shieldConfig";
import { useVantaShieldAssetState } from "@/solana/useVantaShieldAssetState";

export function useVantaShieldState() {
  return useVantaShieldAssetState({
    includeLocallyReleasedSolNotes: true,
    mintAddress: liveShieldAsset.mintAddress,
    vaultOwner: liveShieldAsset.vaultOwner,
  });
}
