export function formatVantaSolAmount(value: number) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 9,
    minimumFractionDigits: 0,
  })} SOL`;
}
