import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { VantaCommittedEconomicsProtocolSettlementRequest } from "../privacy/privatePoolV2ProtocolSettlementClient.js";
import type { StrategyPrivateRailOperatorHandoff } from "./strategyPrivateRail.js";

const STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION =
  "vanta-strategy-private-rail-committed-settlement-0.1" as const;

export type StrategyPrivateRailRouteQuoteCommitmentHandles = {
  quoteHandleCommitment: string;
  routeHandleCommitment: string;
};

export type StrategyPrivateRailCommittedSettlementRequest =
  VantaCommittedEconomicsProtocolSettlementRequest & StrategyPrivateRailRouteQuoteCommitmentHandles;

export type StrategyPrivateRailCommittedSettlementRequests = {
  liveSubmission: false;
  requests: StrategyPrivateRailCommittedSettlementRequest[];
  version: typeof STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION;
};

export type StrategyPrivateRailCommittedSettlementInput = {
  handoff: StrategyPrivateRailOperatorHandoff;
  settlementIdPrefix: string;
};

function hashCommitment(...parts: readonly string[]) {
  return `0x${bytesToHex(sha256(new TextEncoder().encode(parts.join("\u001f"))))}`;
}

function leafIndexFor(index: number) {
  return String(index);
}

function routeHandleCommitmentFor(
  action: "send" | "swap",
  packet: StrategyPrivateRailOperatorHandoff["operatorPackets"][number],
) {
  return hashCommitment(
    STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
    `${action}-route-handle`,
    packet.privateCoreBoundary,
    action === "send" ? packet.send.proofCircuit : packet.swap.proofCircuit,
    action === "send" ? packet.send.proofKind : packet.swap.proofKind,
  );
}

function quoteHandleCommitmentFor(
  action: "send" | "swap",
  packet: StrategyPrivateRailOperatorHandoff["operatorPackets"][number],
) {
  return hashCommitment(
    STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
    `${action}-quote-handle`,
    action === "send"
      ? packet.send.proofPublicInputs.send_economic_terms_hash
      : packet.swap.proofPublicInputs.swap_economic_terms_hash,
  );
}

export function createStrategyPrivateRailCommittedSettlementRequests({
  handoff,
  settlementIdPrefix,
}: StrategyPrivateRailCommittedSettlementInput): StrategyPrivateRailCommittedSettlementRequests {
  const requests: StrategyPrivateRailCommittedSettlementRequest[] = [];

  handoff.operatorPackets.forEach((packet, packetIndex) => {
    const sendSettlementId = `${settlementIdPrefix}:send:${packetIndex}`;
    const swapSettlementId = `${settlementIdPrefix}:swap:${packetIndex}`;
    const sendEconomicsCommitment = hashCommitment(
      STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
      "send-economics",
      packet.send.proofPublicInputs.send_economic_terms_hash,
    );
    const sendSettlementCommitment = hashCommitment(
      STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
      "send-settlement",
      sendSettlementId,
      packet.send.inputRoot,
      packet.send.inputNullifier,
      packet.send.recipientCommitment,
      packet.send.changeCommitment ?? "0",
      packet.send.resultingRoot,
    );
    const recipientLeafIndex = leafIndexFor(packetIndex * 2 + 1);
    const changeLeafIndex = leafIndexFor(packetIndex * 2 + 2);
    const sendRouteHandleCommitment = routeHandleCommitmentFor("send", packet);
    const sendQuoteHandleCommitment = quoteHandleCommitmentFor("send", packet);

    requests.push({
      action: "send",
      assetIdCommitment: hashCommitment(
        STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
        "send-asset",
        packet.send.proofPublicInputs.send_economic_terms_hash,
      ),
      changeLeafIndex,
      changeOutputCommitment: packet.send.changeCommitment ?? "0",
      changeOutputRoot: packet.send.resultingRoot,
      economicsCommitment: sendEconomicsCommitment,
      economicsMode: "committed-economics",
      inputCommitment: packet.send.inputCommitment,
      inputRoot: packet.send.inputRoot,
      nullifierOrReplayCommitment: packet.send.inputNullifier,
      outputCommitment: packet.send.recipientCommitment,
      outputLeafIndex: recipientLeafIndex,
      outputRoot: packet.send.resultingRoot,
      ownerCommitment: hashCommitment(
        STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
        "send-owner",
        packet.send.inputNullifier,
      ),
      quoteHandleCommitment: sendQuoteHandleCommitment,
      routeCommitment: sendRouteHandleCommitment,
      routeHandleCommitment: sendRouteHandleCommitment,
      sendContextTag: hashCommitment(
        STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
        "send-context",
        packet.send.inputRoot,
        packet.send.inputNullifier,
        packet.send.recipientCommitment,
      ),
      sendPublicInputHash: packet.send.proofPublicInputs.send_economic_terms_hash,
      settlementCommitment: sendSettlementCommitment,
      settlementId: sendSettlementId,
    });

    const swapEconomicsCommitment = hashCommitment(
      STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
      "swap-economics",
      packet.swap.proofPublicInputs.swap_economic_terms_hash,
    );
    const swapSettlementCommitment = hashCommitment(
      STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
      "swap-settlement",
      swapSettlementId,
      packet.swap.inputRoot,
      packet.swap.inputNullifier,
      packet.swap.outputCommitment,
      packet.swap.resultingRoot,
    );
    const swapRouteHandleCommitment = routeHandleCommitmentFor("swap", packet);
    const swapQuoteHandleCommitment = quoteHandleCommitmentFor("swap", packet);

    requests.push({
      action: "swap",
      economicsCommitment: swapEconomicsCommitment,
      economicsMode: "committed-economics",
      inputCommitment: packet.swap.inputCommitment,
      inputRoot: packet.swap.inputRoot,
      nullifierOrReplayCommitment: packet.swap.inputNullifier,
      outputCommitment: packet.swap.outputCommitment,
      outputLeafIndex: leafIndexFor(packetIndex + 1),
      outputRoot: packet.swap.resultingRoot,
      ownerCommitment: hashCommitment(
        STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
        "swap-owner",
        packet.swap.inputNullifier,
      ),
      quoteHandleCommitment: swapQuoteHandleCommitment,
      routeCommitment: swapRouteHandleCommitment,
      routeHandleCommitment: swapRouteHandleCommitment,
      settlementCommitment: swapSettlementCommitment,
      settlementId: swapSettlementId,
      swapContextTag: hashCommitment(
        STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
        "swap-context",
        packet.swap.inputRoot,
        packet.swap.inputNullifier,
        packet.swap.outputCommitment,
      ),
      swapPublicInputHash: packet.swap.proofPublicInputs.swap_economic_terms_hash,
    });
  });

  return {
    liveSubmission: false,
    requests,
    version: STRATEGY_PRIVATE_RAIL_COMMITTED_SETTLEMENT_VERSION,
  };
}
