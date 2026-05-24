import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repoRoot, "ops/mainnet/pay-and-jupiter-render-services.manifest.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(manifestPath), "Missing Pay/Jupiter Render services manifest.");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(manifest.version, "vanta-pay-and-jupiter-render-services-manifest-0.1");
assert.equal(manifest.network, "mainnet-beta");
assert.equal(manifest.mainnetReady, false);
assert.equal(manifest.productionReady, false);
assert.equal(manifest.secretPolicy, "refs-only-no-secret-values-no-raw-keypairs");
assert.equal(manifest.renderWorkspace?.workspaceId, "tea-d7j37af7f7vs739ii8rg");
assert.equal(manifest.renderWorkspace?.workspaceName, "William's workspace");
assert.equal(manifest.services.length, 2);

function assertRefsOnly(value, path = "manifest") {
  if (Array.isArray(value)) {
    assert.ok(
      !(value.length >= 32 && value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255)),
      `${path} must not contain raw keypair byte arrays.`,
    );
    value.forEach((entry, index) => assertRefsOnly(entry, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      assert.ok(
        !["value", "rawSecret", "privateKey", "secretKey", "seedPhrase", "mnemonic", "keypair"].includes(key),
        `${path}.${key} must not contain raw secret material.`,
      );
      assertRefsOnly(nested, `${path}.${key}`);
    }
    return;
  }

  if (typeof value !== "string") {
    return;
  }

  for (const forbidden of [
    /postgres(?:ql)?:\/\//iu,
    /\bbearer\s+[a-z0-9._-]{12,}/iu,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /\b(?:sk_live_|sk_test_|whsec_|xprv)\b/iu,
    /\[[\d,\s]{96,}\]/u,
  ]) {
    assert.ok(!forbidden.test(value), `${path} must not contain raw-looking secret values.`);
  }
}

assertRefsOnly(manifest);

function service(id) {
  const found = manifest.services.find((candidate) => candidate.id === id);
  assert.ok(found, `Missing service ${id}.`);
  assert.equal(found.provider, "render", `${id} must be a Render service.`);
  assert.equal(found.environment, "production-blocked", `${id} must stay production-blocked.`);
  assert.equal(found.deploymentStatus, "update-failed", `${id} must preserve current failed deploy truth.`);
  assert.equal(found.productionReady, false, `${id} must not claim production readiness.`);
  assert.ok(found.serviceId.startsWith("srv-"), `${id} must include Render service id.`);
  assert.ok(found.lastFailedDeploy?.deployId?.startsWith("dep-"), `${id} must include failed deploy id.`);
  assert.ok(found.lastFailedDeploy?.commit, `${id} must include failed deploy commit.`);
  assert.ok(found.healthChecks.includes("/health"), `${id} must include health route.`);
  return found;
}

const pay = service("pay");
assert.equal(pay.serviceName, "Vanta");
assert.equal(pay.startCommand, "npm run pay:operator");
assert.ok(pay.lastFailedDeploy.failureRef.includes("VANTA_PAY_SECRET_KEY"));
for (const blocker of [
  "pay-production-secret-env-not-provisioned",
  "pay-production-durable-store-not-proven",
  "pay-private-pool-operator-not-configured-for-production",
  "pay-internal-settlement-token-not-configured-for-production",
  "pay-customer-payment-evidence-not-wired",
  "pay-production-launch-approval-not-recorded",
  "private-settlement-not-live-mainnet",
]) {
  assert.ok(pay.blockers.includes(blocker), `Pay manifest missing blocker ${blocker}.`);
}
for (const envName of [
  "VANTA_PAY_SECRET_KEY",
  "VANTA_PAY_WEBHOOK_SECRET",
  "VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN",
  "VANTA_PAY_DATABASE_URL",
  "VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL",
  "VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
]) {
  assert.ok(pay.runtimeEnvNames.includes(envName), `Pay manifest missing runtime env ${envName}.`);
}

const jupiter = service("jupiter-adapter");
assert.equal(jupiter.serviceName, "Jupiter Adapter");
assert.equal(jupiter.startCommand, "npm run swap:jupiter-sol-to-shielded-adapter");
assert.ok(jupiter.lastFailedDeploy.failureRef.includes("raw liquidity keypairs"));
for (const envName of [
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_PATH",
]) {
  assert.ok(jupiter.forbiddenEnvNames.includes(envName), `Jupiter manifest missing forbidden env ${envName}.`);
}
for (const blocker of [
  "raw-liquidity-keypair-env-must-be-removed",
  "turnkey-runtime-credentials-not-provisioned",
  "turnkey-signer-ref-resolution-not-reviewed",
  "turnkey-live-signing-approval-not-recorded",
  "adapter-auth-proxy-not-configured-for-live-browser-flow",
  "durable-live-cap-state-not-configured",
  "swap-live-settlement-evidence-not-reviewed",
]) {
  assert.ok(jupiter.blockers.includes(blocker), `Jupiter manifest missing blocker ${blocker}.`);
}
for (const ref of [
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF",
  "VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF",
  "VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF",
  "VANTA_TURNKEY_ORGANIZATION_ID_REF",
  "VANTA_TURNKEY_API_PUBLIC_KEY_REF",
  "VANTA_TURNKEY_API_PRIVATE_KEY_REF",
  "VANTA_TURNKEY_SIGN_WITH_REF",
  "VANTA_TURNKEY_POLICY_ID_REF",
]) {
  assert.ok(jupiter.requiredEnvRefs.includes(ref), `Jupiter manifest missing required ref ${ref}.`);
}
for (const envName of [
  "VANTA_SOL_TO_SHIELDED_EXECUTION_MODE",
  "VANTA_SOLANA_RPC_URL",
  "VANTA_SOL_TO_SHIELDED_MAX_INPUT_SOL",
  "VANTA_SOL_TO_SHIELDED_SUPPORTED_ASSETS",
  "VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF",
  "VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF",
  "VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED",
  "VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF",
  "VANTA_TURNKEY_ORGANIZATION_ID",
  "VANTA_TURNKEY_ORGANIZATION_ID_REF",
  "VANTA_TURNKEY_API_PUBLIC_KEY",
  "VANTA_TURNKEY_API_PUBLIC_KEY_REF",
  "VANTA_TURNKEY_API_PRIVATE_KEY",
  "VANTA_TURNKEY_API_PRIVATE_KEY_REF",
  "VANTA_TURNKEY_SIGN_WITH",
  "VANTA_TURNKEY_POLICY_ID",
  "VANTA_TURNKEY_POLICY_ID_REF",
  "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
  "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
]) {
  assert.ok(jupiter.runtimeEnvNames.includes(envName), `Jupiter manifest missing runtime env ${envName}.`);
}

for (const gate of [
  "npm run pay:production-readiness-contract-check",
  "npm run swap:turnkey-liquidity-signer-dry-run-check",
  "npm run swap:turnkey-liquidity-live-signer-adapter-check",
  "npm run swap:jupiter-sol-to-shielded-adapter-check",
  "npm run mainnet:swap-production-check",
  "npm run mainnet:pay-jupiter-render-services-check",
]) {
  assert.ok(manifest.releaseGates.includes(gate), `Manifest missing release gate ${gate}.`);
}

assert.equal(
  packageJson.scripts["mainnet:pay-jupiter-render-services-check"],
  "node scripts/check-vanta-pay-jupiter-render-services.mjs",
  "package.json must expose Pay/Jupiter Render service check.",
);

console.log("Vanta Pay/Jupiter Render services manifest check: PASS");
