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
const decimals = 6;
const initialSupplyUi = Number(process.env.VANTA_VUSD_INITIAL_SUPPLY ?? "1000");

if (!Number.isFinite(initialSupplyUi) || initialSupplyUi <= 0) {
  throw new Error("VANTA_VUSD_INITIAL_SUPPLY must be a positive number.");
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

console.log(JSON.stringify({
  activeWallet: wallet.publicKey.toBase58(),
  activeWalletAta: walletAta.address.toBase58(),
  activeWalletSol: walletSol / LAMPORTS_PER_SOL,
  activeWalletTokenAmountRaw: walletAccount.amount.toString(),
  activeWalletTokenAmountUi: initialSupplyUi.toFixed(decimals),
  decimals,
  mintAddress: mint.toBase58(),
  rpcUrl,
  vaultAta: vaultAta.address.toBase58(),
  vaultAtaDerived: derivedVaultAta.toBase58(),
  vaultOwner: vault.publicKey.toBase58(),
  vaultTokenAmountRaw: vaultAccount.amount.toString(),
  vaultSol: vaultSol / LAMPORTS_PER_SOL,
}, null, 2));

function loadKeypair(filePath) {
  const secret = JSON.parse(readFileSync(filePath, "utf8"));

  if (!Array.isArray(secret)) {
    throw new Error(`Invalid keypair file: ${filePath}`);
  }

  return Keypair.fromSecretKey(Uint8Array.from(secret));
}
