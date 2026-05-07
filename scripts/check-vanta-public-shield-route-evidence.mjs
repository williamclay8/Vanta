import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const publicSwapRouteSource = readFileSync(resolve(repoRoot, "src/solana/publicSwapRoute.ts"), "utf8");
const shieldPageSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");
const protocolSettlementClientSource = readFileSync(
  resolve(repoRoot, "src/privacy/privatePoolV2ProtocolSettlementClient.ts"),
  "utf8",
);

const requiredMarkers = [
  "createPublicShieldRouteEvidence",
  "provider: args.quote.venueName === \"Jupiter\" ? \"jupiter\" : \"meteora\"",
  "routeSignature",
  "sourceAmount: args.quote.inputAmount",
  "sourceAsset: args.quote.inputAssetSymbol",
  "sourceMintAddress: args.quote.inputMint",
  "targetAmount",
  "targetAsset: args.quote.outputAsset",
  "targetMintAddress: args.quote.outputMint",
  "requestVantaPrivatePoolV2BrowserShieldReceipt",
  "routeEvidence: pendingProtocolSettlement.routeEvidence",
  "selectUniversalShieldTarget",
];

const requiredShieldCompletionMarkers = [
  "requestVantaPrivatePoolV2BrowserShieldReceipt(committedSettlement)",
  "Private Pool v2 Shield receipt was not returned.",
  "protocolSettlement.protocolSettlementReceipt.settlementId !== committedRequest.settlementId",
  "protocolSettlement.protocolSettlementReceipt.action !== \"shield\"",
  "protocolSettlement.proofReceipt?.intent !== \"shield\"",
  "protocolSettlement.protocolSettlementReceipt.economicsMode !== \"committed-economics\"",
  "committedRequest.economicsCommitment",
  "committedRequest.settlementCommitment",
  "createVantaShieldCommittedEconomicsSettlement",
  "runShieldWithDecoys",
  "signature: activeStateSignature",
  "const receiptVerified = !protocolSettlementWarning",
  "protocolSettlementReceipt: receiptVerified",
  "protocolSettlement?.protocolSettlementReceipt",
  "proofReceipt: receiptVerified",
  "protocolSettlement?.proofReceipt",
];

const requiredPublicRouteConfirmationRecoveryMarkers = [
  "publicRouteWait.waitStatus !== \"error\"",
  "isSolanaRpcRateLimitError(publicRouteWait.waitError)",
  "isSolanaRpcHttpAccessError(publicRouteWait.waitError)",
];

const requiredBrowserReceiptClientMarkers = [
  "getBrowserPrivatePoolReceiptApiFallbackUrl",
  "window.location.hostname",
  "vantaprivacy.xyz",
  "onrender.com",
  "VANTA_PRODUCTION_PRIVATE_POOL_V2_RECEIPT_API_URL",
  "Hosted Vanta Shield builds must have a Private Pool v2 receipt API URL.",
];

const failures = [];

for (const marker of requiredMarkers) {
  if (!publicSwapRouteSource.includes(marker) && !shieldPageSource.includes(marker)) {
    failures.push(`Missing public shield route evidence marker: ${marker}`);
  }
}

for (const marker of requiredShieldCompletionMarkers) {
  if (!shieldPageSource.includes(marker)) {
    failures.push(`Missing Shield completion receipt-binding marker: ${marker}`);
  }
}

for (const marker of requiredPublicRouteConfirmationRecoveryMarkers) {
  if (!shieldPageSource.includes(marker)) {
    failures.push(`Missing recoverable public-route confirmation marker: ${marker}`);
  }
}

for (const marker of requiredBrowserReceiptClientMarkers) {
  if (!protocolSettlementClientSource.includes(marker)) {
    failures.push(`Missing browser Shield receipt API fallback marker: ${marker}`);
  }
}

if (
  shieldPageSource.includes("void requestVantaPrivatePoolV2ProtocolSettlement") ||
  shieldPageSource.includes("void requestVantaPrivatePoolV2BrowserShieldReceipt")
) {
  failures.push("Shield completion must not fire-and-forget the Private Pool v2 settlement request.");
}

if (shieldPageSource.includes(".catch(() => null)")) {
  failures.push("Shield completion must not swallow Private Pool v2 settlement receipt failures.");
}

if (failures.length > 0) {
  console.error("Vanta public shield route evidence check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta public shield route evidence check: PASS");
