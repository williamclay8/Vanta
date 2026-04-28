import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const walletAssetsSource = readFileSync(
  resolve(repoRoot, "src/solana/useWalletPublicAssets.ts"),
  "utf8",
);
const shieldPageSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");

const failures = [];

if (!walletAssetsSource.includes("listLiveShieldTokenAssets({ configuredOnly: false })")) {
  failures.push("Wallet public assets must label every known shield asset, even before it is executable.");
}

if (!walletAssetsSource.includes("formatUnknownWalletAssetLabel")) {
  failures.push("Wallet public assets must format unknown SPL tokens with a clear unknown-token label.");
}

if (!walletAssetsSource.includes("resolveWalletTokenMetadataLabels")) {
  failures.push("Wallet public assets must attempt on-chain metadata resolution before using the unknown-token fallback.");
}

if (!walletAssetsSource.includes("isShieldableSplTokenAmount")) {
  failures.push("Wallet public assets must filter shield source options through an explicit shieldable SPL token predicate.");
}

if (!walletAssetsSource.includes("args.decimals > 0")) {
  failures.push("Wallet public assets must not expose zero-decimal NFT-style SPL accounts as Shield source options.");
}

if (!walletAssetsSource.includes("const hasConnectedWallet = Boolean(args.walletAddress)")) {
  failures.push("Wallet public assets must keep native SOL selectable for connected wallets even before balance recovery reports a positive value.");
}

if (!walletAssetsSource.includes("balanceStatus: nativeSolBalanceStatus")) {
  failures.push("Wallet public assets must carry native SOL balance recovery status so Shield does not present provisional zero as final.");
}

if (!walletAssetsSource.includes("args.solBalanceFetching")) {
  failures.push("Wallet public assets must receive native SOL balance fetching state from the wallet context.");
}

if (!walletAssetsSource.includes("args.solBalanceError")) {
  failures.push("Wallet public assets must receive native SOL balance recovery errors from the wallet context.");
}

if (!shieldPageSource.includes("selectedSourceBalanceStatus")) {
  failures.push("Shield page must inspect source balance recovery status before validating shield amounts.");
}

if (!shieldPageSource.includes("Loading...")) {
  failures.push("Shield page must avoid showing provisional zero while native SOL balance recovery is loading.");
}

if (!walletAssetsSource.includes("getTokenMetadata")) {
  failures.push("Wallet public assets must read Token-2022 token metadata when available.");
}

if (!walletAssetsSource.includes("METAPLEX_TOKEN_METADATA_PROGRAM_ID")) {
  failures.push("Wallet public assets must check legacy Metaplex token metadata for SPL mints.");
}

if (!walletAssetsSource.includes("PublicKey.findProgramAddressSync")) {
  failures.push("Wallet public assets must derive the Metaplex metadata PDA from the mint address.");
}

if (walletAssetsSource.includes("label: known?.label ?? abbreviateMint(mintAddress)")) {
  failures.push("Unknown wallet token labels must not fall back to mint-only text.");
}

if (walletAssetsSource.includes("symbol: known?.symbol ?? abbreviateMint(mintAddress)")) {
  failures.push("Unknown wallet token symbols must not fall back to mint-only text.");
}

if (!shieldPageSource.includes("formatShieldSourceAssetOptionLabel")) {
  failures.push("Shield page must format source asset options through the human-readable label helper.");
}

if (!shieldPageSource.includes("asset.label")) {
  failures.push("Shield source asset options must include the asset name/label, not only the mint-derived symbol.");
}

if (shieldPageSource.includes("{asset.symbol}\n                      </option>")) {
  failures.push("Shield source asset options must not render only asset.symbol.");
}

if (failures.length > 0) {
  console.error("Vanta shield asset label check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta shield asset label check: PASS");
