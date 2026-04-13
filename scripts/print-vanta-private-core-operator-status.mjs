const baseUrl = resolveBaseUrl(process.argv.slice(2));

try {
  const summary = await requestJson("/state/private-core-summary");

  printLine("Operator", baseUrl);
  printLine("Summary state version", String(summary.stateVersion ?? "unknown"));
  printLine("Summary version", String(summary.summaryVersion ?? "unknown"));
  printLine("Summary generated", formatTimestamp(summary.generatedAt));
  printLine("Current root", abbreviate(summary.currentRoot));
  printLine("Root records", String(summary.rootRecordCount ?? 0));
  printLine("Latest consume", abbreviate(summary.latestConsume?.nullifier));
  printLine("Latest consume proof", abbreviate(summary.latestConsume?.proofId));
  printLine("Latest consume linked proof", abbreviate(summary.latestConsumeProof?.proofId));
  printLine("Consume records", String(summary.consumeRecordCount ?? 0));
  printLine("Latest proof", abbreviate(summary.latestProof?.proofId));
  printLine("Latest proof action", summary.latestProof?.action ?? "Unavailable");
  printLine("Proof records", String(summary.proofRecordCount ?? 0));
  printLine("Latest send proof", abbreviate(summary.latestSendProof?.proofId));
  printLine("Latest send proof action", summary.latestSendProof?.action ?? "Unavailable");
  printLine("Send proof records", String(summary.sendProofRecordCount ?? 0));
  printLine("Latest send transition", abbreviate(summary.latestSend?.sendId));
  printLine("Latest send proof link", abbreviate(summary.latestSend?.proofId));
  printLine(
    "Latest send amount",
    typeof summary.latestSend?.sendAmount === "string" ? summary.latestSend.sendAmount : "Unavailable",
  );
  printLine("Send records", String(summary.sendRecordCount ?? 0));
  printLine("Latest release", abbreviate(summary.latestRelease?.nullifier));
  printLine("Latest release proof", abbreviate(summary.latestRelease?.proofId));
  printLine("Latest release linked proof", abbreviate(summary.latestReleaseProof?.proofId));
  printLine("Release destination", abbreviate(summary.latestRelease?.releaseDestination));
  printLine(
    "Released value",
    summary.latestRelease?.releasedAmount && summary.latestRelease?.releasedAssetId
      ? `${summary.latestRelease.releasedAmount} / ${abbreviate(summary.latestRelease.releasedAssetId)}`
      : "Unavailable",
  );
  printLine("Release records", String(summary.releaseRecordCount ?? 0));
  printLine("Proof/consume link", summary.proofConsumeLinkStatus ?? "Unavailable");
  printLine("Proof/release link", summary.proofReleaseLinkStatus ?? "Unavailable");
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

function abbreviate(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "Unavailable";
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function printLine(label, value) {
  console.log(`${label}: ${value}`);
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
    case "proof-consume-unlinked":
      return "Proof/consume not linked";
    case "proof-release-unlinked":
      return "Proof/release not linked";
    default:
      return "Unavailable";
  }
}
