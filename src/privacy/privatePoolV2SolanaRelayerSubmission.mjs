import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

const SOLANA_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta Private Pool v2 Solana relayer requires ${fieldName}.`);
  }

  return value.trim();
}

function parseKeypairJson(value) {
  const parsed = JSON.parse(requireText(value, "relayer keypair JSON"));
  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error("Vanta Private Pool v2 Solana relayer keypair JSON must be a 64-byte array.");
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

function decodeSerializedTransaction(value) {
  const serialized = requireText(value, "serializedTransaction");
  const base64 = serialized.startsWith("base64:") ? serialized.slice("base64:".length) : serialized;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error("Vanta Private Pool v2 Solana relayer requires base64 serializedTransaction.");
  }

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== base64) {
    throw new Error("Vanta Private Pool v2 Solana relayer requires base64 serializedTransaction.");
  }

  return Uint8Array.from(bytes);
}

export function isVantaSolanaTransactionSignature(value) {
  return SOLANA_SIGNATURE_PATTERN.test(String(value ?? ""));
}

export function createVantaPrivatePoolV2SolanaRelayerSubmitter({
  commitment = "confirmed",
  connection,
  deserializeTransaction = VersionedTransaction.deserialize,
  relayerKeypair,
  sendOptions = {},
} = {}) {
  if (!connection) {
    throw new Error("Vanta Private Pool v2 Solana relayer requires a connection.");
  }
  if (!relayerKeypair) {
    throw new Error("Vanta Private Pool v2 Solana relayer requires a relayer keypair.");
  }

  return {
    async submitPrivateSpend({
      proofReceiptId,
      publicInputCommitment,
      serializedTransaction,
      settlementId,
    }) {
      requireText(proofReceiptId, "proofReceiptId");
      requireText(publicInputCommitment, "publicInputCommitment");
      requireText(settlementId, "settlementId");

      const transaction = deserializeTransaction(decodeSerializedTransaction(serializedTransaction));
      if (typeof transaction.sign !== "function" || typeof transaction.serialize !== "function") {
        throw new Error("Vanta Private Pool v2 Solana relayer requires a signable transaction.");
      }

      transaction.sign([relayerKeypair]);
      const signedBytes = transaction.serialize();
      const simulation = await connection.simulateTransaction(transaction, {
        sigVerify: true,
      });
      if (simulation?.value?.err) {
        throw new Error(`Vanta Private Pool v2 Solana relayer simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }

      const signature = await connection.sendRawTransaction(signedBytes, {
        maxRetries: 3,
        preflightCommitment: commitment,
        skipPreflight: false,
        ...sendOptions,
      });
      if (!isVantaSolanaTransactionSignature(signature)) {
        throw new Error("Vanta Private Pool v2 Solana relayer returned a non-Solana transaction signature.");
      }

      return {
        relayerId: `solana-relayer:${relayerKeypair.publicKey.toBase58()}`,
        signature,
        submittedBy: "relayer",
      };
    },
  };
}

export function createVantaPrivatePoolV2SolanaRelayerSubmitterFromEnv(env = process.env) {
  const rpcUrl = requireText(env.VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL, "VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL");
  const keypairJson = requireText(
    env.VANTA_PRIVATE_POOL_V2_RELAYER_FEE_PAYER_KEYPAIR_JSON,
    "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_PAYER_KEYPAIR_JSON",
  );
  const ack = requireText(
    env.VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMIT_ACK,
    "VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMIT_ACK",
  );
  if (ack !== "I_UNDERSTAND_THIS_RELAYER_CAN_SUBMIT_SOLANA_MAINNET_TRANSACTIONS") {
    throw new Error("Vanta Private Pool v2 Solana relayer submit ACK is not accepted.");
  }

  return createVantaPrivatePoolV2SolanaRelayerSubmitter({
    connection: new Connection(rpcUrl, "confirmed"),
    relayerKeypair: parseKeypairJson(keypairJson),
  });
}
