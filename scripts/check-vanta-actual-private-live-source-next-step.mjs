import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.ok(existsSync(resolve(repoRoot, "scripts/print-vanta-actual-private-live-source-next-step.mjs")));
assert.equal(
  packageJson.scripts["mainnet:actual-private-live-source-next-step"],
  "node scripts/print-vanta-actual-private-live-source-next-step.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-live-source-next-step-check"],
  "node scripts/check-vanta-actual-private-live-source-next-step.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-live-source-next-step-check"),
  "mainnet:preflight must include actual-private live-source next-step check.",
);

const packet = JSON.parse(
  execFileSync("npm", ["run", "--silent", "mainnet:actual-private-live-source-next-step"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "fixture-token-redacted",
      VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL: "https://fixture-rpc.invalid/secret-path",
      VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION: "base64:fixture-serialized-transaction-redacted",
      VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON: "{\"fixture\":\"raw-plan-redacted\"}",
    },
  }),
);

assert.equal(packet.version, "vanta-actual-private-live-source-next-step-0.1");
assert.equal(packet.privacyBoundary.sourceRefIsProof, false);
assert.equal(packet.privacyBoundary.relayerTransactionSigns, false);
assert.equal(packet.privacyBoundary.relayerTransactionSubmits, false);
assert.equal(packet.privacyBoundary.demoValuesAllowedForProductionEvidence, false);
assert.equal(packet.privacyBoundary.printsOperatorToken, false);
assert.equal(packet.privacyBoundary.printsRpcUrl, false);
assert.equal(packet.privacyBoundary.printsRawPlanJson, false);
assert.equal(packet.privacyBoundary.printsSerializedTransaction, false);
assert.equal(packet.privacyBoundary.printsPrivateKeys, false);
assert.equal(packet.publicSolanaSpendAccounts.programId, "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm");
assert.equal(packet.publicSolanaSpendAccounts.poolState, "5qjyK5B5ZMAgLmXxrpAGqFHvEHTCP4MUwRmzvA4MPEuQ");
assert.equal(packet.publicSolanaSpendAccounts.nullifierSet, "x5xWJZNN8rjZPdAYgG8EJuTZYYvYDQyhVXEgKB6i23k");
assert.equal(packet.publicSolanaSpendAccounts.outputQueue, "CsnYLMnnMso1KT6PE7csi51ZtFHSPQr1xTePA8rKUzrZ");
assert.ok(packet.missing.livePlanTerms.includes("VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT"));
assert.ok(packet.missing.finalLiveExecutorInputs.includes("VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF"));
assert.equal(
  packet.envStatus.finalLiveExecutorInputs.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.printedValue,
  false,
);
assert.equal(
  packet.envStatus.finalLiveExecutorInputs.VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION.printedValue,
  false,
);
assert.ok(
  packet.dopplerSafeRunbook.some((step) =>
    Array.isArray(step.commands) &&
    step.commands.includes('export VANTA_ACTUAL_PRIVATE_NULLIFIER_REF="$VANTA_ACTUAL_PRIVATE_NULLIFIER"'),
  ),
);
assert.ok(
  packet.dopplerSafeRunbook.some((step) =>
    step.command === "doppler run --config prd --project vanta -- npm run private-pool-v2:solana-spend-transaction",
  ),
);
assert.ok(
  packet.dopplerSafeRunbook.some((step) =>
    step.command?.startsWith("export VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF="),
  ),
);

const serialized = JSON.stringify(packet);
for (const forbidden of [
  "fixture-token-redacted",
  "https://fixture-rpc.invalid/secret-path",
  "base64:fixture-serialized-transaction-redacted",
  "{\"fixture\":\"raw-plan-redacted\"}",
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Live-source next-step packet must not leak ${forbidden}.`);
}

console.log("Vanta actual-private live-source next-step check: PASS");
