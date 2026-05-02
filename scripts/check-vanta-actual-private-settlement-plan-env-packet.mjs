import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.ok(
  existsSync(resolve(repoRoot, "scripts/print-vanta-actual-private-settlement-plan-env-packet.mjs")),
  "Missing actual-private settlement plan env packet printer.",
);

assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-plan-env-packet"],
  "node scripts/print-vanta-actual-private-settlement-plan-env-packet.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-plan-env-packet-check"],
  "node scripts/check-vanta-actual-private-settlement-plan-env-packet.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-plan-env-packet-check"),
  "mainnet:preflight must include the settlement plan env packet check.",
);

const packet = JSON.parse(
  execFileSync("npm", ["run", "--silent", "mainnet:actual-private-settlement-plan-env-packet"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "fixture-token-redacted-by-packet",
      VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON: "{\"fixture\":\"redacted-by-packet\"}",
    },
  }),
);

assert.equal(packet.version, "vanta-actual-private-settlement-plan-env-packet-0.1");
assert.equal(packet.safety.printsOperatorToken, false);
assert.equal(packet.safety.printsRawPlanJson, false);
assert.equal(packet.safety.printsSerializedTransaction, false);
assert.equal(packet.safety.movesFunds, false);
assert.equal(packet.currentEnvStatus.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.present, true);
assert.equal(packet.currentEnvStatus.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.printedValue, false);
assert.equal(packet.currentEnvStatus.VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON.present, true);
assert.equal(packet.currentEnvStatus.VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON.printedValue, false);
assert.equal(packet.publicSolanaSpendAccounts.programId, "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm");
assert.equal(packet.publicSolanaSpendAccounts.poolState, "5qjyK5B5ZMAgLmXxrpAGqFHvEHTCP4MUwRmzvA4MPEuQ");
assert.equal(packet.publicSolanaSpendAccounts.nullifierSet, "x5xWJZNN8rjZPdAYgG8EJuTZYYvYDQyhVXEgKB6i23k");
assert.equal(packet.publicSolanaSpendAccounts.outputQueue, "CsnYLMnnMso1KT6PE7csi51ZtFHSPQr1xTePA8rKUzrZ");
assert.equal(packet.requiredPlanTerms.length, 14);
assert.equal(packet.optionalPlanTerms.length, 4);
assert.ok(
  packet.requiredPlanTerms.some((term) => term.rawEnv === "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH"),
);
assert.ok(
  packet.optionalPlanTerms.some((term) => term.rawEnv === "VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT"),
);
assert.ok(
  packet.buildOrder.some((step) => step.command === "npm run mainnet:actual-private-settlement-plan-json"),
);
assert.ok(
  packet.buildOrder.some((step) => step.command === "npm run private-pool-v2:solana-spend-transaction"),
);

const serialized = JSON.stringify(packet);
for (const forbidden of [
  "fixture-token-redacted-by-packet",
  "{\"fixture\":\"redacted-by-packet\"}",
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Settlement plan env packet must not leak ${forbidden}.`);
}

console.log("Vanta actual-private settlement plan env packet check: PASS");
