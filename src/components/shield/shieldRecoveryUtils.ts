import { isSolanaRpcHttpAccessError, isSolanaRpcRateLimitError } from "@/solana/rpcErrors";

export function toRecoverableSolDepositsErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (isSolanaRpcRateLimitError(error)) {
    return "The public Solana RPC is rate-limited while checking recent SOL vault deposits. Try again in a moment; Vanta will not ask for another transfer.";
  }

  if (isSolanaRpcHttpAccessError(error)) {
    return "Recent SOL vault deposits could not be checked because the browser RPC endpoint blocked access. Try a browser-compatible mainnet RPC; Vanta will not ask for another transfer.";
  }

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("load failed") ||
    normalizedMessage.includes("networkerror") ||
    message.includes("-32600") ||
    message.includes("getTransaction") ||
    normalizedMessage.includes("solana rpc")
  ) {
    return "Recent SOL vault deposits could not be checked because the browser RPC endpoint blocked the request. Vanta will not ask for another transfer.";
  }

  return error instanceof Error ? error.message : "Recent SOL vault deposits could not be checked.";
}
