import type { ReactNode } from "react";

export type WalletApprovalSheetRow = {
  label: string;
  value: ReactNode;
  tone?: "default" | "warning" | "danger";
};

type WalletApprovalSheetProps = {
  ariaLabel?: string;
  className?: string;
  heading: ReactNode;
  maxRows?: number;
  note?: ReactNode;
  rows: readonly WalletApprovalSheetRow[];
  signingMode?: ReactNode;
  truthBoundary?: ReactNode;
  walletPrompt: ReactNode;
};

export function WalletApprovalSheet({
  ariaLabel = "Wallet approval review",
  className,
  heading,
  maxRows,
  note,
  rows,
  signingMode,
  truthBoundary,
  walletPrompt,
}: WalletApprovalSheetProps) {
  const rootClassName = ["wallet-approval-sheet", className].filter(Boolean).join(" ");
  const walletApprovalSheetRows = rows.slice(0, maxRows);

  return (
    <section className={rootClassName} aria-label={ariaLabel}>
      <div className="wallet-approval-sheet__header">
        <div>
          <span>{heading}</span>
          <strong>{walletPrompt}</strong>
        </div>
        {signingMode && <span className="wallet-approval-sheet__mode">{signingMode}</span>}
      </div>

      <div className="wallet-approval-sheet__rows">
        {walletApprovalSheetRows.map((row) => (
          <div
            className={`wallet-approval-sheet__row wallet-approval-sheet__row--${row.tone ?? "default"}`}
            key={row.label}
          >
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>

      {note && <p className="wallet-approval-sheet__note">{note}</p>}
      {truthBoundary && <p className="wallet-approval-sheet__truth">{truthBoundary}</p>}
    </section>
  );
}
