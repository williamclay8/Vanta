import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.ok(existsSync(resolve(repoRoot, "scripts/print-vanta-actual-private-accepted-public-inputs-env.mjs")));
assert.equal(
  packageJson.scripts["mainnet:actual-private-accepted-public-inputs-env"],
  "node scripts/print-vanta-actual-private-accepted-public-inputs-env.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-accepted-public-inputs-env-check"],
  "node scripts/check-vanta-actual-private-accepted-public-inputs-env.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-accepted-public-inputs-env-check"),
  "mainnet:preflight must include accepted public inputs env check.",
);

const fixture = {
  acceptedPublicInputs: {
    acceptedRoot: "0x" + "11".repeat(32),
    assetCohort: "stablecoin-usdc-v1",
    changeOutputCommitment: "0x" + "22".repeat(32),
    nullifierOrReplayCommitment: "0x" + "33".repeat(32),
    outputCommitment: "0x" + "44".repeat(32),
    poolId: "pool:stablecoin-usdc-v1:100",
    privateSpendContextHash: "0x" + "55".repeat(32),
    privateSpendPublicInputHash: "0x" + "66".repeat(32),
    proofReceiptPublicInputCommitment: "commitment:proof-public-input",
    version: "vanta-actual-private-accepted-public-inputs-0.1",
  },
  ignoredSecretLikeFields: {
    operatorToken: "fixture-token-must-not-print",
    relayerSerializedTransaction: "base64:fixture-serialized-transaction-must-not-print",
  },
};

const exportsOutput = execFileSync("npm", ["run", "--silent", "mainnet:actual-private-accepted-public-inputs-env"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_OPERATOR_SETTLEMENT_RESPONSE_JSON: JSON.stringify(fixture),
  },
});

assert.match(exportsOutput, /export VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT='0x1111/);
assert.match(exportsOutput, /export VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH='0x6666/);
assert.equal(exportsOutput.includes("fixture-token-must-not-print"), false);
assert.equal(exportsOutput.includes("fixture-serialized-transaction-must-not-print"), false);

const jsonOutput = JSON.parse(
  execFileSync("npm", ["run", "--silent", "mainnet:actual-private-accepted-public-inputs-env", "--", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      VANTA_ACTUAL_PRIVATE_OPERATOR_SETTLEMENT_RESPONSE_JSON: JSON.stringify(fixture),
    },
  }),
);
assert.equal(jsonOutput.exportCount, 8);
assert.equal(jsonOutput.safety.movesFunds, false);
assert.equal(jsonOutput.safety.printsOperatorToken, false);
assert.equal(jsonOutput.safety.printsSerializedTransaction, false);
assert.ok(jsonOutput.exportedEnvNames.includes("VANTA_ACTUAL_PRIVATE_NULLIFIER"));

console.log("Vanta actual-private accepted public inputs env check: PASS");
