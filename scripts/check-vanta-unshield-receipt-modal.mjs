import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/UnshieldReceiptModal.tsx");
assert.ok(existsSync(componentPath), "Shared UnshieldReceiptModal component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const productBrowserSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "import type { ReactNode }",
  "export type UnshieldReceiptModalDetails",
  "type UnshieldReceiptModalProps",
  "export function UnshieldReceiptModal",
  "data-vanta-unshield-receipt-modal",
  "unshield-receipt-modal",
  "Latest unshield receipt",
  "Verify the public exit transaction before treating funds as moved",
  "Unshield production privacy is not enabled",
  "Amount",
  "Transaction evidence",
  "Operator release",
  "Operator request",
  "Transition note",
  "Settlement scope",
  "Exit visibility",
  "View on Solscan",
]) {
  assert.ok(componentSource.includes(marker), `UnshieldReceiptModal component missing marker: ${marker}`);
}

for (const forbidden of [
  "useEffect",
  "useState",
  "navigator.clipboard",
  "requestOperatorUnshield",
  "requestOperatorSolUnshield",
  "signUnshieldIntent",
  "signSolUnshieldIntent",
  "setStatus",
  "setLastCompletion",
  "setOperatorReleaseSignature",
  "recordCanonicalUnshieldFromLiveUnshield",
  "usePrivacyFlow",
  "useWalletState",
  "useSolanaClient",
  "createPreparedUnshieldMemo",
  "createPreparedSolUnshieldMemo",
]) {
  assert.ok(
    !componentSource.includes(forbidden),
    `UnshieldReceiptModal must stay presentational and not own Unshield execution/state marker: ${forbidden}`,
  );
}

for (const marker of [
  "UnshieldReceiptModal",
  "type UnshieldReceiptModalDetails",
  "unshieldReceiptModalOpen",
  "setUnshieldReceiptModalOpen",
  "unshieldReceiptModalDetails",
  "<UnshieldReceiptModal",
  "View receipt details",
  "unshield-completion-details",
]) {
  assert.ok(unshieldPageSource.includes(marker), `UnshieldPage missing UnshieldReceiptModal marker: ${marker}`);
}

assert.ok(
  productBrowserSource.includes("[data-vanta-unshield-receipt-modal]"),
  "product UI browser check must inspect the stable UnshieldReceiptModal selector.",
);
assert.ok(
  productBrowserSource.includes("assertUnshieldReceiptModalIdleHidden"),
  "product UI browser check must keep the Unshield receipt modal idle-hidden assertion.",
);

for (const marker of [
  ".unshield-receipt-modal",
  ".unshield-receipt-modal__overlay",
  ".unshield-receipt-modal__dialog",
  ".unshield-receipt-modal__grid",
  ".unshield-receipt-modal__close",
]) {
  assert.ok(stylesSource.includes(marker), `UnshieldReceiptModal styles missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["unshield:receipt-modal-check"],
  "node scripts/check-vanta-unshield-receipt-modal.mjs",
  "package.json must expose unshield:receipt-modal-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run unshield:receipt-modal-check"),
  "truth:privacy-claim-gate must include unshield:receipt-modal-check.",
);

console.log("Vanta UnshieldReceiptModal extraction check: PASS");
