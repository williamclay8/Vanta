import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const rpcUrl = process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet");
const connection = new Connection(rpcUrl, "confirmed");
const wallet = loadKeypair(join(homedir(), ".config/solana/id.json"));
const vault = loadKeypair(join(homedir(), ".config/solana/vanta-devnet-vault.json"));

const symbol = (process.env.VANTA_SHIELD_TOKEN_SYMBOL ?? process.argv[2] ?? "").trim();
const name = (process.env.VANTA_SHIELD_TOKEN_NAME ?? process.argv[3] ?? `${symbol} Devnet Test`).trim();
const decimals = Number(process.env.VANTA_SHIELD_TOKEN_DECIMALS ?? process.argv[4] ?? "6");
const initialSupplyUi = Number(
  process.env.VANTA_SHIELD_TOKEN_INITIAL_SUPPLY ?? process.argv[5] ?? "100000",
);

if (!symbol) {
  throw new Error(
    'Expected token symbol. Example: node scripts/create-devnet-shield-token.mjs JTO "Jito Devnet Test" 9 10000',
  );
}

if (!Number.isInteger(decimals) || decimals < 0) {
  throw new Error("Token decimals must be a non-negative integer.");
}

if (!Number.isFinite(initialSupplyUi) || initialSupplyUi <= 0) {
  throw new Error("Initial supply must be a positive number.");
}

const walletSol = await connection.getBalance(wallet.publicKey, "confirmed");
const vaultSol = await connection.getBalance(vault.publicKey, "confirmed");

if (walletSol <= 0) {
  throw new Error("Active wallet has no devnet SOL.");
}

if (vaultSol <= 0) {
  throw new Error("Vault signer has no devnet SOL.");
}

const mint = await createMint(
  connection,
  wallet,
  wallet.publicKey,
  null,
  decimals,
);

const walletAta = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet,
  mint,
  wallet.publicKey,
);

const rawSupply = BigInt(Math.round(initialSupplyUi * 10 ** decimals));

await mintTo(
  connection,
  wallet,
  mint,
  walletAta.address,
  wallet.publicKey,
  rawSupply,
);

const vaultAta = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet,
  mint,
  vault.publicKey,
  true,
);

const walletAccount = await getAccount(connection, walletAta.address, "confirmed");
const vaultAccount = await getAccount(connection, vaultAta.address, "confirmed");
const derivedVaultAta = await getAssociatedTokenAddress(mint, vault.publicKey, true);

console.log(
  JSON.stringify(
    {
      activeWallet: wallet.publicKey.toBase58(),
      activeWalletAta: walletAta.address.toBase58(),
      activeWalletSol: walletSol / LAMPORTS_PER_SOL,
      activeWalletTokenAmountRaw: walletAccount.amount.toString(),
      activeWalletTokenAmountUi: initialSupplyUi.toFixed(Math.min(decimals, 9)),
      decimals,
      mintAddress: mint.toBase58(),
      name,
      rpcUrl,
      symbol,
      vaultAta: vaultAta.address.toBase58(),
      vaultAtaDerived: derivedVaultAta.toBase58(),
      vaultOwner: vault.publicKey.toBase58(),
      vaultTokenAmountRaw: vaultAccount.amount.toString(),
      vaultSol: vaultSol / LAMPORTS_PER_SOL,
    },
    null,
    2,
  ),
);

function loadKeypair(filePath) {
  const secret = JSON.parse(readFileSync(filePath, "utf8"));

  if (!Array.isArray(secret)) {
    throw new Error(`Invalid keypair file: ${filePath}`);
  }

  return Keypair.fromSecretKey(Uint8Array.from(secret));
}
