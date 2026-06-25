export const VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_HARNESS_VERSION: string;
export const VANTA_SOLANA_PRIVACY_SUITE_OFFLINE_CLAIM_BOUNDARY: string;

export interface OfflineSimulationGateInput {
  builderKind: string;
  instructions: Array<Record<string, unknown>>;
  simulation: {
    status: "passed" | "failed" | string;
  };
  sourceTier: string;
}

export interface OfflineHarnessDecision {
  accepted: boolean;
  builderKind: string;
  claimBoundary: string;
  liveAuthority: false;
  nextAction: string;
  sourceTier: string;
  status: "offline-review-ready" | "blocked-simulation-failed";
  submitReady: false;
  version: string;
}

export interface MockJitoRelayStateMachine {
  claimBoundary: string;
  feeLamports: number;
  feePolicy: "fixture-only-priority-fee";
  finalStatus: "blocked-no-live-relay";
  liveAuthority: false;
  relays: Array<{
    relayId: string;
    status: "mocked-no-live-relay";
  }>;
  submitReady: false;
  version: string;
}

export interface RedactedLaserStreamEvent {
  discriminatorHash: string;
  eventId: string;
  programLabel: string;
  slot: number;
  status: "redacted-fixture-replayed";
  version: string;
}

export interface OfflineMetricSchema {
  claimBoundary: string;
  labels: Record<string, string>;
  metric: "vanta_solana_privacy_suite_offline_fixture";
  version: string;
}

export interface OfflineMcpPermissionCanary {
  claimBoundary: string;
  decision: "denied" | "read-only-data";
  reason: string;
  sourceTextAcceptedAsData: boolean;
  toolCallAllowed: false;
  version: string;
}

export interface NoSignSigner {
  canSign: false;
  kind: "vanta-offline-no-sign-signer";
  label: string;
  sign(): never;
  signTransaction(): never;
  version: string;
}

export function createNoSignSigner(input?: { label?: string }): NoSignSigner;
export function evaluateOfflineSimulationGate(input: OfflineSimulationGateInput): OfflineHarnessDecision;
export function buildMockJitoRelayStateMachine(input: {
  feeLamports: number;
  relays: Array<{ relayId: string }>;
}): MockJitoRelayStateMachine;
export function replayRedactedLaserStreamFixtures(
  events: Array<Record<string, unknown>>,
): RedactedLaserStreamEvent[];
export function buildOfflineMetricSchema(labels: Record<string, string>): OfflineMetricSchema;
export function buildDeterministicRetrySchedule(input?: {
  attempts?: number;
  baseDelayMs?: number;
  jitterSequence?: number[];
}): Array<{ attempt: number; delayMs: number; sleeps: false }>;
export function evaluateOfflineMcpPermissionCanary(input: {
  requestedAction: string;
  sourceText?: string;
}): OfflineMcpPermissionCanary;
export function buildSolanaPrivacySuiteOfflineHarnessReport(input: Record<string, unknown>): {
  claimBoundary: string;
  jito: MockJitoRelayStateMachine;
  laserStreamEventCount: number;
  liveAuthority: false;
  mcpCanary: OfflineMcpPermissionCanary;
  metricSchema: OfflineMetricSchema;
  retrySchedule: Array<{ attempt: number; delayMs: number; sleeps: false }>;
  simulationGate: OfflineHarnessDecision;
  status: "offline-harness-fixture-verified";
  submitReady: false;
  version: string;
};
