import { Link } from "react-router-dom";
import { DocsStatusBadge } from "@/components/DocsStatusBadge";
import { getDocsPageMeta } from "@/docs/docsContent";

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
          Vanta is building policy-safe privacy for payments and settlement:
          move selected stablecoin flows into Vanta, use the current lanes,
          and give counterparties enough proof to trust the result without
          exposing the whole wallet trail.
        </p>
        <div className="docs-home__hero-note">
          <strong>The beta truth is part of the product.</strong>
          <p>
            Vanta is not production-ready private settlement yet. These docs
            explain the useful pattern first, then label what is live, what is
            preview-only, and what still needs proof, operator, audit, and
            mainnet gates before stronger claims are fair.
          </p>
        </div>
      </section>

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
            Start here for the wallet path: shield selected stablecoins, use a
            current lane, and understand the exit boundary.
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
            Follow the merchant path: test checkout only matters when the
            merchant gets a receipt, status, and reconciliation trail they can
            actually inspect.
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
