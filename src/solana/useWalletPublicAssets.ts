import { useEffect, useMemo, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { endpoint } from "@/solana/client";
import {
  getLiveShieldTokenAssetPriority,
  listLiveShieldTokenAssets,
  liveSwapPair,
  vantaSolanaCluster,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { listPublicRouteInputAssets } from "@/solana/publicRouteInputAssets";

export type WalletPublicAsset = {
  balance: number;
  balanceStatus?: "error" | "loading" | "ready";
  decimals: number;
  id: string;
  kind: "native" | "spl";
  label: string;
  mintAddress: string;
  symbol: string;
};

const SOL_ID = "native:SOL";
const METAPLEX_TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

const KNOWN_ASSET_LABELS: Record<string, { label: string; symbol: string }> = {
  [liveSwapPair.solAssetId]: {
    label: "Solana",
    symbol: "SOL",
  },
};

for (const asset of listLiveShieldTokenAssets({ configuredOnly: false })) {
  if (!asset.mintAddress) {
    continue;
  }

  KNOWN_ASSET_LABELS[asset.mintAddress] = {
    label: asset.name,
    symbol: asset.symbol,
  };
}

for (const asset of listPublicRouteInputAssets()) {
  KNOWN_ASSET_LABELS[asset.mintAddress] = {
    label: asset.name,
    symbol: asset.symbol,
  };
}

let cachedConnection: Connection | null = null;
const cachedFallbackConnections = new Map<string, Connection>();

function getConnection() {
  if (!cachedConnection) {
    cachedConnection = new Connection(endpoint, "confirmed");
  }

  return cachedConnection;
}

function getFallbackConnection(fallbackEndpoint: string) {
  const cached = cachedFallbackConnections.get(fallbackEndpoint);

  if (cached) {
    return cached;
  }

  const connection = new Connection(fallbackEndpoint, "confirmed");
  cachedFallbackConnections.set(fallbackEndpoint, connection);
  return connection;
}

function getConfiguredWalletReadFallbackEndpoints() {
  const configured = import.meta.env.VITE_SOLANA_READ_RPC_FALLBACK_URLS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
  const defaults =
    vantaSolanaCluster === "mainnet-beta"
      ? ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"]
      : ["https://api.devnet.solana.com"];

  return [...new Set([...configured, ...defaults].filter((value) => value !== endpoint))];
}

function abbreviateMint(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatUnknownWalletAssetLabel(mintAddress: string) {
  return `Unknown token (${abbreviateMint(mintAddress)})`;
}

function formatWalletAssetLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("403") || message.toLowerCase().includes("access forbidden")) {
    return "Wallet balance recovery is temporarily blocked by the Solana RPC endpoint.";
  }

  return "Wallet token balances could not be loaded.";
}

function isShieldableSplTokenAmount(args: { decimals: number; uiAmount: number }) {
  return Number.isFinite(args.uiAmount) && args.uiAmount > 0 && args.decimals > 0;
}

function readTokenUiAmount(tokenAmount: { uiAmount?: unknown; uiAmountString?: unknown }) {
  const numericAmount = Number(tokenAmount.uiAmount);

  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    return numericAmount;
  }

  const stringAmount =
    typeof tokenAmount.uiAmountString === "string" ? Number(tokenAmount.uiAmountString) : NaN;

  return Number.isFinite(stringAmount) ? stringAmount : 0;
}

function cleanTokenMetadataText(value: string | null | undefined) {
  const cleaned = value?.replace(/\0/gu, "").trim();
  return cleaned ? cleaned : null;
}

function createWalletTokenLabel(metadata: {
  name?: string | null;
  symbol?: string | null;
}) {
  const name = cleanTokenMetadataText(metadata.name);
  const symbol = cleanTokenMetadataText(metadata.symbol);

  if (name && symbol && name !== symbol) {
    return { label: name, symbol };
  }

  if (symbol) {
    return { label: symbol, symbol };
  }

  if (name) {
    return { label: name, symbol: name };
  }

  return null;
}

function readMetaplexString(data: Buffer, offset: number) {
  if (offset + 4 > data.length) {
    return null;
  }

  const length = data.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + length;

  if (length > 256 || end > data.length) {
    return null;
  }

  return {
    nextOffset: end,
    value: new TextDecoder().decode(data.subarray(start, end)),
  };
}

function parseMetaplexTokenMetadata(data: Buffer) {
  let offset = 1 + 32 + 32;
  const name = readMetaplexString(data, offset);

  if (!name) {
    return null;
  }

  offset = name.nextOffset;
  const symbol = readMetaplexString(data, offset);

  if (!symbol) {
    return null;
  }

  return createWalletTokenLabel({
    name: name.value,
    symbol: symbol.value,
  });
}

async function resolveToken2022MetadataLabel(
  connection: Connection,
  mint: PublicKey,
) {
  try {
    const metadata = await getTokenMetadata(
      connection,
      mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );
    return metadata
      ? createWalletTokenLabel({
          name: metadata.name,
          symbol: metadata.symbol,
        })
      : null;
  } catch {
    return null;
  }
}

async function resolveMetaplexMetadataLabel(connection: Connection, mint: PublicKey) {
  try {
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METAPLEX_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    );
    const account = await connection.getAccountInfo(metadataAddress, "confirmed");

    return account?.data ? parseMetaplexTokenMetadata(account.data) : null;
  } catch {
    return null;
  }
}

async function resolveWalletTokenMetadataLabels(
  connection: Connection,
  mintAddresses: readonly string[],
) {
  const entries = await Promise.all(
    mintAddresses.map(async (mintAddress) => {
      try {
        const mint = new PublicKey(mintAddress);
        const label =
          (await resolveToken2022MetadataLabel(connection, mint)) ??
          (await resolveMetaplexMetadataLabel(connection, mint));

        return label ? [mintAddress, label] as const : null;
      } catch {
        return null;
      }
    }),
  );

  return new Map(
    entries.filter(
      (
        entry,
      ): entry is readonly [string, { label: string; symbol: string }] =>
        Boolean(entry),
    ),
  );
}

function getAssetSortPriority(symbol: string) {
  if (symbol === "SOL") {
    return 100;
  }

  try {
    return getLiveShieldTokenAssetPriority(symbol as LiveShieldTokenAssetKey);
  } catch {
    return 1000;
  }
}

async function getParsedTokenAccountsByOwnerWithFallback(owner: PublicKey) {
  const connections = [
    getConnection(),
    ...getConfiguredWalletReadFallbackEndpoints().map((fallbackEndpoint) =>
      getFallbackConnection(fallbackEndpoint),
    ),
  ];
  let lastError: unknown = null;

  for (const connection of connections) {
    try {
      const [legacyAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
      ]);

      return { connection, legacyAccounts, token2022Accounts };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Wallet token balances could not be loaded.");
}

export function useWalletPublicAssets(args: {
  solBalance: number | null;
  solBalanceError?: string | null;
  solBalanceFetching?: boolean;
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
        const { connection, legacyAccounts, token2022Accounts } =
          await getParsedTokenAccountsByOwnerWithFallback(owner);

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
          const uiAmount = readTokenUiAmount(tokenAmount ?? {});
          const decimals = Number(tokenAmount?.decimals ?? 0);

          if (!mintAddress || !isShieldableSplTokenAmount({ decimals, uiAmount })) {
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
            label: known?.label ?? formatUnknownWalletAssetLabel(mintAddress),
            mintAddress,
            symbol: known?.symbol ?? formatUnknownWalletAssetLabel(mintAddress),
          });
        }

        const unknownMintAddresses = [...aggregate.values()]
          .filter((asset) => !KNOWN_ASSET_LABELS[asset.mintAddress])
          .map((asset) => asset.mintAddress);
        const metadataLabels = await resolveWalletTokenMetadataLabels(
          connection,
          unknownMintAddresses,
        );
        const nextAssets = [...aggregate.values()]
          .map((asset) => {
            const metadataLabel = metadataLabels.get(asset.mintAddress);
            return metadataLabel
              ? {
                  ...asset,
                  label: metadataLabel.label,
                  symbol: metadataLabel.symbol,
                }
              : asset;
          })
          .sort((left, right) => {
            const leftPriority = getAssetSortPriority(left.symbol);
            const rightPriority = getAssetSortPriority(right.symbol);

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
        setSplAssetsError(formatWalletAssetLoadError(error));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.walletAddress]);

  const assets = useMemo(() => {
    const nextAssets: WalletPublicAsset[] = [];
    const hasConnectedWallet = Boolean(args.walletAddress);

    if (hasConnectedWallet) {
      const nativeSolBalanceStatus =
        args.solBalanceError
          ? "error"
          : args.solBalanceFetching || args.solBalance === null
            ? "loading"
            : "ready";

      nextAssets.push({
        balance: Number(args.solBalance ?? 0),
        balanceStatus: nativeSolBalanceStatus,
        decimals: 9,
        id: SOL_ID,
        kind: "native",
        label: "Solana",
        mintAddress: liveSwapPair.solAssetId,
        symbol: "SOL",
      });
    }

    for (const asset of splAssets) {
      if (hasConnectedWallet && asset.mintAddress === liveSwapPair.solAssetId) {
        continue;
      }

      nextAssets.push(asset);
    }

    return nextAssets;
  }, [
    args.solBalance,
    args.solBalanceError,
    args.solBalanceFetching,
    args.walletAddress,
    splAssets,
  ]);

  return {
    assets,
    loading: splAssetsLoading || Boolean(args.solBalanceFetching),
    error: splAssetsError ?? args.solBalanceError ?? null,
  };
}
