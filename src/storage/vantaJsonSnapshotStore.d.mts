export type VantaJsonSnapshotStore<TSnapshot> =
  | {
      kind: "disabled-snapshot-store";
      load(): TSnapshot | undefined;
      path: null;
      productionReady: false;
      save(snapshot: TSnapshot): void;
      createBackup(path: string): never;
      restoreBackup(path: string): never;
    }
  | {
      kind: "local-json-snapshot-store";
      createBackup(path: string): {
        kind: "local-json-snapshot-backup";
        path: string;
        stateVersion: number | undefined;
      };
      load(): TSnapshot | undefined;
      path: string;
      productionReady: false;
      restoreBackup(path: string): {
        kind: "local-json-snapshot-restore";
        path: string;
        stateVersion: number | undefined;
      };
      save(snapshot: TSnapshot): void;
    };

export function createJsonSnapshotStore<TSnapshot>({
  allowInProduction,
  defaultSnapshot,
  path,
  runtimeEnvironment,
  stateVersion,
}: {
  allowInProduction?: boolean;
  defaultSnapshot?: TSnapshot;
  path?: string | null;
  runtimeEnvironment?: string;
  stateVersion?: number;
}): VantaJsonSnapshotStore<TSnapshot>;
