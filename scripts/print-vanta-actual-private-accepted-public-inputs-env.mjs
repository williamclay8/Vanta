import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const fileIndex = args.indexOf("--file");

function readInputJson() {
  if (fileIndex >= 0) {
    const path = args[fileIndex + 1];
    if (!path) {
      throw new Error("Missing path after --file.");
    }
    return readFileSync(path, "utf8");
  }
  const envValue = process.env.VANTA_ACTUAL_PRIVATE_OPERATOR_SETTLEMENT_RESPONSE_JSON?.trim();
  if (!envValue) {
    throw new Error(
      "Set VANTA_ACTUAL_PRIVATE_OPERATOR_SETTLEMENT_RESPONSE_JSON or pass --file <operator-response.json>.",
    );
  }
  return envValue;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Accepted public inputs require ${fieldName}.`);
  }
  return value.trim();
}

const parsed = JSON.parse(readInputJson());
const acceptedPublicInputs = parsed.acceptedPublicInputs ?? parsed;

const exports = [
  ["VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT", requireText(acceptedPublicInputs.acceptedRoot, "acceptedRoot")],
  ["VANTA_ACTUAL_PRIVATE_ASSET_COHORT", requireText(acceptedPublicInputs.assetCohort, "assetCohort")],
  [
    "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT",
    requireText(acceptedPublicInputs.changeOutputCommitment, "changeOutputCommitment"),
  ],
  [
    "VANTA_ACTUAL_PRIVATE_NULLIFIER",
    requireText(acceptedPublicInputs.nullifierOrReplayCommitment, "nullifierOrReplayCommitment"),
  ],
  ["VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT", requireText(acceptedPublicInputs.outputCommitment, "outputCommitment")],
  ["VANTA_ACTUAL_PRIVATE_POOL_ID", requireText(acceptedPublicInputs.poolId, "poolId")],
  [
    "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH",
    requireText(acceptedPublicInputs.privateSpendContextHash, "privateSpendContextHash"),
  ],
  [
    "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH",
    requireText(acceptedPublicInputs.privateSpendPublicInputHash, "privateSpendPublicInputHash"),
  ],
];

if (jsonMode) {
  console.log(JSON.stringify({
    version: "vanta-actual-private-accepted-public-inputs-env-0.1",
    checkedAt: new Date().toISOString(),
    exportCount: exports.length,
    exportedEnvNames: exports.map(([name]) => name),
    safety: {
      movesFunds: false,
      signsTransactions: false,
      submitsTransactions: false,
      printsOperatorToken: false,
      printsPrivateKeys: false,
      printsRawPlanJson: false,
      printsSerializedTransaction: false,
    },
  }, null, 2));
} else {
  console.log(exports.map(([name, value]) => `export ${name}=${shellQuote(value)}`).join("\n"));
}
