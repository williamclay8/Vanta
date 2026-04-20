export type SafeTelemetryRequestContext = {
  method: string;
  path: string;
  queryPresent: boolean;
  remoteAddressHash: string;
  requestId: string;
  service: string;
  startedAtMs: number;
  version: "vanta-safe-telemetry-0.1";
};

export type SafeTelemetryEvent = Record<string, unknown> & {
  event: string;
  service?: string;
  version: "vanta-safe-telemetry-0.1";
};

export function sanitizeTelemetryFields<T>(value: T): T;

export function createSafeTelemetryRequestContext(input: {
  now?: () => number;
  request: {
    headers?: Record<string, string | string[] | undefined>;
    method?: string;
    socket?: {
      remoteAddress?: string;
    };
    url?: string;
  };
  service: string;
}): SafeTelemetryRequestContext;

export function createOperatorStartupTelemetryEvent(input: {
  service: string;
  storageKind?: string;
}): SafeTelemetryEvent;

export function createOperatorHttpRequestTelemetryEvent(input: {
  context: SafeTelemetryRequestContext;
  now?: () => number;
  statusCode?: number;
}): SafeTelemetryEvent;

export function writeSafeTelemetryEvent(
  event: SafeTelemetryEvent,
  logger?: (line: string) => void,
): void;

export function observeSafeTelemetryResponse(input: {
  context: SafeTelemetryRequestContext;
  logger?: (line: string) => void;
  now?: () => number;
  response: {
    end: (...args: unknown[]) => unknown;
    statusCode?: number;
  };
}): unknown;
