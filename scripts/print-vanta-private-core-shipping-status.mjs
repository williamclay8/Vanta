const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const decision = checkReady
    ? (await requestJson("/state/private-core-shipping-decision-check"))?.decision ?? {}
    : await requestJson("/state/private-core-shipping-decision");
  const surface = buildShippingSurface(decision);

  if (checkReady && decision.decisionStatus !== "ready-to-ship") {
    if (jsonMode) {
      console.error(JSON.stringify(surface, null, 2));
    } else {
      printShippingSurface(surface, console.error);
    }
    throw new Error(
      [
        `Shipping status: ${surface.shippingStatus}`,
        `Shipping note: ${surface.shippingNote}`,
      ].join("\n"),
    );
  }

  if (jsonMode) {
    console.log(JSON.stringify(surface, null, 2));
  } else {
    printShippingSurface(surface);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core shipping status",
  );
  process.exitCode = 1;
}

function buildShippingSurface(decision) {
  return {
    operator: baseUrl,
    summaryStateVersion: decision.stateVersion ?? null,
    decisionVersion: decision.decisionVersion ?? null,
    decisionKind: decision.decisionKind ?? null,
    decisionStatusRaw: decision.decisionStatus ?? null,
    decisionStatus: humanizeDecisionStatus(decision.decisionStatus),
    decisionNote: decision.decisionNote ?? "Unavailable",
    mirroredContractVersion: decision.contractVersion ?? null,
    summaryVersion: decision.summaryVersion ?? null,
    summaryGenerated: decision.generatedAt ?? null,
    shippingStatusRaw: decision.shippingStatus ?? null,
    shippingStatus: humanizeShippingStatus(decision.shippingStatus),
    shippingNote: decision.shippingNote ?? "Unavailable",
    finishLineStatusRaw: decision.finishLineStatus ?? null,
    finishLineStatus: humanizeFinishLineStatus(decision.finishLineStatus),
    finishLineNote: decision.finishLineNote ?? "Unavailable",
    requiredLanesStatusRaw: decision.requiredLanesStatus ?? null,
    requiredLanesStatus: humanizeRequiredLanesStatus(decision.requiredLanesStatus),
    requiredLanesNote: decision.requiredLanesNote ?? "Unavailable",
    releaseBoundaryStatusRaw: decision.releaseBoundaryStatus ?? null,
    releaseBoundaryStatus: humanizeReleaseBoundaryStatus(decision.releaseBoundaryStatus),
    releaseBoundaryNote: decision.releaseBoundaryNote ?? "Unavailable",
    contractMirrorStatusRaw: decision.contractMirrorStatus ?? null,
    contractMirrorStatus: humanizeContractMirrorStatus(decision.contractMirrorStatus),
    contractMirrorNote: decision.contractMirrorNote ?? "Unavailable",
    boundaryStatusRaw: decision.boundaryStatus ?? null,
    boundaryStatus: humanizeBoundaryStatus(decision.boundaryStatus),
    boundaryNote: decision.boundaryNote ?? "Unavailable",
  };
}

function printShippingSurface(surface, writer = console.log) {
  printLine("Operator", surface.operator, writer);
  printLine("Summary state version", String(surface.summaryStateVersion ?? "unknown"), writer);
  printLine("Decision version", String(surface.decisionVersion ?? "unknown"), writer);
  printLine("Decision kind", surface.decisionKind ?? "unknown", writer);
  printLine("Decision status", surface.decisionStatus, writer);
  printLine("Decision note", surface.decisionNote, writer);
  printLine("Mirrored contract version", String(surface.mirroredContractVersion ?? "unknown"), writer);
  printLine("Summary version", String(surface.summaryVersion ?? "unknown"), writer);
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

function printLine(label, value, writer = console.log) {
  writer(`${label}: ${value}`);
}

async function requestJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
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

  return "http://127.0.0.1:8787";
}
