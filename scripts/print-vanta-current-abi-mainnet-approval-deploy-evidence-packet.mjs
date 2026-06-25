import { readFileSync } from "node:fs";

const packetPath = new URL(
  "../ops/mainnet/current-abi-mainnet-spend-program-approval-deploy-evidence.packet.json",
  import.meta.url,
);
const jsonMode = process.argv.includes("--json");
const packet = JSON.parse(readFileSync(packetPath, "utf8"));

if (jsonMode) {
  console.log(JSON.stringify(packet, null, 2));
} else {
  printChecklist(packet);
}

function printChecklist(packet) {
  const approval = packet.proposedApprovalRecord;
  const artifact = packet.currentAbiSbfArtifact;
  const source = packet.canonicalSource;
  const commands = packet.exactCommands;

  console.log("Vanta current ABI approval/deploy/evidence checklist");
  console.log("");
  console.log("Status");
  console.log(`- [ ] Approval status: ${packet.approvalStatus}`);
  console.log(`- [ ] Requires Clay approval: ${String(packet.requiresClayApproval)}`);
  console.log(`- [ ] Real funds allowed now: ${String(packet.realFundsAllowedNow)}`);
  console.log(`- [ ] Privacy claim allowed: ${String(packet.privacyClaimAllowed)}`);
  console.log("- [ ] No live funds, signing, deployment, approval write, or evidence write may run from this checklist alone.");
  console.log("");

  console.log("Artifact");
  console.log(`- [ ] Source: ${source.repository} ${source.branch}@${source.artifactBuildCommit}`);
  console.log(`- [ ] SBF: ${artifact.path}`);
  console.log(`- [ ] SHA256: ${artifact.sha256}`);
  console.log(`- [ ] Size: ${artifact.sizeBytes} bytes`);
  console.log(`- [ ] ABI: ${artifact.abi}`);
  console.log("");

  console.log("Approval Window");
  console.log(`- [ ] Action ref: ${approval.proposedActionRef}`);
  console.log(`- [ ] Environment: ${approval.proposedEnvironment}`);
  console.log(`- [ ] Fee payer ref: ${approval.proposedFeePayerRef}`);
  console.log(`- [ ] Window: ${approval.proposedLaunchWindowRef}`);
  console.log(`- [ ] Max funds at risk: ${approval.maximumFundsAtRiskRef}`);
  console.log(`- [ ] Rollback plan: ${approval.rollbackPlanRef}`);
  console.log(`- [ ] Stop-loss plan: ${approval.stopLossPlanRef}`);
  console.log(`- [ ] Approved by ref: ${approval.approvedByRef}`);
  console.log("");

  printCommandSection("Safe Pre-Window Checks", commands.safePreWindowNoLiveFunds);
  printCommandSection("Approval Preview Only", commands.approvalEvidencePreviewOnly);
  printCommandSection("Approval Write After Explicit Clay Approval Only", commands.approvalEvidenceWriteAfterExplicitClayApprovalOnly);
  printCommandSection("Live Window Human-Only Commands", commands.liveWindowHumanOnly);
  printCommandSection("Post-Window Evidence Write After Actual Refs Only", commands.postWindowEvidenceWriteAfterActualRefsOnly);
  printCommandSection("Post-Window Review Checks", commands.postWindowReviewNoLiveFunds);

  console.log("Stop Conditions");
  for (const condition of packet.stopConditions) {
    console.log(`- [ ] ${condition}`);
  }
  console.log("");

  console.log("Required Human Approval Before");
  for (const gate of packet.requiredHumanApprovalBefore) {
    console.log(`- [ ] ${gate}`);
  }
  console.log("");

  console.log("Non-Claims");
  for (const nonClaim of packet.nonClaims) {
    console.log(`- ${nonClaim}`);
  }
}

function printCommandSection(title, commandList) {
  console.log(title);
  for (const command of commandList ?? []) {
    console.log("- [ ] Run exactly:");
    console.log(`      ${command}`);
  }
  console.log("");
}
