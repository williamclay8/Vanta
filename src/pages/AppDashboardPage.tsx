import { Link } from "react-router-dom";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { useVantaShieldState } from "@/solana/useVantaShieldState";

type DashboardActionCard = {
  badge: string;
  href: string;
  label: string;
  title: string;
};

export function AppDashboardPage() {
  const { account } = useVantaShieldState();
  const { clusterLabel, walletConnected } = useWalletState();
  const {
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
  } = usePrivacyFlow();

  const shieldedBalance = account?.balance ?? 0;
  const shieldedSolBalance = account?.shieldedSolBalance ?? 0;
  const spendableNoteCount = account?.spendableShieldNotes.length ?? 0;
  const latestActivity = account?.lifecycleActivities[0] ?? null;

  const stageLabel = !walletConnected
    ? "Connect a wallet"
    : shieldedSolBalance > 0
      ? "Shielded SOL live"
      : spendableNoteCount > 0
        ? "Spendable note live"
        : shieldedBalance > 0
          ? "Shielded state present"
          : "Ready to shield";

  const statusLine = !walletConnected
    ? "Connect wallet to start the private-core flow."
    : shieldedSolBalance > 0
      ? "A shielded SOL output is ready for the constrained exit lane."
      : spendableNoteCount > 0
        ? "Constrained shielded state is available; send, swap, and unshield still depend on current route and operator checks."
        : shieldedBalance > 0
          ? "Value is shielded, but there is no current spendable note."
          : "No live shielded position yet.";

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
      : privateCoreReleaseHandoffState?.nextActionHref ?? "/app/send";
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
          <span className="eyebrow">Vanta Home</span>
          <h2>One private-core lane. One clean handoff.</h2>
          <p>{statusLine}</p>

          <div className="dashboard-focus-card__chips">
            <span>{clusterLabel}</span>
            <span>{stageLabel}</span>
            {latestActivity?.title ? <span>{latestActivity.title}</span> : null}
          </div>
        </div>

        <div className="dashboard-focus-card__stats">
          <article>
            <span>Shielded VUSD</span>
            <strong>{shieldedBalance.toFixed(2)}</strong>
          </article>
          <article>
            <span>Shielded SOL</span>
            <strong>{shieldedSolBalance.toFixed(4)}</strong>
          </article>
          <article>
            <span>Spendable notes</span>
            <strong>{spendableNoteCount}</strong>
          </article>
        </div>
      </div>

      <div className="dashboard-release-card">
        <div>
          <span className="eyebrow">Exact Release Package</span>
          <h3>{releaseStatus}</h3>
          <p>{releaseNote}</p>
        </div>

        <div className="dashboard-release-card__meta">
          <small>
            {privateCoreReleasePackageState?.packageIdentityLabel ??
              "Primary send -> unshield package"}
          </small>
          <div className="dashboard-release-card__actions">
            <Link className="button button-primary" to={primaryHref}>
              {primaryLabel}
            </Link>
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
