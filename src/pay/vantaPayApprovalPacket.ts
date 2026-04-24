import type { VantaPayApprovalPacket } from "./vantaPayTypes";

export function buildVantaPayApprovalPacket(): VantaPayApprovalPacket {
  return {
    version: "vanta-pay-approval-packet-0.1",
    phaseOrder: ["preview", "approve", "execute", "settle"],
    policyMode: "legible-trust",
    simulationRequired: true,
    walletApprovalRequired: true,
  };
}
