import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const appLayout = read("src/components/AppLayout.tsx");
const walletContext = read("src/data/context/WalletContext.tsx");
const styles = read("src/styles.css");

const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

requireIncludes(
  walletContext,
  "walletConnectors: connectors",
  "Wallet context must expose every discovered Wallet Standard connector.",
);
requireIncludes(
  appLayout,
  "sortedWalletConnectors.map",
  "App layout must render every discovered wallet connector, not only the preferred wallet.",
);
requireIncludes(
  appLayout,
  "Use a fresh wallet for strongest privacy",
  "Wallet picker must tell users to use a fresh wallet for strongest privacy.",
);
requireIncludes(
  appLayout,
  "Detected wallets",
  "Wallet picker must label the detected wallet list.",
);
requireIncludes(
  appLayout,
  "Wallet Standard",
  "Wallet picker must describe wallet-standard discovery.",
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
