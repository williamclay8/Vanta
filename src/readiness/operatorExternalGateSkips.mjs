import { readFileSync } from "node:fs";

const skipsPath = new URL("../../ops/mainnet/operator-external-gate-skips.evidence.json", import.meta.url);

let cachedSkips = null;

export function createOperatorExternalGateSkips() {
  if (!cachedSkips) {
    cachedSkips = JSON.parse(readFileSync(skipsPath, "utf8"));
  }
  return cachedSkips;
}

export function getRemovedActiveBlockerIds() {
  return new Set(createOperatorExternalGateSkips().removedActiveBlockerIds ?? []);
}

export function filterActiveBlockers(blockers) {
  const removed = getRemovedActiveBlockerIds();
  return blockers.filter((blocker) => !removed.has(blocker));
}

export function isActiveBlockerRemoved(blockerId) {
  return getRemovedActiveBlockerIds().has(blockerId);
}

export function isOperatorSkippedExternalArtifactProducerStatus(status) {
  return status === "operator-skipped-external-artifact-producer";
}

export function isOperatorSkippedControlStatus(status) {
  return status === "operator-skipped-control";
}
