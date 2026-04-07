import { useVantaPositionSummary } from "@/solana/useVantaPositionSummary";

function formatAmount(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} VUSD`;
}

function formatSolAmount(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} SOL`;
}

function formatLatestTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return "Awaiting first lifecycle action";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function PositionSummary() {
  const summary = useVantaPositionSummary();

  return (
    <section className="position-summary" aria-label="Current constrained position">
      <div className="position-summary__header">
        <div>
          <span>Current position</span>
          <h2>Constrained state at a glance</h2>
        </div>
        <p>{summary.statusLabel}</p>
      </div>

      <div className="position-summary__grid">
        <article className="position-summary__card position-summary__card--accent">
          <span>Public Wallet</span>
          <strong>{formatAmount(summary.publicBalance)}</strong>
          <small>Current live VUSD balance outside the privacy layer.</small>
        </article>

        <article className="position-summary__card">
          <span>Shielded State</span>
          <strong>{formatAmount(summary.shieldedBalance)}</strong>
          <small>Resolved shielded value currently held inside Vanta.</small>
        </article>

        <article className="position-summary__card">
          <span>Shielded SOL</span>
          <strong>{formatSolAmount(summary.shieldedSolBalance)}</strong>
          <small>Resolved SOL output currently held inside Vanta after Swap.</small>
        </article>

        <article className="position-summary__card">
          <span>Spendable Notes</span>
          <strong>{summary.spendableNoteCount}</strong>
          <small>Spendable VUSD notes available for Send, Swap, or Unshield.</small>
        </article>
      </div>

      <div className="position-summary__latest">
        <div>
          <span>Latest action</span>
          <strong>{summary.latestActionLabel}</strong>
        </div>
        <small>
          {summary.networkLabel} · {summary.swapCount} swap
          {summary.swapCount === 1 ? "" : "s"} · {formatLatestTimestamp(summary.latestActionTimestamp)}
        </small>
      </div>
    </section>
  );
}
