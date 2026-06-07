import type {
  VantaPayReceiptPrivacyContract,
  VantaPayReceiptPublicView,
  VantaPayReceiptRedactedReference,
} from "@/pay/vantaPayTypes";

type PayReceiptPacketCardProps = {
  copied?: boolean;
  merchantName: string;
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
  merchantName,
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
      style={{
        boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.15), 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
        padding: '2rem',
        transform: 'translateY(0)',
      }}
    >
      <div className="pay-receipt-packet-card__header">
          <div data-vanta-pay-receipt-merchant>
          <small>{merchantName}</small>
          <span>✓ Receipt packet</span>
          <strong>Receipt packet ready</strong>
          <small>Share trust packet</small>
        </div>
        <div className="pay-receipt-packet-card__actions" aria-label="Receipt packet actions">
          <a
            className="button button-ghost pay-receipt-packet-card__verify-link"
            data-vanta-pay-receipt-verify-link
            href={shareHref}
            style={{ color: '#34d399', fontWeight: 600 }}
          >
            Verify
          </a>
          <button
            className="button button-primary pay-receipt-packet-card__copy"
            data-pay-action="copy-receipt-share-link"
            onClick={onCopyShareLink}
            type="button"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            className="button button-ghost pay-receipt-packet-card__print"
            data-pay-action="print-receipt-packet"
            onClick={() => window.print()}
            type="button"
          >
            Print receipt
          </button>
        </div>
      </div>

      <p className="pay-receipt-packet-card__boundary" data-vanta-pay-receipt-printable>
        {privacyContract.currentTruth}; {privacyContract.claimSummary}. Test receipt only.
        Printable receipt packet.
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
          <dt>Local proving</dt>
          <dd>
            {publicView.localProving.defaultMode}; private inputs leave client:{" "}
            {String(publicView.localProving.privateInputsLeaveClient)}.
          </dd>
        </div>
        <div>
          <dt>Usage evidence</dt>
          <dd>
            {publicView.usageVelocity.primitive} velocity is{" "}
            {publicView.usageVelocity.evidenceStatus}; verify with{" "}
            {publicView.usageVelocity.metricSurface}.
          </dd>
        </div>
        <div data-vanta-pay-growth-loop>
          <dt>Growth loop</dt>
          <dd>
            Counterparty verification:{" "}
            {publicView.growthLoop.counterpartyVerification.verificationCommand}. Invited use:{" "}
            {publicView.growthLoop.invitedUse.nextAction}. Repeated private action measured:{" "}
            {String(publicView.growthLoop.repeatedPrivateAction.liveUsageMeasured)}. Invited
            counterparties 7d: {publicView.growthLoop.usageVelocity.invitedCounterparties7d}.
            Repeated actions 7d: {publicView.growthLoop.usageVelocity.repeatedPrivateActions7d}.
          </dd>
        </div>
        <div data-vanta-pay-growth-loop-evidence>
          <dt>Local evidence ledger</dt>
          <dd>
            Receipt events: {publicView.growthLoop.evidence.eventLedger.events.length}. Share links
            copied 7d: {publicView.growthLoop.evidence.derivedCounters.invitedCounterparties7d}.
            Counterparty verifier opens 7d:{" "}
            {publicView.growthLoop.evidence.derivedCounters.counterpartyVerifierOpened7d}. Next private settlement requests 7d:{" "}
            {publicView.growthLoop.evidence.derivedCounters.nextPrivateSettlementRequests7d}.
            Live redacted operator measurement uses GET /v1/growth-loop/status and POST
            /v1/growth-loop/events when configured.
            Claim lift blocked until live evidence:{" "}
            {String(
              publicView.growthLoop.evidence.claimControls.claimLiftBlockedUntilLiveEvidence,
            )}.
          </dd>
        </div>
        <div data-vanta-pay-institutional-disclosure>
          <dt>Institutional disclosure</dt>
          <dd>
            Selective disclosure receipt{" "}
            {publicView.institutionalDisclosure.receiptSchemaVersion}; regulator scope is{" "}
            {publicView.institutionalDisclosure.regulatorScope}. Disclosure expires{" "}
            {publicView.institutionalDisclosure.expiresAt}. Private inputs disclosed:{" "}
            {String(publicView.institutionalDisclosure.privateInputsDisclosed)}. Witness disclosed:{" "}
            {String(publicView.institutionalDisclosure.witnessDisclosed)}.
          </dd>
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

      <div className="pay-receipt-packet-card__qr" data-vanta-pay-receipt-qr aria-label="Receipt packet QR preview">
        <span>Receipt QR</span>
        <strong>{publicView.receiptId.slice(0, 12)}</strong>
        <small>Redacted local test share packet: {shareHref}</small>
      </div>
    </section>
  );
}
