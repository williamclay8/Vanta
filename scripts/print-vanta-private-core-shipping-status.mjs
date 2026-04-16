const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");

try {
  const summary = await requestJson("/state/private-core-summary");

  printLine("Operator", baseUrl);
  printLine("Summary version", String(summary.summaryVersion ?? "unknown"));
  printLine("Shipping status", humanizeShippingStatus(summary.zkV1ShippingStatus));
  printLine("Shipping note", summary.zkV1ShippingNote ?? "Unavailable");
  printLine("Required lanes status", humanizeRequiredLanesStatus(summary.requiredLanesStatus));
  printLine("Required lanes note", summary.requiredLanesNote ?? "Unavailable");
  printLine(
    "Release boundary status",
    humanizeReleaseBoundaryStatus(summary.releaseBoundaryStatus),
  );
  printLine("Release boundary note", summary.releaseBoundaryNote ?? "Unavailable");
  printLine(
    "Contract mirror status",
    humanizeContractMirrorStatus(summary.contractMirrorStatus),
  );
  printLine("Contract mirror note", summary.contractMirrorNote ?? "Unavailable");
  printLine("Boundary status", humanizeBoundaryStatus(summary.boundaryStatus));
  printLine("Boundary note", summary.boundaryNote ?? "Unavailable");

  if (checkReady && summary.zkV1ShippingStatus !== "ready-narrow-v1") {
    throw new Error(summary.zkV1ShippingNote ?? "private-core narrow zk v1 lane is not ready");
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core shipping status",
  );
  process.exitCode = 1;
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
