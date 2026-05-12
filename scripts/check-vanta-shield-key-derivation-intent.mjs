import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(repoRoot, "src/solana/shieldKeyDerivationIntent.ts");
const shieldPagePath = resolve(repoRoot, "src/pages/ShieldPage.tsx");
const walletSafetyPath = resolve(repoRoot, "src/wallet/walletMessageIntentSafety.mjs");
const walletSafetyTypesPath = resolve(repoRoot, "src/wallet/walletMessageIntentSafety.d.mts");
const packagePath = resolve(repoRoot, "package.json");

async function loadShieldKeyDerivationIntentModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/shield-key-derivation-intent-check-"));
  const outputPath = join(tempRoot, "shieldKeyDerivationIntent.mjs");

  try {
    execFileSync(
      resolve(repoRoot, "node_modules/.bin/esbuild"),
      [
        sourcePath,
        "--bundle",
        "--platform=node",
        "--format=esm",
        "--target=es2022",
        `--outfile=${outputPath}`,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return {
      cleanup: () => rmSync(tempRoot, { recursive: true, force: true }),
      module: await import(pathToFileURL(outputPath).href),
    };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

const source = readFileSync(sourcePath, "utf8");
const shieldPageSource = readFileSync(shieldPagePath, "utf8");
const walletSafetySource = readFileSync(walletSafetyPath, "utf8");
const walletSafetyTypes = readFileSync(walletSafetyTypesPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.ok(
  source.includes("signWalletMessageIntentWithSafety"),
  "Shield key derivation intent must route signing through wallet message-intent safety.",
);
assert.ok(
  source.includes('VANTA_SHIELD_KEY_DERIVATION_INTENT_KIND =\n  "shield-key-derivation-intent"') ||
    source.includes('VANTA_SHIELD_KEY_DERIVATION_INTENT_KIND = "shield-key-derivation-intent"'),
  "Shield key derivation intent must use a dedicated intent kind.",
);
for (const marker of [
  "notATransaction:${normalized.notATransaction}",
  "doesNotMoveFunds:${normalized.doesNotMoveFunds}",
  "doesNotAuthorizeOperator:${normalized.doesNotAuthorizeOperator}",
  "purpose:${normalized.purpose}",
]) {
  assert.ok(source.includes(marker), `Shield key derivation message missing marker: ${marker}`);
}
assert.ok(
  !shieldPageSource.includes("shieldKeyDerivationIntent") &&
    !shieldPageSource.includes("deriveShieldMasterSeedWithSafety") &&
    !shieldPageSource.includes('intentKind: "shield-key-derivation-intent"'),
  "Dormant Shield key derivation intent must not be wired into ShieldPage yet.",
);
assert.ok(
  !shieldPageSource.includes("walletSession.signMessage("),
  "ShieldPage must not call walletSession.signMessage directly.",
);
assert.ok(
  walletSafetySource.includes('"shield-key-derivation-intent"') &&
    walletSafetyTypes.includes('"shield-key-derivation-intent"'),
  "Wallet message-intent safety source and type declarations must allow the dedicated Shield key derivation intent.",
);
assert.ok(
  packageJson.scripts["shield:key-derivation-intent-check"] ===
    "node scripts/check-vanta-shield-key-derivation-intent.mjs" &&
    packageJson.scripts["shield:verify"].includes("npm run shield:key-derivation-intent-check"),
  "package.json must expose Shield key derivation intent check and include it in shield:verify.",
);

const { module: shieldKeyIntent, cleanup } = await loadShieldKeyDerivationIntentModule();

try {
  const payload = shieldKeyIntent.createShieldKeyDerivationIntentPayload({
    appDomain: "vanta",
    cluster: "mainnet-beta",
    owner: "VantaWallet111111111111111111111111111111111",
    requester: "VantaWallet111111111111111111111111111111111",
  });
  const envelope = {
    connectedWalletAddress: payload.owner,
    expiresAt: Date.now() + 300_000,
    humanApprovedSummary: true,
    issuedAt: Date.now(),
    requestId: "shield-key-request-1",
  };
  const message = shieldKeyIntent.formatShieldKeyDerivationIntentMessage(payload);

  assert.ok(message.startsWith("vanta:shield-key-derivation-intent:v1"));
  assert.ok(!message.includes("requestId:"), "The signed seed message must stay stable for recovery.");
  assert.ok(!message.includes("issuedAt:"), "The signed seed message must not include per-approval time.");
  assert.ok(message.includes(`owner:${payload.owner}`));
  assert.ok(message.includes("notATransaction:true"));
  assert.deepEqual(shieldKeyIntent.toOwnerKeyHierarchyContext(payload), {
    appDomain: "vanta",
    cluster: "mainnet-beta",
    hierarchyVersion: "vanta-shield-owner-key-hierarchy-0.1",
    walletAddress: payload.owner,
  });

  let signedMessage = null;
  const result = await shieldKeyIntent.deriveShieldMasterSeedWithSafety({
    envelope,
    payload,
    signMessage: async (messageBytes) => {
      signedMessage = new TextDecoder().decode(messageBytes);
      return new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]);
    },
  });
  assert.equal(result.signed, true);
  assert.match(result.ephemeralMasterSeed, /^0x[0-9a-f]{64}$/u);
  assert.equal(signedMessage, message);
  assert.equal(result.summary.requestId, envelope.requestId);

  const repeatedSeed = shieldKeyIntent.deriveShieldMasterSeedFromSignature({
    payload,
    signatureBytes: new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]),
  });
  assert.equal(result.ephemeralMasterSeed, repeatedSeed);
  assert.notEqual(
    repeatedSeed,
    shieldKeyIntent.deriveShieldMasterSeedFromSignature({
      payload: { ...payload, owner: "VantaWallet222222222222222222222222222222222" },
      signatureBytes: new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]),
    }),
    "Master seed derivation must be owner/message scoped.",
  );

  let blockedSignerCalled = false;
  const blocked = await shieldKeyIntent.deriveShieldMasterSeedWithSafety({
    envelope: { ...envelope, humanApprovedSummary: false },
    payload,
    signMessage: async () => {
      blockedSignerCalled = true;
      return new Uint8Array([1]);
    },
  });
  assert.equal(blocked.signed, false);
  assert.equal(blocked.ephemeralMasterSeed, null);
  assert.equal(blocked.decision.reason, "human-approval-required");
  assert.equal(blockedSignerCalled, false);
} finally {
  cleanup();
}

console.log("Vanta Shield key derivation intent: PASS");
