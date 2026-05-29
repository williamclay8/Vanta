import { AssetChip } from "@/components/AssetChip";
import type { DashboardAllocationSlice } from "@/components/dashboard/dashboardVizUtils";

type DashboardAllocationRingProps = {
  slices: readonly DashboardAllocationSlice[];
};

export function DashboardAllocationRing({ slices }: DashboardAllocationRingProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total <= 0) {
    return (
      <div className="dashboard-allocation-ring dashboard-allocation-ring--empty" aria-label="No shielded allocation yet">
        <svg viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r={radius} className="dashboard-allocation-ring__track" />
        </svg>
        <span className="dashboard-allocation-ring__empty-copy">Shield to begin</span>
      </div>
    );
  }

  return (
    <div className="dashboard-allocation-ring" aria-label="Shielded asset allocation">
      <svg viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} className="dashboard-allocation-ring__track" />
        {slices.map((slice) => {
          const fraction = slice.value / total;
          const dash = fraction * circumference;
          const element = (
            <circle
              key={slice.symbol}
              cx="44"
              cy="44"
              r={radius}
              className="dashboard-allocation-ring__segment"
              stroke={slice.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return element;
        })}
      </svg>
      <ul className="dashboard-allocation-ring__legend">
        {slices.map((slice) => (
          <li key={slice.symbol}>
            <AssetChip symbol={slice.symbol} />
            <span className="v-num">{((slice.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
