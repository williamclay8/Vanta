import {
  getVantaPrivatePoolV2RoleServiceEntrypoint,
  startVantaPrivatePoolV2RelayerService,
} from "./private-pool-v2-service-network.mjs";

export const vantaPrivatePoolV2RelayerServiceEntrypoint =
  getVantaPrivatePoolV2RoleServiceEntrypoint("relayer");

await startVantaPrivatePoolV2RelayerService();
