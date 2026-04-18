import { useEffect, useMemo, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { endpoint } from "@/solana/client";
import { liveShieldAsset, liveSwapPair } from "@/solana/shieldConfig";

export type WalletPublicAsset = {
  balance: number;
  decimals: number;
  id: string;
  kind: "native" | "spl";
  label: string;
  mintAddress: string;
  symbol: string;
};

const SOL_ID = "native:SOL";

const KNOWN_ASSET_LABELS: Record<string, { label: string; symbol: string }> = {
  [liveSwapPair.solAssetId]: {
    label: "Solana",
    symbol: "SOL",
  },
};

if (liveShieldAsset.mintAddress) {
  KNOWN_ASSET_LABELS[liveShieldAsset.mintAddress] = {
    label: liveShieldAsset.name,
    symbol: liveShieldAsset.symbol,
  };
}

let cachedConnection: Connection | null = null;

function getConnection() {
  if (!cachedConnection) {
    cachedConnection = new Connection(endpoint, "confirmed");
  }

  return cachedConnection;
}

function abbreviateMint(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function useWalletPublicAssets(args: {
  solBalance: number | null;
  walletAddress: string | null;
}) {
  const [splAssets, setSplAssets] = useState<WalletPublicAsset[]>([]);
  const [splAssetsError, setSplAssetsError] = useState<string | null>(null);
  const [splAssetsLoading, setSplAssetsLoading] = useState(false);

  useEffect(() => {
    if (!args.walletAddress) {
      setSplAssets([]);
      setSplAssetsError(null);
      setSplAssetsLoading(false);
      return;
    }

    let cancelled = false;
    const owner = new PublicKey(args.walletAddress);

    const load = async () => {
      setSplAssetsLoading(true);
      setSplAssetsError(null);

      try {
        const connection = getConnection();
        const [legacyAccounts, token2022Accounts] = await Promise.all([
          connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
          connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
        ]);

        if (cancelled) {
          return;
        }

        const aggregate = new Map<string, WalletPublicAsset>();

        for (const account of [...legacyAccounts.value, ...token2022Accounts.value]) {
          const parsed = account.account.data.parsed;
          if (!parsed || parsed.type !== "account") {
            continue;
          }

          const info = parsed.info;
          const mintAddress = typeof info.mint === "string" ? info.mint : null;
          const tokenAmount = info.tokenAmount;
          const uiAmount = Number(tokenAmount?.uiAmount ?? 0);
          const decimals = Number(tokenAmount?.decimals ?? 0);

          if (!mintAddress || !Number.isFinite(uiAmount) || uiAmount <= 0) {
            continue;
          }

          const known = KNOWN_ASSET_LABELS[mintAddress];
          const existing = aggregate.get(mintAddress);

          if (existing) {
            aggregate.set(mintAddress, {
              ...existing,
              balance: Number((existing.balance + uiAmount).toFixed(Math.max(decimals, 6))),
            });
            continue;
          }

          aggregate.set(mintAddress, {
            balance: uiAmount,
            decimals,
            id: mintAddress,
            kind: "spl",
            label: known?.label ?? abbreviateMint(mintAddress),
            mintAddress,
            symbol: known?.symbol ?? abbreviateMint(mintAddress),
          });
        }

        const nextAssets = [...aggregate.values()].sort((left, right) => {
          const leftPriority = left.symbol === "VUSD" ? 0 : left.symbol === "SOL" ? 1 : 2;
          const rightPriority = right.symbol === "VUSD" ? 0 : right.symbol === "SOL" ? 1 : 2;

          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }

          return left.symbol.localeCompare(right.symbol);
        });

        setSplAssets(nextAssets);
        setSplAssetsLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSplAssets([]);
        setSplAssetsLoading(false);
        setSplAssetsError(
          error instanceof Error
            ? error.message
            : "Wallet token balances could not be loaded.",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.walletAddress]);

  const assets = useMemo(() => {
    const nextAssets: WalletPublicAsset[] = [];
    const hasNativeSolBalance = Number.isFinite(args.solBalance) && (args.solBalance ?? 0) > 0;

    if (hasNativeSolBalance) {
      nextAssets.push({
        balance: Number(args.solBalance ?? 0),
        decimals: 9,
        id: SOL_ID,
        kind: "native",
        label: "Solana",
        mintAddress: liveSwapPair.solAssetId,
        symbol: "SOL",
      });
    }

    for (const asset of splAssets) {
      if (hasNativeSolBalance && asset.mintAddress === liveSwapPair.solAssetId) {
        continue;
      }

      nextAssets.push(asset);
    }

    return nextAssets;
  }, [args.solBalance, splAssets]);

  return {
    assets,
    loading: splAssetsLoading,
    error: splAssetsError,
  };
}
