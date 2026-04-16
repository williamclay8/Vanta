const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");
const jsonMode = args.includes("--json");

try {
  const summary = await requestJson("/state/private-core-summary");
  const surface = buildShippingSurface(summary);

  if (checkReady && summary.zkV1ShippingStatus !== "ready-narrow-v1") {
    if (jsonMode) {
      console.error(JSON.stringify(surface, null, 2));
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

function buildShippingSurface(summary) {
  return {
    operator: baseUrl,
    summaryStateVersion: summary.stateVersion ?? null,
    mirroredContractVersion: summary.contractVersion ?? null,
    summaryVersion: summary.summaryVersion ?? null,
    summaryGenerated: summary.generatedAt ?? null,
    shippingStatusRaw: summary.zkV1ShippingStatus ?? null,
    shippingStatus: humanizeShippingStatus(summary.zkV1ShippingStatus),
    shippingNote: summary.zkV1ShippingNote ?? "Unavailable",
    finishLineStatusRaw: summary.zkV1FinishLineStatus ?? null,
    finishLineStatus: humanizeFinishLineStatus(summary.zkV1FinishLineStatus),
    finishLineNote: summary.zkV1FinishLineNote ?? "Unavailable",
    requiredLanesStatusRaw: summary.requiredLanesStatus ?? null,
    requiredLanesStatus: humanizeRequiredLanesStatus(summary.requiredLanesStatus),
    requiredLanesNote: summary.requiredLanesNote ?? "Unavailable",
    releaseBoundaryStatusRaw: summary.releaseBoundaryStatus ?? null,
    releaseBoundaryStatus: humanizeReleaseBoundaryStatus(summary.releaseBoundaryStatus),
    releaseBoundaryNote: summary.releaseBoundaryNote ?? "Unavailable",
    contractMirrorStatusRaw: summary.contractMirrorStatus ?? null,
    contractMirrorStatus: humanizeContractMirrorStatus(summary.contractMirrorStatus),
    contractMirrorNote: summary.contractMirrorNote ?? "Unavailable",
    boundaryStatusRaw: summary.boundaryStatus ?? null,
    boundaryStatus: humanizeBoundaryStatus(summary.boundaryStatus),
    boundaryNote: summary.boundaryNote ?? "Unavailable",
  };
}

function printShippingSurface(surface) {
  printLine("Operator", surface.operator);
  printLine("Summary state version", String(surface.summaryStateVersion ?? "unknown"));
  printLine("Mirrored contract version", String(surface.mirroredContractVersion ?? "unknown"));
  printLine("Summary version", String(surface.summaryVersion ?? "unknown"));
  printLine("Summary generated", surface.summaryGenerated ?? "Unavailable");
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

function printLine(label, value) {
  console.log(`${label}: ${value}`);
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
