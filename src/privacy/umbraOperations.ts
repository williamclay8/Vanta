import type { WalletSession } from "@solana/client";
import {
  createUmbraClientFromWalletSession,
  loadUmbraSdk,
  type UmbraClient,
} from "./umbraClient";
import type { UmbraRuntimeConfig } from "./umbraConfig";

type OptionalUmbraClientArgs = {
  client?: UmbraClient;
  config?: UmbraRuntimeConfig;
  walletSession?: WalletSession;
};

type UmbraOperationBaseArgs = OptionalUmbraClientArgs & {
  awaitCallback?: boolean;
};

async function resolveUmbraClient(args: OptionalUmbraClientArgs) {
  if (args.client) {
    return args.client;
  }

  if (!args.walletSession) {
    throw new Error("A connected wallet session is required for Umbra operations.");
  }

  return createUmbraClientFromWalletSession({
    config: args.config,
    walletSession: args.walletSession,
  });
}

export async function registerUmbraUser(args: UmbraOperationBaseArgs) {
  const client = await resolveUmbraClient(args);
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
  const client = await resolveUmbraClient(args);
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
  const client = await resolveUmbraClient(args);
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
  const client = await resolveUmbraClient(args);
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
  const client = await resolveUmbraClient(args);
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
