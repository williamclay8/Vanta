export declare const VANTA_WALLET_AUTHORIZATION_RECOVERY_MESSAGE: string;

export declare function isVantaWalletAuthorizationError(
  error: unknown,
  seen?: Set<object>,
): boolean;

export declare function toVantaWalletAuthorizationRecoveryMessage(
  error: unknown,
): string | null;
