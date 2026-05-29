import { Link } from "react-router-dom";
import { isBetaMode } from "@/config/deploymentMode";
import { useWalletState } from "@/data/context/WalletContext";

type VantaStatusChipProps = {
  className?: string;
};

export function VantaStatusChip({ className }: VantaStatusChipProps) {
  const { clusterLabel } = useWalletState();
  const networkLabel = clusterLabel.toLowerCase().includes("mainnet") ? "mainnet" : "devnet";
  const chipLabel = isBetaMode ? `Beta · ${networkLabel}` : networkLabel;

  return (
    <Link
      className={["vanta-status-chip", className].filter(Boolean).join(" ")}
      to="/app/proof"
      aria-label={`Vanta status: ${chipLabel}. Open proof and readiness details.`}
      data-vanta-status-chip
    >
      <span className="vanta-status-chip__dot" aria-hidden="true" />
      <span className="vanta-status-chip__label">{chipLabel}</span>
    </Link>
  );
}
