import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const hookSource = readFileSync(
  resolve(repoRoot, "src/solana/useVantaShieldViewingKey.ts"),
  "utf8",
);
const shieldPageSource = readFileSync(
  resolve(repoRoot, "src/pages/ShieldPage.tsx"),
  "utf8",
);
const styleSource = readFileSync(resolve(repoRoot, "src/styles.css"), "utf8");

const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

requireIncludes(
  hookSource,
  "exportText: string;",
  "Viewing-key hook must expose export text for user backup.",
);
requireIncludes(
  hookSource,
  "importText: (serializedKeypair: string) => void;",
  "Viewing-key hook must expose import/restore.",
);
requireIncludes(
  hookSource,
  "reset: () => void;",
  "Viewing-key hook must expose rotation/reset.",
);
requireIncludes(
  hookSource,
  "window.localStorage.setItem",
  "Viewing-key import/reset must persist to the per-wallet local key slot.",
);
requireIncludes(
  hookSource,
  "storageKeyForOwner(walletAddress)",
  "Viewing-key import/reset must use the per-wallet local key slot.",
);
requireIncludes(
  hookSource,
  "parseViewingKeypair(serializedKeypair)",
  "Viewing-key import must validate the pasted keypair before storing it.",
);

requireIncludes(
  shieldPageSource,
  'className="shield-viewing-key-panel"',
  "ShieldPage must render a viewing-key custody panel.",
);
requireIncludes(
  shieldPageSource,
  "Advanced shield settings",
  "ShieldPage must put recovery and route power controls behind Advanced shield settings.",
);
requireIncludes(
  shieldPageSource,
  "Viewing key backup",
  "ShieldPage advanced settings must expose viewing-key backup status.",
);
requireIncludes(
  shieldPageSource,
  "Decoy batch",
  "ShieldPage advanced settings must expose decoy-batch status.",
);
requireIncludes(
  shieldPageSource,
  "Custom route",
  "ShieldPage advanced settings must expose custom-route status.",
);
requireIncludes(
  shieldPageSource,
  "setViewingKeyBackupText(viewingKey.exportText);",
  "ShieldPage must let users export a viewing-key backup.",
);
requireIncludes(
  shieldPageSource,
  "viewingKey.importText(viewingKeyImportText);",
  "ShieldPage must let users restore an exported viewing key.",
);
requireIncludes(
  shieldPageSource,
  "viewingKey.reset();",
  "ShieldPage must let users rotate the local viewing key.",
);
requireIncludes(
  styleSource,
  ".shield-viewing-key-panel",
  "Viewing-key custody panel must have a stable styled container.",
);
requireIncludes(
  styleSource,
  ".shield-advanced-summary-grid",
  "Advanced Shield settings status grid must have a stable styled container.",
);

if (failures.length > 0) {
  console.error("vanta shield viewing-key custody: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("vanta shield viewing-key custody: PASS");
