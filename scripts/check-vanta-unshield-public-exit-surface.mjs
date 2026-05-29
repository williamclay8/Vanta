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
const unshieldWorkspaceSource = readRepoFile("src/components/UnshieldWorkspaceCard.tsx");
const unshieldPanelUtilsSource = readRepoFile("src/components/unshield/unshieldPanelUtils.ts");
const unshieldSurfaceSource = `${unshieldPageSource}\n${unshieldWorkspaceSource}\n${unshieldPanelUtilsSource}`;
const unshieldAdvancedPanelSource = readRepoFile("src/components/UnshieldAdvancedPanel.tsx");
const stylesSource = readRepoFile("src/styles.css");
const unshieldAuthSource = readRepoFile("src/solana/unshieldAuth.ts");
const solUnshieldAuthSource = readRepoFile("src/solana/solUnshieldAuth.ts");
const solUnshieldOperatorClientSource = readRepoFile("src/solana/solUnshieldOperatorClient.ts");
const unshieldOperatorClientSource = readRepoFile("src/solana/unshieldOperatorClient.ts");
const solUnshieldOperatorHealthSource = readRepoFile("src/solana/solUnshieldOperatorHealth.ts");
const shieldConfigSource = readRepoFile("src/solana/shieldConfig.ts");
const envExampleSource = readRepoFile(".env.example");
const packageSource = readRepoFile("package.json");
const unshieldOperatorSource = readRepoFile("operator/unshield-server.mjs");
const unshieldOperatorAuthSource = readRepoFile("operator/unshield-auth.mjs");
const solUnshieldOperatorAuthSource = readRepoFile("operator/sol-unshield-auth.mjs");
const securityLimitations = readRepoFile("SECURITY_LIMITATIONS.md");
const proofBoundaryDoc = readRepoFile("docs/zk/vanta-private-core-unshield-proof-boundary.md");
const transactionEvidenceSource = readRepoFile("src/transactions/vantaTransactionEvidence.ts");
const transactionEvidenceCheck = readRepoFile("scripts/check-vanta-transaction-evidence.mjs");

const pageOnlyPhrases = new Set([
  "signUnshieldIntent",
  "signSolUnshieldIntent",
  "signWalletMessageIntentWithSafety",
  "direct:${args.note.noteId}",
]);

for (const phrase of [
  "PrivacySummary",
  "UNSHIELD_PRIVACY_SUMMARY_ITEMS",
  "Chain sees",
  "Recipient (you) sees",
  "Operator sees",
  "exit terms and release status",
  "selectedUnshieldNoteId",
  "UnshieldAdvancedPanel",
  "handleSelectUnshieldNote",
  "unshieldPrimaryActionLabel",
  "Withdraw",
  "signUnshieldIntent",
  "signSolUnshieldIntent",
  "signWalletMessageIntentWithSafety",
  "TransactionStatusToast",
  "<TransactionStatusToast",
  "Preparing wallet approval",
  "Recording unshield transition",
  "Authorizing public release",
  "Ready for operator release",
  "Release through operator",
  "direct:${args.note.noteId}",
  "shield the exact USDC amount first",
  "unshield-destination-card",
  "unshield-destination-card-copy",
  "to your own wallet",
  "connected requester/depositor wallet",
  "Fresh-address exits are disabled until the destination is",
  "proof-bound",
  "Send to a different wallet",
  "unshield-destination-toggle-copy",
  "Coming soon - needs unshield-to-fresh-wallet support",
  'aria-disabled="true"',
  "unshield-exit-preview",
  "unshield-exit-recipe",
  "You'll receive",
  "after public exit",
  "Shielded note",
  "Own wallet",
  "unshield-success-actions",
  "unshield-success-pulse",
  "Shield more",
  "Share receipt",
  "View on Solscan",
  "getSolscanTransactionUrl",
]) {
  const source = pageOnlyPhrases.has(phrase) ? unshieldPageSource : unshieldSurfaceSource;
  assert.ok(
    source.includes(phrase),
    `Unshield Phantom-safe public-exit flow missing ${phrase}.`,
  );
}

for (const phrase of [
  "Advanced unshield settings",
  "Custom note selection",
  "NotePicker",
  "No ledger-spendable notes",
  "Reference note for receipt",
  "Receipt references stay bounded to the selected exit note and public release record.",
  "data-vanta-unshield-advanced-panel",
]) {
  assert.ok(
    unshieldAdvancedPanelSource.includes(phrase),
    `Unshield advanced panel must preserve progressive-disclosure phrase ${phrase}.`,
  );
}

for (const phrase of [
  "Operator sees: nothing",
  "fully private Unshield",
  "anonymous Unshield",
  "untraceable Unshield",
]) {
  assert.ok(
    !unshieldPageSource.includes(phrase),
    `Unshield page must not overclaim progressive-disclosure privacy: ${phrase}`,
  );
}

for (const phrase of [
  ".unshield-exit-preview",
  ".unshield-exit-recipe",
  ".unshield-exit-recipe__path",
  ".unshield-exit-recipe__node--wallet",
  ".unshield-success-signature-card",
  ".unshield-success-pulse",
  ".unshield-success-actions",
  "@keyframes unshieldSuccessPulse",
]) {
  assert.ok(stylesSource.includes(phrase), `Unshield exit recipe style missing ${phrase}.`);
}

const exitPreviewIndex = unshieldSurfaceSource.indexOf("unshield-exit-preview");
const ticketFormIndex = unshieldSurfaceSource.indexOf("shield-form swap-widget unshield-ticket");
assert.ok(
  exitPreviewIndex >= 0 && ticketFormIndex > exitPreviewIndex,
  "Unshield exit consequence preview must render before the form controls.",
);

const exitPreviewBlock = unshieldSurfaceSource.slice(exitPreviewIndex, ticketFormIndex).toLowerCase();
for (const phrase of ["fresh wallet", "different wallet", "private exit", "anonymous", "untraceable", "fully private"]) {
  assert.ok(!exitPreviewBlock.includes(phrase), `Unshield exit consequence preview must not overclaim ${phrase}.`);
}

const completionStatusIndex = unshieldSurfaceSource.indexOf('status === "complete"');
const completionDetailsIndex = unshieldSurfaceSource.indexOf(
  'className="unshield-completion-details"',
  completionStatusIndex,
);
assert.ok(
  completionStatusIndex >= 0 && completionDetailsIndex > completionStatusIndex,
  "Unshield completion surface must render a bounded success summary before internal operator details.",
);
const completionSurface = unshieldSurfaceSource.slice(completionStatusIndex, completionDetailsIndex);
for (const phrase of [
  "Verify the public exit transaction before treating funds as moved",
  "Operator release is still pending",
  "public operator release reported",
  "public exit transition recorded",
  "Exit visibility: public on-chain exit",
  "currentUnshieldTransactionEvidence.settlement.status",
  "copyUnshieldReceipt",
  "Vanta Unshield receipt",
  "operatorReleaseSignature &&",
  "getSolscanTransactionUrl(operatorReleaseSignature)",
  'to="/app/shield"',
  "unshield-success-signature-card",
  "unshield-success-pulse",
  "unshield-success-actions",
]) {
  assert.ok(
    completionSurface.includes(phrase),
    `Unshield completion surface must preserve action/truth boundary phrase ${phrase}.`,
  );
}

assert.ok(
  unshieldPageSource.includes("navigator.clipboard.writeText"),
  "Unshield completion copy action must still write the receipt to the clipboard.",
);

const completionSurfaceWithoutFundsQualifier = completionSurface
  .toLowerCase()
  .replaceAll("before treating funds as moved", "");
for (const phrase of [
  "withdrawal complete",
  "funds moved",
  "final settlement",
  "private exit",
  "anonymous",
  "untraceable",
  "fully private",
  "production-ready",
  "mainnet-ready",
]) {
  assert.ok(
    !completionSurfaceWithoutFundsQualifier.includes(phrase),
    `Unshield completion surface must not overclaim ${phrase}.`,
  );
}

assert.ok(
  unshieldPageSource.includes('intentKind: "sol-unshield-intent"'),
  "SOL Unshield must preserve a typed wallet message-intent release prompt.",
);
assert.ok(
  unshieldPageSource.includes('intentKind: "unshield-intent"'),
  "Token Unshield must preserve a typed wallet message-intent release prompt.",
);
assert.ok(
  !unshieldAuthSource.includes('signature: "operator-direct"') &&
    !solUnshieldAuthSource.includes('signature: "operator-direct"'),
  "Unshield auth must not mint unauthenticated operator-direct sentinel signatures.",
);
assert.ok(
  !unshieldOperatorAuthSource.includes('payload.signature === "operator-direct"') &&
    !solUnshieldOperatorAuthSource.includes('payload.signature === "operator-direct"'),
  "Unshield operator auth must not accept operator-direct sentinel signatures.",
);
assert.ok(
  !unshieldAuthSource.includes('"transition-authorized"') &&
    !solUnshieldAuthSource.includes('"transition-authorized"'),
  "Unshield auth must not mint transition-authorized sentinel signatures.",
);
assert.ok(
  !unshieldOperatorAuthSource.includes('payload.signature === "transition-authorized"') &&
    !solUnshieldOperatorAuthSource.includes('payload.signature === "transition-authorized"') &&
    !unshieldOperatorSource.includes('intent.signature !== "transition-authorized"'),
  "Unshield operator auth must not accept transition-authorized sentinel signatures.",
);

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

for (const [sourceLabel, source, phrase] of [
  [
    "shieldConfig",
    shieldConfigSource,
    "VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL",
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    "VITE_VANTA_BONK_UNSHIELD_OPERATOR_URL",
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    "configuredBonkUnshieldOperatorUrl ?? effectiveUnshieldOperatorUrl",
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    "resolveSolUnshieldOperatorUrl",
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    'new URL("sol", `${args.sharedUnshieldOperatorUrl.replace(/\\/+$/, "")}/`).toString()',
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    "http://127.0.0.1:8789/unshield/sol",
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    "https://vanta-prod-private-pool-v2-operator.onrender.com/unshield",
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    "https://vanta-prod-private-pool-v2-operator.onrender.com/unshield/sol",
  ],
  [
    "shieldConfig",
    shieldConfigSource,
    "productionSolUnshieldOperatorUrlFallback || args.localSolUnshieldOperatorUrl",
  ],
  [
    "SOL unshield client",
    solUnshieldOperatorClientSource,
    "liveSwapPair.solUnshieldOperatorUrl",
  ],
  [
    "SOL unshield client",
    solUnshieldOperatorClientSource,
    "parsed.requestId !== payload.requestId",
  ],
  [
    "token unshield client",
    unshieldOperatorClientSource,
    "parsed.requestId !== payload.requestId",
  ],
  [
    "SOL unshield health client",
    solUnshieldOperatorHealthSource,
    "../../health/sol-unshield",
  ],
  [
    "SOL unshield health client",
    solUnshieldOperatorHealthSource,
    "type SolUnshieldOperatorErrorPayload",
  ],
  [
    "SOL unshield health client",
    solUnshieldOperatorHealthSource,
    "extractSolUnshieldOperatorErrorMessage(parsed",
  ],
  [
    "SOL unshield health client",
    solUnshieldOperatorHealthSource,
    "if (!response.ok)",
  ],
  [
    "Unshield page",
    unshieldPageSource,
    "fetchSolUnshieldOperatorHealth",
  ],
  [
    "Unshield page",
    unshieldPageSource,
    'solUnshieldOperatorHealth === "ready"',
  ],
  [
    "Unshield page",
    unshieldPageSource,
    "selectedLane !== \"SOL\" && !selectedShieldAsset?.unshieldOperatorUrl",
  ],
  [
    "Unshield page",
    unshieldPageSource,
    "selectedLane !== \"SOL\" && !selectedShieldAsset?.mintAddress",
  ],
  [
    "Unshield page",
    unshieldPageSource,
    "selectedLane !== \"SOL\" && !selectedShieldAsset?.vaultOwner",
  ],
	  [
	    "Unshield page",
	    unshieldPageSource,
	    "Operator release signature returned",
	  ],
  [
    "env example",
    envExampleSource,
    "VITE_VANTA_BONK_UNSHIELD_OPERATOR_URL=http://127.0.0.1:8789/unshield",
  ],
  [
    "env example",
    envExampleSource,
    "VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL=http://127.0.0.1:8789/unshield/sol",
  ],
  [
    "package scripts",
    packageSource,
    "\"unshield:sol-operator-endpoint-check\"",
  ],
]) {
  assert.ok(source.includes(phrase), `${sourceLabel} must preserve SOL unshield operator endpoint config: ${phrase}`);
}

for (const phrase of [
  "VANTA_UNSHIELD_OPERATOR_MAX_JSON_BODY_BYTES",
  "JSON request body is too large.",
  "Expected application/json request body.",
]) {
  assert.ok(
    unshieldOperatorSource.includes(phrase),
    `Unshield operator must preserve production request-body guard: ${phrase}`,
  );
}

for (const phrase of [
	  "shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0)",
	  "entry.account?.spendableShieldedSolNotes.length",
	  "shieldedSolSourceEntry?.account ?? canonicalSolAccount ?? usdcShieldEntry.account",
	  "const spendableSolNotes = useMemo(",
	  "sumSpendableAmounts(spendableSolNotes, 9)",
	  'selectedLane === "SOL" ? selectedSolNote?.amount ?? 0 : selectedShieldNote?.amount ?? 0',
	]) {
  assert.ok(
    unshieldPageSource.includes(phrase),
    `Unshield SOL lane must source shielded SOL from the registry account that actually has SOL: ${phrase}`,
  );
}

for (const phrase of [
	  "createRecentShieldedSolNote",
	  "native-sol-recent-shield",
	  "recentShieldedSolBalance",
	  "const selectedSolAggregateAmount = Math.max(",
	  "unshield complete",
	  "returned to Public Wallet",
	]) {
  assert.ok(
    !unshieldPageSource.includes(phrase),
    `Unshield SOL lane must not synthesize spendable SOL from optimistic recent state: ${phrase}`,
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
