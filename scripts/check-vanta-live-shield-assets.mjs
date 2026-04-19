import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const repoRoot = resolve(import.meta.dirname, "..");

loadEnvFile(".env.local");
loadEnvFile(".env.operator.local");

const rpcUrl =
  process.env.SOLANA_RPC_URL ??
  process.env.VITE_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";
const vaultOwnerValue =
  process.env.VANTA_DEVNET_VAULT_OWNER ?? process.env.VITE_VANTA_DEVNET_VAULT_OWNER;

if (!vaultOwnerValue) {
  throw new Error("Expected VANTA_DEVNET_VAULT_OWNER or VITE_VANTA_DEVNET_VAULT_OWNER.");
}

const connection = new Connection(rpcUrl, "confirmed");
const wallet = loadKeypair(join(homedir(), ".config/solana/id.json"));
const vaultOwner = new PublicKey(vaultOwnerValue);

const configuredAssets = [
  {
    symbol: "VUSD",
    mintAddress:
      process.env.VANTA_DEVNET_TOKEN_MINT ?? process.env.VITE_VANTA_DEVNET_TOKEN_MINT,
    name:
      process.env.VITE_VANTA_DEVNET_TOKEN_NAME ?? "Vanta Devnet Test Dollar",
    decimals: Number(process.env.VITE_VANTA_DEVNET_TOKEN_DECIMALS ?? "6"),
  },
  {
    symbol: "USDC",
    mintAddress:
      process.env.VANTA_DEVNET_USDC_MINT ?? process.env.VITE_VANTA_DEVNET_USDC_MINT,
    name:
      process.env.VITE_VANTA_DEVNET_USDC_NAME ?? "USD Coin (Devnet)",
    decimals: Number(process.env.VITE_VANTA_DEVNET_USDC_DECIMALS ?? "6"),
  },
  {
    symbol: "JTO",
    mintAddress:
      process.env.VANTA_DEVNET_JTO_MINT ?? process.env.VITE_VANTA_DEVNET_JTO_MINT,
    name:
      process.env.VITE_VANTA_DEVNET_JTO_NAME ?? "Jito (Devnet Test)",
    decimals: Number(process.env.VITE_VANTA_DEVNET_JTO_DECIMALS ?? "9"),
  },
  {
    symbol: "BONK",
    mintAddress:
      process.env.VANTA_DEVNET_BONK_MINT ?? process.env.VITE_VANTA_DEVNET_BONK_MINT,
    name:
      process.env.VITE_VANTA_DEVNET_BONK_NAME ?? "Bonk (Devnet Test)",
    decimals: Number(process.env.VITE_VANTA_DEVNET_BONK_DECIMALS ?? "5"),
  },
].filter((asset) => asset.mintAddress);

if (configuredAssets.length === 0) {
  throw new Error("No live shield assets are configured.");
}

const lines = [];

for (const asset of configuredAssets) {
  const mint = new PublicKey(asset.mintAddress);
  const mintInfo = await connection.getParsedAccountInfo(mint, "confirmed");

  if (!mintInfo.value) {
    throw new Error(`${asset.symbol} mint ${asset.mintAddress} is not present on devnet.`);
  }

  const walletAta = await getAssociatedTokenAddress(mint, wallet.publicKey);
  const vaultAta = await getAssociatedTokenAddress(mint, vaultOwner, true);
  const walletAtaInfo = await connection.getParsedAccountInfo(walletAta, "confirmed");
  const vaultAtaInfo = await connection.getParsedAccountInfo(vaultAta, "confirmed");
  const walletBalance = readParsedTokenBalance(walletAtaInfo.value);
  const vaultBalance = readParsedTokenBalance(vaultAtaInfo.value);

  lines.push(
    `${asset.symbol}: PASS · mint ${asset.mintAddress} · wallet ${walletBalance ?? "no ATA"} · vault ${vaultBalance ?? "no ATA"}`,
  );
}

console.log(`RPC: ${rpcUrl}`);
console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
console.log(`Vault owner: ${vaultOwner.toBase58()}`);
for (const line of lines) {
  console.log(line);
}

function loadEnvFile(relativePath) {
  const filePath = resolve(repoRoot, relativePath);

  try {
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional env file.
  }
}

function loadKeypair(filePath) {
  const secret = JSON.parse(readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function readParsedTokenBalance(accountInfo) {
  const tokenAmount =
    accountInfo?.data &&
    typeof accountInfo.data === "object" &&
    "parsed" in accountInfo.data &&
    accountInfo.data.parsed &&
    typeof accountInfo.data.parsed === "object" &&
    "info" in accountInfo.data.parsed &&
    accountInfo.data.parsed.info &&
    typeof accountInfo.data.parsed.info === "object" &&
    "tokenAmount" in accountInfo.data.parsed.info
      ? accountInfo.data.parsed.info.tokenAmount
      : null;

  if (!tokenAmount || typeof tokenAmount !== "object") {
    return null;
  }

  return tokenAmount.uiAmountString ?? tokenAmount.amount ?? null;
}
