function collectRpcErrorText(error: unknown): string {
  const parts: string[] = [];

  if (error instanceof Error) {
    const cause = "cause" in error ? (error as { cause?: unknown }).cause : undefined;
    parts.push(error.name, error.message, collectRpcErrorText(cause));
  }

  if (typeof error === "object" && error !== null) {
    const typedError = error as {
      __code?: unknown;
      code?: unknown;
      context?: {
        code?: unknown;
        message?: unknown;
        status?: unknown;
        statusCode?: unknown;
      };
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };

    for (const value of [
      typedError.__code,
      typedError.code,
      typedError.status,
      typedError.statusCode,
      typedError.message,
      typedError.context?.code,
      typedError.context?.status,
      typedError.context?.statusCode,
      typedError.context?.message,
    ]) {
      if (typeof value === "string" || typeof value === "number") {
        parts.push(String(value));
      }
    }

    return parts.filter(Boolean).join(" ");
  }

  if (typeof error === "string") {
    parts.push(error);
  }

  return parts.filter(Boolean).join(" ");
}

export function isSolanaRpcRateLimitError(error: unknown) {
  const text = collectRpcErrorText(error).toLowerCase();

  return (
    text.includes("429") ||
    text.includes("-32005") ||
    text.includes("rate limit") ||
    text.includes("rate-limit") ||
    text.includes("too many requests") ||
    text.includes("Rate limit exceeded".toLowerCase()) ||
    text.includes("Too Many Requests".toLowerCase())
  );
}

export function isSolanaRpcHttpAccessError(error: unknown) {
  const text = collectRpcErrorText(error).toLowerCase();
  const hasSolanaHttpTransportError =
    text.includes("8100002") || text.includes("solana error #8100002");
  const hasHttpAccessStatus =
    text.includes("401") ||
    text.includes("403") ||
    text.includes("unauthorized") ||
    text.includes("forbidden") ||
    text.includes("Access forbidden".toLowerCase()) ||
    text.includes("missing api key") ||
    text.includes("api key is not allowed");

  return hasHttpAccessStatus || hasSolanaHttpTransportError;
}
