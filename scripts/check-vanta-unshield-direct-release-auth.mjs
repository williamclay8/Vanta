import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const packageJson = JSON.parse(readRepoFile("package.json"));
const unshieldAuthSource = readRepoFile("src/solana/unshieldAuth.ts");
const solUnshieldAuthSource = readRepoFile("src/solana/solUnshieldAuth.ts");
const operatorAuthSource = readRepoFile("operator/unshield-auth.mjs");
const solOperatorAuthSource = readRepoFile("operator/sol-unshield-auth.mjs");
const unshieldServerSource = readRepoFile("operator/unshield-server.mjs");
const onchainStateSource = readRepoFile("operator/vanta-onchain-state.mjs");

for (const [label, source] of [
  ["browser token unshield auth", unshieldAuthSource],
  ["browser SOL unshield auth", solUnshieldAuthSource],
]) {
  assert.ok(
    !source.includes("transitionStateSignature"),
    `${label} must not preserve transition-state-signature release authorization.`,
  );
}

for (const [label, source] of [
  ["browser token unshield auth", unshieldAuthSource],
  ["browser SOL unshield auth", solUnshieldAuthSource],
  ["operator token unshield auth", operatorAuthSource],
  ["operator SOL unshield auth", solOperatorAuthSource],
]) {
  assert.ok(
    !source.includes("transition-authorized"),
    `${label} must not preserve transition-authorized sentinel release authorization.`,
  );
}

for (const forbidden of [
  "isWalletDirectUnshieldIntent",
  "isWalletDirectSolUnshieldIntent",
  "waitForEligibleUnshieldTransition",
  "verifyUnshieldTransitionBySignature",
  "parseUnshieldMemoPayload",
  "assertEligibleUnshieldTransition",
  "assertEligibleSolUnshieldTransition",
  "not-provided-wallet-signed-transition-public-exit",
]) {
  assert.ok(
    !unshieldServerSource.includes(forbidden),
    `Unshield operator must not preserve alternate transition release path marker: ${forbidden}`,
  );
}

for (const forbidden of [
  "export function assertEligibleUnshieldTransition",
  "export function assertEligibleSolUnshieldTransition",
]) {
  assert.ok(
    !onchainStateSource.includes(forbidden),
    `Onchain state helper must not preserve unshield transition authorization helper: ${forbidden}`,
  );
}

for (const forbidden of [
  "assertDirectUnshieldReleaseIntent",
  "assertDirectSolUnshieldReleaseIntent",
  "Operator-direct unshield requires a direct wallet-signed note reference.",
  "Operator-direct SOL unshield requires a direct wallet-signed note reference.",
  "not-provided-wallet-authorized-public-exit",
  "SystemProgram.transfer({",
  ".sendTransfer({",
]) {
  assert.ok(
    !unshieldServerSource.includes(forbidden),
    `Unshield operator must not preserve direct-release marker after PDA relay cutover: ${forbidden}.`,
  );
}

for (const required of [
  "buildTagUnshieldProgramReleaseReceipt",
  "program-tag-unshield-pda-cpi-fail-closed",
  "TAG_UNSHIELD",
  "programTxSignature",
  "pending-onchain-root-proof-nullifier-verification",
]) {
  assert.ok(
    unshieldServerSource.includes(required),
    `Unshield operator program relay guard missing ${required}.`,
  );
}

for (const [label, source] of [
  ["operator token unshield auth", operatorAuthSource],
  ["operator SOL unshield auth", solOperatorAuthSource],
]) {
  assert.ok(
    source.includes('Object.prototype.hasOwnProperty.call(body, "transitionStateSignature")'),
    `${label} must reject transitionStateSignature as an obsolete request field.`,
  );
  assert.ok(
    !source.includes("`transitionStateSignature:"),
    `${label} wallet message must not preserve transitionStateSignature.`,
  );
}

const tokenOperatorAuth = await import(
  pathToFileURL(resolve(repoRoot, "operator/unshield-auth.mjs")).href
);
const solOperatorAuth = await import(
  pathToFileURL(resolve(repoRoot, "operator/sol-unshield-auth.mjs")).href
);

const owner = "11111111111111111111111111111111";
const tokenBody = {
  amount: "1",
  destinationOwner: owner,
  issuedAt: Date.now(),
  mintAddress: "So11111111111111111111111111111111111111112",
  noteId: "note-token",
  owner,
  requestId: "request-token",
  requester: owner,
  signature: "not-a-valid-signature-but-parse-only",
  transitionNoteId: "direct:note-token",
  transitionStateSignature: "obsolete-transition-signature",
  vaultOwner: owner,
  version: "v1",
};
const solBody = {
  amount: "1",
  asset: "SOL",
  assetId: "So11111111111111111111111111111111111111112",
  consumedNoteId: "note-sol",
  destinationOwner: owner,
  issuedAt: Date.now(),
  owner,
  requestId: "request-sol",
  requester: owner,
  signature: "not-a-valid-signature-but-parse-only",
  transitionNoteId: "direct:note-sol",
  transitionStateSignature: "obsolete-transition-signature",
  vaultOwner: owner,
  version: "v1",
};

assert.throws(
  () => tokenOperatorAuth.parseSignedUnshieldIntent(tokenBody),
  /Invalid authenticated unshield request/,
  "Token unshield parser must reject obsolete transitionStateSignature.",
);
assert.throws(
  () => solOperatorAuth.parseSignedSolUnshieldIntent(solBody),
  /Invalid authenticated SOL unshield request/,
  "SOL unshield parser must reject obsolete transitionStateSignature.",
);

for (const [label, message] of [
  [
    "token",
    tokenOperatorAuth.formatUnshieldIntentMessage({
      ...tokenBody,
      transitionStateSignature: undefined,
    }),
  ],
  [
    "SOL",
    solOperatorAuth.formatSolUnshieldIntentMessage({
      ...solBody,
      transitionStateSignature: undefined,
    }),
  ],
]) {
  assert.ok(
    !message.includes("transitionStateSignature:"),
    `${label} unshield wallet message must not include transitionStateSignature.`,
  );
}

assert.equal(
  packageJson.scripts["unshield:direct-release-auth-check"],
  "node scripts/check-vanta-unshield-direct-release-auth.mjs",
  "package.json must expose the direct-release auth guard.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"].includes(
    "npm run unshield:direct-release-auth-check",
  ),
  "truth:privacy-claim-gate must include the direct-release auth guard.",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"].includes(
    "npm run unshield:direct-release-auth-check",
  ),
  "zk:review-guards-check must include the direct-release auth guard.",
);

console.log("Vanta Unshield direct release auth check: PASS");
