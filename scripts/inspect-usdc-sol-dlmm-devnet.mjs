import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const require = createRequire(import.meta.url);
const DLMMModule = require("@meteora-ag/dlmm");
const DLMM = DLMMModule.default ?? DLMMModule;
const { BN } = require("@coral-xyz/anchor");

const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.VITE_SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";
const CREATOR_KEYPAIR_PATH =
  process.env.VANTA_DLMM_CREATOR_KEYPAIR || join(homedir(), ".config/solana/id.json");
const POOL_ADDRESS =
  process.env.VANTA_METEORA_DLMM_POOL_ADDRESS ||
  process.env.VITE_VANTA_METEORA_DLMM_POOL_ADDRESS ||
  "61NMGEcS5M4HT4aJyK4c3qap3YsgXTrbKHn4tNtXVtrU";
const USDC_MINT = new PublicKey("VTi6xDRKPGexsJPgQvAfGv6vqvUdTgcnsCm1bZTd25J");
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

function loadKeypair(filePath) {
  const secret = JSON.parse(readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
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

function decimalAmountToBn(amount, decimals) {
  const normalized = String(amount).trim();
  const [wholePart, fractionPart = ""] = normalized.split(".");
  const scaledFraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  const lamports = `${wholePart}${scaledFraction}`.replace(/^0+(?=\d)/, "");
  return new BN(lamports || "0");
}

function summarizeBins(binArrays) {
  let nonEmptyBinCount = 0;
  let nonEmptyArrayCount = 0;
  const populated = [];

  for (const array of binArrays) {
    const safeBins = Array.isArray(array?.bins) ? array.bins : [];
    const bins = safeBins.filter(
      (bin) =>
        bin &&
        bin.xAmount &&
        bin.yAmount &&
        typeof bin.xAmount.isZero === "function" &&
        typeof bin.yAmount.isZero === "function" &&
        (!bin.xAmount.isZero() || !bin.yAmount.isZero()),
    );

    if (bins.length > 0) {
      nonEmptyArrayCount += 1;
      nonEmptyBinCount += bins.length;
      populated.push({
        firstBinId: bins[0].binId,
        lastBinId: bins[bins.length - 1].binId,
        sample: bins.slice(0, 3).map((bin) => ({
          binId: bin.binId,
          pricePerToken: bin.pricePerToken,
          xAmount: bin.xAmount.toString(10),
          yAmount: bin.yAmount.toString(10),
        })),
      });
    }
  }

  return {
    nonEmptyArrayCount,
    nonEmptyBinCount,
    populated: populated.slice(0, 6),
  };
}

async function getOwnerTokenBalances(connection, owner) {
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  return accounts.value
    .map(({ pubkey, account }) => {
      const parsed = account.data.parsed.info;
      return {
        amount: parsed.tokenAmount.uiAmountString,
        ata: pubkey.toBase58(),
        decimals: parsed.tokenAmount.decimals,
        mint: parsed.mint,
      };
    })
    .filter((entry) => entry.mint === USDC_MINT.toBase58());
}

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const creator = loadKeypair(CREATOR_KEYPAIR_PATH);
  const pool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS));
  const activeBin = await pool.getActiveBin();
  const binArrays = await pool.getBinArrays();
  const creatorPositions = await pool.getPositionsByUserAndLbPair(creator.publicKey);
  const creatorSolBalance = await connection.getBalance(creator.publicKey, "confirmed");
  const creatorTokenBalances = await getOwnerTokenBalances(connection, creator.publicKey);

  const summary = {
    activeBin: {
      binId: activeBin.binId,
      price: activeBin.price,
      pricePerToken: activeBin.pricePerToken,
      xAmount: activeBin.xAmount.toString(10),
      yAmount: activeBin.yAmount.toString(10),
    },
    binStep: pool.lbPair.binStep,
    creator: creator.publicKey.toBase58(),
    creatorPositions: creatorPositions.userPositions.map((position) => {
      const positionBins = Array.isArray(position.positionData?.positionBinData)
        ? position.positionData.positionBinData
        : [];

      return {
        binsWithLiquidity: positionBins.filter(
          (bin) =>
            bin &&
            bin.amountX &&
            bin.amountY &&
            typeof bin.amountX.isZero === "function" &&
            typeof bin.amountY.isZero === "function" &&
            (!bin.amountX.isZero() || !bin.amountY.isZero()),
        ).length,
        lowerBinId: position.positionData?.lowerBinId ?? null,
        position: position.publicKey.toBase58(),
        upperBinId: position.positionData?.upperBinId ?? null,
        version: position.version,
      };
    }),
    creatorSolBalanceLamports: creatorSolBalance,
    creatorUsdcAccounts: creatorTokenBalances,
    pool: {
      address: pool.pubkey.toBase58(),
      reserveX: {
        amount: bnToDecimalString(pool.tokenX.amount, pool.tokenX.mint.decimals),
        mint: pool.tokenX.publicKey.toBase58(),
        reserve: pool.tokenX.reserve.toBase58(),
      },
      reserveY: {
        amount: bnToDecimalString(pool.tokenY.amount, pool.tokenY.mint.decimals),
        mint: pool.tokenY.publicKey.toBase58(),
        reserve: pool.tokenY.reserve.toBase58(),
      },
      tokenXDecimals: pool.tokenX.mint.decimals,
      tokenYDecimals: pool.tokenY.mint.decimals,
      tokenXMint: pool.lbPair.tokenXMint.toBase58(),
      tokenYMint: pool.lbPair.tokenYMint.toBase58(),
    },
    populatedBins: summarizeBins(binArrays),
  };

  const quoteChecks = [];
  const cases = [
    {
      amount: "1.000000",
      inputMint: USDC_MINT,
      outputMint: SOL_MINT,
      swapForY:
        pool.lbPair.tokenXMint.equals(USDC_MINT) && pool.lbPair.tokenYMint.equals(SOL_MINT),
    },
    {
      amount: "0.010000000",
      inputMint: SOL_MINT,
      outputMint: USDC_MINT,
      swapForY:
        pool.lbPair.tokenXMint.equals(SOL_MINT) && pool.lbPair.tokenYMint.equals(USDC_MINT),
    },
  ];

  for (const check of cases) {
    const inputIsX = pool.lbPair.tokenXMint.equals(check.inputMint);
    const inputIsY = pool.lbPair.tokenYMint.equals(check.inputMint);
    const outputIsX = pool.lbPair.tokenXMint.equals(check.outputMint);
    const outputIsY = pool.lbPair.tokenYMint.equals(check.outputMint);

    if (!((inputIsX && outputIsY) || (inputIsY && outputIsX))) {
      quoteChecks.push({
        amount: check.amount,
        direction: `${check.inputMint.toBase58()} -> ${check.outputMint.toBase58()}`,
        status: "pair_mismatch",
      });
      continue;
    }

    const swapForY = inputIsX && outputIsY;
    const inputDecimals = inputIsX ? pool.tokenX.mint.decimals : pool.tokenY.mint.decimals;

    try {
      const inAmount = decimalAmountToBn(check.amount, inputDecimals);
      const arrays = await pool.getBinArrays();
      const quote = pool.swapQuote(inAmount, swapForY, new BN(0), arrays, false, 0);
      quoteChecks.push({
        amount: check.amount,
        direction: `${check.inputMint.toBase58()} -> ${check.outputMint.toBase58()}`,
        outAmount: quote.outAmount.toString(10),
        status: "ok",
      });
    } catch (error) {
      quoteChecks.push({
        amount: check.amount,
        direction: `${check.inputMint.toBase58()} -> ${check.outputMint.toBase58()}`,
        message: error instanceof Error ? error.message : String(error),
        status: "failed",
      });
    }
  }

  summary.quoteChecks = quoteChecks;

  console.log(JSON.stringify(summary, null, 2));
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
