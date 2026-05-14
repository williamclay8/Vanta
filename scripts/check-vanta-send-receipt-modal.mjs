import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/SendReceiptModal.tsx");
assert.ok(existsSync(componentPath), "Shared SendReceiptModal component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const sendPageSource = readRepoFile("src/pages/SendPage.tsx");
const productBrowserSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "import type { ReactNode }",
  "export type SendReceiptModalDetails",
  "type SendReceiptModalProps",
  "export function SendReceiptModal",
  "data-vanta-send-receipt-modal",
  "send-receipt-modal",
  "Latest send receipt",
  "This receipt summarizes local send evidence",
  "operator-visible proof status",
  "Production privacy is not enabled for Send",
  "live private settlement",
  "Recipient",
  "Amount",
  "Residual note",
  "Send note",
  "Spent marker",
  "Proof status",
  "Release package",
]) {
  assert.ok(componentSource.includes(marker), `SendReceiptModal component missing marker: ${marker}`);
}

for (const forbidden of [
  "useEffect",
  "useState",
  "navigator.clipboard",
  "runPrivateCoreSendTransition",
  "previewPrivateCoreSendTransition",
  "createPreparedSendMemo",
  "useVantaSafeSendTransaction",
  "setStatus",
  "setLastRecipient",
  "setLastSentAmount",
  "recordCanonicalSendFromLiveSend",
  "usePrivacyFlow",
  "useWalletState",
  "useSolanaClient",
]) {
  assert.ok(
    !componentSource.includes(forbidden),
    `SendReceiptModal must stay presentational and not own Send execution/state marker: ${forbidden}`,
  );
}

for (const marker of [
  "SendReceiptModal",
  "type SendReceiptModalDetails",
  "sendReceiptModalOpen",
  "setSendReceiptModalOpen",
  "sendReceiptModalDetails",
  "<SendReceiptModal",
  "View send receipt",
  "send-completion-details",
  "privateCoreSendExecution.status === \"verified\"",
  "privateCoreSendState",
]) {
  assert.ok(sendPageSource.includes(marker), `SendPage missing SendReceiptModal marker: ${marker}`);
}

assert.ok(
  productBrowserSource.includes("[data-vanta-send-receipt-modal]"),
  "product UI browser check must inspect the stable SendReceiptModal selector.",
);
assert.ok(
  productBrowserSource.includes("assertSendReceiptModalIdleHidden"),
  "product UI browser check must keep the Send receipt modal idle-hidden assertion.",
);

for (const marker of [
  ".send-receipt-modal",
  ".send-receipt-modal__overlay",
  ".send-receipt-modal__dialog",
  ".send-receipt-modal__grid",
  ".send-receipt-modal__close",
]) {
  assert.ok(stylesSource.includes(marker), `SendReceiptModal styles missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["send:receipt-modal-check"],
  "node scripts/check-vanta-send-receipt-modal.mjs",
  "package.json must expose send:receipt-modal-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run send:receipt-modal-check"),
  "truth:privacy-claim-gate must include send:receipt-modal-check.",
);

console.log("Vanta SendReceiptModal extraction check: PASS");
