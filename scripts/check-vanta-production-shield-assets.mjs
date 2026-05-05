import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

const repoRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(repoRoot, "dist");
const mainnetRpcUrls = [
  process.env.SOLANA_MAINNET_RPC_URL,
  process.env.VITE_SOLANA_RPC_URL,
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
].filter(Boolean);
const mainnetVaultOwner = "7yUfwUmZMYLg95xJGR762z4WpqfR6hBRqt9mcgNArtdi";

const directShieldAssets = [
  {
    decimals: 6,
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
  },
  {
    decimals: 9,
    mintAddress: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    symbol: "JTO",
  },
  {
    decimals: 5,
    mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
  },
  {
    decimals: 6,
    mintAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP",
  },
  {
    decimals: 6,
    mintAddress: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    symbol: "PYUSD",
  },
  {
    decimals: 6,
    mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
  },
  {
    decimals: 6,
    mintAddress: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
    symbol: "KMNO",
  },
];

const jsBundle = readDistJavascript();

assertBundleContains("mainnet vault owner", mainnetVaultOwner);
assertBundleContains("browser mainnet RPC default", "https://solana-rpc.publicnode.com");
assertBundleContains("browser-blocked mainnet RPC guard", "api.mainnet-beta.solana.com");
assertBundleContains("mainnet cluster", "mainnet-beta");

for (const asset of directShieldAssets) {
  assertBundleContains(`${asset.symbol} mint`, asset.mintAddress);
}

const mintChecks = await Promise.all(
  directShieldAssets.map((asset) => checkMint(asset)),
);

for (const check of mintChecks) {
  console.log(
    `${check.symbol}: PASS · ${check.tokenProgramLabel} · decimals ${check.decimals} · ATA ${check.vaultAta.toBase58()}`,
  );
}

console.log("Vanta production Shield asset check: PASS");

function readDistJavascript() {
  const files = listFiles(distRoot).filter((filePath) => filePath.endsWith(".js"));

  if (files.length === 0) {
    throw new Error("Expected built dist JavaScript. Run `npm run build` first.");
  }

  return files.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
}

function listFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const filePath = resolve(directory, name);
    return statSync(filePath).isDirectory() ? listFiles(filePath) : [filePath];
  });
}

function assertBundleContains(label, value) {
  if (!jsBundle.includes(value)) {
    throw new Error(`Production bundle is missing ${label}: ${value}`);
  }
}

async function checkMint(asset) {
  const mint = new PublicKey(asset.mintAddress);
  const accountInfo = await getParsedMintAccount(mint);
  const tokenProgramId = accountInfo.value.owner;
  const tokenProgramLabel = getTokenProgramLabel(tokenProgramId);
  const decimals = Number(accountInfo.value.data.parsed.info.decimals);

  if (decimals !== asset.decimals) {
    throw new Error(
      `${asset.symbol} mint decimals mismatch: expected ${asset.decimals}, received ${decimals}.`,
    );
  }

  const vaultAta = getAssociatedTokenAddressSync(
    mint,
    new PublicKey(mainnetVaultOwner),
    true,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  return {
    decimals,
    symbol: asset.symbol,
    tokenProgramLabel,
    vaultAta,
  };
}

async function getParsedMintAccount(mint) {
  let lastError = null;

  for (const rpcUrl of mainnetRpcUrls) {
    try {
      const connection = new Connection(rpcUrl, "confirmed");
      const accountInfo = await connection.getParsedAccountInfo(mint, "confirmed");

      if (!accountInfo.value) {
        throw new Error(`Mint account ${mint.toBase58()} was not found.`);
      }

      if (
        !accountInfo.value.owner.equals(TOKEN_PROGRAM_ID) &&
        !accountInfo.value.owner.equals(TOKEN_2022_PROGRAM_ID)
      ) {
        throw new Error(
          `Mint account ${mint.toBase58()} is owned by unsupported program ${accountInfo.value.owner.toBase58()}.`,
        );
      }

      if (
        accountInfo.value.data === null ||
        typeof accountInfo.value.data !== "object" ||
        !("parsed" in accountInfo.value.data) ||
        accountInfo.value.data.parsed.type !== "mint"
      ) {
        throw new Error(`Mint account ${mint.toBase58()} did not parse as an SPL mint.`);
      }

      return accountInfo;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Mint account ${mint.toBase58()} could not be checked.`);
}

function getTokenProgramLabel(programId) {
  if (programId.equals(TOKEN_PROGRAM_ID)) {
    return "spl-token";
  }

  if (programId.equals(TOKEN_2022_PROGRAM_ID)) {
    return "token-2022";
  }

  throw new Error(`Unsupported token program: ${programId.toBase58()}`);
}
