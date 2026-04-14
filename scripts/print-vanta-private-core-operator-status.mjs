const baseUrl = resolveBaseUrl(process.argv.slice(2));

try {
  const summary = await requestJson("/state/private-core-summary");

  printLine("Operator", baseUrl);
  printLine("Summary state version", String(summary.stateVersion ?? "unknown"));
  printLine("Summary version", String(summary.summaryVersion ?? "unknown"));
  printLine("Summary generated", formatTimestamp(summary.generatedAt));
  printLine("Supported send lane version", String(summary.supportedSendLaneVersion ?? "unknown"));
  printLine("Supported send lane kind", humanizeSupportedSendLaneKind(summary.supportedSendLaneKind));
  printLine("Supported send lane status", humanizeSupportedSendLaneStatus(summary.supportedSendLaneStatus));
  printLine("Supported send lane note", summary.supportedSendLaneNote ?? "Unavailable");
  printLine("Supported unshield lane version", String(summary.supportedUnshieldLaneVersion ?? "unknown"));
  printLine(
    "Supported unshield lane kind",
    humanizeSupportedUnshieldLaneKind(summary.supportedUnshieldLaneKind),
  );
  printLine(
    "Supported unshield lane status",
    humanizeSupportedUnshieldLaneStatus(summary.supportedUnshieldLaneStatus),
  );
  printLine("Supported unshield lane note", summary.supportedUnshieldLaneNote ?? "Unavailable");
  printLine(
    "Supported release authorization",
    humanizeReleaseAuthorization(summary.supportedReleaseAuthorizationBasis),
  );
  printLine(
    "Supported release root policy",
    humanizeReleaseRootPolicy(summary.supportedReleaseRootPolicy),
  );
  printLine("Owner authorization mode", humanizeOwnerAuthorizationMode(summary.ownerAuthorizationMode));
  printLine("Nullifier key mode", humanizeNullifierKeyMode(summary.nullifierKeyMode));
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
  printLine(
    "Latest send amount",
    typeof summary.latestSend?.sendAmount === "string" ? summary.latestSend.sendAmount : "Unavailable",
  );
  printLine("Send records", String(summary.sendRecordCount ?? 0));
  printLine("Latest release", abbreviate(summary.latestRelease?.nullifier));
  printLine("Latest release proof", abbreviate(summary.latestRelease?.proofId));
  printLine("Latest release linked proof", abbreviate(summary.latestReleaseProof?.proofId));
  printLine("Release authorization", humanizeReleaseAuthorization(summary.latestRelease?.authorizationBasis));
  printLine("Release root policy", humanizeReleaseRootPolicy(summary.latestRelease?.rootPolicy));
  printLine("Release destination", abbreviate(summary.latestRelease?.releaseDestination));
  printLine(
    "Released value",
    summary.latestRelease?.releasedAmount && summary.latestRelease?.releasedAssetId
      ? `${summary.latestRelease.releasedAmount} / ${abbreviate(summary.latestRelease.releasedAssetId)}`
      : "Unavailable",
  );
  printLine("Release records", String(summary.releaseRecordCount ?? 0));
  printLine("Proof/send link", summary.proofSendLinkStatus ?? "Unavailable");
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

function humanizeRootRegistrationBasis(value) {
  switch (value) {
    case "shield-input":
      return "Shield input";
    case "send-recipient-output":
      return "Send recipient output";
    case "send-change-output":
      return "Send change output";
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
