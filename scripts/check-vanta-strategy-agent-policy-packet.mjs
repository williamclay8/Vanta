import { strict as assert } from "node:assert";
import {
  createStrategyAgentPolicyPacket,
  validateStrategyAgentPolicyPacket,
} from "../src/strategy/strategyTradingLab.ts";

const packet = createStrategyAgentPolicyPacket({
  allowedAssets: ["SOL", "JUP"],
  approvalExpiresAt: "2026-05-02T20:00:00.000Z",
  humanApprovalRequired: true,
  maxNotional: 25_000,
  maxSlippageBps: 75,
  principalRef: "wallet:clay-preview",
  routeQuoteCommitmentRefs: ["route-quote:abc123"],
  simulationRef: "simulation:paper-001",
  strategyIntentRef: "strategy-intent:preview-001",
  walletScope: "connected-wallet-preview",
});

assert.equal(packet.liveSubmission, false);
assert.equal(packet.policyMode, "research_only");
assert.equal(packet.humanApprovalRequired, true);
assert.deepEqual(validateStrategyAgentPolicyPacket(packet), {
  ok: true,
  blockingIssues: [],
});

const unsafePacket = {
  ...packet,
  liveSubmission: true,
};

assert.deepEqual(validateStrategyAgentPolicyPacket(unsafePacket), {
  ok: false,
  blockingIssues: ["Trading Lab policy packets must keep liveSubmission=false until production gates pass."],
});

assert.throws(
  () =>
    createStrategyAgentPolicyPacket({
      allowedAssets: ["SOL"],
      approvalExpiresAt: "2026-05-02T20:00:00.000Z",
      humanApprovalRequired: false,
      maxNotional: 25_000,
      maxSlippageBps: 75,
      principalRef: "wallet:clay-preview",
      routeQuoteCommitmentRefs: ["route-quote:abc123"],
      simulationRef: "simulation:paper-001",
      strategyIntentRef: "strategy-intent:preview-001",
      walletScope: "connected-wallet-preview",
    }),
  /human approval/u,
);

console.log("Vanta strategy agent policy packet check: PASS");
