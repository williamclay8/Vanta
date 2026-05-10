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
  },
];

const laneSpecificMarkers = {
  "src/solana/sendTrustContract.ts": [
    "Fresh v2 Send memos put ciphertext, signer, and timing on chain.",
    "local dual-AEAD scaffold can separately seal recipient and change discovery memos with ciphertext hashes",
    "external Send remains fail-closed until recipient viewing-key exchange",
    "Operator/status surfaces still see transition and proof metadata",
    "proof-bound ciphertext hashes are wired",
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
    ...(laneSpecificMarkers[contract.path] ?? []),
  ]);

  const pageSource = requireMarkers(contract.page, [
    contract.getter,
    "visibleStatusCopy",
    "claimControls.productionPrivacyClaimsLocked",
  ]);

  for (const banned of [
    "Fully private",
    "Anonymous",
    "Untraceable",
    "Production-ready private",
    "Mainnet-ready private",
  ]) {
    if (source.includes(banned) || pageSource.includes(banned)) {
      failures.push(`Banned lane trust claim found for ${contract.path}: ${banned}`);
    }
  }
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

if (failures.length > 0) {
  console.error("Vanta lane trust contracts check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta lane trust contracts check: PASS");
