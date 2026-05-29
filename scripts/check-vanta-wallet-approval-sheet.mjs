import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/WalletApprovalSheet.tsx");
assert.ok(existsSync(componentPath), "Shared WalletApprovalSheet component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type WalletApprovalSheetRow",
  "export function WalletApprovalSheet",
  "type WalletApprovalSheetProps",
  "wallet-approval-sheet",
  "aria-label={ariaLabel}",
  "rows.slice(0, maxRows)",
  "walletApprovalSheetRows",
  "wallet-approval-sheet__row",
]) {
  assert.ok(componentSource.includes(marker), `WalletApprovalSheet component missing marker: ${marker}`);
}

for (const [pageName, pagePath, requiredPhrases] of [
  [
    "ShieldPage",
    "src/pages/ShieldPage.tsx",
    [
      "import { WalletApprovalSheet",
      "<WalletApprovalSheet",
      "Vault transfer approval",
      "createUmbraShieldActionApprovalReview",
      "shield-spl-token-transfer",
      "shield-native-sol",
      "shield-state-memo",
    ],
  ],
  [
    "SendPage",
    "src/pages/SendPage.tsx",
    [
      "import { WalletApprovalSheet",
      "<WalletApprovalSheet",
      "Send wallet approval",
      "Send privately from shielded balance",
      "send-note-transition",
      "send-spent-marker",
    ],
  ],
  [
    "SwapPage",
    "src/pages/SwapPage.tsx",
    [
      "import { WalletApprovalSheet",
      "<WalletApprovalSheet",
      "Swap wallet approval",
      "operator-visible route settlement",
      "swap-transition",
      "swap-spent-marker",
    ],
  ],
  [
    "UnshieldPage",
    "src/pages/UnshieldPage.tsx",
    [
      "import { WalletApprovalSheet",
      "<WalletApprovalSheet",
      "Private rail approval",
      "createUmbraUnshieldActionApprovalReview",
      "unshield-split-transition",
      "Release through operator",
    ],
  ],
]) {
  const pageSource =
    pageName === "SendPage"
      ? `${readRepoFile("src/pages/SendPage.tsx")}\n${readRepoFile("src/components/SendWorkspaceCard.tsx")}`
      : pageName === "ShieldPage"
        ? `${readRepoFile("src/pages/ShieldPage.tsx")}\n${readRepoFile("src/components/ShieldWorkspaceCard.tsx")}`
        : pageName === "UnshieldPage"
          ? `${readRepoFile("src/pages/UnshieldPage.tsx")}\n${readRepoFile("src/components/UnshieldWorkspaceCard.tsx")}`
          : pageName === "SwapPage"
            ? `${readRepoFile("src/pages/SwapPage.tsx")}\n${readRepoFile("src/components/SwapWorkspaceCard.tsx")}`
            : readRepoFile(pagePath);

  for (const phrase of requiredPhrases) {
    assert.ok(pageSource.includes(phrase), `${pageName} missing shared WalletApprovalSheet marker: ${phrase}`);
  }

  assert.ok(
    !pageSource.includes('<details className="shield-approval-review"'),
    `${pageName} must not keep legacy inline wallet approval details.`,
  );
  assert.ok(
    !pageSource.includes('className="shield-approval-review__rows"'),
    `${pageName} must not keep legacy inline wallet approval rows.`,
  );
}

for (const marker of [
  ".wallet-approval-sheet",
  ".wallet-approval-sheet__header",
  ".wallet-approval-sheet__mode",
  ".wallet-approval-sheet__rows",
  ".wallet-approval-sheet__row",
  ".wallet-approval-sheet__note",
  ".wallet-approval-sheet__truth",
  "overflow-wrap: anywhere",
  "font-variant-numeric: tabular-nums",
]) {
  assert.ok(stylesSource.includes(marker), `Shared WalletApprovalSheet styles missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["wallet:approval-sheet-check"],
  "node scripts/check-vanta-wallet-approval-sheet.mjs",
  "package.json must expose wallet:approval-sheet-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run wallet:approval-sheet-check"),
  "truth:privacy-claim-gate must include wallet:approval-sheet-check.",
);

console.log("Vanta WalletApprovalSheet extraction check: PASS");
