const baseUrl = resolveBaseUrl(process.argv.slice(2));

try {
  const [roots, consumes, releases] = await Promise.all([
    requestJson("/state/private-core-roots"),
    requestJson("/state/private-core-consumes"),
    requestJson("/state/private-core-releases"),
  ]);

  printLine("Operator", baseUrl);
  printLine("Roots state version", String(roots.stateVersion ?? "unknown"));
  printLine("Current root", abbreviate(roots.currentRoot));
  printLine("Root records", String(Array.isArray(roots.records) ? roots.records.length : 0));
  printLine("Consume state version", String(consumes.stateVersion ?? "unknown"));
  printLine("Latest consume", abbreviate(consumes.latestConsume?.nullifier));
  printLine("Consume records", String(Array.isArray(consumes.records) ? consumes.records.length : 0));
  printLine("Release state version", String(releases.stateVersion ?? "unknown"));
  printLine("Latest release", abbreviate(releases.latestRelease?.nullifier));
  printLine("Release destination", abbreviate(releases.latestRelease?.releaseDestination));
  printLine(
    "Released value",
    releases.latestRelease?.releasedAmount && releases.latestRelease?.releasedAssetId
      ? `${releases.latestRelease.releasedAmount} / ${abbreviate(releases.latestRelease.releasedAssetId)}`
      : "Unavailable",
  );
  printLine("Release records", String(Array.isArray(releases.records) ? releases.records.length : 0));
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
