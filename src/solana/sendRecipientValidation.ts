import { PublicKey } from "@solana/web3.js";

export const SEND_RECIPIENT_MAX_LENGTH = 64;

export type SendRecipientInputSource = "typed" | "pasted" | "recent";

type BaseSendRecipientValidationResult = {
  detail: string;
  inputSource: SendRecipientInputSource;
  isSelf: boolean;
  normalizedRecipient: string;
  ready: boolean;
  resolutionRequired: boolean;
  statusLabel: string;
  tone: "neutral" | "warning" | "success" | "error";
};

export type SendRecipientValidationResult =
  | (BaseSendRecipientValidationResult & {
      kind: "empty";
      ready: false;
    })
  | (BaseSendRecipientValidationResult & {
      kind: "too-long";
      ready: false;
    })
  | (BaseSendRecipientValidationResult & {
      kind: "sol-name-unsupported";
      ready: false;
      resolutionRequired: true;
    })
  | (BaseSendRecipientValidationResult & {
      kind: "invalid-address";
      ready: false;
    })
  | (BaseSendRecipientValidationResult & {
      kind: "off-curve-address";
      ready: false;
    })
  | (BaseSendRecipientValidationResult & {
      canonicalAddress: string;
      kind: "solana-address";
      ready: true;
      resolutionRequired: false;
    });

function normalizeSelfAddress(selfAddress: string | null | undefined): string | null {
  if (!selfAddress) {
    return null;
  }

  const trimmed = selfAddress.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new PublicKey(trimmed).toBase58();
  } catch {
    return trimmed;
  }
}

export function validateLiveSendRecipient(
  input: string,
  selfAddress: string | null | undefined = null,
  inputSource: SendRecipientInputSource = "typed",
): SendRecipientValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      detail: "Enter a recipient wallet address.",
      inputSource,
      isSelf: false,
      kind: "empty",
      normalizedRecipient: "",
      ready: false,
      resolutionRequired: false,
      statusLabel: "Recipient address required",
      tone: "neutral",
    };
  }

  if (trimmed.length > SEND_RECIPIENT_MAX_LENGTH) {
    return {
      detail: "Recipient address is too long.",
      inputSource,
      isSelf: false,
      kind: "too-long",
      normalizedRecipient: trimmed.slice(0, SEND_RECIPIENT_MAX_LENGTH),
      ready: false,
      resolutionRequired: false,
      statusLabel: "Recipient address too long",
      tone: "error",
    };
  }

  if (trimmed.toLowerCase().endsWith(".sol")) {
    return {
      detail:
        "Paste the resolved Solana wallet address. .sol resolution is not enabled in this beta lane.",
      inputSource,
      isSelf: false,
      kind: "sol-name-unsupported",
      normalizedRecipient: trimmed,
      ready: false,
      resolutionRequired: true,
      statusLabel: "Solana name resolution required",
      tone: "warning",
    };
  }

  try {
    const publicKey = new PublicKey(trimmed);

    if (!PublicKey.isOnCurve(publicKey.toBytes())) {
      return {
        detail: "Recipient must be a wallet address, not an off-curve program address.",
        inputSource,
        isSelf: false,
        kind: "off-curve-address",
        normalizedRecipient: publicKey.toBase58(),
        ready: false,
        resolutionRequired: false,
        statusLabel: "Wallet address required",
        tone: "error",
      };
    }

    const canonicalAddress = publicKey.toBase58();
    const canonicalSelfAddress = normalizeSelfAddress(selfAddress);

    return {
      canonicalAddress,
      detail:
        inputSource === "pasted"
          ? "Paste validated as a Solana address."
          : "Base58-valid Solana address. External recipient delivery still requires viewing-key exchange.",
      inputSource,
      isSelf: canonicalSelfAddress === canonicalAddress,
      kind: "solana-address",
      normalizedRecipient: canonicalAddress,
      ready: true,
      resolutionRequired: false,
      statusLabel: "Base58-valid Solana address",
      tone: "success",
    };
  } catch {
    return {
      detail: "Enter a base58 Solana wallet address.",
      inputSource,
      isSelf: false,
      kind: "invalid-address",
      normalizedRecipient: trimmed,
      ready: false,
      resolutionRequired: false,
      statusLabel: "Invalid Solana address",
      tone: "error",
    };
  }
}
