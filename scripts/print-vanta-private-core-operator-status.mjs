const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const rawStatusState = checkReady
    ? await requestJson("/state/private-core-status-check")
    : await requestJson("/state/private-core-status");
  const statusState = checkReady ? rawStatusState?.status ?? {} : rawStatusState ?? {};
  const summary = statusState?.summary ?? {};
  const shippingDecision = statusState?.shippingDecision ?? {};
  const payload = {
    operator: baseUrl,
    statusVersion: statusState?.statusVersion ?? null,
    statusKind: statusState?.statusKind ?? null,
    snapshotVersion: statusState?.snapshotVersion ?? null,
    snapshotKind: statusState?.snapshotKind ?? null,
    shippingArtifactVersion: statusState?.shippingArtifactVersion ?? null,
    shippingArtifactKind: statusState?.shippingArtifactKind ?? null,
    summary,
    shippingDecision,
  };

  if (checkReady && rawStatusState?.decisionStatus !== "ready-to-ship") {
    if (jsonMode) {
      console.error(JSON.stringify(payload, null, 2));
    } else {
      printStatusSurface(baseUrl, statusState, summary, shippingDecision, console.error);
      printLine(
        "Supported shipping decision note",
        summary.supportedShippingDecisionNote ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported operator status note",
        summary.supportedOperatorStatusNote ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported operator snapshot gate version",
        String(summary.supportedOperatorSnapshotGateVersion ?? "unknown"),
        console.error,
      );
      printLine(
        "Supported shipping decision gate note",
        summary.supportedShippingDecisionGateNote ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported operator status gate note",
        summary.supportedOperatorStatusGateNote ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported operator snapshot gate kind",
        summary.supportedOperatorSnapshotGateKind ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported operator snapshot gate note",
        summary.supportedOperatorSnapshotGateNote ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported operator snapshot note",
        summary.supportedOperatorSnapshotNote ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported shipping artifact gate version",
        String(summary.supportedShippingArtifactGateVersion ?? "unknown"),
        console.error,
      );
      printLine(
        "Supported shipping artifact gate kind",
        summary.supportedShippingArtifactGateKind ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported shipping artifact gate note",
        summary.supportedShippingArtifactGateNote ?? "Unavailable",
        console.error,
      );
      printLine(
        "Supported shipping artifact note",
        summary.supportedShippingArtifactNote ?? "Unavailable",
        console.error,
      );
    }
    throw new Error(
      [
        `Operator status decision status: ${humanizeShippingDecisionStatus(
          rawStatusState?.decisionStatus,
        )}`,
        `Operator status decision note: ${rawStatusState?.decisionNote ?? "Unavailable"}`,
      ].join("\n"),
    );
  }

  if (jsonMode) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
  }

  printStatusSurface(baseUrl, statusState, summary, shippingDecision);
  printLine(
    "Supported operator status transport",
    summary.supportedOperatorStatusTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator status endpoint",
    summary.supportedOperatorStatusEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate version",
    String(summary.supportedOperatorSnapshotGateVersion ?? "unknown"),
  );
  printLine(
    "Supported operator snapshot gate kind",
    summary.supportedOperatorSnapshotGateKind ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate note",
    summary.supportedOperatorSnapshotGateNote ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate transport",
    summary.supportedOperatorSnapshotGateTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate endpoint",
    summary.supportedOperatorSnapshotGateEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot version",
    String(summary.supportedOperatorSnapshotVersion ?? "unknown"),
  );
  printLine(
    "Supported operator snapshot kind",
    summary.supportedOperatorSnapshotKind ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot note",
    summary.supportedOperatorSnapshotNote ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot transport",
    summary.supportedOperatorSnapshotTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot endpoint",
    summary.supportedOperatorSnapshotEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact version",
    String(summary.supportedShippingArtifactVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping artifact kind",
    summary.supportedShippingArtifactKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact note",
    summary.supportedShippingArtifactNote ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate version",
    String(summary.supportedShippingArtifactGateVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping artifact gate kind",
    summary.supportedShippingArtifactGateKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate note",
    summary.supportedShippingArtifactGateNote ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate transport",
    summary.supportedShippingArtifactGateTransport ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate endpoint",
    summary.supportedShippingArtifactGateEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact transport",
    summary.supportedShippingArtifactTransport ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact endpoint",
    summary.supportedShippingArtifactEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported zk v1 scope decision",
    summary.supportedZkV1ScopeDecision ?? "Unavailable",
  );
  printLine("Supported zk v1 scope note", summary.supportedZkV1ScopeNote ?? "Unavailable");
  printLine(
    "Supported zk v1 required lanes",
    summary.supportedZkV1RequiredLanes ?? "Unavailable",
  );
  printLine(
    "Supported zk v1 required lanes note",
    summary.supportedZkV1RequiredLanesNote ?? "Unavailable",
  );
  printLine("Supported asset", summary.supportedAssetSymbol ?? "Unavailable");
  printLine("Supported environment", summary.supportedEnvironment ?? "Unavailable");
  printLine(
    "Supported note schema",
    summary.supportedNoteSchema === "note-v0"
      ? `NoteV0 / v${String(summary.supportedNoteVersion ?? 0)}`
      : "Unavailable",
  );
  printLine(
    "Supported root provenance",
    summary.supportedRootRegistrationProvenance ===
      "shield-input|send-recipient-output|send-change-output|swap-output"
      ? "Shield input / send recipient output / send change output / swap output"
      : "Unavailable",
  );
  printLine(
    "Supported send root basis",
    summary.supportedSendResultingRootBasis === "client-declared"
      ? "Client-declared"
      : "Unavailable",
  );
  printLine(
    "Supported send input-root policy",
    summary.supportedSendInputRootPolicy ===
      "latest-registered-root-with-linked-registration-proof"
      ? "Latest registered root with linked registration proof"
      : "Unavailable",
  );
  printLine(
    "Supported send output registration",
    summary.supportedSendOutputRegistrationPolicy ===
      "resulting-root-must-register-as-recipient-or-change-output"
      ? "Resulting root must register as recipient or change output"
      : "Unavailable",
  );
  printLine(
    "Supported recipient model",
    humanizeSupportedRecipientModel(summary.supportedRecipientModel),
  );
  printLine(
    "Supported release destination model",
    humanizeSupportedReleaseDestinationModel(summary.supportedReleaseDestinationModel),
  );
  printLine("Supported proof system", humanizeSupportedProofSystem(summary.supportedProofSystem));
  printLine(
    "Supported unshield circuit",
    summary.supportedUnshieldCircuit
      ? `${summary.supportedUnshieldCircuit} @ depth ${String(summary.supportedUnshieldMerkleDepth ?? "?")}`
      : "Unavailable",
  );
  printLine(
    "Supported send circuit",
    summary.supportedSendCircuit
      ? `${summary.supportedSendCircuit} @ depth ${String(summary.supportedSendMerkleDepth ?? "?")}`
      : "Unavailable",
  );
  printLine(
    "Supported release authorization",
    humanizeReleaseAuthorization(summary.supportedReleaseAuthorizationBasis),
  );
  printLine(
    "Supported release root policy",
    humanizeReleaseRootPolicy(summary.supportedReleaseRootPolicy),
  );
  printLine(
    "Supported release execution",
    humanizeReleaseExecutionModel(summary.supportedReleaseExecutionModel),
  );
  printLine(
    "Supported release atomicity",
    humanizeReleaseAtomicityModel(summary.supportedReleaseAtomicityModel),
  );
  printLine(
    "Supported release persistence",
    humanizeReleasePersistenceModel(summary.supportedReleasePersistenceModel),
  );
  printLine("Owner authorization mode", humanizeOwnerAuthorizationMode(summary.ownerAuthorizationMode));
  printLine(
    "Owner authorization decision",
    humanizeOwnerAuthorizationDecision(summary.ownerAuthorizationDecision),
  );
  printLine(
    "Owner authorization decision note",
    summary.ownerAuthorizationDecisionNote ?? "Unavailable",
  );
  printLine(
    "Source artifact truth",
    humanizeSourceArtifactTruthBasis(summary.sourceArtifactTruthBasis),
  );
  printLine(
    "Proving artifact truth",
    humanizeProvingArtifactTruthBasis(summary.provingArtifactTruthBasis),
  );
  printLine(
    "Source/proving relationship",
    humanizeSourceProvingRelationship(summary.sourceProvingRelationship),
  );
  printLine("Nullifier key mode", humanizeNullifierKeyMode(summary.nullifierKeyMode));
  printLine(
    "Nullifier key decision",
    humanizeNullifierKeyDecision(summary.nullifierKeyDecision),
  );
  printLine(
    "Nullifier key decision note",
    summary.nullifierKeyDecisionNote ?? "Unavailable",
  );
  printLine("Proving hash lane", summary.provingHashLane ?? "Unavailable");
  printLine("Current root", abbreviate(summary.currentRoot));
  printLine("Current root proof", abbreviate(summary.currentRecord?.proofId));
  printLine("Current root registration", humanizeRootRegistrationBasis(summary.currentRecord?.registrationBasis));
  printLine("Current root linked proof", abbreviate(summary.currentRootLinkedProof?.proofId));
  printLine("Current root proof link", summary.currentRootProofLinkStatus ?? "Unavailable");
  printLine("Root records", String(summary.rootRecordCount ?? 0));
  printLine("Latest consume", abbreviate(summary.latestConsume?.nullifier));
  printLine("Latest consume proof", abbreviate(summary.latestConsume?.proofId));
  printLine("Latest consume linked proof", abbreviate(summary.latestConsumeProof?.proofId));
  printLine("Consume records", String(summary.consumeRecordCount ?? 0));
  printLine("Latest proof", abbreviate(summary.latestProof?.proofId));
  printLine("Latest proof action", summary.latestProof?.action ?? "Unavailable");
  printLine("Proof records", String(summary.proofRecordCount ?? 0));
  printLine("Latest swap proof", abbreviate(summary.latestSwapProof?.proofId));
  printLine("Latest swap proof action", summary.latestSwapProof?.action ?? "Unavailable");
  printLine("Swap proof records", String(summary.swapProofRecordCount ?? 0));
  printLine("Latest swap transition", abbreviate(summary.latestSwap?.swapId));
  printLine("Latest swap proof link", abbreviate(summary.latestSwap?.proofId));
  printLine("Latest swap linked proof", abbreviate(summary.latestSwapLinkedProof?.proofId));
  printLine("Latest swap execution venue", summary.latestSwap?.executionVenueLabel ?? "Unavailable");
  printLine(
    "Latest swap quote reference",
    summary.latestSwap?.executionQuoteReference ?? "Unavailable",
  );
  printLine(
    "Latest swap output",
    summary.latestSwap?.outputAmount && summary.latestSwap?.outputAssetId
      ? `${summary.latestSwap.outputAmount} / ${abbreviate(summary.latestSwap.outputAssetId)}`
      : "Unavailable",
  );
  printLine("Latest swap resulting-root basis", summary.latestSwap?.resultingRootBasis ?? "Unavailable");
  printLine("Latest swap resulting root", abbreviate(summary.latestSwap?.resultingRoot));
  printLine(
    "Swap resulting root status",
    humanizeSwapResultingRootStatus(summary.swapResultingRootStatus),
  );
  printLine("Swap resulting root note", summary.swapResultingRootNote ?? "Unavailable");
  printLine(
    "Swap resulting root registration",
    humanizeSwapResultingRootRegistrationStatus(summary.swapResultingRootRegistrationStatus),
  );
  printLine(
    "Swap resulting root registration basis",
    humanizeRootRegistrationBasis(summary.swapResultingRootRecord?.registrationBasis),
  );
  printLine(
    "Swap resulting root registration note",
    summary.swapResultingRootRegistrationNote ?? "Unavailable",
  );
  printLine(
    "Swap continuity status",
    humanizeSwapContinuityStatus(summary.swapContinuityStatus),
  );
  printLine("Swap continuity note", summary.swapContinuityNote ?? "Unavailable");
  printLine("Swap boundary status", humanizeSwapBoundaryStatus(summary.swapBoundaryStatus));
  printLine("Swap boundary note", summary.swapBoundaryNote ?? "Unavailable");
  printLine("Swap resulting root record", abbreviate(summary.swapResultingRootRecord?.root));
  printLine("Swap resulting root proof", abbreviate(summary.swapResultingRootRecord?.proofId));
  printLine(
    "Swap resulting root linked proof",
    abbreviate(summary.swapResultingRootLinkedProof?.proofId),
  );
  printLine(
    "Swap resulting root proof link",
    summary.swapResultingRootProofLinkStatus ?? "Unavailable",
  );
  printLine(
    "Swap resulting root bundle",
    summary.swapResultingRootRecord?.artifactBundleStatus === "complete"
      ? `Complete v${String(summary.swapResultingRootRecord.artifactBundleVersion ?? 1)}`
      : summary.swapResultingRootRecord?.artifactBundleStatus === "legacy-incomplete"
        ? "Legacy incomplete"
        : "Unavailable",
  );
  printLine("Swap records", String(summary.swapRecordCount ?? 0));
  printLine("Proof/swap link", summary.proofSwapLinkStatus ?? "Unavailable");
  printLine("Latest send proof", abbreviate(summary.latestSendProof?.proofId));
  printLine("Latest send proof action", summary.latestSendProof?.action ?? "Unavailable");
  printLine("Send proof records", String(summary.sendProofRecordCount ?? 0));
  printLine("Latest send transition", abbreviate(summary.latestSend?.sendId));
  printLine("Latest send proof link", abbreviate(summary.latestSend?.proofId));
  printLine("Latest send linked proof", abbreviate(summary.latestSendLinkedProof?.proofId));
  printLine("Latest send resulting-root basis", summary.latestSend?.resultingRootBasis ?? "Unavailable");
  printLine("Latest send resulting root", abbreviate(summary.latestSend?.resultingRoot));
  printLine("Send resulting root status", humanizeSendResultingRootStatus(summary.sendResultingRootStatus));
  printLine("Send resulting root note", summary.sendResultingRootNote ?? "Unavailable");
  printLine(
    "Send resulting root registration",
    humanizeSendResultingRootRegistrationStatus(summary.sendResultingRootRegistrationStatus),
  );
  printLine(
    "Send resulting root registration basis",
    humanizeRootRegistrationBasis(summary.sendResultingRootRecord?.registrationBasis),
  );
  printLine(
    "Send resulting root registration note",
    summary.sendResultingRootRegistrationNote ?? "Unavailable",
  );
  printLine(
    "Send continuity status",
    humanizeSendContinuityStatus(summary.sendContinuityStatus),
  );
  printLine("Send continuity note", summary.sendContinuityNote ?? "Unavailable");
  printLine("Send boundary status", humanizeSendBoundaryStatus(summary.sendBoundaryStatus));
  printLine("Send boundary note", summary.sendBoundaryNote ?? "Unavailable");
  printLine("Send resulting root record", abbreviate(summary.sendResultingRootRecord?.root));
  printLine("Send resulting root proof", abbreviate(summary.sendResultingRootRecord?.proofId));
  printLine(
    "Send resulting root linked proof",
    abbreviate(summary.sendResultingRootLinkedProof?.proofId),
  );
  printLine(
    "Send resulting root proof link",
    summary.sendResultingRootProofLinkStatus ?? "Unavailable",
  );
  printLine(
    "Send resulting root bundle",
    summary.sendResultingRootRecord?.artifactBundleStatus === "complete"
      ? `Complete v${String(summary.sendResultingRootRecord.artifactBundleVersion ?? 1)}`
      : summary.sendResultingRootRecord?.artifactBundleStatus === "legacy-incomplete"
        ? "Legacy incomplete"
        : "Unavailable",
  );
  printLine("Latest send recipient commitment", abbreviate(summary.latestSend?.recipientCommitment));
  printLine("Send records", String(summary.sendRecordCount ?? 0));
  printLine("Latest release nullifier", abbreviate(summary.latestRelease?.nullifier));
  printLine("Latest release proof", abbreviate(summary.latestRelease?.proofId));
  printLine("Latest release linked proof", abbreviate(summary.latestReleaseProof?.proofId));
  printLine("Release authorization", humanizeReleaseAuthorization(summary.latestRelease?.authorizationBasis));
  printLine("Release root policy", humanizeReleaseRootPolicy(summary.latestRelease?.rootPolicy));
  printLine("Latest release request", abbreviate(summary.latestRelease?.requestId));
  printLine("Latest release root", abbreviate(summary.latestRelease?.root));
  printLine("Release records", String(summary.releaseRecordCount ?? 0));
  printLine("Proof/send link", summary.proofSendLinkStatus ?? "Unavailable");
  printLine("Proof/consume link", summary.proofConsumeLinkStatus ?? "Unavailable");
  printLine("Proof/release link", summary.proofReleaseLinkStatus ?? "Unavailable");
  printLine("Contract mirror status", humanizeContractMirrorStatus(summary.contractMirrorStatus));
  printLine("Contract mirror note", summary.contractMirrorNote ?? "Unavailable");
  printLine("Boundary status", humanizeBoundaryStatus(summary.boundaryStatus));
  printLine("Boundary note", summary.boundaryNote ?? "Unavailable");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`private-core operator status: FAIL\n${message}`);
  process.exitCode = 1;
}

function resolveBaseUrl(args) {
  const cliValue = readFlagValue(args, "--base-url");
  const envValue = process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL;
  const raw =
    (typeof cliValue === "string" && cliValue.trim()) ||
    (typeof envValue === "string" && envValue.trim()) ||
    "http://127.0.0.1:8789";

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function readFlagValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

async function requestJson(path) {
  const authToken = resolveAuthToken();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${path}`);
  }

  return response.json();
}

function resolveAuthToken() {
  const envValue =
    process.env.VANTA_PRIVATE_CORE_OPERATOR_AUTH_TOKEN ??
    process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN;
  return typeof envValue === "string" && envValue.trim() ? envValue.trim() : null;
}

function printStatusSurface(
  baseUrl,
  statusState,
  summary,
  shippingDecision,
  writer = console.log,
) {
  printLine("Operator", baseUrl, writer);
  printLine("Status version", String(statusState?.statusVersion ?? "unknown"), writer);
  printLine("Status kind", statusState?.statusKind ?? "Unavailable", writer);
  printLine("Snapshot version", String(statusState?.snapshotVersion ?? "unknown"), writer);
  printLine("Snapshot kind", statusState?.snapshotKind ?? "Unavailable", writer);
  printLine(
    "Shipping artifact version",
    String(statusState?.shippingArtifactVersion ?? "unknown"),
    writer,
  );
  printLine(
    "Shipping artifact kind",
    statusState?.shippingArtifactKind ?? "Unavailable",
    writer,
  );
  printLine("Summary state version", String(summary.stateVersion ?? "unknown"), writer);
  printLine("Mirrored contract version", String(summary.contractVersion ?? "unknown"), writer);
  printLine("Summary version", String(summary.summaryVersion ?? "unknown"), writer);
  printLine("Summary generated", formatTimestamp(summary.generatedAt), writer);
  printLine("Shipping decision version", String(shippingDecision.decisionVersion ?? "unknown"), writer);
  printLine("Shipping decision kind", shippingDecision.decisionKind ?? "Unavailable", writer);
  printLine(
    "Shipping decision status",
    humanizeShippingDecisionStatus(shippingDecision.decisionStatus),
    writer,
  );
  printLine("Shipping decision note", shippingDecision.decisionNote ?? "Unavailable", writer);
  printLine(
    "Required lanes status",
    humanizeRequiredLanesStatus(summary.requiredLanesStatus),
    writer,
  );
  printLine("Required lanes note", summary.requiredLanesNote ?? "Unavailable", writer);
  printLine(
    "zk v1 shipping status",
    humanizeZkV1ShippingStatus(summary.zkV1ShippingStatus),
    writer,
  );
  printLine("zk v1 shipping note", summary.zkV1ShippingNote ?? "Unavailable", writer);
  printLine(
    "zk v1 finish line status",
    humanizeZkV1FinishLineStatus(summary.zkV1FinishLineStatus),
    writer,
  );
  printLine("zk v1 finish line note", summary.zkV1FinishLineNote ?? "Unavailable", writer);
  printLine(
    "Release boundary status",
    humanizeReleaseBoundaryStatus(summary.releaseBoundaryStatus),
    writer,
  );
  printLine("Release boundary note", summary.releaseBoundaryNote ?? "Unavailable", writer);
  printLine("Supported send lane version", String(summary.supportedSendLaneVersion ?? "unknown"), writer);
  printLine("Supported send lane kind", humanizeSupportedSendLaneKind(summary.supportedSendLaneKind), writer);
  printLine("Supported send lane status", humanizeSupportedSendLaneStatus(summary.supportedSendLaneStatus), writer);
  printLine("Supported send lane note", summary.supportedSendLaneNote ?? "Unavailable", writer);
  printLine(
    "Supported send v1 decision",
    humanizeSupportedV1Decision(summary.supportedSendV1Decision),
    writer,
  );
  printLine(
    "Supported send v1 decision note",
    summary.supportedSendV1DecisionNote ?? "Unavailable",
    writer,
  );
  printLine("Supported unshield lane version", String(summary.supportedUnshieldLaneVersion ?? "unknown"), writer);
  printLine(
    "Supported unshield lane kind",
    humanizeSupportedUnshieldLaneKind(summary.supportedUnshieldLaneKind),
    writer,
  );
  printLine(
    "Supported unshield lane status",
    humanizeSupportedUnshieldLaneStatus(summary.supportedUnshieldLaneStatus),
    writer,
  );
  printLine("Supported unshield lane note", summary.supportedUnshieldLaneNote ?? "Unavailable", writer);
  printLine(
    "Supported unshield v1 decision",
    humanizeSupportedV1Decision(summary.supportedUnshieldV1Decision),
    writer,
  );
  printLine(
    "Supported unshield v1 decision note",
    summary.supportedUnshieldV1DecisionNote ?? "Unavailable",
    writer,
  );
  printLine(
    "Supported release lane version",
    String(summary.supportedReleaseLaneVersion ?? "unknown"),
    writer,
  );
  printLine(
    "Supported release lane kind",
    humanizeSupportedReleaseLaneKind(summary.supportedReleaseLaneKind),
    writer,
  );
  printLine(
    "Supported release lane status",
    humanizeSupportedReleaseLaneStatus(summary.supportedReleaseLaneStatus),
    writer,
  );
  printLine("Supported release lane note", summary.supportedReleaseLaneNote ?? "Unavailable", writer);
  printLine(
    "Supported release v1 decision",
    humanizeSupportedV1Decision(summary.supportedReleaseV1Decision),
    writer,
  );
  printLine(
    "Supported release v1 decision note",
    summary.supportedReleaseV1DecisionNote ?? "Unavailable",
    writer,
  );
  printLine(
    "Supported swap lane version",
    String(summary.supportedSwapLaneVersion ?? "unknown"),
    writer,
  );
  printLine(
    "Supported swap lane kind",
    humanizeSupportedSwapLaneKind(summary.supportedSwapLaneKind),
    writer,
  );
  printLine(
    "Supported swap lane status",
    humanizeSupportedSwapLaneStatus(summary.supportedSwapLaneStatus),
    writer,
  );
  printLine("Supported swap lane note", summary.supportedSwapLaneNote ?? "Unavailable", writer);
  printLine(
    "Supported swap v1 decision",
    humanizeSupportedV1Decision(summary.supportedSwapV1Decision),
    writer,
  );
  printLine(
    "Supported swap v1 decision note",
    summary.supportedSwapV1DecisionNote ?? "Unavailable",
    writer,
  );
  printLine("Supported swap v1 role", summary.supportedSwapV1Role ?? "Unavailable", writer);
  printLine("Supported swap v1 role note", summary.supportedSwapV1RoleNote ?? "Unavailable", writer);
  printLine("Supported swap venue", humanizeSupportedSwapVenue(summary.supportedSwapVenue), writer);
  printLine(
    "Supported swap output model",
    humanizeSupportedSwapOutputModel(summary.supportedSwapOutputModel),
    writer,
  );
  printLine(
    "Supported swap root basis",
    summary.supportedSwapResultingRootBasis === "client-declared" ? "Client-declared" : "Unavailable",
  );
  printLine(
    "Supported swap input-root policy",
    summary.supportedSwapInputRootPolicy ===
      "latest-registered-root-with-linked-registration-proof"
      ? "Latest registered root with linked registration proof"
      : "Unavailable",
  );
  printLine(
    "Supported swap output registration",
    summary.supportedSwapOutputRegistrationPolicy ===
      "resulting-root-must-register-as-swap-output"
      ? "Resulting root must register as swap output"
      : "Unavailable",
  );
  printLine("Supported flow version", String(summary.supportedFlowVersion ?? "unknown"));
  printLine("Supported flow kind", humanizeSupportedFlowKind(summary.supportedFlowKind));
  printLine("Supported flow status", humanizeSupportedFlowStatus(summary.supportedFlowStatus));
  printLine("Supported flow note", summary.supportedFlowNote ?? "Unavailable");
  printLine(
    "Supported shipping decision version",
    String(summary.supportedShippingDecisionVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping decision kind",
    summary.supportedShippingDecisionKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision note",
    summary.supportedShippingDecisionNote ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision gate version",
    String(summary.supportedShippingDecisionGateVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping decision gate kind",
    summary.supportedShippingDecisionGateKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision gate note",
    summary.supportedShippingDecisionGateNote ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision gate transport",
    summary.supportedShippingDecisionGateTransport ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision gate endpoint",
    summary.supportedShippingDecisionGateEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision transport",
    summary.supportedShippingDecisionTransport ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision endpoint",
    summary.supportedShippingDecisionEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported operator status version",
    String(summary.supportedOperatorStatusVersion ?? "unknown"),
  );
  printLine(
    "Supported operator status kind",
    summary.supportedOperatorStatusKind ?? "Unavailable",
  );
  printLine(
    "Supported operator status note",
    summary.supportedOperatorStatusNote ?? "Unavailable",
  );
  printLine(
    "Supported operator status gate version",
    String(summary.supportedOperatorStatusGateVersion ?? "unknown"),
  );
  printLine(
    "Supported operator status gate kind",
    summary.supportedOperatorStatusGateKind ?? "Unavailable",
  );
  printLine(
    "Supported operator status gate note",
    summary.supportedOperatorStatusGateNote ?? "Unavailable",
  );
  printLine(
    "Supported operator status gate transport",
    summary.supportedOperatorStatusGateTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator status gate endpoint",
    summary.supportedOperatorStatusGateEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported operator status transport",
    summary.supportedOperatorStatusTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator status endpoint",
    summary.supportedOperatorStatusEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot version",
    String(summary.supportedOperatorSnapshotVersion ?? "unknown"),
  );
  printLine(
    "Supported operator snapshot kind",
    summary.supportedOperatorSnapshotKind ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot note",
    summary.supportedOperatorSnapshotNote ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate version",
    String(summary.supportedOperatorSnapshotGateVersion ?? "unknown"),
  );
  printLine(
    "Supported operator snapshot gate kind",
    summary.supportedOperatorSnapshotGateKind ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate note",
    summary.supportedOperatorSnapshotGateNote ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate transport",
    summary.supportedOperatorSnapshotGateTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot gate endpoint",
    summary.supportedOperatorSnapshotGateEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot transport",
    summary.supportedOperatorSnapshotTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot endpoint",
    summary.supportedOperatorSnapshotEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact version",
    String(summary.supportedShippingArtifactVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping artifact kind",
    summary.supportedShippingArtifactKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact note",
    summary.supportedShippingArtifactNote ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate version",
    String(summary.supportedShippingArtifactGateVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping artifact gate kind",
    summary.supportedShippingArtifactGateKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate note",
    summary.supportedShippingArtifactGateNote ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate transport",
    summary.supportedShippingArtifactGateTransport ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact gate endpoint",
    summary.supportedShippingArtifactGateEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact transport",
    summary.supportedShippingArtifactTransport ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact endpoint",
    summary.supportedShippingArtifactEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported release candidate version",
    String(summary.supportedReleaseCandidateVersion ?? "unknown"),
  );
  printLine(
    "Supported release candidate kind",
    summary.supportedReleaseCandidateKind ?? "Unavailable",
  );
  printLine(
    "Supported release candidate note",
    summary.supportedReleaseCandidateNote ?? "Unavailable",
  );
  printLine(
    "Supported release candidate scope",
    summary.supportedReleaseCandidateScope ?? "Unavailable",
  );
  printLine(
    "Supported release candidate scope note",
    summary.supportedReleaseCandidateScopeNote ?? "Unavailable",
  );
  printLine(
    "Supported release candidate gate version",
    String(summary.supportedReleaseCandidateGateVersion ?? "unknown"),
  );
  printLine(
    "Supported release candidate gate kind",
    summary.supportedReleaseCandidateGateKind ?? "Unavailable",
  );
  printLine(
    "Supported release candidate gate note",
    summary.supportedReleaseCandidateGateNote ?? "Unavailable",
  );
  printLine(
    "Supported release candidate gate transport",
    summary.supportedReleaseCandidateGateTransport ?? "Unavailable",
  );
  printLine(
    "Supported release candidate gate endpoint",
    summary.supportedReleaseCandidateGateEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported release candidate transport",
    summary.supportedReleaseCandidateTransport ?? "Unavailable",
  );
  printLine(
    "Supported release candidate endpoint",
    summary.supportedReleaseCandidateEndpoint ?? "Unavailable",
  );
}

function abbreviate(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "Unavailable";
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function printLine(label, value, writer = console.log) {
  writer(`${label}: ${value}`);
}

function formatTimestamp(value) {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function humanizeBoundaryStatus(value) {
  switch (value) {
    case "coherent":
      return "Operator boundary coherent";
    case "awaiting-current-root":
      return "Awaiting current root";
    case "root-registration-unlinked":
      return "Current root registration unlinked";
    case "send-root-registration-unlinked":
      return "Send root registration unlinked";
    case "send-root-output-mismatch":
      return "Send root output mismatch";
    case "proof-send-unlinked":
      return "Proof/send not linked";
    case "proof-consume-unlinked":
      return "Proof/consume not linked";
    case "proof-release-unlinked":
      return "Proof/release not linked";
    default:
      return "Unavailable";
  }
}

function humanizeZkV1FinishLineStatus(value) {
  if (value === "coherent-minimum-v1-lane") {
    return "Coherent minimum v1 lane";
  }

  if (value === "scope-mismatch") {
    return "Scope mismatch";
  }

  if (value === "required-lanes-mismatch") {
    return "Required lanes mismatch";
  }

  if (value === "required-lane-decision-mismatch") {
    return "Required lane decision mismatch";
  }

  if (value === "swap-role-mismatch") {
    return "Swap role mismatch";
  }

  if (value === "contract-mismatch") {
    return "Contract mismatch";
  }

  if (value === "boundary-mismatch") {
    return "Boundary mismatch";
  }

  return "Unavailable";
}

function humanizeReleaseBoundaryStatus(value) {
  if (value === "release-recorded") {
    return "Release recorded";
  }
  if (value === "consume-without-release") {
    return "Consume without release";
  }
  if (value === "proof-unlinked") {
    return "Release proof unlinked";
  }
  if (value === "authorization-mismatch") {
    return "Release auth mismatch";
  }
  if (value === "root-policy-mismatch") {
    return "Release root-policy mismatch";
  }
  if (value === "contract-mismatch") {
    return "Contract mismatch";
  }
  if (value === "boundary-mismatch") {
    return "Boundary mismatch";
  }
  return "Unavailable";
}

function humanizeRequiredLanesStatus(value) {
  switch (value) {
    case "coherent-required-lanes":
      return "Coherent required lanes";
    case "send-lane-mismatch":
      return "Send lane mismatch";
    case "release-lane-mismatch":
      return "Release lane mismatch";
    case "finish-line-mismatch":
      return "Finish-line mismatch";
    default:
      return "Unknown";
  }
}

function humanizeZkV1ShippingStatus(value) {
  switch (value) {
    case "ready-narrow-v1":
      return "Ready narrow v1";
    case "required-lanes-mismatch":
      return "Required lanes mismatch";
    case "release-boundary-mismatch":
      return "Release-boundary mismatch";
    case "contract-mismatch":
      return "Contract mismatch";
    case "boundary-mismatch":
      return "Boundary mismatch";
    default:
      return "Unknown";
  }
}

function humanizeShippingDecisionStatus(value) {
  if (value === "ready-to-ship") {
    return "Ready to ship";
  }

  if (value === "blocked") {
    return "Blocked";
  }

  return "Unavailable";
}

function humanizeContractMirrorStatus(value) {
  switch (value) {
    case "mirrors-contract":
      return "Summary mirrors frozen contract";
    case "contract-mismatch":
      return "Summary drift detected";
    default:
      return "Unavailable";
  }
}

function humanizeSendResultingRootStatus(value) {
  switch (value) {
    case "current-root":
      return "Current root";
    case "registered-stale":
      return "Registered but stale";
    case "downstream-consumed":
      return "Consumed downstream";
    case "downstream-released":
      return "Released downstream";
    case "unregistered":
      return "Unregistered";
    case "missing":
      return "Missing";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeSendResultingRootRegistrationStatus(value) {
  switch (value) {
    case "linked-recipient-output":
      return "Linked to recipient output";
    case "linked-change-output":
      return "Linked to change output";
    case "mismatch":
      return "Output mismatch";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeSendContinuityStatus(value) {
  switch (value) {
    case "ready-current-root":
      return "Ready on current root";
    case "ready-registered-stale":
      return "Registered but stale";
    case "awaiting-registration":
      return "Awaiting registration";
    case "registration-proof-unlinked":
      return "Registration proof unlinked";
    case "output-mismatch":
      return "Output mismatch";
    case "downstream-consumed":
      return "Consumed downstream";
    case "downstream-released":
      return "Released downstream";
    case "missing-resulting-root":
      return "Missing resulting root";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeSendBoundaryStatus(value) {
  switch (value) {
    case "coherent-current-root":
      return "Coherent / current root";
    case "coherent-registered-stale":
      return "Coherent / registered stale";
    case "awaiting-registration":
      return "Awaiting registration";
    case "proof-send-unlinked":
      return "Proof/send unlinked";
    case "registration-proof-unlinked":
      return "Registration proof unlinked";
    case "output-mismatch":
      return "Output mismatch";
    case "missing-resulting-root":
      return "Missing resulting root";
    case "downstream-consumed":
      return "Downstream consumed";
    case "downstream-released":
      return "Downstream released";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeSwapResultingRootStatus(value) {
  switch (value) {
    case "current-root":
      return "Current root";
    case "registered-stale":
      return "Registered but stale";
    case "downstream-consumed":
      return "Consumed downstream";
    case "downstream-released":
      return "Released downstream";
    case "unregistered":
      return "Unregistered";
    case "missing":
      return "Missing resulting root";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeSwapResultingRootRegistrationStatus(value) {
  switch (value) {
    case "linked-output":
      return "Linked to swap output";
    case "mismatch":
      return "Output mismatch";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeSwapContinuityStatus(value) {
  switch (value) {
    case "ready-current-root":
      return "Ready on current root";
    case "ready-registered-stale":
      return "Registered but stale";
    case "awaiting-registration":
      return "Awaiting registration";
    case "registration-proof-unlinked":
      return "Registration proof unlinked";
    case "output-mismatch":
      return "Output mismatch";
    case "downstream-consumed":
      return "Consumed downstream";
    case "downstream-released":
      return "Released downstream";
    case "missing-resulting-root":
      return "Missing resulting root";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeSwapBoundaryStatus(value) {
  switch (value) {
    case "coherent-current-root":
      return "Coherent on current root";
    case "coherent-registered-stale":
      return "Coherent but stale";
    case "awaiting-registration":
      return "Awaiting registration";
    case "proof-swap-unlinked":
      return "Swap proof unlinked";
    case "registration-proof-unlinked":
      return "Registration proof unlinked";
    case "output-mismatch":
      return "Output mismatch";
    case "missing-resulting-root":
      return "Missing resulting root";
    case "downstream-consumed":
      return "Consumed downstream";
    case "downstream-released":
      return "Released downstream";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unavailable";
  }
}

function humanizeRootRegistrationBasis(value) {
  switch (value) {
    case "shield-input":
      return "Shield input";
    case "send-recipient-output":
      return "Send recipient output";
    case "send-change-output":
      return "Send change output";
    case "swap-output":
      return "Swap output";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedSendLaneKind(value) {
  switch (value) {
    case "single-input-single-recipient-optional-change":
      return "Single input / recipient / optional change";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedSendLaneStatus(value) {
  switch (value) {
    case "supported":
      return "Supported";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedUnshieldLaneKind(value) {
  switch (value) {
    case "single-note-proof-backed-consume":
      return "Single-note proof-backed consume";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedUnshieldLaneStatus(value) {
  switch (value) {
    case "supported":
      return "Supported";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedReleaseLaneKind(value) {
  switch (value) {
    case "proof-backed-consume-latest-registered-root":
      return "Proof-backed consume / latest registered root";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedReleaseLaneStatus(value) {
  switch (value) {
    case "supported":
      return "Supported";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedSwapLaneKind(value) {
  switch (value) {
    case "single-input-vusd-to-allowlisted-shielded-output":
      return "Single input VUSD to allowlisted shielded output";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedSwapLaneStatus(value) {
  switch (value) {
    case "supported":
      return "Supported";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedSwapVenue(value) {
  switch (value) {
    case "meteora-dlmm-devnet-and-operator-token-output":
      return "Meteora DLMM devnet + operator token output";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedSwapOutputModel(value) {
  switch (value) {
    case "allowlisted-shielded-output-note":
      return "Allowlisted shielded output note";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedV1Decision(value) {
  switch (value) {
    case "accepted-narrow-v1-path":
      return "Accepted narrow v1 path";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedFlowKind(value) {
  switch (value) {
    case "shield-hold-send-unshield-replay-guard":
      return "Shield / hold / send / unshield / replay guard";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedFlowStatus(value) {
  switch (value) {
    case "supported":
      return "Supported";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedRecipientModel(value) {
  switch (value) {
    case "hashed-reference-to-owner-key":
      return "Hashed reference to owner key";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedReleaseDestinationModel(value) {
  switch (value) {
    case "32-byte-release-destination-field":
      return "32-byte release destination field";
    default:
      return "Unavailable";
  }
}

function humanizeSupportedProofSystem(value) {
  switch (value) {
    case "noir-acir-ultrahonk-bbjs":
      return "Noir ACIR / UltraHonk / bb.js";
    default:
      return "Unavailable";
  }
}

function humanizeOwnerAuthorizationMode(value) {
  switch (value) {
    case "x25519-secret-prechecked-off-circuit":
      return "X25519 secret prechecked off-circuit";
    default:
      return "Unavailable";
  }
}

function humanizeNullifierKeyMode(value) {
  switch (value) {
    case "note-secret-as-nullifier-key-v0":
      return "Note secret as nullifier key v0";
    default:
      return "Unavailable";
  }
}

function humanizeReleaseAuthorization(value) {
  switch (value) {
    case "proof-backed-consume":
      return "Proof-backed consume";
    default:
      return "Unavailable";
  }
}

function humanizeReleaseRootPolicy(value) {
  switch (value) {
    case "latest-registered-root":
      return "Latest registered root";
    default:
      return "Unavailable";
  }
}

function humanizeReleaseExecutionModel(value) {
  switch (value) {
    case "operator-recorded-devnet-release":
      return "Operator-recorded devnet release";
    default:
      return "Unavailable";
  }
}

function humanizeReleaseAtomicityModel(value) {
  switch (value) {
    case "operator-local-atomic-consume-and-release-record":
      return "Operator-local atomic consume + release record";
    default:
      return "Unavailable";
  }
}

function humanizeReleasePersistenceModel(value) {
  switch (value) {
    case "json-store-v1":
      return "JSON store v1";
    default:
      return "Unavailable";
  }
}

function humanizeOwnerAuthorizationDecision(value) {
  switch (value) {
    case "accepted-v1-off-circuit-precheck":
      return "Accepted v1 off-circuit precheck";
    default:
      return "Unavailable";
  }
}

function humanizeSourceArtifactTruthBasis(value) {
  switch (value) {
    case "source-layer-artifact-bundle":
      return "Source-layer artifact bundle";
    default:
      return "Unavailable";
  }
}

function humanizeProvingArtifactTruthBasis(value) {
  switch (value) {
    case "verified-proving-public-input-vector":
      return "Verified proving public-input vector";
    default:
      return "Unavailable";
  }
}

function humanizeSourceProvingRelationship(value) {
  switch (value) {
    case "explicit-split-no-implicit-equality":
      return "Explicit split / no implicit equality";
    default:
      return "Unavailable";
  }
}

function humanizeNullifierKeyDecision(value) {
  switch (value) {
    case "accepted-v1-temporary-note-secret-key":
      return "Accepted v1 temporary note-secret key";
    default:
      return "Unavailable";
  }
}
