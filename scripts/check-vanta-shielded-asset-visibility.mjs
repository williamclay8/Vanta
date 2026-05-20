import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const registrySource = readRepoFile("src/solana/useVantaShieldAssetRegistryState.ts");
const clientSource = readRepoFile("src/solana/client.ts");
const browserRpcEndpointSource = readRepoFile("src/solana/browserRpcEndpoint.ts");
const recentTokenNotesSource = readRepoFile("src/solana/recentShieldTokenNotes.ts");
const verifiedSplTokenNotesSource = readRepoFile("src/solana/verifiedSplShieldNotes.ts");
const shieldConfigSource = readRepoFile("src/solana/shieldConfig.ts");
const shieldPageSource = readRepoFile("src/pages/ShieldPage.tsx");
const shieldStateSource = readRepoFile("src/solana/vantaShieldState.ts");
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const sendCapabilitySource = readRepoFile("src/solana/shieldedSendCapability.ts");
const swapCapabilitySource = readRepoFile("src/solana/shieldedSwapCapability.ts");
const packageJson = JSON.parse(readRepoFile("package.json"));

const directShieldSymbols = [
  "USDC",
  "USDT",
  "EURC",
  "USDS",
  "USX",
  "USD1",
  "JupUSD",
  "JTO",
  "BONK",
  "JUP",
  "PYUSD",
  "WIF",
  "KMNO",
];
const allShieldedLabels = [
  "Shielded USDC",
  "Shielded USDT",
  "Shielded EURC",
  "Shielded USDS",
  "Shielded USX",
  "Shielded USD1",
  "Shielded JupUSD",
  "Shielded JTO",
  "Shielded BONK",
  "Shielded JUP",
  "Shielded PYUSD",
  "Shielded WIF",
  "Shielded KMNO",
  "Shielded SOL",
];
const shieldedTokenLabels = allShieldedLabels.filter((label) => label !== "Shielded SOL");

for (const marker of [
  "useVantaShieldAssetRegistryEntry(\"USDC\")",
  "useVantaShieldAssetRegistryEntry(\"USDT\")",
  "useVantaShieldAssetRegistryEntry(\"EURC\")",
  "useVantaShieldAssetRegistryEntry(\"USDS\")",
  "useVantaShieldAssetRegistryEntry(\"USX\")",
  "useVantaShieldAssetRegistryEntry(\"USD1\")",
  "useVantaShieldAssetRegistryEntry(\"JupUSD\")",
  "useVantaShieldAssetState",
  "configuredEntries: entries.filter((entry) => entry.asset.executable)",
]) {
  assert.ok(
    registrySource.includes(marker),
    `Shield asset registry must preserve canonical shield-family asset visibility marker: ${marker}.`,
  );
}

for (const marker of [
  "usePrivacyFlow",
  "loadRecentShieldTokenNotes",
  "mergeRecentShieldTokenAccount",
  "createRecentShieldTokenNote",
  "isRecentShieldTokenContext",
  "spendableShieldNotes = [...nextNotes",
]) {
  assert.ok(
    !registrySource.includes(marker),
    `Shield asset registry must not merge optimistic recent-token records into spendable balances: ${marker}.`,
  );
}

for (const marker of [
  "vanta.recentShieldTokenNotes.v1",
  "recordRecentShieldTokenNote",
  "loadRecentShieldTokenNotes",
  "PendingRecentShieldTokenNote",
  "pendingNoteId",
]) {
  assert.ok(
    recentTokenNotesSource.includes(marker),
    `Recent token shield notes must persist as pending recovery hints while encrypted memo recovery catches up: ${marker}.`,
  );
}

assert.ok(
  !recentTokenNotesSource.includes("VantaShieldNote"),
  "Recent token shield notes must not reuse canonical VantaShieldNote shape before ledger reconciliation.",
);

for (const marker of [
  "vanta.verifiedSplShieldNotes.v1",
  "recordVerifiedSplShieldNote",
  "loadVerifiedSplShieldNotes",
  "VantaShieldNote",
]) {
  assert.ok(
    verifiedSplTokenNotesSource.includes(marker),
    `Verified SPL token notes must persist canonical local Shield evidence: ${marker}.`,
  );
}

for (const marker of [
  "const recentShieldContext =",
  "setRecentShield(recentShieldContext)",
  "recordRecentShieldTokenNote",
  "recordVerifiedSplShieldNote",
  "recordedTokenDepositSignatureRef",
  "local-token-deposit:",
  "Private Pool v2 Shield receipt context was not available for this shield.",
  "...recentShieldContext",
  "owner: walletAddress",
  "owner: walletAddress!",
  "pendingShieldTarget",
  "const activeShieldTarget = pendingShieldTarget ?? selectedShieldAsset",
  "tokenDecimals: activeShieldTarget.decimals",
  "isConfirmedSignatureStage(splShieldTransferWait.stage)",
  "VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE",
]) {
  assert.ok(
    shieldPageSource.includes(marker),
    `Shield completion must commit recent shielded balance before optional receipt checks: ${marker}.`,
  );
}

for (const symbol of directShieldSymbols) {
  assert.ok(
    shieldConfigSource.includes(`"${symbol}"`),
    `${symbol} must remain in the configured direct shield-family asset list.`,
  );
  assert.ok(
    shieldPageSource.includes("asset: selectedShieldAsset.assetKey"),
    `Direct ${symbol} Shield must write the shield-state memo from the selected target asset key.`,
  );
  assert.ok(
    shieldPageSource.includes("asset: activeShieldTarget.assetKey"),
    `Direct ${symbol} Shield completion must record visibility from the frozen active shield target.`,
  );
  assert.ok(
    registrySource.includes(`useVantaShieldAssetRegistryEntry("${symbol}")`),
    `${symbol} must have a canonical registry entry.`,
  );
}

assert.ok(
  !shieldPageSource.includes('asset: "BONK"') &&
    !shieldPageSource.includes("pendingShieldAsset === \"BONK\""),
  "Direct token Shield visibility must stay generic across every shield-family asset, not BONK-specific.",
);
assert.ok(
  shieldPageSource.includes("VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE") &&
    shieldPageSource.includes("shield-state-memo"),
  "Every direct token Shield must include the shield-state memo in the same wallet request as the token transfer.",
);

for (const marker of [
  "setPendingShieldTarget(selectedShieldAsset)",
  "asset: activeShieldTarget.assetKey",
  "mintAddress: activeShieldTarget.mintAddress!",
  "vaultOwner: activeShieldTarget.vaultOwner!",
  "asset: pendingShieldAsset ?? activeShieldTarget.assetKey",
]) {
  assert.ok(
    shieldPageSource.includes(marker),
    `Shield completion must preserve the target asset selected at approval time: ${marker}.`,
  );
}

assert.ok(
  !shieldPageSource.includes('throw new Error("Shield protocol settlement is missing its source asset or owner.")'),
  "Shield completion must not hide confirmed token shields behind optional receipt context.",
);
assert.ok(
  !shieldPageSource.includes('splShieldTransferWait.waitStatus === "success"') &&
    !shieldPageSource.includes('stateSignatureWait.waitStatus === "success"'),
  "Shield completion must accept confirmed/finalized signature stages, not only raw waitStatus success.",
);
assert.ok(
  !shieldPageSource.includes("const stateTransaction = useVantaSafeSendTransaction();"),
  "Direct token Shield must record its shield-state memo in the deposit transaction instead of issuing a second wallet request.",
);
assert.ok(
  !shieldPageSource.includes("!supportedToken?.owner") &&
    !shieldPageSource.includes("const owner = supportedToken.owner") &&
    !shieldPageSource.includes("owner: supportedToken!.owner!"),
  "Shield state ownership must use the connected wallet, not token hook ownership metadata.",
);

for (const marker of [
  "fetchSignatureMemoEntries",
  "fetchParsedTransactionsOneAtATime",
  "readParsedMemoText",
  "readParsedMemoPayloadText",
  '"memo", "data", "message", "text", "info"',
  "getParsedTransactions([signature]",
  "signatureMemoEntries",
  "VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE",
]) {
  assert.ok(
    shieldStateSource.includes(marker),
    `Shield state recovery must parse Memo instructions when signature summaries omit memo text: ${marker}.`,
  );
}

assert.ok(
  browserRpcEndpointSource.includes('const defaultSolanaRpcEndpoint = "https://solana-rpc.publicnode.com"') &&
    clientSource.includes("isBrowserBlockedMainnetRpcEndpoint") &&
    browserRpcEndpointSource.includes("api.mainnet-beta.solana.com") &&
    browserRpcEndpointSource.includes("browserRpcEnvContract") &&
    browserRpcEndpointSource.includes("ignoredBrowserRpcEnvKeys") &&
    clientSource.includes("isForbiddenMainnetRpcEndpoint") &&
    clientSource.includes("resolveMainnetBrowserRpcEndpoint") &&
    clientSource.includes("export const endpoint = mainnetBrowserRpcEndpoint"),
  "Browser Solana client must use the public browser resolver, reject devnet/testnet/local endpoints, and ignore VITE RPC envs so paid/provider URLs are not bundled.",
);
assert.ok(
  shieldStateSource.includes('import { endpoint, readRpcFallbackEndpoints } from "@/solana/client"') &&
    shieldStateSource.includes("const shieldStateReadRpcEndpoints = readRpcFallbackEndpoints") &&
    shieldStateSource.includes("for (const readEndpoint of shieldStateReadRpcEndpoints)") &&
    shieldStateSource.includes('new Connection(readEndpoint, "confirmed")'),
  "Browser shield-state memo recovery must use the configured browser Solana RPC read fallback endpoints.",
);
assert.ok(
  shieldStateSource.includes("(args.signatureHints?.length ?? 0) > 0") &&
    shieldStateSource.includes("return []") &&
    shieldStateSource.includes("throw error"),
  "Shield state recovery must preserve direct signature hints when broad wallet-history RPC reads are temporarily unavailable.",
);

for (const symbol of directShieldSymbols) {
  assert.ok(
    registrySource.includes(`useVantaShieldAssetRegistryEntry("${symbol}")`),
    `${symbol} registry entry must pass through canonical account state.`,
  );
  assert.ok(
    shieldConfigSource.includes(`"${symbol}"`),
    `${symbol} must stay in the direct Shield asset registry.`,
  );
}

for (const marker of [
  "ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS",
  "...ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS",
  'aria-label="Ledger spendable shielded balances"',
  'aria-label="Unshield asset"',
  "availableLaneOptions.map",
  "formatShieldedLaneLabel(option.lane)",
  "spendableShieldNotesByLane",
]) {
  assert.ok(
    unshieldPageSource.includes(marker),
    `Unshield must preserve all shield-family visibility marker: ${marker}.`,
  );
}

const dashboardSummarySource = readRepoFile("src/solana/useVantaPositionSummary.ts");
const dashboardSource = readRepoFile("src/pages/AppDashboardPage.tsx");
for (const marker of [
  "shieldedTokenPositions",
  "shieldRegistry.entries",
  "spendableShieldNotes.length",
]) {
  assert.ok(
    dashboardSummarySource.includes(marker),
    `Dashboard summary must aggregate non-primary shielded token positions: ${marker}.`,
  );
}
for (const marker of [
  "Shielded {primaryShieldedTokenPosition.symbol}",
  "formatShieldedTokenPosition(position.balance, position.symbol)",
]) {
  assert.ok(
    dashboardSource.includes(marker),
    `Dashboard must render the active shielded token symbol instead of hard-coding USDC: ${marker}.`,
  );
}

for (const label of shieldedTokenLabels) {
  assert.ok(
    sendCapabilitySource.includes(label),
    `Send asset selector/capability must include ${label}.`,
  );
}

for (const label of allShieldedLabels) {
  assert.ok(
    swapCapabilitySource.includes(label),
    `Swap asset selector/capability must include ${label}.`,
  );
}

assert.ok(
  sendCapabilitySource.includes("Private send currently supports shielded USDC.") &&
    sendCapabilitySource.includes("unsupported-private-send-asset"),
  "Send visibility must stay truthful: non-USDC shielded token assets are visible but execution-blocked.",
);
assert.ok(
  sendCapabilitySource.includes('if (asset === "SOL")') &&
    sendCapabilitySource.includes("Shielded SOL can stay held here until the SOL send lane is implemented."),
  "Send capability must keep a defensive Shielded SOL hard-block.",
);
assert.ok(
  !sendCapabilitySource.includes("label: SHIELDED_SEND_ASSET_LABELS.SOL") &&
    !sendCapabilitySource.includes('symbol: "SOL" as const'),
  "Send asset selector must hide Shielded SOL until the SOL send lane exists.",
);
assert.ok(
  swapCapabilitySource.includes(
    "This shielded pair needs a route adapter with committed settlement evidence before it can execute.",
  ) &&
    swapCapabilitySource.includes("needs-private-route-adapter"),
  "Swap visibility must stay truthful: unsupported pairs are visible but execution-blocked.",
);

assert.equal(
  packageJson.scripts["shielded-assets:visibility-check"],
  "node scripts/check-vanta-shielded-asset-visibility.mjs",
  "package.json must expose shielded-assets:visibility-check.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes("npm run shielded-assets:visibility-check"),
  "shield:verify must include shielded-assets:visibility-check.",
);

console.log("Vanta shielded asset visibility check: PASS");
