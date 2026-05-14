import type { ReactNode } from "react";

export type SendReceiptModalDetails = {
  amountLabel: ReactNode;
  proofStatusLabel: ReactNode;
  recipientLabel: ReactNode;
  releasePackageLabel: ReactNode;
  remainingBalanceLabel: ReactNode;
  residualNoteLabel: ReactNode;
  sendNoteLabel: ReactNode;
  spentMarkerLabel: ReactNode;
};

type SendReceiptModalProps = {
  children?: ReactNode;
  details: SendReceiptModalDetails;
  onClose: () => void;
  open: boolean;
};

export function SendReceiptModal({
  children,
  details,
  onClose,
  open,
}: SendReceiptModalProps) {
  if (!open) {
    return null;
  }

  const rows: readonly { label: string; value: ReactNode }[] = [
    { label: "Recipient", value: details.recipientLabel },
    { label: "Amount", value: details.amountLabel },
    { label: "Residual note", value: details.residualNoteLabel },
    { label: "Remaining balance", value: details.remainingBalanceLabel },
    { label: "Send note", value: details.sendNoteLabel },
    { label: "Spent marker", value: details.spentMarkerLabel },
    { label: "Proof status", value: details.proofStatusLabel },
    { label: "Release package", value: details.releasePackageLabel },
  ];

  return (
    <div className="send-receipt-modal__overlay" data-vanta-send-receipt-modal>
      <section
        className="send-receipt-modal send-receipt-modal__dialog"
        aria-describedby="send-receipt-modal-boundary"
        aria-labelledby="send-receipt-modal-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="send-receipt-modal__header">
          <div>
            <span>Send receipt</span>
            <h3 id="send-receipt-modal-title">Latest send receipt</h3>
          </div>
          <button
            className="send-receipt-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close send receipt"
          >
            x
          </button>
        </div>

        <p id="send-receipt-modal-boundary" className="send-receipt-modal__boundary">
          This receipt summarizes local send evidence, operator-visible proof status, and recipient
          recovery context. It does not prove production-private recipient delivery or live
          mainnet-private settlement.
        </p>

        <dl className="send-receipt-modal__grid">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        {children && <div className="send-receipt-modal__details">{children}</div>}
      </section>
    </div>
  );
}
