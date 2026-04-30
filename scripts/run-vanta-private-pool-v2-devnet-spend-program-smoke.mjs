import {
  Connection,
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = requireEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID");
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR || `${homedir()}/.config/solana/id.json`;
const SLOT_COUNT = Number.parseInt(process.env.VANTA_PRIVATE_POOL_V2_DEVNET_SMOKE_SLOT_COUNT || "4", 10);
const CLUSTER = process.env.VANTA_PRIVATE_POOL_V2_SPEND_PROGRAM_SMOKE_CLUSTER || inferCluster(RPC_URL);
const APPROVAL = approvalToken(CLUSTER);
const APPROVAL_ENV_NAME = "VANTA_PRIVATE_POOL_V2_DEVNET_SMOKE_APPROVAL";
const MAX_SOL_AT_RISK = Number.parseFloat(process.env.VANTA_PRIVATE_POOL_V2_SPEND_PROGRAM_SMOKE_MAX_SOL || "0");

const POOL_STATE_LEN = 56;
const NULLIFIER_SET_LEN = 16 + 32 * SLOT_COUNT;
const OUTPUT_QUEUE_LEN = 16 + 96 * SLOT_COUNT;

if (!Number.isInteger(SLOT_COUNT) || SLOT_COUNT < 2 || SLOT_COUNT > 64) {
  throw new Error("VANTA_PRIVATE_POOL_V2_DEVNET_SMOKE_SLOT_COUNT must be an integer from 2 to 64.");
}

const connection = new Connection(RPC_URL, "confirmed");
const payer = loadKeypair(KEYPAIR_PATH);
const programId = new PublicKey(PROGRAM_ID);
const poolState = Keypair.generate();
const nullifierSet = Keypair.generate();
const outputQueue = Keypair.generate();

const deployAccount = await connection.getAccountInfo(programId, "confirmed");
if (!deployAccount?.executable) {
  throw new Error(`Program ${programId.toBase58()} is not executable on ${RPC_URL}.`);
}

const balance = await connection.getBalance(payer.publicKey, "confirmed");
const rentLamports = await estimateRent();
if (balance < rentLamports) {
  throw new Error(`Payer ${payer.publicKey.toBase58()} has insufficient ${CLUSTER} SOL for rent.`);
}
if (MAX_SOL_AT_RISK > 0 && rentLamports > MAX_SOL_AT_RISK * LAMPORTS_PER_SOL) {
  throw new Error(`Estimated rent exceeds approved cap: ${rentLamports / LAMPORTS_PER_SOL} SOL > ${MAX_SOL_AT_RISK} SOL.`);
}

const createAccountsTx = new Transaction().add(
  await createProgramAccountInstruction(poolState.publicKey, POOL_STATE_LEN),
  await createProgramAccountInstruction(nullifierSet.publicKey, NULLIFIER_SET_LEN),
  await createProgramAccountInstruction(outputQueue.publicKey, OUTPUT_QUEUE_LEN),
);

const initTx = new Transaction().add(new TransactionInstruction({
  keys: accountMetas(),
  programId,
  data: Buffer.from([0]),
}));

const spendPayload = Buffer.concat([
  Buffer.from([1]),
  bytes32(0x11),
  bytes32(0x22),
  bytes32(0x33),
  bytes32(0x44),
]);
const spendTx = new Transaction().add(new TransactionInstruction({
  keys: accountMetas(),
  programId,
  data: spendPayload,
}));
const replayTx = new Transaction().add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
  new TransactionInstruction({
    keys: accountMetas(),
    programId,
    data: spendPayload,
  }),
);

await simulateOrThrow("create-accounts", createAccountsTx, [payer, poolState, nullifierSet, outputQueue]);
if (process.env[APPROVAL_ENV_NAME] !== APPROVAL) {
  throw new Error(`Refusing to send ${CLUSTER} transactions without ${APPROVAL_ENV_NAME}=${APPROVAL}. create-accounts simulation passed.`);
}
const createAccountsSig = await sendAndConfirmTransaction(connection, createAccountsTx, [
  payer,
  poolState,
  nullifierSet,
  outputQueue,
], { commitment: "confirmed" });

await simulateOrThrow("init", initTx, [payer]);
const initSig = await sendAndConfirmTransaction(connection, initTx, [payer], { commitment: "confirmed" });

await simulateOrThrow("spend", spendTx, [payer]);
const spendSig = await sendAndConfirmTransaction(connection, spendTx, [payer], { commitment: "confirmed" });

const replaySimulation = await simulate("replay", replayTx, [payer], spendTx.recentBlockhash);
const replayRejected = Boolean(replaySimulation.value.err);
if (!replayRejected) {
  throw new Error("Duplicate-nullifier replay simulation unexpectedly succeeded.");
}
if (replaySimulation.value.err === "AlreadyProcessed") {
  throw new Error("Replay simulation hit duplicate transaction processing instead of duplicate-nullifier rejection.");
}

const poolAccount = await connection.getAccountInfo(poolState.publicKey, "confirmed");
const spendCount = poolAccount ? poolAccount.data.readBigUInt64LE(16).toString() : null;
const finalBalance = await connection.getBalance(payer.publicKey, "confirmed");
const spentLamports = balance - finalBalance;
if (MAX_SOL_AT_RISK > 0 && spentLamports > MAX_SOL_AT_RISK * LAMPORTS_PER_SOL) {
  throw new Error(`Actual spend exceeded approved cap: ${spentLamports / LAMPORTS_PER_SOL} SOL > ${MAX_SOL_AT_RISK} SOL.`);
}

console.log(JSON.stringify({
  cluster: CLUSTER,
  rpcUrl: RPC_URL,
  feePayer: payer.publicKey.toBase58(),
  programId: programId.toBase58(),
  poolState: poolState.publicKey.toBase58(),
  nullifierSet: nullifierSet.publicKey.toBase58(),
  outputQueue: outputQueue.publicKey.toBase58(),
  slotCount: SLOT_COUNT,
  createAccountsSig,
  initSig,
  spendSig,
  replayRejected,
  replayErr: replaySimulation.value.err,
  spendCount,
  spentLamports,
  spentSol: spentLamports / LAMPORTS_PER_SOL,
  env: {
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID: programId.toBase58(),
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE: poolState.publicKey.toBase58(),
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET: nullifierSet.publicKey.toBase58(),
    VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE: outputQueue.publicKey.toBase58(),
  },
}, null, 2));

async function createProgramAccountInstruction(newAccountPubkey, space) {
  return SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey,
    lamports: await connection.getMinimumBalanceForRentExemption(space),
    space,
    programId,
  });
}

async function estimateRent() {
  return (
    await connection.getMinimumBalanceForRentExemption(POOL_STATE_LEN)
    + await connection.getMinimumBalanceForRentExemption(NULLIFIER_SET_LEN)
    + await connection.getMinimumBalanceForRentExemption(OUTPUT_QUEUE_LEN)
  );
}

function accountMetas() {
  return [
    { pubkey: poolState.publicKey, isSigner: false, isWritable: true },
    { pubkey: nullifierSet.publicKey, isSigner: false, isWritable: true },
    { pubkey: outputQueue.publicKey, isSigner: false, isWritable: true },
  ];
}

async function simulateOrThrow(label, transaction, signers) {
  const result = await simulate(label, transaction, signers);
  if (result.value.err) {
    throw new Error(`${label} simulation failed: ${JSON.stringify(result.value.err)}`);
  }
  return result;
}

async function simulate(label, transaction, signers, avoidBlockhash = "") {
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = await latestDistinctBlockhash(avoidBlockhash);
  transaction.sign(...signers);
  const result = await connection.simulateTransaction(transaction);
  if (process.env.VANTA_PRIVATE_POOL_V2_DEVNET_SMOKE_VERBOSE === "true") {
    console.error(`${label} simulation`, JSON.stringify(result.value, null, 2));
  }
  return result;
}

async function latestDistinctBlockhash(avoidBlockhash) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    if (!avoidBlockhash || blockhash !== avoidBlockhash) {
      return blockhash;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error("Timed out waiting for a fresh devnet blockhash.");
}

function bytes32(fill) {
  return Buffer.alloc(32, fill);
}

function loadKeypair(path) {
  const keypairPath = resolve(path);
  const secret = JSON.parse(readFileSync(keypairPath, "utf8"));
  if (!Array.isArray(secret)) {
    throw new Error(`Solana keypair file ${keypairPath} must be a JSON byte array.`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Deploy the program to devnet first and pass its program id.`);
  }
  return value;
}

function inferCluster(rpcUrl) {
  if (rpcUrl.includes("mainnet")) {
    return "mainnet-beta";
  }
  if (rpcUrl.includes("devnet")) {
    return "devnet";
  }
  return "custom";
}

function approvalToken(cluster) {
  if (cluster === "mainnet-beta") {
    return "I_APPROVE_VANTA_MAINNET_SPEND_PROGRAM_SMOKE";
  }
  return "I_APPROVE_VANTA_DEVNET_SPEND_PROGRAM_SMOKE";
}
