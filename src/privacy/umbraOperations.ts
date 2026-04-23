import type { WalletSession } from "@solana/client";
import {
  createUmbraClientFromWalletSession,
  loadUmbraSdk,
  type UmbraClient,
  type UmbraWalletAdapterGate,
} from "./umbraClient";
import type { UmbraRuntimeConfig } from "./umbraConfig";

type OptionalUmbraClientArgs = {
  client?: UmbraClient;
  config?: UmbraRuntimeConfig;
  humanApprovedOperationSummary?: boolean;
  operationApprovalNow?: number;
  operationApprovalSummary?: UmbraOperationApprovalSummary;
  walletAdapterGate?: UmbraWalletAdapterGate;
  walletSession?: WalletSession;
};

type UmbraOperationBaseArgs = OptionalUmbraClientArgs & {
  awaitCallback?: boolean;
};

export type UmbraOperationKind =
  | "deposit-public-to-encrypted-balance"
  | "query-encrypted-balances"
  | "register-user"
  | "scan-claimable-utxos"
  | "withdraw-encrypted-to-public-balance";

const UMBRA_TRANSACTION_OPERATION_KINDS = new Set<UmbraOperationKind>([
  "deposit-public-to-encrypted-balance",
  "register-user",
  "withdraw-encrypted-to-public-balance",
]);

export type UmbraOperationApprovalSummary = {
  amount: string;
  asset: string;
  destinationAddress: string;
  expiresAt: number;
  intentKind: "message" | "transaction";
  issuedAt: number;
  kind: "vanta-umbra-operation-approval-summary";
  mintAddress: string;
  operationKind: UmbraOperationKind;
  requester: string;
  requiresHumanApproval: true;
  requiresWalletMessageApproval: boolean;
  requiresWalletTransactionApproval: boolean;
  version: "vanta-umbra-operation-approval-summary-0.1";
};

export type UmbraOperationApprovalDisplay = {
  expiresAt: number;
  rows: Array<{
    label: string;
    value: string;
  }>;
  signingMode: "Message approval" | "Transaction approval";
  title: string;
  walletPrompt: string;
};

export function createUmbraOperationWalletAdapterGate({
  humanApprovedSummary,
  intentKind,
  now = Date.now(),
  ttlMs = 2 * 60 * 1000,
  walletSession,
}: {
  humanApprovedSummary: boolean;
  intentKind: "message" | "transaction";
  now?: number;
  ttlMs?: number;
  walletSession: WalletSession;
}): UmbraWalletAdapterGate {
  return {
    connectedWalletAddress: walletSession.account.address,
    expiresAt: now + ttlMs,
    humanApprovedSummary,
    issuedAt: now,
    messageIntentApproved: intentKind === "message",
    privateKeyMaterialHandled: false,
    requester: walletSession.account.address,
    transactionIntentApproved: intentKind === "transaction",
  };
}

function requireUmbraOperationText(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta Umbra operation approval requires ${fieldName}.`);
  }

  return value.trim();
}

function requireUmbraOperationTimestamp(value: unknown, fieldName: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`Vanta Umbra operation approval requires ${fieldName}.`);
  }

  return Number(value);
}

function requireMatchingUmbraOperationApprovalSummary(
  summary: UmbraOperationApprovalSummary | undefined,
  {
    amount,
    asset,
    destinationAddress,
    mintAddress,
    operationKind,
    requester,
  }: {
    amount?: string;
    asset?: string;
    destinationAddress?: string;
    mintAddress?: string;
    operationKind: UmbraOperationKind;
    requester: string;
  },
) {
  if (!summary) {
    throw new Error(`Vanta Umbra operation requires an approval summary for ${operationKind}.`);
  }

  if (summary.operationKind !== operationKind) {
    throw new Error(`Vanta Umbra operation approval summary kind mismatch for ${operationKind}.`);
  }

  if (summary.requester !== requester) {
    throw new Error("Vanta Umbra operation approval summary requester mismatch.");
  }

  if (amount !== undefined && summary.amount !== amount) {
    throw new Error("Vanta Umbra operation approval summary amount mismatch.");
  }

  if (asset !== undefined && summary.asset !== asset) {
    throw new Error("Vanta Umbra operation approval summary asset mismatch.");
  }

  if (destinationAddress !== undefined && summary.destinationAddress !== destinationAddress) {
    throw new Error("Vanta Umbra operation approval summary destination mismatch.");
  }

  if (mintAddress !== undefined && summary.mintAddress !== mintAddress) {
    throw new Error("Vanta Umbra operation approval summary mint mismatch.");
  }

  return summary;
}

export function createUmbraOperationApprovalSummary({
  amount = "not applicable",
  asset = "Umbra private balance",
  destinationAddress = "not applicable",
  expiresAt,
  issuedAt,
  mintAddress = "not applicable",
  operationKind,
  requester,
}: {
  amount?: string;
  asset?: string;
  destinationAddress?: string;
  expiresAt: number;
  issuedAt: number;
  mintAddress?: string;
  operationKind: UmbraOperationKind;
  requester: string;
}): UmbraOperationApprovalSummary {
  const normalizedOperationKind = requireUmbraOperationText(operationKind, "operationKind") as UmbraOperationKind;
  const intentKind = UMBRA_TRANSACTION_OPERATION_KINDS.has(normalizedOperationKind) ? "transaction" : "message";
  const normalizedIssuedAt = requireUmbraOperationTimestamp(issuedAt, "issuedAt");
  const normalizedExpiresAt = requireUmbraOperationTimestamp(expiresAt, "expiresAt");

  if (normalizedExpiresAt <= normalizedIssuedAt) {
    throw new Error("Vanta Umbra operation approval requires expiresAt after issuedAt.");
  }

  return {
    amount: requireUmbraOperationText(amount, "amount"),
    asset: requireUmbraOperationText(asset, "asset"),
    destinationAddress: requireUmbraOperationText(destinationAddress, "destinationAddress"),
    expiresAt: normalizedExpiresAt,
    intentKind,
    issuedAt: normalizedIssuedAt,
    kind: "vanta-umbra-operation-approval-summary",
    mintAddress: requireUmbraOperationText(mintAddress, "mintAddress"),
    operationKind: normalizedOperationKind,
    requester: requireUmbraOperationText(requester, "requester"),
    requiresHumanApproval: true,
    requiresWalletMessageApproval: intentKind === "message",
    requiresWalletTransactionApproval: intentKind === "transaction",
    version: "vanta-umbra-operation-approval-summary-0.1",
  };
}

function formatUmbraOperationBaseUnitAmount(value: bigint | number | string) {
  return value.toString();
}

function formatUmbraQueryMintSummary(mintAddresses: readonly string[]) {
  return mintAddresses.join(",");
}

export function createUmbraRegisterUserApprovalSummary({
  expiresAt,
  issuedAt,
  requester,
}: {
  expiresAt: number;
  issuedAt: number;
  requester: string;
}) {
  return createUmbraOperationApprovalSummary({
    expiresAt,
    issuedAt,
    operationKind: "register-user",
    requester,
  });
}

export function createUmbraEncryptedBalanceQueryApprovalSummary({
  expiresAt,
  issuedAt,
  mintAddresses,
  requester,
}: {
  expiresAt: number;
  issuedAt: number;
  mintAddresses: readonly string[];
  requester: string;
}) {
  return createUmbraOperationApprovalSummary({
    asset: "Umbra private balance",
    destinationAddress: "not applicable",
    expiresAt,
    issuedAt,
    mintAddress: formatUmbraQueryMintSummary(mintAddresses),
    operationKind: "query-encrypted-balances",
    requester,
  });
}

export function createUmbraDepositApprovalSummary({
  amountBaseUnits,
  destinationAddress,
  expiresAt,
  issuedAt,
  mintAddress,
  requester,
}: {
  amountBaseUnits: bigint | number | string;
  destinationAddress?: string;
  expiresAt: number;
  issuedAt: number;
  mintAddress: string;
  requester: string;
}) {
  return createUmbraOperationApprovalSummary({
    amount: formatUmbraOperationBaseUnitAmount(amountBaseUnits),
    destinationAddress: destinationAddress ?? requester,
    expiresAt,
    issuedAt,
    mintAddress,
    operationKind: "deposit-public-to-encrypted-balance",
    requester,
  });
}

export function createUmbraWithdrawApprovalSummary({
  amountBaseUnits,
  destinationAddress,
  expiresAt,
  issuedAt,
  mintAddress,
  requester,
}: {
  amountBaseUnits: bigint | number | string;
  destinationAddress?: string;
  expiresAt: number;
  issuedAt: number;
  mintAddress: string;
  requester: string;
}) {
  return createUmbraOperationApprovalSummary({
    amount: formatUmbraOperationBaseUnitAmount(amountBaseUnits),
    destinationAddress: destinationAddress ?? requester,
    expiresAt,
    issuedAt,
    mintAddress,
    operationKind: "withdraw-encrypted-to-public-balance",
    requester,
  });
}

export function createUmbraClaimableUtxoScanApprovalSummary({
  expiresAt,
  issuedAt,
  requester,
  treeIndex,
}: {
  expiresAt: number;
  issuedAt: number;
  requester: string;
  treeIndex: number;
}) {
  return createUmbraOperationApprovalSummary({
    asset: "Umbra private balance",
    destinationAddress: "not applicable",
    expiresAt,
    issuedAt,
    mintAddress: `tree:${treeIndex}`,
    operationKind: "scan-claimable-utxos",
    requester,
  });
}

export function createUmbraOperationApprovalDisplay(
  summary: UmbraOperationApprovalSummary,
): UmbraOperationApprovalDisplay {
  const titleByOperation = {
    "deposit-public-to-encrypted-balance": "Shield into private balance",
    "query-encrypted-balances": "Private balance lookup",
    "register-user": "Private balance registration",
    "scan-claimable-utxos": "Claimable private funds scan",
    "withdraw-encrypted-to-public-balance": "Withdraw private balance",
  } satisfies Record<UmbraOperationKind, string>;

  const rows = [
    { label: "Action", value: titleByOperation[summary.operationKind] },
    { label: "Asset", value: summary.asset },
    { label: "Amount", value: summary.amount },
    { label: "Mint", value: summary.mintAddress },
    { label: "Destination", value: summary.destinationAddress },
    { label: "Wallet", value: summary.requester },
  ];

  return {
    expiresAt: summary.expiresAt,
    rows,
    signingMode:
      summary.intentKind === "transaction" ? "Transaction approval" : "Message approval",
    title: titleByOperation[summary.operationKind],
    walletPrompt: "Wallet approval",
  };
}

export function validateUmbraOperationApprovalSummary(
  summary: UmbraOperationApprovalSummary,
  {
    connectedWalletAddress,
    humanApprovedSummary,
    now = Date.now(),
    privateKeyMaterialHandled = false,
  }: {
    connectedWalletAddress?: string;
    humanApprovedSummary?: boolean;
    now?: number;
    privateKeyMaterialHandled?: boolean;
  } = {},
) {
  if (summary?.kind !== "vanta-umbra-operation-approval-summary") {
    return {
      accepted: false,
      reason: "invalid-umbra-operation-summary-kind",
    };
  }

  if (summary.expiresAt <= now) {
    return {
      accepted: false,
      reason: "umbra-operation-summary-expired",
    };
  }

  if (connectedWalletAddress && connectedWalletAddress !== summary.requester) {
    return {
      accepted: false,
      reason: "umbra-operation-wallet-mismatch",
    };
  }

  if (privateKeyMaterialHandled) {
    return {
      accepted: false,
      reason: "private-key-material-handled",
    };
  }

  if (!humanApprovedSummary) {
    return {
      accepted: false,
      reason: "human-approval-required",
    };
  }

  return {
    accepted: true,
    reason: "umbra-operation-ready-for-wallet-approval",
  };
}

export function createUmbraOperationWalletAdapterGateFromSummary({
  connectedWalletAddress,
  humanApprovedSummary,
  now,
  privateKeyMaterialHandled,
  summary,
}: {
  connectedWalletAddress: string;
  humanApprovedSummary: boolean;
  now?: number;
  privateKeyMaterialHandled?: boolean;
  summary: UmbraOperationApprovalSummary;
}): UmbraWalletAdapterGate {
  const decision = validateUmbraOperationApprovalSummary(summary, {
    connectedWalletAddress,
    humanApprovedSummary,
    now,
    privateKeyMaterialHandled,
  });

  if (!decision.accepted) {
    throw new Error(`Umbra operation approval blocked: ${decision.reason}.`);
  }

  return {
    connectedWalletAddress,
    expiresAt: summary.expiresAt,
    humanApprovedSummary,
    issuedAt: summary.issuedAt,
    messageIntentApproved: summary.intentKind === "message",
    privateKeyMaterialHandled,
    requester: summary.requester,
    transactionIntentApproved: summary.intentKind === "transaction",
  };
}

async function resolveUmbraClient(args: OptionalUmbraClientArgs) {
  if (args.client) {
    return args.client;
  }

  if (!args.walletSession) {
    throw new Error("A connected wallet session is required for Umbra operations.");
  }

  return createUmbraClientFromWalletSession({
    config: args.config,
    walletAdapterGate: args.walletAdapterGate,
    walletSession: args.walletSession,
  });
}

async function resolveUmbraOperationClient(
  args: OptionalUmbraClientArgs,
  operation: {
    amount?: string;
    asset?: string;
    destinationAddress?: string;
    mintAddress?: string;
    operationKind: UmbraOperationKind;
  },
) {
  if (args.client) {
    return args.client;
  }

  if (!args.walletSession) {
    throw new Error("A connected wallet session is required for Umbra operations.");
  }

  const walletAdapterGate =
    args.walletAdapterGate ??
    createUmbraOperationWalletAdapterGateFromSummary({
      connectedWalletAddress: args.walletSession.account.address,
      humanApprovedSummary: args.humanApprovedOperationSummary === true,
      now: args.operationApprovalNow,
      privateKeyMaterialHandled: false,
      summary: requireMatchingUmbraOperationApprovalSummary(args.operationApprovalSummary, {
        ...operation,
        requester: args.walletSession.account.address,
      }),
    });

  return resolveUmbraClient({
    ...args,
    walletAdapterGate,
  });
}

export async function registerUmbraUser(args: UmbraOperationBaseArgs) {
  const client = await resolveUmbraOperationClient(args, {
    operationKind: "register-user",
  });
  const sdk = await loadUmbraSdk();
  const register = sdk.getUserRegistrationFunction({ client });

  return register({
    anonymous: true,
    confidential: true,
  });
}

export async function queryUmbraEncryptedBalances(
  args: OptionalUmbraClientArgs & {
    mintAddresses: readonly string[];
  },
) {
  const client = await resolveUmbraOperationClient(args, {
    asset: "Umbra private balance",
    destinationAddress: "not applicable",
    mintAddress: args.mintAddresses.join(","),
    operationKind: "query-encrypted-balances",
  });
  const sdk = await loadUmbraSdk();
  const query = sdk.getEncryptedBalanceQuerierFunction({ client });

  return query(args.mintAddresses as never);
}

export async function depositPublicBalanceToUmbraEncryptedBalance(
  args: UmbraOperationBaseArgs & {
    amountBaseUnits: bigint;
    destinationAddress?: string;
    mintAddress: string;
  },
) {
  const destinationAddress = args.destinationAddress ?? args.walletSession?.account.address;
  const client = await resolveUmbraOperationClient(args, {
    amount: args.amountBaseUnits.toString(),
    destinationAddress,
    mintAddress: args.mintAddress,
    operationKind: "deposit-public-to-encrypted-balance",
  });
  const sdk = await loadUmbraSdk();
  const deposit = sdk.getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });

  return deposit(
    (args.destinationAddress ?? client.signer.address) as never,
    args.mintAddress as never,
    args.amountBaseUnits as never,
    undefined,
  );
}

export async function withdrawUmbraEncryptedBalanceToPublicBalance(
  args: UmbraOperationBaseArgs & {
    amountBaseUnits: bigint;
    destinationAddress?: string;
    mintAddress: string;
  },
) {
  const destinationAddress = args.destinationAddress ?? args.walletSession?.account.address;
  const client = await resolveUmbraOperationClient(args, {
    amount: args.amountBaseUnits.toString(),
    destinationAddress,
    mintAddress: args.mintAddress,
    operationKind: "withdraw-encrypted-to-public-balance",
  });
  const sdk = await loadUmbraSdk();
  const withdraw = sdk.getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({
    client,
  });

  return withdraw(
    (args.destinationAddress ?? client.signer.address) as never,
    args.mintAddress as never,
    args.amountBaseUnits as never,
    undefined,
  );
}

export async function scanUmbraClaimableUtxos(
  args: OptionalUmbraClientArgs & {
    endInsertionIndex?: number;
    startInsertionIndex: number;
    treeIndex: number;
  },
) {
  const client = await resolveUmbraOperationClient(args, {
    asset: "Umbra private balance",
    destinationAddress: "not applicable",
    mintAddress: `tree:${args.treeIndex}`,
    operationKind: "scan-claimable-utxos",
  });
  const sdk = await loadUmbraSdk();
  const scan = sdk.getClaimableUtxoScannerFunction({ client });

  return scan(
    BigInt(args.treeIndex) as never,
    BigInt(args.startInsertionIndex) as never,
    args.endInsertionIndex === undefined ? undefined : (BigInt(args.endInsertionIndex) as never),
  );
}

export function getUmbraMixerProverStatus() {
  return {
    ready: false,
    reason:
      "@umbra-privacy/web-zk-prover currently advertises an older SDK peer than @umbra-privacy/sdk@4.0.0, so Vanta keeps prover-backed mixer create/claim execution behind an explicit prover seam until compatibility is confirmed.",
  };
}
