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
  walletSession: WalletSession;
};

export function createUmbraSignerFromWalletSession(walletSession: WalletSession): UmbraSigner {
  if (!walletSession.signMessage) {
    throw new Error("Umbra requires a wallet that supports message signing.");
  }

  if (!walletSession.signTransaction) {
    throw new Error("Umbra requires a wallet that supports transaction signing.");
  }

  return {
    address: walletSession.account.address,
    signMessage: async (message: Uint8Array) => ({
      message,
      signature: await walletSession.signMessage!(message),
      signer: walletSession.account.address,
    }) as Awaited<ReturnType<UmbraSigner["signMessage"]>>,
    signTransaction: async (transaction) =>
      (await walletSession.signTransaction!(transaction as never)) as unknown as Awaited<
        ReturnType<UmbraSigner["signTransaction"]>
      >,
    signTransactions: async (transactions) => {
      const signed: Awaited<ReturnType<UmbraSigner["signTransaction"]>>[] = [];

      for (const transaction of transactions) {
        signed.push(
          (await walletSession.signTransaction!(transaction as never)) as unknown as Awaited<
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
  walletSession,
}: CreateUmbraClientArgs): Promise<UmbraClient> {
  const readiness = getUmbraRuntimeReadiness(config);

  if (!readiness.ready) {
    throw new Error(readiness.blockers.join(" "));
  }

  const sdk = await loadUmbraSdk();
  const signer = createUmbraSignerFromWalletSession(walletSession);

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
