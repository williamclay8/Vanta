import type {
  VantaPayReceiptPrivacyContract,
  VantaPayReceiptPublicView,
  VantaPayReceiptRedactedReference,
} from "@/pay/vantaPayTypes";

type PayReceiptPacketCardProps = {
  copied?: boolean;
  onCopyShareLink: () => void;
  privacyContract: VantaPayReceiptPrivacyContract;
  publicView: VantaPayReceiptPublicView;
  shareHref: string;
};

function formatRedactedReference(
  reference: VantaPayReceiptRedactedReference,
  fallbackPrefix: string,
) {
  return `${reference.idPrefix ?? fallbackPrefix}...redacted`;
}

export function PayReceiptPacketCard({
  copied = false,
  onCopyShareLink,
  privacyContract,
  publicView,
  shareHref,
}: PayReceiptPacketCardProps) {
  const visibleAmount = `${publicView.amount} ${publicView.asset}`;
  const privateRailReceiptRef = formatRedactedReference(
    publicView.privateSettlement.railReceipt,
    "prail",
  );
  const auditDisclosureRef = formatRedactedReference(
    publicView.privateSettlement.auditDisclosure,
    "aud",
  );
  const verificationCommand =
    privacyContract.verificationSurfaces[0] ?? publicView.verification.commands[0];

  return (
    <section
      className="pay-record-panel pay-record-panel--receipt-packet pay-receipt-packet-card review-list"
      aria-label="Receipt packet"
      data-vanta-pay-receipt-packet-card
      tabIndex={-1}
    >
      <div className="pay-receipt-packet-card__header">
        <div>
          <span>Receipt packet</span>
          <strong>Receipt packet ready</strong>
        </div>
        <div className="pay-receipt-packet-card__actions" aria-label="Receipt packet actions">
          <a
            className="button button-ghost pay-receipt-packet-card__verify-link"
            data-vanta-pay-receipt-verify-link
            href={shareHref}
          >
            Verify receipt
          </a>
          <button
            className="button button-primary pay-receipt-packet-card__copy"
            data-pay-action="copy-receipt-share-link"
            onClick={onCopyShareLink}
            type="button"
          >
            {copied ? "Share link copied" : "Copy share link"}
          </button>
        </div>
      </div>

      <p className="pay-receipt-packet-card__boundary">
        {privacyContract.currentTruth}; {privacyContract.claimSummary}. No production funds moved.
        Test receipt only.
      </p>

      <div className="pay-receipt-packet-card__summary">
        <div>
          <span>Amount</span>
          <strong data-vanta-pay-receipt-amount>{visibleAmount}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{publicView.status}</strong>
        </div>
        <div>
          <span>Verify at</span>
          <strong>{shareHref}</strong>
        </div>
      </div>

      <dl className="pay-record-list">
        <div>
          <dt>Visible to merchant</dt>
          <dd>
            Receipt {publicView.receiptId}, payment {publicView.paymentId}, amount{" "}
            {visibleAmount}, and status {publicView.status}.
          </dd>
        </div>
        <div>
          <dt>Visible to buyer</dt>
          <dd>
            Test receipt status, payment reference, and share path; collected customer email is
            marked collected but redacted.
          </dd>
        </div>
        <div>
          <dt>Kept private</dt>
          <dd>
            Client token, customer email value, raw private economics, and operator-only settlement
            details.
          </dd>
        </div>
        <div>
          <dt>Verified by</dt>
          <dd>{verificationCommand}</dd>
        </div>
        <div>
          <dt>Private rail receipt</dt>
          <dd>{privateRailReceiptRef}</dd>
        </div>
        <div>
          <dt>Proof receipt ID</dt>
          <dd>Not buyer-visible in this public view.</dd>
        </div>
        <div>
          <dt>Audit disclosure</dt>
          <dd>{auditDisclosureRef}</dd>
        </div>
        <div>
          <dt>Claim boundary</dt>
          <dd>{publicView.verification.claimBoundary}</dd>
        </div>
        <div>
          <dt>Operator surface</dt>
          <dd>{publicView.verification.operatorStatusSurface}</dd>
        </div>
      </dl>

      <div className="pay-receipt-packet-card__qr" data-vanta-pay-receipt-qr aria-label="Receipt packet QR">
        <span>Receipt QR</span>
        <strong>{publicView.receiptId.slice(0, 12)}</strong>
        <small>Redacted local test share packet</small>
      </div>
    </section>
  );
}
