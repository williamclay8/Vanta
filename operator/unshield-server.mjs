import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@solana/client";
import { loadKeypairFromEnv } from "@solana/client/server";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  assertFreshUnshieldIntent,
  parseSignedUnshieldIntent,
  verifySignedUnshieldIntent,
} from "./unshield-auth.mjs";
import {
  assertFreshSolUnshieldIntent,
  parseSignedSolUnshieldIntent,
  verifySignedSolUnshieldIntent,
} from "./sol-unshield-auth.mjs";
import {
  assertFreshSwapIntent,
  parseSignedSwapIntent,
  verifySignedSwapIntent,
} from "./swap-auth.mjs";
import {
  assertFreshMeteoraQuote,
  assertMeteoraExecutionDrift,
  evaluateSwapLaneHealth,
  fetchMeteoraDlmmQuote,
  logSwapLaneHealth,
  validateSwapLaneConfig,
} from "./meteora-dlmm-context.mjs";
import {
  compareTitanAdvisoryQuote,
  logTitanAdvisoryComparison,
  probeTitanGatewayQuote,
  validateTitanGatewayConfig,
} from "./titan-gateway-advisory.mjs";
import {
  assertEligibleSolUnshieldTransition,
  assertEligibleSwapTransition,
  assertEligibleUnshieldTransition,
  fetchConstrainedOnchainUnshieldContext,
} from "./vanta-onchain-state.mjs";
import { createReleaseRecordStore } from "./release-record-store.mjs";

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.operator");
loadEnvFile(".env.operator.local");

const port = Number(process.env.VANTA_UNSHIELD_OPERATOR_PORT ?? "8789");
const endpoint =
  process.env.SOLANA_RPC_URL ??
  process.env.VITE_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";
const websocketEndpoint =
  process.env.SOLANA_WS_URL ??
  process.env.VITE_SOLANA_WS_URL ??
  endpoint.replace("https://", "wss://").replace("http://", "ws://");
const mintAddress =
  process.env.VANTA_DEVNET_TOKEN_MINT ?? process.env.VITE_VANTA_DEVNET_TOKEN_MINT;
const vaultOwner =
  process.env.VANTA_DEVNET_VAULT_OWNER ?? process.env.VITE_VANTA_DEVNET_VAULT_OWNER;

if (!mintAddress || !vaultOwner) {
  throw new Error(
    "Unshield operator requires VANTA_DEVNET_TOKEN_MINT and VANTA_DEVNET_VAULT_OWNER.",
  );
}

const client = createClient({
  endpoint,
  websocketEndpoint,
  walletConnectors: [],
});
const web3Connection = new Connection(endpoint, "confirmed");
const releaseRecords = createReleaseRecordStore();
const swapRecords = createReleaseRecordStore({
  defaultPath: "operator/.vanta-swap-records.json",
  envKey: "VANTA_SWAP_RECORD_STORE_PATH",
});
const solUnshieldRecords = createReleaseRecordStore({
  defaultPath: "operator/.vanta-sol-unshield-records.json",
  envKey: "VANTA_SOL_UNSHIELD_RECORD_STORE_PATH",
});
const processedRequestIds = new Set();
const processedNoteIds = new Set();
const processedTransitionNoteIds = new Set();
const inFlightRequestIds = new Set();
const processedSwapRequestIds = new Set();
const processedSwapNoteIds = new Set();
const processedSwapTransitionNoteIds = new Set();
const inFlightSwapRequestIds = new Set();
const processedSolUnshieldRequestIds = new Set();
const processedSolUnshieldNoteIds = new Set();
const processedSolUnshieldTransitionNoteIds = new Set();
const inFlightSolUnshieldRequestIds = new Set();
const swapLaneConfigValidation = validateSwapLaneConfig();
const titanGatewayConfigValidation = validateTitanGatewayConfig();
const swapTransitionLookupAttempts = Number(
  process.env.VANTA_SWAP_TRANSITION_LOOKUP_ATTEMPTS ?? "12",
);
const swapTransitionLookupDelayMs = Number(
  process.env.VANTA_SWAP_TRANSITION_LOOKUP_DELAY_MS ?? "1000",
);
const VANTA_UNSHIELD_MEMO_PREFIX = "vanta:unshield-note:v1:";
const VANTA_SWAP_MEMO_PREFIX = "vanta:swap-note:v1:";
const VANTA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

if (!swapLaneConfigValidation.valid) {
  console.warn(
    "[vanta.swap.health.startup]",
    JSON.stringify({
      expectedPair: "VUSD->SOL",
      issues: swapLaneConfigValidation.issues,
      poolAddress: swapLaneConfigValidation.config.poolAddress,
      status: "misconfigured",
    }),
  );
}

if (!titanGatewayConfigValidation.valid) {
  console.warn(
    "[vanta.swap.titan.startup]",
    JSON.stringify({
      issues: titanGatewayConfigValidation.issues,
      status: "advisory_unavailable",
    }),
  );
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    writeCorsHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health/swap") {
    const health = await evaluateSwapLaneHealth({
      inputMint: mintAddress,
      outputMint: "So11111111111111111111111111111111111111112",
    });
    logSwapLaneHealth(health, "/health/swap");
    writeCorsHeaders(response);
    response.writeHead(
      health.status === "healthy" || health.status === "degraded" ? 200 : 503,
      { "Content-Type": "application/json" },
    );
    response.end(JSON.stringify(health));
    return;
  }

  if (request.method === "GET" && request.url === "/state/sol-unshield-records") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        consumedNoteIds: solUnshieldRecords.listConsumedNoteIds(),
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/swap-records") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        records: swapRecords.listRecords(),
      }),
    );
    return;
  }

  if (request.method === "POST" && request.url === "/swap/quote") {
    try {
      const body = await readJsonBody(request);
      const inputAmount = Number(body.inputAmount);

      if (
        body.inputAsset !== "VUSD" ||
        body.outputAsset !== "SOL" ||
        !Number.isFinite(inputAmount) ||
        inputAmount <= 0
      ) {
        throw new Error("Invalid constrained swap quote request.");
      }
      const quote = await fetchMeteoraDlmmQuote({
        inputAmount: inputAmount.toFixed(6),
        inputMint: mintAddress,
        outputMint: "So11111111111111111111111111111111111111112",
      });
      const titanAdvisory = compareTitanAdvisoryQuote({
        meteoraOutputAmount: quote.outputAmount,
        titan: await probeTitanGatewayQuote({
          inputAmount: inputAmount.toFixed(6),
          inputMint: mintAddress,
          outputMint: "So11111111111111111111111111111111111111112",
          userPublicKey: vaultOwner,
        }),
      });
      logTitanAdvisoryComparison(titanAdvisory, "/swap/quote");

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          inputAmount: quote.inputAmount,
          inputAsset: "VUSD",
          outputAmount: quote.outputAmount,
          outputAsset: "SOL",
          pairLabel: quote.pairLabel,
          quoteExpiresAt: quote.quoteExpiresAt,
          quoteId: quote.quoteId,
          quoteTimestamp: quote.quoteTimestamp,
          venueFamily: quote.venueFamily,
          venueName: quote.venueName,
          venueNetwork: quote.venueNetwork,
          venuePoolAddress: quote.poolAddress,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The swap operator could not prepare a quote.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/swap") {
    try {
      const body = await readJsonBody(request);
      const intent = parseSignedSwapIntent(body);
      const parsedInputAmount = Number(intent.inputAmount);
      const parsedOutputAmount = Number(intent.outputAmount);

      if (
        intent.owner !== intent.requester ||
        intent.mintAddress !== mintAddress ||
        intent.vaultOwner !== vaultOwner ||
        intent.inputAsset !== "VUSD" ||
        intent.outputAsset !== "SOL" ||
        !Number.isFinite(parsedInputAmount) ||
        parsedInputAmount <= 0 ||
        !Number.isFinite(parsedOutputAmount) ||
        parsedOutputAmount <= 0
      ) {
        throw new Error("Invalid authenticated swap request.");
      }

      assertFreshSwapIntent(intent);
      assertFreshMeteoraQuote(intent);

      if (!verifySignedSwapIntent(intent)) {
        throw new Error("Wallet signature verification failed for this swap request.");
      }

      const latestVenueQuote = await fetchMeteoraDlmmQuote({
        inputAmount: parsedInputAmount.toFixed(6),
        inputMint: mintAddress,
        outputMint: "So11111111111111111111111111111111111111112",
      });
      const titanAdvisory = compareTitanAdvisoryQuote({
        meteoraOutputAmount: latestVenueQuote.outputAmount,
        titan: await probeTitanGatewayQuote({
          inputAmount: parsedInputAmount.toFixed(6),
          inputMint: mintAddress,
          outputMint: "So11111111111111111111111111111111111111112",
          userPublicKey: vaultOwner,
        }),
      });
      logTitanAdvisoryComparison(titanAdvisory, "/swap");

      if (
        intent.venueName !== latestVenueQuote.venueName ||
        intent.venueFamily !== latestVenueQuote.venueFamily ||
        intent.venueNetwork !== latestVenueQuote.venueNetwork ||
        intent.venuePoolAddress !== latestVenueQuote.poolAddress
      ) {
        throw new Error("Meteora venue context no longer matches the constrained swap lane.");
      }

      assertMeteoraExecutionDrift({
        latestOutputAmount: latestVenueQuote.outputAmount,
        quotedOutputAmount: intent.outputAmount,
      });

      if (inFlightSwapRequestIds.has(intent.requestId)) {
        throw new Error("This swap request has already been submitted.");
      }

      inFlightSwapRequestIds.add(intent.requestId);

      try {
        await waitForEligibleSwapTransition({
          client,
          consumedNoteId: intent.consumedNoteId,
          inputAmount: intent.inputAmount,
          mintAddress,
          outputAmount: intent.outputAmount,
          outputNoteId: intent.outputNoteId,
          owner: intent.owner,
          quoteExpiresAt: intent.quoteExpiresAt,
          quoteId: intent.quoteId,
          quoteTimestamp: intent.quoteTimestamp,
          transitionNoteId: intent.transitionNoteId,
          transitionStateSignature: intent.transitionStateSignature,
          vaultOwner,
          venueFamily: intent.venueFamily,
          venueName: intent.venueName,
          venueNetwork: intent.venueNetwork,
          venuePoolAddress: intent.venuePoolAddress,
        });
      } finally {
        inFlightSwapRequestIds.delete(intent.requestId);
      }

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      swapRecords.recordRelease({
        completedAt: Date.now(),
        consumedNoteId: intent.consumedNoteId,
        inputAmount: intent.inputAmount,
        inputAsset: "VUSD",
        mintAddress,
        outputAmount: intent.outputAmount,
        outputAsset: "SOL",
        outputNoteId: intent.outputNoteId,
        owner: intent.owner,
        quoteExpiresAt: intent.quoteExpiresAt,
        quoteId: intent.quoteId,
        quoteTimestamp: intent.quoteTimestamp,
        requestId: intent.requestId,
        transitionNoteId: intent.transitionNoteId,
        titanAdvisory,
        transitionStateSignature: intent.transitionStateSignature,
        venueFamily: intent.venueFamily,
        venueName: intent.venueName,
        venueNetwork: intent.venueNetwork,
        venuePoolAddress: intent.venuePoolAddress,
        vaultOwner,
      });
      response.end(
        JSON.stringify({
          quoteId: intent.quoteId,
          requestId: intent.requestId,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error ? error.message : "The swap operator could not process the request.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/unshield/sol") {
    try {
      const body = await readJsonBody(request);
      const intent = parseSignedSolUnshieldIntent(body);
      const parsedAmount = Number(intent.amount);

      if (
        intent.owner !== intent.requester ||
        intent.destinationOwner !== intent.requester ||
        intent.asset !== "SOL" ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      ) {
        throw new Error("Invalid authenticated SOL unshield request.");
      }

      assertFreshSolUnshieldIntent(intent);

      if (!verifySignedSolUnshieldIntent(intent)) {
        throw new Error("Wallet signature verification failed for this SOL unshield request.");
      }

      if (
        processedSolUnshieldRequestIds.has(intent.requestId) ||
        inFlightSolUnshieldRequestIds.has(intent.requestId)
      ) {
        throw new Error("This SOL unshield request has already been submitted.");
      }

      if (
        processedSolUnshieldRequestIds.has(intent.requestId) ||
        solUnshieldRecords.hasRequestId(intent.requestId)
      ) {
        throw new Error("This SOL unshield request has already been finalized.");
      }

      if (
        processedSolUnshieldNoteIds.has(intent.consumedNoteId) ||
        solUnshieldRecords.hasConsumedNoteId(intent.consumedNoteId)
      ) {
        throw new Error("This shielded SOL note has already been returned to Public Wallet.");
      }

      if (
        processedSolUnshieldTransitionNoteIds.has(intent.transitionNoteId) ||
        solUnshieldRecords.hasTransitionNoteId(intent.transitionNoteId)
      ) {
        throw new Error("This SOL unshield transition has already been finalized.");
      }

      const onchainContext = await fetchConstrainedOnchainUnshieldContext({
        client,
        mintAddress,
        owner: intent.owner,
        vaultOwner,
      });

      assertEligibleSolUnshieldTransition({
        amount: intent.amount,
        assetId: intent.assetId,
        context: onchainContext,
        consumedNoteId: intent.consumedNoteId,
        destinationOwner: intent.destinationOwner,
        owner: intent.owner,
        transitionNoteId: intent.transitionNoteId,
        vaultOwner,
      });

      const keypair = loadWeb3KeypairFromEnv("VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY");
      const signerAddress = keypair.publicKey.toBase58();

      if (signerAddress !== vaultOwner) {
        throw new Error("Configured operator signer does not match the Vanta vault owner.");
      }

      inFlightSolUnshieldRequestIds.add(intent.requestId);

      let signature;

      try {
        signature = await sendAndConfirmTransaction(
          web3Connection,
          new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: keypair.publicKey,
              lamports: solAmountToLamports(parsedAmount),
              toPubkey: new PublicKey(intent.destinationOwner),
            }),
          ),
          [keypair],
          {
            commitment: "confirmed",
          },
        );
      } finally {
        inFlightSolUnshieldRequestIds.delete(intent.requestId);
      }

      processedSolUnshieldRequestIds.add(intent.requestId);
      processedSolUnshieldNoteIds.add(intent.consumedNoteId);
      processedSolUnshieldTransitionNoteIds.add(intent.transitionNoteId);
      solUnshieldRecords.recordRelease({
        amount: intent.amount,
        asset: "SOL",
        assetId: intent.assetId,
        completedAt: Date.now(),
        consumedNoteId: intent.consumedNoteId,
        destinationOwner: intent.destinationOwner,
        owner: intent.owner,
        releaseSignature: signature,
        requestId: intent.requestId,
        transitionNoteId: intent.transitionNoteId,
        vaultOwner,
      });

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          consumedNoteId: intent.consumedNoteId,
          requestId: intent.requestId,
          signature,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The SOL unshield operator could not process the request.",
      );
    }
    return;
  }

  if (request.method !== "POST" || request.url !== "/unshield") {
    writeCorsHeaders(response);
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  try {
    const body = await readJsonBody(request);
    const intent = parseSignedUnshieldIntent(body);
    const parsedAmount = Number(intent.amount);

    if (
      intent.owner !== intent.requester ||
      intent.destinationOwner !== intent.requester ||
      intent.mintAddress !== mintAddress ||
      intent.vaultOwner !== vaultOwner ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      throw new Error("Invalid authenticated unshield request.");
    }

    assertFreshUnshieldIntent(intent);

    if (!verifySignedUnshieldIntent(intent)) {
      throw new Error("Wallet signature verification failed for this unshield request.");
    }

    if (processedRequestIds.has(intent.requestId) || inFlightRequestIds.has(intent.requestId)) {
      throw new Error("This unshield request has already been submitted.");
    }

    if (
      processedRequestIds.has(intent.requestId) ||
      releaseRecords.hasRequestId(intent.requestId)
    ) {
      throw new Error("This unshield request has already been finalized.");
    }

    if (
      processedNoteIds.has(intent.noteId) ||
      releaseRecords.hasConsumedNoteId(intent.noteId)
    ) {
      throw new Error("This spendable note has already been returned to Public Wallet.");
    }

    if (
      processedTransitionNoteIds.has(intent.transitionNoteId) ||
      releaseRecords.hasTransitionNoteId(intent.transitionNoteId)
    ) {
      throw new Error("This unshield transition has already been finalized.");
    }

    await waitForEligibleUnshieldTransition({
      amount: intent.amount,
      client,
      destinationOwner: intent.destinationOwner,
      mintAddress,
      noteId: intent.noteId,
      owner: intent.owner,
      transitionNoteId: intent.transitionNoteId,
      transitionStateSignature: intent.transitionStateSignature,
      vaultOwner,
    });

    const keypair = await loadKeypairFromEnv("VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY");
    const signerAddress = keypair.signer.address.toString();

    if (signerAddress !== vaultOwner) {
      throw new Error("Configured operator signer does not match the Vanta vault owner.");
    }

    inFlightRequestIds.add(intent.requestId);

    let signature;

    try {
      signature = await client.helpers
        .splToken({
          mint: mintAddress,
          tokenProgram: "auto",
        })
        .sendTransfer({
          amount: intent.amount,
          authority: keypair.signer,
          destinationOwner: intent.destinationOwner,
          sourceOwner: vaultOwner,
        });
    } finally {
      inFlightRequestIds.delete(intent.requestId);
    }

    processedRequestIds.add(intent.requestId);
    processedNoteIds.add(intent.noteId);
    processedTransitionNoteIds.add(intent.transitionNoteId);
    releaseRecords.recordRelease({
      amount: intent.amount,
      completedAt: Date.now(),
      consumedNoteId: intent.noteId,
      destinationOwner: intent.destinationOwner,
      mintAddress,
      owner: intent.owner,
      releaseSignature: signature.toString(),
      requestId: intent.requestId,
      transitionNoteId: intent.transitionNoteId,
      vaultOwner,
    });

    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        noteId: intent.noteId,
        requestId: intent.requestId,
        signature: signature.toString(),
      }),
    );
  } catch (error) {
    writeCorsHeaders(response);
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(
      error instanceof Error
        ? error.message
        : "The unshield operator could not process the request.",
    );
  }
});

async function waitForEligibleSwapTransition(args) {
  let lastError = null;

  for (let attempt = 0; attempt < swapTransitionLookupAttempts; attempt += 1) {
    try {
      const onchainContext = await fetchConstrainedOnchainUnshieldContext({
        client: args.client,
        mintAddress: args.mintAddress,
        owner: args.owner,
        vaultOwner: args.vaultOwner,
      });

      assertEligibleSwapTransition({
        consumedNoteId: args.consumedNoteId,
        context: onchainContext,
        inputAmount: args.inputAmount,
        outputAmount: args.outputAmount,
        outputNoteId: args.outputNoteId,
        owner: args.owner,
        quoteExpiresAt: args.quoteExpiresAt,
        quoteId: args.quoteId,
        quoteTimestamp: args.quoteTimestamp,
        transitionNoteId: args.transitionNoteId,
        venueFamily: args.venueFamily,
        venueName: args.venueName,
        venueNetwork: args.venueNetwork,
        venuePoolAddress: args.venuePoolAddress,
        vaultOwner: args.vaultOwner,
      });

      return;
    } catch (error) {
      lastError = error;

      if (await verifySwapTransitionBySignature(args)) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      const canRetry =
        message === "Referenced onchain swap transition was not found." &&
        attempt < swapTransitionLookupAttempts - 1;

      if (!canRetry) {
        throw error;
      }

      await sleep(swapTransitionLookupDelayMs);
    }
  }

  throw lastError ?? new Error("Referenced onchain swap transition was not found.");
}

async function waitForEligibleUnshieldTransition(args) {
  let lastError = null;

  for (let attempt = 0; attempt < swapTransitionLookupAttempts; attempt += 1) {
    try {
      const onchainContext = await fetchConstrainedOnchainUnshieldContext({
        client: args.client,
        mintAddress: args.mintAddress,
        owner: args.owner,
        vaultOwner: args.vaultOwner,
      });

      assertEligibleUnshieldTransition({
        amount: args.amount,
        context: onchainContext,
        destinationOwner: args.destinationOwner,
        mintAddress: args.mintAddress,
        noteId: args.noteId,
        owner: args.owner,
        transitionNoteId: args.transitionNoteId,
        vaultOwner: args.vaultOwner,
      });

      return;
    } catch (error) {
      lastError = error;

      if (await verifyUnshieldTransitionBySignature(args)) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      const canRetry =
        message === "Referenced onchain unshield transition was not found." &&
        attempt < swapTransitionLookupAttempts - 1;

      if (!canRetry) {
        throw error;
      }

      await sleep(swapTransitionLookupDelayMs);
    }
  }

  throw lastError ?? new Error("Referenced onchain unshield transition was not found.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyUnshieldTransitionBySignature(args) {
  if (!args.transitionStateSignature) {
    return false;
  }

  try {
    const transaction = await web3Connection.getParsedTransaction(
      args.transitionStateSignature,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    );
    const memo = extractMemoFromParsedTransaction(transaction, VANTA_UNSHIELD_MEMO_PREFIX);

    if (!memo) {
      return false;
    }

    const payload = parseUnshieldMemoPayload(memo);

    return Boolean(
      payload &&
        payload.owner === args.owner &&
        payload.vaultOwner === args.vaultOwner &&
        payload.mintAddress === args.mintAddress &&
        payload.consumedNoteId === args.noteId &&
        payload.noteId === args.transitionNoteId &&
        payload.destinationOwner === args.destinationOwner &&
        payload.amount === args.amount,
    );
  } catch {
    return false;
  }
}

async function verifySwapTransitionBySignature(args) {
  if (!args.transitionStateSignature) {
    return false;
  }

  try {
    const transaction = await web3Connection.getParsedTransaction(
      args.transitionStateSignature,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    );
    const memo = extractMemoFromParsedTransaction(transaction, VANTA_SWAP_MEMO_PREFIX);

    if (!memo) {
      return false;
    }

    const payload = parseSwapMemoPayload(memo);

    return Boolean(
      payload &&
        payload.owner === args.owner &&
        payload.vaultOwner === args.vaultOwner &&
        payload.mintAddress === args.mintAddress &&
        payload.consumedNoteId === args.consumedNoteId &&
        payload.noteId === args.transitionNoteId &&
        payload.outputNoteId === args.outputNoteId &&
        payload.inputAmount === args.inputAmount &&
        payload.outputAmount === args.outputAmount &&
        payload.quoteId === args.quoteId &&
        payload.quoteTimestamp === args.quoteTimestamp &&
        payload.quoteExpiresAt === args.quoteExpiresAt &&
        payload.venueName === args.venueName &&
        payload.venueFamily === args.venueFamily &&
        payload.venueNetwork === args.venueNetwork &&
        payload.venuePoolAddress === args.venuePoolAddress,
    );
  } catch {
    return false;
  }
}

function extractMemoFromParsedTransaction(transaction, prefix) {
  const instructions = transaction?.transaction?.message?.instructions;

  if (!Array.isArray(instructions)) {
    return null;
  }

  for (const instruction of instructions) {
    const programId =
      typeof instruction?.programId?.toBase58 === "function"
        ? instruction.programId.toBase58()
        : instruction?.programId;

    if (programId !== VANTA_MEMO_PROGRAM_ID) {
      continue;
    }

    if (typeof instruction?.parsed === "string") {
      return instruction.parsed.includes(prefix) ? instruction.parsed : null;
    }

    if (typeof instruction?.parsed?.memo === "string") {
      return instruction.parsed.memo.includes(prefix) ? instruction.parsed.memo : null;
    }
  }

  return null;
}

function parseUnshieldMemoPayload(memo) {
  if (typeof memo !== "string") {
    return null;
  }

  const memoStart = memo.indexOf(VANTA_UNSHIELD_MEMO_PREFIX);

  if (memoStart === -1) {
    return null;
  }

  try {
    const parsed = JSON.parse(memo.slice(memoStart + VANTA_UNSHIELD_MEMO_PREFIX.length));

    return {
      amount: parsed.amount,
      consumedNoteId: parsed.consumedNoteId ?? parsed.consumedShieldStateSignature,
      destinationOwner: parsed.destinationOwner,
      mintAddress: parsed.mintAddress,
      noteId: parsed.noteId,
      owner: parsed.owner,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseSwapMemoPayload(memo) {
  if (typeof memo !== "string") {
    return null;
  }

  const memoStart = memo.indexOf(VANTA_SWAP_MEMO_PREFIX);

  if (memoStart === -1) {
    return null;
  }

  try {
    const parsed = JSON.parse(memo.slice(memoStart + VANTA_SWAP_MEMO_PREFIX.length));

    return {
      consumedNoteId: parsed.consumedNoteId ?? parsed.cn,
      inputAmount: parsed.inputAmount ?? parsed.ia,
      mintAddress: parsed.mintAddress ?? parsed.ma,
      noteId: parsed.noteId ?? parsed.ni,
      outputAmount: parsed.outputAmount ?? parsed.oa,
      outputNoteId: parsed.outputNoteId ?? parsed.on,
      owner: parsed.owner ?? parsed.ow,
      quoteExpiresAt: parsed.quoteExpiresAt ?? parsed.qe,
      quoteId: parsed.quoteId ?? parsed.qi,
      quoteTimestamp: parsed.quoteTimestamp ?? parsed.qt,
      vaultOwner: parsed.vaultOwner ?? parsed.vo,
      venueFamily: parsed.venueFamily ?? parsed.vf,
      venueName: parsed.venueName ?? parsed.vn,
      venueNetwork: parsed.venueNetwork ?? parsed.vw,
      venuePoolAddress: parsed.venuePoolAddress ?? parsed.vp,
    };
  } catch {
    return null;
  }
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Vanta operator listening on http://127.0.0.1:${port}`);
  console.log(`Vanta release store: ${releaseRecords.filePath}`);
  console.log(`Vanta swap store: ${swapRecords.filePath}`);
  console.log(`Vanta SOL unshield store: ${solUnshieldRecords.filePath}`);
});

function writeCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw || "{}");
}

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = stripQuotes(value);
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function solAmountToLamports(amount) {
  const lamports = Math.round(amount * LAMPORTS_PER_SOL);

  if (!Number.isSafeInteger(lamports) || lamports <= 0) {
    throw new Error("Invalid SOL amount for constrained release.");
  }

  return lamports;
}

function loadWeb3KeypairFromEnv(envKey) {
  const raw = process.env[envKey];

  if (!raw) {
    throw new Error(`${envKey} is required for SOL unshield release.`);
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${envKey} must be a JSON array of secret key bytes.`);
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}
