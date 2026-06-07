import { Link, useParams } from "react-router-dom";

export function ReceiptVerificationPage() {
  const { receiptId } = useParams();
  const safeReceiptId = receiptId?.trim() || "missing-receipt-id";

  return (
    <section
      className="route-fallback route-fallback--receipt"
      data-vanta-pay-counterparty-verifier
      data-vanta-pay-receipt-verify-page
    >
      <span className="route-fallback__eyebrow">Counterparty verifier</span>
      <h1>Verify receipt</h1>
      <p>
        <strong>Receipt verification preview.</strong> This page is the shareable Pay trust-packet
        surface for a counterparty. It names what the receipt can prove, what stays private, and
        why production privacy is not enabled.
      </p>
      <div className="route-fallback__actions" aria-label="Receipt verification actions">
        <Link className="route-fallback__action route-fallback__action--primary" to="/app/pay">
          Request private settlement
        </Link>
        <Link className="route-fallback__action" to="/app/pay">
          Accept committed checkout
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
          <dt>What happened</dt>
          <dd>A Pay receipt packet was shared for one local test settlement record.</dd>
        </div>
        <div>
          <dt>What can be verified</dt>
          <dd>
            Receipt id, amount, asset, payment status, redacted settlement references, and the
            command `npm run pay:growth-loop-check`.
          </dd>
        </div>
        <div data-vanta-pay-growth-loop-counterparty-event>
          <dt>Growth-loop event</dt>
          <dd>
            Opening this verifier is modeled as `counterparty_verifier_opened` in the local
            evidence ledger. A configured Pay operator can also record the same event through POST
            /v1/growth-loop/events as redacted first-party measurement; live adoption claims remain
            blocked. Measured-loop implementation is checked by npm run
            pay:measured-loop-implementation-check.
          </dd>
        </div>
        <div data-vanta-pay-counterparty-activation>
          <dt>Counterparty activation</dt>
          <dd>
            Request private settlement from the receipt context. The actionable loop records
            `counterparty_invite_opened` and `next_settlement_intent_created` as redacted
            first-party events through POST /v1/growth-loop/events. Verify the activation packet
            with npm run pay:counterparty-activation-check.
          </dd>
        </div>
        <div data-vanta-pay-committed-checkout-acceptance>
          <dt>Committed checkout acceptance</dt>
          <dd>
            Accept committed checkout from the receipt context. The acceptance packet uses
            committed-economics settlement metadata, records
            `committed_checkout_acceptance_created` as a redacted first-party event, and is
            checked by npm run pay:committed-checkout-acceptance-check. It does not execute
            live signing, broadcast, real-funds movement, or production privacy by itself.
          </dd>
        </div>
        <div>
          <dt>What stays private</dt>
          <dd>
            Customer email value, full private-rail receipt id, full audit disclosure id, private
            inputs, witness data, and full transaction history.
          </dd>
        </div>
        <div>
          <dt>Next private settlement</dt>
          <dd>
            The counterparty can request the next private settlement from the merchant. Local
            fixture counters can model that loop, and GET /v1/growth-loop/status can show redacted
            operator counters. Usage-velocity and adoption claims stay blocked until reviewed live
            evidence supports them.
          </dd>
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
          <dd>
            Use npm run pay:growth-loop-check, npm run pay:measured-loop-implementation-check, and
            npm run pay:verify for local reviewer evidence until public lookup is live.
          </dd>
        </div>
      </dl>
    </section>
  );
}
