import type { VantaPrivatePoolV2Prover } from "./privatePoolV2Types";
import {
  createVantaPrivatePoolV2LocalProver,
  VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND,
} from "./privatePoolV2LocalProver";
import {
  createVantaPrivatePoolV2RemoteProver,
} from "./privatePoolV2RemoteServices";

export const VANTA_PRIVATE_POOL_V2_PRODUCTION_PROVER_FACTORY_VERSION =
  "vanta-private-pool-v2-production-prover-factory-0.1" as const;

export type VantaPrivatePoolV2ProductionProverMode =
  | "remote-service"
  | "browser-worker-scaffold"
  | "local-mock-explicit"
  | "blocked";

export type VantaPrivatePoolV2ProductionProverPolicy = {
  version: typeof VANTA_PRIVATE_POOL_V2_PRODUCTION_PROVER_FACTORY_VERSION;
  h08ProductionProverReady: false;
  productionBrowserRuntimeProverReady: false;
  productionRemoteProverReady: false;
  privacyClaimAllowed: false;
  selectedRuntimeDirection: "remote-service-production-prover";
  mockDefaultBlockedInProduction: true;
  allowedMockBackend: typeof VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND;
  guardCommand: "npm run private-pool-v2:production-prover-factory-check";
  truthBoundary: string;
};

function readProcessEnv(name: string): string | null {
  if (typeof process === "undefined" || !process.env) {
    return null;
  }

  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readViteEnv(name: string): string | null {
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  const value = meta.env?.[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isProductionSurface() {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return true;
  }

  const meta = import.meta as unknown as { env?: { PROD?: boolean } };
  return Boolean(meta.env?.PROD);
}

export function getVantaPrivatePoolV2ProductionProverPolicy(): VantaPrivatePoolV2ProductionProverPolicy {
  return {
    version: VANTA_PRIVATE_POOL_V2_PRODUCTION_PROVER_FACTORY_VERSION,
    h08ProductionProverReady: false,
    productionBrowserRuntimeProverReady: false,
    productionRemoteProverReady: false,
    privacyClaimAllowed: false,
    selectedRuntimeDirection: "remote-service-production-prover",
    mockDefaultBlockedInProduction: true,
    allowedMockBackend: VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND,
    guardCommand: "npm run private-pool-v2:production-prover-factory-check",
    truthBoundary:
      "Production proving routes to remote-service when configured. Browser-worker and local-bb paths remain dev scaffolding until H08 runtime acceptance and C01 verifier evidence pass. Local-mock is explicit opt-in only.",
  };
}

export function resolveVantaPrivatePoolV2ProductionProverMode(args: {
  allowLocalMock?: boolean;
  browserWorkerAvailable?: boolean;
  proverUrl?: string | null;
  proverAuthToken?: string | null;
} = {}): VantaPrivatePoolV2ProductionProverMode {
  const proverUrl =
    args.proverUrl ??
    readProcessEnv("VANTA_PRIVATE_POOL_V2_PROVER_URL") ??
    readViteEnv("VITE_VANTA_PRIVATE_POOL_V2_PROVER_URL");
  const proverAuthToken =
    args.proverAuthToken ?? readProcessEnv("VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN");

  if (proverUrl && proverAuthToken) {
    return "remote-service";
  }

  if (args.browserWorkerAvailable) {
    return "browser-worker-scaffold";
  }

  const allowLocalMock =
    args.allowLocalMock ??
    (readProcessEnv("VANTA_ALLOW_MOCK_PROVER") === "1" ||
      readViteEnv("VITE_VANTA_ALLOW_MOCK_PROVER") === "1" ||
      readViteEnv("VITE_VANTA_ALLOW_MOCK_PROVER") === "true");

  if (allowLocalMock && !isProductionSurface()) {
    return "local-mock-explicit";
  }

  return "blocked";
}

export function createVantaPrivatePoolV2ProductionProver(args: {
  allowLocalMock?: boolean;
  browserWorkerAvailable?: boolean;
  fetchImpl?: typeof fetch;
  proverAuthToken?: string | null;
  proverUrl?: string | null;
} = {}): VantaPrivatePoolV2Prover | null {
  const mode = resolveVantaPrivatePoolV2ProductionProverMode(args);

  if (mode === "remote-service") {
    return createVantaPrivatePoolV2RemoteProver({
      authToken:
        args.proverAuthToken ??
        readProcessEnv("VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN") ??
        "",
      baseUrl:
        args.proverUrl ??
        readProcessEnv("VANTA_PRIVATE_POOL_V2_PROVER_URL") ??
        readViteEnv("VITE_VANTA_PRIVATE_POOL_V2_PROVER_URL") ??
        "",
      fetchImpl: args.fetchImpl,
    });
  }

  if (mode === "local-mock-explicit") {
    return createVantaPrivatePoolV2LocalProver({ enabled: true });
  }

  return null;
}
