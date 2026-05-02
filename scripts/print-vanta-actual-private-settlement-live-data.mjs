import { createVantaActualPrivateSettlementLiveDataPacket } from "../src/mainnet/actualPrivateSettlementLiveDataProducer.mjs";

const args = new Set(process.argv.slice(2));
const exportMode = args.has("--export");
const demoMode = args.has("--demo");
const packet = createVantaActualPrivateSettlementLiveDataPacket({
  mode: demoMode ? "demo" : "status",
});

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

if (exportMode) {
  if (!packet.plan) {
    throw new Error(
      `No settlement plan available. Missing: ${packet.missingLiveInputs.join(", ") || "plan terms"}.`,
    );
  }
  if (packet.demoDerived && !args.has("--allow-demo-export")) {
    throw new Error("Refusing to export demo-derived settlement data without --allow-demo-export.");
  }
  const request = packet.plan.request;
  const exportLines = [
    ["VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT", request.acceptedRoot],
    ["VANTA_ACTUAL_PRIVATE_ASSET_COHORT", request.assetCohort],
    ["VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT", request.assetIdCommitment],
    ["VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX", request.changeLeafIndex],
    ["VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT", request.changeOutputCommitment],
    ["VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT", request.changeOutputRoot],
    ["VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT", request.economicsCommitment],
    ["VANTA_ACTUAL_PRIVATE_NULLIFIER", request.nullifierOrReplayCommitment],
    ["VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT", request.outputCommitment],
    ["VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX", request.outputLeafIndex],
    ["VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT", request.outputRoot],
    ["VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT", request.ownerCommitment],
    ["VANTA_ACTUAL_PRIVATE_POOL_ID", request.poolId],
    ["VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH", request.privateSpendContextHash],
    ["VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH", request.privateSpendPublicInputHash],
    ["VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT", request.routeCommitment],
    ["VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT", request.settlementCommitment],
    ["VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID", request.settlementId],
    ["VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON", JSON.stringify(request)],
  ];
  console.log(exportLines.map(([name, value]) => `export ${name}=${shellQuote(value)}`).join("\n"));
} else {
  const redacted = {
    ...packet,
    plan: packet.plan
      ? {
          operatorEndpoint: packet.plan.operatorEndpoint,
          requestFieldCount: Object.keys(packet.plan.request).length,
          version: packet.plan.version,
        }
      : null,
  };
  console.log(JSON.stringify(redacted, null, 2));
}
