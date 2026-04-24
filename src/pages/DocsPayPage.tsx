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
          Vanta Pay is the merchant-facing direction for the same privacy
          system behind Portal. Instead of asking a business to learn the
          protocol first, Pay turns the system into normal business tasks:
          create a checkout, see settlement status, review balances, handle
          refunds, prepare withdrawals, and keep receipts.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>Why the product exists</h2>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Merchant control plane</h3>
            <p>
              A merchant needs one place to run the work: payment links,
              invoices, checkout preview, balances, refunds, withdrawals, and
              reconciliation.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Trust packet</h3>
            <p>
              The Pay surface explains what is private, what remains visible,
              who needs to approve the step, and what policy mode is being used.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Shared private rails</h3>
            <p>
              Pay is not a separate network. It is the business version of the
              same shielded-state model Portal explains.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Current status</h2>
        <div className="docs-callout docs-callout--warm">
          <strong>Pay is ambitious, but today&apos;s surface stays explicit.</strong>
          <p>
            The current Pay experience opens on the merchant control plane. The
            checkout is still a design-partner preview inside that surface. It
            helps people understand the settlement story, but it is not being
            presented as a finished production payments network.
          </p>
        </div>
        <ul className="docs-bullet-list">
          <li>Merchant operations are the main Pay frame today.</li>
          <li>Checkout is one workflow inside the control plane, not the whole product.</li>
          <li>The trust packet spells out what is private, what is visible, and who approves execution.</li>
          <li>The settlement story still depends on clear approval boundaries and operator-visible truth.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>How Pay connects back to Portal</h2>
        <p>
          Portal explains how assets enter Vanta&apos;s private area. Pay explains
          how the same system can become useful for merchants once checkout,
          approvals, operator checks, and settlement services are ready enough
          to trust.
        </p>
      </section>
    </DocsPageTemplate>
  );
}
