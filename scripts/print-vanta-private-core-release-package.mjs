const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const rawPackage = checkReady
    ? await requestJson("/state/private-core-release-package-check")
    : await requestJson("/state/private-core-release-package");
  const releasePackage = checkReady ? rawPackage?.releasePackage ?? {} : rawPackage ?? {};
  const surface = buildReleasePackageSurface(releasePackage);

  if (checkReady && rawPackage?.decisionStatus !== "ready") {
    if (jsonMode) {
      console.error(JSON.stringify(releasePackage, null, 2));
    } else {
      printReleasePackageSurface(surface, console.error);
    }
    throw new Error(
      [
        `Release package decision status: ${humanizeCheckStatus(rawPackage?.decisionStatus)}`,
        `Release package decision note: ${rawPackage?.decisionNote ?? "Unavailable"}`,
      ].join("\n"),
    );
  }

  if (jsonMode) {
    console.log(JSON.stringify(releasePackage, null, 2));
  } else {
    printReleasePackageSurface(surface);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core release package",
  );
  process.exitCode = 1;
}

function buildReleasePackageSurface(releasePackage) {
  return {
    operator: releasePackage?.operator ?? baseUrl,
    packageVersion: releasePackage?.packageVersion ?? null,
    packageKind: releasePackage?.packageKind ?? null,
    packageStatusRaw: releasePackage?.packageStatus ?? null,
    packageStatus: humanizeCheckStatus(releasePackage?.packageStatus),
    packageNote: releasePackage?.packageNote ?? "Unavailable",
    decisionVersion: releasePackage?.decisionVersion ?? null,
    decisionKind: releasePackage?.decisionKind ?? null,
    decisionStatusRaw: releasePackage?.decisionStatus ?? null,
    decisionStatus: humanizeDecisionStatus(releasePackage?.decisionStatus),
    decisionNote: releasePackage?.decisionNote ?? "Unavailable",
    artifactVersion: releasePackage?.artifactVersion ?? null,
    artifactKind: releasePackage?.artifactKind ?? null,
    candidateVersion: releasePackage?.candidateVersion ?? null,
    candidateKind: releasePackage?.candidateKind ?? null,
    releaseCandidateId: releasePackage?.releaseCandidateId ?? null,
    releaseCandidateLineageStatusRaw: releasePackage?.releaseCandidateLineageStatus ?? null,
    releaseCandidateLineageStatus: humanizeLineageStatus(
      releasePackage?.releaseCandidateLineageStatus,
    ),
    releaseCandidateLineageNote: releasePackage?.releaseCandidateLineageNote ?? "Unavailable",
    contractVersion: releasePackage?.contractVersion ?? null,
    summaryVersion: releasePackage?.summaryVersion ?? null,
    snapshotVersion: releasePackage?.snapshotVersion ?? null,
    snapshotKind: releasePackage?.snapshotKind ?? null,
    summaryGenerated: releasePackage?.summaryGenerated ?? null,
    currentRoot: releasePackage?.currentRoot ?? null,
    currentRootRegistrationBasis: releasePackage?.currentRootRegistrationBasis ?? null,
    currentRootProofId: releasePackage?.currentRootProofId ?? null,
    latestProofId: releasePackage?.latestProofId ?? null,
    latestProofAction: releasePackage?.latestProofAction ?? null,
    latestSendProofId: releasePackage?.latestSendProofId ?? null,
    latestSendLinkedProofId: releasePackage?.latestSendLinkedProofId ?? null,
    latestSendId: releasePackage?.latestSendId ?? null,
    latestSendRecordProofId: releasePackage?.latestSendRecordProofId ?? null,
    latestSendResultingRoot: releasePackage?.latestSendResultingRoot ?? null,
    latestConsumeRecordProofId: releasePackage?.latestConsumeRecordProofId ?? null,
    latestConsumeLinkedProofId: releasePackage?.latestConsumeLinkedProofId ?? null,
    latestConsumeRoot: releasePackage?.latestConsumeRoot ?? null,
    latestReleaseRecordProofId: releasePackage?.latestReleaseRecordProofId ?? null,
    latestReleaseLinkedProofId: releasePackage?.latestReleaseLinkedProofId ?? null,
    latestReleaseRequestId: releasePackage?.latestReleaseRequestId ?? null,
    latestReleaseRoot: releasePackage?.latestReleaseRoot ?? null,
    latestReleaseDestination: releasePackage?.latestReleaseDestination ?? null,
    latestReleasedAssetId: releasePackage?.latestReleasedAssetId ?? null,
    latestReleasedAmount: releasePackage?.latestReleasedAmount ?? null,
  };
}

function printReleasePackageSurface(surface, writer = console.log) {
  printLine("Operator", surface.operator, writer);
  printLine("Package version", String(surface.packageVersion ?? "unknown"), writer);
  printLine("Package kind", surface.packageKind ?? "Unavailable", writer);
  printLine("Package status", surface.packageStatus, writer);
  printLine("Package note", surface.packageNote, writer);
  printLine("Decision version", String(surface.decisionVersion ?? "unknown"), writer);
  printLine("Decision kind", surface.decisionKind ?? "Unavailable", writer);
  printLine("Decision status", surface.decisionStatus, writer);
  printLine("Decision note", surface.decisionNote, writer);
  printLine("Artifact version", String(surface.artifactVersion ?? "unknown"), writer);
  printLine("Artifact kind", surface.artifactKind ?? "Unavailable", writer);
  printLine("Candidate version", String(surface.candidateVersion ?? "unknown"), writer);
  printLine("Candidate kind", surface.candidateKind ?? "Unavailable", writer);
  printLine("Release candidate", surface.releaseCandidateId ?? "Unavailable", writer);
  printLine("Release candidate lineage", surface.releaseCandidateLineageStatus, writer);
  printLine("Release candidate note", surface.releaseCandidateLineageNote, writer);
  printLine("Contract version", String(surface.contractVersion ?? "unknown"), writer);
  printLine("Summary version", String(surface.summaryVersion ?? "unknown"), writer);
  printLine("Snapshot version", String(surface.snapshotVersion ?? "unknown"), writer);
  printLine("Snapshot kind", surface.snapshotKind ?? "Unavailable", writer);
  printLine("Summary generated", surface.summaryGenerated ?? "Unavailable", writer);
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

function humanizeCheckStatus(value) {
  switch (value) {
    case "ready":
      return "Ready";
    case "blocked":
      return "Blocked";
    default:
      return "Unknown";
  }
}

function humanizeLineageStatus(value) {
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

function printLine(label, value, writer = console.log) {
  writer(`${label}: ${value}`);
}

async function requestJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(text || `Request failed: ${path}`);
  }

  return parsed;
}

function resolveBaseUrl(cliArgs) {
  const explicitIndex = cliArgs.indexOf("--base-url");
  if (explicitIndex !== -1 && typeof cliArgs[explicitIndex + 1] === "string") {
    return cliArgs[explicitIndex + 1];
  }

  return process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL ?? "http://127.0.0.1:8789";
}
