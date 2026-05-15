import type { ReactNode } from "react";

export type SwapReceiptModalDetails = {
  bridgeWarning?: ReactNode;
  inputLabel: ReactNode;
  outputLabel: ReactNode;
  outputNoteId: ReactNode;
  quoteExpiresLabel: ReactNode;
  quoteId: ReactNode;
  quoteIssuedLabel: ReactNode;
  requestId: ReactNode;
  routeTruthLabel: ReactNode;
  transitionNoteId: ReactNode;
  venueLabel: ReactNode;
  venuePoolAddress: ReactNode;
};

type SwapReceiptModalProps = {
  details: SwapReceiptModalDetails;
  onClose: () => void;
  open: boolean;
};

export function SwapReceiptModal({
  details,
  onClose,
  open,
}: SwapReceiptModalProps) {
  if (!open) {
    return null;
  }

  const rows: readonly { label: string; value: ReactNode }[] = [
    { label: "Input", value: details.inputLabel },
    { label: "Output", value: details.outputLabel },
    { label: "Venue", value: details.venueLabel },
    { label: "Operator request", value: details.requestId },
    { label: "Quote", value: details.quoteId },
    { label: "Quote issued", value: details.quoteIssuedLabel },
    { label: "Quote expires", value: details.quoteExpiresLabel },
    { label: "Output note", value: details.outputNoteId },
    { label: "Transition note", value: details.transitionNoteId },
    { label: "Venue pool", value: details.venuePoolAddress },
  ];

  return (
    <div className="swap-receipt-modal__overlay" data-vanta-swap-receipt-modal>
      <section
        className="swap-receipt-modal__dialog"
        aria-describedby="swap-receipt-modal-boundary"
        aria-labelledby="swap-receipt-modal-title"
        aria-modal="true"
        role="dialog"
        style={{
          boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.15), 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
          padding: '2rem',
          transform: 'translateY(0)',
        }}
      >
        <div className="swap-receipt-modal__header">
          <div>
            <span>✓ Swap receipt</span>
            <h3 id="swap-receipt-modal-title">Swap receipt</h3>
          </div>
          <button
            className="swap-receipt-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close swap receipt"
          >
            x
          </button>
        </div>

        <p id="swap-receipt-modal-boundary" className="swap-receipt-modal__boundary">
          Trust packet • route settlement. Verify &amp; share.
        </p>

        <dl className="swap-receipt-modal__grid">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="swap-receipt-modal__truth">
          <span>Route truth</span>
          <strong>{details.routeTruthLabel}</strong>
        </div>

        {details.bridgeWarning && (
          <p className="swap-receipt-modal__warning">{details.bridgeWarning}</p>
        )}
      </section>
    </div>
  );
}
