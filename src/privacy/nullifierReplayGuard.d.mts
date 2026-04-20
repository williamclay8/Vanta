export type VantaNullifierReplayRecord = {
  context: string;
  nullifier: string;
  recordedAt: string;
  requestId: string;
};

export type VantaNullifierReplayDecision =
  | {
      accepted: true;
      idempotent: boolean;
      reason: "idempotent-nullifier-reservation" | "nullifier-reserved";
      record: VantaNullifierReplayRecord;
      replay: false;
    }
  | {
      accepted: false;
      existing: VantaNullifierReplayRecord;
      reason: "conflicting-nullifier-replay";
      replay: true;
    };

export type VantaNullifierReplayCheckDecision =
  | (VantaNullifierReplayDecision & { mutated: false })
  | {
      accepted: true;
      idempotent: false;
      mutated: false;
      reason: "nullifier-available";
      replay: false;
    };

export type VantaNullifierReplayGuard = {
  check(input: {
    context: string;
    nullifier: string;
    requestId: string;
  }): VantaNullifierReplayCheckDecision;
  kind: "vanta-nullifier-replay-guard";
  productionReady: false;
  reserve(input: {
    context: string;
    nullifier: string;
    requestId: string;
  }): VantaNullifierReplayDecision;
  snapshot(): VantaNullifierReplayRecord[];
};

export function createNullifierReplayGuard(options?: {
  initialRecords?: VantaNullifierReplayRecord[];
  now?: () => Date;
}): VantaNullifierReplayGuard;
