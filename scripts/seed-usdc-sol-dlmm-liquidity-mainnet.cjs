const { readFileSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");
const { BN } = require("@coral-xyz/anchor");
const { Keypair, Connection, PublicKey } = require("@solana/web3.js");
const { sendAndConfirmTransaction } = require("@solana/web3.js");
const dlmmModule = require("@meteora-ag/dlmm");

const DLMM = dlmmModule.default || dlmmModule;

const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.VITE_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";
const CREATOR_KEYPAIR_PATH =
  process.env.VANTA_DLMM_CREATOR_KEYPAIR ||
  join(homedir(), ".config/solana/id.json");
const POOL_ADDRESS =
  process.env.VANTA_METEORA_DLMM_POOL_ADDRESS ||
  process.env.VITE_VANTA_METEORA_DLMM_POOL_ADDRESS ||
  "61NMGEcS5M4HT4aJyK4c3qap3YsgXTrbKHn4tNtXVtrU";
const POSITION_RANGE = Number(process.env.VANTA_DLMM_POSITION_RANGE || "10");
const SEED_SOL_AMOUNT = Number(process.env.VANTA_DLMM_SEED_SOL_AMOUNT || "0.05");
const DEFAULT_SLIPPAGE_BPS = Number(process.env.VANTA_DLMM_SEED_SLIPPAGE_BPS || "100");
const SEED_MODE = process.env.VANTA_DLMM_SEED_MODE || "sol_only";
const EXECUTE = process.argv.includes("--execute");

function loadKeypair(filePath) {
  const secret = JSON.parse(readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function decimalAmountToBn(amount, decimals) {
  const normalized = String(amount).trim();
  const [wholePart, fractionPart = ""] = normalized.split(".");
  const scaledFraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  const lamports = `${wholePart}${scaledFraction}`.replace(/^0+(?=\d)/, "");
  return new BN(lamports || "0");
}

function bnToDecimalString(value, decimals) {
  const raw = value.toString(10);

  if (decimals === 0) {
    return raw;
  }

  const padded = raw.padStart(decimals + 1, "0");
  const wholePart = padded.slice(0, -decimals);
  const fractionPart = padded.slice(-decimals).replace(/0+$/, "");

  return fractionPart ? `${wholePart}.${fractionPart}` : wholePart;
}

async function main() {
  if (!Number.isFinite(SEED_SOL_AMOUNT) || SEED_SOL_AMOUNT <= 0) {
    throw new Error("VANTA_DLMM_SEED_SOL_AMOUNT must be a positive number.");
  }

  if (!Number.isFinite(POSITION_RANGE) || POSITION_RANGE <= 0) {
    throw new Error("VANTA_DLMM_POSITION_RANGE must be a positive number.");
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const creator = loadKeypair(CREATOR_KEYPAIR_PATH);
  const pool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS));
  const activeBin = await pool.getActiveBin();
  const totalXAmount = decimalAmountToBn(SEED_SOL_AMOUNT.toFixed(9), pool.tokenX.mint.decimals);
  const minBinId = SEED_MODE === "balanced" ? activeBin.binId - POSITION_RANGE : activeBin.binId;
  const maxBinId =
    SEED_MODE === "balanced" ? activeBin.binId + POSITION_RANGE : activeBin.binId + POSITION_RANGE * 2;
  const totalYAmount =
    SEED_MODE === "balanced"
      ? DLMM.autoFillYByStrategy(
          activeBin.binId,
          pool.lbPair.binStep,
          totalXAmount,
          activeBin.xAmount,
          activeBin.yAmount,
          minBinId,
          maxBinId,
          DLMM.StrategyType.Spot,
        )
      : new BN(0);
  const position = new Keypair();
  const transaction = await pool.initializePositionAndAddLiquidityByStrategy({
    positionPubKey: position.publicKey,
    slippage: DEFAULT_SLIPPAGE_BPS / 100,
    strategy: {
      maxBinId,
      minBinId,
      strategyType: DLMM.StrategyType.Spot,
    },
    totalXAmount,
    totalYAmount,
    user: creator.publicKey,
  });

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = creator.publicKey;
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.partialSign(position, creator);

  const simulation = await connection.simulateTransaction(transaction, [position, creator]);
  const creatorSolBalance = await connection.getBalance(creator.publicKey, "confirmed");

  const result = {
    action: EXECUTE ? "simulate_and_execute" : "simulate_only",
    activeBin: {
      binId: activeBin.binId,
      pricePerToken: activeBin.pricePerToken,
    },
    creator: creator.publicKey.toBase58(),
    creatorUsdcAvailable: null,
    creatorSolBalance: bnToDecimalString(new BN(creatorSolBalance.toString()), 9),
    creatorUsdcRequired: bnToDecimalString(totalYAmount, pool.tokenY.mint.decimals),
    poolAddress: pool.pubkey.toBase58(),
    position: position.publicKey.toBase58(),
    seedMode: SEED_MODE,
    seedRange: {
      maxBinId,
      minBinId,
    },
    seedSolAmount: bnToDecimalString(totalXAmount, pool.tokenX.mint.decimals),
    simulation: {
      err: simulation.value.err,
      logs: simulation.value.logs,
      unitsConsumed: simulation.value.unitsConsumed ?? null,
    },
  };

  if (simulation.value.err) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  if (EXECUTE) {
    const signature = await sendAndConfirmTransaction(connection, transaction, [creator, position], {
      commitment: "confirmed",
      skipPreflight: false,
    });
    result.signature = signature;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        message: error instanceof Error ? error.message : String(error),
        status: "failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
