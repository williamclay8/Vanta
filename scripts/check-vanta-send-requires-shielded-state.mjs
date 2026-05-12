import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const sendPageSource = readFileSync(resolve(repoRoot, "src/pages/SendPage.tsx"), "utf8");
const sendCapabilitySource = readFileSync(
  resolve(repoRoot, "src/solana/shieldedSendCapability.ts"),
  "utf8",
);
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

const forbiddenMarkers = [
  "PendingImplicitShieldSend",
  "pendingImplicitShieldSend",
  "isImplicitShieldSendReady",
  "implicitShieldStateTransaction",
  "implicit shield",
  "You send shielded",
  "Vanta will shield the exact amount first, then send.",
  "supportedToken.send({",
  "coming soon",
  "Coming soon",
  "disabled={disabled}",
  "Configure the private-core operator endpoint before this send proof can execute.",
];

const requiredPageMarkers = [
  "Shielded balance:",
  "<span>You send</span>",
  "listShieldedSendAssetOptions",
  "getShieldedSendAssetCapability",
  'aria-label="Send shielded asset"',
  "Shield the asset first",
  "selectedSpendableNote",
  "unsupported-private-send-asset",
];

const requiredPrivateCorePrimarySendMarkers = [
  "const isPrivateCoreUsdcSendReady =",
  "selectedAsset === \"USDC\"",
  "privateCoreSendPreview?.boundary.readiness === \"ready\"",
  "!isPrivateCoreUsdcSendReady",
];

const requiredCapabilityMarkers = [
  "operator-usdc-send",
  "unsupported-private-send-asset",
  'asset === liveShieldAsset.assetKey && liveShieldAsset.configured',
  "Private send currently supports shielded USDC.",
  "Shielded USDC",
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
  'if (asset === "SOL")',
  "Shielded SOL can stay held here until the SOL send lane is implemented.",
];

const failures = [];

for (const marker of forbiddenMarkers) {
  if (sendPageSource.includes(marker)) {
    failures.push(`Send page must not contain auto-shield marker: ${marker}`);
  }
}

if (sendPageSource.includes("liveShieldAsset.unshieldConfigured")) {
  failures.push(
    "Send page must not gate private-core send proof readiness on the unshield operator endpoint.",
  );
}

for (const marker of requiredPageMarkers) {
  if (!sendPageSource.includes(marker)) {
    failures.push(`Send page missing shield-first marker: ${marker}`);
  }
}

for (const marker of requiredPrivateCorePrimarySendMarkers) {
  if (!sendPageSource.includes(marker)) {
    failures.push(`Send page missing primary private-core send marker: ${marker}`);
  }
}

const handleSendMatch = sendPageSource.match(
  /async function handleSend\(\) \{[\s\S]*?\n  \}/,
);

if (!handleSendMatch) {
  failures.push("Send page must expose handleSend for the primary Send action.");
} else if (
  !handleSendMatch[0].includes("privateCoreSendPreview") &&
  !handleSendMatch[0].includes("handlePrivateCoreSendProof")
) {
  failures.push(
    "Primary handleSend must route supported USDC sends through the private-core send path.",
  );
}

for (const marker of requiredCapabilityMarkers) {
  if (!sendCapabilitySource.includes(marker)) {
    failures.push(`shieldedSendCapability.ts missing marker: ${marker}`);
  }
}

if (sendPageSource.includes("needs-private-send-adapter")) {
  failures.push("Send page must not expose adapter-backlog wording for unsupported assets.");
}

if (sendCapabilitySource.includes("private send adapter")) {
  failures.push("Send capability blockers must describe supported lanes, not missing adapters.");
}

if (!sendCapabilitySource.includes("Private send currently supports shielded USDC.")) {
  failures.push("Send capability blockers must name shielded USDC as the supported private send lane.");
}

if (
  sendCapabilitySource.includes("label: SHIELDED_SEND_ASSET_LABELS.SOL") ||
  sendCapabilitySource.includes('symbol: "SOL" as const')
) {
  failures.push("Send asset selector must hide Shielded SOL until the SOL send lane exists.");
}

if (!packageSource.includes('"send:requires-shielded-state-check"')) {
  failures.push("package.json must expose send:requires-shielded-state-check.");
}

if (failures.length > 0) {
  console.error("Vanta send shield-first check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta send shield-first check: PASS");
