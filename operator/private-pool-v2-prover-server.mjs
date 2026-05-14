import {
  getVantaPrivatePoolV2RoleServiceEntrypoint,
  startVantaPrivatePoolV2ProverService,
} from "./private-pool-v2-service-network.mjs";

export const vantaPrivatePoolV2ProverServiceEntrypoint =
  getVantaPrivatePoolV2RoleServiceEntrypoint("prover");

await startVantaPrivatePoolV2ProverService();
