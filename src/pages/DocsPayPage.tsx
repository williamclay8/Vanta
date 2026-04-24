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
      badge={page.badge}
      nextStep={page.nextStep}
    >
      <section className="docs-page-section">
        <h2>What Vanta Pay is</h2>
        <p>
          Vanta Pay is the merchant-facing direction for the same privacy system
          that powers Portal. It translates private-state movement into a
          simpler payments story: checkout, settlement visibility, balances,
          withdrawals, and receipts.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>Why the product exists</h2>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Clearer checkout</h3>
            <p>
              Merchants and customers need a payment flow they can understand
              without learning protocol internals first.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Readable settlement</h3>
            <p>
              The product direction makes approval, payout, refund, and
              reconciliation states easier to inspect.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Shared private rails</h3>
            <p>
              Pay is not a separate system. It is the merchant-facing expression
              of the same shielded-state model.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Current status</h2>
        <div className="docs-callout docs-callout--warm">
          <strong>Pay is ambitious, but today&apos;s surface stays explicit.</strong>
          <p>
            The current Pay experience combines a preview checkout with a
            merchant control-plane surface. The checkout remains a
            design-partner preview that helps make the settlement story
            legible, but it is not presented here as a finished production
            payments network.
          </p>
        </div>
        <ul className="docs-bullet-list">
          <li>Checkout remains preview-oriented, while merchant operations are shown through control-plane and design-partner surfaces.</li>
          <li>The current settlement story still depends on explicit approval boundaries and operator-visible truth.</li>
          <li>The roadmap stays ambitious, but these docs keep today&apos;s limits visible.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>How Pay connects back to Portal</h2>
        <p>
          Portal explains where privacy starts in shielded state. Pay explains
          how that same system could support merchant settlement once approval,
          operator, and service boundaries are ready.
        </p>
      </section>
    </DocsPageTemplate>
  );
}
