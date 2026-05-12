import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

import {
  VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES,
  validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction,
} from "./privatePoolV2SolanaSpendTransaction.mjs";

const SOLANA_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const forbiddenProofSpendTerms = [
  "onChainVerifier",
  "proof",
  "proof_artifact",
  "proof_bytes",
  "proofArtifact",
  "proofBackend",
  "proofBytes",
  "proofSystem",
  "verifierProgramId",
  "verifier_program_id",
  "verifying_key_hash",
  "verifyingKey",
  "verifyingKeyHash",
];

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
  if (bytes.length > VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES) {
    throw new Error(
      `Vanta Private Pool v2 Solana relayer serializedTransaction exceeds ${VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES} bytes.`,
    );
  }

  return Uint8Array.from(bytes);
}

function assertNoForbiddenProofTerms(value, path = "transaction") {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenProofSpendTerms.includes(key)) {
      throw new Error(`Vanta Private Pool v2 Solana relayer forbids ${path}.${key}.`);
    }
    assertNoForbiddenProofTerms(child, `${path}.${key}`);
  }
}

export function isVantaSolanaTransactionSignature(value) {
  return SOLANA_SIGNATURE_PATTERN.test(String(value ?? ""));
}

export function createVantaPrivatePoolV2SolanaRelayerSubmitter({
  commitment = "confirmed",
  connection,
  deserializeTransaction = VersionedTransaction.deserialize,
  relayerKeypair,
  requireExpectedBindings = false,
  sendOptions = {},
} = {}) {
  if (!connection) {
    throw new Error("Vanta Private Pool v2 Solana relayer requires a connection.");
  }
  if (!relayerKeypair) {
    throw new Error("Vanta Private Pool v2 Solana relayer requires a relayer keypair.");
  }

  return {
    async submitPrivateSpend(input = {}) {
      assertNoForbiddenProofTerms(input);
      const {
        expectedAccounts,
        expectedPublicInputs,
        proofReceiptId,
        publicInputCommitment,
        serializedTransaction,
        settlementId,
      } = input;
      requireText(proofReceiptId, "proofReceiptId");
      requireText(publicInputCommitment, "publicInputCommitment");
      requireText(settlementId, "settlementId");

      const serializedTransactionBytes = decodeSerializedTransaction(serializedTransaction);
      if (requireExpectedBindings && (!expectedAccounts || !expectedPublicInputs)) {
        throw new Error(
          "Vanta Private Pool v2 Solana relayer requires expectedAccounts and expectedPublicInputs before signing live spend bytes.",
        );
      }
      if (expectedAccounts || expectedPublicInputs) {
        validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction({
          expectedAccounts: {
            ...expectedAccounts,
            operatorAuthority:
              expectedAccounts?.operatorAuthority ?? relayerKeypair.publicKey.toBase58(),
            relayerFeePayer:
              expectedAccounts?.relayerFeePayer ?? relayerKeypair.publicKey.toBase58(),
          },
          expectedPublicInputs,
          requireExpectedAccounts: requireExpectedBindings,
          requireExpectedPublicInputs: Boolean(expectedPublicInputs),
          serializedTransaction,
        });
      }

      const transaction = deserializeTransaction(serializedTransactionBytes);
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
    requireExpectedBindings: true,
  });
}
