import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@solana/client";
import { loadKeypairFromEnv } from "@solana/client/server";

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

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    writeCorsHeaders(response);
    response.writeHead(204);
    response.end();
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
    const parsedAmount = Number(body.amount);

    if (
      typeof body.destinationOwner !== "string" ||
      typeof body.noteId !== "string" ||
      typeof body.owner !== "string" ||
      body.mintAddress !== mintAddress ||
      body.vaultOwner !== vaultOwner ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      throw new Error("Invalid constrained unshield request.");
    }

    const keypair = await loadKeypairFromEnv("VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY");
    const signerAddress = keypair.signer.address.toString();

    if (signerAddress !== vaultOwner) {
      throw new Error("Configured operator signer does not match the Vanta vault owner.");
    }

    const signature = await client.helpers
      .splToken({
        mint: mintAddress,
        tokenProgram: "auto",
      })
      .sendTransfer({
        amount: body.amount,
        authority: keypair.signer,
        destinationOwner: body.destinationOwner,
        sourceOwner: vaultOwner,
      });

    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        noteId: body.noteId,
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

server.listen(port, "127.0.0.1", () => {
  console.log(`Vanta unshield operator listening on http://127.0.0.1:${port}/unshield`);
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
