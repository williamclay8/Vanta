const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const checkReady = args.includes("--check-ready");

try {
  const snapshot = await requestJson("/state/private-core-snapshot");

  if (checkReady && snapshot?.status?.shippingDecision?.decisionStatus !== "ready-to-ship") {
    console.error(JSON.stringify(snapshot, null, 2));
    console.error(`Snapshot decision status: ${snapshot.shipping.decisionStatus}`);
    console.error(`Snapshot decision note: ${snapshot.shipping.decisionNote}`);
    process.exitCode = 1;
    process.exit(1);
  }

  console.log(JSON.stringify(snapshot, null, 2));
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Failed to print private-core operator snapshot",
  );
  process.exitCode = 1;
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
