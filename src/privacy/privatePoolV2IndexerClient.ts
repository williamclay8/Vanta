export const VANTA_PRIVATE_POOL_V2_INDEXER_CLIENT_VERSION =
  "vanta-private-pool-v2-indexer-client-0.1" as const;

export const VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID =
  "vanta-private-pool-v2-unified-tree-v1" as const;

export const VANTA_PRODUCTION_PRIVATE_POOL_V2_INDEXER_URL =
  "https://vanta-prod-private-pool-v2-indexer.onrender.com" as const;

export type VantaPrivatePoolV2NativeSolShieldIngestRequest = {
  amount: string;
  commitment: string;
  depositMemo: string;
  depositSignature: string;
  isLegacyMigration?: boolean;
  originalAssetId?: string;
  owner: string;
  treeId?: string;
  vaultOwner: string;
};

export type VantaPrivatePoolV2NativeSolShieldIngestResult = {
  indexerBaseUrl: string;
  phase1MigrationNote?: string;
  responseBody?: unknown;
  responseStatus: number;
  success: boolean;
  error?: string;
  isTransientNetworkError?: boolean;
};

function readViteEnv(name: string): string | null {
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  const value = meta.env?.[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isHostedBrowserSurface() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return (
    hostname === "vantaprivacy.xyz" ||
    hostname === "www.vantaprivacy.xyz" ||
    hostname.endsWith(".onrender.com")
  );
}

export function resolveVantaPrivatePoolV2IndexerBaseUrl(explicitBaseUrl?: string | null): string | null {
  if (typeof explicitBaseUrl === "string" && explicitBaseUrl.trim().length > 0) {
    return explicitBaseUrl.trim().replace(/\/+$/, "");
  }

  const viteIndexerUrl = readViteEnv("VITE_VANTA_PRIVATE_POOL_V2_INDEXER_URL");
  if (viteIndexerUrl) {
    return viteIndexerUrl.replace(/\/+$/, "");
  }

  if (isHostedBrowserSurface()) {
    return VANTA_PRODUCTION_PRIVATE_POOL_V2_INDEXER_URL;
  }

  const meta = import.meta as unknown as { env?: { PROD?: boolean } };
  if (meta.env?.PROD) {
    return VANTA_PRODUCTION_PRIVATE_POOL_V2_INDEXER_URL;
  }

  return null;
}

function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|load failed|timeout|timed out|econnreset|enotfound/i.test(
    message,
  );
}

export async function ingestVantaPrivatePoolV2NativeSolShieldDeposit(args: {
  amount: string;
  commitment: string;
  depositMemo: string;
  depositSignature: string;
  indexerBaseUrl?: string | null;
  isLegacyMigration?: boolean;
  originalAssetId?: string;
  owner: string;
  treeId?: string;
  vaultOwner: string;
  maxRetries?: number;
}): Promise<VantaPrivatePoolV2NativeSolShieldIngestResult> {
  const base = resolveVantaPrivatePoolV2IndexerBaseUrl(args.indexerBaseUrl);
  if (!base) {
    return {
      success: false,
      error: "Private Pool v2 indexer base URL is not configured.",
      indexerBaseUrl: "",
      responseStatus: 0,
    };
  }

  const body: VantaPrivatePoolV2NativeSolShieldIngestRequest = {
    amount: args.amount,
    commitment: args.commitment,
    depositMemo: args.depositMemo,
    depositSignature: args.depositSignature,
    owner: args.owner,
    treeId: args.treeId ?? VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID,
    vaultOwner: args.vaultOwner,
    ...(args.isLegacyMigration ? { isLegacyMigration: true } : {}),
    ...(args.originalAssetId ? { originalAssetId: args.originalAssetId } : {}),
  };

  const maxRetries = args.maxRetries ?? 3;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const response = await fetch(`${base}/v1/ingest-native-sol-shield-deposit`, {
        body: JSON.stringify(body),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text();
        let phase1MigrationNote: string | undefined;
        try {
          const json = JSON.parse(text);
          phase1MigrationNote =
            typeof json?.phase1MigrationNote === "string" ? json.phase1MigrationNote : undefined;
        } catch {
          phase1MigrationNote = undefined;
        }
        return {
          success: false,
          error: text || `Indexer ingestion failed with status ${response.status}.`,
          indexerBaseUrl: base,
          phase1MigrationNote,
          responseStatus: response.status,
        };
      }

      let responseBody: unknown = null;
      let phase1MigrationNote: string | undefined;
      try {
        responseBody = await response.json();
        if (
          responseBody &&
          typeof responseBody === "object" &&
          "phase1MigrationNote" in responseBody &&
          typeof (responseBody as { phase1MigrationNote?: unknown }).phase1MigrationNote === "string"
        ) {
          phase1MigrationNote = (responseBody as { phase1MigrationNote: string }).phase1MigrationNote;
        }
      } catch {
        responseBody = null;
      }

      return {
        success: true,
        indexerBaseUrl: base,
        phase1MigrationNote,
        responseBody,
        responseStatus: response.status,
      };
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt === maxRetries - 1) {
        break;
      }
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
    indexerBaseUrl: base,
    isTransientNetworkError: isTransientNetworkError(lastError),
    responseStatus: 0,
  };
}
