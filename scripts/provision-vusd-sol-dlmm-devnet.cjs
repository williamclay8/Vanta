const { readFileSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");
const { Connection, Keypair, PublicKey, sendAndConfirmTransaction } = require("@solana/web3.js");
const { BN } = require("@coral-xyz/anchor");
const dlmm = require("@meteora-ag/dlmm");

const DLMM = dlmm.default || dlmm;

const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.VITE_SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";
const DLMM_API_BASE =
  process.env.VANTA_METEORA_DLMM_API_BASE || "https://dlmm-api.devnet.meteora.ag";
const CREATOR_KEYPAIR_PATH =
  process.env.VANTA_DLMM_CREATOR_KEYPAIR ||
  join(homedir(), ".config/solana/id.json");

const VUSD_MINT = new PublicKey("VTi6xDRKPGexsJPgQvAfGv6vqvUdTgcnsCm1bZTd25J");
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const TOKEN_X = SOL_MINT;
const TOKEN_Y = VUSD_MINT;

const BIN_STEP = Number(process.env.VANTA_DLMM_BIN_STEP || "25");
const FEE_BPS = Number(process.env.VANTA_DLMM_FEE_BPS || "100");
const INITIAL_SOL_USD_PRICE = Number(
  process.env.VANTA_DLMM_INITIAL_SOL_USD_PRICE || "81.61",
);
const HAS_ALPHA_VAULT = false;
const ACTIVATION_TYPE = DLMM.ActivationType.Slot;
const API_POLL_ATTEMPTS = Number(process.env.VANTA_DLMM_API_POLL_ATTEMPTS || "15");
const API_POLL_DELAY_MS = Number(process.env.VANTA_DLMM_API_POLL_DELAY_MS || "4000");

async function main() {
  if (!Number.isFinite(BIN_STEP) || BIN_STEP <= 0) {
    throw new Error("VANTA_DLMM_BIN_STEP must be a positive number.");
  }

  if (!Number.isFinite(FEE_BPS) || FEE_BPS <= 0) {
    throw new Error("VANTA_DLMM_FEE_BPS must be a positive number.");
  }

  if (!Number.isFinite(INITIAL_SOL_USD_PRICE) || INITIAL_SOL_USD_PRICE <= 0) {
    throw new Error("VANTA_DLMM_INITIAL_SOL_USD_PRICE must be a positive number.");
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const creator = loadKeypair(CREATOR_KEYPAIR_PATH);
  const creatorSol = await connection.getBalance(creator.publicKey, "confirmed");
  const predictedPairAddress = await derivePairAddress();

  const existingPairAddress =
    (await findExistingPair(connection)) ?? predictedPairAddress;
  const pairExistsOnchain = await findExistingPair(connection);

  const result = {
    action: pairExistsOnchain ? "discovered" : "created",
    apiContextReady: false,
    apiPairSnapshot: null,
    binStep: BIN_STEP,
    connection: RPC_URL,
    creator: creator.publicKey.toBase58(),
    creatorSol,
    currentSolUsdPrice: INITIAL_SOL_USD_PRICE,
    feeBps: FEE_BPS,
    pairAddress: existingPairAddress.toBase58(),
    txSignature: null,
    vusdMint: VUSD_MINT.toBase58(),
  };

  if (!pairExistsOnchain) {
    const activeId = DLMM.getBinIdFromPrice(INITIAL_SOL_USD_PRICE, BIN_STEP, true);
    const transaction = await DLMM.createCustomizablePermissionlessLbPair(
      connection,
      new BN(BIN_STEP),
      TOKEN_X,
      TOKEN_Y,
      new BN(activeId),
      new BN(FEE_BPS),
      ACTIVATION_TYPE,
      HAS_ALPHA_VAULT,
      creator.publicKey,
    );

    result.activeId = activeId;
    result.txSignature = await sendAndConfirmTransaction(connection, transaction, [creator], {
      commitment: "confirmed",
    });
  }

  const confirmedPairAddress = await findExistingPair(connection);

  if (!confirmedPairAddress) {
    throw new Error(
      "The Meteora DLMM pair transaction completed, but the VUSD/SOL pair was not discoverable on-chain afterward.",
    );
  }

  result.pairAddress = confirmedPairAddress.toBase58();
  result.apiPairSnapshot = await waitForApiPair(result.pairAddress);
  result.apiContextReady = Boolean(result.apiPairSnapshot);
  result.contextUrl = `${DLMM_API_BASE}/pair/{poolAddress}`;
  result.env = {
    VANTA_METEORA_DLMM_POOL_ADDRESS: result.pairAddress,
    VANTA_METEORA_DLMM_POOL_CONTEXT_URL: result.contextUrl,
  };

  console.log(JSON.stringify(result, null, 2));
}

async function derivePairAddress() {
  const programId = new PublicKey(DLMM.LBCLMM_PROGRAM_IDS.devnet);
  const [pairAddress] = DLMM.deriveCustomizablePermissionlessLbPair(
    TOKEN_X,
    TOKEN_Y,
    programId,
  );
  return pairAddress;
}

async function findExistingPair(connection) {
  const direct = await DLMM.getCustomizablePermissionlessLbPairIfExists(
    connection,
    TOKEN_X,
    TOKEN_Y,
  );

  if (direct) {
    return direct;
  }

  return DLMM.getCustomizablePermissionlessLbPairIfExists(connection, TOKEN_Y, TOKEN_X);
}

async function waitForApiPair(pairAddress) {
  for (let attempt = 0; attempt < API_POLL_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${DLMM_API_BASE}/pair/${pairAddress}`, {
      headers: {
        Accept: "application/json",
      },
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status !== 404) {
      throw new Error(
        `Meteora pair context lookup failed with status ${response.status} after pool provisioning.`,
      );
    }

    if (attempt < API_POLL_ATTEMPTS - 1) {
      await sleep(API_POLL_DELAY_MS);
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadKeypair(filePath) {
  const secret = JSON.parse(readFileSync(filePath, "utf8"));

  if (!Array.isArray(secret)) {
    throw new Error(`Invalid keypair file: ${filePath}`);
  }

  return Keypair.fromSecretKey(Uint8Array.from(secret));
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
