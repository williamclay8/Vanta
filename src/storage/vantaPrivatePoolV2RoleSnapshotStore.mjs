import { createJsonSnapshotStore } from "./vantaJsonSnapshotStore.mjs";
import { createPostgresSnapshotStore } from "./vantaPostgresSnapshotStore.mjs";

const roleDefaults = {
  indexer: { commitments: [], nullifiers: [] },
  prover: { proofs: [] },
  relayer: { claims: [], quotes: [] },
  verifier: { acceptedProofs: [] },
};

function assertKnownRole(role) {
  if (!Object.hasOwn(roleDefaults, role)) {
    throw new Error(`Unknown Private Pool v2 role ${role}.`);
  }
}

export async function createPrivatePoolV2RoleSnapshotStore({
  client,
  databaseUrl = process.env.VANTA_PRIVATE_POOL_V2_DATABASE_URL,
  role,
  runtimeEnvironment = process.env.NODE_ENV,
  stateVersion = 1,
  storePath,
  tableName = "vanta_private_pool_v2_role_snapshots",
}) {
  assertKnownRole(role);

  const defaultSnapshot = roleDefaults[role];

  if (databaseUrl) {
    return await createPostgresSnapshotStore({
      client,
      databaseUrl,
      defaultSnapshot,
      stateVersion,
      storeKey: `vanta-private-pool-v2:${role}`,
      tableName,
    });
  }

  return createJsonSnapshotStore({
    defaultSnapshot,
    path: storePath,
    runtimeEnvironment,
    stateVersion,
  });
}

export function privatePoolV2RoleDefaultSnapshot(role) {
  assertKnownRole(role);
  return structuredClone(roleDefaults[role]);
}
