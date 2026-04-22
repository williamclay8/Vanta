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
  "Connect another wallet",
  "Connected state must let users connect another wallet.",
);
requireIncludes(
  styles,
  ".wallet-picker",
  "Wallet picker styles must be present.",
);

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
