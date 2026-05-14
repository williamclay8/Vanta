import {
  getVantaPrivatePoolV2RoleServiceEntrypoint,
  startVantaPrivatePoolV2IndexerService,
} from "./private-pool-v2-service-network.mjs";

export const vantaPrivatePoolV2IndexerServiceEntrypoint =
  getVantaPrivatePoolV2RoleServiceEntrypoint("indexer");

await startVantaPrivatePoolV2IndexerService();
