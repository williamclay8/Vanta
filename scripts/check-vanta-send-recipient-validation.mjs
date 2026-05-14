import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const helperPath = resolve(repoRoot, "src/solana/sendRecipientValidation.ts");
const componentPath = resolve(repoRoot, "src/components/RecipientField.tsx");

assert.ok(existsSync(helperPath), "Send recipient validation helper must exist.");
assert.ok(existsSync(componentPath), "Shared RecipientField component must exist.");

const helperSource = readFileSync(helperPath, "utf8");
const componentSource = readFileSync(componentPath, "utf8");
const sendPageSource = readRepoFile("src/pages/SendPage.tsx");
const productBrowserSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type SendRecipientInputSource",
  "export type SendRecipientValidationResult",
  "export const SEND_RECIPIENT_MAX_LENGTH = 64",
  "export function validateLiveSendRecipient",
  "new PublicKey(trimmed)",
  "PublicKey.isOnCurve",
  "sol-name-unsupported",
  "resolutionRequired: true",
  "Paste the resolved Solana wallet address.",
]) {
  assert.ok(helperSource.includes(marker), `sendRecipientValidation missing marker: ${marker}`);
}

for (const marker of [
  "export function RecipientField",
  "data-vanta-send-recipient-field",
  "data-vanta-send-recipient-status",
  "data-vanta-send-recent-recipients",
  "onPaste",
  "Paste validated as a Solana address",
  "Base58-valid Solana address",
  "Solana name resolution required",
]) {
  assert.ok(componentSource.includes(marker), `RecipientField missing marker: ${marker}`);
}

for (const forbidden of [
  "trimmedRecipient.length >= 8",
  'placeholder="Solana address or .sol name"',
]) {
  assert.ok(!sendPageSource.includes(forbidden), `SendPage must not preserve stale recipient validation marker: ${forbidden}`);
}

for (const marker of [
  "RecipientField",
  "validateLiveSendRecipient",
  "recipientInputSource",
  "recipientValidation",
  "recipientValidation.ready",
  "recentSendRecipients",
  "setRecipientInputSource",
  "recipientValidation.kind === \"solana-address\"",
  "recipientValidation.canonicalAddress",
  "recipientOwnerPublicKey: privateCoreOwner.publicKey",
  "External Private Core Send requires recipient viewing-key exchange",
]) {
  assert.ok(sendPageSource.includes(marker), `SendPage missing recipient validation marker: ${marker}`);
}

assert.ok(
  productBrowserSource.includes("assertSendRecipientValidation"),
  "product UI browser check must cover Send recipient validation.",
);
assert.ok(
  productBrowserSource.includes("[data-vanta-send-recipient-status]"),
  "product UI browser check must inspect the Send recipient status selector.",
);

assert.equal(
  packageJson.scripts["send:recipient-validation-check"],
  "node scripts/check-vanta-send-recipient-validation.mjs",
  "package.json must expose send:recipient-validation-check.",
);
assert.ok(
  packageJson.scripts["send:verify"]?.includes("npm run send:recipient-validation-check"),
  "send:verify must include send:recipient-validation-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run send:recipient-validation-check"),
  "truth:privacy-claim-gate must include send:recipient-validation-check.",
);

const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/send-recipient-validation-check-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

try {
  mkdirSync(tempTsDir, { recursive: true });
  writeFileSync(join(tempTsDir, "sendRecipientValidation.ts"), helperSource);
  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      join(tempTsDir, "sendRecipientValidation.ts"),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  const { validateLiveSendRecipient } = await import(
    pathToFileURL(join(tempJsDir, "sendRecipientValidation.js")).href
  );

  const systemAddress = "11111111111111111111111111111111";
  const validTyped = validateLiveSendRecipient(systemAddress, systemAddress, "typed");
  assert.equal(validTyped.ready, true, "System Program address should validate.");
  assert.equal(validTyped.kind, "solana-address");
  assert.equal(validTyped.canonicalAddress, systemAddress);
  assert.equal(validTyped.isSelf, true);

  const validPasted = validateLiveSendRecipient(systemAddress, systemAddress, "pasted");
  assert.equal(validPasted.ready, true, "Pasted System Program address should validate.");
  assert.equal(validPasted.inputSource, "pasted");
  assert.equal(validPasted.detail.includes("Paste"), true);

  const invalidLong = validateLiveSendRecipient("not-a-valid-solana-address-but-long", systemAddress, "typed");
  assert.equal(invalidLong.ready, false, "Malformed long recipient must be invalid.");
  assert.equal(invalidLong.kind, "invalid-address");

  const unresolvedSol = validateLiveSendRecipient("clay.sol", systemAddress, "typed");
  assert.equal(unresolvedSol.ready, false, "Unresolved .sol names must be fail-closed.");
  assert.equal(unresolvedSol.kind, "sol-name-unsupported");
  assert.equal(unresolvedSol.resolutionRequired, true);

  const tooLong = validateLiveSendRecipient("1".repeat(65), systemAddress, "typed");
  assert.equal(tooLong.ready, false, "Overlong recipient must be invalid before parsing.");
  assert.equal(tooLong.kind, "too-long");

  const empty = validateLiveSendRecipient("   ", systemAddress, "typed");
  assert.equal(empty.ready, false, "Empty recipient must be invalid.");
  assert.equal(empty.kind, "empty");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Vanta Send recipient validation check: PASS");
