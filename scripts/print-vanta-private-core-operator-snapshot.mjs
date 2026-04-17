const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const snapshot = await requestJson("/state/private-core-snapshot");
  const surface = buildSnapshotSurface(snapshot);

  if (checkReady && surface.decisionStatusRaw !== "ready-to-ship") {
    if (jsonMode) {
      console.error(JSON.stringify(snapshot, null, 2));
    }
    throw new Error(
      [
        `Snapshot decision status: ${surface.decisionStatus}`,
        `Snapshot decision note: ${surface.decisionNote}`,
      ].join("\n"),
    );
  }

  if (jsonMode) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printSnapshotSurface(surface);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core operator snapshot",
  );
  process.exitCode = 1;
}

function buildSnapshotSurface(snapshot) {
  const contract = snapshot?.contract ?? {};
  const summary = snapshot?.status?.summary ?? {};
  const shippingDecision = snapshot?.status?.shippingDecision ?? {};
  const shipping = snapshot?.shipping ?? {};

  return {
    operator: snapshot?.operator ?? baseUrl,
    snapshotVersion: snapshot?.snapshotVersion ?? null,
    snapshotKind: snapshot?.snapshotKind ?? null,
    contractVersion: contract.contractVersion ?? null,
    contractSummaryVersion: contract.summaryVersion ?? null,
    snapshotTransport: contract.supportedOperatorSnapshotTransport ?? null,
    snapshotEndpoint: contract.supportedOperatorSnapshotEndpoint ?? null,
    summaryStateVersion: summary.stateVersion ?? null,
    summaryVersion: summary.summaryVersion ?? null,
    summaryGenerated: summary.generatedAt ?? null,
    decisionVersion: shippingDecision.decisionVersion ?? null,
    decisionKind: shippingDecision.decisionKind ?? null,
    decisionStatusRaw: shipping.decisionStatusRaw ?? shippingDecision.decisionStatus ?? null,
    decisionStatus: humanizeDecisionStatus(
      shipping.decisionStatusRaw ?? shippingDecision.decisionStatus,
    ),
    decisionNote: shipping.decisionNote ?? shippingDecision.decisionNote ?? "Unavailable",
    shippingStatusRaw: shipping.shippingStatusRaw ?? shippingDecision.shippingStatus ?? null,
    shippingStatus: humanizeShippingStatus(
      shipping.shippingStatusRaw ?? shippingDecision.shippingStatus,
    ),
    shippingNote: shipping.shippingNote ?? shippingDecision.shippingNote ?? "Unavailable",
    finishLineStatusRaw:
      shipping.finishLineStatusRaw ?? shippingDecision.finishLineStatus ?? null,
    finishLineStatus: humanizeFinishLineStatus(
      shipping.finishLineStatusRaw ?? shippingDecision.finishLineStatus,
    ),
    finishLineNote: shipping.finishLineNote ?? shippingDecision.finishLineNote ?? "Unavailable",
    requiredLanesStatusRaw:
      shipping.requiredLanesStatusRaw ?? shippingDecision.requiredLanesStatus ?? null,
    requiredLanesStatus: humanizeRequiredLanesStatus(
      shipping.requiredLanesStatusRaw ?? shippingDecision.requiredLanesStatus,
    ),
    requiredLanesNote:
      shipping.requiredLanesNote ?? shippingDecision.requiredLanesNote ?? "Unavailable",
    releaseBoundaryStatusRaw:
      shipping.releaseBoundaryStatusRaw ?? shippingDecision.releaseBoundaryStatus ?? null,
    releaseBoundaryStatus: humanizeReleaseBoundaryStatus(
      shipping.releaseBoundaryStatusRaw ?? shippingDecision.releaseBoundaryStatus,
    ),
    releaseBoundaryNote:
      shipping.releaseBoundaryNote ?? shippingDecision.releaseBoundaryNote ?? "Unavailable",
    contractMirrorStatusRaw:
      shipping.contractMirrorStatusRaw ?? shippingDecision.contractMirrorStatus ?? null,
    contractMirrorStatus: humanizeContractMirrorStatus(
      shipping.contractMirrorStatusRaw ?? shippingDecision.contractMirrorStatus,
    ),
    contractMirrorNote:
      shipping.contractMirrorNote ?? shippingDecision.contractMirrorNote ?? "Unavailable",
    boundaryStatusRaw: shipping.boundaryStatusRaw ?? shippingDecision.boundaryStatus ?? null,
    boundaryStatus: humanizeBoundaryStatus(
      shipping.boundaryStatusRaw ?? shippingDecision.boundaryStatus,
    ),
    boundaryNote: shipping.boundaryNote ?? shippingDecision.boundaryNote ?? "Unavailable",
  };
}

function printSnapshotSurface(surface) {
  printLine("Operator", surface.operator);
  printLine("Snapshot version", String(surface.snapshotVersion ?? "unknown"));
  printLine("Snapshot kind", surface.snapshotKind ?? "Unavailable");
  printLine("Snapshot transport", surface.snapshotTransport ?? "Unavailable");
  printLine("Snapshot endpoint", surface.snapshotEndpoint ?? "Unavailable");
  printLine("Contract version", String(surface.contractVersion ?? "unknown"));
  printLine(
    "Contract summary version",
    String(surface.contractSummaryVersion ?? "unknown"),
  );
  printLine("Summary state version", String(surface.summaryStateVersion ?? "unknown"));
  printLine("Summary version", String(surface.summaryVersion ?? "unknown"));
  printLine("Summary generated", surface.summaryGenerated ?? "Unavailable");
  printLine("Decision version", String(surface.decisionVersion ?? "unknown"));
  printLine("Decision kind", surface.decisionKind ?? "Unavailable");
  printLine("Decision status", surface.decisionStatus);
  printLine("Decision note", surface.decisionNote);
  printLine("Shipping status", surface.shippingStatus);
  printLine("Shipping note", surface.shippingNote);
  printLine("Finish line status", surface.finishLineStatus);
  printLine("Finish line note", surface.finishLineNote);
  printLine("Required lanes status", surface.requiredLanesStatus);
  printLine("Required lanes note", surface.requiredLanesNote);
  printLine("Release boundary status", surface.releaseBoundaryStatus);
  printLine("Release boundary note", surface.releaseBoundaryNote);
  printLine("Contract mirror status", surface.contractMirrorStatus);
  printLine("Contract mirror note", surface.contractMirrorNote);
  printLine("Boundary status", surface.boundaryStatus);
  printLine("Boundary note", surface.boundaryNote);
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
    case "scope-mismatch":
      return "Scope mismatch";
    case "required-lanes-mismatch":
      return "Required lanes mismatch";
    case "required-lane-decision-mismatch":
      return "Required-lane decision mismatch";
    case "swap-role-mismatch":
      return "Swap-role mismatch";
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

function printLine(label, value) {
  console.log(`${label}: ${value}`);
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
  const flagIndex = argv.indexOf("--base-url");
  if (flagIndex !== -1) {
    const value = argv[flagIndex + 1];
    if (!value) {
      throw new Error("Missing value for --base-url");
    }
    return value;
  }

  const envValue = process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL;
  if (typeof envValue === "string" && envValue.trim()) {
    return envValue.trim();
  }

  return "http://127.0.0.1:8789";
}
