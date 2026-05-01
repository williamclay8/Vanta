import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const registrySource = readRepoFile("src/solana/useVantaShieldAssetRegistryState.ts");
const recentTokenNotesSource = readRepoFile("src/solana/recentShieldTokenNotes.ts");
const shieldConfigSource = readRepoFile("src/solana/shieldConfig.ts");
const shieldPageSource = readRepoFile("src/pages/ShieldPage.tsx");
const shieldStateSource = readRepoFile("src/solana/vantaShieldState.ts");
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const sendCapabilitySource = readRepoFile("src/solana/shieldedSendCapability.ts");
const swapCapabilitySource = readRepoFile("src/solana/shieldedSwapCapability.ts");
const packageJson = JSON.parse(readRepoFile("package.json"));

const directShieldSymbols = ["USDC", "JTO", "BONK", "JUP", "PYUSD", "WIF", "KMNO"];
const allShieldedLabels = [
  "Shielded USDC",
  "Shielded JTO",
  "Shielded BONK",
  "Shielded JUP",
  "Shielded PYUSD",
  "Shielded WIF",
  "Shielded KMNO",
  "Shielded SOL",
];

for (const marker of [
  "usePrivacyFlow",
  "recentShield",
  "loadRecentShieldTokenNotes",
  "mergeRecentShieldTokenAccount",
  "createRecentShieldTokenNote",
  "isRecentShieldTokenContext",
  "spendableShieldNotes",
  "noteStatusSummary",
]) {
  assert.ok(
    registrySource.includes(marker),
    `Shield asset registry must preserve optimistic recent-token visibility marker: ${marker}.`,
  );
}

for (const marker of [
  "vanta.recentShieldTokenNotes.v1",
  "recordRecentShieldTokenNote",
  "loadRecentShieldTokenNotes",
  "VantaShieldNote",
]) {
  assert.ok(
    recentTokenNotesSource.includes(marker),
    `Recent token shield notes must persist locally while encrypted memo recovery catches up: ${marker}.`,
  );
}

for (const marker of [
  "const recentShieldContext =",
  "setRecentShield(recentShieldContext)",
  "recordRecentShieldTokenNote",
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
    registrySource.includes(`getLiveShieldTokenAsset("${symbol}")`),
    `${symbol} must have a registry entry that can merge recent local shield notes.`,
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

for (const symbol of directShieldSymbols) {
  assert.ok(
    registrySource.includes(`asset: ${symbol.toLowerCase()}Asset`) ||
      registrySource.includes(`asset: ${symbol === "USDC" ? "usdc" : symbol.toLowerCase()}Asset`),
    `${symbol} registry entry must pass through recent Shield note merge.`,
  );
  assert.ok(
    registrySource.includes(`assetKey: "${symbol}"`) ||
      registrySource.includes(`getLiveShieldTokenAsset("${symbol}")`),
    `${symbol} must stay in the direct Shield asset registry.`,
  );
}

for (const marker of [
  "ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS",
  "...ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS",
  'aria-label="Available shielded balances"',
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

for (const label of allShieldedLabels) {
  assert.ok(
    sendCapabilitySource.includes(label),
    `Send asset selector/capability must include ${label}.`,
  );
  assert.ok(
    swapCapabilitySource.includes(label),
    `Swap asset selector/capability must include ${label}.`,
  );
}

assert.ok(
  sendCapabilitySource.includes("Private send currently supports shielded USDC.") &&
    sendCapabilitySource.includes("unsupported-private-send-asset"),
  "Send visibility must stay truthful: non-USDC shielded assets are visible but execution-blocked.",
);
assert.ok(
  swapCapabilitySource.includes("This shielded pair needs a private route adapter before it can execute.") &&
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
