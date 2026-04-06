import { useCallback, useEffect, useState } from "react";
import { useSolanaClient } from "@solana/react-hooks";
import { useWalletState } from "@/context/WalletContext";
import { liveShieldAsset } from "@/solana/shieldConfig";
import {
  fetchVantaShieldAccountState,
  type VantaShieldAccountState,
} from "@/solana/vantaShieldState";

type VantaShieldStateResult = {
  account: VantaShieldAccountState | null;
  error: string | null;
  isReady: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function useVantaShieldState(): VantaShieldStateResult {
  const client = useSolanaClient();
  const { walletAddress, walletConnected } = useWalletState();
  const [account, setAccount] = useState<VantaShieldAccountState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (
      !walletConnected ||
      !walletAddress ||
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner
    ) {
      setAccount(null);
      setError(null);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const nextAccount = await fetchVantaShieldAccountState({
        client,
        mintAddress: liveShieldAsset.mintAddress,
        owner: walletAddress,
        vaultOwner: liveShieldAsset.vaultOwner,
      });
      setAccount(nextAccount);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load Vanta shield state from devnet.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [client, walletAddress, walletConnected]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    account,
    error,
    isReady: Boolean(
      walletConnected &&
        walletAddress &&
        liveShieldAsset.mintAddress &&
        liveShieldAsset.vaultOwner,
    ),
    isRefreshing,
    refresh,
  };
}
