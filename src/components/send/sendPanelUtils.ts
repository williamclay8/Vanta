export const DEFAULT_USDC_DECIMALS = 6;

export function abbreviate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function formatOperatorSummaryFreshness(value: number | null) {
  if (!value) {
    return "Unavailable";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatBaseUnits(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString(10);
  }

  return `${whole.toString(10)}.${fraction.toString(10).padStart(decimals, "0").replace(/0+$/, "")}`;
}
