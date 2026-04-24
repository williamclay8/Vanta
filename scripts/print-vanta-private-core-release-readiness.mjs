const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const shippingCheck = await requestJson("/state/private-core-shipping-decision-check");
  const candidateCheck = await requestJson("/state/private-core-release-candidate-check");
  const packageCheck = await requestJson("/state/private-core-release-package-check");

  const shippingDecision = shippingCheck?.decision ?? {};
  const candidate = candidateCheck?.candidate ?? {};
  const releasePackage = packageCheck?.releasePackage ?? {};
  const surface = buildReleaseReadinessSurface({
    candidate,
    candidateDecisionNote: candidateCheck?.decisionNote ?? null,
    candidateDecisionStatus: candidateCheck?.decisionStatus ?? null,
    releasePackage,
    packageDecisionNote: packageCheck?.decisionNote ?? null,
    packageDecisionStatus: packageCheck?.decisionStatus ?? null,
    shippingDecision,
  });

  if (checkReady && surface.readinessStatusRaw !== "ready") {
    if (jsonMode) {
      console.error(JSON.stringify(surface, null, 2));
    } else {
      printReleaseReadinessSurface(surface, console.error);
    }
    throw new Error(
      [
        `Release readiness status: ${surface.readinessStatus}`,
        `Release readiness note: ${surface.readinessNote}`,
      ].join("\n"),
    );
  }

  if (jsonMode) {
    console.log(JSON.stringify(surface, null, 2));
  } else {
    printReleaseReadinessSurface(surface);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core release readiness",
  );
  process.exitCode = 1;
}

function buildReleaseReadinessSurface(args) {
  const shippingDecision = args.shippingDecision ?? {};
  const candidate = args.candidate ?? {};
  const releasePackage = args.releasePackage ?? {};
  const shippingReady = shippingDecision?.decisionStatus === "ready-to-ship";
  const candidateReady = args.candidateDecisionStatus === "ready";
  const packageReady = args.packageDecisionStatus === "ready";
  const consistency = computeReleaseReadinessConsistency({
    candidate,
    releasePackage,
    shippingDecision,
  });
  const consistencyReady = consistency.statusRaw === "matched";
  const readinessStatusRaw =
    shippingReady && candidateReady && packageReady && consistencyReady ? "ready" : "blocked";
  const readinessNote =
    readinessStatusRaw === "ready"
      ? "Primary send -> unshield release lane is coherent, package-ready, and reviewer-ready."
      : consistency.statusRaw === "mismatch"
        ? consistency.note
      : args.packageDecisionNote ??
        args.candidateDecisionNote ??
        shippingDecision?.decisionNote ??
        "Release-readiness blocker unavailable.";

  return {
    operator: baseUrl,
    readinessVersion: 1,
    readinessKind: "primary-send-unshield-release-readiness",
    readinessStatusRaw,
    readinessStatus: humanizeReadinessStatus(readinessStatusRaw),
    readinessNote,
    canonicalLane: "primary-send-unshield-only",
    reviewCommand: "npm run private-core:release-readiness",
    reviewGateCommand: "npm run private-core:release-readiness-check",
    shippingDecisionStatusRaw: shippingDecision?.decisionStatus ?? null,
    shippingDecisionStatus: humanizeDecisionStatus(shippingDecision?.decisionStatus),
    shippingDecisionNote: shippingDecision?.decisionNote ?? "Unavailable",
    shippingStatusRaw: shippingDecision?.shippingStatus ?? null,
    shippingStatus: humanizeShippingStatus(shippingDecision?.shippingStatus),
    shippingNote: shippingDecision?.shippingNote ?? "Unavailable",
    consistencyStatusRaw: consistency.statusRaw,
    consistencyStatus: humanizeConsistencyStatus(consistency.statusRaw),
    consistencyNote: consistency.note,
    consistencyMismatches: consistency.mismatches,
    releaseCandidateId: candidate?.releaseCandidateId ?? releasePackage?.releaseCandidateId ?? null,
    candidateDecisionStatusRaw: args.candidateDecisionStatus ?? null,
    candidateDecisionStatus: humanizeCheckStatus(args.candidateDecisionStatus),
    candidateDecisionNote: args.candidateDecisionNote ?? "Unavailable",
    candidateLineageStatusRaw: candidate?.lineageStatus ?? null,
    candidateLineageStatus: humanizeLineageStatus(candidate?.lineageStatus),
    candidateLineageNote: candidate?.lineageNote ?? "Unavailable",
    packageIdentity:
      releasePackage?.packageVersion && releasePackage?.packageKind
        ? `Package v${String(releasePackage.packageVersion)} · ${releasePackage.packageKind}`
        : "Package identity unavailable",
    packageStatusRaw: releasePackage?.packageStatus ?? null,
    packageStatus: humanizeCheckStatus(releasePackage?.packageStatus),
    packageNote: releasePackage?.packageNote ?? "Unavailable",
    packageDecisionStatusRaw: args.packageDecisionStatus ?? null,
    packageDecisionStatus: humanizeCheckStatus(args.packageDecisionStatus),
    packageDecisionNote: args.packageDecisionNote ?? "Unavailable",
    artifactIdentity:
      releasePackage?.artifactVersion && releasePackage?.artifactKind
        ? `Artifact v${String(releasePackage.artifactVersion)} · ${releasePackage.artifactKind}`
        : "Artifact identity unavailable",
    decisionIdentity:
      releasePackage?.decisionVersion && releasePackage?.decisionKind
        ? `Decision v${String(releasePackage.decisionVersion)} · ${releasePackage.decisionKind}`
        : "Decision identity unavailable",
    contractIdentity:
      releasePackage?.contractVersion && releasePackage?.summaryVersion
        ? `Contract v${String(releasePackage.contractVersion)} · Summary v${String(
            releasePackage.summaryVersion,
          )}`
        : "Contract identity unavailable",
    snapshotIdentity:
      releasePackage?.snapshotVersion && releasePackage?.snapshotKind
        ? `Snapshot v${String(releasePackage.snapshotVersion)} · ${releasePackage.snapshotKind}`
        : "Snapshot identity unavailable",
    summaryGenerated: releasePackage?.summaryGenerated ?? shippingDecision?.generatedAt ?? null,
    currentRoot: releasePackage?.currentRoot ?? "Unavailable",
    latestProof: releasePackage?.latestProofId ?? "Unavailable",
    latestSend: releasePackage?.latestSendId ?? "Unavailable",
    latestReleaseRequest: releasePackage?.latestReleaseRequestId ?? "Unavailable",
    latestReleaseDestination: releasePackage?.latestReleaseDestination ?? "Unavailable",
    latestReleasedAmount: releasePackage?.latestReleasedAmount ?? "Unavailable",
  };
}

function printReleaseReadinessSurface(surface, writer = console.log) {
  printLine("Operator", surface.operator, writer);
  printLine("Readiness version", String(surface.readinessVersion), writer);
  printLine("Readiness kind", surface.readinessKind, writer);
  printLine("Readiness status", surface.readinessStatus, writer);
  printLine("Readiness note", surface.readinessNote, writer);
  printLine("Canonical lane", surface.canonicalLane, writer);
  printLine("Review command", surface.reviewCommand, writer);
  printLine("Gate command", surface.reviewGateCommand, writer);
  printLine("Shipping decision", surface.shippingDecisionStatus, writer);
  printLine("Shipping decision note", surface.shippingDecisionNote, writer);
  printLine("Shipping status", surface.shippingStatus, writer);
  printLine("Shipping note", surface.shippingNote, writer);
  printLine("Consistency status", surface.consistencyStatus, writer);
  printLine("Consistency note", surface.consistencyNote, writer);
  printLine("Release candidate", surface.releaseCandidateId ?? "Unavailable", writer);
  printLine("Candidate decision", surface.candidateDecisionStatus, writer);
  printLine("Candidate decision note", surface.candidateDecisionNote, writer);
  printLine("Candidate lineage", surface.candidateLineageStatus, writer);
  printLine("Candidate lineage note", surface.candidateLineageNote, writer);
  printLine("Package identity", surface.packageIdentity, writer);
  printLine("Package", surface.packageStatus, writer);
  printLine("Package note", surface.packageNote, writer);
  printLine("Package gate", surface.packageDecisionStatus, writer);
  printLine("Package gate note", surface.packageDecisionNote, writer);
  printLine("Artifact identity", surface.artifactIdentity, writer);
  printLine("Decision identity", surface.decisionIdentity, writer);
  printLine("Contract identity", surface.contractIdentity, writer);
  printLine("Snapshot identity", surface.snapshotIdentity, writer);
  printLine("Summary generated", surface.summaryGenerated ?? "Unavailable", writer);
  printLine("Current root", surface.currentRoot, writer);
  printLine("Latest proof", surface.latestProof, writer);
  printLine("Latest send", surface.latestSend, writer);
  printLine("Latest release request", surface.latestReleaseRequest, writer);
  printLine("Latest release destination", surface.latestReleaseDestination, writer);
  printLine("Latest released amount", surface.latestReleasedAmount, writer);
}

function humanizeReadinessStatus(value) {
  switch (value) {
    case "ready":
      return "Ready";
    case "blocked":
      return "Blocked";
    default:
      return "Unknown";
  }
}

function computeReleaseReadinessConsistency(args) {
  const candidate = args.candidate ?? {};
  const releasePackage = args.releasePackage ?? {};
  const shippingDecision = args.shippingDecision ?? {};
  const comparisons = [
    ["candidate.releaseCandidateId", candidate.releaseCandidateId, "releasePackage.releaseCandidateId", releasePackage.releaseCandidateId],
    ["candidate.lineageStatus", candidate.lineageStatus, "releasePackage.releaseCandidateLineageStatus", releasePackage.releaseCandidateLineageStatus],
    ["candidate.lineageNote", candidate.lineageNote, "releasePackage.releaseCandidateLineageNote", releasePackage.releaseCandidateLineageNote],
    ["candidate.decisionVersion", candidate.decisionVersion, "releasePackage.decisionVersion", releasePackage.decisionVersion],
    ["candidate.decisionKind", candidate.decisionKind, "releasePackage.decisionKind", releasePackage.decisionKind],
    ["candidate.decisionStatus", candidate.decisionStatus, "releasePackage.decisionStatus", releasePackage.decisionStatus],
    ["candidate.decisionNote", candidate.decisionNote, "releasePackage.decisionNote", releasePackage.decisionNote],
    ["candidate.contractVersion", candidate.contractVersion, "releasePackage.contractVersion", releasePackage.contractVersion],
    ["candidate.summaryVersion", candidate.summaryVersion, "releasePackage.summaryVersion", releasePackage.summaryVersion],
    ["candidate.artifactVersion", candidate.artifactVersion, "releasePackage.artifactVersion", releasePackage.artifactVersion],
    ["candidate.artifactKind", candidate.artifactKind, "releasePackage.artifactKind", releasePackage.artifactKind],
    ["candidate.candidateVersion", candidate.candidateVersion, "releasePackage.candidateVersion", releasePackage.candidateVersion],
    ["candidate.candidateKind", candidate.candidateKind, "releasePackage.candidateKind", releasePackage.candidateKind],
    ["candidate.snapshotVersion", candidate.snapshotVersion, "releasePackage.snapshotVersion", releasePackage.snapshotVersion],
    ["candidate.snapshotKind", candidate.snapshotKind, "releasePackage.snapshotKind", releasePackage.snapshotKind],
    ["candidate.sendId", candidate.sendId, "releasePackage.latestSendId", releasePackage.latestSendId],
    ["candidate.sendProofId", candidate.sendProofId, "releasePackage.latestSendProofId", releasePackage.latestSendProofId],
    ["candidate.sendLinkedProofId", candidate.sendLinkedProofId, "releasePackage.latestSendLinkedProofId", releasePackage.latestSendLinkedProofId],
    ["candidate.sendRecordProofId", candidate.sendRecordProofId, "releasePackage.latestSendRecordProofId", releasePackage.latestSendRecordProofId],
    ["candidate.sendResultingRoot", candidate.sendResultingRoot, "releasePackage.latestSendResultingRoot", releasePackage.latestSendResultingRoot],
    ["candidate.consumeRecordProofId", candidate.consumeRecordProofId, "releasePackage.latestConsumeRecordProofId", releasePackage.latestConsumeRecordProofId],
    ["candidate.consumeLinkedProofId", candidate.consumeLinkedProofId, "releasePackage.latestConsumeLinkedProofId", releasePackage.latestConsumeLinkedProofId],
    ["candidate.consumeRoot", candidate.consumeRoot, "releasePackage.latestConsumeRoot", releasePackage.latestConsumeRoot],
    ["candidate.releaseRecordProofId", candidate.releaseRecordProofId, "releasePackage.latestReleaseRecordProofId", releasePackage.latestReleaseRecordProofId],
    ["candidate.releaseLinkedProofId", candidate.releaseLinkedProofId, "releasePackage.latestReleaseLinkedProofId", releasePackage.latestReleaseLinkedProofId],
    ["candidate.releaseRequestId", candidate.releaseRequestId, "releasePackage.latestReleaseRequestId", releasePackage.latestReleaseRequestId],
    ["candidate.releaseRoot", candidate.releaseRoot, "releasePackage.latestReleaseRoot", releasePackage.latestReleaseRoot],
    ["candidate.releaseDestination", candidate.releaseDestination, "releasePackage.latestReleaseDestination", releasePackage.latestReleaseDestination],
    ["candidate.releasedAssetId", candidate.releasedAssetId, "releasePackage.latestReleasedAssetId", releasePackage.latestReleasedAssetId],
    ["candidate.releasedAmount", candidate.releasedAmount, "releasePackage.latestReleasedAmount", releasePackage.latestReleasedAmount],
    ["shippingDecision.decisionVersion", shippingDecision.decisionVersion, "releasePackage.decisionVersion", releasePackage.decisionVersion],
    ["shippingDecision.decisionKind", shippingDecision.decisionKind, "releasePackage.decisionKind", releasePackage.decisionKind],
    ["shippingDecision.decisionStatus", shippingDecision.decisionStatus, "releasePackage.decisionStatus", releasePackage.decisionStatus],
    ["shippingDecision.decisionNote", shippingDecision.decisionNote, "releasePackage.decisionNote", releasePackage.decisionNote],
    ["shippingDecision.contractVersion", shippingDecision.contractVersion, "releasePackage.contractVersion", releasePackage.contractVersion],
    ["shippingDecision.summaryVersion", shippingDecision.summaryVersion, "releasePackage.summaryVersion", releasePackage.summaryVersion],
  ];
  const mismatches = comparisons
    .filter(([, leftValue, , rightValue]) => leftValue !== rightValue)
    .map(([leftPath, leftValue, rightPath, rightValue]) => ({
      leftPath,
      leftValue: leftValue ?? null,
      rightPath,
      rightValue: rightValue ?? null,
    }));

  return {
    statusRaw: mismatches.length === 0 ? "matched" : "mismatch",
    note:
      mismatches.length === 0
        ? "Release candidate, release package, and shipping decision surfaces agree across the ready-lane identity fields."
        : `Release readiness consistency mismatch: ${mismatches.map((mismatch) => `${mismatch.leftPath} != ${mismatch.rightPath}`).join(", ")}.`,
    mismatches,
  };
}

function humanizeConsistencyStatus(value) {
  switch (value) {
    case "matched":
      return "Matched";
    case "mismatch":
      return "Mismatch";
    default:
      return "Unknown";
  }
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
