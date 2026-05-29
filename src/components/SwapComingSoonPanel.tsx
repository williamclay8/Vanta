import { Link } from "react-router-dom";

type SwapComingSoonPanelProps = {
  trustCopy: string;
};

export function SwapComingSoonPanel({ trustCopy }: SwapComingSoonPanelProps) {
  return (
    <aside
      className="swap-coming-soon v-animate-in"
      data-vanta-swap-coming-soon
      aria-label="Swap route preview"
    >
      <div className="swap-coming-soon__header">
        <span className="v-chip v-chip--beta">
          <span className="v-chip__dot" aria-hidden="true" />
          Coming soon
        </span>
        <h3>Private swaps are in preview</h3>
        <p>
          Explore the route, quote, and receipt shape below. Live settlement stays paused until
          circuit and operator gates finish rollout.
        </p>
      </div>

      <div className="swap-coming-soon__actions">
        <Link className="v-tile" to="/app/shield">
          <span className="v-tile__icon" aria-hidden="true">
            ↓
          </span>
          <p className="v-tile__title">Shield first</p>
          <span className="v-tile__sub">Move assets into a private balance</span>
        </Link>
        <Link className="v-tile" to="/app/send">
          <span className="v-tile__icon" aria-hidden="true">
            →
          </span>
          <p className="v-tile__title">Send shielded</p>
          <span className="v-tile__sub">Transfer from your private balance today</span>
        </Link>
      </div>

      <details className="swap-coming-soon__truth">
        <summary>Technical status · Guarded beta</summary>
        <p>{trustCopy}</p>
      </details>
    </aside>
  );
}
