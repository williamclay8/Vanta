import { useCallback, useMemo, useState } from "react";
import { useSolanaClient, useWalletSession } from "@solana/react-hooks";
import type {
  TransactionInstructionInput,
  TransactionPrepared,
  TransactionSendOptions,
} from "@solana/client";
import {
  createWalletSafeSendBoundary,
  runWalletSafeSendBoundary,
} from "./walletSafeSendBoundary.mjs";
import type {
  VantaWalletSafeSendInput,
  VantaWalletSafeSendPrepared,
  VantaWalletSafeSendResult,
} from "./walletSafeSendBoundary.mjs";

type VantaSafeSendStatus = "idle" | "loading" | "submitted" | "blocked" | "error";
type VantaSafeSendHookStatus = "idle" | "loading" | "success" | "error";

type VantaSafeSendState = {
  error: unknown;
  result: VantaWalletSafeSendResult | null;
  signature: string | null;
  status: VantaSafeSendStatus;
};

const initialState: VantaSafeSendState = {
  error: null,
  result: null,
  signature: null,
  status: "idle",
};

function serializeSimulationError(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function useVantaSafeSendTransaction() {
  const client = useSolanaClient();
  const walletSession = useWalletSession();
  const [state, setState] = useState<VantaSafeSendState>(initialState);

  const boundary = useMemo(
    () =>
      createWalletSafeSendBoundary({
        prepare: async (request) => {
          if (!walletSession) {
            throw new Error("Connect a wallet before preparing a Vanta transaction.");
          }

          return (await client.transaction.prepare({
            authority: walletSession,
            feePayer: request.feePayer,
            instructions: request.instructions as readonly TransactionInstructionInput[],
          })) as unknown as VantaWalletSafeSendPrepared;
        },
        sendPrepared: async (prepared) =>
          String(
            await client.transaction.send(
              prepared as unknown as TransactionPrepared,
              { skipPreflight: false } satisfies TransactionSendOptions,
            ),
        ),
        simulate: async (prepared) => {
          const wire = await client.transaction.toWire(prepared as unknown as TransactionPrepared);
          const simulationTransaction = wire as Parameters<typeof client.runtime.rpc.simulateTransaction>[0];
          const simulationResult = await client.runtime.rpc.simulateTransaction(simulationTransaction, {
            commitment:
              (prepared as unknown as TransactionPrepared).commitment ??
              client.store.getState().cluster.commitment,
            encoding: "base64",
            sigVerify: false,
          })
            .send({ abortSignal: AbortSignal.timeout(20_000) });

          return {
            error: serializeSimulationError(simulationResult.value.err),
            logs: simulationResult.value.logs ?? [],
            ok: !simulationResult.value.err,
          };
        },
      }),
    [client, walletSession],
  );

  const send = useCallback(
    async (input: VantaWalletSafeSendInput) => {
      setState({
        error: null,
        result: null,
        signature: null,
        status: "loading",
      });

      try {
        const result = await runWalletSafeSendBoundary(boundary, input);
        if (result.status === "blocked") {
          setState({
            error: result.reason,
            result,
            signature: null,
            status: "blocked",
          });

          return result;
        }

        setState({
          error: null,
          result,
          signature: result.signature,
          status: result.status,
        });

        return result;
      } catch (error) {
        setState({
          error,
          result: null,
          signature: null,
          status: "error",
        });
        throw error;
      }
    },
    [boundary],
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);
  const status: VantaSafeSendHookStatus =
    state.status === "submitted"
      ? "success"
      : state.status === "blocked"
        ? "error"
        : state.status;

  return {
    error: state.error,
    isSending: state.status === "loading",
    reset,
    result: state.result,
    safeStatus: state.status,
    send,
    signature: state.signature,
    status,
  };
}
