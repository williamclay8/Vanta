import { Link, useParams } from "react-router-dom";

export function ReceiptVerificationPage() {
  const { receiptId } = useParams();
  const safeReceiptId = receiptId?.trim() || "missing-receipt-id";

  return (
    <section
      className="route-fallback route-fallback--receipt"
      data-vanta-pay-receipt-verify-page
    >
      <span className="route-fallback__eyebrow">Receipt check</span>
      <h1>Verify receipt</h1>
      <p>
        <strong>Receipt verification preview.</strong> This page identifies the shared Pay receipt
        packet path and the beta truth boundary. It does not prove a live public receipt lookup,
        production payment processing, or live private settlement.
      </p>
      <div className="route-fallback__actions" aria-label="Receipt verification actions">
        <Link className="route-fallback__action route-fallback__action--primary" to="/app/pay">
          Open Pay
        </Link>
        <Link className="route-fallback__action" to="/docs/trust">
          Review trust docs
        </Link>
        <Link className="route-fallback__action" to="/docs/security">
          Read security limits
        </Link>
      </div>
      <dl className="route-fallback__truth" aria-label="Receipt verification boundary">
        <div>
          <dt>Receipt</dt>
          <dd>{safeReceiptId}</dd>
        </div>
        <div>
          <dt>Claim boundary</dt>
          <dd>Receipt-backed test settlement; production privacy is not enabled.</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Production privacy is not enabled. No production funds moved. Test receipt only.</dd>
        </div>
        <div>
          <dt>Verifier</dt>
          <dd>Use npm run pay:verify for local reviewer evidence until public lookup is live.</dd>
        </div>
      </dl>
    </section>
  );
}
