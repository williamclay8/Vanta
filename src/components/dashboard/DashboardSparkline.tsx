type DashboardSparklineProps = {
  points: readonly number[];
  positive?: boolean;
};

export function DashboardSparkline({ points, positive = true }: DashboardSparklineProps) {
  const width = 190;
  const height = 62;
  const normalized = points.length > 1 ? points : [0.2, 0.35, 0.3, 0.5, 0.45, 0.7, 1];
  const step = width / Math.max(normalized.length - 1, 1);

  const coordinates = normalized.map((value, index) => ({
    x: index * step,
    y: height - value * (height - 8) - 4,
  }));

  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const fillPath = [
    `M0,${height}`,
    ...coordinates.map(({ x, y }) => `L${x},${y}`),
    `L${width},${height}`,
    "Z",
  ].join(" ");

  return (
    <svg
      className={["dashboard-sparkline", positive ? "dashboard-sparkline--pos" : "dashboard-sparkline--flat"]
        .filter(Boolean)
        .join(" ")}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dashboard-sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(119, 242, 212, 0.28)" />
          <stop offset="1" stopColor="rgba(119, 242, 212, 0)" />
        </linearGradient>
      </defs>
      <path className="dashboard-sparkline__fill" d={fillPath} />
      <polyline className="dashboard-sparkline__line" points={linePoints} />
    </svg>
  );
}
