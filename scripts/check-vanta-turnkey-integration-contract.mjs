import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createVantaTurnkeyIntegrationContract } from "../src/readiness/turnkeyIntegrationContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packagePath = resolve(repoRoot, "package.json");
const lockPath = resolve(repoRoot, "package-lock.json");
const srcPath = resolve(repoRoot, "src");
const contract = createVantaTurnkeyIntegrationContract();

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const packageLock = JSON.parse(readFileSync(lockPath, "utf8"));

assert.equal(contract.version, "vanta-turnkey-integration-contract-0.1");
assert.equal(contract.productionReady, false);
assert.equal(contract.mainnetReady, false);
assert.equal(contract.liveSigningEnabled, false);
assert.equal(contract.liveBroadcastEnabled, false);
assert.equal(contract.serverOnlyLiveSignerAdapterImplemented, true);
assert.equal(contract.rootCredentialsAutonomousUseAllowed, false);
assert.equal(contract.browserBundleUseAllowed, false);
assert.equal(contract.custodyClaimAllowed, false);
assert.ok(contract.docsRefs.includes("https://docs.turnkey.com/llms.txt"));
assert.ok(contract.workflowRefs.includes("/Users/clay/.agents/skills/turnkey-agent-skills/SKILL.md"));
assert.ok(
  contract.workflowRefs.includes("/Users/clay/.agents/skills/turnkey-agent-skills/references/vanta-turnkey-workflows.md"),
);

for (const workflowRef of contract.workflowRefs) {
  assert.ok(existsSync(workflowRef), `Missing Turnkey workflow ref: ${workflowRef}`);
}

for (const localRef of contract.localRefs) {
  assert.ok(existsSync(resolve(repoRoot, localRef)), `Missing local Turnkey integration ref: ${localRef}`);
}

for (const secretRef of contract.secretRefs) {
  assert.ok(secretRef.startsWith("VANTA_TURNKEY_"), `Unexpected Turnkey secret ref prefix: ${secretRef}`);
  assert.ok(secretRef.endsWith("_REF"), `Turnkey secret refs must be reference names only: ${secretRef}`);
}
assert.deepEqual(contract.externalSignerRefs, ["VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF"]);
for (const signerRef of contract.externalSignerRefs) {
  assert.ok(signerRef.endsWith("_REF"), `External signer refs must be reference names only: ${signerRef}`);
}
for (const governanceRef of [
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF",
  "VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF",
  "VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF",
]) {
  assert.ok(
    contract.liquiditySignerGovernanceRefs.includes(governanceRef),
    `Missing liquidity signer governance ref: ${governanceRef}`,
  );
}

for (const action of [
  "root-credential-autonomous-use",
  "root-key-in-client-bundle",
  "wallet-delete-or-export-programmatically",
  "policy-mutation-without-exact-approval",
  "sign-and-broadcast-without-simulation-summary-and-approval",
  "swap-live-mode-before-turnkey-liquidity-signer-dry-run-review",
  "production-custody-or-privacy-claim-elevation",
]) {
  assert.ok(contract.blockedActions.includes(action), `Missing blocked Turnkey action: ${action}`);
}

for (const sdkPackage of contract.sdkPackages) {
  assert.equal(
    packageJson.dependencies?.[sdkPackage.name],
    sdkPackage.version,
    `${sdkPackage.name} must be pinned in package.json.`,
  );
  assert.equal(
    packageLock.packages?.[""]?.dependencies?.[sdkPackage.name],
    sdkPackage.version,
    `${sdkPackage.name} must be pinned in package-lock root dependencies.`,
  );
  assert.ok(
    packageLock.packages?.[`node_modules/${sdkPackage.name}`],
    `${sdkPackage.name} must be installed in package-lock.`,
  );
}

for (const browserPackage of ["@turnkey/sdk-browser", "@turnkey/iframe-stamper", "@turnkey/react-wallet-kit"]) {
  assert.ok(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, browserPackage),
    `${browserPackage} must not become a direct browser dependency before a product/design gate.`,
  );
}

assert.equal(
  packageJson.scripts["turnkey:integration-contract-check"],
  "node scripts/check-vanta-turnkey-integration-contract.mjs",
  "package.json must expose turnkey:integration-contract-check.",
);
assert.equal(
  packageJson.scripts["swap:turnkey-liquidity-signer-dry-run-check"],
  "node scripts/check-vanta-turnkey-liquidity-signer-dry-run.mjs",
  "package.json must expose the Turnkey liquidity signer dry-run gate.",
);
assert.equal(
  packageJson.scripts["swap:turnkey-liquidity-live-signer-adapter-check"],
  "node scripts/check-vanta-turnkey-liquidity-live-signer-adapter.mjs",
  "package.json must expose the Turnkey liquidity live signer adapter gate.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run swap:turnkey-liquidity-signer-dry-run-check"),
  "Turnkey contract must require the liquidity signer dry-run gate.",
);
assert.ok(
  contract.requiredVerificationCommands.includes("npm run swap:turnkey-liquidity-live-signer-adapter-check"),
  "Turnkey contract must require the liquidity live signer adapter gate.",
);
assert.ok(
  packageJson.scripts["mainnet:swap-production-check"]?.includes(
    "npm run swap:turnkey-liquidity-signer-dry-run-check",
  ),
  "Swap production check must run the Turnkey liquidity signer dry-run gate before live-mode review.",
);
assert.ok(
  packageJson.scripts["mainnet:swap-production-check"]?.includes(
    "npm run swap:turnkey-liquidity-live-signer-adapter-check",
  ),
  "Swap production check must run the Turnkey live signer adapter gate before live-mode review.",
);
assert.ok(
  packageJson.scripts["swap:capability-check"]?.includes("npm run swap:turnkey-liquidity-signer-dry-run-check"),
  "Swap capability check must include the Turnkey liquidity signer dry-run gate.",
);
assert.ok(
  packageJson.scripts["swap:capability-check"]?.includes(
    "npm run swap:turnkey-liquidity-live-signer-adapter-check",
  ),
  "Swap capability check must include the Turnkey live signer adapter gate.",
);
assert.ok(
  packageJson.scripts["wallet:signing-safety-check"]?.includes("npm run turnkey:integration-contract-check"),
  "wallet:signing-safety-check must include the Turnkey integration contract.",
);
assert.ok(
  packageJson.scripts["wallet:signing-safety-check"]?.includes(
    "npm run swap:turnkey-liquidity-signer-dry-run-check",
  ),
  "wallet:signing-safety-check must include the Turnkey liquidity signer dry-run gate.",
);
assert.ok(
  packageJson.scripts["wallet:signing-safety-check"]?.includes(
    "npm run swap:turnkey-liquidity-live-signer-adapter-check",
  ),
  "wallet:signing-safety-check must include the Turnkey live signer adapter gate.",
);
assert.ok(
  packageJson.scripts["mainnet:secret-handling-check"]?.includes("npm run turnkey:integration-contract-check") &&
    packageJson.scripts["mainnet:secret-handling-check"]?.includes(
      "npm run swap:turnkey-liquidity-signer-dry-run-check",
    ) &&
    packageJson.scripts["mainnet:secret-handling-check"]?.includes(
      "npm run swap:turnkey-liquidity-live-signer-adapter-check",
    ),
  "mainnet:secret-handling-check must include the Turnkey integration contract and liquidity signer gates.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"]?.includes("npm run wallet:signing-safety-check") &&
    packageJson.scripts["mainnet:preflight"]?.includes("npm run mainnet:secret-handling-check"),
  "mainnet:preflight must inherit Turnkey checks through wallet and secret gates.",
);

const sourceFiles = [];
function collectSourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectSourceFiles(fullPath);
      continue;
    }
    if (/\.(ts|tsx|mts|cts|js|jsx)$/.test(entry)) {
      sourceFiles.push(fullPath);
    }
  }
}

collectSourceFiles(srcPath);

for (const filePath of sourceFiles) {
  const rel = relative(repoRoot, filePath);
  if (rel === "src/readiness/turnkeyIntegrationContract.mjs") {
    continue;
  }
  const source = readFileSync(filePath, "utf8");
  assert.ok(!source.includes("@turnkey/"), `${rel} must not import Turnkey into app/client code yet.`);
  assert.ok(!/process\.env\.TURNKEY_/u.test(source), `${rel} must not read Turnkey env values directly.`);
}

console.log("Vanta Turnkey integration contract check: PASS");
