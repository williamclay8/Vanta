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
      <section className="docs-home__hero">
        <span className="docs-home__eyebrow">Vanta Docs</span>
        <h1 className="docs-home__title">Move, send, and pay with more privacy.</h1>
        <p className="docs-home__lede">
          Vanta helps people move supported assets into private state, use
          private flows, and understand the merchant-facing path without
          forcing them to think like protocol engineers first.
        </p>
        <div className="docs-home__hero-note">
          <strong>Start here if you want the product story first.</strong>
          <p>
            The docs explain what Vanta can show honestly today, what is still
            preview or demo-only, and how the crypto-native and merchant-facing
            paths connect.
          </p>
        </div>
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
            Start with shielded-state entry, private movement, and the
            crypto-native system model.
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
            Follow the merchant-facing path, including today&apos;s preview
            checkout and merchant control-plane surfaces.
          </p>
        </Link>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>One system, two paths</span>
          <h2 className="docs-home__section-title">
            Portal and Pay are two ways into the same privacy model.
          </h2>
        </div>
        <div className="docs-home__connection-grid">
          <article className="docs-home__connection-card">
            <h3>Vanta Portal is the crypto-native side.</h3>
            <p>
              It begins at the privacy entry point: shield supported assets,
              move through private-state flows, and exit when needed.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Vanta Pay is the merchant-facing direction.</h3>
            <p>
              It builds on the same system, but frames it around checkout
              preview, settlement visibility, withdrawals, and clear approval
              boundaries.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Truth matters as much as polish.</h3>
            <p>
              The docs separate live surfaces from preview and forward-looking
              work so readers are not asked to infer trust from marketing copy.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>Current product truth</span>
          <h2 className="docs-home__section-title">
            The current docs separate active system truth from preview direction.
          </h2>
        </div>
        <div className="docs-home__truth-grid">
          <article className="docs-home__truth-card">
            <h3>Portal</h3>
            <p>
              The crypto-native path is the clearest way to understand Vanta:
              enter private state, then work through constrained private flows
              with explicit boundaries.
            </p>
          </article>
          <article className="docs-home__truth-card">
            <h3>Pay</h3>
            <p>
              The merchant story remains forward-looking. Today&apos;s clearest
              repo truth is preview checkout plus merchant control-plane
              visibility, not a live payments network.
            </p>
          </article>
          <article className="docs-home__truth-card">
            <h3>Trust pages</h3>
            <p>
              Shared pages cover approval boundaries, security limits, pricing
              direction, and roadmap truth in one place.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
