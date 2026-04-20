import { createJsonSnapshotStore } from "./vantaJsonSnapshotStore.mjs";
import { createPostgresSnapshotStore } from "./vantaPostgresSnapshotStore.mjs";

const roleDefaults = {
  indexer: { commitments: [], nullifiers: [] },
  prover: { proofs: [] },
  relayer: { claims: [], quotes: [] },
  verifier: { acceptedProofs: [] },
};

const roleDatabaseEnv = {
  indexer: "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL",
  prover: "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL",
  relayer: "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
  verifier: "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL",
};

function assertKnownRole(role) {
  if (!Object.hasOwn(roleDefaults, role)) {
    throw new Error(`Unknown Private Pool v2 role ${role}.`);
  }
}

export async function createPrivatePoolV2RoleSnapshotStore({
  client,
  databaseUrl,
  role,
  runtimeEnvironment = process.env.NODE_ENV,
  stateVersion = 1,
  storePath,
  tableName = "vanta_private_pool_v2_role_snapshots",
}) {
  assertKnownRole(role);

  const defaultSnapshot = roleDefaults[role];
  const resolvedDatabaseUrl =
    databaseUrl ?? process.env[roleDatabaseEnv[role]] ?? process.env.VANTA_PRIVATE_POOL_V2_DATABASE_URL;

  if (resolvedDatabaseUrl) {
    return await createPostgresSnapshotStore({
      client,
      databaseUrl: resolvedDatabaseUrl,
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

export function privatePoolV2RoleDatabaseEnv(role) {
  assertKnownRole(role);
  return roleDatabaseEnv[role];
}
