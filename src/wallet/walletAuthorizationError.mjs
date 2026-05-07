export const VANTA_WALLET_AUTHORIZATION_RECOVERY_MESSAGE =
  "Wallet authorization expired for this Solana account. Disconnect and reconnect the Solana account in Vanta, then approve Shield again.";

function readErrorCode(error) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = error.code ?? error.context?.code ?? error.context?.__code;

  return typeof code === "number" || typeof code === "string" ? code : null;
}

function readErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const message = error.message ?? error.shortMessage;

    if (typeof message === "string") {
      return message;
    }
  }

  return "";
}

function readNestedErrors(error) {
  if (typeof error !== "object" || error === null) {
    return [];
  }

  return [
    error.cause,
    error.error,
    error.data?.error,
    error.data?.originalError,
  ].filter(Boolean);
}

export function isVantaWalletAuthorizationError(error, seen = new Set()) {
  if (typeof error === "object" && error !== null) {
    if (seen.has(error)) {
      return false;
    }

    seen.add(error);
  }

  const code = readErrorCode(error);
  if (code === 4100 || code === "4100") {
    return true;
  }

  const normalizedMessage = readErrorMessage(error).toLowerCase();
  if (
    normalizedMessage.includes("requested method") &&
    normalizedMessage.includes("account") &&
    normalizedMessage.includes("authorized by the user")
  ) {
    return true;
  }

  if (
    normalizedMessage.includes("account has not been authorized") ||
    normalizedMessage.includes("account is not authorized")
  ) {
    return true;
  }

  return readNestedErrors(error).some((nestedError) =>
    isVantaWalletAuthorizationError(nestedError, seen),
  );
}

export function toVantaWalletAuthorizationRecoveryMessage(error) {
  return isVantaWalletAuthorizationError(error)
    ? VANTA_WALLET_AUTHORIZATION_RECOVERY_MESSAGE
    : null;
}
