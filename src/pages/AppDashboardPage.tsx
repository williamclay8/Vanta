import { Link } from "react-router-dom";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { formatVantaSolAmount } from "@/solana/solAmountFormat";
import { useVantaPositionSummary } from "@/solana/useVantaPositionSummary";

type DashboardActionCard = {
  badge: string;
  href: string;
  label: string;
  title: string;
};

function formatUsdcAmount(value: number) {
  if (value > 0 && value < 0.01) {
    return "<0.01 USDC";
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

export function AppDashboardPage() {
  const positionSummary = useVantaPositionSummary();
  const {
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
  } = usePrivacyFlow();

  const shieldedBalance = positionSummary.shieldedBalance;
  const shieldedSolBalance = positionSummary.shieldedSolBalance;
  const pendingRecoveredShieldedSolBalance = positionSummary.pendingRecoveredShieldedSolBalance;
  const spendableNoteCount = positionSummary.spendableNoteCount;

  const isValueUnavailable = Boolean(positionSummary.registryError);
  const stageLabel = isValueUnavailable
    ? "State unavailable"
    : positionSummary.registryRefreshing
      ? "Refreshing state"
      : !positionSummary.walletConnected
    ? "Connect a wallet"
    : shieldedSolBalance > 0
      ? "Shielded SOL state detected"
      : spendableNoteCount > 0
        ? "Spendable note detected"
        : shieldedBalance > 0
          ? "Shielded state present"
          : "Ready to test Shield";

  const statusLine = isValueUnavailable
    ? "Vanta could not refresh the local shielded-state view. Values below are temporarily unavailable."
    : positionSummary.registryRefreshing
      ? "Refreshing the local shielded-state view before treating balances as current."
      : !positionSummary.walletConnected
    ? "Connect wallet to start the private-core flow."
    : shieldedSolBalance > 0
      ? "A shielded SOL output is ready for the constrained exit lane."
      : spendableNoteCount > 0
        ? "Constrained shielded state is available; send, swap, and unshield still depend on current route and operator checks."
        : shieldedBalance > 0
          ? "Value is shielded, but there is no current spendable note."
          : "No shielded test position yet. Start with Shield to create one.";

  const releaseStatus =
    privateCoreReleasePackageState?.packageStatusLabel ??
    privateCoreReleaseHandoffState?.handoffStatusLabel ??
    "Release package unavailable";
  const releaseNote =
    privateCoreReleasePackageState?.packagePrimaryNote ??
    privateCoreReleaseHandoffState?.handoffPrimaryNote ??
    "The primary send to unshield lane has not assembled a final package yet.";

  const primaryHref =
    privateCoreReleasePackageState?.packageStatusLabel === "Release package ready"
      ? "/app/unshield"
      : privateCoreReleaseHandoffState?.nextActionHref;
  const primaryLabel =
    privateCoreReleasePackageState?.packageStatusLabel === "Release package ready"
      ? "Review package"
      : privateCoreReleaseHandoffState?.nextActionLabel ?? "Open primary lane";

  const actions: DashboardActionCard[] = [
    { badge: "Enter", href: "/app/shield", label: "Open Shield", title: "Shield" },
    { badge: "Move", href: "/app/send", label: "Open Send", title: "Send" },
    { badge: "Exit", href: "/app/unshield", label: "Open Unshield", title: "Unshield" },
    { badge: "Swap", href: "/app/swap", label: "Open Swap", title: "Swap" },
  ];

  return (
    <section className="dashboard-page dashboard-page--minimal">
      <div className="dashboard-focus-card">
        <div className="dashboard-focus-card__copy">
          <span className="eyebrow">Status</span>
          <h2>Your private settlement status</h2>
          <p>{statusLine}</p>

          <div className="dashboard-focus-card__chips">
            <span>{positionSummary.networkLabel}</span>
            <span>{stageLabel}</span>
            {positionSummary.latestActionTimestamp ? (
              <span>{positionSummary.latestActionLabel}</span>
            ) : null}
          </div>
        </div>

        <div className="dashboard-focus-card__stats">
          <article>
            <span>Shielded USDC</span>
            <strong>{isValueUnavailable ? "Unavailable" : formatUsdcAmount(shieldedBalance)}</strong>
          </article>
          <article>
            <span>Shielded SOL</span>
            <strong>{isValueUnavailable ? "Unavailable" : formatVantaSolAmount(shieldedSolBalance)}</strong>
            {pendingRecoveredShieldedSolBalance > 0 && (
              <small>
                {formatVantaSolAmount(pendingRecoveredShieldedSolBalance)} pending local recovery
              </small>
            )}
          </article>
          <article>
            <span>Spendable notes</span>
            <strong>{spendableNoteCount}</strong>
          </article>
        </div>
      </div>

      <div className="dashboard-release-card">
        <div>
          <span className="eyebrow">Reviewer Package</span>
          <h3>{releaseStatus}</h3>
          <p>{releaseNote}</p>
        </div>

        <div className="dashboard-release-card__meta">
          <small>
            {privateCoreReleasePackageState?.packageIdentityLabel ??
              "Primary send -> unshield package"}
          </small>
          <div className="dashboard-release-card__actions">
            {primaryHref ? (
              <Link className="button button-primary" to={primaryHref}>
                {primaryLabel}
              </Link>
            ) : (
              <button className="button button-primary" type="button" disabled>
                {primaryLabel}
              </button>
            )}
            <Link className="button button-ghost" to="/app/unshield">
              Open handoff
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-actions dashboard-actions--minimal">
        {actions.map((action) => (
          <article key={action.title} className="dashboard-action-card dashboard-action-card--minimal">
            <span>{action.badge}</span>
            <h3>{action.title}</h3>
            <Link className="button button-ghost" to={action.href}>
              {action.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
