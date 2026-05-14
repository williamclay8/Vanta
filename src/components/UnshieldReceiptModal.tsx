import type { ReactNode } from "react";

export type UnshieldReceiptModalDetails = {
  amountLabel: ReactNode;
  evidenceLabel: ReactNode;
  exitVisibilityLabel: ReactNode;
  operatorReleaseLabel: ReactNode;
  operatorRequestLabel: ReactNode;
  settlementScopeLabel: ReactNode;
  solscanUrl?: string;
  transitionNoteLabel: ReactNode;
};

type UnshieldReceiptModalProps = {
  children?: ReactNode;
  details: UnshieldReceiptModalDetails;
  onClose: () => void;
  open: boolean;
};

export function UnshieldReceiptModal({
  children,
  details,
  onClose,
  open,
}: UnshieldReceiptModalProps) {
  if (!open) {
    return null;
  }

  const rows: readonly { label: string; value: ReactNode }[] = [
    { label: "Amount", value: details.amountLabel },
    { label: "Transaction evidence", value: details.evidenceLabel },
    { label: "Operator release", value: details.operatorReleaseLabel },
    { label: "Operator request", value: details.operatorRequestLabel },
    { label: "Transition note", value: details.transitionNoteLabel },
    { label: "Settlement scope", value: details.settlementScopeLabel },
    { label: "Exit visibility", value: details.exitVisibilityLabel },
  ];

  return (
    <div className="unshield-receipt-modal__overlay" data-vanta-unshield-receipt-modal>
      <section
        className="unshield-receipt-modal unshield-receipt-modal__dialog"
        aria-describedby="unshield-receipt-modal-boundary"
        aria-labelledby="unshield-receipt-modal-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="unshield-receipt-modal__header">
          <div>
            <span>Unshield receipt</span>
            <h3 id="unshield-receipt-modal-title">Latest unshield receipt</h3>
          </div>
          <button
            className="unshield-receipt-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close unshield receipt"
          >
            x
          </button>
        </div>

        <p id="unshield-receipt-modal-boundary" className="unshield-receipt-modal__boundary">
          Verify the public exit transaction before treating funds as moved. This receipt summarizes
          operator-visible public release terms and does not prove production-private exit privacy.
        </p>

        <dl className="unshield-receipt-modal__grid">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        {details.solscanUrl && (
          <a
            className="button button-ghost"
            href={details.solscanUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on Solscan
          </a>
        )}

        {children && <div className="unshield-receipt-modal__details">{children}</div>}
      </section>
    </div>
  );
}
