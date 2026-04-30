import { Link } from "react-router-dom";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { formatVantaSolAmount } from "@/solana/solAmountFormat";
import { useVantaPositionSummary } from "@/solana/useVantaPositionSummary";

type DashboardActionCard = {
  badge: string;
  detail: string;
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
    recentShield,
  } = usePrivacyFlow();

  const shieldedBalance = positionSummary.shieldedBalance;
  const recentShieldedSolBalance =
    recentShield?.asset === "SOL" ? recentShield.resultingShieldedBalance : 0;
  const shieldedSolBalance = Math.max(
    positionSummary.shieldedSolBalance,
    recentShieldedSolBalance,
  );
  const pendingRecoveredShieldedSolBalance = positionSummary.pendingRecoveredShieldedSolBalance;
  const confirmedShieldedSolBalance = positionSummary.confirmedShieldedSolBalance;
  const spendableNoteCount = positionSummary.totalActionableNoteCount;

  const isValueUnavailable = Boolean(positionSummary.registryError);
  const hasShieldedSol = shieldedSolBalance > 0;
  const hasSpendableShieldedValue = spendableNoteCount > 0 || hasShieldedSol;
  const stageLabel = isValueUnavailable
    ? "State unavailable"
    : positionSummary.registryRefreshing
      ? "Refreshing state"
      : !positionSummary.walletConnected
    ? "Connect a wallet"
    : hasShieldedSol
      ? "Shielded SOL available"
      : hasSpendableShieldedValue
        ? "Spendable state available"
        : shieldedBalance > 0
          ? "Shielded state present"
          : "Ready to test Shield";

  const statusLine = isValueUnavailable
    ? "Vanta could not refresh the local shielded-state view. Values below are temporarily unavailable."
    : positionSummary.registryRefreshing
      ? "Refreshing the local shielded-state view before treating balances as current."
      : !positionSummary.walletConnected
    ? "Connect wallet to start the private-core flow."
    : hasShieldedSol
      ? "Shielded SOL is available. The next useful step is to review the SOL exit lane."
      : hasSpendableShieldedValue
        ? "Spendable shielded state is available. Choose the lane you want to test next."
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

  const primaryNextStep = !positionSummary.walletConnected
    ? { href: "/app/shield", label: "Connect and Shield" }
    : hasShieldedSol
      ? { href: "/app/unshield", label: "Review SOL exit" }
      : hasSpendableShieldedValue
        ? { href: "/app/send", label: "Review Send" }
        : { href: "/app/shield", label: "Start with Shield" };

  const packageIdentity =
    privateCoreReleasePackageState?.packageIdentityLabel ??
    "No package identity yet";
  const packageGate =
    privateCoreReleasePackageState?.gateStatusLabel ??
    "Gate not available";
  const packageGenerated =
    privateCoreReleasePackageState?.summaryGeneratedLabel ??
    "Generated after a package exists";
  const packageLineage =
    privateCoreReleasePackageState?.lineageSummaryLabel ??
    privateCoreReleaseHandoffState?.noteSummary ??
    "Lineage appears after send and unshield evidence exist";

  const trustPacketFacts = [
    {
      label: "Packet",
      value: packageIdentity,
      detail: `${releaseStatus} · ${packageGenerated}`,
    },
    {
      label: "Gate",
      value: packageGate,
      detail: privateCoreReleasePackageState?.gatePrimaryNote ?? releaseNote,
    },
    {
      label: "Lineage",
      value: packageLineage,
      detail: "Connects proof, send, release, and operator status when available.",
    },
    {
      label: "Boundary",
      value: "Beta/test settlement",
      detail: "Not production-ready, anonymous, untraceable, or live mainnet-private.",
    },
  ];

  const verificationSurfaces = [
    {
      command: "private-core:operator-status",
      purpose: "Human operator state",
    },
    {
      command: "private-core:operator-status-json",
      purpose: "Machine-readable state",
    },
    {
      command: "private-core:release-package",
      purpose: "Trust packet summary",
    },
    {
      command: "private-core:release-package-json",
      purpose: "Trust packet JSON",
    },
  ];

  const actions: DashboardActionCard[] = [
    {
      badge: shieldedBalance > 0 || hasShieldedSol ? "Ready" : "Start",
      detail: shieldedBalance > 0 || hasShieldedSol
        ? "Add more value or recover a new shielded state."
        : "Create the first test shielded position.",
      href: "/app/shield",
      label: "Open Shield",
      title: "Shield",
    },
    {
      badge: hasSpendableShieldedValue ? "Available" : "Needs notes",
      detail: hasSpendableShieldedValue
        ? "Use spendable shielded state for a private handoff test."
        : "Send unlocks after a spendable shielded note exists.",
      href: "/app/send",
      label: "Open Send",
      title: "Send",
    },
    {
      badge: hasShieldedSol || hasSpendableShieldedValue ? "Available" : "Needs state",
      detail: hasShieldedSol
        ? "Return available shielded SOL through the constrained exit lane."
        : hasSpendableShieldedValue
          ? "Exit spendable shielded value when the lane is selected."
          : "Unshield appears once shielded state is available.",
      href: "/app/unshield",
      label: "Open Unshield",
      title: "Unshield",
    },
    {
      badge: hasSpendableShieldedValue ? "Available" : "Needs notes",
      detail: hasSpendableShieldedValue
        ? "Swap from shielded state into the supported output lane."
        : "Swap needs spendable shielded state first.",
      href: "/app/swap",
      label: "Open Swap",
      title: "Swap",
    },
  ];

  return (
    <section className="dashboard-page dashboard-page--minimal">
      <div className="dashboard-trust-hero">
        <div className="dashboard-focus-card__copy">
          <span className="eyebrow">Trust Status</span>
          <h2>What Vanta can honestly prove right now</h2>
          <p>
            This is the counterparty-facing truth surface: beta state, usable lane,
            receipt package, and the verification boundary before anyone trusts a
            private settlement.
          </p>

          <div className="dashboard-focus-card__chips">
            <span>Beta</span>
            <span>No production funds</span>
            <span>Receipt-backed where available</span>
            <span>{positionSummary.networkLabel}</span>
            <span>{stageLabel}</span>
            {positionSummary.latestActionTimestamp ? (
              <span>{positionSummary.latestActionLabel}</span>
            ) : null}
          </div>
        </div>

        <div className="dashboard-trust-packet" aria-label="Latest trust packet">
          <span className="eyebrow">Latest Trust Packet</span>
          <h3>{releaseStatus}</h3>
          <p>{releaseNote}</p>
          <dl>
            {trustPacketFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  <strong>{fact.value}</strong>
                  <small>{fact.detail}</small>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="dashboard-readiness-row">
        <div className="dashboard-focus-card__stats" aria-label="Current local state">
          <article>
            <span>Shielded USDC</span>
            <strong>{isValueUnavailable ? "Unavailable" : formatUsdcAmount(shieldedBalance)}</strong>
          </article>
          <article>
            <span>Shielded SOL available</span>
            <strong>{isValueUnavailable ? "Unavailable" : formatVantaSolAmount(shieldedSolBalance)}</strong>
            {recentShieldedSolBalance > positionSummary.shieldedSolBalance && (
              <small>Includes the latest SOL shield result</small>
            )}
            {pendingRecoveredShieldedSolBalance > 0 && (
              <small>
                Includes {formatVantaSolAmount(pendingRecoveredShieldedSolBalance)} recovered locally
              </small>
            )}
            {confirmedShieldedSolBalance > 0 && pendingRecoveredShieldedSolBalance > 0 && (
              <small>{formatVantaSolAmount(confirmedShieldedSolBalance)} resolved on-chain</small>
            )}
          </article>
          <article>
            <span>Actionable notes</span>
            <strong>{spendableNoteCount}</strong>
            <small>
              {positionSummary.spendableNoteCount} token · {positionSummary.spendableShieldedSolNoteCount} SOL
            </small>
          </article>
        </div>

        <div className="dashboard-verification-card" aria-label="Reviewer verification surfaces">
          <span className="eyebrow">Reviewer Verification</span>
          <h3>Operator-visible, beta-truthful, reproducible</h3>
          <p>
            A reviewer or counterparty should be able to inspect the packet and run
            the matching operator/status command instead of trusting marketing copy.
          </p>
          <Link className="button button-primary" to={primaryHref ?? "/app/send"}>
            {privateCoreReleasePackageState ? "Verify packet" : "Create packet"}
          </Link>
          <div className="dashboard-verification-card__commands">
            {verificationSurfaces.map((surface) => (
              <div key={surface.command}>
                <code>npm run {surface.command}</code>
                <small>{surface.purpose}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-next-step-card">
        <div>
          <span className="eyebrow">Next Step</span>
          <h3>{primaryNextStep.label}</h3>
          <p>{statusLine}</p>
        </div>
        <Link className="button button-primary" to={primaryNextStep.href}>
          {primaryNextStep.label}
        </Link>
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
            <p>{action.detail}</p>
            <Link className="button button-ghost" to={action.href}>
              {action.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
