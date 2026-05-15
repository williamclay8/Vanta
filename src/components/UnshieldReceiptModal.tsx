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
        style={{
          boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.15), 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
          padding: '2rem',
          transform: 'translateY(0)',
        }}
      >
        <div className="unshield-receipt-modal__header">
          <div>
            <span>✓ Unshield receipt</span>
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
          Trust packet: verify exit on operator before claiming. Share this receipt to grow the private set.
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
