import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const appLayout = read("src/components/AppLayout.tsx");
const walletContext = read("src/data/context/WalletContext.tsx");
const styles = read("src/styles.css");
const mobileBrowserCheck = read("scripts/check-vanta-mobile-browser.mjs");
const freshWalletBrowserCheck = read("scripts/check-vanta-fresh-wallet-browser.mjs");
const payBrowserCheck = read("scripts/check-vanta-pay-browser.mjs");

const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

function requireMatches(source, pattern, message) {
  if (!pattern.test(source)) {
    failures.push(message);
  }
}

requireIncludes(
  walletContext,
  "walletConnectors: connectors",
  "Wallet context must expose every discovered Wallet Standard connector.",
);
requireIncludes(
  walletContext,
  "fetchWalletLamportsFallback",
  "Wallet context must include an explicit RPC fallback for native SOL balance recovery.",
);
requireIncludes(
  walletContext,
  "fallbackLamportsValue",
  "Wallet context must use fallback lamports when the wallet balance hook has not hydrated.",
);
requireIncludes(
  walletContext,
  "fallbackBalanceFetching && shouldVerifyHookZeroBalance ? null : hookLamportsValue",
  "Wallet context must hide provisional hook zero while fallback balance recovery is still checking browser-readable endpoints.",
);
requireIncludes(
  walletContext,
  "hookLamportsValue !== null && hookLamportsValue > 0n",
  "Wallet context must only trust a hook balance immediately when it is positive.",
);
requireIncludes(
  walletContext,
  "solBalanceFetching",
  "Wallet context must expose native SOL balance fetching state so Shield does not present provisional hook zero as final.",
);
requireIncludes(
  walletContext,
  "solBalanceError",
  "Wallet context must expose native SOL balance recovery errors so Shield can block actions with honest RPC recovery copy.",
);
requireIncludes(
  walletContext,
  "new Connection(fallbackEndpoint, \"confirmed\")",
  "Wallet context SOL balance fallback must use the configured Solana endpoint.",
);
requireIncludes(
  walletContext,
  "getConfiguredWalletBalanceReadEndpoints",
  "Wallet context SOL balance fallback must use the configurable browser read-RPC endpoint list.",
);
requireIncludes(
  walletContext,
  'const MAINNET_WALLET_BALANCE_READ_ENDPOINT = "https://solana-rpc.publicnode.com"',
  "Wallet context SOL balance fallback must include a browser-accessible public mainnet RPC endpoint.",
);
requireIncludes(
  walletContext,
  'MAINNET_WALLET_BALANCE_READ_ENDPOINT]',
  "Wallet context SOL balance fallback must recover a mainnet public SOL balance even when another endpoint reports zero first.",
);
requireIncludes(
  walletContext,
  "if (nextBalance > 0n)",
  "Wallet context SOL balance fallback must not stop on a provisional zero from the wrong cluster.",
);
requireIncludes(
  walletContext,
  "firstZeroBalance ??= nextBalance",
  "Wallet context SOL balance fallback must still return zero when every readable endpoint reports zero.",
);
requireIncludes(
  walletContext,
  "VITE_SOLANA_READ_RPC_FALLBACK_URLS",
  "Wallet context SOL balance fallback must honor configured read-RPC fallback endpoints.",
);
if (
  /getConfiguredWalletBalanceReadEndpoints[\s\S]*?https:\/\/api\.mainnet-beta\.solana\.com/u.test(
    walletContext,
  )
) {
  failures.push(
    "Wallet context SOL balance fallback must not depend on api.mainnet-beta.solana.com because it returns 403 from the production browser origin.",
  );
}
requireIncludes(
  walletContext,
  "const defaults = [MAINNET_WALLET_BALANCE_READ_ENDPOINT]",
  "Wallet context SOL balance fallback must choose mainnet read endpoints while recovering mainnet balances.",
);
requireIncludes(
  appLayout,
  "sortedWalletConnectors.map",
  "App layout must render every discovered wallet connector, not only the preferred wallet.",
);
requireIncludes(
  appLayout,
  "const [walletConnectionError, setWalletConnectionError]",
  "Wallet picker must retain visible feedback when a wallet connection fails.",
);
requireIncludes(
  appLayout,
  "setWalletConnectionError(null);",
  "Wallet picker must clear stale wallet connection errors before a new attempt.",
);
requireIncludes(
  appLayout,
  "Wallet connection failed.",
  "Wallet picker must show a compact connection failure message instead of silently closing.",
);
requireIncludes(
  appLayout,
  "wallet-picker__connection-error",
  "Wallet picker must render failed connection feedback in the menu.",
);
requireIncludes(
  appLayout,
  "Use a fresh wallet for the strongest privacy.",
  "Wallet picker must tell users to use a fresh wallet for strongest privacy.",
);
requireIncludes(
  appLayout,
  "Detected wallets",
  "Wallet picker must label the detected wallet list.",
);
requireIncludes(
  appLayout,
  "Standard wallet discovery",
  "Wallet picker must describe wallet-standard discovery with product-copy casing.",
);
requireIncludes(
  appLayout,
  "Safari cannot connect Phantom directly.",
  "Wallet picker must show Safari-safe wallet guidance that does not mislabel desktop Safari as mobile Safari.",
);
requireIncludes(
  appLayout,
  "app-header__account-trigger",
  "Header must use one compact account trigger instead of separate wallet action buttons.",
);
requireIncludes(
  appLayout,
  "Switch wallet",
  "Connected wallet switching must live inside the account menu.",
);
requireIncludes(
  appLayout,
  "wallet-picker__scrim",
  "Wallet menu must render a scrim layer so it sits above page cards.",
);
requireIncludes(
  appLayout,
  "No wallet funds detected",
  "Wallet picker must explain when no usable wallet funds are detected.",
);
requireIncludes(
  appLayout,
  "Connect, create a fresh wallet, or top up with Peer on desktop.",
  "Wallet picker must keep the canonical funding-recovery body copy.",
);
requireIncludes(
  appLayout,
  "Top up with Peer",
  "Wallet picker must expose the contextual Peer top-up recovery action.",
);
requireIncludes(
  appLayout,
  "getPeerOnrampAvailability({",
  "Task 3 must derive the funding gate from Peer onramp availability.",
);
requireIncludes(
  appLayout,
  'const peerFundingNeedsWallet = peerOnrampAvailability === "needs_wallet";',
  "Task 3 must keep an explicit no-wallet funding branch.",
);
requireIncludes(
  appLayout,
  'const peerFundingNeedsTopUp =',
  "Task 3 must keep an explicit available-without-usable-balance funding branch.",
);
requireIncludes(
  appLayout,
  'peerOnrampAvailability === "available" && !hasUsableBalance',
  "Task 3 must only show the funding block for available wallets that still lack usable balance.",
);
requireIncludes(
  appLayout,
  "walletPublicAssetsError === null",
  "Task 3 must fail closed when wallet public-asset state is unknown.",
);
requireIncludes(
  appLayout,
  "const peerLaunchDisabled =",
  "Wallet picker must derive a dedicated Peer CTA disabled state.",
);
requireIncludes(
  appLayout,
  "disabled={peerLaunchDisabled}",
  "Wallet picker must bind the Peer CTA disabled state to the derived launch guard.",
);
requireIncludes(
  appLayout,
  "onClick={handlePeerLaunch}",
  "Wallet picker must route the Peer CTA through explicit launch handling.",
);
requireIncludes(
  appLayout,
  "const peerLaunchFeedback =",
  "Wallet picker must derive compact Peer launch feedback for inline status rendering.",
);
for (const stagedMessage of [
  "Opening Peer...",
  "Install the Peer extension, then try again.",
  "Connect Peer to this browser, then try again.",
  "Peer opened. Complete the funding step there.",
  "Peer intent submitted. Bridge transfer pending.",
  "Peer intent submitted.",
  "Peer could not open. Try again.",
  "Track transfer",
]) {
  requireIncludes(
    appLayout,
    stagedMessage,
    `Wallet picker must preserve the staged Peer funding message: ${stagedMessage}`,
  );
}
requireIncludes(
  appLayout,
  '<span>Peer funding</span>',
  "Wallet picker must label the inline Peer funding status surface.",
);
requireMatches(
  appLayout,
  /\{showPeerFundingBlock && \(\s*<div className="wallet-picker__section">[\s\S]*?No wallet funds detected[\s\S]*?Top up with Peer[\s\S]*?<\/div>\s*\)\}/u,
  "Task 3 must render the Peer funding block only behind the showPeerFundingBlock conditional.",
);
requireIncludes(
  styles,
  "z-index: 120",
  "Wallet menu must layer above app cards with a high z-index.",
);
requireIncludes(
  styles,
  ".app-header {\n  position: relative;\n  z-index: 90;",
  "App header stacking context must sit above app content so the wallet menu cannot render behind cards.",
);
requireIncludes(
  styles,
  ".app-header__account-trigger",
  "Compact account trigger styles must be present.",
);
requireIncludes(
  styles,
  ".wallet-picker",
  "Wallet picker styles must be present.",
);
requireIncludes(
  styles,
  "max-height: min(620px, calc(100vh - 112px));",
  "Wallet picker must stay within the viewport when many wallets are detected.",
);
requireIncludes(
  styles,
  "overflow-y: auto;",
  "Wallet picker must scroll vertically when its contents exceed the viewport.",
);
requireIncludes(
  styles,
  "overscroll-behavior: contain;",
  "Wallet picker scroll must be contained so the page behind it does not fight the menu.",
);
requireIncludes(
  mobileBrowserCheck,
  '{ kind: "text_hidden", text: "Top up with Peer" }',
  "Mobile browser check must assert that Peer top-up stays hidden on unsupported mobile flows.",
);
requireIncludes(
  mobileBrowserCheck,
  '{ kind: "text_hidden", text: "No wallet funds detected" }',
  "Mobile browser check must assert that Peer funding copy stays hidden on unsupported mobile flows.",
);
requireIncludes(
  mobileBrowserCheck,
  'VITE_VANTA_ENABLE_PEER_ONRAMP: "true"',
  "Mobile browser check must enable the Peer feature so the mobile-hidden assertion exercises unsupported-surface gating.",
);
requireIncludes(
  mobileBrowserCheck,
  'VITE_VANTA_ENABLE_LIVE_PEER_FUNDING: "true"',
  "Mobile browser check must allow live funding so the mobile-hidden assertion exercises unsupported-surface gating instead of beta suppression.",
);
requireIncludes(
  freshWalletBrowserCheck,
  'VITE_VANTA_DEPLOYMENT_MODE: "beta"',
  "Fresh wallet browser check must run in beta mode to verify the default banner truth.",
);
requireIncludes(
  freshWalletBrowserCheck,
  '{ kind: "text_hidden", text: "Top up with Peer" }',
  "Fresh wallet browser check must assert that Peer top-up stays hidden by default in beta mode.",
);
requireIncludes(
  payBrowserCheck,
  '{ kind: "text_hidden", text: "Top up with Peer" }',
  "Pay browser check must assert that Peer top-up stays hidden by default in beta mode.",
);
requireIncludes(
  payBrowserCheck,
  ".app-header__account-trigger",
  "Pay browser check must exercise the shared wallet menu surface after the wallet-picker Peer changes.",
);

if (appLayout.includes(">Connect another wallet<")) {
  failures.push("Connected state must not render a separate header Connect another wallet button.");
}

for (const banned of ["Privy", "private key", "seed phrase"]) {
  if (appLayout.includes(banned)) {
    failures.push(`Wallet picker must not introduce ${banned} language.`);
  }
}

if (failures.length > 0) {
  console.error("vanta wallet picker check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("vanta wallet picker check: PASS");
