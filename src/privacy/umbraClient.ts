import type { WalletSession } from "@solana/client";
import type {
  GetUmbraClientArgs,
  GetUmbraClientDeps,
} from "@umbra-privacy/sdk";
import {
  getUmbraRuntimeReadiness,
  umbraRuntimeConfig,
  type UmbraRuntimeConfig,
} from "./umbraConfig";

export type UmbraSdkModule = typeof import("@umbra-privacy/sdk");
export type UmbraClient = Awaited<ReturnType<UmbraSdkModule["getUmbraClient"]>>;
export type UmbraSigner = GetUmbraClientArgs["signer"];

export type CreateUmbraClientArgs = {
  config?: UmbraRuntimeConfig;
  deferMasterSeedSignature?: boolean;
  deps?: GetUmbraClientDeps;
  walletAdapterGate?: UmbraWalletAdapterGate;
  walletSession: WalletSession;
};

export type UmbraWalletAdapterGate = {
  connectedWalletAddress: string;
  expiresAt: number;
  humanApprovedSummary: boolean;
  issuedAt: number;
  messageIntentApproved: boolean;
  privateKeyMaterialHandled?: boolean;
  requester: string;
  transactionIntentApproved: boolean;
};

export function validateUmbraWalletAdapterGate(
  gate: UmbraWalletAdapterGate | undefined,
  intentKind: "message" | "transaction",
) {
  if (!gate) {
    return {
      accepted: false,
      reason: "umbra-wallet-adapter-gate-required",
    };
  }

  if (gate.connectedWalletAddress !== gate.requester) {
    return {
      accepted: false,
      reason: "wallet-requester-mismatch",
    };
  }

  if (!Number.isFinite(gate.issuedAt) || !Number.isFinite(gate.expiresAt) || gate.expiresAt <= gate.issuedAt) {
    return {
      accepted: false,
      reason: "umbra-wallet-adapter-expiry-required",
    };
  }

  if (gate.expiresAt <= Date.now()) {
    return {
      accepted: false,
      reason: "umbra-wallet-adapter-gate-expired",
    };
  }

  if (gate.privateKeyMaterialHandled) {
    return {
      accepted: false,
      reason: "private-key-material-handled",
    };
  }

  if (!gate.humanApprovedSummary) {
    return {
      accepted: false,
      reason: "human-approval-required",
    };
  }

  if (intentKind === "message" && !gate.messageIntentApproved) {
    return {
      accepted: false,
      reason: "umbra-message-intent-approval-required",
    };
  }

  if (intentKind === "transaction" && !gate.transactionIntentApproved) {
    return {
      accepted: false,
      reason: "umbra-transaction-intent-approval-required",
    };
  }

  return {
    accepted: true,
    reason:
      intentKind === "message"
        ? "umbra-message-intent-approved"
        : "umbra-transaction-intent-approved",
  };
}

function requireUmbraWalletAdapterGate(
  gate: UmbraWalletAdapterGate | undefined,
  intentKind: "message" | "transaction",
) {
  const decision = validateUmbraWalletAdapterGate(gate, intentKind);

  if (!decision.accepted) {
    throw new Error(`Umbra wallet adapter signing blocked: ${decision.reason}.`);
  }

  return decision;
}

export function createUmbraSignerFromWalletSession(
  walletSession: WalletSession,
  walletAdapterGate?: UmbraWalletAdapterGate,
): UmbraSigner {
  if (!walletSession.signMessage) {
    throw new Error("Umbra requires a wallet that supports message signing.");
  }

  if (!walletSession.signTransaction) {
    throw new Error("Umbra requires a wallet that supports transaction signing.");
  }

  const signMessage = walletSession.signMessage.bind(walletSession);
  const signTransaction = walletSession.signTransaction.bind(walletSession);

  return {
    address: walletSession.account.address,
    signMessage: async (message: Uint8Array) => {
      requireUmbraWalletAdapterGate(walletAdapterGate, "message");

      return {
        message,
        signature: await signMessage(message),
        signer: walletSession.account.address,
      } as Awaited<ReturnType<UmbraSigner["signMessage"]>>;
    },
    signTransaction: async (transaction) => {
      requireUmbraWalletAdapterGate(walletAdapterGate, "transaction");

      return (await signTransaction(transaction as never)) as unknown as Awaited<
        ReturnType<UmbraSigner["signTransaction"]>
      >;
    },
    signTransactions: async (transactions) => {
      const signed: Awaited<ReturnType<UmbraSigner["signTransaction"]>>[] = [];

      requireUmbraWalletAdapterGate(walletAdapterGate, "transaction");

      for (const transaction of transactions) {
        signed.push(
          (await signTransaction(transaction as never)) as unknown as Awaited<
            ReturnType<UmbraSigner["signTransaction"]>
          >,
        );
      }

      return signed;
    },
  } satisfies UmbraSigner;
}

export async function loadUmbraSdk(): Promise<UmbraSdkModule> {
  return import("@umbra-privacy/sdk");
}

export async function createUmbraClientFromWalletSession({
  config = umbraRuntimeConfig,
  deferMasterSeedSignature = true,
  deps,
  walletAdapterGate,
  walletSession,
}: CreateUmbraClientArgs): Promise<UmbraClient> {
  const readiness = getUmbraRuntimeReadiness(config);

  if (!readiness.ready) {
    throw new Error(readiness.blockers.join(" "));
  }

  const sdk = await loadUmbraSdk();
  const signer = createUmbraSignerFromWalletSession(walletSession, walletAdapterGate);

  return sdk.getUmbraClient(
    {
      deferMasterSeedSignature,
      indexerApiEndpoint: config.indexerApiEndpoint,
      network: config.network,
      rpcSubscriptionsUrl: config.rpcSubscriptionsUrl,
      rpcUrl: config.rpcUrl,
      signer,
    },
    deps,
  );
}
