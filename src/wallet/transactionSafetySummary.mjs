const supportedClusters = new Set(["localnet", "devnet", "testnet", "mainnet-beta"]);

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta transaction safety summary requires ${fieldName}.`);
  }

  return value.trim();
}

function requireCluster(value) {
  const cluster = requireText(value, "cluster");
  if (!supportedClusters.has(cluster)) {
    throw new Error(`Vanta transaction safety summary received unsupported cluster: ${cluster}.`);
  }

  return cluster;
}

function requireInstructions(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Vanta transaction safety summary requires instructions.");
  }

  return value.map((instruction) => requireText(instruction, "instructions[]"));
}

function requireSimulationResult(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Vanta transaction safety summary requires simulationResult.");
  }

  return {
    error: value.error ? String(value.error) : null,
    logs: Array.isArray(value.logs) ? value.logs.map((log) => String(log)) : [],
    ok: value.ok === true,
  };
}

export function createTransactionSafetySummary(input) {
  const cluster = requireCluster(input.cluster);

  return {
    amount: requireText(input.amount, "amount"),
    asset: requireText(input.asset, "asset"),
    cluster,
    estimatedFees: requireText(input.estimatedFees, "estimatedFees"),
    explicitMainnetApproval: Boolean(input.explicitMainnetApproval),
    feePayer: requireText(input.feePayer, "feePayer"),
    instructions: requireInstructions(input.instructions),
    kind: "vanta-transaction-safety-summary",
    mainnetSubmissionAllowed: false,
    recentBlockhash: requireText(input.recentBlockhash, "recentBlockhash"),
    recipient: requireText(input.recipient, "recipient"),
    requiresHumanApproval: true,
    simulationResult: requireSimulationResult(input.simulationResult),
  };
}

export function validateTransactionSafetySummary(summary) {
  if (summary.kind !== "vanta-transaction-safety-summary") {
    return {
      accepted: false,
      reason: "invalid-summary-kind",
    };
  }

  if (!summary.simulationResult?.ok) {
    return {
      accepted: false,
      reason: "simulation-failed",
    };
  }

  if (summary.cluster === "mainnet-beta" && summary.explicitMainnetApproval !== true) {
    return {
      accepted: false,
      reason: "mainnet-approval-required",
    };
  }

  return {
    accepted: true,
    reason: "summary-ready-for-wallet-approval",
  };
}
