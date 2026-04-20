import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function normalizeJsonValue(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeJsonValue(nestedValue)]),
    );
  }

  return value;
}

export function createJsonSnapshotStore({
  allowInProduction = false,
  defaultSnapshot,
  path,
  runtimeEnvironment = process.env.NODE_ENV,
  stateVersion,
}) {
  if (!path) {
    return {
      kind: "disabled-snapshot-store",
      path: null,
      productionReady: false,
      load() {
        return defaultSnapshot;
      },
      save() {},
      createBackup() {
        throw new Error("Cannot create a backup because the snapshot store is disabled.");
      },
      restoreBackup() {
        throw new Error("Cannot restore a backup because the snapshot store is disabled.");
      },
    };
  }

  if (runtimeEnvironment === "production" && !allowInProduction) {
    throw new Error(
      "Local JSON snapshot stores are not production storage. Use a production database adapter instead.",
    );
  }

  const storePath = resolve(path);

  return {
    kind: "local-json-snapshot-store",
    path: storePath,
    productionReady: false,

    load() {
      if (!existsSync(storePath)) {
        return defaultSnapshot;
      }

      return JSON.parse(readFileSync(storePath, "utf8"));
    },

    save(snapshot) {
      mkdirSync(dirname(storePath), { recursive: true });
      const payload = normalizeJsonValue({
        ...snapshot,
        stateVersion: snapshot?.stateVersion ?? stateVersion,
        updatedAt: new Date().toISOString(),
      });
      const tempPath = `${storePath}.${process.pid}.tmp`;
      writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`);
      renameSync(tempPath, storePath);
    },

    createBackup(path) {
      if (!existsSync(storePath)) {
        this.save(defaultSnapshot ?? { stateVersion });
      }

      const backupPath = resolve(path);
      mkdirSync(dirname(backupPath), { recursive: true });
      copyFileSync(storePath, backupPath);
      const snapshot = JSON.parse(readFileSync(backupPath, "utf8"));

      return {
        kind: "local-json-snapshot-backup",
        path: backupPath,
        stateVersion: snapshot.stateVersion ?? stateVersion,
      };
    },

    restoreBackup(path) {
      const backupPath = resolve(path);
      if (!existsSync(backupPath)) {
        throw new Error(`Snapshot backup does not exist: ${backupPath}`);
      }

      mkdirSync(dirname(storePath), { recursive: true });
      const tempPath = `${storePath}.${process.pid}.restore.tmp`;
      copyFileSync(backupPath, tempPath);
      renameSync(tempPath, storePath);
      const snapshot = JSON.parse(readFileSync(storePath, "utf8"));

      return {
        kind: "local-json-snapshot-restore",
        path: storePath,
        stateVersion: snapshot.stateVersion ?? stateVersion,
      };
    },
  };
}
