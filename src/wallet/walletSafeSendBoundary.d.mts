import type { VantaTransactionSafetySummary } from "./transactionSafetySummary.mjs";
import type { VantaWalletBackedTransactionSimulationGate } from "./walletBackedTransactionSimulation.mjs";

export type VantaWalletSafeSendPrepared = {
  feePayer: string;
  instructions: readonly string[];
  lifetime?: {
    blockhash?: string;
  };
  recentBlockhash?: string;
  blockhash?: string;
};

export type VantaWalletSafeSendBoundary = {
  kind: "vanta-wallet-safe-send-boundary";
  prepare(request: {
    feePayer: string;
    instructions: readonly string[];
    label: string;
  }): Promise<VantaWalletSafeSendPrepared>;
  sendPrepared(prepared: VantaWalletSafeSendPrepared): Promise<string>;
  simulate(prepared: VantaWalletSafeSendPrepared): Promise<{
    error: string | null;
    logs: string[];
    ok: boolean;
  }>;
  version: "vanta-wallet-safe-send-boundary-0.1";
};

export type VantaWalletSafeSendInput = {
  amount: string;
  asset: string;
  cluster: "localnet" | "devnet" | "testnet" | "mainnet-beta";
  connectedWalletAddress: string;
  estimatedFees: string;
  explicitMainnetApproval?: boolean;
  feePayer: string;
  humanApprovedSummary: boolean;
  instructions: readonly string[];
  label: string;
  recipient: string;
  transactionFingerprint: string;
};

export type VantaWalletSafeSendResult =
  | {
      decision: {
        accepted: false;
        reason: string;
      };
      gate: VantaWalletBackedTransactionSimulationGate;
      reason: string;
      signature: null;
      status: "blocked";
      summary: VantaTransactionSafetySummary;
    }
  | {
      decision: {
        accepted: true;
        reason: string;
      };
      gate: VantaWalletBackedTransactionSimulationGate;
      prepared: VantaWalletSafeSendPrepared;
      signature: string;
      status: "submitted";
      summary: VantaTransactionSafetySummary;
    };

export function createWalletSafeSendBoundary(dependencies: {
  prepare: VantaWalletSafeSendBoundary["prepare"];
  sendPrepared: VantaWalletSafeSendBoundary["sendPrepared"];
  simulate: VantaWalletSafeSendBoundary["simulate"];
}): VantaWalletSafeSendBoundary;

export function runWalletSafeSendBoundary(
  boundary: VantaWalletSafeSendBoundary,
  input: VantaWalletSafeSendInput,
): Promise<VantaWalletSafeSendResult>;
