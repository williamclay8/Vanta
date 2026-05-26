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

const bannedClaimMarkers = [
  "fully private",
  "anonymous",
  "untraceable",
  "production-ready private",
  "production-ready",
  "mainnet-ready private",
  "mainnet-ready",
];

function checkBannedClaims(path, source) {
  const normalizedSource = source.toLocaleLowerCase("en-US");

  for (const banned of bannedClaimMarkers) {
    if (normalizedSource.includes(banned)) {
      failures.push(`Banned lane trust claim found in ${path}: ${banned}`);
    }
  }
}

const laneContracts = [
  {
    claim: "fullyPrivateShieldClaim: false",
    getter: "getShieldTrustContract",
    page: "src/pages/ShieldPage.tsx",
    path: "src/solana/shieldTrustContract.ts",
    version: "vanta-shield-trust-contract-0.1",
  },
  {
    claim: "fullyPrivateSendClaim: false",
    getter: "getSendTrustContract",
    page: "src/pages/SendPage.tsx",
    path: "src/solana/sendTrustContract.ts",
    version: "vanta-send-trust-contract-0.1",
  },
  {
    claim: "fullyPrivateSwapClaim: false",
    getter: "getSwapTrustContract",
    page: "src/pages/SwapPage.tsx",
    path: "src/solana/swapTrustContract.ts",
    version: "vanta-swap-trust-contract-0.1",
  },
  {
    claim: "fullyPrivateUnshieldClaim: false",
    getter: "getUnshieldTrustContract",
    page: "src/pages/UnshieldPage.tsx",
    path: "src/solana/unshieldTrustContract.ts",
    version: "vanta-unshield-trust-contract-0.1",
    requiredMarkers: [
      'currentReleaseModel: "program-tag-unshield-pda-cpi-fail-closed"',
      "productionCustodyReady: false",
      "programOwnedVaultReady: false",
      "sourceOnlyVaultAuthorityPreflightReady: true",
      "sourceOnlyVaultAssetRegistryReady: true",
      "sourceOnlyVaultTokenAccountPreflightReady: true",
      "sourceOnlyRootPreflightReady: true",
      "sourceOnlyVerifierKeyPreflightReady: true",
      "onchainUnshieldInstructionReady: false",
      "tagUnshieldVaultAssetRegistryReleaseEnabled: false",
      "programPdaCustodyRequired: true",
      "operatorKeypairReleaseRemoved: true",
      "program-owned-vault-pda-not-deployed",
      "tag-unshield-reserved-fail-closed",
      "tag-unshield-token-cpi-release-not-wired",
      "npm run private-pool-v2:onchain-unshield-custody-check",
      "npm run private-pool-v2:pda-vault-custody-check",
      "preflights root, root-record, verifier-key, nullifier, vault-authority, vault-asset registry, and token-account shape",
      "operator no longer performs keypair public exits",
      "program-owned vault + on-chain TAG_UNSHIELD proof-verified release",
    ],
  },
];

const laneSpecificMarkers = {
  "src/solana/sendTrustContract.ts": [
    "Fresh v2 Send memos put ciphertext, signer, and timing on chain.",
    "local dual-AEAD scaffold can separately seal recipient and change discovery memos with ciphertext body hashes",
    "Private Pool v2 Send proof-request/circuit lane locally binds those body-hash fields",
    "Local legacy v1 Send memo migration tooling can produce v2 discovery metadata or segregation records",
    "External Send remains fail-closed until recipient viewing-key exchange",
    "Operator/status surfaces still see transition and proof metadata",
    "npm run actions:legacy-v1-send-memo-migration-check",
    "npm run private-pool-v2:send-circuit-check",
    "npm run private-pool-v2:public-input-hash-alignment-check",
  ],
};

for (const contract of laneContracts) {
  const source = requireMarkers(contract.path, [
    contract.version,
    contract.getter,
    contract.claim,
    "liveProductionClaim: false",
    "mainnetReady: false",
    "productionPrivacyClaimsLocked: true",
    "currentTruth",
    "visibleStatusCopy",
    "verificationSurfaces",
    ...(contract.requiredMarkers ?? []),
    ...(laneSpecificMarkers[contract.path] ?? []),
  ]);

  const pageSource = requireMarkers(contract.page, [
    contract.getter,
    "visibleStatusCopy",
    "claimControls.productionPrivacyClaimsLocked",
  ]);

  checkBannedClaims(contract.path, source);
  checkBannedClaims(contract.page, pageSource);
}

const packageSource = sourceOf("package.json");
if (!packageSource.includes('"lanes:trust-contract-check"')) {
  failures.push("package.json must expose lanes:trust-contract-check.");
}
if (!packageSource.includes("npm run lanes:trust-contract-check")) {
  failures.push("truth:privacy-claim-gate must include lanes:trust-contract-check.");
}

const reviewSource = sourceOf("VANTA_ZK_REVIEW.md");
if (!reviewSource.includes("lane trust contracts")) {
  failures.push("VANTA_ZK_REVIEW.md must record the lane trust contracts feedback-loop status.");
}

const laneTrustStatusSource = requireMarkers("src/trust/laneTrustStatus.ts", [
  "getLaneTrustStatuses",
  "getShieldTrustContract",
  "getSendTrustContract",
  "getSwapTrustContract",
  "getUnshieldTrustContract",
  "getStrategyPrivateRailTrustContract",
  "getVantaPayReceiptPrivacyContract",
  "fully_private_pay_claim",
  "production_privacy_claims_locked",
  "productionPrivacyClaimsLocked",
  "productionPrivacyClaimsLocked: controls.production_privacy_claims_locked",
  "fullyPrivateClaim",
  "liveProductionClaim: false",
  "mainnetReady: false",
  "claimLocked",
  "Shield",
  "Send",
  "Swap",
  "Unshield",
  "Strategy",
  "Pay",
]);

const systemStatusStripSource = requireMarkers("src/components/SystemStatusStrip.tsx", [
  "getLaneTrustStatuses",
  "system-status-strip",
  "aria-label=\"Vanta lane trust status\"",
  "Beta · receipts where available ·",
  "claim locks active",
  "Claim locked",
  "Shield: Claim locked",
  "Send: Claim locked",
  "Swap: Claim locked",
  "Unshield: Claim locked",
  "Strategy: Claim locked",
  "Pay: Claim locked",
]);

const appLayoutSource = requireMarkers("src/components/AppLayout.tsx", [
  "SystemStatusStrip",
  "<SystemStatusStrip showBetaMode={isBetaMode} />",
]);

const strategyPageSource = requireMarkers("src/pages/StrategyPage.tsx", [
  "getStrategyPrivateRailTrustContract",
  "strategyPrivateRailTrustContract.claimControls.productionPrivacyClaimsLocked",
  "strategyProductionClaimStatus",
  "strategyProductionClaimCopy",
  "strategyPrivateRailTrustContract.currentTruth",
  "strategyPrivateRailTrustContract.verificationSurfaces",
]);

const payPageSource = requireMarkers("src/pages/PayPage.tsx", [
  "getVantaPayReceiptPrivacyContract",
  "receiptPrivacyContract.claimControls.production_privacy_claims_locked",
  "receiptPrivacyContract.claimSummary",
  "payPrivacyClaimSummary",
  "PayReceiptPacketCard",
  "receiptPrivacyContract",
  "receiptPublicView",
]);

const payReceiptPacketCardSource = requireMarkers("src/components/PayReceiptPacketCard.tsx", [
  "privacyContract.currentTruth",
  "privacyContract.claimSummary",
  "privacyContract.verificationSurfaces",
  "publicView.verification.claimBoundary",
]);

requireMarkers("src/styles.css", [
  ".system-status-strip",
  ".system-status-strip__lanes",
  "overflow-wrap: anywhere",
]);

checkBannedClaims("src/trust/laneTrustStatus.ts", laneTrustStatusSource);
checkBannedClaims("src/components/SystemStatusStrip.tsx", systemStatusStripSource);
checkBannedClaims("src/components/AppLayout.tsx", appLayoutSource);
checkBannedClaims("src/pages/StrategyPage.tsx", strategyPageSource);
checkBannedClaims("src/pages/PayPage.tsx", payPageSource);
checkBannedClaims("src/components/PayReceiptPacketCard.tsx", payReceiptPacketCardSource);

if (failures.length > 0) {
  console.error("Vanta lane trust contracts check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta lane trust contracts check: PASS");
