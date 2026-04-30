import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const packageJson = JSON.parse(readRepoFile("package.json"));
const shieldStateSource = readRepoFile("src/solana/vantaShieldState.ts");
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const unshieldAuthSource = readRepoFile("src/solana/unshieldAuth.ts");
const solUnshieldAuthSource = readRepoFile("src/solana/solUnshieldAuth.ts");
const securityLimitations = readRepoFile("SECURITY_LIMITATIONS.md");
const proofBoundaryDoc = readRepoFile("docs/zk/vanta-private-core-unshield-proof-boundary.md");
const transactionEvidenceSource = readRepoFile("src/transactions/vantaTransactionEvidence.ts");
const transactionEvidenceCheck = readRepoFile("scripts/check-vanta-transaction-evidence.mjs");

for (const phrase of [
  "VANTA_UNSHIELD_MEMO_PREFIX",
  "VANTA_SOL_UNSHIELD_MEMO_PREFIX",
  "createPreparedUnshieldMemo",
  "createPreparedSolUnshieldMemo",
  "...payload",
  'kind: "unshield"',
  'kind: "sol_unshield"',
]) {
  assert.ok(shieldStateSource.includes(phrase), `Unshield memo surface missing ${phrase}.`);
}

for (const phrase of [
  "destinationOwner",
  "mintAddress",
  "noteId",
  "transitionNoteId",
  "vaultOwner",
  "amount",
]) {
  assert.ok(
    unshieldAuthSource.includes(`\`${phrase}:`),
    `Token unshield signed intent must keep ${phrase} explicit as public/operator-visible exit truth.`,
  );
}

for (const phrase of [
  "destinationOwner",
  "assetId",
  "consumedNoteId",
  "transitionNoteId",
  "vaultOwner",
  "amount",
]) {
  assert.ok(
    solUnshieldAuthSource.includes(`\`${phrase}:`),
    `SOL unshield signed intent must keep ${phrase} explicit as public/operator-visible exit truth.`,
  );
}

for (const phrase of [
  "shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0)",
  "entry.account?.spendableShieldedSolNotes.length",
  "shieldedSolSourceEntry?.account ?? canonicalSolAccount ?? vusdShieldEntry.account",
  "createRecentShieldedSolNote",
  "native-sol-recent-shield",
  "recentShield?.asset === \"SOL\" ? recentShield.resultingShieldedBalance : 0",
  "Math.max(solShieldAccount?.shieldedSolBalance ?? 0, recentShieldedSolBalance)",
]) {
  assert.ok(
    unshieldPageSource.includes(phrase),
    `Unshield SOL lane must source shielded SOL from the registry account that actually has SOL: ${phrase}`,
  );
}

for (const phrase of [
  "operator/request and exit-settlement layers still see those terms",
  "hash-bound proof privacy, not hidden-economic-terms privacy",
  "Transaction Evidence v0.1 is evidence of the current transaction or receipt trace only",
]) {
  assert.ok(
    securityLimitations.includes(phrase),
    `Security limitations must preserve public-exit truth phrase: ${phrase}`,
  );
}

assert.ok(
  proofBoundaryDoc.includes("not a `v2-hidden-economic-terms` claim"),
  "Private Core proof-boundary docs must not overclaim hidden exit terms.",
);

assert.ok(
  transactionEvidenceSource.includes('scope: "local-operator-harness"'),
  "Unshield transaction evidence must remain scoped to the local operator harness.",
);
assert.ok(
  transactionEvidenceSource.includes('status: "not-live-mainnet-settlement"'),
  "Unshield transaction evidence must preserve not-live-mainnet-settlement status.",
);
assert.ok(
  transactionEvidenceCheck.includes('"redacted-private-core-release-receipt"'),
  "Transaction evidence check must require redacted operator receipts.",
);

assert.equal(
  packageJson.scripts["unshield:public-exit-surface-check"],
  "node scripts/check-vanta-unshield-public-exit-surface.mjs",
  "package.json must expose unshield:public-exit-surface-check.",
);

console.log("Vanta Unshield public-exit surface check: PASS");
