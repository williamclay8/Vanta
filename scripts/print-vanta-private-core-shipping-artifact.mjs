const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const rawArtifact = checkReady
    ? await requestJson("/state/private-core-shipping-artifact-check")
    : await requestJson("/state/private-core-shipping-artifact");
  const artifact = checkReady ? rawArtifact?.artifact ?? {} : rawArtifact;
  const surface = buildArtifactSurface(artifact);

  if (checkReady && surface.decisionStatusRaw !== "ready-to-ship") {
    if (jsonMode) {
      console.error(JSON.stringify(artifact, null, 2));
    } else {
      printArtifactSurface(surface, console.error);
    }
    throw new Error(
      [
        `Artifact decision status: ${surface.decisionStatus}`,
        `Artifact decision note: ${surface.decisionNote}`,
      ].join("\n"),
    );
  }

  if (jsonMode) {
    console.log(JSON.stringify(artifact, null, 2));
  } else {
    printArtifactSurface(surface);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core shipping artifact",
  );
  process.exitCode = 1;
}

function buildArtifactSurface(artifact) {
  const snapshot = artifact?.snapshot ?? {};
  const contract = snapshot?.contract ?? {};
  const shipping = snapshot?.shipping ?? {};

  return {
    operator: artifact?.operator ?? baseUrl,
    artifactVersion: artifact?.artifactVersion ?? null,
    artifactKind: artifact?.artifactKind ?? null,
    decisionVersion: artifact?.decisionVersion ?? null,
    decisionKind: artifact?.decisionKind ?? null,
    decisionStatusRaw: artifact?.decisionStatus ?? null,
    decisionStatus: humanizeDecisionStatus(artifact?.decisionStatus),
    decisionNote: artifact?.decisionNote ?? "Unavailable",
    snapshotVersion: artifact?.snapshotVersion ?? null,
    snapshotKind: artifact?.snapshotKind ?? null,
    contractVersion: artifact?.contractVersion ?? null,
    summaryVersion: artifact?.summaryVersion ?? null,
    currentRoot: artifact?.currentRoot ?? null,
    currentRootRegistrationBasis: artifact?.currentRootRegistrationBasis ?? null,
    currentRootProofId: artifact?.currentRootProofId ?? null,
    latestProofId: artifact?.latestProofId ?? null,
    latestProofAction: artifact?.latestProofAction ?? null,
    latestSendProofId: artifact?.latestSendProofId ?? null,
    latestSendLinkedProofId: artifact?.latestSendLinkedProofId ?? null,
    latestSendId: artifact?.latestSendId ?? null,
    latestSendRecordProofId: artifact?.latestSendRecordProofId ?? null,
    latestSendResultingRoot: artifact?.latestSendResultingRoot ?? null,
    latestConsumeRecordProofId: artifact?.latestConsumeRecordProofId ?? null,
    latestConsumeLinkedProofId: artifact?.latestConsumeLinkedProofId ?? null,
    latestConsumeRoot: artifact?.latestConsumeRoot ?? null,
    latestReleaseRecordProofId: artifact?.latestReleaseRecordProofId ?? null,
    latestReleaseLinkedProofId: artifact?.latestReleaseLinkedProofId ?? null,
    latestReleaseRequestId: artifact?.latestReleaseRequestId ?? null,
    latestReleaseRoot: artifact?.latestReleaseRoot ?? null,
    latestReleaseDestination: artifact?.latestReleaseDestination ?? null,
    latestReleasedAssetId: artifact?.latestReleasedAssetId ?? null,
    latestReleasedAmount: artifact?.latestReleasedAmount ?? null,
    releaseCandidateId: artifact?.releaseCandidateId ?? null,
    releaseCandidateLineageStatusRaw: artifact?.releaseCandidateLineageStatus ?? null,
    releaseCandidateLineageStatus: humanizeReleaseCandidateLineageStatus(
      artifact?.releaseCandidateLineageStatus,
    ),
    releaseCandidateLineageNote: artifact?.releaseCandidateLineageNote ?? "Unavailable",
    snapshotTransport: contract?.supportedOperatorSnapshotTransport ?? null,
    snapshotEndpoint: contract?.supportedOperatorSnapshotEndpoint ?? null,
    shippingArtifactTransport: contract?.supportedShippingArtifactTransport ?? null,
    shippingArtifactEndpoint: contract?.supportedShippingArtifactEndpoint ?? null,
    shippingArtifactGateTransport: contract?.supportedShippingArtifactGateTransport ?? null,
    shippingArtifactGateEndpoint: contract?.supportedShippingArtifactGateEndpoint ?? null,
    summaryGenerated: shipping?.summaryGenerated ?? null,
    shippingStatusRaw: shipping?.shippingStatusRaw ?? null,
    shippingStatus: humanizeShippingStatus(shipping?.shippingStatusRaw),
    shippingNote: shipping?.shippingNote ?? "Unavailable",
    finishLineStatusRaw: shipping?.finishLineStatusRaw ?? null,
    finishLineStatus: humanizeFinishLineStatus(shipping?.finishLineStatusRaw),
    finishLineNote: shipping?.finishLineNote ?? "Unavailable",
    requiredLanesStatusRaw: shipping?.requiredLanesStatusRaw ?? null,
    requiredLanesStatus: humanizeRequiredLanesStatus(shipping?.requiredLanesStatusRaw),
    requiredLanesNote: shipping?.requiredLanesNote ?? "Unavailable",
    releaseBoundaryStatusRaw: shipping?.releaseBoundaryStatusRaw ?? null,
    releaseBoundaryStatus: humanizeReleaseBoundaryStatus(shipping?.releaseBoundaryStatusRaw),
    releaseBoundaryNote: shipping?.releaseBoundaryNote ?? "Unavailable",
    contractMirrorStatusRaw: shipping?.contractMirrorStatusRaw ?? null,
    contractMirrorStatus: humanizeContractMirrorStatus(shipping?.contractMirrorStatusRaw),
    contractMirrorNote: shipping?.contractMirrorNote ?? "Unavailable",
    boundaryStatusRaw: shipping?.boundaryStatusRaw ?? null,
    boundaryStatus: humanizeBoundaryStatus(shipping?.boundaryStatusRaw),
    boundaryNote: shipping?.boundaryNote ?? "Unavailable",
  };
}

function printArtifactSurface(surface, writer = console.log) {
  printLine("Operator", surface.operator, writer);
  printLine("Artifact version", String(surface.artifactVersion ?? "unknown"), writer);
  printLine("Artifact kind", surface.artifactKind ?? "Unavailable", writer);
  printLine("Decision version", String(surface.decisionVersion ?? "unknown"), writer);
  printLine("Decision kind", surface.decisionKind ?? "Unavailable", writer);
  printLine("Decision status", surface.decisionStatus, writer);
  printLine("Decision note", surface.decisionNote, writer);
  printLine("Snapshot version", String(surface.snapshotVersion ?? "unknown"), writer);
  printLine("Snapshot kind", surface.snapshotKind ?? "Unavailable", writer);
  printLine("Contract version", String(surface.contractVersion ?? "unknown"), writer);
  printLine("Summary version", String(surface.summaryVersion ?? "unknown"), writer);
  printLine("Current root", surface.currentRoot ?? "Unavailable", writer);
  printLine(
    "Current root registration",
    humanizeRootRegistrationBasis(surface.currentRootRegistrationBasis),
    writer,
  );
  printLine("Current root proof", surface.currentRootProofId ?? "Unavailable", writer);
  printLine("Latest proof", surface.latestProofId ?? "Unavailable", writer);
  printLine("Latest proof action", humanizeProofAction(surface.latestProofAction), writer);
  printLine("Latest send proof", surface.latestSendProofId ?? "Unavailable", writer);
  printLine("Latest send linked proof", surface.latestSendLinkedProofId ?? "Unavailable", writer);
  printLine("Latest send", surface.latestSendId ?? "Unavailable", writer);
  printLine("Latest send record proof", surface.latestSendRecordProofId ?? "Unavailable", writer);
  printLine("Latest send resulting root", surface.latestSendResultingRoot ?? "Unavailable", writer);
  printLine(
    "Latest consume record proof",
    surface.latestConsumeRecordProofId ?? "Unavailable",
    writer,
  );
  printLine(
    "Latest consume linked proof",
    surface.latestConsumeLinkedProofId ?? "Unavailable",
    writer,
  );
  printLine("Latest consume root", surface.latestConsumeRoot ?? "Unavailable", writer);
  printLine(
    "Latest release record proof",
    surface.latestReleaseRecordProofId ?? "Unavailable",
    writer,
  );
  printLine(
    "Latest release linked proof",
    surface.latestReleaseLinkedProofId ?? "Unavailable",
    writer,
  );
  printLine("Latest release request", surface.latestReleaseRequestId ?? "Unavailable", writer);
  printLine("Latest release root", surface.latestReleaseRoot ?? "Unavailable", writer);
  printLine(
    "Latest release destination",
    surface.latestReleaseDestination ?? "Unavailable",
    writer,
  );
  printLine("Latest released asset", surface.latestReleasedAssetId ?? "Unavailable", writer);
  printLine("Latest released amount", surface.latestReleasedAmount ?? "Unavailable", writer);
  printLine("Release candidate", surface.releaseCandidateId ?? "Unavailable", writer);
  printLine("Release candidate lineage", surface.releaseCandidateLineageStatus, writer);
  printLine("Release candidate note", surface.releaseCandidateLineageNote, writer);
  printLine("Snapshot transport", surface.snapshotTransport ?? "Unavailable", writer);
  printLine("Snapshot endpoint", surface.snapshotEndpoint ?? "Unavailable", writer);
  printLine(
    "Shipping artifact transport",
    surface.shippingArtifactTransport ?? "Unavailable",
    writer,
  );
  printLine("Shipping artifact endpoint", surface.shippingArtifactEndpoint ?? "Unavailable", writer);
  printLine(
    "Shipping artifact gate transport",
    surface.shippingArtifactGateTransport ?? "Unavailable",
    writer,
  );
  printLine(
    "Shipping artifact gate endpoint",
    surface.shippingArtifactGateEndpoint ?? "Unavailable",
    writer,
  );
  printLine("Summary generated", surface.summaryGenerated ?? "Unavailable", writer);
  printLine("Shipping status", surface.shippingStatus, writer);
  printLine("Shipping note", surface.shippingNote, writer);
  printLine("Finish line status", surface.finishLineStatus, writer);
  printLine("Finish line note", surface.finishLineNote, writer);
  printLine("Required lanes status", surface.requiredLanesStatus, writer);
  printLine("Required lanes note", surface.requiredLanesNote, writer);
  printLine("Release boundary status", surface.releaseBoundaryStatus, writer);
  printLine("Release boundary note", surface.releaseBoundaryNote, writer);
  printLine("Contract mirror status", surface.contractMirrorStatus, writer);
  printLine("Contract mirror note", surface.contractMirrorNote, writer);
  printLine("Boundary status", surface.boundaryStatus, writer);
  printLine("Boundary note", surface.boundaryNote, writer);
}

function humanizeDecisionStatus(value) {
  switch (value) {
    case "ready-to-ship":
      return "Ready to ship";
    case "blocked":
      return "Blocked";
    default:
      return "Unknown";
  }
}

function humanizeShippingStatus(value) {
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

function humanizeReleaseCandidateLineageStatus(value) {
  switch (value) {
    case "ready":
      return "Candidate lineage ready";
    case "blocked":
      return "Candidate lineage blocked";
    case "send-mismatch":
      return "Candidate/send mismatch";
    case "consume-mismatch":
      return "Candidate/consume mismatch";
    case "release-mismatch":
      return "Candidate/release mismatch";
    case "unavailable":
      return "No candidate lineage";
    default:
      return "Unknown";
  }
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

function humanizeFinishLineStatus(value) {
  switch (value) {
    case "coherent-minimum-v1-lane":
      return "Coherent minimum v1 lane";
    case "contract-mismatch":
      return "Contract mismatch";
    case "boundary-mismatch":
      return "Boundary mismatch";
    default:
      return "Unknown";
  }
}

function humanizeReleaseBoundaryStatus(value) {
  switch (value) {
    case "release-recorded":
      return "Release recorded";
    case "consume-without-release":
      return "Consume without release";
    case "proof-unlinked":
      return "Proof unlinked";
    case "authorization-mismatch":
      return "Authorization mismatch";
    case "root-policy-mismatch":
      return "Root-policy mismatch";
    case "contract-mismatch":
      return "Contract mismatch";
    case "boundary-mismatch":
      return "Boundary mismatch";
    default:
      return "Unavailable";
  }
}

function humanizeContractMirrorStatus(value) {
  switch (value) {
    case "mirrors-contract":
      return "Summary mirrors frozen contract";
    case "contract-mismatch":
      return "Contract mismatch";
    default:
      return "Unknown";
  }
}

function humanizeBoundaryStatus(value) {
  switch (value) {
    case "coherent":
      return "Operator boundary coherent";
    case "awaiting-current-root":
      return "Awaiting current root";
    case "root-registration-unlinked":
      return "Root registration unlinked";
    case "send-root-registration-unlinked":
      return "Send root registration unlinked";
    case "send-root-output-mismatch":
      return "Send root output mismatch";
    case "proof-send-unlinked":
      return "Proof/send unlinked";
    case "proof-consume-unlinked":
      return "Proof/consume unlinked";
    case "proof-release-unlinked":
      return "Proof/release unlinked";
    default:
      return "Unknown";
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

function humanizeProofAction(value) {
  switch (value) {
    case "consume":
      return "Consume";
    case "proof-only":
      return "Proof only";
    case "register-root":
      return "Register root";
    default:
      return "Unavailable";
  }
}

function printLine(label, value, writer = console.log) {
  writer(`${label}: ${value}`);
}

async function requestJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${path}`);
  }

  return response.json();
}

function resolveBaseUrl(argv) {
  const cliValue = readFlagValue(argv, "--base-url");
  const envValue = process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL;
  const raw =
    (typeof cliValue === "string" && cliValue.trim()) ||
    (typeof envValue === "string" && envValue.trim()) ||
    "http://127.0.0.1:8789";

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return argv[index + 1] ?? null;
}
