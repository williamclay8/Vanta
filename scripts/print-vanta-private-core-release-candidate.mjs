const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const rawCandidate = checkReady
    ? await requestJson("/state/private-core-release-candidate-check")
    : await requestJson("/state/private-core-release-candidate");
  const candidate = checkReady ? rawCandidate?.candidate ?? {} : rawCandidate ?? {};
  const surface = buildCandidateSurface(candidate);

  if (checkReady && rawCandidate?.decisionStatus !== "ready") {
    if (jsonMode) {
      console.error(JSON.stringify(candidate, null, 2));
    } else {
      printCandidateSurface(surface, console.error);
    }
    throw new Error(
      [
        `Release candidate decision status: ${humanizeCheckStatus(rawCandidate?.decisionStatus)}`,
        `Release candidate decision note: ${rawCandidate?.decisionNote ?? "Unavailable"}`,
      ].join("\n"),
    );
  }

  if (jsonMode) {
    console.log(JSON.stringify(candidate, null, 2));
  } else {
    printCandidateSurface(surface);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core release candidate",
  );
  process.exitCode = 1;
}

function buildCandidateSurface(candidate) {
  return {
    operator: candidate?.operator ?? baseUrl,
    candidateVersion: candidate?.candidateVersion ?? null,
    candidateKind: candidate?.candidateKind ?? null,
    decisionVersion: candidate?.decisionVersion ?? null,
    decisionKind: candidate?.decisionKind ?? null,
    decisionStatusRaw: candidate?.decisionStatus ?? null,
    decisionStatus: humanizeDecisionStatus(candidate?.decisionStatus),
    decisionNote: candidate?.decisionNote ?? "Unavailable",
    contractVersion: candidate?.contractVersion ?? null,
    summaryVersion: candidate?.summaryVersion ?? null,
    artifactVersion: candidate?.artifactVersion ?? null,
    artifactKind: candidate?.artifactKind ?? null,
    releaseCandidateId: candidate?.releaseCandidateId ?? null,
    lineageStatusRaw: candidate?.lineageStatus ?? null,
    lineageStatus: humanizeLineageStatus(candidate?.lineageStatus),
    lineageNote: candidate?.lineageNote ?? "Unavailable",
    sendId: candidate?.sendId ?? null,
    sendProofId: candidate?.sendProofId ?? null,
    sendLinkedProofId: candidate?.sendLinkedProofId ?? null,
    sendRecordProofId: candidate?.sendRecordProofId ?? null,
    sendResultingRoot: candidate?.sendResultingRoot ?? null,
    consumeRecordProofId: candidate?.consumeRecordProofId ?? null,
    consumeLinkedProofId: candidate?.consumeLinkedProofId ?? null,
    consumeRoot: candidate?.consumeRoot ?? null,
    releaseRecordProofId: candidate?.releaseRecordProofId ?? null,
    releaseLinkedProofId: candidate?.releaseLinkedProofId ?? null,
    releaseRequestId: candidate?.releaseRequestId ?? null,
    releaseRoot: candidate?.releaseRoot ?? null,
    releaseDestination: candidate?.releaseDestination ?? null,
    releasedAssetId: candidate?.releasedAssetId ?? null,
    releasedAmount: candidate?.releasedAmount ?? null,
    snapshotVersion: candidate?.snapshotVersion ?? null,
    snapshotKind: candidate?.snapshotKind ?? null,
  };
}

function printCandidateSurface(surface, writer = console.log) {
  printLine("Operator", surface.operator, writer);
  printLine("Candidate version", String(surface.candidateVersion ?? "unknown"), writer);
  printLine("Candidate kind", surface.candidateKind ?? "Unavailable", writer);
  printLine("Decision version", String(surface.decisionVersion ?? "unknown"), writer);
  printLine("Decision kind", surface.decisionKind ?? "Unavailable", writer);
  printLine("Decision status", surface.decisionStatus, writer);
  printLine("Decision note", surface.decisionNote, writer);
  printLine("Contract version", String(surface.contractVersion ?? "unknown"), writer);
  printLine("Summary version", String(surface.summaryVersion ?? "unknown"), writer);
  printLine("Artifact version", String(surface.artifactVersion ?? "unknown"), writer);
  printLine("Artifact kind", surface.artifactKind ?? "Unavailable", writer);
  printLine("Release candidate", surface.releaseCandidateId ?? "Unavailable", writer);
  printLine("Lineage status", surface.lineageStatus, writer);
  printLine("Lineage note", surface.lineageNote, writer);
  printLine("Send", surface.sendId ?? "Unavailable", writer);
  printLine("Send proof", surface.sendProofId ?? "Unavailable", writer);
  printLine("Send linked proof", surface.sendLinkedProofId ?? "Unavailable", writer);
  printLine("Send record proof", surface.sendRecordProofId ?? "Unavailable", writer);
  printLine("Send resulting root", surface.sendResultingRoot ?? "Unavailable", writer);
  printLine("Consume record proof", surface.consumeRecordProofId ?? "Unavailable", writer);
  printLine("Consume linked proof", surface.consumeLinkedProofId ?? "Unavailable", writer);
  printLine("Consume root", surface.consumeRoot ?? "Unavailable", writer);
  printLine("Release record proof", surface.releaseRecordProofId ?? "Unavailable", writer);
  printLine("Release linked proof", surface.releaseLinkedProofId ?? "Unavailable", writer);
  printLine("Release request", surface.releaseRequestId ?? "Unavailable", writer);
  printLine("Release root", surface.releaseRoot ?? "Unavailable", writer);
  printLine("Release destination", surface.releaseDestination ?? "Unavailable", writer);
  printLine("Released asset", surface.releasedAssetId ?? "Unavailable", writer);
  printLine("Released amount", surface.releasedAmount ?? "Unavailable", writer);
  printLine("Snapshot version", String(surface.snapshotVersion ?? "unknown"), writer);
  printLine("Snapshot kind", surface.snapshotKind ?? "Unavailable", writer);
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
