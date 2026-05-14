import {
  getVantaPrivatePoolV2RoleServiceEntrypoint,
  startVantaPrivatePoolV2VerifierService,
} from "./private-pool-v2-service-network.mjs";

export const vantaPrivatePoolV2VerifierServiceEntrypoint =
  getVantaPrivatePoolV2RoleServiceEntrypoint("verifier");

await startVantaPrivatePoolV2VerifierService();
