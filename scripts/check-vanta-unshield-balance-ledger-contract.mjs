import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

const packageJson = JSON.parse(readRepoFile("package.json"));
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const stylesSource = readRepoFile("src/styles.css");
const shieldStateSource = readRepoFile("src/solana/vantaShieldState.ts");
const shieldAssetStateSource = readRepoFile("src/solana/useVantaShieldAssetState.ts");
const shieldAssetRegistrySource = readRepoFile("src/solana/useVantaShieldAssetRegistryState.ts");
const operatorStateClientSource = readRepoFile("src/solana/operatorStateClient.ts");
const tokenOperatorClientSource = readRepoFile("src/solana/unshieldOperatorClient.ts");
const solOperatorClientSource = readRepoFile("src/solana/solUnshieldOperatorClient.ts");
const unshieldOperatorSource = readRepoFile("operator/unshield-server.mjs");
const privatePoolOperatorSource = readRepoFile("operator/private-pool-v2-server.mjs");
const privacyFlowSource = readRepoFile("src/data/context/PrivacyFlowContext.tsx");
const privatePoolProofRequestSource = readRepoFile("src/privacy/privatePoolV2ProofRequests.ts");
const liveUnshieldBridgeSource = readRepoFile("src/zk/liveUnshieldBridge.ts");

assert(
  packageJson.scripts["unshield:balance-ledger-check"] ===
    "node scripts/check-vanta-unshield-balance-ledger-contract.mjs",
  "package.json must expose unshield:balance-ledger-check.",
);
assert(
  packageJson.scripts["private-core:verify"]?.includes("npm run unshield:balance-ledger-check"),
  "private-core:verify must include unshield:balance-ledger-check.",
);
assert(
  packageJson.scripts["mainnet:preflight"]?.includes("npm run unshield:balance-ledger-check"),
  "mainnet:preflight must include unshield:balance-ledger-check.",
);

for (const phrase of [
  "isCanonicalTokenSpendableNote",
  "isCanonicalSolSpendableNote",
  "canonicalSpendableShieldNotesByLane",
  "sumSpendableAmounts(spendableSolNotes, 9)",
  "sumSpendableAmounts(canonicalSpendableShieldNotesByLane[lane], 6)",
  'aria-label="Unshield asset"',
  "formatAvailableLaneLabel(option.lane, option.amount)",
  "selected ledger-spendable note",
  "Operator release signature returned",
]) {
  assert(unshieldPageSource.includes(phrase), `UnshieldPage must preserve ledger-only UI/actionability phrase: ${phrase}`);
}
for (const forbidden of [
  "unshield-balance-strip",
  "unshield-balance-pill",
]) {
  assert(
    !unshieldPageSource.includes(forbidden),
    `UnshieldPage must not render every asset lane as a side-by-side option strip: ${forbidden}`,
  );
  assert(
    !stylesSource.includes(forbidden),
    `Unshield styles must not preserve the side-by-side asset option strip: ${forbidden}`,
  );
}

for (const phrase of [
  "loadVerifiedSplShieldNotes",
  "mergeVerifiedSplShieldNotes",
  "reconcileLocallyReleasedShieldNotes",
]) {
  assert(shieldAssetStateSource.includes(phrase), `useVantaShieldAssetState must preserve verified SPL note hydration before release reconciliation: ${phrase}`);
}

for (const forbidden of [
  "createRecentShieldedSolNote",
  "native-sol-recent-shield",
  "recentShieldedSolBalance",
  "const selectedSolAggregateAmount = Math.max(",
  "unshield complete",
  "returned to Public Wallet",
]) {
  assert(
    !unshieldPageSource.includes(forbidden),
    `UnshieldPage must not present optimistic/completion-overclaim state: ${forbidden}`,
  );
}

assert(
  shieldStateSource.includes("pendingUnshieldByConsumedNoteId") &&
    shieldStateSource.includes("!pendingUnshieldByConsumedNoteId.has(note.noteId)") &&
    shieldStateSource.includes('pendingUnshieldTransition') &&
    shieldStateSource.includes('? "pending"') &&
    shieldStateSource.includes("consumingTransition?.noteId") &&
    shieldStateSource.includes('const lifecycleStatus = spentMarker') &&
    shieldStateSource.includes(': pendingUnshieldTransition'),
  "vantaShieldState must keep pending token Unshield transitions out of spendableShieldNotes before spent markers land.",
);
assert(
  shieldStateSource.includes("pendingSolUnshieldByConsumedNoteId") &&
    shieldStateSource.includes("!pendingSolUnshieldByConsumedNoteId.has(note.noteId)"),
  "vantaShieldState must keep pending SOL Unshield transitions out of spendableShieldedSolNotes.",
);

assert(
  operatorStateClientSource.includes("createUnshieldConsumedNoteReferenceHash") &&
    operatorStateClientSource.includes("fetchLocallyReleasedUnshieldNoteReferenceHashes") &&
    operatorStateClientSource.includes("fetchLocallyReleasedSolNoteReferenceHashes") &&
    operatorStateClientSource.includes("../state/unshield-records") &&
    operatorStateClientSource.includes("consumedNoteReferenceHashes") &&
    operatorStateClientSource.includes("parseConsumedNoteReferenceHashes"),
  "operatorStateClient must fetch hashed token/SOL Unshield release records by consumed note reference hash.",
);
assert(
  shieldAssetStateSource.includes("fetchLocallyReleasedUnshieldNoteReferenceHashes") &&
    shieldAssetStateSource.includes("createUnshieldConsumedNoteReferenceHash") &&
    shieldAssetStateSource.includes("reconcileLocallyReleasedShieldNotes") &&
    shieldAssetStateSource.includes("spendableShieldNotes.filter(keepSpendableNote)") &&
    shieldAssetStateSource.includes('consumedByTransitionKind: "unshield"') &&
    shieldAssetStateSource.includes("spendableShieldNotes.reduce"),
  "useVantaShieldAssetState must reconcile local token release records into consumed ledger state.",
);
assert(
  shieldAssetRegistrySource.includes("includeLocallyReleasedSolNotes: true") &&
    shieldAssetRegistrySource.includes("useVantaShieldAssetRegistryEntry(\"USDT\")") &&
    shieldAssetRegistrySource.includes("useVantaShieldAssetRegistryEntry(\"JupUSD\")"),
  "Every shield asset registry entry must opt into local SOL release reconciliation through the shared registry-entry hook.",
);
assert(
  shieldAssetRegistrySource.includes("unshieldOperatorUrl: asset.unshieldOperatorUrl"),
  "Every shield asset registry entry must pass its token Unshield operator URL for release reconciliation.",
);
assert(
  !unshieldPageSource.includes(
    "shieldedSolSourceEntry?.error ?? canonicalShieldState.error ?? usdcShieldEntry.error",
  ),
  "SOL Unshield validation must not surface token registry release-state errors from the selected SOL source entry.",
);
assert(
  unshieldPageSource.includes("spendableSolNotes.length > 0") &&
    unshieldPageSource.includes("const solShieldStateError =") &&
    unshieldPageSource.includes("? null") &&
    unshieldPageSource.includes(": canonicalShieldState.error;"),
  "SOL Unshield validation must ignore shield-state errors once a canonical ledger-spendable SOL note exists.",
);

for (const phrase of [
  '"/state/unshield-records"',
  "listConsumedNoteIds()",
  "consumedNoteReferenceHashes",
  "createUnshieldConsumedNoteReferenceHash",
  "createUnshieldOperatorReleaseReceipt",
  'kind: "vanta-unshield-operator-release-receipt-v1"',
  'replayStatus: "accepted-first-use"',
  'spendabilityBasis: "canonical-spendable-note-ledger"',
  "releaseIntentHash",
]) {
  assert(unshieldOperatorSource.includes(phrase), `Unshield operator must preserve typed release receipt/state phrase: ${phrase}`);
}
assert(
  !unshieldOperatorSource.includes('"/state/unshield-records"') ||
    !/\/state\/unshield-records[\s\S]{0,800}records:\s*releaseRecords\.listRecords/u.test(unshieldOperatorSource),
  "The public token Unshield release-state endpoint must not expose raw release records.",
);
assert(
  !/\/state\/(?:sol-)?unshield-records[\s\S]{0,900}consumedNoteIds\s*:/u.test(
    unshieldOperatorSource,
  ),
  "The public Unshield release-state endpoints must not expose raw consumed note ids.",
);
assert(
  !operatorStateClientSource.includes("consumedNoteIds"),
  "Browser-side operator state client must not expect raw consumed note ids from public Unshield state.",
);
assert(
  privatePoolOperatorSource.includes('"/state/unshield-records"'),
  "Private Pool v2 public route list must delegate redacted token Unshield release-state endpoint.",
);

for (const phrase of [
  "releaseReceipt",
  "vanta-unshield-operator-release-receipt-v1",
  "accepted-first-use",
  "canonical-spendable-note-ledger",
  "releaseIntentHash",
]) {
  assert(tokenOperatorClientSource.includes(phrase), `Token Unshield client must validate release receipt phrase: ${phrase}`);
  assert(solOperatorClientSource.includes(phrase), `SOL Unshield client must validate release receipt phrase: ${phrase}`);
}

assert(
  privacyFlowSource.includes("settlementId: committedUnshieldSettlement.settlementCommitment"),
  "Private-core Unshield committed settlement must not use the raw nullifier as settlementId.",
);
assert(
  privatePoolProofRequestSource.includes("computeVantaPrivatePoolV2UnshieldPublicInputHash") &&
    privatePoolProofRequestSource.includes("resolvedUnshieldPublicInputHash") &&
    privatePoolProofRequestSource.includes("circuitPublicInputs: [`unshield-public-input-hash:${resolvedUnshieldPublicInputHash}`]"),
  "Private Pool v2 Unshield proof request must derive its circuit-public hash from the request terms instead of trusting caller input.",
);
assert(
  liveUnshieldBridgeSource.includes("redactLiveUnshieldReference") &&
    liveUnshieldBridgeSource.includes("consumedNoteReferenceHash") &&
    liveUnshieldBridgeSource.includes("consumedStateSignatureHash") &&
    liveUnshieldBridgeSource.includes("sourceSwapNoteReferenceHash") &&
    !liveUnshieldBridgeSource.includes("...value.consumed") &&
    !liveUnshieldBridgeSource.includes("consumedNoteId: input.consumed.noteId") &&
    !liveUnshieldBridgeSource.includes("consumedStateSignature: input.consumed.stateSignature"),
  "Live Unshield browser persistence must retain redacted reference hashes instead of raw consumed note ids/state signatures.",
);

console.log("Vanta Unshield balance ledger contract check: PASS");
