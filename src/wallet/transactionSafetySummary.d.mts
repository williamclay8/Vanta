export type VantaTransactionSafetySummary = {
  amount: string;
  asset: string;
  cluster: "localnet" | "devnet" | "testnet" | "mainnet-beta";
  estimatedFees: string;
  explicitMainnetApproval: boolean;
  feePayer: string;
  instructions: string[];
  kind: "vanta-transaction-safety-summary";
  mainnetSubmissionAllowed: false;
  recentBlockhash: string;
  recipient: string;
  requiresHumanApproval: true;
  simulationResult: {
    error: string | null;
    logs: string[];
    ok: boolean;
  };
};

export type VantaTransactionSafetyDecision =
  | {
      accepted: true;
      reason: "summary-ready-for-wallet-approval";
    }
  | {
      accepted: false;
      reason: "invalid-summary-kind" | "mainnet-approval-required" | "simulation-failed";
    };

export function createTransactionSafetySummary(input: {
  amount: string;
  asset: string;
  cluster: VantaTransactionSafetySummary["cluster"];
  estimatedFees: string;
  explicitMainnetApproval?: boolean;
  feePayer: string;
  instructions: string[];
  recentBlockhash: string;
  recipient: string;
  simulationResult: {
    error?: string | null;
    logs?: string[];
    ok: boolean;
  };
}): VantaTransactionSafetySummary;

export function validateTransactionSafetySummary(
  summary: VantaTransactionSafetySummary,
): VantaTransactionSafetyDecision;
