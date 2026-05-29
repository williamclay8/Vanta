import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/TransactionStatusToast.tsx");
assert.ok(existsSync(componentPath), "Shared TransactionStatusToast component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const stylesSource = readRepoFile("src/styles.css");
const productBrowserSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type TransactionStatusTone",
  "export type TransactionStatusPhase",
  "export function TransactionStatusToast",
  "type TransactionStatusToastProps",
  "transaction-status-toast",
  "transaction-status-toast__header",
  "transaction-status-toast__message",
  "transaction-status-toast__progress",
  "transactionStatusTone",
  "autoDismissMs",
  "floating",
  "aria-live",
  "role={alertLike ? \"alert\" : \"status\"}",
]) {
  assert.ok(componentSource.includes(marker), `TransactionStatusToast component missing marker: ${marker}`);
}

for (const [pageName, pagePath, requiredPhrases] of [
  [
    "ShieldPage",
    "src/pages/ShieldPage.tsx",
    [
      "import { TransactionStatusToast",
      "<TransactionStatusToast",
      "Shield proof receipt verified",
      "Shield deposit recorded",
      "SOL recovery recorded",
      "Vault transfer approval",
    ],
  ],
  [
    "SendPage",
    "src/pages/SendPage.tsx",
    [
      "import { TransactionStatusToast",
      "<TransactionStatusToast",
      "Awaiting wallet confirmation",
      "Send in progress",
      "Updating your private balance",
      "Send complete",
    ],
  ],
  [
    "SwapPage",
    "src/pages/SwapPage.tsx",
    [
      "import { TransactionStatusToast",
      "<TransactionStatusToast",
      "Recording swap transition",
      "Authorizing swap",
      "Finalizing beta route evidence",
      "Swap recorded",
    ],
  ],
  [
    "UnshieldPage",
    "src/pages/UnshieldPage.tsx",
    [
      "import { TransactionStatusToast",
      "<TransactionStatusToast",
      "Preparing wallet approval",
      "Ready for operator release",
      "Authorizing public release",
      "public operator release reported",
    ],
  ],
  [
    "PayPage",
    "src/pages/PayPage.tsx",
    [
      "import { TransactionStatusToast",
      "<TransactionStatusToast",
      "Transaction status",
      "Payment record completed",
      "Local test settlement complete.",
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
    assert.ok(pageSource.includes(phrase), `${pageName} missing shared TransactionStatusToast marker: ${phrase}`);
  }
}

for (const marker of [
  ".transaction-status-toast",
  ".transaction-status-toast::before",
  ".transaction-status-toast__header",
  ".transaction-status-toast__message",
  ".transaction-status-toast__details",
  ".transaction-status-toast__progress",
  ".transaction-status-toast--processing",
  ".transaction-status-toast--success",
  ".transaction-status-toast--error",
  ".transaction-status-toast--floating",
  "env(safe-area-inset-bottom)",
  "@keyframes transaction-status-toast-enter",
  "overflow-wrap: anywhere",
  "font-variant-numeric: tabular-nums",
]) {
  assert.ok(stylesSource.includes(marker), `TransactionStatusToast styles missing ${marker}.`);
}

assert.ok(
  productBrowserSource.includes("assertPayTransactionStatusToast"),
  "product UI browser check must include a Pay TransactionStatusToast assertion.",
);
assert.ok(
  productBrowserSource.includes(".transaction-status-toast"),
  "product UI browser check must inspect the shared transaction status toast.",
);

assert.equal(
  packageJson.scripts["transactions:status-toast-check"],
  "node scripts/check-vanta-transaction-status-toast.mjs",
  "package.json must expose transactions:status-toast-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run transactions:status-toast-check"),
  "truth:privacy-claim-gate must include transactions:status-toast-check.",
);

console.log("Vanta TransactionStatusToast extraction check: PASS");
