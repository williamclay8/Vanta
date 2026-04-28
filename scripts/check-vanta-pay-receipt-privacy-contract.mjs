import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function sourceOf(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${path}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function requireMarkers(path, markers) {
  const source = sourceOf(path);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${path}`);
    }
  }
  return source;
}

const typesSource = requireMarkers("src/pay/vantaPayTypes.ts", [
  "VantaPayReceiptPacketAudience",
  "VantaPayReceiptPacketFieldVisibility",
  "VantaPayReceiptPrivacyContract",
  "merchant_internal",
  "buyer_shareable",
  "operator_verification",
  "selective_disclosure",
]);

const contractSource = requireMarkers("src/pay/vantaPayReceiptPrivacyContract.ts", [
  "VANTA_PAY_RECEIPT_PRIVACY_CONTRACT_VERSION",
  "vanta-pay-receipt-privacy-contract-0.1",
  "getVantaPayReceiptPrivacyContract",
  "receipt-backed test settlement",
  "production privacy claims remain locked",
  "fully_private_pay_claim: false",
]);

const payPageSource = requireMarkers("src/pages/PayPage.tsx", [
  "Receipt packet",
  "Visible to merchant",
  "Visible to buyer",
  "Kept private",
  "Verified by",
  "Receipt packet ready",
  "Proof receipt ID",
  "Production privacy claims remain locked.",
]);

for (const banned of [
  "Fully private Pay",
  "Anonymous payments",
  "Untraceable settlement",
  "Production-ready private checkout",
  "Live mainnet private payment",
]) {
  if (payPageSource.includes(banned) || contractSource.includes(banned) || typesSource.includes(banned)) {
    failures.push(`Banned Pay privacy claim found: ${banned}`);
  }
}

if (failures.length > 0) {
  console.error("Vanta Pay receipt privacy contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay receipt privacy contract check: PASS");
