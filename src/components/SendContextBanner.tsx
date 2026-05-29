import { Link } from "react-router-dom";
import type { PrivacyAssetKey } from "@/data/context/PrivacyFlowContext";

type RecentShieldSnapshot = {
  amount: number;
  asset: PrivacyAssetKey;
};

type SendContextBannerProps = {
  formatBalance: (value: number, symbol: PrivacyAssetKey) => string;
  recentShield: RecentShieldSnapshot | null;
};

export function SendContextBanner({ formatBalance, recentShield }: SendContextBannerProps) {
  if (recentShield) {
    return (
      <div className="send-context-banner">
        <div>
          <span>Syncing</span>
          <h3>{formatBalance(recentShield.amount, recentShield.asset)} deposit recorded.</h3>
          <p>Wait for ledger sync before sending.</p>
        </div>
        <div className="send-context-banner__meta">
          <strong>Pending</strong>
          <small>Not spendable yet</small>
        </div>
      </div>
    );
  }

  return (
    <div className="send-context-banner send-context-banner--quiet">
      <div>
        <span>Empty Vault</span>
        <h3>No send-ready balance yet.</h3>
        <p>Start with Shield.</p>
      </div>
      <Link className="button button-ghost" to="/app/shield">
        Shield first
      </Link>
    </div>
  );
}
