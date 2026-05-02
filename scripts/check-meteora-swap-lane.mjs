const DEFAULT_POOL_ADDRESS = "61NMGEcS5M4HT4aJyK4c3qap3YsgXTrbKHn4tNtXVtrU";
const DEFAULT_BLOCKED_AFTER = "2026-04-08";
const DEFAULT_API_BASE = "https://dlmm-api.mainnet.meteora.ag";

function parseArgs(argv) {
  const options = {
    apiBase: process.env.VANTA_METEORA_DLMM_API_BASE || DEFAULT_API_BASE,
    blockedAfter: process.env.VANTA_SWAP_LANE_BLOCKED_AFTER || DEFAULT_BLOCKED_AFTER,
    outputJson: false,
    poolAddress:
      process.env.VANTA_METEORA_DLMM_POOL_ADDRESS ||
      process.env.VITE_VANTA_METEORA_DLMM_POOL_ADDRESS ||
      DEFAULT_POOL_ADDRESS,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      options.outputJson = true;
      continue;
    }

    if (arg.startsWith("--pool-address=")) {
      options.poolAddress = arg.slice("--pool-address=".length);
      continue;
    }

    if (arg.startsWith("--api-base=")) {
      options.apiBase = arg.slice("--api-base=".length);
      continue;
    }

    if (arg.startsWith("--blocked-after=")) {
      options.blockedAfter = arg.slice("--blocked-after=".length);
    }
  }

  return options;
}

function classifyPairStatus({ bodyText, checkedAt, options, response }) {
  const blockedAfter = new Date(`${options.blockedAfter}T00:00:00Z`);
  const thresholdCrossed =
    Number.isFinite(blockedAfter.valueOf()) && checkedAt >= blockedAfter.valueOf();
  const normalizedBody = bodyText.trim().toLowerCase();
  const pairUrl = `${options.apiBase}/pair/${options.poolAddress}`;

  if (response.ok) {
    return {
      checkedAt,
      classification: "indexed",
      nextStep: "start operator, rerun /health/swap, and proceed only if health is healthy",
      pairUrl,
      poolAddress: options.poolAddress,
      statusCode: response.status,
      summary: "Meteora mainnet indexed API resolves the configured pool.",
      thresholdCrossed,
    };
  }

  if (response.status === 404 && normalizedBody === "pair not found") {
    return {
      checkedAt,
      classification: thresholdCrossed
        ? "external_indexer_block"
        : "pending_propagation_watch",
      nextStep: thresholdCrossed
        ? "stop passive waiting, record external indexer reliability issue, prefer alternate context path (Path B), otherwise narrow swap truth (Path C)"
        : "continue propagation watch until the blocked-after threshold",
      pairUrl,
      poolAddress: options.poolAddress,
      statusCode: response.status,
      summary: thresholdCrossed
        ? "The pool exists on-chain but Meteora mainnet indexed API still does not surface it, so the lane is blocked by external indexer availability."
        : "The pool still is not surfaced by Meteora mainnet indexed API and remains under propagation watch.",
      thresholdCrossed,
    };
  }

  return {
    checkedAt,
    classification: "unexpected_response",
    nextStep: "inspect raw response before rerunning swap lane checks",
    pairUrl,
    poolAddress: options.poolAddress,
    responseBody: bodyText.trim(),
    statusCode: response.status,
    summary: "Meteora returned an unexpected response while checking the configured pool.",
    thresholdCrossed,
  };
}

function renderText(result) {
  const lines = [
    `Checked at: ${new Date(result.checkedAt).toISOString()}`,
    `Pair URL: ${result.pairUrl}`,
    `Pool: ${result.poolAddress}`,
    `Status: ${result.statusCode}`,
    `Classification: ${result.classification}`,
    `Threshold crossed: ${result.thresholdCrossed ? "yes" : "no"}`,
    `Summary: ${result.summary}`,
    `Next step: ${result.nextStep}`,
  ];

  if (result.classification === "external_indexer_block") {
    lines.push(
      "Decision statement: The USDC -> SOL Meteora DLMM pool exists on-chain, but Meteora mainnet's indexed API still does not surface it. Vanta will no longer treat this as ordinary propagation delay. The swap lane is blocked by external indexer availability, and the next step is to either add an alternate context path or temporarily narrow the swap truth until venue context becomes reliably accessible.",
    );
  }

  if (result.responseBody) {
    lines.push(`Response body: ${result.responseBody}`);
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const checkedAt = Date.now();
  const pairUrl = `${options.apiBase}/pair/${options.poolAddress}`;
  const response = await fetch(pairUrl, {
    headers: {
      Accept: "application/json, text/plain;q=0.9",
    },
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });
  const bodyText = await response.text();
  const result = classifyPairStatus({ bodyText, checkedAt, options, response });

  if (options.outputJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(renderText(result));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        classification: "check_failed",
        message,
        status: "failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
