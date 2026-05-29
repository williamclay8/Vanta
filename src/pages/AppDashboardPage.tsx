import { Link } from "react-router-dom";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AssetChip } from "@/components/AssetChip";
import { DashboardActivityTimeline } from "@/components/dashboard/DashboardActivityTimeline";
import { DashboardAllocationRing } from "@/components/dashboard/DashboardAllocationRing";
import { DashboardSparkline } from "@/components/dashboard/DashboardSparkline";
import {
  buildAllocationSlices,
  buildSparklinePoints,
  mapLifecycleActivities,
} from "@/components/dashboard/dashboardVizUtils";
import { VantaStatusChip } from "@/components/VantaStatusChip";
import { formatVantaSolAmount } from "@/solana/solAmountFormat";
import { useVantaPositionSummary } from "@/solana/useVantaPositionSummary";

function formatUsdcAmount(value: number) {
  if (value > 0 && value < 0.01) {
    return "<0.01 USDC";
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

function formatShieldedTokenPosition(value: number, symbol: string) {
  if (symbol === "USDC") {
    return formatUsdcAmount(value);
  }

  if (value > 0 && value < 0.00001) {
    return `<0.00001 ${symbol}`;
  }

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 5,
  })} ${symbol}`;
}

export function AppDashboardPage() {
  const positionSummary = useVantaPositionSummary();

  const shieldedBalance = positionSummary.shieldedBalance;
  const shieldedTokenPositions = positionSummary.shieldedTokenPositions;
  const primaryShieldedTokenPosition =
    shieldedTokenPositions[0] ?? {
      balance: shieldedBalance,
      noteCount: positionSummary.spendableNoteCount,
      symbol: positionSummary.liveAsset,
    };
  const shieldedSolBalance = positionSummary.shieldedSolBalance;
  const spendableNoteCount = positionSummary.totalActionableNoteCount;

  const isValueUnavailable = Boolean(positionSummary.registryError);
  const hasShieldedSol = shieldedSolBalance > 0;
  const hasSpendableShieldedValue = spendableNoteCount > 0 || hasShieldedSol;

  const primaryBalanceNumeric = hasShieldedSol
    ? shieldedSolBalance
    : primaryShieldedTokenPosition.balance;
  const primaryBalanceUnit = hasShieldedSol ? "SOL" : primaryShieldedTokenPosition.symbol;

  const allocationSlices = buildAllocationSlices({
    shieldedSolBalance,
    tokenPositions: shieldedTokenPositions,
  });
  const portfolioTotal =
    shieldedSolBalance +
    shieldedTokenPositions.reduce((sum, position) => sum + position.balance, 0);
  const sparklinePoints = buildSparklinePoints(
    portfolioTotal,
    positionSummary.recentLifecycleActivities,
  );
  const activityItems = mapLifecycleActivities(positionSummary.recentLifecycleActivities, 5);
  const balanceTrendPositive =
    sparklinePoints.length === 0 || sparklinePoints[sparklinePoints.length - 1] >= sparklinePoints[0];

  const statusLine = isValueUnavailable
    ? "Balances are temporarily unavailable. Retry from Shield once the local view refreshes."
    : positionSummary.registryRefreshing
      ? "Refreshing your shielded balance."
      : !positionSummary.walletConnected
        ? "Connect a wallet to shield assets and start moving privately."
        : hasSpendableShieldedValue
          ? "Your private balance is ready. Send, swap, or exit when you choose."
          : shieldedBalance > 0 || hasShieldedSol
            ? "Value is shielded. Recover or add spendable notes to send or exit."
            : "Shield assets to start your private balance on Solana.";

  const primaryNextStep = !positionSummary.walletConnected
    ? { href: "/app/shield", label: "Connect and Shield" }
    : hasShieldedSol
      ? { href: "/app/unshield", label: "Exit to wallet" }
      : hasSpendableShieldedValue
        ? { href: "/app/send", label: "Send privately" }
        : { href: "/app/shield", label: "Shield assets" };

  const actions = [
    {
      badge: shieldedBalance > 0 || hasShieldedSol ? "Ready" : "Start",
      href: "/app/shield",
      sub: "Add private funds",
      title: "Shield",
      variant: "shield",
    },
    {
      badge: hasSpendableShieldedValue ? "Ready" : "Needs notes",
      href: "/app/send",
      sub: "Pay privately",
      title: "Send",
      variant: "send",
    },
    {
      badge: "Soon",
      href: "/app/swap",
      sub: "Private swap",
      title: "Swap",
      variant: "swap",
    },
    {
      badge: hasShieldedSol || hasSpendableShieldedValue ? "Ready" : "Needs state",
      href: "/app/unshield",
      sub: "Exit to wallet",
      title: "Unshield",
      variant: "unshield",
    },
  ] as const;

  return (
    <section className="dashboard-page dashboard-page--cockpit">
      <div className="dashboard-cockpit__topline">
        <div className="dashboard-cockpit__title-block">
          <span className="eyebrow">Private balance</span>
          <h2>Your shielded portfolio</h2>
        </div>
        <VantaStatusChip />
      </div>

      <div className="dashboard-cockpit__balance-card">
        <div className="dashboard-cockpit__balance-row">
          <div>
            <div className="v-metric__label">Shielded balance</div>
            <div className="v-balance dashboard-cockpit__balance-value">
              {isValueUnavailable ? (
                <>
                  Unavailable <small>{primaryBalanceUnit}</small>
                </>
              ) : (
                <>
                  <AnimatedNumber
                    value={primaryBalanceNumeric}
                    format={(amount) =>
                      hasShieldedSol
                        ? formatVantaSolAmount(amount)
                        : formatShieldedTokenPosition(amount, primaryShieldedTokenPosition.symbol).replace(
                            ` ${primaryShieldedTokenPosition.symbol}`,
                            "",
                          )
                    }
                  />{" "}
                  <small>{primaryBalanceUnit}</small>
                </>
              )}
            </div>
            <p className="dashboard-cockpit__balance-note">{statusLine}</p>
          </div>
          <div className="dashboard-cockpit__viz">
            <DashboardSparkline points={sparklinePoints} positive={balanceTrendPositive} />
            <DashboardAllocationRing slices={allocationSlices} />
          </div>
        </div>

        <div className="dashboard-cockpit__metrics">
          <article className="v-metric">
            <div className="v-metric__label">
              Shielded <AssetChip symbol={primaryShieldedTokenPosition.symbol} />
            </div>
            <div className={["v-metric__value", hasSpendableShieldedValue ? "v-pos" : ""].filter(Boolean).join(" ")}>
              {isValueUnavailable
                ? "Unavailable"
                : formatShieldedTokenPosition(
                    primaryShieldedTokenPosition.balance,
                    primaryShieldedTokenPosition.symbol,
                  )}
            </div>
            {shieldedTokenPositions.length > 1 && (
              <div className="v-metric__sub">
                {shieldedTokenPositions
                  .slice(1)
                  .map((position) => formatShieldedTokenPosition(position.balance, position.symbol))
                  .join(" · ")}
              </div>
            )}
          </article>
          <article className="v-metric">
            <div className="v-metric__label">
              Shielded <AssetChip symbol="SOL" />
            </div>
            <div className={["v-metric__value", hasShieldedSol ? "v-pos" : ""].filter(Boolean).join(" ")}>
              {isValueUnavailable ? "Unavailable" : formatVantaSolAmount(shieldedSolBalance)}
            </div>
            <div className="v-metric__sub">
              {positionSummary.spendableShieldedSolNoteCount} spendable SOL notes
            </div>
          </article>
          <article className="v-metric">
            <div className="v-metric__label">Spendable notes</div>
            <div
              className={[
                "v-metric__value",
                positionSummary.registryRefreshing ? "v-pending" : spendableNoteCount > 0 ? "v-pos" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isValueUnavailable ? (
                "Unavailable"
              ) : (
                <AnimatedNumber value={spendableNoteCount} format={(amount) => String(Math.round(amount))} />
              )}
            </div>
            <div className="v-metric__sub">
              {positionSummary.spendableNoteCount} token · {positionSummary.spendableShieldedSolNoteCount} SOL
            </div>
          </article>
        </div>
      </div>

      <div className="dashboard-next-step-card dashboard-cockpit__next-step">
        <div>
          <span className="eyebrow">Next action</span>
          <h3>{primaryNextStep.label}</h3>
          <p>{statusLine}</p>
        </div>
        <Link className="button button-primary" to={primaryNextStep.href}>
          {primaryNextStep.label}
        </Link>
      </div>

      <div className="dashboard-cockpit__tiles" aria-label="Primary Vanta actions">
        {actions.map((action) => (
          <Link
            key={action.title}
            className={[
              "v-tile",
              "dashboard-action-card",
              "dashboard-action-card--minimal",
              action.variant === "swap" ? "v-tile--swap" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            to={action.href}
          >
            <span className="v-tile__badge">{action.badge}</span>
            <span className="v-tile__icon" aria-hidden="true">
              {action.variant === "shield" ? "↓" : null}
              {action.variant === "send" ? "→" : null}
              {action.variant === "swap" ? "⇄" : null}
              {action.variant === "unshield" ? "↑" : null}
            </span>
            <h3 className="v-tile__title">{action.title}</h3>
            <span className="v-tile__sub">{action.sub}</span>
          </Link>
        ))}
      </div>

      <div className="dashboard-cockpit__activity v-metric">
        <div className="v-metric__label">Recent activity</div>
        <DashboardActivityTimeline items={activityItems} />
      </div>

      <Link className="v-proof-drawer dashboard-cockpit__proof-link" to="/app/proof">
        <span>Proof details — trust packet, lane locks, and verification commands</span>
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
