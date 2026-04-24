import { DocsPageTemplate } from "@/components/DocsPageTemplate";
import { getDocsPageMeta } from "@/docs/docsContent";

export function DocsPayPage() {
  const page = getDocsPageMeta("pay");

  if (!page) {
    return null;
  }

  return (
    <DocsPageTemplate
      title={page.title}
      summary={page.summary}
      readFirst="Vanta Pay is a merchant preview for private checkout and settlement records. It is not a live production payment processor yet."
      badge={page.badge}
      nextStep={page.nextStep}
    >
      <section className="docs-page-section">
        <h2>What Vanta Pay is</h2>
        <p>
          Vanta Pay applies the same shield-first idea to payments. Instead of
          asking a business to understand privacy infrastructure, Pay starts
          with normal merchant work: create a payment request, review checkout,
          see settlement status, handle refunds and withdrawals, and keep
          receipts.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>Why the product exists</h2>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Payment work in one place</h3>
            <p>
              A merchant should be able to create payment links, preview
              checkout, review balances, handle refunds, prepare withdrawals,
              and reconcile records without jumping between tools.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Clear payment records</h3>
            <p>
              The Pay surface should say what happened, what still needs
              approval, what remains visible, and whether the payment is only a
              preview.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Same privacy model</h3>
            <p>
              Pay is the business version of the same idea Portal explains:
              move value into a more private flow, do useful work, and keep the
              exit path understandable.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Current status</h2>
        <div className="docs-callout docs-callout--warm">
          <strong>Today, Pay is a preview.</strong>
          <p>
            You can use it to understand the merchant workflow: create and
            review payment requests, preview checkout, inspect payment records,
            and see the trust limits. It should not read as a finished payments
            network or live processor.
          </p>
        </div>
        <ul className="docs-bullet-list">
          <li>The default `/app/pay` tab is a merchant preview, not production payment infrastructure.</li>
          <li>It shows the payment request path first, then supporting records like refunds, withdrawals, receipts, and reconciliation.</li>
          <li>Beta, no-funds, privacy-readiness, route, receipt, and transaction-evidence limits stay visible.</li>
          <li>The backend verification commands remain the place to inspect deeper merchant API and settlement behavior.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>How Pay connects back to Portal</h2>
        <p>
          Portal explains how assets enter Vanta&apos;s private area. Pay explains
          why that matters for commerce: merchants need checkout, approvals,
          settlement status, refunds, withdrawals, receipts, and reconciliation
          records they can understand.
        </p>
      </section>
    </DocsPageTemplate>
  );
}
