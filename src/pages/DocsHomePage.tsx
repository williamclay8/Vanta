import { Link } from "react-router-dom";
import { DocsStatusBadge } from "@/components/DocsStatusBadge";
import { getDocsPageMeta } from "@/docs/docsContent";

function DocsHomeFlowDiagram() {
  return (
    <figure
      className="docs-home__flow-diagram"
      data-docs-flow-diagram
      aria-label="Illustrative flow from public chain activity to Vanta receipts and counterparty review"
    >
      <svg className="docs-home__flow-svg" viewBox="0 0 980 190" role="img" aria-labelledby="docs-flow-title docs-flow-desc">
        <title id="docs-flow-title">Vanta docs flow</title>
        <desc id="docs-flow-desc">
          A four-step diagram showing public chain activity, shielding into Vanta, creating a receipt, and counterparty review.
        </desc>
        <defs>
          <marker
            id="docs-flow-arrowhead"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
            viewBox="0 0 8 8"
          >
            <path d="M0 0 L8 4 L0 8 Z" />
          </marker>
        </defs>
        <g className="docs-home__flow-node" data-docs-flow-node="start-public" transform="translate(24 34)">
          <rect width="164" height="120" rx="16" />
          <text x="24" y="42">Public chain</text>
          <text className="docs-home__flow-node-kicker" x="24" y="75">Start public</text>
        </g>
        <path
          className="docs-home__flow-arrow"
          data-docs-flow-arrow="start-to-shield"
          d="M206 94 H262"
          markerEnd="url(#docs-flow-arrowhead)"
        />
        <g className="docs-home__flow-node" data-docs-flow-node="shield-into-vanta" transform="translate(280 34)">
          <rect width="164" height="120" rx="16" />
          <text x="24" y="42">Vanta shield</text>
          <text className="docs-home__flow-node-kicker" x="24" y="75">Shield into Vanta</text>
        </g>
        <path
          className="docs-home__flow-arrow"
          data-docs-flow-arrow="shield-to-receipt"
          d="M462 94 H518"
          markerEnd="url(#docs-flow-arrowhead)"
        />
        <g className="docs-home__flow-node" data-docs-flow-node="create-receipt" transform="translate(536 34)">
          <rect width="164" height="120" rx="16" />
          <text x="24" y="42">Trust packet</text>
          <text className="docs-home__flow-node-kicker" x="24" y="75">Create a receipt</text>
        </g>
        <path
          className="docs-home__flow-arrow"
          data-docs-flow-arrow="receipt-to-verify"
          d="M718 94 H774"
          markerEnd="url(#docs-flow-arrowhead)"
        />
        <g className="docs-home__flow-node" data-docs-flow-node="counterparty-verify" transform="translate(792 34)">
          <rect width="164" height="120" rx="16" />
          <text x="24" y="42">Counterparty review</text>
          <text className="docs-home__flow-node-kicker" x="24" y="75">Verify receipt</text>
        </g>
        <path className="docs-home__flow-path" d="M42 164 H936" />
      </svg>
      <figcaption>
        Illustrative docs flow only; production privacy is not enabled.
      </figcaption>
    </figure>
  );
}

export function DocsHomePage() {
  const portalPage = getDocsPageMeta("portal");
  const payPage = getDocsPageMeta("pay");

  if (!portalPage || !payPage) {
    return null;
  }

  return (
    <div className="docs-home">
      <section className="docs-home__hero product-intro">
        <span className="docs-home__eyebrow product-intro__eyebrow">Vanta Docs</span>
        <h1 className="docs-home__title">Vanta is private settlement for Solana stablecoin flows.</h1>
        <p className="docs-home__lede">
          Shield selected stablecoins. Use current lanes. Produce a receipt the counterparty can verify.
        </p>
        <div className="docs-home__hero-note">
          <strong>The beta truth is part of the product.</strong>
          <p>
            Production privacy is not enabled. Shield now, verify receipts, and check operator status before stronger claims.
          </p>
        </div>
      </section>

      <DocsHomeFlowDiagram />

      <section className="docs-home__plain-strip" data-docs-plain-strip>
        <article>
          <span>1</span>
          <strong>Start public</strong>
          <p>A normal Solana stablecoin flow is visible onchain.</p>
        </article>
        <article>
          <span>2</span>
          <strong>Shield into Vanta</strong>
          <p>Move selected assets into Vanta before private actions begin.</p>
        </article>
        <article>
          <span>3</span>
          <strong>Create a receipt</strong>
          <p>Private action should produce a trust packet, not only a vague success message.</p>
        </article>
        <article>
          <span>4</span>
          <strong>Let the counterparty verify</strong>
          <p>The counterparty should know what happened, what stayed private, and what to do next.</p>
        </article>
      </section>

      <section className="docs-home__paths" aria-label="Vanta docs paths">
        <Link className="docs-path-card" to={portalPage.slug}>
          {portalPage.badge ? (
            <div className="docs-path-card__badge">
              <DocsStatusBadge badge={portalPage.badge} />
            </div>
          ) : null}
          <span className="docs-path-card__label">{portalPage.title}</span>
          <strong>{portalPage.summary}</strong>
          <p>
            Shield selected stablecoins, use a current lane, verify the receipt.
          </p>
        </Link>
        <Link className="docs-path-card docs-path-card--pay" to={payPage.slug}>
          {payPage.badge ? (
            <div className="docs-path-card__badge">
              <DocsStatusBadge badge={payPage.badge} />
            </div>
          ) : null}
          <span className="docs-path-card__label">{payPage.title}</span>
          <strong>{payPage.summary}</strong>
          <p>
            Test checkout. Get receipt-backed status. Reconcile with verification commands.
          </p>
        </Link>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>Who it helps</span>
          <h2 className="docs-home__section-title">
            Privacy becomes useful when another party can trust it.
          </h2>
        </div>
        <div className="docs-home__connection-grid">
          <article className="docs-home__connection-card">
            <h3>Payers</h3>
            <p>
              Use Vanta when a stablecoin action should not expose a
              normal public wallet trail to everyone watching the chain.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Merchants</h3>
            <p>
              Receive private-settlement records in business language: what was
              requested, what happened, what can be verified, and what remains
              unfinished in beta.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Counterparties and reviewers</h3>
            <p>
              Inspect the receipt, trust packet, status surfaces, and commands
              instead of accepting a generic privacy claim.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>Current product truth</span>
          <h2 className="docs-home__section-title">
            Vanta is beta, constrained, and intentionally explicit.
          </h2>
        </div>
        <div className="docs-home__truth-grid">
          <article className="docs-home__truth-card">
            <h3>Portal</h3>
            <p>
              Portal explains where privacy begins: selected assets move from
              a public wallet into Vanta before any private action can be
              claimed.
            </p>
          </article>
          <article className="docs-home__truth-card">
            <h3>Pay</h3>
            <p>
              Pay explains why the rails matter to merchants: checkout,
              settlement status, receipts, and reconciliation need to be useful
              outside the payer&apos;s wallet.
            </p>
          </article>
          <article className="docs-home__truth-card">
            <h3>Trust packet</h3>
            <p>
              The growth artifact is the receipt: what happened, what can be
              proven, what stayed private, who can verify it, and what action
              comes next.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
