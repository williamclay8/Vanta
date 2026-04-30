import type {
  VantaLifecycleActivity,
  VantaShieldAccountState,
} from "@/solana/vantaShieldState";

type LifecycleTimelineProps = {
  account: VantaShieldAccountState | null;
  compact?: boolean;
  maxItems?: number;
  title?: string;
};

function formatAmount(value: number, label?: string) {
  if (label) {
    return label;
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

function formatImpactLabel(activity: VantaLifecycleActivity) {
  if (activity.sourceState === activity.targetState) {
    return `Within ${activity.targetState}`;
  }

  return `${activity.sourceState} -> ${activity.targetState}`;
}

function getActivityToneClass(activity: VantaLifecycleActivity) {
  switch (activity.type) {
    case "shield":
      return "lifecycle-entry__icon lifecycle-entry__icon--shield";
    case "send":
      return "lifecycle-entry__icon lifecycle-entry__icon--send";
    case "change_note_created":
      return "lifecycle-entry__icon lifecycle-entry__icon--change";
    case "swap_output_created":
      return "lifecycle-entry__icon lifecycle-entry__icon--swap";
    case "unshield":
      return "lifecycle-entry__icon lifecycle-entry__icon--unshield";
    case "swap":
      return "lifecycle-entry__icon lifecycle-entry__icon--swap";
    case "sol_unshield":
      return "lifecycle-entry__icon lifecycle-entry__icon--sol-unshield";
  }
}

export function LifecycleTimeline({
  account,
  compact = false,
  maxItems = 8,
  title = "Constrained lifecycle timeline",
}: LifecycleTimelineProps) {
  if (!account) {
    return (
      <div className="lifecycle-timeline">
        <div className="shield-card__header">
          <div>
            <span>Lifecycle history</span>
            <h3>{title}</h3>
          </div>
          <small>Shielded tokens + shielded SOL</small>
        </div>
        <p className="shield-review-note">
          Shield, Send, Swap, swap-output creation, and Unshield will appear
          here as a readable lifecycle once the constrained live path has
          activity to resolve.
        </p>
      </div>
    );
  }

  const activities = account.lifecycleActivities.slice(0, maxItems);

  return (
    <div className="lifecycle-timeline">
      <div className="shield-card__header">
        <div>
          <span>Lifecycle history</span>
          <h3>{title}</h3>
        </div>
        <small>{account.lifecycleActivities.length} resolved events</small>
      </div>

      {!compact && (
        <div className="preview-grid lifecycle-summary">
          <div className="preview-card preview-card--accent">
            <span>Latest event</span>
            <strong>{activities[0]?.title ?? "No activity yet"}</strong>
          </div>
          <div className="preview-card">
            <span>Resolved lifecycle</span>
            <strong>{account.lifecycleActivities.length} events</strong>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="shield-review-note">
          No constrained lifecycle activity has been resolved yet. Start with
          Shield to make the current shielded path legible over time.
        </p>
      ) : (
        <div className="lifecycle-list">
          {activities.map((activity) => (
            <article
              key={`${activity.type}:${activity.noteId ?? activity.createdAt}`}
              className="lifecycle-entry"
            >
              <div className={getActivityToneClass(activity)} aria-hidden="true" />
              <div className="lifecycle-entry__content">
                <div className="lifecycle-entry__header">
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{formatDate(activity.createdAt)}</span>
                  </div>
                  <div className="lifecycle-entry__amount">
                    <strong>{formatAmount(activity.amount, activity.amountLabel)}</strong>
                    <span>{formatImpactLabel(activity)}</span>
                  </div>
                </div>
                <p>{activity.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {!compact && (
        <p className="shield-review-note">
          This timeline is derived from Vanta&apos;s current constrained note
          model. It explains Shield, Send, Swap, and Unshield in product terms
          without pretending to be a full protocol explorer.
        </p>
      )}
    </div>
  );
}
