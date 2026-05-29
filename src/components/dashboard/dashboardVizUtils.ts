import type { VantaLifecycleActivity } from "@/solana/vantaShieldState";

export type DashboardAllocationSlice = {
  label: string;
  symbol: string;
  value: number;
  color: string;
};

export type DashboardActivityItem = {
  amountLabel: string;
  createdAt: number;
  description: string;
  direction: "inbound" | "outbound" | "pending";
  title: string;
};

const sliceColors = ["#77f2d4", "#46e08a", "#9bbdff", "#e4c781", "#ffc957", "#ff6f6f"];

export function buildAllocationSlices(input: {
  shieldedSolBalance: number;
  tokenPositions: readonly { balance: number; symbol: string }[];
}): DashboardAllocationSlice[] {
  const slices: DashboardAllocationSlice[] = [];

  if (input.shieldedSolBalance > 0) {
    slices.push({
      label: "SOL",
      symbol: "SOL",
      value: input.shieldedSolBalance,
      color: sliceColors[0] ?? "#77f2d4",
    });
  }

  for (const position of input.tokenPositions) {
    if (position.balance <= 0) {
      continue;
    }

    slices.push({
      label: position.symbol,
      symbol: position.symbol,
      value: position.balance,
      color: sliceColors[slices.length % sliceColors.length] ?? "#77f2d4",
    });
  }

  return slices;
}

export function getActivityDirection(activity: VantaLifecycleActivity): DashboardActivityItem["direction"] {
  if (
    activity.type === "shield" ||
    activity.impact === "public_to_shielded" ||
    activity.impact === "shielded_swap"
  ) {
    return "inbound";
  }

  if (
    activity.type === "send" ||
    activity.type === "unshield" ||
    activity.type === "sol_unshield" ||
    activity.impact === "shielded_to_public" ||
    activity.impact === "shielded_transfer"
  ) {
    return "outbound";
  }

  return "pending";
}

export function mapLifecycleActivities(
  activities: readonly VantaLifecycleActivity[],
  limit = 5,
): DashboardActivityItem[] {
  return [...activities]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, limit)
    .map((activity) => ({
      amountLabel:
        activity.amountLabel ??
        `${activity.amount.toLocaleString(undefined, { maximumFractionDigits: 5 })}`,
      createdAt: activity.createdAt,
      description: activity.description,
      direction: getActivityDirection(activity),
      title: activity.title,
    }));
}

export function buildSparklinePoints(currentTotal: number, activities: readonly VantaLifecycleActivity[]) {
  if (currentTotal <= 0 && activities.length === 0) {
    return [0.12, 0.14, 0.13, 0.16, 0.15, 0.18, 0.2];
  }

  const chronological = [...activities].sort((left, right) => left.createdAt - right.createdAt);
  let running = Math.max(currentTotal * 0.35, 0);
  const points: number[] = [running / Math.max(currentTotal, 1)];

  for (const activity of chronological) {
    const delta =
      getActivityDirection(activity) === "inbound"
        ? Math.max(activity.amount, 0)
        : -Math.max(activity.amount, 0);
    running = Math.max(running + delta, 0);
    points.push(running / Math.max(currentTotal, running, 1));
  }

  points.push(1);
  return points.length >= 4 ? points : [...points, 0.82, 0.92, 1];
}
