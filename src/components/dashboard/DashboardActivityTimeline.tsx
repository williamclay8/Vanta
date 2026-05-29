import type { DashboardActivityItem } from "@/components/dashboard/dashboardVizUtils";

type DashboardActivityTimelineProps = {
  items: readonly DashboardActivityItem[];
};

function formatRelativeTime(timestamp: number) {
  const elapsedMinutes = Math.round((Date.now() - timestamp) / 60_000);
  if (elapsedMinutes < 1) {
    return "Just now";
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 48) {
    return `${elapsedHours} hr ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function directionIcon(direction: DashboardActivityItem["direction"]) {
  if (direction === "inbound") {
    return "↓";
  }
  if (direction === "outbound") {
    return "→";
  }
  return "◷";
}

export function DashboardActivityTimeline({ items }: DashboardActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="dashboard-activity-timeline dashboard-activity-timeline--empty">
        <p>No recent private activity yet. Shield or send to populate this timeline.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-activity-timeline" aria-label="Recent private activity">
      {items.map((item) => (
        <article
          key={`${item.title}-${item.createdAt}`}
          className={[
            "dashboard-activity-timeline__item",
            item.direction === "inbound"
              ? "dashboard-activity-timeline__item--in"
              : item.direction === "outbound"
                ? "dashboard-activity-timeline__item--out"
                : "dashboard-activity-timeline__item--pending",
          ].join(" ")}
        >
          <span className="dashboard-activity-timeline__icon" aria-hidden="true">
            {directionIcon(item.direction)}
          </span>
          <div className="dashboard-activity-timeline__copy">
            <strong>{item.title}</strong>
            <small>
              {formatRelativeTime(item.createdAt)} · {item.description}
            </small>
          </div>
          <span
            className={[
              "dashboard-activity-timeline__amount",
              "v-num",
              item.direction === "inbound"
                ? "v-pos"
                : item.direction === "outbound"
                  ? "v-neg"
                  : "v-pending",
            ].join(" ")}
          >
            {item.direction === "inbound" ? "+" : item.direction === "outbound" ? "−" : ""}
            {item.amountLabel}
          </span>
        </article>
      ))}
    </div>
  );
}
