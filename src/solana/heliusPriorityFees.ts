import { toAddress, type TransactionInstructionInput } from "@solana/client";
import { endpoint } from "@/solana/client";

type PriorityFeeAction =
  | "shield_state"
  | "send_transition"
  | "swap_transition"
  | "unshield_transition"
  | "sol_unshield_transition"
  | "state_finalize";

type HeliusPriorityFeeEstimateResponse = {
  error?: {
    message?: string;
  };
  result?: {
    priorityFeeEstimate?: number;
  };
};

type PriorityFeeEstimate = {
  estimatedMicroLamports: number;
  source: "helius" | "fallback";
};

const FALLBACK_MICRO_LAMPORTS: Record<PriorityFeeAction, number> = {
  shield_state: 5_000,
  send_transition: 6_000,
  swap_transition: 8_000,
  unshield_transition: 8_000,
  sol_unshield_transition: 8_000,
  state_finalize: 4_000,
};

const MAX_MICRO_LAMPORTS: Record<PriorityFeeAction, number> = {
  shield_state: 20_000,
  send_transition: 22_000,
  swap_transition: 30_000,
  unshield_transition: 30_000,
  sol_unshield_transition: 30_000,
  state_finalize: 18_000,
};

function normalizeAccountKeys(accountKeys: readonly (string | null | undefined)[]) {
  return [...new Set(accountKeys.filter((value): value is string => Boolean(value?.trim())))];
}

function clampMicroLamports(value: number, action: PriorityFeeAction) {
  const roundedValue = Math.round(value);
  const fallbackValue = FALLBACK_MICRO_LAMPORTS[action];
  const maxValue = MAX_MICRO_LAMPORTS[action];

  if (!Number.isFinite(roundedValue) || roundedValue <= 0) {
    return fallbackValue;
  }

  return Math.min(Math.max(roundedValue, fallbackValue), maxValue);
}

export async function estimateHeliusPriorityFee(args: {
  accountKeys: readonly (string | null | undefined)[];
  action: PriorityFeeAction;
}): Promise<PriorityFeeEstimate> {
  const normalizedAccountKeys = normalizeAccountKeys(args.accountKeys);

  if (normalizedAccountKeys.length === 0) {
    return {
      estimatedMicroLamports: FALLBACK_MICRO_LAMPORTS[args.action],
      source: "fallback",
    };
  }

  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify({
        id: `${args.action}:${Date.now()}`,
        jsonrpc: "2.0",
        method: "getPriorityFeeEstimate",
        params: [
          {
            accountKeys: normalizedAccountKeys,
            options: {
              recommended: true,
            },
          },
        ],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`Priority fee RPC failed with ${response.status}.`);
    }

    const parsed = (await response.json()) as HeliusPriorityFeeEstimateResponse;
    const estimatedMicroLamports = clampMicroLamports(
      parsed.result?.priorityFeeEstimate ?? NaN,
      args.action,
    );

    return {
      estimatedMicroLamports,
      source: parsed.result?.priorityFeeEstimate ? "helius" : "fallback",
    };
  } catch {
    return {
      estimatedMicroLamports: FALLBACK_MICRO_LAMPORTS[args.action],
      source: "fallback",
    };
  }
}

export async function buildHeliusPriorityFeeInstructions(args: {
  accountKeys: readonly (string | null | undefined)[];
  action: PriorityFeeAction;
}): Promise<TransactionInstructionInput[]> {
  const estimate = await estimateHeliusPriorityFee(args);
  const data = new Uint8Array(9);
  const dataView = new DataView(data.buffer);
  dataView.setUint8(0, 3);
  dataView.setBigUint64(1, BigInt(estimate.estimatedMicroLamports), true);

  return [
    {
      accounts: [],
      data,
      programAddress: toAddress("ComputeBudget111111111111111111111111111111"),
    },
  ];
}
